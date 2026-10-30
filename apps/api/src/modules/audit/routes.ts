import { Router } from "express";
import { z } from "zod";
import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.use(requireRole("ADMINISTRATOR", "DEAN", "DEPUTY"));

const listSchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

auditRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const f = listSchema.parse(req.query);

    const where: Record<string, unknown> = {};
    if (f.actorId) where.actorId = f.actorId;
    if (f.action) where.action = { equals: f.action };
    if (f.entityType) where.entityType = f.entityType;

    if (f.from || f.to) {
      const created: Record<string, Date> = {};
      if (f.from) created.gte = new Date(f.from);
      if (f.to) {
        const t = new Date(f.to);
        t.setUTCHours(23, 59, 59, 999);
        created.lte = t;
      }
      where.createdAt = created;
    }

    if (f.q) {
      where.OR = [
        { action: { contains: f.q, mode: "insensitive" } },
        { entityType: { contains: f.q, mode: "insensitive" } },
        { entityId: { contains: f.q, mode: "insensitive" } },
        { ip: { contains: f.q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: f.take,
        skip: f.skip,
        include: {
          actor: { select: { id: true, fullName: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data, meta: { total, take: f.take, skip: f.skip } });
  }),
);

const verifySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

function computeHash(entry: {
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  meta: unknown;
  prevHash: string | null;
  createdAt: Date;
}): string {
  const payload = JSON.stringify({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    ip: entry.ip,
    userAgent: entry.userAgent,
    meta: entry.meta,
    createdAt: entry.createdAt.toISOString(),
  });
  return createHash("sha256")
    .update(entry.prevHash ?? "GENESIS")
    .update("|")
    .update(payload)
    .digest("hex");
}

auditRouter.get(
  "/verify",
  asyncHandler(async (req, res) => {
    const f = verifySchema.parse(req.query);

    const where: Record<string, unknown> = {};
    if (f.from || f.to) {
      const created: Record<string, Date> = {};
      if (f.from) created.gte = new Date(f.from);
      if (f.to) {
        const t = new Date(f.to);
        t.setUTCHours(23, 59, 59, 999);
        created.lte = t;
      }
      where.createdAt = created;
    }

    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 5000,
      select: {
        id: true,
        actorId: true,
        action: true,
        entityType: true,
        entityId: true,
        ip: true,
        userAgent: true,
        meta: true,
        hash: true,
        prevHash: true,
        createdAt: true,
      },
    });

    if (entries.length === 0) {
      return res.json({
        data: {
          total: 0,
          verified: 0,
          tampered: 0,
          chainIntact: true,
          contentIntact: true,
          brokenAt: null,
          entries: [],
          capped: false,
        },
      });
    }

    const results = entries.map((e, i) => {
      const prev = i > 0 ? entries[i - 1] : null;
      const linkMatches = prev ? e.prevHash === prev.hash : e.prevHash === null;
      const expectedHash = computeHash(e);
      const hashMatches = e.hash === expectedHash;
      return {
        id: e.id,
        index: i,
        hashMatches,
        linkMatches,
        ok: hashMatches && linkMatches,
      };
    });

    const tampered = results.filter((r) => !r.ok);
    const contentIntact = results.every((r) => r.hashMatches);
    const chainIntact = results.every((r) => r.linkMatches);

    res.json({
      data: {
        total: entries.length,
        verified: results.length - tampered.length,
        tampered: tampered.length,
        chainIntact,
        contentIntact,
        brokenAt: tampered[0]?.id ?? null,
        entries: results.slice(0, 500),
        capped: entries.length >= 5000,
      },
    });
  }),
);
