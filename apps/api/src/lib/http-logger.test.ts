import express from "express";
import pino from "pino";
import request from "supertest";
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createHttpLogger, loggedPath } from "./http-logger";

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString());
      cb();
    },
  });
  return { lines, logger: pino({ level: "debug" }, stream) };
}

async function hit(
  setup: (app: express.Express) => void,
  path: string,
  method: "get" | "post" = "get",
) {
  const { lines, logger } = capture();
  const app = express();
  app.use(createHttpLogger(logger));
  setup(app);
  const res = await request(app)[method](path);
  // pino-http logs on 'finish'; give the event loop one tick
  await new Promise((r) => setImmediate(r));
  return { res, text: lines.join("\n"), lines };
}

describe("http logger", () => {
  it("never writes the response body", async () => {
    const { text } = await hit(
      (a) =>
        a.get("/data", (_req, res) => {
          res.status(400).json({ error: "validation_failed", message: "SECRET-BODY-TEXT" });
        }),
      "/data",
    );
    expect(text).not.toContain("SECRET-BODY-TEXT");
    expect(text).not.toContain("validation_failed");
  });

  it("never writes the query string (signed-URL tokens, search terms)", async () => {
    const { text } = await hit(
      (a) => a.get("/view", (_req, res) => res.json({ ok: true })),
      "/view?t=SUPER-SECRET-TOKEN&q=private+name",
    );
    expect(text).not.toContain("SUPER-SECRET-TOKEN");
    expect(text).not.toContain("private+name");
    expect(text).toContain("GET /view -> 200");
  });

  it("logs a 5xx without a stack trace or local file paths", async () => {
    const { text } = await hit(
      (a) =>
        a.get("/down", (_req, res) => {
          res.locals.errorCode = "maintenance_mode";
          res.status(503).json({ error: "maintenance_mode", message: "System under maintenance" });
        }),
      "/down",
    );
    expect(text).toContain("GET /down -> 503");
    expect(text).toContain("Code: maintenance_mode");
    expect(text).not.toMatch(/stack|at onResFinished|node_modules|\\Users\\/i);
  });

  it("downgrades maintenance mode to a warning and 4xx to warnings", async () => {
    const maint = await hit(
      (a) =>
        a.get("/m", (_req, res) => {
          res.locals.errorCode = "maintenance_mode";
          res.status(503).json({});
        }),
      "/m",
    );
    expect(JSON.parse(maint.lines[0]).level).toBe(40); // warn

    const denied = await hit((a) => a.get("/d", (_req, res) => res.status(403).json({})), "/d");
    expect(JSON.parse(denied.lines[0]).level).toBe(40);

    const boom = await hit((a) => a.get("/b", (_req, res) => res.status(500).json({})), "/b");
    expect(JSON.parse(boom.lines[0]).level).toBe(50); // error
  });

  it("ignores spoofed X-Forwarded-For (uses req.ip, which honours trust proxy)", async () => {
    const { lines, logger } = capture();
    const app = express(); // trust proxy off -> header must be ignored
    app.use(createHttpLogger(logger));
    app.get("/ip", (_req, res) => res.json({}));
    await request(app).get("/ip").set("X-Forwarded-For", "6.6.6.6");
    await new Promise((r) => setImmediate(r));
    expect(lines.join("\n")).not.toContain("6.6.6.6");
  });

  it("logs the full mounted path, not the router-relative one", () => {
    expect(loggedPath({ originalUrl: "/api/v1/auth/me?x=1", url: "/me?x=1" })).toBe(
      "/api/v1/auth/me",
    );
  });
});
