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

  retries: 2,

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

  // webServer: {
  //   command: `pnpm dev --port ${port}`,
  //   url: `http://localhost:${port}`,
  //   timeout: 10_000,
  //   reuseExistingServer: !usePreviewUrl,
  //   stdout: "pipe", // this is important
  //   stderr: "pipe",

  //   env: {
  //     // NODE_ENV: "production",
  //     FAST_REFRESH: "false",
  //     CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY_PROD!,
  //     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
  //       process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_PROD!,
  //   },
  // },
});
