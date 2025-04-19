import { sendChatWithPDF } from "../../../lib/anthropic";

export const maxDuration = 60; // Increase duration for PDF processing

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, pdfUrl } = body;

    const text = await sendChatWithPDF({ messages, pdfUrl });

    return new Response(JSON.stringify({ text }), {
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
