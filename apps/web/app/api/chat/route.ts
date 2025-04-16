import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const maxDuration = 60; // Increase duration for PDF processing

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, pdfUrl } = body;

    console.log("Chatting with PDF", pdfUrl);

    // Validate Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // If there's a PDF URL, fetch it
    let pdfBuffer: ArrayBuffer | undefined;
    if (pdfUrl && !pdfUrl.includes("undefined")) {
      try {
        console.log("Fetching PDF from:", pdfUrl);
        const pdfResponse = await fetch(pdfUrl);

        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
        }

        pdfBuffer = await pdfResponse.arrayBuffer();
        console.log("PDF fetched successfully");
      } catch (error) {
        console.error("Error processing PDF:", error);
        // Continue without PDF if there's an error
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

    // Use generateText instead of streamText
    const result = await generateText({
      model: anthropic("claude-3-5-sonnet-20240620"),
      messages: formattedMessages,
      system:
        "You are a helpful AI assistant specialized in answering questions about PDF documents.",
      maxTokens: 1500,
    });

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing chat with PDFs:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process your request",
        details: error?.message || String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
