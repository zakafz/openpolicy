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

    await page.getByTestId("sidebar-nav-workspace").click();

    await expect(page).toHaveURL(/\/dashboard\/settings\/workspace/);
    await expect(page.getByTestId("workspace-name-input")).toBeVisible();

    const newName = `Updated Workspace Name ${Date.now()}`;
    const nameInput = page.getByTestId("workspace-name-input");
    await expect(nameInput).not.toHaveValue("");

    await nameInput.fill(newName);
    await nameInput.blur();
    await expect(nameInput).toHaveValue(newName);

    const saveButton = page.getByTestId("workspace-save-button");
    await expect(saveButton).toBeEnabled();

    const updatePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/workspaces") &&
        resp.request().method() === "PATCH",
    );

    await saveButton.click();
    await updatePromise;

    await expect(
      page.locator('[data-slot="toast-title"]').filter({ hasText: "Success!" }),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-slot="toast-description"]')
        .filter({ hasText: "Workspace settings saved." }),
    ).toBeVisible();

    await expect(saveButton).toBeDisabled();
  });
});
