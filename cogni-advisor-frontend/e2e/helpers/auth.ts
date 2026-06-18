import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export type LoginRole = "student" | "advisor" | "admin";

export const TEST_USERS = {
  student: {
    email: "user.2200039@student.eelu.edu.eg",
    password: "Password123",
    role: "student" as const,
    dashboard: "/student/dashboard",
  },
  advisor: {
    email: "sara.20@advisor.eelu.edu.eg",
    password: "Aa123456#",
    role: "advisor" as const,
    dashboard: "/advisor/dashboard",
  },
  admin: {
    email: "admin@admin.eelu.edu.eg",
    password: "Admin@12345",
    role: "admin" as const,
    dashboard: "/admin/dashboard",
  },
};

/** انتظر تحميل React قبل التفاعل مع الفورم */
async function waitForLoginForm(page: Page) {
  await page.goto("/login", { waitUntil: "load" });
  const signIn = page.getByRole("button", { name: "Sign in" });
  await expect(signIn).toBeVisible();
  await expect(page.getByPlaceholder("name@student.eelu.edu.eg")).toBeVisible();
  // Next.js client hydration — بدونها الفورم يعمل GET native submit
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    if (!form) return false;
    const reactKey = Object.keys(form).find((k) => k.startsWith("__react"));
    return Boolean(reactKey);
  });
}

export async function loginAs(
  page: Page,
  user: keyof typeof TEST_USERS
) {
  const account = TEST_USERS[user];
  await waitForLoginForm(page);

  await page.getByPlaceholder("name@student.eelu.edu.eg").fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);

  if (account.role !== "student") {
    const roleName = account.role === "advisor" ? "Advisor" : "Admin";
    await page.getByRole("checkbox", { name: roleName }).check();
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const authResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/auth/callback/credentials") &&
        res.request().method() === "POST",
      { timeout: 30_000 }
    );

    await page.getByRole("button", { name: "Sign in" }).click();
    try {
      await authResponse;
      await page.waitForURL(`**${account.dashboard}`, { timeout: 30_000 });
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      await page.waitForTimeout(1500);
      await waitForLoginForm(page);
      await page.getByPlaceholder("name@student.eelu.edu.eg").fill(account.email);
      await page.locator('input[type="password"]').fill(account.password);
      if (account.role !== "student") {
        const roleName = account.role === "advisor" ? "Advisor" : "Admin";
        await page.getByRole("checkbox", { name: roleName }).check();
      }
    }
  }
}

export { waitForLoginForm };

/** روابط الـ sidebar فقط — تتجنب التكرار في صفحة الـ dashboard */
export function sidebar(page: Page) {
  return page.locator("aside");
}
