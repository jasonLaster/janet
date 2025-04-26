import { enhancePdfMetadata } from "@/lib/server/pdf";

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
      // Call the new function to enhance metadata
      const enhancedResult = await enhancePdfMetadata(pdfUrl, pdfId);

      if (!enhancedResult) {
        throw new Error("Metadata enhancement returned null");
      }

      const { metadata } = enhancedResult;

      // Return the extracted metadata
      return new Response(JSON.stringify({ metadata }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      // Handle errors from enhancePdfMetadata (AI processing or parsing)
      console.error("Error during metadata enhancement:", error);

      // Check if the error message contains the raw response (parsing failure case)
      const message = error instanceof Error ? error.message : String(error);
      const match = message.match(/Raw response: (.*)/);
      const rawResponse = match ? match[1] : undefined;

      if (rawResponse) {
        return new Response(
          JSON.stringify({
            error: "Failed to parse AI response",
            rawResponse: rawResponse,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      } else {
        // Handle other errors (e.g., AI processing failure)
        return new Response(
          JSON.stringify({
            error: "Metadata enhancement failed",
            details: message,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  } catch (error: unknown) {
    // Handle errors from request parsing or other unexpected issues
    console.error("Error in metadata route handler:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to extract PDF metadata",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
