import { sendChatWithPDF as sendChatWithPDFAnthropiс } from "./anthropic";
import { sendChatWithPDF as sendChatWithPDFOpenAI } from "./openai";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  // Add other potential properties if needed, e.g., name
}

/**
 * Sends a chat message with PDF to either Anthropic or OpenAI based on AI_PROVIDER environment variable
 */
export async function sendChatWithPDF({
  messages,
  pdfUrl,
  maxTokens = 1500,
  systemPrompt,
}: {
  messages: ChatMessage[];
  pdfUrl?: string;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  const aiProvider = process.env.AI_PROVIDER?.toLowerCase() || "openai";

  try {
    if (aiProvider === "openai") {
      return await sendChatWithPDFOpenAI({
        messages,
        pdfUrl,
        maxTokens,
        systemPrompt,
      });
    } else if (aiProvider === "anthropic") {
      return await sendChatWithPDFAnthropiс({
        messages,
        pdfUrl,
        maxTokens,
        systemPrompt,
      });
    } else {
      throw new Error(
        `Invalid AI provider: ${aiProvider}. Must be 'openai' or 'anthropic'`
      );
    }
  } catch (error) {
    console.error(`Error processing with ${aiProvider}:`, error);
    throw error;
  }
}
