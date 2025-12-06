import { expect, test } from "@playwright/test";

test.describe("Document Management", () => {
  test.setTimeout(60000);
  test("should create, update, and delete a document", async ({ page }) => {
    const uniqueSlug = `test-document-${Date.now()}`;
    const uniqueTitle = `Test Document ${Date.now()}`;

    await page.goto("/dashboard/documents/all");

    await page.getByRole("link", { name: "Create Document" }).click();
    await expect(page).toHaveURL(/\/dashboard\/documents\/new/);

    await page.getByLabel("Document Title").fill(uniqueTitle);
    await page.getByLabel("Slug (URL)").fill(uniqueSlug);

    await page.getByRole("button", { name: "Change" }).click();
    await page.getByPlaceholder("Search templates...").fill("terms");
    await page.getByRole("button", { name: "Terms of Service" }).click();
    await page.getByRole("button", { name: "Use Template" }).click();

    await expect(page.getByText("Agreement to Terms")).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Create Document" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Create Document" }).click();

    await expect(page).toHaveURL(/\/dashboard\/d\//, { timeout: 15000 });

    await expect(page.getByText("Loading document...")).not.toBeVisible({
      timeout: 10000,
    });

    const notFound = page.getByText("Document not found");
    const accessDenied = page.getByText("Access Denied");

    if (await notFound.isVisible()) {
      throw new Error("Test failed: Document not found on the page");
    }
    if (await accessDenied.isVisible()) {
      throw new Error("Test failed: Access Denied to the document");
    }

    await expect(page.getByTestId("document-title")).toContainText(uniqueTitle);

    await page.getByTestId("rename-trigger").click();

    const renameDialog = page.getByTestId("rename-dialog");
    await expect(renameDialog).toBeVisible();

    const input = page.getByPlaceholder(uniqueTitle);
    await expect(input).toBeVisible();
    const updatedTitle = `Updated Document Title ${Date.now()}`;
    await input.fill(updatedTitle);
    await expect(input).toHaveValue(updatedTitle);

    const renameButton = page.getByTestId("rename-submit-button");
    await expect(renameButton).toBeEnabled();
    await page.waitForTimeout(500);
    await renameButton.click();

    await expect(renameButton).toHaveText("Renaming...", { timeout: 5000 });

    try {
      await expect(page.getByTestId("rename-dialog")).not.toBeVisible({
        timeout: 15000,
      });
    } catch (e) {
      const errorMsg = await page
        .getByRole("alert")
        .textContent()
        .catch(() => null);
      console.log(
        "Rename dialog did not close. Error alert content:",
        errorMsg,
      );
      throw e;
    }

    await expect(page.getByTestId("document-title")).toContainText(
      updatedTitle,
    );

    await expect(page.getByText("Success!")).toBeVisible({ timeout: 15000 });

    const optionsTrigger = page.getByTestId("document-options-trigger");
    await expect(optionsTrigger).toBeVisible();
    await optionsTrigger.click({ force: true });
    const archiveButton = page.getByTestId("archive-document-button");
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();
    await expect(page.getByText("Success!")).toBeVisible();
    await page.waitForTimeout(2000); // Wait data propagation
    await page.reload();
    await expect(page.getByTestId("document-status-badge")).toHaveText(
      /archived/i,
    );
  });
});
