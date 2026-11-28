import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  session: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
vi.mock("../lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { requireAuth } from "./auth";
import { errorHandler } from "./errors";
import { SESSION_COOKIE } from "../lib/cookies";

function app() {
  const a = express();
  a.use(cookieParser());
  a.get("/api/v1/whoami", requireAuth, (req, res) => res.json({ user: req.user }));
  a.use(errorHandler);
  return a;
}

const liveSession = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  revokedAt: null,
  expiresAt: new Date(Date.now() + 3600_000),
  lastSeenAt: new Date(),
  user: {
    id: "u1",
    email: "u@x.so",
    role: "DEAN",
    officeId: "o1",
    active: true,
    mustChangePassword: false,
  },
  ...over,
});

beforeEach(() => {
  prismaMock.session.findUnique.mockReset();
  prismaMock.session.update.mockReset().mockResolvedValue({});
});

describe("requireAuth", () => {
  it("never loads credential columns and exposes only id/email/role/officeId on req.user", async () => {
    prismaMock.session.findUnique.mockResolvedValue(liveSession());
    const res = await request(app()).get("/api/v1/whoami").set("Cookie", `${SESSION_COOKIE}=tok`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: "u1", email: "u@x.so", role: "DEAN", officeId: "o1" });

    // The query itself must be an allowlist: no `include: { user: true }` that pulls every column.
    const query = prismaMock.session.findUnique.mock.calls[0][0];
    expect(query.include).toBeUndefined();
    const selected = Object.keys(query.select.user.select);
    for (const secret of [
      "passwordHash",
      "twoFactorSecret",
      "resetTokenHash",
      "resetTokenExpiresAt",
    ]) {
      expect(selected).not.toContain(secret);
    }
  });

  it("still rejects missing, revoked, expired and deactivated sessions", async () => {
    const noCookie = await request(app()).get("/api/v1/whoami");
    expect(noCookie.status).toBe(401);

    prismaMock.session.findUnique.mockResolvedValue(liveSession({ revokedAt: new Date() }));
    const revoked = await request(app()).get("/api/v1/whoami").set("Cookie", `${SESSION_COOKIE}=t`);
    expect(revoked.status).toBe(401);

    prismaMock.session.findUnique.mockResolvedValue(
      liveSession({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const expired = await request(app()).get("/api/v1/whoami").set("Cookie", `${SESSION_COOKIE}=t`);
    expect(expired.status).toBe(401);

    prismaMock.session.findUnique.mockResolvedValue(
      liveSession({ user: { ...liveSession().user, active: false } }),
    );
    const inactive = await request(app())
      .get("/api/v1/whoami")
      .set("Cookie", `${SESSION_COOKIE}=t`);
    expect(inactive.status).toBe(403);
  });

  it("still forces a password change before anything else", async () => {
    prismaMock.session.findUnique.mockResolvedValue(
      liveSession({ user: { ...liveSession().user, mustChangePassword: true } }),
    );
    const res = await request(app()).get("/api/v1/whoami").set("Cookie", `${SESSION_COOKIE}=t`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("password_change_required");
  });
});
