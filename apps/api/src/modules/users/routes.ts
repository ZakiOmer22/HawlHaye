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

export const usersRouter = Router();

const ROLES: [Role, ...Role[]] = [
  "DEAN",
  "DEPUTY",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
  "ADMINISTRATOR",
  "LAB_TECHNICIAN",
];

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
          fullName: invite.email.split("@")[0],
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
