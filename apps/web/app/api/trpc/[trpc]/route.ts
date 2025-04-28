import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "@/lib/trpc/routers/_app";
import { createContext } from "@/lib/trpc/context";

/**
 * Configure basic CORS headers
 * You should update the `origin` and `allowedHeaders` in production code
 */
const setCorsHeaders = (res: Response) => {
  // Set to your actual frontend origin in production
  res.headers.set(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGIN || "http://localhost:3000"
  );
  res.headers.set(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, DELETE"
  );
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.headers.set("Access-Control-Allow-Credentials", "true");
};

// Optionally, handle preflight OPTIONS requests
export async function OPTIONS() {
  const response = new Response(null, { status: 204 });
  setCorsHeaders(response);
  return response;
}

const handler = async (req: NextRequest) => {
  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });

  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };
