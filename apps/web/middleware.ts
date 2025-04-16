import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)", // Matches /sign-in and /sign-in/*
  "/sign-up(.*)", // Matches /sign-up and /sign-up/*
  // "/", // Typically the landing page
  "/api/webhooks/(.*)", // Example for webhook endpoints
  // Add any other public routes here
]);

// Make the middleware function async to allow await
export default clerkMiddleware(async (auth, req) => {
  // Await the auth() call as the linter suggests
  const { userId } = await auth();

  // Add logging to see what's happening
  console.log("Middleware running for:", req.url);
  console.log("Is Public Route:", isPublicRoute(req));
  console.log("User ID:", userId);

  // If the route is not public and the user is not signed in, redirect to sign-in
  if (!isPublicRoute(req) && !userId) {
    console.log("Redirecting to sign-in...");
    const signInUrl = new URL("/sign-in", req.url);
    // You can add a redirect back URL if needed:
    // signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // If the route is public or the user is signed in, allow the request to proceed
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
