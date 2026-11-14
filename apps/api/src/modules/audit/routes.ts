import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { verifyAuditChain } from "../../lib/audit";

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.use(requireRole("ADMINISTRATOR", "DEAN", "DEPUTY"));

const listSchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  // FIXED: Ignore the UI placeholder text "All actors", "All actions", etc.
  actorId: z
    .string()
    .optional()
    .transform((val) => (val === "All actors" ? undefined : val)),
  action: z
    .string()
    .optional()
    .transform((val) => (val === "All actions" ? undefined : val)),
  entityType: z
    .string()
    .optional()
    .transform((val) => (val === "All entities" ? undefined : val)),
  q: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  from: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  to: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

auditRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const f = listSchema.parse(req.query);

    const where: Record<string, unknown> = {};

    // Now these will only apply if the value is NOT a placeholder
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

auditRouter.get(
  "/verify",
  asyncHandler(async (_req, res) => {
    const result = await verifyAuditChain();

    res.json({
      data: {
        total: result.checked,
        verified: result.ok ? result.checked : 0,
        tampered: result.ok ? 0 : 1,
        chainIntact: result.ok,
        contentIntact: result.ok,
        brokenAt: result.brokenAt ?? null,
        entries: [],
        capped: false,
      },
    });
  }),
);
