import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createResponseGuard, stripSensitive } from "./response-guard";

describe("stripSensitive", () => {
  it("removes forbidden keys at any depth, in objects and arrays", () => {
    const removed = new Set<string>();
    const out = stripSensitive(
      {
        data: [
          { id: "1", email: "a@b.c", passwordHash: "x", nested: { twoFactorSecret: "s", ok: 1 } },
          {
            id: "2",
            tokenHash: "t",
            attachments: [{ id: "a", storageKey: "k.pdf", fileName: "f" }],
          },
        ],
        codeHash: "c",
        resetTokenHash: "r",
        resetTokenExpiresAt: new Date(),
      },
      removed,
    );

    expect(out).toEqual({
      data: [
        { id: "1", email: "a@b.c", nested: { ok: 1 } },
        { id: "2", attachments: [{ id: "a", fileName: "f" }] },
      ],
    });
    expect([...removed].sort()).toEqual(
      [
        "codeHash",
        "passwordHash",
        "resetTokenExpiresAt",
        "resetTokenHash",
        "storageKey",
        "tokenHash",
        "twoFactorSecret",
      ].sort(),
    );
  });

  it("returns the very same reference when nothing needs removing", () => {
    const body = { data: [{ id: "1", fullName: "X" }], meta: { total: 1 } };
    expect(stripSensitive(body)).toBe(body);
  });

  it("leaves primitives, null, dates and buffers untouched", () => {
    const d = new Date();
    const b = Buffer.from("x");
    expect(stripSensitive(null)).toBeNull();
    expect(stripSensitive("s")).toBe("s");
    expect(stripSensitive(5)).toBe(5);
    expect(stripSensitive(d)).toBe(d);
    expect(stripSensitive(b)).toBe(b);
  });

  it("does not strip values the API returns on purpose", () => {
    // 2FA setup shows the secret once; reset-link / invite flows return tokens by design.
    const body = { secret: "ABC", qrCodeUrl: "data:...", resetUrl: "https://x/y", tempToken: "t" };
    expect(stripSensitive(body)).toBe(body);
  });
});

describe("createResponseGuard middleware", () => {
  function appWith(onStrip?: Parameters<typeof createResponseGuard>[0]) {
    const app = express();
    app.use(createResponseGuard(onStrip));
    // A route that "forgot" to select fields — the classic leak.
    app.get("/leaky", (_req, res) => {
      res.json({
        data: {
          id: "u1",
          email: "u@x.so",
          passwordHash: "$argon2id$secret",
          twoFactorSecret: "JBSWY3DP",
          resetTokenHash: "abc",
        },
      });
    });
    app.get("/invites", (_req, res) => {
      res.json({ data: [{ id: "i1", email: "n@x.so", tokenHash: "deadbeef" }] });
    });
    app.get("/clean", (_req, res) => {
      res.json({ data: { id: "1" } });
    });
    return app;
  }

  it("strips secrets from a leaky route and keeps the rest", async () => {
    const res = await request(appWith()).get("/leaky");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { id: "u1", email: "u@x.so" } });
    expect(JSON.stringify(res.body)).not.toMatch(/argon2|JBSWY3DP|resetTokenHash/);
  });

  it("strips tokenHash from the invites list shape", async () => {
    const res = await request(appWith()).get("/invites");
    expect(res.body).toEqual({ data: [{ id: "i1", email: "n@x.so" }] });
  });

  it("reports key NAMES (never values) so the leak can be fixed at the source", async () => {
    const onStrip = vi.fn();
    await request(appWith(onStrip)).get("/leaky");
    expect(onStrip).toHaveBeenCalledTimes(1);
    const report = onStrip.mock.calls[0][0];
    expect(report.path).toBe("/leaky");
    expect(report.keys.sort()).toEqual(["passwordHash", "resetTokenHash", "twoFactorSecret"]);
    expect(JSON.stringify(report)).not.toMatch(/argon2|JBSWY3DP/);
  });

  it("stays silent for clean responses", async () => {
    const onStrip = vi.fn();
    await request(appWith(onStrip)).get("/clean");
    expect(onStrip).not.toHaveBeenCalled();
  });
});
