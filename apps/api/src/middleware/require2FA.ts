import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "./async";
import { HttpError } from "./errors";
import { compute2FAStatus } from "../lib/twofa";

/**
 * Rejects the request with `403 2fa_required` when the caller is a leadership
 * user who has exceeded their grace period without enabling 2FA.
 * Non-leadership users and users with 2FA enabled pass through silently.
 */
export const require2FAForHighRisk: RequestHandler = asyncHandler(async (req, _res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { role: true, twoFactorEnabled: true, twoFAExemptUntil: true },
  });
  if (!user) throw new HttpError(401, "User not found", "unauthenticated");

  const status = compute2FAStatus(user);
  if (status.enforcement === "blocked") {
    throw new HttpError(
      403,
      "Two-factor authentication is required to perform this action. Enable it in Profile → Security.",
      "2fa_required",
    );
  }
  next();
});
