import { NextResponse } from "next/server";
import { deletePdf, getPdfById } from "@/lib/db";
import { del } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    const id = Number.parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Get the PDF to find its blob URL
    const pdf = await getPdfById(id);

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Ensure blob_url exists before proceeding
    if (!pdf.blob_url) {
      console.error(
        "PDF record found but blob_url is missing, proceeding with DB deletion only.",
        { pdfId: id }
      );
      // Decide if you want to return an error or just skip blob deletion
      // Skipping blob deletion for now, but deleting the DB record
    } else {
      // Delete from Vercel Blob only if blob_url exists
      try {
        await del(pdf.blob_url, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        await del(pdf.original_blob_url, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (blobError) {
        console.error("Error deleting blob:", blobError);
        // Continue even if blob deletion fails
      }
    }

    // Delete from database (moved after blob deletion attempt)
    await deletePdf(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF" },
      { status: 500 }
    );
  }
}
