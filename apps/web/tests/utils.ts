import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { Page } from "@playwright/test";

export async function signin(page: Page, baseURL: string) {
  console.log("signin");
  await setupClerkTestingToken({ page });

  while (true) {
    console.log("goto");
    await page.goto(`${baseURL}/sign-in`);

    console.log("get email input");
    const emailInput = page.getByRole("textbox", { name: "Email address" });
    console.log("emailInput", emailInput);

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

  // console.log("waiting for url");
  // await page.waitForURL("/"); // Assuming successful signin redirects to root
  // console.log("waiting for pdf list");
  // await page.waitForSelector("[data-testid='pdf-list']");
}

export async function navigateToPdf(page: Page, name: string) {
  const link = await page
    .getByRole("link", { name: new RegExp(name, "i") })
    .first();

  const href = await link.getAttribute("href");

  // wait for visible
  // await link.waitFor({ state: "visible" });
  // await link.scrollIntoViewIfNeeded(); // Scroll into view first
  await link.dispatchEvent("click"); // Click using JS dispatchEvent
  // Wait for the navigation to complete and the URL to contain the href
  await page.waitForURL(`**${href}`);

  return href;
}
