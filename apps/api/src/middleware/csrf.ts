import type { RequestHandler } from "express";
import { env } from "../config/env";
import { HttpError } from "./errors";

/**
 * Origin-based CSRF protection.
 * Rejects unsafe HTTP methods (POST/PUT/PATCH/DELETE) unless the request
 * originates from the configured WEB_ORIGIN. Requests without an Origin
 * header (server-to-server, CLIs) are permitted; SameSite cookies remain
 * the primary defence in depth.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin || req.headers.referer;

  if (!origin) {
    return next();
  }

  if (!origin.startsWith(env.WEB_ORIGIN)) {
    return next(new HttpError(403, "CSRF validation failed: Invalid Origin", "csrf_failed"));
  }

  next();
};
