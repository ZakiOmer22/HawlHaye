import type { Express } from "express";
import { authRouter } from "./auth/routes";
import { officesRouter } from "./offices/routes";
import { categoriesRouter } from "./categories/routes";
import { usersRouter } from "./users/routes";
import { tasksRouter } from "./tasks/routes";
import { auditRouter } from "./audit/routes";
import { reportsRouter } from "./reports/routes";

export function registerModules(app: Express): void {
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/offices", officesRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/tasks", tasksRouter);
  app.use("/api/v1/audit", auditRouter);
  app.use("/api/v1/reports", reportsRouter);
}
