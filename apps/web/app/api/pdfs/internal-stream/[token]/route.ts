import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { getPdfById } from "@/lib/db";

// Configuration for iron-session (MUST match the middleware options)
const ironOptions = {
  password: process.env.IRON_SESSION_PASSWORD!,
  cookieName: "__Secure-pdf-access-token", // Must match the name used for sealing
  ttl: 60, // Must match the TTL used for sealing (or be slightly longer)
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

// Ensure password is set and valid
if (!ironOptions.password || ironOptions.password.length < 32) {
  console.error(
    "FATAL: Missing or invalid IRON_SESSION_PASSWORD environment variable (must be at least 32 characters long) for route /api/documents/internal-stream"
  );
  // Avoid throwing here directly as it might crash the serverless function startup
}

// Define the expected shape of the decrypted payload from middleware
interface PdfAccessPayload {
  pdfId: number;
  userId: string | null; // userId from Clerk (null if logged out)
  orgId: string | null; // active orgId from Clerk (null if no active org)
  download: boolean;
}

// This route runs in the default Node.js runtime
// export const runtime = "edge"; // DO NOT USE EDGE HERE - needs DB access

export async function GET(
  request: NextRequest, // Although not explicitly used, it's part of the signature
  context: { params: { token: string } }
) {
  const token = context.params.token;

  if (!token) {
    return new NextResponse("Missing access token", { status: 400 });
  }

  if (!ironOptions.password || ironOptions.password.length < 32) {
    return new NextResponse("Server configuration error", { status: 500 });
  }

  let payload: PdfAccessPayload;
  try {
    // Decrypt and automatically validate the token & TTL
    payload = await unsealData<PdfAccessPayload>(token, ironOptions);
    console.log(
      `[Internal Stream ${payload.pdfId}] Token Validated: userId=${payload.userId}, orgId=${payload.orgId}, download=${payload.download}`
    );
  } catch (error) {
    console.warn("Token validation failed:", error);
    return new NextResponse("Invalid or expired access link", { status: 403 });
  }

  // Token is valid, now perform DB lookup and final authorization
  try {
    const pdf = await getPdfById(payload.pdfId);
    if (!pdf) {
      return new NextResponse("PDF not found", { status: 404 });
    }

    // Final Authorization Check
    if (pdf.is_public) {
      console.log(
        `[Internal Stream ${payload.pdfId}] Access granted: Document is public.`
      );
    } else {
      // Private doc requires owner match OR matching active orgId
      let isAuthorized = false;
      if (payload.userId) {
        // Must be logged in for private docs
        const isOwner = pdf.user_id === payload.userId;
        const isOrgMatch = !!(
          pdf.organization_id && pdf.organization_id === payload.orgId
        );
        isAuthorized = isOwner || isOrgMatch;

        // Log the detailed check
        console.log(
          `[Internal Stream ${payload.pdfId}] Auth Check: isOwner=${isOwner} (pdf.user_id=${pdf.user_id} vs token.userId=${payload.userId}), isOrgMatch=${isOrgMatch} (pdf.org_id=${pdf.organization_id} vs token.orgId=${payload.orgId})`
        );
      } else {
        console.warn(
          `[Internal Stream ${payload.pdfId}] Access denied: Private doc, but no userId in token.`
        );
      }

      if (!isAuthorized) {
        console.warn(
          `[Internal Stream ${payload.pdfId}] Access denied: User (${payload.userId}) with active org (${payload.orgId}) is not owner or part of matching org.`
        );
        return new NextResponse("Forbidden", { status: 403 });
      }
      console.log(
        `[Internal Stream ${payload.pdfId}] Access granted: User is owner or part of matching org.`
      );
    }

    // Authorization passed, fetch and stream the blob
    const blobUrl = pdf.blob_url;
    const blobResponse = await fetch(blobUrl);

    if (!blobResponse.ok) {
      return new NextResponse("Could not retrieve file", {
        status: blobResponse.status,
      });
    }

    // Prepare headers
    const headers = new Headers();
    headers.set(
      "Content-Type",
      blobResponse.headers.get("Content-Type") || "application/pdf"
    );

    // Add Cache-Control based on document visibility
    const isPublic = pdf.is_public;
    const cacheHeader = isPublic
      ? "public, immutable, max-age=31536000, s-maxage=31536000"
      : "private, immutable, max-age=31536000"; // browser-only cache
    headers.set("Cache-Control", cacheHeader);

    // Add Accept-Ranges to support byte range requests from react-pdf
    headers.set("Accept-Ranges", "bytes");

    // Add Content-Length if available from the blob storage response
    const contentLength = blobResponse.headers.get("Content-Length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    // TODO: Consider adding ETag if checksum is available
    // const checksum = pdf.checksum; // Assuming checksum is available on the pdf object
    // if (checksum) {
    //   headers.set("ETag", checksum);
    // }

    const dispositionType = payload.download ? "attachment" : "inline";
    const filename =
      pdf.filename || blobUrl.substring(blobUrl.lastIndexOf("/") + 1);
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    headers.set(
      "Content-Disposition",
      `${dispositionType}; filename="${safeFilename}"`
    );

    // You might want to control caching of the stream itself
    // headers.set('Cache-Control', 'private, no-store');

    console.log(
      `[Internal Stream ${
        payload.pdfId
      }] Streaming response (Content-Type: ${headers.get(
        "Content-Type"
      )}, Disposition: ${headers.get("Content-Disposition")})`
    );

    // Stream the blob body back
    return new NextResponse(blobResponse.body, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error(
      `[Internal Stream ${payload?.pdfId}] Error processing stream request:`,
      error
    );
    return new NextResponse("Internal server error", { status: 500 });
  }
}
