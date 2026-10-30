import type { Response } from "express";
import { env } from "../config/env";

/** Session cookie name — sourced from env, "session" fallback */
export const SESSION_COOKIE = env.SESSION_COOKIE_NAME;

/** CSRF cookie name — deliberately NOT httpOnly so the SPA can read it */
export const CSRF_COOKIE = "csrf";

const isProd = env.NODE_ENV === "production";

function baseCookieOpts(httpOnly: boolean) {
  return {
    httpOnly,
    secure: isProd,
    // "none" is required for cross-domain requests (Vercel frontend <-> Render backend)
    // "none" MUST be paired with secure: true (HTTPS)
    // In dev, we use "lax" so it works over http://localhost
    sameSite: (isProd ? "none" : "lax") as "none" | "lax" | "strict",
    path: "/",
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    ...baseCookieOpts(true),
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseCookieOpts(true));
}

/**
 * CSRF cookie is readable by JS (httpOnly: false) so a same-origin SPA
 * can echo its value back as `X-CSRF-Token`. SameSite=Strict makes the
 * cookie unreadable from cross-site contexts, so a stolen value is useless.
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, {
    ...baseCookieOpts(false),
    sameSite: isProd ? "none" : "strict",
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE, {
    ...baseCookieOpts(false),
    sameSite: isProd ? "none" : "strict",
  });
}
