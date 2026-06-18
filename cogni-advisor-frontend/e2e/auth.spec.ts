import { test, expect } from "@playwright/test";
import { loginAs, TEST_USERS, waitForLoginForm } from "./helpers/auth";

test.describe("Authentication", () => {
  test("FE-AUTH-01: login page loads", async ({ page }) => {
    await waitForLoginForm(page);
    await expect(page.getByRole("heading", { name: /Sign in to Cogni Advisor/i })).toBeVisible();
    await expect(page.getByPlaceholder("name@student.eelu.edu.eg")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("FE-AUTH-02: student login redirects to dashboard", async ({ page }) => {
    await loginAs(page, "student");
    await expect(page).toHaveURL(/\/student\/dashboard/);
    await expect(page.locator("aside")).toContainText(/Advisor/i);
  });

  test("FE-AUTH-03: advisor login redirects to dashboard", async ({ page }) => {
    await loginAs(page, "advisor");
    await expect(page).toHaveURL(/\/advisor\/dashboard/);
  });

  test("FE-AUTH-04: admin login redirects to dashboard", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("FE-AUTH-05: wrong password shows error", async ({ page }) => {
    await waitForLoginForm(page);
    await page.getByPlaceholder("name@student.eelu.edu.eg").fill(TEST_USERS.student.email);
    await page.locator('input[type="password"]').fill("WrongPassword999");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText(/Unable to sign in|Invalid credentials|Login failed/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("FE-AUTH-06: protected route redirects to login", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
