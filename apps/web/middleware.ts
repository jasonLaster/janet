import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)", // Matches /sign-in and /sign-in/*
  "/sign-up(.*)", // Matches /sign-up and /sign-up/*
  "/api/webhooks/(.*)", // Example for webhook endpoints
  // Add any other public routes here
]);

export default clerkMiddleware(async (auth, req) => {
  // Middleware running for every matched route.
  console.log("Middleware running for:", req.url);

  // If the route is public, allow access without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For protected routes, check if user is authenticated
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
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
