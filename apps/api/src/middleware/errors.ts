import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "Route not found" });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // 1. Zod validation — safe to surface issue paths/messages
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_failed",
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  // 2. Expected application errors — safe to surface code + message
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  // 3. Unexpected — correlate the client-visible reference with the server log
  const correlationId = randomUUID();
  const userId = (req as Request & { user?: { id: string } }).user?.id;

  logger.error(
    {
      correlationId,
      userId,
      method: req.method,
      path: req.originalUrl,
      err: err instanceof Error ? err.message : String(err),
      stack:
        process.env.NODE_ENV === "production"
          ? undefined
          : err instanceof Error
            ? err.stack
            : undefined,
    },
    "Unhandled server error",
  );

  res.status(500).json({
    error: "internal_error",
    message: `An unexpected error occurred. Reference: ${correlationId}`,
    correlationId,
  });
}
