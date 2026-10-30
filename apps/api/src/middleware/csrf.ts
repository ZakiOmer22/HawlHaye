import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env";
import { HttpError } from "./errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Endpoints that cannot possibly carry a CSRF cookie yet (pre-auth):
 *   - /login: the cookie is minted by the response to this call
 *   - /invite/accept: same — user has no session until success
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

  // ── Layer 1: Origin / Referer must match WEB_ORIGIN if present ──
  const origin = req.headers.origin || req.headers.referer;
  if (origin && !origin.startsWith(env.WEB_ORIGIN)) {
    return next(new HttpError(403, "CSRF validation failed: invalid origin", "csrf_failed"));
  }

  // ── Layer 2: double-submit token (only if a CSRF cookie exists) ──
  // SPA clients receive `csrf` at login and echo it as `X-CSRF-Token`.
  // Non-browser clients (CLI, service accounts) have no cookie — they
  // rely on Authorization headers and are not exposed to CSRF.
  const cookieToken = req.cookies?.["csrf"];
  if (typeof cookieToken === "string") {
    const headerToken = req.headers["x-csrf-token"];
    if (typeof headerToken !== "string" || !tokensEqual(cookieToken, headerToken)) {
      return next(new HttpError(403, "CSRF validation failed: token mismatch", "csrf_failed"));
    }
  }

  next();
};
