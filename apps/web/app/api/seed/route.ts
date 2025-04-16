import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Check if we already have PDFs in the database
    const existingPdfs = await sql`SELECT COUNT(*) FROM pdfs`

    if (Number(existingPdfs[0].count) > 0) {
      return NextResponse.json({ message: "Database already has PDFs" })
    }

    // Insert a sample PDF - using Mozilla's PDF.js sample PDF which is more likely to be allowed
    await sql`
      INSERT INTO pdfs (
        filename, 
        blob_url, 
        size_bytes, 
        title, 
        description, 
        page_count
      ) VALUES (
        'mozilla-pdf.pdf', 
        'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', 
        5000, 
        'Mozilla PDF.js Sample', 
        'This is a sample PDF from Mozilla PDF.js for testing the viewer', 
        14
      )
    `

    return NextResponse.json({ message: "Sample PDF added to database" })
  } catch (error) {
    console.error("Error seeding database:", error)
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 })
  }
}
