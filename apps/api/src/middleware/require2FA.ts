import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "./errors";
import { getSystemSettings } from "./settings";
import { hashToken } from "../lib/tokens";
import { SESSION_COOKIE } from "../lib/cookies";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const check2FA: RequestHandler = async (req, _res, next) => {
  // 1. Skip read-only requests entirely! Let them view the board.
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  // 2. Skip auth routes (so they can actually set up 2FA)
  if (req.path.startsWith("/api/v1/auth") || req.path === "/health") {
    return next();
  }

  try {
    const settings = await getSystemSettings();
    if (!settings?.enforce2FA) return next();

    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return next();

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: {
            role: true,
            twoFactorEnabled: true,
            twoFAExemptUntil: true,
          },
        },
      },
    });

    const u = session?.user;
    if (!u) return next();

    // Admins bypass, users with 2FA bypass, users in grace period bypass
    if (u.role === "ADMINISTRATOR") return next();
    if (u.twoFactorEnabled) return next();
    if (u.twoFAExemptUntil && u.twoFAExemptUntil > new Date()) return next();

    // Block the mutation
    return next(
      new HttpError(
        403,
        "Two-factor authentication is required to perform this action.",
        "2fa_required",
      ),
    );
  } catch {
    next();
  }
};

export const require2FAForHighRisk: RequestHandler = async (req, _res, next) => {
  if (!req.user) {
    return next(new HttpError(401, "Authentication required", "unauthenticated"));
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorEnabled: true },
    });

    if (!dbUser?.twoFactorEnabled) {
      return next(
        new HttpError(
          403,
          "Two-factor authentication must be enabled to perform this action.",
          "2fa_required",
        ),
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
