// apps/api/src/modules/users/routes.ts
import { Router } from "express";
import { z } from "zod";
import type { Role } from "@prisma/client";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma";
import { generateToken, hashToken } from "../../lib/tokens";
import { writeAudit } from "../../lib/audit";
import { logSecurityEvent } from "../../lib/security";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { require2FAForHighRisk } from "../../middleware/require2FA";
import { HttpError } from "../../middleware/errors";
import { env } from "../../config/env";
import { sendInviteEmail } from "../../lib/mailer";
import { assignableUsersFor } from "../tasks/service";
import { logger } from "../../lib/logger";

export const usersRouter = Router();

const ROLES: [Role, ...Role[]] = [
  "DEAN",
  "DEPUTY",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
  "ADMINISTRATOR",
  "LAB_TECHNICIAN",
];

// Fix: Defined locally since it's missing from @hawl/shared
const setHierarchySchema = z
  .object({
    supervisorId: z.string().nullable().optional(),
    coordinatorIds: z.array(z.string()).optional(),
  })
  .strict();

const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .strict();

usersRouter.post(
  "/invite/accept",
  asyncHandler(async (req, res) => {
    const input = acceptInviteSchema.parse(req.body);
    const tokenHash = hashToken(input.token);

    const invite = await prisma.invite.findUnique({
      where: { tokenHash },
    });

    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
      throw new HttpError(400, "Invalid or expired invite", "invalid_invite");
    }

    const existing = await prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (existing) {
      throw new HttpError(409, "User already exists", "conflict");
    }

    const passwordHash = await argon2.hash(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invite.email,
          passwordHash,
          fullName: invite.fullName || invite.email.split("@")[0],
          role: invite.role,
          officeId: invite.officeId,
          active: true,
          failedLoginCount: 0,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return newUser;
    });

    logSecurityEvent("INVITE_ACCEPTED", {
      email: invite.email,
      ip: req.ip,
    });

    res.status(201).json({
      data: {
        success: true,
        email: user.email,
        message: "Account activated successfully",
      },
    });
  }),
);

usersRouter.use(requireAuth);

// ────────────────────────────────────────────────────────────
// INVITES — must come BEFORE /:id to prevent Express from
// matching "/invites" as a user ID.
// ────────────────────────────────────────────────────────────

usersRouter.get(
  "/invites",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (_req, res) => {
    const data = await prisma.invite.findMany({
      where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { fullName: true } } },
    });
    res.json({ data });
  }),
);

usersRouter.delete(
  "/invites/:id",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    const invite = await prisma.invite.findUnique({ where: { id: req.params.id } });
    if (!invite) throw new HttpError(404, "Invite not found", "not_found");

    await prisma.invite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "user.invite_revoked",
      entityType: "Invite",
      entityId: invite.id,
      req,
    });

    logSecurityEvent("INVITE_REVOKED", {
      userId: req.user!.id,
      targetId: invite.id,
      email: invite.email,
      ip: req.ip,
    });

    res.status(204).end();
  }),
);

// ────────────────────────────────────────────────────────────
// USERS list / by id
// ────────────────────────────────────────────────────────────

// People this user is allowed to hand tasks to (used by the Create / Assign task dialogs).
// Must stay above "/:id" so "assignable" is not treated as a user id.
usersRouter.get(
  "/assignable",
  asyncHandler(async (req, res) => {
    const data = await assignableUsersFor(req.user!);
    res.json({ data });
  }),
);

// Reporting lines: who a Lab Technician reports to, and which coordinators an Administrator works for.
usersRouter.patch(
  "/:id/hierarchy",
  requireRole("ADMINISTRATOR", "DEAN", "DEPUTY"),
  require2FAForHighRisk,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const input = setHierarchySchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, "User not found", "not_found");

    if (input.supervisorId !== undefined) {
      if (input.supervisorId === id) {
        throw new HttpError(400, "A user cannot supervise themselves", "invalid_request");
      }
      if (input.supervisorId) {
        const sup = await prisma.user.findUnique({ where: { id: input.supervisorId } });
        if (!sup || !sup.active)
          throw new HttpError(400, "Supervisor not valid", "invalid_request");
      }
    }
    if (input.coordinatorIds) {
      if (target.role !== "ADMINISTRATOR") {
        throw new HttpError(
          400,
          "Only Administrators can be linked to coordinators",
          "invalid_request",
        );
      }
      const coords = await prisma.user.findMany({
        where: {
          id: { in: input.coordinatorIds },
          active: true,
          role: { in: ["FACULTY_COORDINATOR", "LABS_COORDINATOR"] },
        },
        select: { id: true },
      });
      if (coords.length !== new Set(input.coordinatorIds).size) {
        throw new HttpError(400, "One or more coordinators are not valid", "invalid_request");
      }
    }

    await prisma.$transaction(async (tx) => {
      if (input.supervisorId !== undefined) {
        await tx.user.update({ where: { id }, data: { supervisorId: input.supervisorId } });
      }
      if (input.coordinatorIds) {
        await tx.administratorAssignment.deleteMany({ where: { administratorId: id } });
        if (input.coordinatorIds.length) {
          await tx.administratorAssignment.createMany({
            data: [...new Set(input.coordinatorIds)].map((coordinatorId) => ({
              coordinatorId,
              administratorId: id,
            })),
          });
        }
      }
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "user.hierarchy_changed",
      entityType: "User",
      entityId: id,
      meta: { supervisorId: input.supervisorId, coordinatorIds: input.coordinatorIds },
      req,
    });
    res.json({ ok: true });
  }),
);

usersRouter.get(
  "/",
  requireRole("ADMINISTRATOR", "DEAN", "DEPUTY"),
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === "true";
    const data = await prisma.user.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        officeId: true,
        supervisorId: true,
        coordinatorLinks: { select: { coordinatorId: true } },
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    res.json({ data });
  }),
);

usersRouter.get(
  "/:id",
  requireRole("ADMINISTRATOR", "DEAN", "DEPUTY"),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        officeId: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new HttpError(404, "User not found", "not_found");
    res.json({ data: user });
  }),
);

const inviteSchema = z
  .object({
    email: z.string().email().max(254),
    role: z.enum(ROLES),
    officeId: z.string().min(1).optional(),
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: z.string().max(20).optional(),
  })
  .strict();

usersRouter.post(
  "/invite",
  requireRole("ADMINISTRATOR", "DEAN"),
  require2FAForHighRisk,
  asyncHandler(async (req, res) => {
    const input = inviteSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing?.passwordHash) {
      throw new HttpError(409, "User already exists", "conflict");
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.INVITE_TTL_HOURS * 3600_000);

    const existingInvite = await prisma.invite.findFirst({
      where: { email: input.email },
    });

    let invite;
    if (existingInvite) {
      invite = await prisma.invite.update({
        where: { id: existingInvite.id },
        data: {
          role: input.role,
          officeId: input.officeId,
          invitedById: req.user!.id,
          tokenHash: hashToken(token),
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          fullName: input.fullName,
          phone: input.phone,
        },
      });
    } else {
      invite = await prisma.invite.create({
        data: {
          email: input.email,
          role: input.role,
          officeId: input.officeId,
          invitedById: req.user!.id,
          tokenHash: hashToken(token),
          expiresAt,
          fullName: input.fullName,
          phone: input.phone,
        },
      });
    }

    await writeAudit({
      actorId: req.user!.id,
      action: "user.invited",
      entityType: "User",
      entityId: invite.id,
      meta: { email: input.email, role: input.role },
      req,
    });

    logSecurityEvent("INVITE_ISSUED", {
      userId: req.user!.id,
      email: input.email,
      targetId: invite.id,
      role: input.role,
      ip: req.ip,
    });

    const inviter = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { fullName: true },
    });
    const inviterName = inviter?.fullName || "CECIT Administration";

    let officeName: string | null = null;
    if (input.officeId) {
      const office = await prisma.office.findUnique({
        where: { id: input.officeId },
        select: { name: true },
      });
      officeName = office?.name || null;
    }

    try {
      await sendInviteEmail(
        input.email,
        token,
        input.role,
        inviterName,
        officeName,
        input.fullName || null,
      );
    } catch (err) {
      logger.error(
        { err, email: input.email },
        "Failed to send invite email, but invite was created in DB.",
      );
    }

    res.status(201).json({
      data: {
        inviteId: invite.id,
        email: invite.email,
        expiresAt: invite.expiresAt,
        ...(env.NODE_ENV !== "production" ? { token } : {}),
      },
    });
  }),
);

const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    role: z.enum(ROLES).optional(),
    officeId: z.string().nullable().optional(),
  })
  .strict();

usersRouter.patch(
  "/:id",
  requireRole("ADMINISTRATOR", "DEAN"),
  require2FAForHighRisk,
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);

    const previous = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!previous) throw new HttpError(404, "User not found", "not_found");

    // Prevent DEAN from promoting to ADMINISTRATOR or modifying an ADMINISTRATOR
    if (req.user!.role === "DEAN") {
      if (input.role === "ADMINISTRATOR") {
        throw new HttpError(
          403,
          "Only an Administrator can promote a user to Administrator.",
          "forbidden",
        );
      }
      if (previous.role === "ADMINISTRATOR") {
        throw new HttpError(403, "You cannot modify an Administrator account.", "forbidden");
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: input,
    });

    if (input.role !== undefined && input.role !== previous.role) {
      await prisma.session.updateMany({
        where: { userId: updated.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      logSecurityEvent("ROLE_CHANGED", {
        userId: req.user!.id,
        targetId: updated.id,
        email: updated.email,
        from: previous.role,
        to: input.role,
        ip: req.ip,
      });
    }

    await writeAudit({
      actorId: req.user!.id,
      action: "user.updated",
      entityType: "User",
      entityId: updated.id,
      meta: input,
      req,
    });

    res.json({ data: { id: updated.id, role: updated.role, officeId: updated.officeId } });
  }),
);

usersRouter.post(
  "/:id/deactivate",
  requireRole("ADMINISTRATOR", "DEAN"),
  require2FAForHighRisk,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) {
      throw new HttpError(400, "You cannot deactivate yourself", "invalid_request");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: req.params.id },
        data: { active: false, deactivatedAt: new Date() },
      });
      await tx.session.updateMany({
        where: { userId: u.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return u;
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "user.deactivated",
      entityType: "User",
      entityId: updated.id,
      req,
    });

    logSecurityEvent("ACCOUNT_DEACTIVATED", {
      userId: req.user!.id,
      targetId: updated.id,
      email: updated.email,
      ip: req.ip,
    });

    res.json({ data: { id: updated.id, active: updated.active } });
  }),
);

usersRouter.post(
  "/:id/reactivate",
  requireRole("ADMINISTRATOR", "DEAN"),
  require2FAForHighRisk,
  asyncHandler(async (req, res) => {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { active: true, deactivatedAt: null },
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "user.reactivated",
      entityType: "User",
      entityId: updated.id,
      req,
    });

    logSecurityEvent("ACCOUNT_REACTIVATED", {
      userId: req.user!.id,
      targetId: updated.id,
      email: updated.email,
      ip: req.ip,
    });

    res.json({ data: { id: updated.id, active: updated.active } });
  }),
);

usersRouter.post(
  "/:id/unlock",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new HttpError(404, "User not found", "not_found");

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "user.unlocked",
      entityType: "User",
      entityId: user.id,
      req,
    });

    logSecurityEvent("ACCOUNT_REACTIVATED", {
      userId: req.user!.id,
      targetId: user.id,
      email: user.email,
      ip: req.ip,
      reason: "admin_unlock",
    });

    res.json({ data: { id: user.id, unlocked: true } });
  }),
);

usersRouter.post(
  "/:id/reset-link",
  requireRole("ADMINISTRATOR"),
  require2FAForHighRisk,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new HttpError(404, "User not found", "not_found");
    if (!user.active) throw new HttpError(400, "User is deactivated", "invalid_request");

    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);

    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "user.reset_link_generated",
      entityType: "User",
      entityId: user.id,
      req,
    });

    logSecurityEvent("PASSWORD_RESET_REQUESTED", {
      userId: req.user!.id,
      targetId: user.id,
      email: user.email,
      ip: req.ip,
      source: "admin_generated",
    });

    res.json({
      data: {
        userId: user.id,
        resetUrl: `${env.WEB_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`,
        expiresAt,
      },
    });
  }),
);
