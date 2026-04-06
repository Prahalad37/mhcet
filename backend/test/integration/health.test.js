import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("GET /health", () => {
  it("returns JSON with status, database, uptime, env", async () => {
    const app = createApp();
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toMatchObject({
      status: "ok",
      database: "up",
      env: "test",
    });
    expect(typeof res.body.uptime).toBe("number");
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("sets X-Request-Id on responses", async () => {
    const app = createApp();
    const res = await request(app).get("/health").expect(200);
    expect(res.headers["x-request-id"]).toBeTruthy();
  });
});
