import { test, expect } from "@playwright/test";
import { navigateToPdf } from "./utils";

test("Viewing a PDF", async ({ page }) => {
  const getCurrentPage = async () => {
    return await page.getByTestId("pdf-page-navigation-input").inputValue();
  };

  await page.goto("/");

  const href = await navigateToPdf(page, "cobra");
  expect(page.url()).toContain(href);

  expect(await page.getByRole("heading", { name: /cobra/i }).isVisible()).toBe(
    true
  );

  await page.getByText("Document Type").click();

  await page.getByRole("tab", { name: "Pages" }).click();
  await page.getByTestId("pdf-thumbnail-2").click();
  expect(await getCurrentPage()).toBe("2");
  await page.getByTestId("pdf-page-navigation-input").fill("3");
  expect(await getCurrentPage()).toBe("3");
  await page.getByTestId("pdf-page-navigation-next").click();
  expect(await getCurrentPage()).toBe("4");
  await page.getByTestId("pdf-page-navigation-previous").click();
  expect(await getCurrentPage()).toBe("3");

  await page.getByTestId("pdf-search-input").fill("cobra");
  await page.getByTestId("pdf-search-input").press("Enter");

  await page.waitForSelector(".pdf-search-current");
});
