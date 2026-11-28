import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({ session: { findUnique: vi.fn() } }));
const settingsState = vi.hoisted(() => ({ maintenanceMode: true }));

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("./settings", () => ({
  getSystemSettings: async () => ({ maintenanceMode: settingsState.maintenanceMode }),
}));
vi.mock("@prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
vi.mock("../lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { checkMaintenance } from "./maintenance";
import { errorHandler } from "./errors";
import { SESSION_COOKIE } from "../lib/cookies";

function app() {
  const a = express();
  a.use(cookieParser());
  a.use(checkMaintenance);
  a.get("/api/v1/tasks", (_req, res) => res.json({ data: "WORK" }));
  a.get("/api/v1/auth/me", (_req, res) => res.json({ data: "ME" }));
  a.use(errorHandler);
  return a;
}

const future = () => new Date(Date.now() + 3600_000);
const past = () => new Date(Date.now() - 3600_000);
const cookie = `${SESSION_COOKIE}=tok`;

beforeEach(() => {
  settingsState.maintenanceMode = true;
  prismaMock.session.findUnique.mockReset();
});

describe("maintenance mode", () => {
  it("blocks everyone with 503 + maintenance_mode when there is no session", async () => {
    const res = await request(app()).get("/api/v1/tasks");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "maintenance_mode", message: "System under maintenance" });
  });

  it("lets a LIVE administrator / dean / deputy through", async () => {
    for (const role of ["ADMINISTRATOR", "DEAN", "DEPUTY"]) {
      prismaMock.session.findUnique.mockResolvedValue({
        revokedAt: null,
        expiresAt: future(),
        user: { role, active: true },
      });
      const res = await request(app()).get("/api/v1/tasks").set("Cookie", cookie);
      expect(res.status, role).toBe(200);
    }
  });

  it("does NOT let a REVOKED admin session bypass (e.g. after logout)", async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      revokedAt: new Date(),
      expiresAt: future(),
      user: { role: "ADMINISTRATOR", active: true },
    });
    const res = await request(app()).get("/api/v1/tasks").set("Cookie", cookie);
    expect(res.status).toBe(503);
  });

  it("does NOT let an EXPIRED admin session bypass", async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: past(),
      user: { role: "ADMINISTRATOR", active: true },
    });
    const res = await request(app()).get("/api/v1/tasks").set("Cookie", cookie);
    expect(res.status).toBe(503);
  });

  it("does NOT let a deactivated admin bypass", async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: future(),
      user: { role: "ADMINISTRATOR", active: false },
    });
    const res = await request(app()).get("/api/v1/tasks").set("Cookie", cookie);
    expect(res.status).toBe(503);
  });

  it("does not let other roles bypass", async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: future(),
      user: { role: "LAB_TECHNICIAN", active: true },
    });
    const res = await request(app()).get("/api/v1/tasks").set("Cookie", cookie);
    expect(res.status).toBe(503);
  });

  it("still lets /auth routes through so people can log in", async () => {
    const res = await request(app()).get("/api/v1/auth/me");
    expect(res.status).toBe(200);
  });

  it("does nothing when maintenance mode is off", async () => {
    settingsState.maintenanceMode = false;
    const res = await request(app()).get("/api/v1/tasks");
    expect(res.status).toBe(200);
    expect(prismaMock.session.findUnique).not.toHaveBeenCalled();
  });
});
