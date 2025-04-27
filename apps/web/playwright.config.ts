import { defineConfig, devices } from "@playwright/test";

const usePreviewUrl = !!process.env.PLAYWRIGHT_TEST_BASE_URL;

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const baseURL = usePreviewUrl
  ? process.env.PLAYWRIGHT_TEST_BASE_URL
  : `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1,
  reporter: process.env.CI ? "html" : "dot",

  globalSetup: "./tests/global.setup.ts",

  use: {
    baseURL,
    trace: "on",
    storageState: "playwright/.auth/storageState.json",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
