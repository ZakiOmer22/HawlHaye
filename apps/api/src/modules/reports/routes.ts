import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { taskScopeFor } from "../tasks/service";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

/**
 * GET /api/v1/reports/data
 * Returns aggregated counts for the Dashboard and Data Reports.
 */
reportsRouter.get(
  "/data",
  requireRole("DEAN", "DEPUTY", "ADMINISTRATOR", "FACULTY_COORDINATOR", "LABS_COORDINATOR"),
  asyncHandler(async (req, res) => {
    const scope = taskScopeFor(req.user!);

    // We can run these counts in parallel for maximum speed
    const [statusCounts, priorityCounts, totalTasks, overdueTasks] = await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { deletedAt: null, ...scope },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { deletedAt: null, status: { not: "COMPLETED" }, ...scope },
        _count: true,
      }),
      prisma.task.count({ where: { deletedAt: null, ...scope } }),
      prisma.task.count({
        where: {
          deletedAt: null,
          status: { not: "COMPLETED" },
          dueDate: { lt: new Date() },
          ...scope,
        },
      }),
    ]);

    // Format the grouped arrays into clean objects
    const statuses = {
      UNASSIGNED: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      REVIEW: 0,
      COMPLETED: 0,
    };
    statusCounts.forEach((s) => {
      statuses[s.status as keyof typeof statuses] = s._count;
    });

    const priorities = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    priorityCounts.forEach((p) => {
      priorities[p.priority as keyof typeof priorities] = p._count;
    });

    res.json({
      data: {
        totalTasks,
        overdueTasks,
        statuses,
        priorities,
        completionRate: totalTasks === 0 ? 0 : Math.round((statuses.COMPLETED / totalTasks) * 100),
      },
    });
  }),
);

/**
 * GET /api/v1/reports/system
 * Returns system health, user activity, and audit stats.
 */
reportsRouter.get(
  "/system",
  requireRole("DEAN", "DEPUTY", "ADMINISTRATOR"),
  asyncHandler(async (_req, res) => {
    const [totalUsers, activeUsers, totalAuditLogs, recentLogins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { action: "auth.login" } }),
    ]);

    res.json({
      data: {
        users: { total: totalUsers, active: activeUsers },
        audit: { total: totalAuditLogs, logins: recentLogins },
        uptime: process.uptime(),
        version: "1.0.0",
      },
    });
  }),
);
