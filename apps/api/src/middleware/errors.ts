import type { NextFunction, Request, Response } from "express";
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
  // 1. Validation Errors (Zod)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_failed",
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  // 2. Expected App Errors (HttpError)
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  // 3. Unexpected Errors (Database crash, code bug, etc.)
  logger.error({ err, path: req.path, method: req.method }, "Unhandled server error");

  // Never leak the raw error to the client
  res.status(500).json({ error: "internal_error", message: "An unexpected error occurred." });
}
