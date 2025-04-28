import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { exec, execSync } from "child_process";
import util from "util";
import PDFDocument from "pdfkit";
import vision, { ImageAnnotatorClient } from "@google-cloud/vision";
import { imageSize } from "image-size"; // Correct import
import { parsePDFText } from "./pdf-parse.js";
import { getPdfById } from "./db.js";

const execPromise = util.promisify(exec);

const CLEANUP_TEMP_FILES = true;
if (CLEANUP_TEMP_FILES) {
  console.warn("Temporary files are not being cleaned up!");
}

// Add a debug logger
export const debug = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [PDF-OCR] ${message}`;

  if (data) {
    console.log(formattedMessage, data);
  } else {
    console.log(formattedMessage);
  }
};

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the number of pages in a PDF
 */
export async function getPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execPromise(`pdfinfo "${pdfPath}"`);
    const pageMatch = stdout.match(/Pages:\s+(\d+)/);
    if (pageMatch && pageMatch[1]) {
      return parseInt(pageMatch[1], 10);
    }
    throw new Error("Could not determine page count from pdfinfo output");
  } catch (error) {
    console.error("Error getting page count:", error);
    throw error;
  }
}

// Use the directly imported type
let client: ImageAnnotatorClient | null = null;

/**
 * Get Google Vision client
 */
export function getVisionClient() {
  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  if (!client) {
    // Use REST transport instead of gRPC
    client = new vision.ImageAnnotatorClient({
      apiKey: API_KEY,
      fallback: true, // Force REST mode
    });

    debug("Created Vision API client with REST transport");
  }

  return client;
}

/**
 * Run OCR on an image using Google Cloud Vision
 */
export async function runGoogleVisionOCR(imagePath: string) {
  try {
    debug(`Running OCR on image: ${path.basename(imagePath)}`);
    const client = getVisionClient();

    // Check file size to avoid API limits
    const stats = await fs.stat(imagePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    debug(`Image size: ${fileSizeMB.toFixed(2)} MB`);

    // If image is too large, warn about potential issues
    if (fileSizeMB > 20) {
      debug(
        `Image is very large (${fileSizeMB.toFixed(
          2
        )} MB), this may cause issues with Vision API`
      );
    }

    // Add retry logic with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second initial delay

    while (retries <= maxRetries) {
      try {
        // Set a timeout for the API call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Vision API timeout")), 60000); // 60 seconds timeout
        });

        debug(`OCR attempt ${retries + 1} for ${path.basename(imagePath)}`);

        // Use Promise.race to implement timeout
        const resultPromise = client.textDetection(imagePath);
        const [result] = (await Promise.race([
          resultPromise,
          timeoutPromise,
        ])) as any;

        debug(
          `OCR completed for ${path.basename(imagePath)}, found ${
            result.textAnnotations?.length || 0
          } text annotations`
        );
        return result.textAnnotations;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        retries++;

        // Log the error but continue with retry attempts
        debug(`OCR attempt ${retries} failed: ${errorMessage}`);

        if (retries > maxRetries) {
          debug(`All ${maxRetries} retry attempts failed, giving up`);
          throw err;
        }

        // Exponential backoff with jitter
        const delay =
          baseDelay * Math.pow(2, retries - 1) + Math.random() * 1000;
        debug(`Retrying in ${Math.round(delay / 1000)} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    console.error("Error running Google Cloud Vision OCR:", error);
    throw error;
  }
}

/**
 * Convert PDF pages to images using pdftoppm
 */
export async function convertPdfToImages(
  pdfPath: string,
  outputBasePath: string
): Promise<string[]> {
  debug(`Converting PDF to images: ${path.basename(pdfPath)}`);
  const command = `pdftoppm -jpeg -r 200  "${pdfPath}" "${outputBasePath}"`;
  execSync(command, { stdio: "inherit" });

  const pageCount = await getPageCount(pdfPath);
  debug(`PDF has ${pageCount} pages`);

  const imagePaths = [];
  for (let i = 1; i <= pageCount; i++) {
    imagePaths.push(`${outputBasePath}-${i}.jpg`);
  }

  debug(`Generated ${imagePaths.length} image paths`);
  return imagePaths;
}

/**
 * Process a single PDF page
 */
export async function processPage(imagePath: string, pageNumber: number) {
  debug(
    `Processing page ${pageNumber} from image: ${path.basename(imagePath)}`
  );

  if (!(await fileExists(imagePath))) {
    console.warn(
      `Warning: Image for page ${pageNumber} not found: ${imagePath}`
    );
    return null;
  }

  const imageBuffer = await fs.readFile(imagePath);
  // Use imageSize to get dimensions
  const dimensions = imageSize(imageBuffer);
  const width = dimensions.width;
  const height = dimensions.height;

  debug(
    `Image dimensions calculated for page ${pageNumber}: width=${width}, height=${height}`
  );

  if (!width || !height) {
    console.error(`Could not get dimensions for image: ${imagePath}`);
    return null; // Or throw an error
  }

  debug(`Image dimensions for page ${pageNumber}: ${width}x${height}`);

  const ocrData = await runGoogleVisionOCR(imagePath);

  return {
    imageBuffer,
    width,
    height,
    ocrData,
  };
}

/**
 * Add text layers to a PDF page
 */
export function addTextLayers(doc: PDFKit.PDFDocument, ocrData: any[]) {
  const textItems = ocrData.filter(
    (item) =>
      item.description &&
      typeof item.description === "string" &&
      item.boundingPoly &&
      item.boundingPoly.vertices &&
      item.boundingPoly.vertices.length === 4
  );

  const itemsToProcess = textItems.length > 1 ? textItems.slice(1) : textItems;

  for (const textItem of itemsToProcess) {
    const vertices = textItem.boundingPoly.vertices;
    const x = vertices[0].x;
    const y = vertices[0].y;

    const textWidth = Math.max(
      Math.abs(vertices[1].x - vertices[0].x),
      Math.abs(vertices[2].x - vertices[3].x)
    );
    const textHeight = Math.max(
      Math.abs(vertices[3].y - vertices[0].y),
      Math.abs(vertices[2].y - vertices[1].y)
    );

    const fontSize = Math.max(textHeight * 0.8, 8);

    try {
      doc
        .font("Helvetica")
        .fontSize(fontSize)
        .fillOpacity(0.01)
        .fillColor("black")
        .text(textItem.description, x, y, {
          width: textWidth,
          height: textHeight,
          align: "left",
          baseline: "top",
        });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(
        `Could not add text: "${textItem.description}" - ${errorMessage}`
      );
    }
  }
}

/**
 * Create searchable PDF document from processed pages
 */
export async function createPdfWithTextLayers(
  pageData: any[],
  outputPath: string
): Promise<void> {
  const writeStream = fsSync.createWriteStream(outputPath);

  const doc = new PDFDocument({
    size: [pageData[0].width, pageData[0].height],
    margin: 0,
    info: {
      Title: `OCR Searchable PDF`,
      Author: "PDF OCR Tool",
      Keywords: "OCR, searchable, pdf",
    },
    autoFirstPage: false,
  });

  doc.pipe(writeStream);

  for (let i = 0; i < pageData.length; i++) {
    const { imageBuffer, width, height, ocrData } = pageData[i];

    doc.addPage({
      size: [width, height],
      margin: 0,
    });

    // Add detailed debug log before embedding the image
    debug(
      `[PDFKit Pre-Embed] Page ${i + 1}: Image buffer length=${
        imageBuffer?.length
      }, type=${typeof imageBuffer}, width=${width}, height=${height}`
    );

    // Add debug log for imageBuffer - This log was already present, keeping it for context
    debug(
      `Adding image to PDF page ${
        i + 1
      }: buffer type=${typeof imageBuffer}, length=${
        imageBuffer?.length
      }, width=${width}, height=${height}`
    );

    doc.image(imageBuffer, 0, 0, {
      width: width,
      height: height,
    });

    addTextLayers(doc, ocrData);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

export async function cleanupTempFiles(tempDir: string, filePaths: string[]) {
  if (!CLEANUP_TEMP_FILES) {
    return;
  }

  // Clean up temporary files
  debug(`Cleaning up temporary files`, filePaths);

  for (const filePath of filePaths) {
    try {
      if (await fileExists(filePath)) {
        await fs.unlink(filePath);
        debug(`Removed temporary file: ${filePath}`);
      }
    } catch (error) {
      console.warn(
        `Warning: Could not remove temporary file ${filePath}:`,
        error
      );
    }
  }

  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
    debug(`Removed temporary directory: ${tempDir}`);
  }
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
  const response = await fetch(urlToFetch);

  if (!response.ok) {
    console.error(
      `Failed to download PDF. Status: ${response.status} ${response.statusText}`
    );
    return { error: "Failed to download PDF" };
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Use the local parsePDFText function with the buffer
  const text = await parsePDFText(buffer);

  return { text };
}
