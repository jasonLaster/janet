import { NextResponse } from "next/server";
import { getPdfById } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id, 10);

    if (isNaN(id)) {
      console.error(`Invalid ID format: ${params.id}`);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    console.log(`Fetching PDF with ID: ${id} `);
    const pdf = await getPdfById(id);

    if (!pdf) {
      console.error(`PDF not found with ID: ${id} `);
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: pdf.id,
      name: pdf.filename,
      size: pdf.size_bytes,
      uploadedAt: pdf.uploaded_at,
      url: pdf.blob_url,
      title: pdf.title || pdf.filename,
      description: pdf.description || "",
      pageCount: pdf.page_count || 0,
    });
  } catch (error) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}
