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

  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 });

  await expect(
    page.getByRole("link", { name: /yakima/i, exact: false })
  ).toHaveCount(initialCount + 1, { timeout: 10_000 });
});
