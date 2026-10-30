import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { prisma } from "./lib/prisma";

const app = createApp(loadEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv));

// ─────────────────────────────────────────────────────────────────
// SKELETON TESTS (no DB required)
// ─────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────
// RBAC INTEGRATION TESTS (require a seeded DB)
// ─────────────────────────────────────────────────────────────────

// Permanent probe user used by the brute-force test. Never deleted — see
// the note at the bottom of that test for why deletion is impossible
// without breaking the audit hash chain.
const PROBE_EMAIL = "probe-user@mail.test";

describe("api security & RBAC", () => {
  let techCookie: string | null = null;
  let deanCookie: string | null = null;
  let seeded = false;

  beforeAll(async () => {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.warn(
        "⚠️  Tests skipped: database has no users. Run `npm run db:seed -w @hawl/api` first.",
      );
      return;
    }
    seeded = true;

    // Reset lockout on seeded accounts so a prior failed run can't cause
    // the RBAC tests below to silently skip with vacuous ✓s.
    await prisma.user.updateMany({
      where: { email: { in: ["tech@mail.com", "dean@mail.com"] } },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    // Create or reset the persistent probe user. Never deleted — its
    // failed-login audit rows must stay intact for the chain to verify.
    await prisma.user.upsert({
      where: { email: PROBE_EMAIL },
      create: {
        email: PROBE_EMAIL,
        fullName: "Probe User",
        role: "LAB_TECHNICIAN",
        // bcrypt-shaped invalid hash — verifyPassword always fails,
        // which drives the failedLoginCount/lockout branch we want to test.
        passwordHash: "$2b$10$invalidhashinvalidhashinvalidhashinvalidhashinv",
        active: true,
      },
      update: { failedLoginCount: 0, lockedUntil: null, active: true },
    });

    const techRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "tech@mail.com", password: "12345678" });

    if (techRes.status === 200) {
      techCookie = techRes.headers["set-cookie"]?.[0] ?? null;
    } else {
      console.warn(
        `⚠️  Tech login failed with ${techRes.status}. Tests requiring auth will be skipped.`,
      );
    }

    const deanRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dean@mail.com", password: "12345678" });

    if (deanRes.status === 200) {
      deanCookie = deanRes.headers["set-cookie"]?.[0] ?? null;
    } else {
      console.warn(
        `⚠️  Dean login failed with ${deanRes.status}. Tests requiring auth will be skipped.`,
      );
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

    const office = await prisma.office.findFirst({ where: { type: "ADMINISTRATION" } });
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
      .post(`/api/v1/tasks/nonexistent-id/assign`)
      .set("Cookie", deanCookie)
      .send({ ownerId: "someone", priority: "MEDIUM", dueDate: new Date().toISOString() });
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

  it("blocks brute-force login attempts (lockout or rate limit)", async () => {
    if (!seeded) return;

    // Reset probe's lockout state so consecutive CI runs are idempotent.
    await prisma.user.updateMany({
      where: { email: PROBE_EMAIL },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    let gotBlocked = false;
    let gotBlockedBy: number | null = null;
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: PROBE_EMAIL, password: "wrongpassword" });
      if (res.status === 429) {
        gotBlocked = true;
        gotBlockedBy = 429;
        break;
      }
      if (res.status === 403 && res.body.error === "account_locked") {
        gotBlocked = true;
        gotBlockedBy = 403;
        break;
      }
    }
    expect(gotBlocked, "expected lockout or rate limit, got none").toBe(true);
    expect([403, 429]).toContain(gotBlockedBy);

    // No cleanup — the probe user is permanent. Deleting it fails because
    // audit_logs.actorId has ON DELETE RESTRICT (intentional: audit history
    // must never be orphaned). Removing the audit rows would break
    // verifyAuditChain() since prevHash links would dangle.
  });
});
