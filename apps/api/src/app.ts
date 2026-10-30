import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import { type Env } from "./config/env";
import { logger } from "./lib/logger";
import { registerModules } from "./modules";
import { errorHandler, notFound } from "./middleware/errors";
import { csrfProtection } from "./middleware/csrf";
import { cacheControl } from "./middleware/cache";
import { swaggerSpec } from "./lib/swagger";

const responseBodyMap = new WeakMap<object, unknown>();

export function createApp(env: Env): Express {
  const app = express();
  app.set("trust proxy", env.TRUST_PROXY);
  app.set("etag", "strong");

  // CORS allowlist — falls back to WEB_ORIGIN when ALLOWED_ORIGINS is unset.
  const allowedOrigins = env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : [env.WEB_ORIGIN];

  app.use(
    helmet({
      // JSON API — nothing should ever render from these responses.
      // The real CSP belongs on the Next.js web app, not here.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      hsts: {
        maxAge: 63_072_000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: "no-referrer" },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // same-origin / server-to-server
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(compression());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => env.NODE_ENV === "test",
      message: { error: "too_many_requests", message: "Too many requests." },
    }),
  );

  app.use(express.json({ limit: "100kb" }));
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

  const logBodies = env.NODE_ENV !== "production";

  app.use(
    pinoHttp({
      logger,
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

  // Swagger UI is dev-only — endpoint enumeration is an info-disclosure finding in prod
  if (env.NODE_ENV !== "production") {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "hawl-api" });
  });

  app.use("/api/v1", cacheControl);

  registerModules(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
