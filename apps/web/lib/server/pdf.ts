import { pdfMetadataPrompt } from "@/lib/prompts/pdf-metadata";
import {
  getPdfById,
  updatePdfEnhancedMetadata,
  setOcrFailed,
  // sql,
} from "@/lib/db";
import { sendChatWithPDF } from "@/lib/ai";
import { parsePDFText } from "@/lib/server/pdf-parse";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import { MeiliSearch } from "meilisearch";

function parseOrExtractJson(
  responseText: string
): EnhancedPdfMetadata | Record<string, unknown> | null {
  const trimmedResponse = responseText.trim();
  try {
    // First, try to directly parse the entire response
    return JSON.parse(trimmedResponse);
  } catch {
    // If direct parsing fails, try to extract JSON from the response
    const jsonMatch = trimmedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[0];
      try {
        return JSON.parse(jsonText);
      } catch {
        // If extracted text also fails to parse, return null
        return null;
      }
    } else {
      return null;
    }
  }
}

export async function enhancePdfMetadata(pdfId: number): Promise<{
  metadata: EnhancedPdfMetadata | Record<string, unknown> | null;
  error: boolean;
}> {
  let responseText = "";
  try {
    responseText = await sendChatWithPDF({
      messages: [
        {
          role: "user",
          content: pdfMetadataPrompt,
        },
      ],
      pdfId,
      maxTokens: 2000,
      systemPrompt:
        "You are an AI assistant that analyzes PDF documents and extracts structured metadata. Your task is to thoroughly analyze the provided document and identify key information. Be comprehensive and accurate in your analysis. ALWAYS respond with properly formatted JSON when asked to.",
    });

    // Attempt to parse the response using the helper function
    const metadata = parseOrExtractJson(responseText);

    // Try to cast/validate as EnhancedPdfMetadata if possible before updating
    // For now, we assume the structure is correct for updatePdfEnhancedMetadata
    await updatePdfEnhancedMetadata(pdfId, metadata as EnhancedPdfMetadata);

    return { metadata, error: !metadata };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in enhancePdfMetadata:", message);
    // Include raw response in error if available
    if (responseText) {
      console.error("Raw AI Response:", responseText);
    }
    return { metadata: null, error: true };
  }
}

export async function ocrPdf(
  pdfId: number
): Promise<{ data: Record<string, unknown> }> {
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
    await setOcrFailed(pdfId);
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

  const urlToFetch = pdfRecord.blob_url || pdfRecord.original_blob_url;

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

  const parsedPdf = await parsePDFText(buffer);
  const text = parsedPdf.trim();

  return { text };
}

export async function addPdfToSearchIndex(pdfId: number) {
  const pdfRecord = await getPdfById(pdfId);

  if (!pdfRecord) {
    console.error(`PDF record not found for ID: ${pdfId}`);
    return { error: "PDF record not found" };
  }

  const client = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST!,
    apiKey: process.env.MEILISEARCH_API_KEY!,
  });

  const index = client.index("pdfs");
  const document = {
    id: pdfRecord.id,
    title:
      pdfRecord.metadata?.descriptiveTitle ||
      pdfRecord.title ||
      pdfRecord.filename,
    description: pdfRecord.description || pdfRecord.metadata?.summary,
    label: pdfRecord.metadata?.labels,
    userId: pdfRecord.user_id || "",
    organizationId: pdfRecord.organization_id || "",
    primaryDate: pdfRecord.metadata?.primaryDate || "",
    uploadedAt: pdfRecord.uploaded_at || "",
    text: pdfRecord.text,
    issuingOrganization: pdfRecord.metadata?.issuingOrganization || "",
    accountHolder: pdfRecord.metadata?.accountHolder || "",
    otherPeople: pdfRecord.metadata?.otherPeople || [],
  };

  const response = await index.addDocuments([document], {
    primaryKey: "id",
  });

  return response;
}
