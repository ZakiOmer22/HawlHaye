import { Router } from "express";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { generateToken, hashToken } from "../../lib/tokens";
import { writeAudit } from "../../lib/audit";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { HttpError } from "../../middleware/errors";
import { env } from "../../config/env";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const ROLES: [Role, ...Role[]] = [
  "DEAN",
  "DEPUTY",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
  "ADMINISTRATOR",
  "LAB_TECHNICIAN",
];

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
  asyncHandler(async (req, res) => {
    const input = inviteSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing?.passwordHash) {
      throw new HttpError(409, "User already exists", "conflict");
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.INVITE_TTL_HOURS * 3600_000);

    const invite = await prisma.invite.create({
      data: {
        email: input.email,
        role: input.role,
        officeId: input.officeId,
        invitedById: req.user!.id,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "user.invited",
      entityType: "User",
      entityId: invite.id,
      meta: { email: input.email, role: input.role },
      req,
    });

    // In dev we return the token so QA can test without email. Never in production.
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
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: input,
    });
    // Plan §7.6 #3: revoke sessions on role change
    if (input.role !== undefined) {
      await prisma.session.updateMany({
        where: { userId: updated.id, revokedAt: null },
        data: { revokedAt: new Date() },
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
    res.json({ data: { id: updated.id, active: updated.active } });
  }),
);

usersRouter.post(
  "/:id/reactivate",
  requireRole("ADMINISTRATOR", "DEAN"),
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
    res.json({ data: { id: updated.id, active: updated.active } });
  }),
);
