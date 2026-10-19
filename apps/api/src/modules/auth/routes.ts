import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema } from "@hawl/shared";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { generateToken, hashToken } from "../../lib/tokens";
import { setSessionCookie, clearSessionCookie, SESSION_COOKIE } from "../../lib/cookies";
import { writeAudit } from "../../lib/audit";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/errors";
import { env } from "../../config/env";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: Number(env.LOGIN_LOCKOUT_MINUTES) * 60_000,
  max: Number(env.LOGIN_MAX_ATTEMPTS),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again later." } },
});

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) {
      await writeAudit({ action: "auth.login_failed", meta: { email: input.email }, req });
      throw new HttpError(401, "Invalid email or password", "invalid_credentials");
    }
    if (!user.active) throw new HttpError(403, "Account deactivated", "forbidden");

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      await writeAudit({
        actorId: user.id,
        action: "auth.login_failed",
        entityType: "User",
        entityId: user.id,
        req,
      });
      throw new HttpError(401, "Invalid email or password", "invalid_credentials");
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + Number(env.SESSION_TTL_HOURS) * 3600_000);
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAudit({
      actorId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      req,
    });

    setSessionCookie(res, token, expiresAt);
    res.json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        officeId: user.officeId,
      },
    });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
      if (session && !session.revokedAt) {
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        await writeAudit({
          actorId: session.userId,
          action: "auth.logout",
          entityType: "User",
          entityId: session.userId,
          req,
        });
      }
    }
    clearSessionCookie(res);
    res.status(204).end();
  }),
);

const acceptInviteSchema = z
  .object({
    token: z.string().min(32),
    password: z.string().min(10).max(200),
    fullName: z.string().trim().min(2).max(120).optional(),
  })
  .strict();

authRouter.post(
  "/invite/accept",
  asyncHandler(async (req, res) => {
    const input = acceptInviteSchema.parse(req.body);
    const invite = await prisma.invite.findUnique({
      where: { tokenHash: hashToken(input.token) },
    });
    if (!invite) throw new HttpError(400, "Invite not found", "invalid_invite");
    if (invite.acceptedAt) throw new HttpError(400, "Invite already used", "invalid_invite");
    if (invite.revokedAt) throw new HttpError(400, "Invite revoked", "invalid_invite");
    if (invite.expiresAt.getTime() < Date.now())
      throw new HttpError(400, "Invite expired", "invalid_invite");

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.upsert({
        where: { email: invite.email },
        create: {
          email: invite.email,
          fullName: input.fullName ?? invite.email.split("@")[0] ?? invite.email,
          passwordHash,
          role: invite.role,
          officeId: invite.officeId,
        },
        update: { passwordHash, role: invite.role, officeId: invite.officeId, active: true },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return created;
    });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + Number(env.SESSION_TTL_HOURS) * 3600_000);
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "auth.invite_accepted",
      entityType: "User",
      entityId: user.id,
      req,
    });

    setSessionCookie(res, token, expiresAt);
    res.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        officeId: user.officeId,
      },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        officeId: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    res.json({ data: user });
  }),
);
