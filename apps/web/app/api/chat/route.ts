import { sendChatWithPDF } from "@/lib/ai";

export const maxDuration = 60; // Increase duration for PDF processing

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, pdfUrl } = body;

    const text = await sendChatWithPDF({
      messages,
      pdfUrl,
      systemPrompt:
        "You are an AI assistant that analyzes PDF documents and answer's the user's question. Keep your answers concise and to the point. Ideally no more than a sentence or two.",
    });

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
