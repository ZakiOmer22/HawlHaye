import { Router, type Request } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import xss from "xss";
import rateLimit from "express-rate-limit";
import { fileTypeFromBuffer } from "file-type";
import { createTaskSchema, assignTaskSchema, transitionSchema } from "@hawl/shared";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { HttpError } from "../../middleware/errors";
import { logSecurityEvent } from "../../lib/security";
import { logger } from "../../lib/logger";
import {
  canAccessTask,
  createTask,
  assignTask,
  transitionTask,
  delegateTask,
  respondToDelegation,
  softDeleteTask,
  taskScopeFor,
} from "./service";
import { signAttachmentToken, verifyAttachmentToken } from "../../lib/signedUrl";
import { env } from "../../config/env";

function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Missing ${name}`, "invalid_request");
  return value;
}

// ── File Upload Configuration ──────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Store in memory first so we can inspect the binary signature before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip || "unknown",
  handler: (req, _res, next) => {
    logSecurityEvent("UPLOAD_RATE_LIMITED", {
      userId: req.user?.id,
      ip: req.ip,
    });
    next(new HttpError(429, "Upload limit reached. Try again later.", "too_many_uploads"));
  },
});

const transitionLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip || "unknown",
  message: { error: "too_many_requests", message: "Slow down." },
});

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...taskScopeFor(req.user!),
    };
    if (req.query.mine === "true") {
      where.OR = [
        { ownerId: req.user!.id },
        { delegations: { some: { delegateId: req.user!.id, status: "ACCEPTED" } } },
      ];
    }
    if (typeof req.query.status === "string") {
      where.status = req.query.status as Prisma.TaskWhereInput["status"];
    }
    if (typeof req.query.officeId === "string") where.officeId = req.query.officeId;
    if (typeof req.query.categoryId === "string") where.categoryId = req.query.categoryId;
    if (typeof req.query.ownerId === "string") where.ownerId = req.query.ownerId;
    if (req.query.overdue === "true") {
      where.dueDate = { lt: new Date() };
      where.status = { not: "COMPLETED" };
    }
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const q = req.query.q.trim().slice(0, 200);
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const take = Math.min(Number(req.query.take ?? 100), 200);
    const skip = Number(req.query.skip ?? 0);
    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take,
        skip,
        include: {
          owner: { select: { id: true, fullName: true } },
          category: { select: { id: true, name: true, color: true } },
          office: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ data, meta: { total, take, skip } });
  }),
);

tasksRouter.get(
  "/board",
  asyncHandler(async (req, res) => {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...taskScopeFor(req.user!),
    };
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      include: {
        owner: { select: { id: true, fullName: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
    const columns: Record<string, typeof tasks> = {
      UNASSIGNED: [],
      ASSIGNED: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      REVIEW: [],
      COMPLETED: [],
    };
    for (const t of tasks) {
      const bucket = columns[t.status];
      if (bucket) bucket.push(t);
    }
    res.json({ data: columns });
  }),
);

tasksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await createTask(req.user!, input);
    res.status(201).json({ data: task });
  }),
);

tasksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: pathParam(req, "id") },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true } },
        assignedBy: { select: { id: true, fullName: true } },
        category: true,
        office: true,
        delegations: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: task.id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    res.json({ data: task });
  }),
);

const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3)
      .max(200)
      .transform((val) => xss(val))
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000)
      .transform((val) => xss(val))
      .nullable()
      .optional(),
    categoryId: z.string().min(1).optional(),
    officeId: z.string().min(1).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .strict();

tasksRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    const isLeadership = ["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(req.user!.role);
    const isOwnObject =
      task.ownerId === req.user!.id ||
      task.createdById === req.user!.id ||
      (req.user!.role === "FACULTY_COORDINATOR" && task.officeId === req.user!.officeId) ||
      (req.user!.role === "LABS_COORDINATOR" && task.officeId === req.user!.officeId);
    if (!isLeadership && !isOwnObject) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const input = updateTaskSchema.parse(req.body);
    const updated = await prisma.task.update({ where: { id }, data: input });
    await prisma.taskEvent.create({
      data: {
        taskId: id,
        actorId: req.user!.id,
        type: "STATUS_CHANGED",
        note: "Details updated",
      },
    });
    res.json({ data: updated });
  }),
);

tasksRouter.post(
  "/:id/assign",
  requireRole("DEAN", "DEPUTY"),
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const input = assignTaskSchema.parse(req.body);
    const updated = await assignTask(req.user!, id, input);
    res.json({ data: updated });
  }),
);

tasksRouter.post(
  "/:id/transition",
  transitionLimiter,
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const input = transitionSchema.parse(req.body);
    const updated = await transitionTask(req.user!, id, input);
    res.json({ data: updated });
  }),
);

const delegateSchema = z
  .object({
    delegateId: z.string().min(1),
    reason: z.string().trim().min(3).max(1000).optional(),
  })
  .strict();

tasksRouter.post(
  "/:id/delegate",
  asyncHandler(async (req, res) => {
    const input = delegateSchema.parse(req.body);
    const d = await delegateTask(req.user!, pathParam(req, "id"), input);
    res.status(201).json({ data: d });
  }),
);

const respondSchema = z.object({ action: z.enum(["ACCEPTED", "DECLINED"]) }).strict();

tasksRouter.post(
  "/:id/delegation/:delegationId/respond",
  asyncHandler(async (req, res) => {
    const input = respondSchema.parse(req.body);
    const d = await respondToDelegation(
      req.user!,
      pathParam(req, "id"),
      pathParam(req, "delegationId"),
      input.action,
    );
    res.json({ data: d });
  }),
);

tasksRouter.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const data = await prisma.taskEvent.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { id: true, fullName: true } } },
    });
    res.json({ data });
  }),
);

const commentSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1)
      .max(5000)
      .transform((val) => xss(val)),
  })
  .strict();

tasksRouter.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const input = commentSchema.parse(req.body);
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { taskId: id, authorId: req.user!.id, body: input.body },
      });
      await tx.taskEvent.create({
        data: { taskId: id, actorId: req.user!.id, type: "COMMENTED" },
      });
      return c;
    });
    res.status(201).json({ data: comment });
  }),
);

tasksRouter.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const data = await prisma.comment.findMany({
      where: { taskId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, fullName: true } } },
    });
    res.json({ data });
  }),
);

// ── ATTACHMENTS ────────────────────────────────────────────────

tasksRouter.post(
  "/:id/attachments",
  uploadLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    if (!req.file) throw new HttpError(400, "No file uploaded", "invalid_request");

    // 1. MAGIC BYTE VALIDATION (Zero-Trust)
    const fileBuffer = req.file.buffer;
    const type = await fileTypeFromBuffer(fileBuffer);

    if (!type || !ALLOWED_MIMES.includes(type.mime)) {
      logger.warn(
        {
          userId: req.user!.id,
          ip: req.ip,
          claimedMime: req.file.mimetype,
          actualMime: type?.mime || "unknown",
        },
        "MALICIOUS_UPLOAD_BLOCKED",
      );
      throw new HttpError(
        400,
        "Invalid file type. Only standard images, PDFs, and Office documents are allowed.",
        "invalid_file_type",
      );
    }

    // 2. SECURE DISK WRITE
    const secureFilename = `${crypto.randomBytes(16).toString("hex")}.${type.ext}`;
    const filePath = path.join(UPLOAD_DIR, secureFilename);

    await fs.promises.writeFile(filePath, fileBuffer);

    // 3. DATABASE RECORD
    const attachment = await prisma.$transaction(async (tx) => {
      const a = await tx.attachment.create({
        data: {
          taskId: id,
          uploadedById: req.user!.id,
          fileName: req.file!.originalname,
          mimeType: type.mime, // Use verified MIME type
          sizeBytes: req.file!.size,
          storageKey: secureFilename,
        },
      });
      await tx.taskEvent.create({
        data: { taskId: id, actorId: req.user!.id, type: "ATTACHED", note: req.file!.originalname },
      });
      return a;
    });

    res.status(201).json({ data: attachment });
  }),
);

tasksRouter.get(
  "/:id/attachments",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const data = await prisma.attachment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data });
  }),
);

tasksRouter.get(
  "/:id/attachments/:attachmentId/download",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const attachmentId = pathParam(req, "attachmentId");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.taskId !== id)
      throw new HttpError(404, "Attachment not found", "not_found");
    const filePath = path.join(UPLOAD_DIR, attachment.storageKey);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "File missing from server", "not_found");

    const safeName = attachment.fileName.replace(/["\r\n\\]/g, "_");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    );
    res.setHeader("Content-Type", attachment.mimeType);
    res.sendFile(filePath);
  }),
);

tasksRouter.delete(
  "/:id",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    await softDeleteTask(req.user!, pathParam(req, "id"));
    res.status(204).end();
  }),
);

tasksRouter.get(
  "/delegations/pending",
  asyncHandler(async (req, res) => {
    const data = await prisma.delegation.findMany({
      where: { delegateId: req.user!.id, status: "PENDING" },
      include: {
        task: {
          select: {
            id: true,
            code: true,
            title: true,
            priority: true,
            dueDate: true,
            status: true,
          },
        },
        delegatedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data });
  }),
);

tasksRouter.post(
  "/:id/attachments/:attachmentId/signed-url",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const attachmentId = pathParam(req, "attachmentId");

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) {
      logSecurityEvent("INVALID_OBJECT_ACCESS", {
        userId: req.user!.id,
        targetId: id,
        ip: req.ip,
      });
      throw new HttpError(403, "Forbidden", "forbidden");
    }

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.taskId !== id) {
      throw new HttpError(404, "Attachment not found", "not_found");
    }

    const token = signAttachmentToken(attachment.id, req.user!.id, 300);
    const url = `/api/v1/tasks/${id}/attachments/${attachmentId}/view?t=${encodeURIComponent(token)}`;

    res.json({
      data: {
        url,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        expiresIn: 300,
      },
    });
  }),
);

export const tasksPublicRouter = Router();

tasksPublicRouter.get(
  "/:id/attachments/:attachmentId/view",
  asyncHandler(async (req, res) => {
    const token = typeof req.query.t === "string" ? req.query.t : "";
    const decoded = verifyAttachmentToken(token);
    if (!decoded) throw new HttpError(401, "Invalid or expired link", "invalid_token");

    const attachmentId = pathParam(req, "attachmentId");
    const taskId = pathParam(req, "id");
    if (decoded.attachmentId !== attachmentId) {
      throw new HttpError(403, "Token does not match attachment", "forbidden");
    }

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.taskId !== taskId) {
      throw new HttpError(404, "Attachment not found", "not_found");
    }

    const filePath = path.join(UPLOAD_DIR, attachment.storageKey);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "File missing from server", "not_found");

    const safeName = attachment.fileName.replace(/["\r\n\\]/g, "_");
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.removeHeader("X-Frame-Options");
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'none'; img-src 'self' data:; media-src 'self'; object-src 'self'; frame-ancestors 'self' ${env.WEB_ORIGIN};`,
    );

    res.sendFile(filePath);
  }),
);
