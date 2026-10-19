import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { loadEnv } from "./config/env";

const app = createApp(loadEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv));

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
  it("still stubs modules that are not yet implemented", async () => {
    const res = await request(app).get("/api/v1/attachments");
    expect(res.status).toBe(501);
    expect(res.body.error).toBe("not_implemented");
  });
});
