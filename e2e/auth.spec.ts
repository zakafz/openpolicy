import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should render login page correctly", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page).toHaveTitle(/OpenPolicy/);
    await expect(
      page.getByRole("heading", { name: "Log into OpenPolicy" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with GitHub" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
  });
});
