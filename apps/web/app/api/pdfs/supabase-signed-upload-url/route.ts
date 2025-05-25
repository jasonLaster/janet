import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/clerk-sdk-node";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function getAuthHeaders(request: Request) {
  const org = request.headers.get("org") || request.headers.get("x-org-id");
  const user = request.headers.get("x-user-id") || request.headers.get("user");
  return { org, user };
}

async function authenticateClerkOrgUser({
  org,
  user,
}: {
  org?: string | null;
  user?: string | null;
}) {
  let orgResult = undefined;
  let userResult = undefined;

  if (!org && !user) {
    throw new Error("Unauthorized: org or user header required");
  }

  if (org) {
    try {
      orgResult = await clerkClient.organizations.getOrganization({
        organizationId: org,
      });
      if (!orgResult) {
        throw new Error("Unauthorized: org not found in Clerk");
      }
    } catch (err) {
      throw new Error("Unauthorized: Clerk org lookup failed");
    }
  }

  if (user) {
    try {
      userResult = await clerkClient.users.getUser(user);
      if (!userResult) {
        throw new Error("Unauthorized: user not found in Clerk");
      }
    } catch (err) {
      if ((err as any).errors?.[0]?.code === "resource_not_found") {
        throw new Error("Unauthorized: user not found in Clerk");
      }
      throw new Error("Unauthorized: Clerk user lookup failed");
    }
  }

  return { orgResult, userResult };
}

export async function POST(request: Request): Promise<NextResponse> {
  const { org, user } = getAuthHeaders(request);
  try {
    await authenticateClerkOrgUser({ org, user });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 401 }
    );
  }

  let body: { filePath?: string; expiresIn?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filePath } = body;
  if (!filePath || typeof filePath !== "string") {
    return NextResponse.json(
      { error: "filePath is required" },
      { status: 400 }
    );
  }
  if (!filePath.endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF uploads are allowed" },
      { status: 400 }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      {
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env var",
        SUPABASE_URL,
        SUPABASE_SERVICE_KEY_present: !!SUPABASE_SERVICE_KEY,
      },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { data, error } = await supabase.storage
      .from("pdf-uploads")
      .createSignedUploadUrl(filePath);
    if (error) {
      throw error;
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate signed upload URL" },
      { status: 500 }
    );
  }
}
