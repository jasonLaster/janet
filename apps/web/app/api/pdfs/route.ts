import { NextResponse } from "next/server";
import { getAllPdfs } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId, orgId } = await auth(); // orgId can be null here
    console.log("Logged in user:", userId, "Org ID:", orgId);

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // If orgId is null, it implies the personal workspace
    // Pass userId and the potentially null orgId to the DB function
    const pdfs = await getAllPdfs(userId, orgId);

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
      metadata: pdf.metadata || null,
    }));

    return NextResponse.json({ pdfs: formattedPdfs });
  } catch (error) {
    console.error("Error fetching PDFs:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDFs" },
      { status: 500 }
    );
  }
}
