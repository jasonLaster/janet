import { auth } from "@clerk/nextjs/server";
import { CoreMessage, streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Increase duration for PDF processing

// Define the file attachment type
// interface FileAttachment { // Unused Interface
//   type: "file";
//   source: {
//     type: "base64";
//     media_type: string;
//     data: string;
//   };
// }

// interface UserMessage { // Unused Interface
//   role: string;
//   content: string;
//   id?: string;
// }

// Define message types for Anthropic
// interface AnthropicMessage { // Unused Interface
//   role: string;
//   content: string | Array<{ type: string; [key: string]: unknown }>;
// }

interface ChatRequest {
  messages: CoreMessage[];
  data: {
    fileId: string;
    query: string;
  };
}

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    // Explicitly type the parsed JSON to avoid implicit any
    const {
      messages,
      data,
    }: { messages: CoreMessage[]; data: { fileId: string; query: string } } =
      json;
    const { fileId, query } = data;

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // Fetch file content from R2
    const fileContent = await fetchFileContent(fileId);

    // Construct the prompt for Anthropic
    const anthropicMessages: CoreMessage[] = [
      {
        role: "system",
        content:
          "You are an AI assistant specialized in analyzing PDF documents. Answer the user's questions based on the provided PDF content. If the answer is not found in the document, state that clearly.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Here is the content of the PDF document (id: ${fileId}):\n\n${fileContent}\n\nNow, please answer the following question based on this document:\n\n${query}`,
          },
        ],
      },
    ];

    const result = await streamText({
      model: anthropic("claude-3-haiku-20240307"),
      messages: anthropicMessages, // Removed 'as any'
    });

    // Assuming the result structure allows for this response type
    return result.toDataStreamResponse();
  } catch (error: unknown) {
    // Use unknown instead of any for error handling
    console.error("Error processing chat request:", error);
    // Provide a generic error message, potentially logging the specific error internally
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchFileContent(fileId: string): Promise<string> {
  const url = `https://r2.files.janet.systems/${fileId}.txt`;
  console.log(`Fetching file content from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    console.log(`Successfully fetched file content for: ${fileId}`);
    return text;
  } catch (error) {
    console.error(`Error fetching file content for ${fileId}:`, error);
    throw new Error(`Failed to fetch content for file ${fileId}.`);
  }
}

// Ensure the environment variable is set
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
}

// No need to instantiate Anthropic client here if using @ai-sdk/anthropic
// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });
