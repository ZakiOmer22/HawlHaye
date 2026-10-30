import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { hashToken } from "./tokens";

const CODE_COUNT = 10;
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 confusion
const SEGMENT = 5;

/**
 * Returns codes as plain text (to show the user ONCE) and stores only hashes.
 * Format: XXXXX-XXXXX
 */
export async function generateBackupCodes(userId: string): Promise<string[]> {
  // Revoke all existing unused codes first — regenerate means "replace"
  await prisma.backupCode.deleteMany({
    where: { userId },
  });

  const plain: string[] = [];
  const rows: { userId: string; codeHash: string }[] = [];

  for (let i = 0; i < CODE_COUNT; i++) {
    const code = generateOne();
    plain.push(code);
    rows.push({ userId, codeHash: hashToken(normalize(code)) });
  }

  await prisma.backupCode.createMany({ data: rows });
  return plain;
}

/**
 * Consumes a code if it matches an unused backup code for this user.
 * Returns true if successfully used, false otherwise. Marks the code used
 * (atomic-ish — the updateMany ensures only one caller wins).
 */
export async function consumeBackupCode(userId: string, submitted: string): Promise<boolean> {
  const normalized = normalize(submitted);
  if (normalized.length !== SEGMENT * 2) return false;

  const hash = hashToken(normalized);

  const row = await prisma.backupCode.findFirst({
    where: { userId, codeHash: hash, usedAt: null },
  });
  if (!row) return false;

  // Atomic consume: only succeeds if still unused
  const result = await prisma.backupCode.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  return result.count === 1;
}

export async function countUnusedCodes(userId: string): Promise<number> {
  return prisma.backupCode.count({
    where: { userId, usedAt: null },
  });
}

function generateOne(): string {
  const bytes = randomBytes(SEGMENT * 2);
  let out = "";
  for (let i = 0; i < SEGMENT * 2; i++) {
    out += CHARSET[bytes[i] % CHARSET.length];
    if (i === SEGMENT - 1) out += "-";
  }
  return out;
}

function normalize(code: string): string {
  return code.replace(/[-\s]/g, "").toUpperCase();
}
