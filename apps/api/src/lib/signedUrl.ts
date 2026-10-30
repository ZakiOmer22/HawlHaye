import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

const ALG = "sha256";

export function signAttachmentToken(
  attachmentId: string,
  userId: string,
  ttlSeconds = 300,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${attachmentId}.${userId}.${exp}`;
  const sig = createHmac(ALG, env.SESSION_SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyAttachmentToken(token: string): {
  attachmentId: string;
  userId: string;
} | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  let payload: string;
  try {
    payload = Buffer.from(parts[0], "base64url").toString("utf8");
  } catch {
    return null;
  }

  const sig = parts[1];
  const expected = createHmac(ALG, env.SESSION_SECRET).update(payload).digest("hex");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const [attachmentId, userId, expStr] = payload.split(".");
  if (!attachmentId || !userId || !expStr) return null;

  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  return { attachmentId, userId };
}
