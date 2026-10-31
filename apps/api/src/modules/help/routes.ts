import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";

export const helpRouter = Router();

helpRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.helpCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        articles: {
          where: { published: true },
          orderBy: { order: "asc" },
        },
      },
    });

    res.json({ data: categories });
  })
);
