import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { Page } from "@playwright/test";

export async function signin(page: Page) {
  await setupClerkTestingToken({ page });

  while (true) {
    await page.goto("/sign-in");
    const emailInput = page.getByRole("textbox", { name: "Email address" });
    try {
      await emailInput.waitFor({ timeout: 1000 });
      break;
    } catch {
      continue;
    }
  }

  await page.getByRole("textbox", { name: "Email address" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill(process.env.TEST_EMAIL!);
  await page.getByRole("textbox", { name: "Email address" }).press("Enter");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForTimeout(1_000);
  await page.getByRole("textbox", { name: "Password" }).click();
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(process.env.TEST_PASSWORD!);
  await page.getByRole("button", { name: "Continue" }).click();

  // Wait for the redirect to complete and the PDF list to be visible
  await page.waitForURL("/"); // Assuming successful signin redirects to root
  await page.waitForSelector("[data-testid='pdf-list']");
}
