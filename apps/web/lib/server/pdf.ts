import { pdfMetadataPrompt } from "@/lib/prompts/pdf-metadata";
import { getPdfById, updatePdfEnhancedMetadata } from "@/lib/db";
import { sendChatWithPDF } from "@/lib/ai";
import pdfParse from "pdf-parse";

function parseOrExtractJson(responseText: string): any {
  const trimmedResponse = responseText.trim();
  try {
    // First, try to directly parse the entire response
    return JSON.parse(trimmedResponse);
  } catch (directParseError) {
    // If direct parsing fails, try to extract JSON from the response
    const jsonMatch = trimmedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[0];
      try {
        return JSON.parse(jsonText);
      } catch (extractParseError) {
        // If extracted text also fails to parse, throw error with raw response
        return null;
      }
    } else {
      return null;
    }
  }
}

export async function enhancePdfMetadata(
  pdfUrl: string,
  pdfId: number
): Promise<{ metadata: any } | null> {
  let responseText = "";
  try {
    responseText = await sendChatWithPDF({
      messages: [
        {
          role: "user",
          content: pdfMetadataPrompt,
        },
      ],
      pdfUrl,
      maxTokens: 2000,
      systemPrompt:
        "You are an AI assistant that analyzes PDF documents and extracts structured metadata. Your task is to thoroughly analyze the provided document and identify key information. Be comprehensive and accurate in your analysis. ALWAYS respond with properly formatted JSON when asked to.",
    });

    // Attempt to parse the response using the helper function
    const metadata = parseOrExtractJson(responseText);

    if (!metadata || metadata.descriptiveTitle === "") {
      throw new Error("Failed to parse metadata");
    }

    // If pdfId is provided and metadata was parsed successfully, store it
    await updatePdfEnhancedMetadata(pdfId, metadata);

    return { metadata };
  } catch (error: any) {
    console.error("Error in enhancePdfMetadata:", error);
    return null;
  }
}

export async function ocrPdf(pdfId: number): Promise<{ data: any }> {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    throw new Error("OCR service URL not configured");
  }

  // Make a POST request to the OCR service
  const ocrResponse = await fetch(`${ocrServiceUrl}/api/ocr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pdfId }),
  });

  if (!ocrResponse.ok) {
    throw new Error("OCR service request failed");
  }

  // Parse the OCR service response
  const result = await ocrResponse.json();

  return { data: result };
}

export async function getPdfText(
  pdfId: number
): Promise<{ text?: string; error?: string }> {
  const pdfRecord = await getPdfById(pdfId);

  if (!pdfRecord) {
    console.error(`PDF record not found for ID: ${pdfId}`);
    return { error: "PDF record not found" };
  }

  if (pdfRecord.text) {
    return { error: "PDF text already exists" };
  }

  const urlToFetch = pdfRecord.original_blob_url || pdfRecord.blob_url;

  if (!urlToFetch) {
    console.error(
      `PDF record found, but blob_url/original_blob_url is missing for ID: ${pdfId}`
    );
    return { error: "Blob URL is missing" };
  }

  console.log(`Downloading PDF from: ${urlToFetch}`);
  // Removed @ts-ignore - let TypeScript check compatibility
  const response = await fetch(urlToFetch);

  if (!response.ok) {
    console.error(
      `Failed to download PDF. Status: ${response.status} ${response.statusText}`
    );
    return { error: "Failed to download PDF" };
  }

  // Removed @ts-ignore - let TypeScript check compatibility
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const parsedPdf = await pdfParse(buffer);
  const text = parsedPdf.text;

  return { text };
}
