import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { hashToken } from "../lib/tokens";
import { SESSION_COOKIE } from "../lib/cookies";
import { HttpError } from "./errors";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new HttpError(401, "Authentication required", "unauthenticated");

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session) throw new HttpError(401, "Invalid session", "unauthenticated");
    if (session.revokedAt) throw new HttpError(401, "Session revoked", "unauthenticated");
    if (session.expiresAt.getTime() < Date.now())
      throw new HttpError(401, "Session expired", "unauthenticated");
    if (!session.user.active) throw new HttpError(403, "Account deactivated", "forbidden");

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      officeId: session.user.officeId,
    };

    // fire-and-forget lastSeenAt bump, don't await in the critical path
    prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);

    next();
  } catch (err) {
    next(err);
  }
};
