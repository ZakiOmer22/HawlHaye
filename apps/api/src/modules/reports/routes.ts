import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { taskScopeFor } from "../tasks/service";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.use(
  requireRole("DEAN", "DEPUTY", "ADMINISTRATOR", "FACULTY_COORDINATOR", "LABS_COORDINATOR"),
);

const filterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  officeId: z.string().optional(),
  categoryId: z.string().optional(),
});

reportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const f = filterSchema.parse(req.query);
    const user = req.user!;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const from = f.from ? new Date(f.from) : thirtyDaysAgo;
    const to = f.to ? new Date(f.to) : now;

    const baseWhere = {
      deletedAt: null,
      ...taskScopeFor(user),
      ...(f.officeId ? { officeId: f.officeId } : {}),
      ...(f.categoryId ? { categoryId: f.categoryId } : {}),
    };

    const [
      allTasks,
      byStatus,
      completedInRange,
      overdueTasks,
      dueSoonTasks,
      blockedTasks,
      pendingReview,
      workload,
      rangeTasks,
    ] = await Promise.all([
      prisma.task.count({ where: baseWhere }),

      prisma.task.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),

      prisma.task.findMany({
        where: {
          ...baseWhere,
          status: "COMPLETED",
          completedAt: { gte: from, lte: to },
        },
        select: { createdAt: true, completedAt: true, dueDate: true },
      }),

      prisma.task.count({
        where: {
          ...baseWhere,
          status: { not: "COMPLETED" },
          dueDate: { lt: now },
        },
      }),

      prisma.task.count({
        where: {
          ...baseWhere,
          status: { not: "COMPLETED" },
          dueDate: { gte: now, lte: threeDaysFromNow },
        },
      }),

      prisma.task.findMany({
        where: { ...baseWhere, status: "BLOCKED" },
        take: 5,
        orderBy: { updatedAt: "asc" },
        select: {
          id: true,
          code: true,
          title: true,
          blockedReason: true,
          updatedAt: true,
          owner: { select: { fullName: true } },
        },
      }),

      prisma.task.findMany({
        where: { ...baseWhere, status: "REVIEW" },
        take: 5,
        orderBy: { updatedAt: "asc" },
        select: {
          id: true,
          code: true,
          title: true,
          updatedAt: true,
          owner: { select: { fullName: true } },
        },
      }),

      prisma.user.findMany({
        where: { active: true, officeId: user.officeId ?? undefined },
        take: 50,
        select: {
          id: true,
          fullName: true,
          ownedTasks: {
            where: { deletedAt: null, status: { not: "COMPLETED" } },
            select: { status: true },
          },
        },
      }),

      prisma.task.findMany({
        where: { ...baseWhere, createdAt: { gte: from, lte: to } },
        select: { createdAt: true, completedAt: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of byStatus) statusCounts[row.status] = row._count._all;

    const completed = statusCounts.COMPLETED ?? 0;
    const completionRate = allTasks > 0 ? Math.round((completed / allTasks) * 100) : 0;

    const avgCompletionDays =
      completedInRange.length > 0
        ? Math.round(
            (completedInRange.reduce((sum, t) => {
              if (!t.completedAt) return sum;
              return sum + (t.completedAt.getTime() - t.createdAt.getTime());
            }, 0) /
              completedInRange.length /
              (1000 * 60 * 60 * 24)) *
              10,
          ) / 10
        : 0;

    const onTime = completedInRange.filter(
      (t) => t.dueDate && t.completedAt && t.completedAt <= t.dueDate,
    ).length;
    const withDueDate = completedInRange.filter((t) => t.dueDate).length;
    const onTimeRate = withDueDate > 0 ? Math.round((onTime / withDueDate) * 100) : 0;

    const buckets: Record<string, { created: number; completed: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { created: 0, completed: 0 };
    }
    for (const t of rangeTasks) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].created++;
    }
    for (const t of completedInRange) {
      if (!t.completedAt) continue;
      const key = t.completedAt.toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].completed++;
    }
    const timeline = Object.entries(buckets).map(([date, v]) => ({
      date,
      created: v.created,
      completed: v.completed,
    }));

    res.json({
      data: {
        totalTasks: allTasks,
        completed,
        completionRate,
        overdueTasks,
        dueSoonTasks,
        avgCompletionDays,
        onTimeRate,
        byStatus: statusCounts,
        workload: workload
          .filter((u) => u.ownedTasks.length > 0)
          .map((u) => ({
            id: u.id,
            name: u.fullName,
            total: u.ownedTasks.length,
            active: u.ownedTasks.filter((t) => ["ASSIGNED", "IN_PROGRESS"].includes(t.status))
              .length,
            blocked: u.ownedTasks.filter((t) => t.status === "BLOCKED").length,
            review: u.ownedTasks.filter((t) => t.status === "REVIEW").length,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10),
        blockedTasks: blockedTasks.map((t) => ({
          id: t.id,
          code: t.code,
          title: t.title,
          reason: t.blockedReason,
          days: Math.floor((now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
          owner: t.owner?.fullName ?? "Unassigned",
        })),
        pendingReview: pendingReview.map((t) => ({
          id: t.id,
          code: t.code,
          title: t.title,
          days: Math.floor((now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
          owner: t.owner?.fullName ?? "Unassigned",
        })),
        timeline,
      },
    });
  }),
);

reportsRouter.get(
  "/system",
  requireRole("DEAN", "DEPUTY", "ADMINISTRATOR"),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, newTasks7d, failedLogins24h, lockedAccounts, recentAudit] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { active: true } }),
        prisma.task.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.auditLog.count({
          where: {
            action: { in: ["auth.login_failed", "auth.login_locked"] },
            createdAt: { gte: twentyFourHoursAgo },
          },
        }),
        prisma.user.count({
          where: { lockedUntil: { gt: now } },
        }),
        prisma.auditLog.findMany({
          take: 15,
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { fullName: true, role: true } } },
        }),
      ]);

    res.json({
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newTasks7d,
        failedLogins24h,
        lockedAccounts,
        recentEvents: recentAudit.map((e) => ({
          id: e.id,
          action: e.action,
          actor: e.actor?.fullName ?? "System",
          actorRole: e.actor?.role ?? null,
          createdAt: e.createdAt,
        })),
      },
    });
  }),
);
