import { test, expect } from "@playwright/test";
import { loginAs, sidebar } from "./helpers/auth";

test.describe("Advisor portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "advisor");
  });

  test("FE-ADV-01: dashboard loads", async ({ page }) => {
    await expect(page).toHaveURL(/\/advisor\/dashboard/);
    await expect(sidebar(page).getByRole("link", { name: "Plan Requests" })).toBeVisible();
    await expect(sidebar(page).getByRole("link", { name: "My Students" })).toBeVisible();
  });

  test("FE-ADV-02: students list loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "My Students" }).click();
    await expect(page).toHaveURL(/\/advisor\/students/);
  });

  test("FE-ADV-03: study plans page loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "Plan Requests" }).click();
    await expect(page).toHaveURL(/\/advisor\/study-plans/);
  });
});

test.describe("Admin portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("FE-ADM-01: dashboard loads", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(sidebar(page).getByRole("link", { name: "Users Management" })).toBeVisible();
  });

  test("FE-ADM-02: users page loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "Users Management" }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test("FE-ADM-03: courses page loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "Courses" }).click();
    await expect(page).toHaveURL(/\/admin\/courses/);
  });
});
