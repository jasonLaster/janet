import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { insertPdf } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("pdf") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob with explicit token from environment variable
    const blob = await put(`pdfs/${userId}/${Date.now()}-${file.name}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Store metadata in the database, including the user ID and orgId
    const pdfRecord = await insertPdf({
      filename: file.name,
      blob_url: blob.url,
      size_bytes: file.size,
      user_id: userId,
      organization_id: orgId,
      original_blob_url: blob.url,
    });

    inngest.send({
      name: "pdf/enrich-document",
      data: {
        pdf: pdfRecord,
      },
    });

    // Return the blob URL and metadata
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      id: pdfRecord.id,
      fileName: file.name,
      fileSize: file.size,
      url: blob.url,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
