import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "./errors";

type SettingsCache = {
  data: Awaited<ReturnType<typeof prisma.systemSettings.findUnique>>;
  expiresAt: number;
};

let cache: SettingsCache | null = null;

export async function getSystemSettings() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  let settings = await prisma.systemSettings.findUnique({
    where: { id: "global" },
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: "global" },
    });
  }

  cache = { data: settings, expiresAt: now + 10_000 }; // 10 second cache
  return settings;
}

export function invalidateSettingsCache() {
  cache = null;
}

// ── MAINTENANCE MODE ENFORCEMENT ──────────────────────────────
export const checkMaintenance: RequestHandler = async (req, res, next) => {
  // Allow Admins, Auth routes, and Public endpoints
  if (
    req.user?.role === "ADMINISTRATOR" ||
    req.path.startsWith("/api/v1/auth") ||
    req.path === "/health"
  ) {
    return next();
  }

  try {
    const settings = await getSystemSettings();
    if (settings?.maintenanceMode) {
      return next(
        new HttpError(
          503,
          "The system is currently undergoing scheduled maintenance.",
          "maintenance_mode",
        ),
      );
    }
  } catch {
    // Fail open if DB is unreachable
  }
  next();
};

// ── ENFORCE 2FA ENFORCEMENT ───────────────────────────────────
export const check2FA: RequestHandler = async (req, _res, next) => {
  if (!req.user) return next();

  // Allow Admins and Auth routes (to set up 2FA)
  if (req.user.role === "ADMINISTRATOR" || req.path.startsWith("/api/v1/auth")) {
    return next();
  }

  try {
    const settings = await getSystemSettings();

    // Only query the DB if the policy is active
    if (settings?.enforce2FA) {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { twoFactorEnabled: true }, // Safely check the DB
      });

      if (!dbUser?.twoFactorEnabled) {
        return next(
          new HttpError(
            403,
            "Two-factor authentication is required by your administrator.",
            "2fa_required",
          ),
        );
      }
    }
  } catch {
    // Fail open if DB is unreachable
  }
  next();
};
