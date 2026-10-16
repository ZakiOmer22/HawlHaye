import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { Env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errors";
import { registerModules } from "./modules";

export function createApp(env: Env): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind Caddy

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "hawl-api" });
  });

  registerModules(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
