import { NextResponse } from "next/server";
import { getPdfById } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Revisit auth - should we check ownership here or rely on getPdfById logic if it includes it?
    // For now, just check if logged in.
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const id = Number.parseInt(params.id, 10);
    if (isNaN(id)) {
      console.error(`Invalid ID format: ${params.id}`);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    console.log(`(API) Fetching metadata for PDF ID: ${id}`);
    const pdf = await getPdfById(id);

    if (!pdf) {
      console.error(`(API) PDF not found for metadata request, ID: ${id}`);
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Check if metadata exists and if processing failed
    const metadata = pdf.metadata || null;
    const failed = pdf.metadata_failed || false; // Default to false if field is nullable

    // Return metadata and failure status
    return NextResponse.json({ metadata, failed });
  } catch (error) {
    console.error(
      `(API) Error fetching metadata for PDF ID ${params.id}:`,
      error
    );
    // Use params.id in error logging as 'id' might be NaN if parsing failed
    return NextResponse.json(
      { error: "Failed to fetch PDF metadata" },
      { status: 500 }
    );
  }
}
