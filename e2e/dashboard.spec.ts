import { expect, test } from "@playwright/test";

test.describe("Dashboard Navigation", () => {
  test("should redirect to login if not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/);
  });
});
