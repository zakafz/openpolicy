import { expect, test } from "@playwright/test";

test.describe("Workspace Management", () => {
  test("should verify single workspace limit and update workspace settings", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByTestId("workspace-switcher-trigger").click();

    const addWorkspace = page.getByRole("menuitem", { name: "Add workspace" });
    await expect(addWorkspace).toBeDisabled();

    await page.keyboard.press("Escape");

    const _sidebar = page.locator('[data-sidebar="sidebar"]');

    await page.getByTestId("sidebar-nav-workspace").click({ force: true });

    await expect(page).toHaveURL(/\/dashboard\/settings\/workspace/);

    const newName = `Updated Workspace Name ${Date.now()}`;
    const nameInput = page.getByTestId("workspace-name-input");
    await expect(nameInput).not.toHaveValue("");

    await nameInput.fill(newName);
    await nameInput.blur();
    await expect(nameInput).toHaveValue(newName);

    const saveButton = page.getByTestId("workspace-save-button");
    await expect(saveButton).toBeEnabled({ timeout: 10000 });
    await saveButton.click();

    await expect(page.getByText("Success!")).toBeVisible();

    await expect(saveButton).toBeDisabled();

    await expect(page.getByText("Success!", { exact: true })).toBeVisible();
  });
});
