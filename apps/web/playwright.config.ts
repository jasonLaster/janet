import { defineConfig, devices } from "@playwright/test";

const usePreviewUrl = !!process.env.PLAYWRIGHT_TEST_BASE_URL;

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const baseURL = usePreviewUrl
  ? process.env.PLAYWRIGHT_TEST_BASE_URL
  : `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "dot",

  use: {
    // headless: false,
    baseURL,
    trace: "on",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
