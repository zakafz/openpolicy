import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
  test("should load dashboard and display key elements", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: "Documents", exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: "Settings", exact: true }),
    ).toBeVisible();
  });
});
