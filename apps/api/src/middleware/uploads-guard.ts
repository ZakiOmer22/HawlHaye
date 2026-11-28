// apps/api/src/middleware/uploads-guard.ts
//
// Files in public/uploads used to be served by express.static to ANYONE who had the URL, with no
// login. That folder holds support-ticket screenshots/attachments (can contain internal data) and
// the organisation logo.
//
//  - logo-*  -> stays public (the login page needs it before anyone is signed in)
//  - anything else -> requires a valid session AND the same access rule the tickets API uses:
//      the ticket's creator, or an ADMINISTRATOR / DEAN.
//    Unknown files (not referenced by any ticket) are treated as not found.
//
// URLs are unchanged (`/uploads/<name>`), and browsers send the session cookie with <img> requests,
// so the existing support pages keep working without any frontend change.

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "./auth";
import { HttpError } from "./errors";

const PUBLIC_PREFIX = "logo-";
// A single flat file name. Rejects "", "..", sub-directories, encoded slashes, etc.
const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TICKET_ADMIN_ROLES = new Set(["ADMINISTRATOR", "DEAN"]);

function notFound(): HttpError {
  return new HttpError(404, "File not found", "not_found");
}

async function authorizeTicketFile(req: Request, name: string): Promise<void> {
  const url = `/uploads/${name}`;

  const [ticket, reply] = await Promise.all([
    prisma.ticket.findFirst({ where: { imageUrl: url }, select: { createdById: true } }),
    prisma.ticketReply.findFirst({
      where: { imageUrl: url },
      select: { ticket: { select: { createdById: true } } },
    }),
  ]);

  const ownerId = ticket?.createdById ?? reply?.ticket.createdById;
  if (!ownerId) throw notFound();

  const user = req.user!;
  if (TICKET_ADMIN_ROLES.has(user.role) || ownerId === user.id) return;

  // Same behaviour as the tickets API: do not reveal that the file exists.
  throw notFound();
}

export const uploadsGuard: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  let name: string;
  try {
    name = decodeURIComponent(req.path.replace(/^\/+/, ""));
  } catch {
    return next(notFound());
  }

  if (!SAFE_FILE_NAME.test(name)) return next(notFound());
  if (name.startsWith(PUBLIC_PREFIX)) return next();

  // Everything else: must be signed in, then must be allowed to see this specific file.
  requireAuth(req, res, (authErr?: unknown) => {
    if (authErr) return next(authErr);
    authorizeTicketFile(req, name)
      .then(() => {
        res.setHeader("Cache-Control", "private, no-store");
        next();
      })
      .catch(next);
  });
};
