import { auth } from "@clerk/nextjs/server";
import { MeiliSearch } from "meilisearch";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    const { userId, orgId } = await auth();

    if (!query) {
      return NextResponse.json(
        { error: "No search query provided" },
        { status: 400 }
      );
    }

    const client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || "",
      apiKey: process.env.MEILISEARCH_API_KEY || "",
    });

    const filters = [];

    if (userId) {
      filters.push(`userId = ${userId}`);
    }

    if (orgId) {
      filters.push(`organizationId = ${orgId}`);
    }

    const index = client.index("pdfs");
    const { hits } = await index.search(query, {
      limit: 10,
      filter: [],
      attributesToRetrieve: ["id", "title"],
    });

    return NextResponse.json({ results: hits });
  } catch (error) {
    console.error("Error searching PDFs:", error);
    return NextResponse.json(
      { error: "Failed to search PDFs" },
      { status: 500 }
    );
  }
}
