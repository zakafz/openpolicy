import { expect, test } from "@playwright/test";

test.describe("Login Flow", () => {
  test("should load login page successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/.*login.*/);
  });

  test("should redirect to login when accessing dashboard without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/);
  });
});
