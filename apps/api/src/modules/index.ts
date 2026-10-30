import type { Express } from "express";
import { authRouter } from "./auth/routes";
import { officesRouter } from "./offices/routes";
import { categoriesRouter } from "./categories/routes";
import { usersRouter } from "./users/routes";
import { tasksRouter, tasksPublicRouter } from "./tasks/routes";
import { auditRouter } from "./audit/routes";
import { reportsRouter } from "./reports/routes";
import { wellKnownRouter } from "./well-known/routes";
import { searchRouter } from "./search/routes";
import { notificationsRouter } from "./notifications/routes";

export function registerModules(app: Express): void {
  app.use("/.well-known", wellKnownRouter);
  app.use("/api/v1/tasks", tasksPublicRouter);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/offices", officesRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/tasks", tasksRouter);
  app.use("/api/v1/audit", auditRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/search", searchRouter);
  app.use("/api/v1/notifications", notificationsRouter);
}
