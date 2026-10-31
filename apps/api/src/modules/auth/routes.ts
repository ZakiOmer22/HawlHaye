import { Router } from "express";
import { randomBytes } from "node:crypto";
import rateLimit from "express-rate-limit";
import { loginSchema } from "@hawl/shared";
import { z } from "zod";
import xss from "xss";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { passwordSchema } from "../../lib/password-policy";
import { generateToken, hashToken } from "../../lib/tokens";
import {
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE,
  setCsrfCookie,
  clearCsrfCookie,
} from "../../lib/cookies";
import { writeAudit } from "../../lib/audit";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/errors";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { logSecurityEvent } from "../../lib/security";
import { sendPasswordReset } from "../../lib/mailer";
import { authenticator, qrcodeLib } from "../../lib/otp";
import { passkeysRouter } from "./passkeys";
import { ensure2FAGraceStarted, compute2FAStatus } from "../../lib/twofa";
import { generateBackupCodes, consumeBackupCode, countUnusedCodes } from "../../lib/backup-codes";

export const authRouter = Router();

const IMPERSONATION_TTL_MS = 60 * 60 * 1000;
const IMPERSONATOR_COOKIE = "impersonator_token";

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again later." } },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again later." } },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 3,
  keyGenerator: (req) => req.ip || "unknown",
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again later." } },
});

function lockoutMinutesFor(attempts: number, role: string): number {
  const threshold = env.LOGIN_MAX_ATTEMPTS;
  if (attempts < threshold) return 0;

  const isLeadershipRole = role === "DEAN" || role === "DEPUTY" || role === "ADMINISTRATOR";
  if (isLeadershipRole) return 5;

  if (attempts === threshold) return 5;
  if (attempts === threshold + 1) return 15;
  if (attempts === threshold + 2) return 60;
  return 24 * 60;
}

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) {
      await writeAudit({ action: "auth.login_failed", meta: { email: input.email }, req });
      logSecurityEvent("LOGIN_FAILED", {
        email: input.email,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        reason: "unknown_user",
      });
      throw new HttpError(401, "Invalid email or password", "invalid_credentials");
    }
    if (!user.active) {
      logSecurityEvent("LOGIN_FAILED", {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        reason: "deactivated",
      });
      throw new HttpError(403, "Account deactivated", "forbidden");
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      logger.warn({ email: user.email, ip: req.ip }, "SECURITY ALERT: attempt on locked account");
      await writeAudit({
        actorId: user.id,
        action: "auth.login_locked",
        entityType: "User",
        entityId: user.id,
        req,
      });
      logSecurityEvent("LOGIN_LOCKED", { userId: user.id, email: user.email, ip: req.ip });
      throw new HttpError(403, "Account locked. Try again later.", "account_locked");
    }

    const ok = await verifyPassword(user.passwordHash, input.password);

    if (!ok) {
      const newFailedCount = user.failedLoginCount + 1;
      const lockoutMinutes = lockoutMinutesFor(newFailedCount, user.role);
      const lockedUntil =
        lockoutMinutes > 0 ? new Date(Date.now() + lockoutMinutes * 60_000) : null;

      if (lockoutMinutes > 0) {
        logger.warn(
          { email: user.email, ip: req.ip, attempts: newFailedCount, lockoutMinutes },
          "SECURITY ALERT: account locked after repeated failures",
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: newFailedCount, lockedUntil },
      });

      await writeAudit({
        actorId: user.id,
        action: "auth.login_failed",
        entityType: "User",
        entityId: user.id,
        req,
      });

      logSecurityEvent("LOGIN_FAILED", {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        attempts: newFailedCount,
        lockoutMinutes,
      });

      throw new HttpError(401, "Invalid email or password", "invalid_credentials");
    }

    if (user.twoFactorEnabled) {
      const tempToken = generateToken();
      const expiresAt = new Date(Date.now() + 5 * 60_000);

      await prisma.twoFactorChallenge.create({
        data: { userId: user.id, tokenHash: hashToken(tempToken), expiresAt },
      });

      return res.json({
        data: {
          requires2FA: true,
          tempToken,
        },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await ensure2FAGraceStarted(prisma, user.id);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000);

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
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      req,
    });

    logSecurityEvent("LOGIN_SUCCESS", {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    const csrfToken = randomBytes(32).toString("hex");
    setSessionCookie(res, token, expiresAt);
    setCsrfCookie(res, csrfToken);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        officeId: user.officeId,
        mustChangePassword: user.mustChangePassword,
        csrfToken,
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
        logSecurityEvent("LOGOUT", { userId: session.userId, ip: req.ip });
      }
    }
    clearSessionCookie(res);
    clearCsrfCookie(res);
    res.status(204).end();
  }),
);

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: passwordSchema,
  })
  .strict();

authRouter.post(
  "/change-password",
  requireAuth,
  changePasswordLimiter,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.passwordHash) {
      throw new HttpError(400, "No password set on this account", "invalid_request");
    }

    const ok = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!ok) {
      logSecurityEvent("LOGIN_FAILED", {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        reason: "change_password_bad_current",
      });
      throw new HttpError(401, "Current password is incorrect", "invalid_credentials");
    }

    const newHash = await hashPassword(input.newPassword);
    const currentToken = req.cookies?.[SESSION_COOKIE];
    const currentHash = currentToken ? hashToken(currentToken) : null;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
        },
      }),
      prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          ...(currentHash ? { NOT: { tokenHash: currentHash } } : {}),
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    await writeAudit({
      actorId: user.id,
      action: "auth.password_changed",
      entityType: "User",
      entityId: user.id,
      req,
    });
    logSecurityEvent("PASSWORD_CHANGED", {
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    res.status(204).end();
  }),
);

const forgotPasswordSchema = z.object({ email: z.string().email().max(254) }).strict();

authRouter.post(
  "/forgot-password",
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.active) {
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);

      await prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
      });

      try {
        await sendPasswordReset(user.email, token);
      } catch (err) {
        logger.error({ err, email: user.email }, "password reset delivery failed");
      }

      logSecurityEvent("PASSWORD_RESET_REQUESTED", {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });
    }

    res.status(204).end();
  }),
);

const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(200),
    password: passwordSchema,
  })
  .strict();

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const reset = await prisma.passwordReset.findUnique({
      where: { tokenHash: hashToken(input.token) },
    });

    if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, "Invalid or expired reset token", "invalid_token");
    }

    const newHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await writeAudit({
      actorId: reset.userId,
      action: "auth.password_reset",
      entityType: "User",
      entityId: reset.userId,
      req,
    });
    logSecurityEvent("PASSWORD_RESET_COMPLETED", {
      userId: reset.userId,
      ip: req.ip,
    });

    res.status(204).end();
  }),
);

const acceptInviteSchema = z
  .object({
    token: z.string().min(32),
    password: passwordSchema,
    fullName: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .transform((val) => xss(val))
      .optional(),
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
          fullName: input.fullName ?? invite.email.split("@")[0],
          passwordHash,
          role: invite.role,
          officeId: invite.officeId,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
        },
        update: {
          passwordHash,
          role: invite.role,
          officeId: invite.officeId,
          active: true,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return created;
    });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000);

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

    logSecurityEvent("INVITE_ACCEPTED", {
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    const csrfToken = randomBytes(32).toString("hex");
    setSessionCookie(res, token, expiresAt);
    setCsrfCookie(res, csrfToken);

    res.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        officeId: user.officeId,
        csrfToken,
      },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    await ensure2FAGraceStarted(prisma, req.user!.id);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        officeId: true,
        mustChangePassword: true,
        twoFactorEnabled: true,
        twoFAExemptUntil: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new HttpError(404, "User not found", "not_found");

    const token = req.cookies?.[SESSION_COOKIE];
    const session = token
      ? await prisma.session.findUnique({
          where: { tokenHash: hashToken(token) },
          select: { impersonatedById: true },
        })
      : null;

    let impersonatedBy: { id: string; fullName: string } | null = null;
    if (session?.impersonatedById) {
      impersonatedBy = await prisma.user.findUnique({
        where: { id: session.impersonatedById },
        select: { id: true, fullName: true },
      });
    }

    const twoFAStatus = compute2FAStatus(user);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        officeId: user.officeId,
        mustChangePassword: user.mustChangePassword,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        impersonatedBy,
        twoFAStatus,
      },
    });
  }),
);

authRouter.post(
  "/impersonate/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const actor = req.user!;

    if (actor.role !== "ADMINISTRATOR" && actor.role !== "DEAN") {
      throw new HttpError(403, "Only administrators and deans can impersonate users", "forbidden");
    }

    const targetId = req.params.userId;
    if (targetId === actor.id) {
      throw new HttpError(400, "You cannot impersonate yourself", "invalid_request");
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, "User not found", "not_found");
    if (!target.active) throw new HttpError(400, "Target user is deactivated", "invalid_request");

    if (target.role === "ADMINISTRATOR" || target.role === "DEAN") {
      throw new HttpError(403, "You cannot impersonate another administrator or dean", "forbidden");
    }

    const currentToken = req.cookies?.[SESSION_COOKIE];
    if (!currentToken) throw new HttpError(401, "No session", "unauthenticated");

    const currentSession = await prisma.session.findUnique({
      where: { tokenHash: hashToken(currentToken) },
    });
    if (!currentSession || currentSession.revokedAt || currentSession.expiresAt < new Date()) {
      throw new HttpError(401, "Session expired", "unauthenticated");
    }
    if (currentSession.impersonatedById) {
      throw new HttpError(
        400,
        "You are already impersonating. Return to your admin session first.",
        "invalid_request",
      );
    }

    const newToken = generateToken();
    const newExpiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS);

    await prisma.session.create({
      data: {
        userId: target.id,
        tokenHash: hashToken(newToken),
        expiresAt: newExpiresAt,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        impersonatedById: actor.id,
      },
    });

    res.cookie(IMPERSONATOR_COOKIE, currentToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      expires: currentSession.expiresAt,
      path: "/",
    });

    const csrfToken = randomBytes(32).toString("hex");
    setSessionCookie(res, newToken, newExpiresAt);
    setCsrfCookie(res, csrfToken);

    await writeAudit({
      actorId: actor.id,
      action: "auth.impersonate_start",
      entityType: "User",
      entityId: target.id,
      meta: { targetEmail: target.email, targetRole: target.role },
      req,
    });
    logSecurityEvent("IMPERSONATION_STARTED", {
      userId: actor.id,
      targetId: target.id,
      email: target.email,
      ip: req.ip,
    });

    res.json({
      data: {
        target: { id: target.id, fullName: target.fullName, role: target.role },
      },
    });
  }),
);

authRouter.post(
  "/impersonation/stop",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentToken = req.cookies?.[SESSION_COOKIE];
    if (!currentToken) throw new HttpError(401, "No session", "unauthenticated");

    const currentSession = await prisma.session.findUnique({
      where: { tokenHash: hashToken(currentToken) },
      include: { user: true },
    });

    if (!currentSession || !currentSession.impersonatedById) {
      throw new HttpError(400, "You are not currently impersonating", "invalid_request");
    }

    const adminToken = req.cookies?.[IMPERSONATOR_COOKIE];
    if (!adminToken) {
      throw new HttpError(
        400,
        "Impersonator session not found. Please log in again.",
        "unauthenticated",
      );
    }

    const adminSession = await prisma.session.findUnique({
      where: { tokenHash: hashToken(adminToken) },
      include: { user: true },
    });

    if (!adminSession || adminSession.revokedAt || adminSession.expiresAt < new Date()) {
      throw new HttpError(401, "Admin session expired. Please log in again.", "unauthenticated");
    }

    await prisma.session.update({
      where: { id: currentSession.id },
      data: { revokedAt: new Date() },
    });

    const csrfToken = randomBytes(32).toString("hex");
    setSessionCookie(res, adminToken, adminSession.expiresAt);
    setCsrfCookie(res, csrfToken);
    res.clearCookie(IMPERSONATOR_COOKIE, { path: "/" });

    await writeAudit({
      actorId: adminSession.userId,
      action: "auth.impersonate_stop",
      entityType: "User",
      entityId: currentSession.userId,
      meta: { targetEmail: currentSession.user.email },
      req,
    });
    logSecurityEvent("IMPERSONATION_STOPPED", {
      userId: adminSession.userId,
      targetId: currentSession.userId,
      email: currentSession.user.email,
      ip: req.ip,
    });

    res.json({ data: { success: true } });
  }),
);

authRouter.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, ip: true, userAgent: true, createdAt: true, lastSeenAt: true },
    });
    res.json({ data: sessions });
  }),
);

authRouter.delete(
  "/sessions/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session || session.userId !== req.user!.id) {
      throw new HttpError(404, "Session not found", "not_found");
    }
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    logSecurityEvent("SESSION_REVOKED", {
      userId: req.user!.id,
      targetId: session.id,
      ip: req.ip,
    });
    res.status(204).end();
  }),
);

authRouter.post(
  "/2fa/setup",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, "User not found", "not_found");

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, "HAWLHAYE", secret);
    const qrCodeUrl = await qrcodeLib.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    res.json({ data: { secret, qrCodeUrl } });
  }),
);

authRouter.post(
  "/2fa/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new HttpError(400, "Token required", "invalid_request");

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.twoFactorSecret) {
      throw new HttpError(400, "2FA not set up", "invalid_request");
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) throw new HttpError(400, "Invalid code", "invalid_token");

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFAExemptUntil: null },
    });

    // Generate 10 fresh backup codes and return them to the user (shown once)
    const backupCodes = await generateBackupCodes(user.id);

    await writeAudit({
      actorId: user.id,
      action: "auth.2fa_enabled",
      entityType: "User",
      entityId: user.id,
      req,
    });

    logSecurityEvent("2FA_ENABLED", { userId: user.id, ip: req.ip });

    res.json({ data: { success: true, backupCodes } });
  }),
);

authRouter.post(
  "/2fa/disable",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) throw new HttpError(400, "Password required", "invalid_request");

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.passwordHash) {
      throw new HttpError(400, "User not found", "not_found");
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) throw new HttpError(401, "Incorrect password", "invalid_credentials");

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      }),
      prisma.backupCode.deleteMany({ where: { userId: user.id } }),
    ]);

    await writeAudit({
      actorId: user.id,
      action: "auth.2fa_disabled",
      entityType: "User",
      entityId: user.id,
      req,
    });

    logSecurityEvent("2FA_DISABLED", { userId: user.id, ip: req.ip });

    res.json({ data: { success: true } });
  }),
);

// ── Backup codes ──────────────────────────────────────────
authRouter.get(
  "/2fa/backup-codes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const remaining = await countUnusedCodes(req.user!.id);
    res.json({ data: { remaining, total: 10 } });
  }),
);

authRouter.post(
  "/2fa/backup-codes/regenerate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) throw new HttpError(400, "Password required", "invalid_request");

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.passwordHash) {
      throw new HttpError(400, "User not found", "not_found");
    }
    if (!user.twoFactorEnabled) {
      throw new HttpError(400, "2FA is not enabled", "invalid_request");
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) throw new HttpError(401, "Incorrect password", "invalid_credentials");

    const codes = await generateBackupCodes(user.id);

    await writeAudit({
      actorId: user.id,
      action: "auth.2fa_backup_codes_regenerated",
      entityType: "User",
      entityId: user.id,
      req,
    });

    logSecurityEvent("2FA_BACKUP_CODES_REGENERATED", {
      userId: user.id,
      ip: req.ip,
    });

    res.json({ data: { backupCodes: codes } });
  }),
);

authRouter.post(
  "/2fa/authenticate",
  asyncHandler(async (req, res) => {
    const { code, tempToken, isBackupCode } = req.body;
    if (!code || !tempToken) throw new HttpError(400, "Missing fields", "invalid_request");

    const challenge = await prisma.twoFactorChallenge.findUnique({
      where: { tokenHash: hashToken(tempToken) },
      include: { user: true },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      throw new HttpError(401, "2FA session expired. Please log in again.", "unauthenticated");
    }

    let isValid = false;
    let usedBackupCode = false;

    if (isBackupCode === true) {
      isValid = await consumeBackupCode(challenge.user.id, code);
      usedBackupCode = isValid;
    } else {
      isValid = authenticator.verify({
        token: code,
        secret: challenge.user.twoFactorSecret!,
      });
    }

    if (!isValid) throw new HttpError(400, "Invalid code", "invalid_token");

    await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } });

    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000);

    await prisma.session.create({
      data: {
        userId: challenge.user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    await writeAudit({
      actorId: challenge.user.id,
      action: usedBackupCode ? "auth.2fa_backup_code_used" : "auth.login",
      entityType: "User",
      entityId: challenge.user.id,
      req,
    });

    logSecurityEvent("LOGIN_SUCCESS", {
      userId: challenge.user.id,
      email: challenge.user.email,
      role: challenge.user.role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      method: usedBackupCode ? "backup_code" : "totp",
    });

    const csrfToken = randomBytes(32).toString("hex");
    setSessionCookie(res, sessionToken, expiresAt);
    setCsrfCookie(res, csrfToken);

    res.json({
      data: {
        id: challenge.user.id,
        email: challenge.user.email,
        fullName: challenge.user.fullName,
        role: challenge.user.role,
        officeId: challenge.user.officeId,
        mustChangePassword: challenge.user.mustChangePassword,
        csrfToken,
        usedBackupCode,
      },
    });
  }),
);

// ── Onboarding status ──────────────────────────────────────
authRouter.get(
  "/onboarding",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },              // ← was req.user.id
      select: { onboardingCompletedAt: true },
    });
    res.json({ data: { completed: user?.onboardingCompletedAt !== null } });
  }),
);

// ── Mark onboarding as completed ───────────────────────────
authRouter.post(
  "/onboarding/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user!.id },              // ← was req.user.id
      data: { onboardingCompletedAt: new Date() },
    });
    res.status(204).end();
  }),
);

authRouter.use("/passkeys", passkeysRouter);
