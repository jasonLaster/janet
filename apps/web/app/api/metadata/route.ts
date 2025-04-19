import { pdfMetadataPrompt } from "@/lib/prompts/pdf-metadata";
import { updatePdfEnhancedMetadata } from "@/lib/db";
import { sendChatWithPDF } from "@/lib/ai";

export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pdfUrl, pdfId } = body;

    console.log(":: pdf-metadata route", { pdfUrl, pdfId });

    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: "PDF URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const responseText = await sendChatWithPDF({
        messages: [
          {
            role: "user",
            content: pdfMetadataPrompt,
          },
        ],
        pdfUrl,
        maxTokens: 2000,
        systemPrompt:
          "You are an AI assistant that analyzes PDF documents and extracts structured metadata. Your task is to thoroughly analyze the provided document and identify key information. Be comprehensive and accurate in your analysis. ALWAYS respond with properly formatted JSON when asked to.",
      });

      try {
        // Try to parse the response as JSON
        const trimmedResponse = responseText.trim();

        // First, try to directly parse the entire response
        try {
          const metadata = JSON.parse(trimmedResponse);

          // If pdfId is provided, store the metadata in the database
          if (pdfId) {
            await updatePdfEnhancedMetadata(pdfId, metadata);
          }

          return new Response(JSON.stringify({ metadata }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (directParseError) {
          // If direct parsing fails, try to extract JSON from the response
          const jsonMatch = trimmedResponse.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const jsonText = jsonMatch[0];
            const metadata = JSON.parse(jsonText);

            // If pdfId is provided, store the metadata in the database
            if (pdfId) {
              console.log("Storing metadata in database for PDF ID:", pdfId);
              await updatePdfEnhancedMetadata(pdfId, metadata);
            }

            return new Response(JSON.stringify({ metadata }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } else {
            throw new Error("Could not extract JSON from response");
          }
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.log("Raw response:", responseText);

        // Return the raw text if JSON parsing fails
        return new Response(
          JSON.stringify({
            error: "Failed to parse AI response",
            rawResponse: responseText,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (aiError) {
      console.error("AI processing error:", aiError);

      return new Response(
        JSON.stringify({
          error: "AI processing failed",
          details: aiError instanceof Error ? aiError.message : String(aiError),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error extracting PDF metadata:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to extract PDF metadata",
        details: error?.message || String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
