import {
  clerkMiddleware,
  createRouteMatcher,
  // ClerkMiddlewareAuth, // No longer explicitly needed for type hint
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sealData } from "iron-session";

// Define routes that should be publicly accessible (non-API)
const isPublicPageRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)", // Allow webhooks without auth
  "/api/inngest(.*)", // Allow Inngest API route
  "/x/inngest(.*)", // Allow /x/inngest route (often used by Inngest Dev Server)
  "/.netlify/functions/inngest(.*)", // Allow Netlify function route
  "/.redwood/functions/inngest(.*)", // Allow Redwood function route
  "/landing",
  "/about",
  "/pricing",
]);

// Define the PDF Content API route pattern separately
const isPdfContentApiRoute = createRouteMatcher(["/api/pdfs/(.*)/content"]);

const isFileUploadApiRoute = createRouteMatcher(["/api/pdfs/file-upload"]);

export default clerkMiddleware(
  async (auth, req) => {
    // Get user ID and active Org ID early
    const { userId, orgId } = await auth();
    const url = req.nextUrl;

    // --- Handle PDF Content API Route ---
    if (isPdfContentApiRoute(req)) {
      // Extract PDF ID from pathname (e.g., /api/pdfs/123/content  -> 123)
      const pdfIdMatch = url.pathname.match(/\/api\/pdfs\/([^\/]+)\/content/);
      const pdfId = pdfIdMatch ? pdfIdMatch[1] : null;

      if (!pdfId || isNaN(Number(pdfId))) {
        console.warn("[Middleware] Invalid PDF ID format:", pdfId);
        return new NextResponse("Invalid PDF ID", { status: 400 });
      }

      // Prepare payload for the token
      const payload = {
        pdfId: Number(pdfId),
        userId: userId, // Pass userId (can be null if logged out)
        orgId: orgId, // Pass active orgId (can be null)
        download: url.searchParams.get("download") === "1", // Pass download preference
      };

      try {
        if (
          !process.env.IRON_SESSION_PASSWORD ||
          process.env.IRON_SESSION_PASSWORD.length < 32
        ) {
          console.error(
            "FATAL: Missing IRON_SESSION_PASSWORD environment variable"
          );
          return new NextResponse("Server configuration error", {
            status: 500,
          });
        } else {
          console.log("[Middleware] IRON_SESSION_PASSWORD is set");
        }

        // Iron Session Configuration (must match the one in the target route)
        const ironOptions = {
          password: process.env.IRON_SESSION_PASSWORD!,
          cookieName: "__Secure-pdf-access-token", // Arbitrary but consistent name
          ttl: 60, // Short TTL for the access token
          cookieOptions: {
            secure: process.env.NODE_ENV === "production",
          },
        };

        // Seal the data into a short-lived token
        const sealedToken = await sealData(payload, ironOptions);

        // Rewrite to the internal streaming handler
        const rewriteUrl = new URL(
          `/api/pdfs/internal-stream/${sealedToken}`,
          url.origin
        );
        return NextResponse.rewrite(rewriteUrl);
      } catch (error) {
        console.error(
          `[Middleware] Error sealing token: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return new NextResponse("Could not generate secure link", {
          status: 500,
        });
      }
    }

    // --- Handle Public Page Routes ---
    if (isPublicPageRoute(req)) {
      // Allow access to public pages without authentication
      // If user is logged in and trying to access landing, redirect to root
      if (userId && url.pathname === "/landing") {
        return NextResponse.redirect(new URL("/", url.origin));
      }
      return NextResponse.next();
    }

    // --- Handle Root Route ---
    if (url.pathname === "/") {
      if (!userId) {
        // If user is not logged in and trying to access the root, redirect to landing
        return NextResponse.redirect(new URL("/landing", url.origin));
      }
      // If user is logged in, allow access to the PDF list at root
      return NextResponse.next();
    }

    /* ---------------- PDF file-upload (no auth) ------------ */
    if (isFileUploadApiRoute(req)) {
      return NextResponse.next();
    }

    // --- Handle All Other Protected Routes ---
    if (!userId) {
      // Redirect unauthenticated users trying to access other protected pages to sign-in
      const signInUrl = new URL("/sign-in", url.origin);
      signInUrl.searchParams.set("redirect_url", url.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // If authenticated and not handled above, allow access
    return NextResponse.next();
  },
  {
    // Ensure ironOptions password check doesn't crash build if env var is missing initially
    // The runtime check within the handler provides the actual error response.
  }
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // Match all routes, including API routes (except those excluded above)
    // This ensures the middleware runs for /api/documents/*
    "/",
    "/(api|trpc)(.*)",
  ],
};
