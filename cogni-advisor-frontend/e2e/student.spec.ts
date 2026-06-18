import { test, expect } from "@playwright/test";
import { loginAs, sidebar } from "./helpers/auth";

test.describe("Student portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "student");
  });

  test("FE-STU-01: dashboard shows academic summary", async ({ page }) => {
    await expect(page).toHaveURL(/\/student\/dashboard/);
    await expect(sidebar(page).getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(sidebar(page).getByRole("link", { name: "My Study Plan" })).toBeVisible();
    await expect(sidebar(page).getByRole("link", { name: "Grades & Transcript" })).toBeVisible();
  });

  test("FE-STU-02: transcript page loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "Grades & Transcript" }).click();
    await expect(page).toHaveURL(/\/student\/transcript/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("FE-STU-03: study plan page loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "My Study Plan" }).click();
    await expect(page).toHaveURL(/\/student\/study-plan/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("FE-STU-04: academic chat page loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "Academic Chat" }).click();
    await expect(page).toHaveURL(/\/student\/chat/);
    await expect(page.getByText(/Cogni-Advisor assistant|bylaws/i)).toBeVisible();
  });

  test("FE-STU-05: messages page loads", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL(/\/student\/messages/);
  });
});
