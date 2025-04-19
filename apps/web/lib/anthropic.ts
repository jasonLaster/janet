import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

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
  pdfUrl?: string;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  // Validate Anthropic API key
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured");
  }

  // If there's a PDF URL, fetch it
  let pdfBuffer: ArrayBuffer | undefined;
  if (pdfUrl && !pdfUrl.includes("undefined")) {
    try {
      console.log(":: chatting with PDF from", pdfUrl);
      const pdfResponse = await fetch(pdfUrl);

      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
      }

      pdfBuffer = await pdfResponse.arrayBuffer();
      console.log("PDF fetched successfully");
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw error;
    }
  }

  // Format user messages
  const formattedMessages = messages.map((message: any) => {
    // For the last user message, attach the PDF if available
    if (
      message.role === "user" &&
      message === messages[messages.length - 1] &&
      pdfBuffer
    ) {
      return {
        role: "user",
        content: [
          { type: "text", text: message.content },
          {
            type: "file",
            data: new Uint8Array(pdfBuffer),
            mimeType: "application/pdf",
          },
        ],
      };
    }
    return message;
  });

  // Use generateText to get response
  const result = await generateText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    messages: formattedMessages,
    system: systemPrompt,
    maxTokens,
  });

  return result.text;
}
