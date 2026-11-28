import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  ticket: { findFirst: vi.fn() },
  ticketReply: { findFirst: vi.fn() },
}));
const authState = vi.hoisted(() => ({
  user: null as null | { id: string; role: string },
}));

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
vi.mock("../lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
// requireAuth is covered separately; here it just reflects a test-controlled session.
vi.mock("./auth", async () => {
  const { HttpError } = await import("./errors");
  return {
    requireAuth: (req: express.Request, _res: express.Response, next: (e?: unknown) => void) => {
      if (!authState.user)
        return next(new HttpError(401, "Authentication required", "unauthenticated"));
      req.user = { ...authState.user, email: "x@y.z", officeId: null } as express.Request["user"];
      next();
    },
  };
});

import { uploadsGuard } from "./uploads-guard";
import { errorHandler } from "./errors";

function app() {
  const a = express();
  a.use("/uploads", uploadsGuard);
  a.use("/uploads", (_req, res) => res.status(200).send("FILE-BYTES")); // stands in for express.static
  a.use(errorHandler);
  return a;
}

beforeEach(() => {
  authState.user = null;
  prismaMock.ticket.findFirst.mockReset().mockResolvedValue(null);
  prismaMock.ticketReply.findFirst.mockReset().mockResolvedValue(null);
});

describe("uploads guard", () => {
  it("keeps the organisation logo public (the login page needs it)", async () => {
    const res = await request(app()).get("/uploads/logo-1700000000000.png");
    expect(res.status).toBe(200);
    expect(prismaMock.ticket.findFirst).not.toHaveBeenCalled();
  });

  it("requires a session for ticket files", async () => {
    const res = await request(app()).get("/uploads/abcdef0123456789.jpg");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthenticated");
  });

  it("lets the ticket creator see their own screenshot", async () => {
    authState.user = { id: "u1", role: "LAB_TECHNICIAN" };
    prismaMock.ticket.findFirst.mockResolvedValue({ createdById: "u1" });
    const res = await request(app()).get("/uploads/abcdef0123456789.jpg");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("lets an ADMINISTRATOR / DEAN see any ticket file, including reply images", async () => {
    prismaMock.ticketReply.findFirst.mockResolvedValue({ ticket: { createdById: "someone-else" } });
    for (const role of ["ADMINISTRATOR", "DEAN"]) {
      authState.user = { id: "admin", role };
      const res = await request(app()).get("/uploads/reply0123456789.png");
      expect(res.status).toBe(200);
    }
  });

  it("hides other people's files behind a 404 (same as the tickets API)", async () => {
    authState.user = { id: "u2", role: "FACULTY_COORDINATOR" };
    prismaMock.ticket.findFirst.mockResolvedValue({ createdById: "u1" });
    const res = await request(app()).get("/uploads/abcdef0123456789.jpg");
    expect(res.status).toBe(404);
    expect(res.text).not.toContain("FILE-BYTES");
  });

  it("treats files that no ticket references as not found", async () => {
    authState.user = { id: "admin", role: "ADMINISTRATOR" };
    const res = await request(app()).get("/uploads/orphan0123456789.jpg");
    expect(res.status).toBe(404);
  });

  it("rejects traversal, sub-directories and dotfiles before touching the database", async () => {
    authState.user = { id: "admin", role: "ADMINISTRATOR" };
    for (const p of [
      "/uploads/..%2F..%2Fetc%2Fpasswd",
      "/uploads/a/b.png",
      "/uploads/.env",
      "/uploads/%E0%A4%A",
    ]) {
      const res = await request(app()).get(p);
      expect(res.status, p).toBe(404);
    }
    expect(prismaMock.ticket.findFirst).not.toHaveBeenCalled();
  });

  it("a name that merely starts like a logo path elsewhere does not bypass the check", async () => {
    // "logo-" must be the START of the file name; "x-logo-1.png" is a normal gated file.
    const res = await request(app()).get("/uploads/x-logo-1.png");
    expect(res.status).toBe(401);
  });
});
