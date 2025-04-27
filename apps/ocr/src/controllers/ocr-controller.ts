import fs from "fs/promises";
import os, { tmpdir } from "os";
import path from "path";
import { put } from "@vercel/blob";
import {
  getPdfById,
  updatePdfWithSearchableUrl,
  updatePdfText,
} from "../lib/db.js";
import {
  debug,
  convertPdfToImages,
  processPage,
  createPdfWithTextLayers,
  cleanupTempFiles,
  getPageCount,
  getPdfText,
} from "../lib/ocr-utils.js";
import dotenv from "dotenv";

dotenv.config();

interface OCRResponse {
  success: boolean;
  message?: string;
  searchableUrl?: string;
  blobUrl?: string;
  processingTimeMs?: number;
  pageCount?: number;
  error?: string;
}

export async function processPdf(pdfId: number): Promise<OCRResponse> {
  const tempImagePaths: string[] = [];
  let outputPdfPath = "";
  let tempDir = "";
  const startTime = Date.now();

  debug(`Starting PDF OCR process for PDF ID: ${pdfId}`);

  try {
    // Get PDF record from database
    debug(`Fetching PDF record for ID: ${pdfId}`);
    const pdfRecord = await getPdfById(Number(pdfId));

    if (!pdfRecord) {
      debug(`PDF record not found for ID: ${pdfId}`);
      return {
        success: false,
        error: "PDF not found",
      };
    }
    debug(`Found PDF record: ${pdfRecord.filename}`);

    // Create temporary directory for processing
    debug(`Creating temporary processing directory`);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-ocr-"));
    debug(`Created temp directory: ${tempDir}`);

    // Download the PDF from the blob URL
    const blobUrl = pdfRecord.original_blob_url;
    debug(`Downloading PDF from: ${blobUrl}`);
    const pdfResponse = await fetch(blobUrl);
    if (!pdfResponse.ok) {
      debug(
        `Failed to download PDF from ${blobUrl}, status: ${pdfResponse.status}`
      );
      throw new Error(`Failed to download PDF from ${blobUrl}`);
    }
    debug(
      `PDF downloaded successfully, size: ${
        pdfResponse.headers.get("content-length") || "unknown"
      } bytes`
    );

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    debug(`PDF converted to buffer, size: ${pdfBuffer.length} bytes`);

    const inputPdfPath = path.join(tempDir, "input.pdf");
    outputPdfPath = path.join(tempDir, "searchable.pdf");

    debug(`Writing PDF to temporary file: ${inputPdfPath}`);
    await fs.writeFile(inputPdfPath, pdfBuffer);
    debug(`PDF written to temporary file`);

    // Get the number of pages in the PDF
    debug(`Getting page count for PDF`);
    const pageCount = await getPageCount(inputPdfPath);
    debug(`PDF has ${pageCount} pages`);

    // Create base temporary image file path
    const tempBasePath = path.join(tempDir, "temp_page");
    debug(`Temporary image base path: ${tempBasePath}`);

    // Convert PDF pages to images
    debug(`Converting PDF pages to images`);
    const imagePaths = await convertPdfToImages(inputPdfPath, tempBasePath);
    tempImagePaths.push(...imagePaths);
    debug(`Converted ${imagePaths.length} PDF pages to images`);

    // Process each page
    debug(`Starting OCR processing for ${pageCount} pages`);
    const pageData = [];
    const results = await Promise.all(
      Array.from({ length: pageCount }, async (_, i) => {
        const pageNum = i + 1;
        debug(`Starting processing of page ${pageNum}/${pageCount}`);
        return processPage(imagePaths[i], pageNum).then((result) => {
          if (result) {
            debug(`Successfully processed page ${pageNum}`);
            return result;
          } else {
            debug(`Failed to process page ${pageNum}`);
            return null;
          }
        });
      })
    );

    pageData.push(...results.filter((result) => result !== null));

    const failedPages = pageCount - pageData.length;
    if (failedPages > 0) {
      debug(`${failedPages} pages failed to process`);
      console.warn(
        `Warning: ${failedPages} out of ${pageCount} pages failed OCR processing`
      );
      throw new Error(
        `Failed to process ${failedPages} out of ${pageCount} pages`
      );
    }
    debug(`Processed ${pageData.length}/${pageCount} pages successfully`);

    // Create the searchable PDF
    debug(`Creating searchable PDF at: ${outputPdfPath}`);
    await createPdfWithTextLayers(pageData, outputPdfPath);
    debug(`Searchable PDF created successfully`);

    // Read the generated PDF file
    debug(`Reading searchable PDF file`);
    const searchablePdfBuffer = await fs.readFile(outputPdfPath);
    debug(`Read searchable PDF, size: ${searchablePdfBuffer.length} bytes`);

    // Generate a unique filename for the searchable PDF
    const userId = pdfRecord.user_id;
    const searchablePdfFilename = `searchable-${pdfRecord.filename}`;

    // Upload the searchable PDF to Vercel Blob storage
    debug(`Uploading searchable PDF to Vercel Blob storage`);
    const blobPath = `pdfs/${userId}/${Date.now()}-${searchablePdfFilename}`;

    const blob = await put(blobPath, new Blob([searchablePdfBuffer]), {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const searchableUrl = blob.url;
    debug(`Uploaded searchable PDF to Vercel Blob: ${searchableUrl}`);

    // Update the PDF record with the searchable PDF URL
    debug(`Updating PDF record ${pdfId} with searchable URL`);
    await updatePdfWithSearchableUrl(pdfRecord.id, searchableUrl);
    debug(`Updated PDF record with searchable URL`);

    debug(`Updating PDF record ${pdfId} with text from PDF`);
    const { text, error } = await getPdfText(pdfRecord.id);
    if (error || !text) {
      debug(`Error getting text from PDF: ${error}`);
    } else {
      await updatePdfText(pdfRecord.id, text);
      debug(`Updated PDF record with text from PDF`);
    }

    await cleanupTempFiles(tempDir, [
      ...tempImagePaths,
      inputPdfPath,
      outputPdfPath,
    ]);

    const processingTimeMs = Date.now() - startTime;
    debug(`OCR processing completed in ${processingTimeMs}ms`);

    // Return success response
    return {
      success: true,
      message: "PDF processed successfully",
      searchableUrl,
      blobUrl,
      processingTimeMs,
      pageCount: pageData.length,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug(`Error creating searchable PDF: ${errorMessage}`, error);

    await cleanupTempFiles(tempDir, [...tempImagePaths, outputPdfPath]);

    const processingTimeMs = Date.now() - startTime;
    debug(`OCR processing failed after ${processingTimeMs}ms`);

    return {
      success: false,
      error: "Failed to create searchable PDF",
      message: errorMessage,
      processingTimeMs,
    };
  }
}
