import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)", // Matches /sign-in and /sign-in/*
  "/sign-up(.*)", // Matches /sign-up and /sign-up/*
  "/api/webhooks/(.*)", // Example for webhook endpoints
  // Add any other public routes here
]);

// Make the middleware function async to allow await
export default clerkMiddleware((auth, req) => {
  // Middleware runs for every matched route.
  console.log("Middleware running for:", req.url);

  // If the route is not public, clerkMiddleware will automatically protect it.
  // No need for explicit checks or redirections here unless you have complex logic.
  if (isPublicRoute(req)) {
    // Allow public routes to proceed without authentication checks.
    return NextResponse.next();
  }

  // For all other routes (non-public), clerkMiddleware handles authentication.
  // If the user is not authenticated, it will redirect to the sign-in page.
  // If the user is authenticated, it allows the request to proceed.
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // Match all routes, including API routes (except those excluded above)
    "/",
    "/(api|trpc)(.*)",
  ],
};
