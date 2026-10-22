import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";

export const auditRouter = Router();
auditRouter.use(requireAuth);

auditRouter.get(
  "/",
  requireRole("DEAN", "DEPUTY", "ADMINISTRATOR"),
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.take ?? 100), 200);

    const data = await prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { fullName: true, role: true } },
      },
    });

    res.json({ data });
  }),
);
