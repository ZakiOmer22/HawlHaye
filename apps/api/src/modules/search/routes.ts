import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { taskScopeFor } from "../tasks/service";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();

    if (!q || q.length < 2) {
      return res.json({ data: { tasks: [], users: [], offices: [] } });
    }

    const user = req.user!;
    const canSearchUsers = [
      "ADMINISTRATOR",
      "DEAN",
      "DEPUTY",
      "FACULTY_COORDINATOR",
      "LABS_COORDINATOR",
    ].includes(user.role);

    const [tasks, users, offices] = await Promise.all([
      // 1. Tasks (Scoped so users only see tasks they are allowed to see)
      prisma.task.findMany({
        where: {
          deletedAt: null,
          ...taskScopeFor(user),
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, code: true, title: true, status: true },
        orderBy: { updatedAt: "desc" },
      }),

      // 2. Users (Only searchable by leadership/coordinators)
      canSearchUsers
        ? prisma.user.findMany({
            where: {
              active: true,
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 5,
            select: { id: true, fullName: true, email: true, role: true },
          })
        : Promise.resolve([]),

      // 3. Offices
      prisma.office.findMany({
        where: {
          active: true,
          name: { contains: q, mode: "insensitive" },
        },
        take: 5,
        select: { id: true, name: true, type: true },
      }),
    ]);

    res.json({
      data: { tasks, users, offices },
    });
  }),
);
