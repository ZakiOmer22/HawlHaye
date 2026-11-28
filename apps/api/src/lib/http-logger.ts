// apps/api/src/lib/http-logger.ts
//
// Request logging. What it records:   method, path, status, timing, client IP, error code.
// What it deliberately never records: response bodies, query strings (signed-URL tokens, search
//                                     terms), raw X-Forwarded-For, or synthetic stack traces.

import pinoHttp from "pino-http";
import type { Logger } from "pino";
import type { Request, Response } from "express";

/** Full path (including the /api/v1/... mount) with the query string removed. */
export function loggedPath(req: { originalUrl?: string; url?: string }): string {
  return (req.originalUrl ?? req.url ?? "").split("?")[0];
}

function loggedIp(req: unknown): string {
  const r = req as Request;
  return r.ip ?? r.socket?.remoteAddress ?? "unknown";
}

function loggedErrorCode(res: unknown): string | undefined {
  return (res as Response).locals?.errorCode as string | undefined;
}

export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    // The default serializers dump the whole request into every log line: full URL INCLUDING the
    // query string (so `?t=<signed-attachment-token>` ended up in production logs, because the
    // redact path below only covers `req.query`, not `req.url`), every header, and the remote
    // port. Keep only what is needed to trace a request.
    serializers: {
      req: (req: { id?: unknown; method?: string; url?: string }) => ({
        id: req.id,
        method: req.method,
        path: (req.url ?? "").split("?")[0],
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
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
    autoLogging: { ignore: (req) => (req.url ?? "") === "/health" },
    customLogLevel: (_req, res, err) => {
      // Maintenance mode is an expected state, not a server fault.
      if (loggedErrorCode(res) === "maintenance_mode") return "warn";
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    // pino-http attaches a synthetic Error (with a stack that exposes local file paths) to every
    // 5xx. Real server errors are logged with full detail + correlation id by errorHandler, so
    // the request log only needs the response summary.
    customErrorObject: (_req, _res, _err, val) => ({
      res: val.res,
      responseTime: val.responseTime,
    }),
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${loggedPath(req)} -> ${res.statusCode} (${responseTime}ms) | IP: ${loggedIp(req)}`,
    customErrorMessage: (req, res, err) => {
      const code = loggedErrorCode(res);
      const reason = code ? `Code: ${code}` : `Error: ${err.message}`;
      return `${req.method} ${loggedPath(req)} -> ${res.statusCode} | IP: ${loggedIp(req)} | ${reason}`;
    },
  });
}
