// apps/api/src/app.ts
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import path from "node:path";
import { type Env } from "./config/env";
import { logger } from "./lib/logger";
import { registerModules } from "./modules";
import { errorHandler, notFound } from "./middleware/errors";
import { csrfProtection } from "./middleware/csrf";
import { cacheControl } from "./middleware/cache";
import { swaggerSpec } from "./lib/swagger";
import { globalLimiter } from "./middleware/rateLimiter";
import { checkMaintenance } from "./middleware/maintenance";
import { check2FA } from "./middleware/require2FA";
import { createResponseGuard } from "./lib/response-guard";
import { uploadsGuard } from "./middleware/uploads-guard";
import { createHttpLogger } from "./lib/http-logger";

const JSON_BODY_LIMIT = "1mb";

export function createApp(env: Env): Express {
  const app = express();
  const isProd = env.NODE_ENV === "production";

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.set("etag", "strong");

  const allowedOrigins = env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : [env.WEB_ORIGIN];

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          // Allow the API to serve JSON and static files.
          // We allow Swagger UI to load in dev, but not in production.
          scriptSrc: ["'self'", ...(isProd ? [] : ["'unsafe-eval'", "'unsafe-inline'"])],
          styleSrc: ["'self'", ...(isProd ? [] : ["'unsafe-inline'"])],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: isProd ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: "no-referrer" },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(compression());
  app.use(globalLimiter);

  // cookieParser runs before static files so the uploads guard can read the session cookie.
  app.use(cookieParser(env.SESSION_SECRET));

  // Safety net: no matter what a route returns, secrets / hashes / storage keys are removed.
  app.use(
    createResponseGuard((report) => {
      logger.warn(
        report,
        "RESPONSE_GUARD: sensitive keys were stripped from a response — select explicit fields in this route",
      );
    }),
  );

  // Static files. /uploads is gated: logo-* is public, everything else needs a session and
  // ticket-level access (see middleware/uploads-guard.ts).
  app.use("/uploads", uploadsGuard);
  app.use(
    express.static(path.join(process.cwd(), "public"), {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.split(path.sep).includes("uploads")) {
          // Uploaded content must never execute or be framed, even if opened directly (e.g. SVG).
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
          );
          res.setHeader("X-Content-Type-Options", "nosniff");
        }
      },
    }),
  );

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
  app.use(csrfProtection);

  app.use(createHttpLogger(logger));

  if (!isProd) {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "hawl-api" });
  });

  app.use("/api/v1", cacheControl);

  app.use(checkMaintenance);
  app.use(check2FA);

  registerModules(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
