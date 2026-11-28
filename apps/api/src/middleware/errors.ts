import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
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

/**
 * Single exit point for every error response. Also records the machine-readable code on
 * `res.locals` so the request logger can print "Code: maintenance_mode" instead of the body.
 */
function fail(
  res: Response,
  status: number,
  body: { error: string } & Record<string, unknown>,
): void {
  res.locals.errorCode = body.error;
  res.status(status).json(body);
}

export function notFound(_req: Request, res: Response): void {
  fail(res, 404, { error: "not_found", message: "Route not found" });
}

function isBodyParserError(err: unknown): err is { type: string; status: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { type?: unknown }).type === "string" &&
    typeof (err as { status?: unknown }).status === "number"
  );
}

/** Errors from libraries (http-errors: static files, body-parser, ...) that carry a 4xx status. */
function isClientHttpError(err: unknown): err is { status: number; expose?: boolean } {
  if (typeof err !== "object" || err === null) return false;
  const status = (err as { status?: unknown }).status;
  return typeof status === "number" && status >= 400 && status < 500;
}

const STATUS_CODES: Record<number, string> = {
  400: "invalid_request",
  401: "unauthenticated",
  403: "forbidden",
  404: "not_found",
  405: "method_not_allowed",
  413: "payload_too_large",
  415: "unsupported_media_type",
  429: "too_many_requests",
};

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // If a response (e.g. an SSE stream) is already in flight we cannot send JSON anymore.
  if (res.headersSent) {
    next(err);
    return;
  }

  // 1. Zod validation — safe to surface issue paths/messages
  if (err instanceof ZodError) {
    fail(res, 400, {
      error: "validation_failed",
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  // 2. Upload rejection (from multer fileFilter) — client-caused
  if (err instanceof UploadRejectedError) {
    fail(res, 400, { error: err.code, message: err.message });
    return;
  }

  // 3. Multer errors — size and file-count rejections
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        fail(res, 413, {
          error: "file_too_large",
          message: "Uploaded file exceeds the allowed size.",
        });
        return;
      case "LIMIT_FILE_COUNT":
      case "LIMIT_UNEXPECTED_FILE":
        fail(res, 400, {
          error: "invalid_file_upload",
          message: "Unexpected or too many files.",
        });
        return;
      default:
        // Do not echo library-internal wording back to the client.
        fail(res, 400, { error: "upload_failed", message: "The upload could not be processed." });
        return;
    }
  }

  // 4. body-parser: JSON body exceeded express.json limit
  if (isBodyParserError(err) && err.type === "entity.too.large") {
    fail(res, 413, {
      error: "payload_too_large",
      message: "Request body exceeds the allowed limit.",
    });
    return;
  }

  // 5. body-parser: malformed JSON
  if (isBodyParserError(err) && err.type === "entity.parse.failed") {
    fail(res, 400, { error: "invalid_json", message: "Malformed JSON body." });
    return;
  }

  // 5b. Any other body-parser rejection (bad charset/encoding, aborted request, ...)
  if (isBodyParserError(err) && err.status >= 400 && err.status < 500) {
    fail(res, 400, { error: "invalid_request", message: "Invalid request body." });
    return;
  }

  // 6. CORS allowlist rejection (thrown from the cors origin callback)
  if (err instanceof Error && err.message === "Not allowed by CORS") {
    fail(res, 403, { error: "cors_rejected", message: "Origin not allowed." });
    return;
  }

  // 7. PRISMA ERROR MAPPING (anything not listed falls through to the generic 500 below,
  //    so no table/column/constraint names ever reach the client)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      fail(res, 409, {
        error: "conflict",
        message: "A record with this unique value already exists.",
      });
      return;
    }
    if (err.code === "P2025") {
      fail(res, 404, { error: "not_found", message: "Record not found." });
      return;
    }
    if (err.code === "P2003") {
      fail(res, 400, { error: "invalid_reference", message: "Related record does not exist." });
      return;
    }
  }

  // 8. Expected application errors — safe to surface code + message
  if (err instanceof HttpError) {
    fail(res, err.status, { error: err.code, message: err.message });
    return;
  }

  // 8b. Other 4xx raised by libraries (e.g. static file serving): generic, never the library text
  if (isClientHttpError(err)) {
    fail(res, err.status, {
      error: STATUS_CODES[err.status] ?? "invalid_request",
      message: "The request could not be processed.",
    });
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
      // path only: the query string can carry tokens / search terms
      path: req.originalUrl.split("?")[0],
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

  fail(res, 500, {
    error: "internal_error",
    message: `An unexpected error occurred. Reference: ${correlationId}`,
    correlationId,
  });
}
