import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// errors.ts imports the generated Prisma client and the app logger; neither is needed here.
vi.mock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      constructor(
        message: string,
        public code: string,
      ) {
        super(message);
      }
    },
  },
}));
vi.mock("../lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { Prisma } from "@prisma/client";
import { HttpError, errorHandler, notFound } from "./errors";

function build(setup: (app: express.Express) => void) {
  const app = express();
  app.use(express.json({ limit: "1kb" }));
  setup(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("never leaks the internals of an unexpected error", async () => {
    const app = build((a) =>
      a.get("/boom", () => {
        throw new Error('relation "users" does not exist at C:\\Users\\ZAKI OMER\\hawl\\secret.ts');
      }),
    );
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("internal_error");
    expect(res.body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/does not exist|"users"|ZAKI|secret\.ts|\bstack\b/i);
    expect(res.body.message).toMatch(/^An unexpected error occurred\. Reference: /);
  });

  it("maps unknown Prisma codes to a generic 500 (no table / column names)", async () => {
    const app = build((a) =>
      a.get("/p", () => {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed on the fields: (`passwordHash`)",
          "P9999",
        );
      }),
    );
    const res = await request(app).get("/p");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|constraint/i);
  });

  it("keeps the existing response shapes the web client parses", async () => {
    const app = build((a) => {
      a.get("/http", () => {
        throw new HttpError(403, "Forbidden", "forbidden");
      });
      a.get("/zod", () => {
        z.object({ email: z.string().email() }).parse({ email: "nope" });
      });
      a.get("/dup", () => {
        throw new Prisma.PrismaClientKnownRequestError("dup", "P2002");
      });
    });

    const http = await request(app).get("/http");
    expect(http.status).toBe(403);
    expect(http.body).toEqual({ error: "forbidden", message: "Forbidden" });

    const zod = await request(app).get("/zod");
    expect(zod.status).toBe(400);
    expect(zod.body.error).toBe("validation_failed");
    expect(zod.body.issues[0]).toHaveProperty("path");

    const dup = await request(app).get("/dup");
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("conflict");

    const missing = await request(app).get("/nothing-here");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "not_found", message: "Route not found" });
  });

  it("answers malformed and oversized bodies without echoing parser internals", async () => {
    const app = build((a) => a.post("/echo", (req, res) => res.json(req.body)));

    const bad = await request(app)
      .post("/echo")
      .set("Content-Type", "application/json")
      .send("{oops");
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ error: "invalid_json", message: "Malformed JSON body." });

    const big = await request(app)
      .post("/echo")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ x: "a".repeat(4000) }));
    expect(big.status).toBe(413);
    expect(big.body.error).toBe("payload_too_large");
  });

  it("records the machine-readable code on res.locals for the request logger", async () => {
    let seen: string | undefined;
    const app = express();
    app.use((_req, res, next) => {
      res.on("finish", () => {
        seen = res.locals.errorCode;
      });
      next();
    });
    app.get("/x", () => {
      throw new HttpError(503, "System under maintenance", "maintenance_mode");
    });
    app.use(errorHandler);

    const res = await request(app).get("/x");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "maintenance_mode", message: "System under maintenance" });
    expect(seen).toBe("maintenance_mode");
  });
});
