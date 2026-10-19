import type { Express } from "express";
import { Router } from "express";
import { authRouter } from "./auth/routes";
import { officesRouter } from "./offices/routes";
import { categoriesRouter } from "./categories/routes";
import { usersRouter } from "./users/routes";
import { tasksRouter } from "./tasks/routes";

// Modules that are still stubs. Remove a name when you add its real router.
const STUBS = ["comments", "attachments", "reports", "audit"] as const;

export function registerModules(app: Express): void {
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/offices", officesRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/tasks", tasksRouter);

  for (const name of STUBS) {
    const router = Router();
    router.all("*", (_req, res) => {
      res.status(501).json({ error: "not_implemented", module: name });
    });
    app.use(`/api/v1/${name}`, router);
  }
}
