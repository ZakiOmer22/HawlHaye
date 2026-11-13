import { Router } from "express";
import { z } from "zod";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/async";
import { HttpError } from "../../middleware/errors";
import { uploadAttachment, validateFileMagicBytes } from "../../middleware/upload";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_TO_EXT = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.ms-excel", ".xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
]);

async function persistUpload(file: Express.Multer.File): Promise<string> {
  const sniffed = await validateFileMagicBytes(file.buffer);
  const ext = MIME_TO_EXT.get(sniffed.mime) ?? ".bin";
  const name = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
}

async function safeUnlink(url: string | null): Promise<void> {
  if (!url) return;
  await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
}

const ADMIN_ROLES = new Set(["ADMINISTRATOR", "DEAN"]);
const isAdmin = (role: string) => ADMIN_ROLES.has(role);

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

// ── GET / — List all tickets (with support for search/filtering if needed) ──
ticketsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = isAdmin(req.user!.role) ? {} : { createdById: req.user!.id };

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        replies: { select: { id: true } }, // Just count for the list view
      },
    });

    res.json({ data: tickets });
  }),
);

// ── GET /:id — Fetch a single ticket (FIXES YOUR 404) ──
ticketsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });

    if (!ticket) throw new HttpError(404, "Ticket not found", "not_found");

    if (!isAdmin(req.user!.role) && ticket.createdById !== req.user!.id) {
      throw new HttpError(404, "Ticket not found", "not_found");
    }

    res.json({ data: ticket });
  }),
);

// ── PATCH /:id — Update ticket status ──
const updateStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

ticketsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateStatusSchema.parse(req.body);
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });

    if (!ticket) throw new HttpError(404, "Ticket not found", "not_found");
    if (!isAdmin(req.user!.role) && ticket.createdById !== req.user!.id) {
      throw new HttpError(404, "Ticket not found", "not_found");
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: input.status, updatedAt: new Date() },
    });

    res.json({ data: updated });
  }),
);

// ── POST / — Create ticket ──
const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(1).max(100),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

ticketsRouter.post(
  "/",
  uploadAttachment.single("image"),
  asyncHandler(async (req, res) => {
    const input = createTicketSchema.parse(req.body);
    let imageUrl: string | null = null;
    let persisted = false;

    try {
      if (req.file) imageUrl = await persistUpload(req.file);

      const ticket = await prisma.ticket.create({
        data: { ...input, imageUrl, createdById: req.user!.id },
        include: { createdBy: { select: { id: true, fullName: true, role: true } }, replies: true },
      });

      persisted = true;
      res.status(201).json({ data: ticket });
    } finally {
      if (!persisted) await safeUnlink(imageUrl);
    }
  }),
);

// ── POST /:id/reply — Reply ──
const replySchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

ticketsRouter.post(
  "/:id/reply",
  uploadAttachment.single("image"),
  asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const input = replySchema.parse(req.body);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new HttpError(404, "Ticket not found", "not_found");

    const admin = isAdmin(req.user!.role);
    if (!admin && ticket.createdById !== req.user!.id) {
      throw new HttpError(404, "Ticket not found", "not_found");
    }

    let imageUrl: string | null = null;
    let persisted = false;

    try {
      if (req.file) imageUrl = await persistUpload(req.file);

      const reply = await prisma.$transaction(async (tx) => {
        const created = await tx.ticketReply.create({
          data: { ticketId, message: input.message, imageUrl, authorId: req.user!.id },
          include: { author: { select: { id: true, fullName: true, role: true } } },
        });

        await tx.ticket.update({
          where: { id: ticketId },
          data:
            admin && ticket.status === "OPEN"
              ? { status: "IN_PROGRESS" }
              : { updatedAt: new Date() },
        });

        return created;
      });

      persisted = true;
      res.status(201).json({ data: reply });
    } finally {
      if (!persisted) await safeUnlink(imageUrl);
    }
  }),
);
