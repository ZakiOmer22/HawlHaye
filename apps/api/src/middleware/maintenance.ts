import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "./errors";
import { getSystemSettings } from "./settings";
import { hashToken } from "../lib/tokens";
import { SESSION_COOKIE } from "../lib/cookies";

// Roles that may keep working while the system is in maintenance mode.
const MAINTENANCE_BYPASS_ROLES = new Set(["ADMINISTRATOR", "DEAN", "DEPUTY"]);

export const checkMaintenance: RequestHandler = async (req, _res, next) => {
  if (req.path.startsWith("/api/v1/auth") || req.path === "/health") {
    return next();
  }

  try {
    const settings = await getSystemSettings();
    if (!settings?.maintenanceMode) return next();

    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashToken(token) },
        select: {
          revokedAt: true,
          expiresAt: true,
          user: { select: { role: true, active: true } },
        },
      });

      // The bypass only counts for a LIVE session of an ACTIVE user. Previously a revoked or
      // expired session of an admin (e.g. after logout) could still skip maintenance mode.
      const live =
        !!session &&
        !session.revokedAt &&
        session.expiresAt.getTime() > Date.now() &&
        session.user.active;

      if (live && MAINTENANCE_BYPASS_ROLES.has(session.user.role)) {
        return next();
      }
    }

    return next(new HttpError(503, "System under maintenance", "maintenance_mode"));
  } catch {
    next();
  }
};
