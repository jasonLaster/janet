import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ocrPdf } from "@/lib/server/pdf";

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
    const { data } = await ocrPdf(pdfId);

    return NextResponse.json(
      {
        success: true,
        message: "OCR service request successful",
        data: data,
      },
      { status: 200 }
    );
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
