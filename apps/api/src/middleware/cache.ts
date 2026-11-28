import type { RequestHandler } from "express";

export const cacheControl: RequestHandler = (req, res, next) => {
  // Do not cache SSE streams
  if (req.path === "/notifications/stream") {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return next();
  }

  // Every API response — not just GET — can contain personal data or one-time secrets
  // (login tempToken, 2FA secret + backup codes, password-reset links, signed file URLs).
  // None of it may be stored by browsers, shared proxies or CDNs.
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
};
