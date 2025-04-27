import { clerkSetup } from "@clerk/testing/playwright";
// import { test as setup } from "@playwright/test";

import { chromium } from "@playwright/test";
import { signin } from "./utils";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const usePreviewUrl = !!process.env.PLAYWRIGHT_TEST_BASE_URL;

const baseURL = usePreviewUrl
  ? process.env.PLAYWRIGHT_TEST_BASE_URL!
  : `http://localhost:${port}`;

export default async function globalSetup() {
  console.log("globalSetup");
  await clerkSetup();

  console.log("launching browser");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("signing in");
  await signin(page, baseURL);

  await page.waitForURL(`${baseURL}/`);
  await page
    .context()
    .storageState({ path: "playwright/.auth/storageState.json" });

  console.log("closing browser");
  await browser.close();
}
