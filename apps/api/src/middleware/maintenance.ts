import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "./errors";
import { getSystemSettings } from "./settings";
import { hashToken } from "../lib/tokens";
import { SESSION_COOKIE } from "../lib/cookies";

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
        include: { user: { select: { role: true } } },
      });

      // 🚀 ALLOW DEAN & DEPUTY TO BYPASS
      const allowedRoles = ["ADMINISTRATOR", "DEAN", "DEPUTY"];
      if (session?.user.role && allowedRoles.includes(session.user.role)) {
        return next();
      }
    }

    return next(new HttpError(503, "System under maintenance", "maintenance_mode"));
  } catch {
    next();
  }
};
