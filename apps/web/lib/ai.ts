import { sendChatWithPDF as sendChatWithPDFAnthropiс } from "./anthropic";
import { sendChatWithPDF as sendChatWithPDFOpenAI } from "./openai";
import { getPdfById } from "@/lib/db";

const aiProvider = process.env.AI_PROVIDER?.toLowerCase() || "openai";

/**
 * Sends a chat message with PDF to either Anthropic or OpenAI based on AI_PROVIDER environment variable
 */
export async function sendChatWithPDF({
  messages,
  pdfId,
  maxTokens = 1500,
  systemPrompt,
}: {
  messages: any[];
  pdfId: number;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  const pdf = await getPdfById(pdfId);
  if (!pdf) {
    throw new Error("PDF not found");
  }

  const pdfUrl = pdf.blob_url;

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
