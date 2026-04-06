import { test, expect } from "@playwright/test";

test("register new user and land on tests page", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "testpass123!";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL(/\/tests/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Available tests" })
  ).toBeVisible({ timeout: 15_000 });
});
