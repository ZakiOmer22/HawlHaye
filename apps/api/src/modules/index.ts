import { Router, type Express } from "express";

/**
 * One folder per module (create src/modules/<name>/ with routes, service, schemas as you build it).
 * Owners: auth, audit, task workflow = Zacki; users, offices, categories, tasks CRUD, comments,
 * attachments, reports = Maxamed Siciid. Database schema = Abdiqadir.
 */
const MODULES = [
  "auth",
  "users",
  "offices",
  "categories",
  "tasks",
  "comments",
  "attachments",
  "reports",
  "audit",
] as const;

export function registerModules(app: Express): void {
  for (const name of MODULES) {
    const router = Router();
    router.all("*", (_req, res) => {
      res.status(501).json({ error: "not_implemented", module: name });
    });
    app.use(`/api/v1/${name}`, router);
  }
}
