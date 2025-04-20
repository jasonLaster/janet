import { test, expect } from "@playwright/test";
import { signin } from "./utils";

test("Viewing a PDF", async ({ page }) => {
  await signin(page);

  await page.waitForSelector("[data-testid='pdf-list']");

  const link = await page.getByRole("link", { name: /cobra/i }).first();

  const href = await link.getAttribute("href");
  await link.click();

  // check the url
  expect(page.url()).toContain(href);

  expect(await page.getByText(/cobra/i).isVisible()).toBe(true);
});

test("Chatting with a PDF", async ({ page }) => {
  await signin(page);

  await page.waitForSelector("[data-testid='pdf-list']");

  const link = await page.getByRole("link", { name: /cobra/i }).first();

  await link.click();

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
