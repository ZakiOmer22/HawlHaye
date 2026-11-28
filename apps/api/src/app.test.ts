import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { prisma } from "./lib/prisma";

const app = createApp(loadEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv));

// ────────────────────────────────────────────────────────────
// SKELETON TESTS (no DB required)
// ────────────────────────────────────────────────────────────

describe("api skeleton", () => {
  it("answers health checks", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("sets security headers and hides the framework", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("returns 404 json for unknown routes", async () => {
    const res = await request(app).get("/nope");

    expect(res.status).toBe(404);
  });

  it("protects authenticated modules behind auth", async () => {
    const res = await request(app).get("/api/v1/tasks");

    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────
// RBAC INTEGRATION TESTS (require a seeded DB)
// ────────────────────────────────────────────────────────────

const PROBE_EMAIL = "probe-user@mail.test";

describe("api security & RBAC", () => {
  let techCookie: string | null = null;
  let deanCookie: string | null = null;
  let seeded = false;

  beforeAll(async () => {
    try {
      const userCount = await prisma.user.count();

      if (userCount === 0) {
        console.warn(
          "Tests skipped: database has no users. Run `npm run db:seed -w @hawl/api` first.",
        );
        return;
      }

      seeded = true;
    } catch {
      console.warn("Tests skipped: cannot reach database.");
      return;
    }

    // Reset lockout on seeded accounts
    await prisma.user.updateMany({
      where: { email: { in: ["tech@mail.com", "dean@mail.com"] } },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    // Create or reset the persistent probe user
    await prisma.user.upsert({
      where: { email: PROBE_EMAIL },
      create: {
        email: PROBE_EMAIL,
        fullName: "Probe User",
        role: "LAB_TECHNICIAN",
        passwordHash: "$2b$10$invalidhashinvalidhashinvalidhashinvalidhashinv",
        active: true,
      },
      update: {
        failedLoginCount: 0,
        lockedUntil: null,
        active: true,
      },
    });

    // Login as technician
    const techRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "tech@mail.com", password: "12345678" });

    if (techRes.status === 200) {
      techCookie = techRes.headers["set-cookie"]?.[0] ?? null;
    }

    // Login as dean
    const deanRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dean@mail.com", password: "12345678" });

    if (deanRes.status === 200) {
      deanCookie = deanRes.headers["set-cookie"]?.[0] ?? null;
    }
  });

  // Cleanup probe lockout state after tests so subsequent runs are clean.
  afterAll(async () => {
    if (!seeded) return;

    try {
      await prisma.user.updateMany({
        where: { email: PROBE_EMAIL },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    } catch (error) {
      console.warn("Failed to reset probe user lockout state:", error);
    }
  });

  it("denies a Lab Technician from accessing the User Admin list", async () => {
    if (!seeded || !techCookie) return;

    const res = await request(app).get("/api/v1/users").set("Cookie", techCookie);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });

  it("allows a Dean to access the User Admin list", async () => {
    if (!seeded || !deanCookie) return;

    const res = await request(app).get("/api/v1/users").set("Cookie", deanCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("prevents a Lab Technician from moving a task to COMPLETED", async () => {
    if (!seeded || !techCookie) return;

    const taskRes = await request(app).get("/api/v1/tasks?take=1").set("Cookie", techCookie);

    if (taskRes.body.data?.length > 0) {
      const taskId = taskRes.body.data[0].id;

      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/transition`)
        .set("Cookie", techCookie)
        .send({ to: "COMPLETED" });

      expect([400, 403]).toContain(res.status);
    }
  });

  it("rejects an out-of-scope technician trying to transition someone else's task", async () => {
    if (!seeded || !techCookie || !deanCookie) return;

    const office = await prisma.office.findFirst({
      where: { type: "ADMINISTRATION" },
    });

    const category = await prisma.category.findFirst();

    if (!office || !category) return;

    const created = await request(app).post("/api/v1/tasks").set("Cookie", deanCookie).send({
      title: "RBAC test task",
      categoryId: category.id,
      officeId: office.id,
    });

    if (created.status !== 201) return;

    const taskId = created.body.data.id;

    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/transition`)
      .set("Cookie", techCookie)
      .send({ to: "IN_PROGRESS" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });

  it("rejects assigning a task the caller cannot access", async () => {
    if (!seeded || !deanCookie) return;

    const res = await request(app)
      .post("/api/v1/tasks/nonexistent-id/assign")
      .set("Cookie", deanCookie)
      .send({
        ownerId: "someone",
        priority: "MEDIUM",
        dueDate: new Date().toISOString(),
      });

    expect(res.status).toBe(404);
  });

  it("enforces rate limit on uploads per user", async () => {
    if (!seeded || !techCookie) return;

    let got429 = false;

    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/api/v1/tasks/any-id/attachments")
        .set("Cookie", techCookie);

      if (res.status === 429) {
        got429 = true;
        break;
      }
    }

    expect(got429).toBe(true);
  });

  // ──────────────────────────────────────────────────────────
  // BRUTE-FORCE / ACCOUNT LOCKOUT TEST
  // ──────────────────────────────────────────────────────────

  it("blocks brute-force login attempts by locking the account", async () => {
    if (!seeded) return;

    // Start from a clean probe-user state
    await prisma.user.updateMany({
      where: { email: PROBE_EMAIL },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // The API intentionally returns generic 401 responses.
    // We verify the security mechanism through the database instead.
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/v1/auth/login").send({
        email: PROBE_EMAIL,
        password: "wrongpassword",
      });
    }

    // Inspect the actual account lockout state
    const user = await prisma.user.findUnique({
      where: { email: PROBE_EMAIL },
      select: {
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    // Account must exist
    expect(user).not.toBeNull();

    // Failed login counter must reach the lockout threshold
    expect(user!.failedLoginCount).toBeGreaterThanOrEqual(5);

    // Account must have an active lockout timestamp
    expect(user!.lockedUntil).not.toBeNull();

    // Lockout must still be active, not expired
    expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});
