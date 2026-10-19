import { Router } from "express";
import { createOfficeSchema } from "@hawl/shared";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { HttpError } from "../../middleware/errors";

export const officesRouter = Router();

officesRouter.use(requireAuth);

officesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await prisma.office.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, active: true },
    });
    res.json({ data });
  }),
);

officesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const office = await prisma.office.findUnique({ where: { id: req.params.id } });
    if (!office) throw new HttpError(404, "Office not found", "not_found");
    res.json({ data: office });
  }),
);

officesRouter.post(
  "/",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    const input = createOfficeSchema.parse(req.body);
    const office = await prisma.office.create({ data: input });
    res.status(201).json({ data: office });
  }),
);

const updateOfficeSchema = createOfficeSchema.partial();

officesRouter.patch(
  "/:id",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    const input = updateOfficeSchema.parse(req.body);
    const office = await prisma.office.update({
      where: { id: req.params.id },
      data: input,
    });
    res.json({ data: office });
  }),
);

officesRouter.post(
  "/:id/deactivate",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    const office = await prisma.office.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ data: office });
  }),
);
