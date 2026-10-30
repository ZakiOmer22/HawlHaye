import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const env = loadEnv();
const app = createApp(env);

const server = app.listen(env.PORT, () => {
  logger.info(`HAWL API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// ── AUTOMATED SESSION CLEANUP ────────────────────────────────────
// Run every hour to remove expired or revoked sessions from the DB.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const cleanupInterval = setInterval(async () => {
  try {
    const { count } = await prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
    if (count > 0) {
      logger.info(`Cleaned up ${count} expired/revoked sessions.`);
    }
  } catch (error) {
    logger.error({ error }, "Session cleanup failed");
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Drains in-flight requests, closes the database connection, and exits.
 * Falls back to forced termination if shutdown exceeds 10 seconds.
 */
function gracefulShutdown(signal: string): void {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  clearInterval(cleanupInterval); // Stop the cron job

  server.close(async () => {
    logger.info("HTTP server closed.");
    await prisma.$disconnect();
    logger.info("Database connection closed.");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Shutdown timeout exceeded; forcing exit.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught Exception; terminating process.");
  process.exit(1);
});
