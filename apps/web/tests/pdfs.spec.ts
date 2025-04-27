import { test, expect } from "@playwright/test";
import path from "path";
import { signin, navigateToPdf } from "./utils";

test("Viewing a PDF", async ({ page }) => {
  await page.goto("/");

  const href = await navigateToPdf(page, "cobra");
  expect(page.url()).toContain(href);

  expect(await page.getByRole("heading", { name: /cobra/i }).isVisible()).toBe(
    true
  );
});

test("Chatting with a PDF", async ({ page }) => {
  await page.goto("/");
  await navigateToPdf(page, "cobra");

  await page.waitForSelector("[data-document-loaded]");

  await page.getByTestId("chat-button").click();
  await page.getByTestId("chat-input").click();
  await page.getByTestId("chat-input").fill("Summarize");
  await page.getByTestId("chat-send-button").click();

  await page.getByTestId("chat-loading-message").waitFor({
    state: "detached",
  });

  expect(
    await page
      .getByTestId("chat-user-message")
      .filter({ hasText: /Summarize/i })
      .isVisible()
  ).toBe(true);

  expect(
    await page.getByTestId("chat-assistant-message").nth(0).isVisible()
  ).toBe(true);
});

test("Uploading a PDF", async ({ page }) => {
  await page.goto("/");

  // Get the initial count of links containing "yakima"
  const initialYakimaLinks = page.getByRole("link", {
    name: /yakima/i,
    exact: false,
  });
  const initialCount = await initialYakimaLinks.count();

  const fileInput = page.getByTestId("file-upload-input");

  // Use path.join to construct the file path reliably
  const filePath = path.join(__dirname, "artifacts", "yakima.pdf");

  // Set the input files for the file chooser
  await fileInput.setInputFiles(filePath);

  // Wait for the link count to increase by one
  await expect(
    page.getByRole("link", { name: /yakima/i, exact: false })
  ).toHaveCount(initialCount + 1, { timeout: 15000 }); // Increased timeout for upload/processing

  // Optional: Verify navigation or further state changes if needed
  // For example, check if the URL changes or if a success toast appears
});
