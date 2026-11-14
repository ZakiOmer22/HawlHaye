import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env";
import { HttpError } from "./errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Endpoints that cannot possibly carry a CSRF cookie yet (pre-auth):
 *   - /login: the cookie is minted by the response to this call
 *   - /invite/accept: same - user has no session until success
 * These are protected by rate limit + credentials instead.
 */
const PRE_AUTH_PATHS = new Set(["/api/v1/auth/login", "/api/v1/auth/invite/accept"]);

function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (PRE_AUTH_PATHS.has(req.path)) return next();
  if (env.NODE_ENV === "test") return next();

  // Layer 1: Origin / Referer must strictly match WEB_ORIGIN
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    return next(new HttpError(403, "CSRF validation failed: missing origin", "csrf_failed"));
  }

  try {
    const requestOrigin = new URL(origin).origin;
    const expectedOrigin = new URL(env.WEB_ORIGIN).origin;

    if (requestOrigin !== expectedOrigin) {
      return next(new HttpError(403, "CSRF validation failed: invalid origin", "csrf_failed"));
    }
  } catch {
    return next(new HttpError(403, "CSRF validation failed: malformed origin", "csrf_failed"));
  }

  // Layer 2: double-submit token (only if a CSRF cookie exists)
  const cookieToken = req.cookies?.["csrf"];
  if (typeof cookieToken === "string") {
    const headerToken = req.headers["x-csrf-token"];
    if (typeof headerToken !== "string" || !tokensEqual(cookieToken, headerToken)) {
      return next(new HttpError(403, "CSRF validation failed: token mismatch", "csrf_failed"));
    }
  }

  next();
};
