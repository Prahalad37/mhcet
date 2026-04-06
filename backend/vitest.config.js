import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    pool: "forks",
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@127.0.0.1:5432/mhcet",
      JWT_SECRET:
        process.env.JWT_SECRET ||
        "test-jwt-secret-at-least-32-characters-long!!",
      NODE_ENV: "test",
    },
  },
});
