import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { hashToken } from "../lib/tokens";
import { SESSION_COOKIE } from "../lib/cookies";
import { env } from "../config/env";
import { asyncHandler } from "./async";
import { HttpError } from "./errors";

const PASSWORD_ROTATION_ALLOWED = [
  "/api/v1/auth/change-password",
  "/api/v1/auth/logout",
  "/api/v1/auth/me",
];

export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw new HttpError(401, "Authentication required", "unauthenticated");

  // Allowlist, not blocklist: the password hash, 2FA secret and reset-token columns are never even
  // loaded into the request context, so no handler can leak them by accident.
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      lastSeenAt: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          officeId: true,
          active: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "Session expired or invalid", "unauthenticated");
  }
  if (!session.user.active) {
    throw new HttpError(403, "Account deactivated", "forbidden");
  }

  const idleMs = env.IDLE_TIMEOUT_MINUTES * 60_000;
  if (session.lastSeenAt.getTime() + idleMs < Date.now()) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw new HttpError(401, "Session expired due to inactivity", "session_idle");
  }

  if (session.lastSeenAt.getTime() < Date.now() - 60_000) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {
        /* best-effort heartbeat */
      });
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    officeId: session.user.officeId,
  };

  if (session.user.mustChangePassword) {
    const path = req.originalUrl.split("?")[0];
    const allowed =
      PASSWORD_ROTATION_ALLOWED.includes(path) || path.startsWith("/api/v1/auth/sessions");
    if (!allowed) {
      throw new HttpError(403, "Password change required", "password_change_required");
    }
  }

  next();
});
