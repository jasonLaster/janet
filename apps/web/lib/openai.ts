import OpenAI from "openai";
import { CoreMessage } from "ai";

/**
 * Sends a chat message to OpenAI, optionally with a PDF attachment
 */
export async function sendChatWithPDF({
  messages,
  pdfUrl,
  maxTokens = 1500,
  systemPrompt = "You are a helpful AI assistant specialized in answering questions about PDF documents.",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: CoreMessage[];
  pdfUrl: string;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  // Validate OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // If there's a PDF URL, fetch it

  console.log(":: chatting with PDF from", pdfUrl);
  const pdfResponse = await fetch(pdfUrl);

  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
  console.log("PDF fetched successfully");

  // Extract the text content from the last user message
  const lastUserMessage = messages[messages.length - 1];
  const userContent = lastUserMessage.content;

  // Prepare the input content array
  const inputContent = [];

  // Add PDF file if available
  if (pdfBase64) {
    inputContent.push({
      type: "input_file" as const,
      filename: "document.pdf",
      file_data: `data:application/pdf;base64,${pdfBase64}`,
    });
  }

  // Add the text content
  inputContent.push({
    type: "input_text" as const,
    text: userContent as string,
  });

  // Create the response using OpenAI
  const response = await client.responses.create({
    model: "o4-mini-2025-04-16",
    reasoning: {
      effort: "low",
    },
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: inputContent,
      },
    ],
    max_output_tokens: maxTokens,
  });

  return response.output_text;
}
