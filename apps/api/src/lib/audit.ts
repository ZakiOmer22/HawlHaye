import { createHmac } from "node:crypto";
import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "../config/env";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
  req?: Request;
};

const GENESIS = "0".repeat(64);
/** Arbitrary but stable advisory-lock key. Protects the chain from forking. */
const CHAIN_LOCK_KEY = 984_221_556;

/** Deterministic JSON: sorted keys, no whitespace. */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

function hmac(input: string): string {
  return createHmac("sha256", env.AUDIT_CHAIN_SECRET).update(input).digest("hex");
}

function canonicalRecord(fields: {
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  meta: unknown;
  ip: string | null;
  userAgent: string | null;
}): string {
  return canonicalize({
    actorId: fields.actorId,
    action: fields.action,
    entityType: fields.entityType,
    entityId: fields.entityId,
    meta: fields.meta ?? {},
    ip: fields.ip,
    userAgent: fields.userAgent,
  });
}

export async function writeAudit(input: AuditInput) {
  const { req, meta, ...rest } = input;
  const ip = req?.ip ?? null;
  const userAgent = req?.get("user-agent") ?? null;

  return prisma.$transaction(async (tx) => {
    // Serialise writes so the chain cannot fork under concurrency.
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`);

    const last = await tx.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    const prevHash = last?.hash || GENESIS;

    const canonical = canonicalRecord({
      actorId: rest.actorId ?? null,
      action: rest.action,
      entityType: rest.entityType ?? null,
      entityId: rest.entityId ?? null,
      meta,
      ip,
      userAgent,
    });
    const hash = hmac(prevHash + canonical);

    return tx.auditLog.create({
      data: {
        ...rest,
        ip,
        userAgent,
        meta,
        prevHash,
        hash,
      },
    });
  });
}

export async function verifyAuditChain(fromDate?: Date): Promise<{
  ok: boolean;
  checked: number;
  brokenAt?: string;
}> {
  const rows = await prisma.auditLog.findMany({
    where: fromDate ? { createdAt: { gte: fromDate } } : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      actorId: true,
      action: true,
      entityType: true,
      entityId: true,
      meta: true,
      ip: true,
      userAgent: true,
      prevHash: true,
      hash: true,
    },
  });

  let expectedPrev = rows[0]?.prevHash ?? GENESIS;
  for (const row of rows) {
    if (row.prevHash !== expectedPrev) {
      return { ok: false, checked: rows.length, brokenAt: row.id };
    }
    const canonical = canonicalRecord({
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      meta: row.meta,
      ip: row.ip,
      userAgent: row.userAgent,
    });
    if (row.hash !== hmac(expectedPrev + canonical)) {
      return { ok: false, checked: rows.length, brokenAt: row.id };
    }
    expectedPrev = row.hash;
  }

  return { ok: true, checked: rows.length };
}
