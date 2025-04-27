import { anthropic } from "@ai-sdk/anthropic";
import { generateText, CoreMessage } from "ai";

/**
 * Sends a chat message to Anthropic, optionally with a PDF attachment
 */
export async function sendChatWithPDF({
  messages,
  pdfUrl,
  maxTokens = 1500,
  systemPrompt = "You are a helpful AI assistant specialized in answering questions about PDF documents.",
}: {
  messages: any[];
  pdfUrl: string;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  // Validate Anthropic API key
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured");
  }

  // If there's a PDF URL, fetch it

  console.log(":: chatting with PDF from", pdfUrl);
  const pdfResponse = await fetch(pdfUrl);

  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  console.log("PDF fetched successfully");

  // Format user messages
  const formattedMessages = messages.map((message) => {
    // For the last user message, attach the PDF if available
    if (
      message.role === "user" &&
      message === messages[messages.length - 1] &&
      pdfBuffer
    ) {
      // Ensure message.content is treated as potentially non-string
      const textContent =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      return {
        role: "user",
        content: [
          { type: "text" as const, text: textContent },
          {
            type: "file" as const,
            data: new Uint8Array(pdfBuffer),
            mimeType: "application/pdf",
          },
        ],
      };
    }
    return message;
  }) as CoreMessage[];

  // Use generateText to get response
  const result = await generateText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    messages: formattedMessages,
    system: systemPrompt,
    maxTokens,
  });

  return result.text;
}
