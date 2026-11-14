import { Router } from "express";
import os from "node:os";
import fs from "node:fs/promises";
import net from "node:net";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/async";
import { HttpError } from "../../middleware/errors";

export const systemRouter = Router();

systemRouter.use(requireAuth);

systemRouter.use((req, _res, next) => {
  if (req.user?.role !== "ADMINISTRATOR") {
    return next(new HttpError(403, "SysAdmin access required.", "forbidden"));
  }
  next();
});

async function checkRedis(url: string | undefined): Promise<"up" | "down" | "not_configured"> {
  if (!url) return "not_configured";

  try {
    const parsed = new URL(url);
    const port = parsed.port ? parseInt(parsed.port, 10) : 6379;
    const host = parsed.hostname;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);

      socket.on("connect", () => {
        socket.destroy();
        resolve("up");
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve("down");
      });
      socket.on("error", () => {
        socket.destroy();
        resolve("down");
      });

      socket.connect(port, host);
    });
  } catch {
    return "down";
  }
}

type SystemLogEntry = {
  id: string;
  action: string;
  entityType: string;
  actorName: string;
  ip: string;
  timestamp: string;
};

systemRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    let dbStatus: "up" | "down" = "up";
    let recentLogs: SystemLogEntry[] = [];

    try {
      await prisma.$queryRaw`SELECT 1`;

      const logs = await prisma.auditLog.findMany({
        include: {
          actor: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      recentLogs = logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType || "System",
        actorName: log.actor?.fullName || "System",
        ip: log.ip || "Unknown",
        timestamp: log.createdAt.toISOString(),
      }));
    } catch {
      dbStatus = "down";
    }

    const cacheStatus = await checkRedis(process.env.REDIS_URL);

    const totalMem = os.totalmem() / (1024 * 1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024 * 1024);
    const usedMem = totalMem - freeMem;

    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = Math.round(100 - (100 * totalIdle) / totalTick);

    let diskTotal = 0;
    let diskUsed = 0;
    try {
      const rootPath = process.platform === "win32" ? "C:" : "/";
      const stats = await fs.statfs(rootPath);
      diskTotal = (stats.blocks * stats.bsize) / (1024 * 1024 * 1024);
      const freeDisk = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024);
      diskUsed = diskTotal - freeDisk;
    } catch {
      diskTotal = 0;
      diskUsed = 0;
    }

    res.json({
      data: {
        status: dbStatus === "up" ? "healthy" : "degraded",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        metrics: {
          cpuUsage: isNaN(cpuUsage) ? 0 : cpuUsage,
          memoryUsed: usedMem,
          memoryTotal: totalMem,
          diskUsed: diskUsed,
          diskTotal: diskTotal,
        },
        services: {
          database: dbStatus,
          cache: cacheStatus,
          api: "up",
        },
        recentLogs,
      },
    });
  }),
);
