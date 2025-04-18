import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { pdfMetadataPrompt } from "@/lib/prompts/pdf-metadata";
import { head } from "@vercel/blob";
import { updatePdfEnhancedMetadata } from "@/lib/db";

export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pdfUrl, pdfId } = body;

    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: "PDF URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Analyzing PDF metadata:", pdfUrl, "PDF ID:", pdfId);

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
        console.log(":: fetching metadata for", pdfUrl);
        const pdfResponse = await fetch(pdfUrl);

        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
        }

        pdfBuffer = await pdfResponse.arrayBuffer();
        console.log("PDF fetched successfully");
      } catch (error) {
        console.error("Error processing PDF:", error);
        throw error;
        // Continue without PDF if there's an error
      }
    }
    // Create a structured prompt that guides Claude to produce a consistent JSON format
    const structuredPrompt = `${pdfMetadataPrompt}

Please analyze the document and return your analysis in the following JSON format, ensuring all fields are properly formatted:

{
  "documentType": "string - the type of document (statement, bill, notification, etc.)",
  "issuingOrganization": "string - the company or organization that issued the document",
  "primaryDate": "string - the most important date mentioned in the document",
  "accountHolder": "string - the main person or entity the document is addressed to",
  "accountDetails": "string - key financial or account details (account numbers, reference IDs, etc.)",
  "deadlines": "string - any important deadlines or action items mentioned",
  "monetaryAmounts": ["array of strings - all monetary amounts mentioned in the document"],
  "summary": "string - a 2-3 sentence summary capturing the main purpose of the document",
  "descriptiveTitle": "string - a concise descriptive title for the document",
  "otherPeople": ["array of strings - other individuals mentioned besides the primary addressee"],
  "labels": ["array of strings - 3-5 category labels to help organize this document"]
}

IMPORTANT: Provide ONLY the JSON object in your response with no additional text or explanations.`;

    // Use generateText with Anthropic
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-20240620"),
        messages: [
          {
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: structuredPrompt,
              },
              ...(pdfBuffer
                ? [
                    {
                      type: "file" as const,
                      data: new Uint8Array(pdfBuffer),
                      mimeType: "application/pdf",
                    },
                  ]
                : []),
            ],
          },
        ],
        system:
          "You are an AI assistant that analyzes PDF documents and extracts structured metadata. Your task is to thoroughly analyze the provided document and identify key information. Be comprehensive and accurate in your analysis. ALWAYS respond with properly formatted JSON when asked to.",
        maxTokens: 2000,
      });

      console.log("AI response received");

      try {
        // Try to parse the response as JSON
        const responseText = result.text.trim();

        // First, try to directly parse the entire response
        try {
          const metadata = JSON.parse(responseText);

          // If pdfId is provided, store the metadata in the database
          if (pdfId) {
            console.log("Storing metadata in database for PDF ID:", pdfId);
            await updatePdfEnhancedMetadata(pdfId, metadata);
          }

          return new Response(JSON.stringify({ metadata }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (directParseError) {
          // If direct parsing fails, try to extract JSON from the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);

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
        console.log("Raw response:", result.text);

        // Return the raw text if JSON parsing fails
        return new Response(
          JSON.stringify({
            error: "Failed to parse AI response",
            rawResponse: result.text,
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
