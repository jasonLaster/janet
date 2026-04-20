import { auth } from "@clerk/nextjs/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export async function createContext(opts?: FetchCreateContextFnOptions) {
  // Create your context based on the request object
  // Will be available as `ctx` in all your procedures
  const { userId, orgId } = await auth();
  return { userId, orgId };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
