import { test, expect } from "@playwright/test";
import { signin } from "./utils";

test("Viewing a PDF", async ({ page }) => {
  await signin(page);

  const link = await page.getByRole("link", { name: /cobra/i }).first();

  const href = await link.getAttribute("href");

  await link.scrollIntoViewIfNeeded(); // Scroll into view first
  await link.dispatchEvent("click"); // Click using JS dispatchEvent
  console.log("clicked");
  // Wait for the navigation to complete and the URL to contain the href
  await page.waitForURL(`**${href}`);

  // check the url
  expect(page.url()).toContain(href);

  // Make the selector more specific to target the heading
  expect(await page.getByRole("heading", { name: /cobra/i }).isVisible()).toBe(
    true
  );
});

test.skip("Chatting with a PDF", async ({ page }) => {
  await signin(page);

  const link = await page.getByRole("link", { name: /cobra/i }).first();

  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);

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
