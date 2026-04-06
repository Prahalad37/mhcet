import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("POST /api/auth/register and /login", () => {
  it("registers a new user and accepts login with same credentials", async () => {
    const app = createApp();
    const email = `vitest-${Date.now()}@example.com`;
    const password = "testpass123!";

    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email, password })
      .expect(201);

    expect(reg.body.token).toBeTruthy();
    expect(reg.body.user?.email).toBe(email.toLowerCase());

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);

    expect(login.body.token).toBeTruthy();
  });
});
