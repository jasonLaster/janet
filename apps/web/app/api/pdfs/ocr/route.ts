import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// API endpoint for processing a PDF by ID
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get JSON data with the PDF ID
    const body = await request.json();
    const { pdfId } = body;

    if (!pdfId) {
      return NextResponse.json(
        { error: "No PDF ID provided" },
        { status: 400 }
      );
    }

    // Get the OCR service URL from environment variables
    const ocrServiceUrl = process.env.OCR_SERVICE_URL;
    if (!ocrServiceUrl) {
      return NextResponse.json(
        { error: "OCR service URL not configured" },
        { status: 500 }
      );
    }

    // Make a POST request to the OCR service
    const ocrResponse = await fetch(`${ocrServiceUrl}/api/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pdfId }),
    });

    // Parse the OCR service response
    const result = await ocrResponse.json();

    if (!ocrResponse.ok) {
      return NextResponse.json(
        {
          error: result.error || "OCR service request failed",
          message: result.message,
          processingTimeMs: result.processingTimeMs,
        },
        { status: ocrResponse.status }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: result.message,
      searchableUrl: result.searchableUrl,
      processingTimeMs: result.processingTimeMs,
      pageCount: result.pageCount,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in OCR API route: ${errorMessage}`);

    return NextResponse.json(
      {
        error: "Failed to create searchable PDF",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
