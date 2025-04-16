import { NextResponse } from "next/server";
import { getAllPdfs } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    console.log("loggedIn user", userId);

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all PDFs for the specific user
    const pdfs = await getAllPdfs(userId); // Pass userId to the DB function

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
