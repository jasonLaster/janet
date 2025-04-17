import { test, expect } from "@playwright/test";
import { signin } from "./utils";

test("Viewing a PDF", async ({ page }) => {
  await signin(page);

  await page.waitForSelector("[data-testid='pdf-list']");

  const medicareLink = await page
    .getByRole("link", { name: /medicare/i })
    .first();

  await medicareLink.click();

  expect(await page.getByText(/medicare/i).isVisible()).toBe(true);
});

test("Chatting with a PDF", async ({ page }) => {
  await signin(page);

  await page.waitForSelector("[data-testid='pdf-list']");

  const medicareLink = await page
    .getByRole("link", { name: /medicare/i })
    .first();

  await medicareLink.click();

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
