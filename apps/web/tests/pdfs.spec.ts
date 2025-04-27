import { test, expect } from "@playwright/test";
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
