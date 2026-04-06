import { test, expect } from "@playwright/test";

test("home page shows hero and login link", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { name: /mock tests with a timer/i })
  ).toBeVisible();
  // Nav + hero both link to /login — scope to main to avoid strict-mode duplicate match.
  await expect(main.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Create an account" })
  ).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: /log in/i })
  ).toBeVisible();
});
