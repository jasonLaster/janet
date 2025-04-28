import { test, expect, Page } from "@playwright/test";
import { navigateToPdf } from "./utils";

// Mock the tRPC chat procedure
// type Procedure = {
//   route: string;
//   status: number;
//   response: any;
// };
// const mockTRPC: Procedure[] = [
//   {
//     route: "**/trpc/pdf.chat*",
//     status: 200,
//     response: {
//       text: "In Q1 2025 the S&P 500 fell 4.3%, led by the “Magnificent 7” amid concerns over lower-cost Chinese AI competition and uncertainty around U.S. trade and budget-cut policies, prompting a market rotation from high-growth to more attractively priced value stocks. Our All Cap Intrinsic Value portfolio outperformed by adding to names like IGT, Lions Gate, MGM and Avadel, trimming richly valued or disappointing companies, and maintaining a focus on fundamentally strong, undervalued businesses with a margin of safety.",
//     },
//   },
// ];

// async function mockChat(page: Page, mockTRPC: Procedure[]) {
//   for (const mock of mockTRPC) {
//     await page.route(mock.route, async (route, request) => {
//       // Only intercept POST requests
//       if (request.method() === "POST") {
//         await route.fulfill({
//           status: mock.status,
//           contentType: "application/json",
//           body: JSON.stringify(mock.response.result),
//         });
//       } else {
//         await route.continue();
//       }
//     });
//   }
// }

test("Chatting with a PDF", async ({ page }) => {
  // Mock the /trpc/pdf.chat endpoint
  // await mockChat(page, mockTRPC);

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
