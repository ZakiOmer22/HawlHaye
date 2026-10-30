import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

const createCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
  .strict();

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    res.json({ data });
  }),
);

categoriesRouter.post(
  "/",
  requireRole("ADMINISTRATOR", "DEAN", "FACULTY_COORDINATOR", "LABS_COORDINATOR"),
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    const category = await prisma.category.create({ data: input });
    res.status(201).json({ data: category });
  }),
);

categoriesRouter.patch(
  "/:id",
  requireRole("ADMINISTRATOR", "DEAN", "FACULTY_COORDINATOR", "LABS_COORDINATOR"),
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.partial().parse(req.body);
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: input,
    });
    res.json({ data: category });
  }),
);

categoriesRouter.post(
  "/:id/deactivate",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ data: category });
  }),
);
