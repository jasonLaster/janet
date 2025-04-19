import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendChatWithPDF } from "./anthropic";

// Mock ai module
vi.mock("ai", () => ({
  generateText: vi.fn().mockReturnValue({ text: "default mocked response" }),
  anthropic: () => "mocked-anthropic-model",
}));

import { generateText } from "ai";

describe("sendChatWithPDF", () => {
  const originalEnv = process.env;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    process.env = { ...originalEnv, ANTHROPIC_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("should throw error if ANTHROPIC_API_KEY is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      sendChatWithPDF({ messages: [{ role: "user", content: "Hello" }] })
    ).rejects.toThrow("Anthropic API key is not configured");
  });

  it("should call generateText without PDF if no PDF URL is provided", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "This is a response",
    } as any);

    const messages = [{ role: "user", content: "Hello" }];

    const result = await sendChatWithPDF({ messages });

    expect(generateText).toHaveBeenCalledWith({
      model: expect.anything(),
      messages,
      system: expect.any(String),
      maxTokens: expect.any(Number),
    });
    expect(result).toBe("This is a response");
  });

  it("should fetch and attach PDF to the last user message", async () => {
    // Mock successful PDF fetch
    const mockPdfData = new ArrayBuffer(10);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockPdfData),
    } as Response);

    vi.mocked(generateText).mockResolvedValue({
      text: "Analysis of your PDF",
    } as any);

    const messages = [
      { role: "assistant", content: "How can I help?" },
      { role: "user", content: "Analyze this PDF" },
    ];

    const result = await sendChatWithPDF({
      messages,
      pdfUrl: "https://example.com/test.pdf",
    });

    // Verify PDF was fetched
    expect(fetch).toHaveBeenCalledWith("https://example.com/test.pdf");

    // Check if the last message was formatted correctly with PDF attachment
    expect(generateText).toHaveBeenCalledWith({
      model: expect.anything(),
      messages: [
        { role: "assistant", content: "How can I help?" },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this PDF" },
            {
              type: "file",
              data: expect.any(Uint8Array),
              mimeType: "application/pdf",
            },
          ],
        },
      ],
      system: expect.any(String),
      maxTokens: expect.any(Number),
    });

    expect(result).toBe("Analysis of your PDF");
  });

  it("should throw error if PDF fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    } as Response);

    const messages = [{ role: "user", content: "Analyze this PDF" }];

    await expect(
      sendChatWithPDF({
        messages,
        pdfUrl: "https://example.com/nonexistent.pdf",
      })
    ).rejects.toThrow("Failed to fetch PDF: Not Found");
  });
});
