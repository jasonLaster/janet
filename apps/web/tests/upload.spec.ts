import { test, expect } from "@playwright/test";
import path from "path";

test("Uploading a PDF", async ({ page }) => {
  await page.goto("/");

  // Get the initial count of links containing "yakima"
  const initialYakimaLinks = page.getByRole("link", {
    name: /yakima/i,
    exact: false,
  });
  const initialCount = await initialYakimaLinks.count();

  await page
    .getByRole("button", { name: "File upload area" })
    .waitFor({ state: "visible", timeout: 15_000 });

  const fileInput = page.locator('input[type="file"]');
  const filePath = path.join(__dirname, "artifacts", "yakima.pdf");
  await fileInput.setInputFiles(filePath);

  await page.getByTestId("upload-loader").waitFor({ state: "visible" });

  await page
    .getByTestId("upload-loader")
    .waitFor({ state: "hidden", timeout: 30_000 });

  // Force a page reload to ensure the list updates
  console.log("Reloading page...");
  await page.reload();
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 });
  console.log("Page reloaded.");

  // Wait for the link count to increase by one after upload completes and refresh happens
  await expect(
    page.getByRole("link", { name: /yakima/i, exact: false })
  ).toHaveCount(initialCount + 1, { timeout: 15_000 });

  // Locate the specific list item containing the new PDF
  const yakimaListItem = page
    .locator('[data-testid="pdf-list-item"]')
    .filter({ hasText: /yakima/i })
    .first();

  // Wait for the metadata within that specific list item to become visible
  const metadataInItem = yakimaListItem.locator(
    '[data-testid="document-metadata"]'
  );
  await expect(metadataInItem).toBeVisible({ timeout: 30_000 });

  // Find and click the menu button within the specific list item
  const menuButton = yakimaListItem.locator(
    '[data-testid="pdf-list-item-menu-button"]'
  );
  await menuButton.click();

  // Find and click the delete button in the dropdown menu
  // Note: The delete button is likely added to the page body, not within the list item, so we select it globally
  const deleteButton = page.locator(
    '[data-testid="pdf-list-item-delete-button"]'
  );
  await deleteButton.click();

  // Assert the row is marked as deleting
  await expect(yakimaListItem.locator('[data-deleting="true"]')).toBeVisible();

  // Verify the item is removed by checking the count decreases
  await expect(
    page.getByRole("link", { name: /yakima/i, exact: false })
  ).toHaveCount(initialCount, { timeout: 10_000 });
});
