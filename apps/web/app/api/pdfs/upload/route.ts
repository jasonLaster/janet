import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Get file details
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Vercel Blob Storage
    const blob = await put(join("pdfs", file.name), buffer, {
      contentType: "application/pdf",
      access: "public",
    });

    // In a real app, you would save metadata to database as well
    // Including the blob URL for later retrieval

    return NextResponse.json({
      id: Math.floor(Math.random() * 1000), // Replace with actual DB ID
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url: blob.url,
      title: file.name.replace(".pdf", ""),
      pageCount: 0, // This would be determined after processing
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }
}
