import { defineConfig, devices } from "@playwright/test";

/**
 * Local: start Postgres + `npm run dev` in backend/ and frontend/, then:
 *   cd e2e && npm run test:e2e
 * CI: GitHub Actions starts API + `next start` and sets BASE_URL.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["github"],
        ["list"],
        ["html", { open: "never" }],
      ]
    : "list",
  outputDir: "test-results",
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
