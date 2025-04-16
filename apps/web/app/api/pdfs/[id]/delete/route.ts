import { NextResponse } from "next/server";
import { deletePdf, getPdfById } from "@/lib/db";
import { del } from "@vercel/blob";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Get the PDF to find its blob URL
    const pdf = await getPdfById(id, userId);

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Delete from database
    await deletePdf(id);

    // Delete from Vercel Blob
    try {
      await del(pdf.blob_url, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (blobError) {
      console.error("Error deleting blob:", blobError);
      // Continue even if blob deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF" },
      { status: 500 }
    );
  }
}
