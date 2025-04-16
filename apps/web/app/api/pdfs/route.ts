import { NextResponse } from "next/server"
import { getAllPdfs } from "@/lib/db"

export async function GET() {
  try {
    // Get all PDFs from the database
    const pdfs = await getAllPdfs()

    // Transform database records to match our PDF interface
    const formattedPdfs = pdfs.map((pdf) => ({
      id: pdf.id,
      name: pdf.filename,
      size: pdf.size_bytes,
      uploadedAt: pdf.uploaded_at,
      url: pdf.blob_url,
      title: pdf.title || pdf.filename,
      description: pdf.description || "",
      pageCount: pdf.page_count || 0,
    }))

    return NextResponse.json({ pdfs: formattedPdfs })
  } catch (error) {
    console.error("Error fetching PDFs:", error)
    return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
  }
}
