import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client"; // ADDED
import multer from "multer";
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

export class UploadRejectedError extends Error {
  constructor(
    message: string,
    public code = "upload_rejected",
  ) {
    super(message);
    this.name = "UploadRejectedError";
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "Route not found" });
}

function isBodyParserError(err: unknown): err is { type: string; status: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { type?: unknown }).type === "string" &&
    typeof (err as { status?: unknown }).status === "number"
  );
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

  // 2. Upload rejection (from multer fileFilter) — client-caused
  if (err instanceof UploadRejectedError) {
    res.status(400).json({ error: err.code, message: err.message });
    return;
  }

  // 3. Multer errors — size and file-count rejections
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        res.status(413).json({
          error: "file_too_large",
          message: "Uploaded file exceeds the allowed size.",
        });
        return;
      case "LIMIT_FILE_COUNT":
      case "LIMIT_UNEXPECTED_FILE":
        res.status(400).json({
          error: "invalid_file_upload",
          message: "Unexpected or too many files.",
        });
        return;
      default:
        res.status(400).json({ error: "upload_failed", message: err.message });
        return;
    }
  }

  // 4. body-parser: JSON body exceeded express.json limit
  if (isBodyParserError(err) && err.type === "entity.too.large") {
    res.status(413).json({
      error: "payload_too_large",
      message: "Request body exceeds the allowed limit.",
    });
    return;
  }

  // 5. body-parser: malformed JSON
  if (isBodyParserError(err) && err.type === "entity.parse.failed") {
    res.status(400).json({ error: "invalid_json", message: "Malformed JSON body." });
    return;
  }

  // 6. CORS allowlist rejection (thrown from the cors origin callback)
  if (err instanceof Error && err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "cors_rejected", message: "Origin not allowed." });
    return;
  }

  // 7. PRISMA ERROR MAPPING
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res
        .status(409)
        .json({ error: "conflict", message: "A record with this unique value already exists." });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "not_found", message: "Record not found." });
      return;
    }
    if (err.code === "P2003") {
      res
        .status(400)
        .json({ error: "invalid_reference", message: "Related record does not exist." });
      return;
    }
  }

  // 8. Expected application errors — safe to surface code + message
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  // 9. Unexpected — correlate the client-visible reference with the server log
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
