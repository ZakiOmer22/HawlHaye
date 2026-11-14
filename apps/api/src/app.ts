// apps/api/src/app.ts
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
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

const responseBodyMap = new WeakMap<object, unknown>();
const JSON_BODY_LIMIT = "1mb";

export function createApp(env: Env): Express {
  const app = express();
  const isProd = env.NODE_ENV === "production";

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
  app.use(express.static(path.join(process.cwd(), "public")));

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(csrfProtection);

  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 400) {
        responseBodyMap.set(res, body);
      }
      return originalJson.call(this, body);
    };
    next();
  });

  const logBodies = !isProd;

  app.use(
    pinoHttp({
      logger,
      redact: {
        paths: [
          "req.headers.cookie",
          "res.headers['set-cookie']",
          "req.headers.authorization",
          "req.headers['x-confirm-password']",
          "req.query.t",
        ],
        censor: "[REDACTED]",
      },
      autoLogging: { ignore: (req) => req.url === "/health" },
      customSuccessMessage: (req, res, responseTime) => {
        const ip =
          req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "unknown";
        const logged = logBodies ? responseBodyMap.get(res) : undefined;
        const body = logged ? ` | Body: ${JSON.stringify(logged)}` : "";
        return `${req.method} ${req.url} -> ${res.statusCode} (${responseTime}ms) | IP: ${ip}${body}`;
      },
      customErrorMessage: (req, res, err) => {
        const ip =
          req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "unknown";
        const logged = logBodies ? responseBodyMap.get(res) : undefined;
        const body = logged ? ` | Body: ${JSON.stringify(logged)}` : "";
        return ` ${req.method} ${req.url} -> ${res.statusCode} | IP: ${ip} | Error: ${err.message}${body}`;
      },
    }),
  );

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
