import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { insertPdf } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    console.log("Inside POST route");

    const headersList = await headers();
    const contentType = headersList.get("content-type");
    const contentDisposition = headersList.get("content-disposition");
    const userId = headersList.get("x-user-id") || undefined;
    const orgId = headersList.get("x-org-id") || undefined;

    // Extract filename from Content-Disposition header
    const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1];

    if (!contentType || contentType !== "application/pdf") {
      return NextResponse.json(
        { error: "Content must be a PDF" },
        { status: 400 }
      );
    }

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required in Content-Disposition header" },
        { status: 400 }
      );
    }

    if (!userId && !orgId) {
      return NextResponse.json(
        { error: "Either x-user-id or x-org-id headers are required" },
        { status: 400 }
      );
    }

    const bucket = orgId ? `orgs/${orgId}` : `users/${userId}`;
    const path = `${bucket}/${Date.now()}-${filename}`;
    console.log("bucket:", bucket);
    console.log("path:", path);

    // Get the raw PDF bytes from the request
    const pdfBytes = await request.arrayBuffer();
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

    // Upload to Vercel Blob
    const blob = await put(path, pdfBlob, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Store metadata in the database
    const pdfRecord = await insertPdf({
      filename,
      blob_url: blob.url,
      size_bytes: pdfBytes.byteLength,
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

    const response = {
      success: true,
      message: "File uploaded successfully",
      id: pdfRecord.id,
      fileName: filename,
      fileSize: pdfBytes.byteLength,
      url: blob.url,
      uploadedAt: new Date().toISOString(),
    };

    console.log("response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "Error uploading file:",
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error
    );

    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
