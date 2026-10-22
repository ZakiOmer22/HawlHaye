import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { type Env } from "./config/env";
import { logger } from "./lib/logger";
import { registerModules } from "./modules";
import { errorHandler, notFound } from "./middleware/errors";
import { csrfProtection } from "./middleware/csrf";

/**
 * Builds the Express application.
 * Middleware order is significant: security headers → CORS → rate limit →
 * body parsing → CSRF → logging → routes → error handling.
 */
export function createApp(env: Env): Express {
  const app = express();
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy:
        env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'", env.WEB_ORIGIN, "http://localhost:4000"],
              },
            }
          : false,
    }),
  );

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "too_many_requests", message: "Too many requests." },
    }),
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(csrfProtection);

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/health" },
      customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
      customErrorMessage: (req, res, err) =>
        `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          ip: req.raw.ip || req.raw.headers["x-forwarded-for"] || "unknown",
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "hawl-api" });
  });

  registerModules(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
