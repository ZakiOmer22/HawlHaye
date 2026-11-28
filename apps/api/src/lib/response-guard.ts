// apps/api/src/lib/response-guard.ts
//
// Last line of defence for API responses.
//
// Routes should already return explicit `select` shapes. This guard exists so that when somebody
// later writes `res.json({ data: await prisma.user.findUnique(...) })` and forgets a `select`,
// credentials / secrets / internal storage details STILL never leave the server.
//
// It walks every JSON body and removes a small set of keys that must never be sent to any client,
// at any depth. It never touches values, only drops these keys.
//
// NOTE: keep this list to keys that are unambiguously server-only. Do not add keys that some
// endpoint legitimately returns on purpose (e.g. the 2FA `secret` shown once during setup).

import type { RequestHandler } from "express";

export const FORBIDDEN_RESPONSE_KEYS: ReadonlySet<string> = new Set([
  "passwordHash",
  "twoFactorSecret",
  "resetTokenHash",
  "resetTokenExpiresAt",
  "tokenHash", // sessions, invites, password resets, 2FA challenges
  "codeHash", // 2FA backup codes
  "storageKey", // internal file name on disk
]);

const MAX_DEPTH = 16;

function isOpaque(value: object): boolean {
  if (value instanceof Date) return true;
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return true;
  // Anything that controls its own JSON form (e.g. Prisma Decimal) is left alone.
  return typeof (value as { toJSON?: unknown }).toJSON === "function";
}

/**
 * Returns `value` with every forbidden key removed. Copy-on-write: if nothing needed removing the
 * exact same reference comes back, so the common case costs one read-only walk and no allocation.
 * `removed` (optional) collects the names of the keys that were dropped, for logging.
 */
export function stripSensitive(value: unknown, removed?: Set<string>, depth = 0): unknown {
  if (value === null || typeof value !== "object" || depth > MAX_DEPTH) return value;
  if (isOpaque(value)) return value;

  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const next = stripSensitive(item, removed, depth + 1);
      if (next !== item) changed = true;
      return next;
    });
    return changed ? out : value;
  }

  const source = value as Record<string, unknown>;
  let changed = false;
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(source)) {
    if (FORBIDDEN_RESPONSE_KEYS.has(key)) {
      removed?.add(key);
      changed = true;
      continue;
    }
    const original = source[key];
    const next = stripSensitive(original, removed, depth + 1);
    if (next !== original) changed = true;
    out[key] = next;
  }

  return changed ? out : value;
}

export type GuardReport = { method: string; path: string; keys: string[] };

/**
 * Express middleware: wraps `res.json` so every JSON body goes through `stripSensitive`.
 * `onStrip` is called (with key NAMES only, never values) whenever something was removed, so a leak
 * in a route shows up in the logs and can be fixed at the source.
 */
export function createResponseGuard(onStrip?: (report: GuardReport) => void): RequestHandler {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body?: unknown) => {
      const removed = new Set<string>();
      const safe = stripSensitive(body, removed);
      if (removed.size > 0 && onStrip) {
        onStrip({
          method: req.method,
          path: (req.originalUrl ?? req.url).split("?")[0],
          keys: [...removed],
        });
      }
      return originalJson(safe);
    };

    next();
  };
}
