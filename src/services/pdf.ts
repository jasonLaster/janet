import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import * as tesseract from 'tesseract.js';
import { PDFDocument, rgb } from 'pdf-lib'
import { createWriteStream } from 'fs'
import { debugLog as debug } from '../utils/debug'
import * as path from 'path';
import { createCanvas } from 'canvas';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { StandardFonts } from 'pdf-lib'
import { safeReadFile, ensureFileExists, getScanDir, getRelativeToScanDir } from '../utils/file';

// Configure PDF.js worker
if (typeof window === 'undefined') {
  GlobalWorkerOptions.disableWorker = true;
}

interface TextPosition {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
}

const OUT_DIR = path.resolve(process.cwd(), 'out');

export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    debug(`Attempting to parse PDF: ${getRelativeToScanDir(pdfPath)}`);

    // Check if file exists
    const exists = await ensureFileExists(pdfPath);
    if (!exists) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Safely read the file
    const pdfBuffer = await safeReadFile(pdfPath);

    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);

    // Use configured PDF.js instance instead of pdf-parse
    const loadingTask = getDocument({
      data: uint8Array,
      verbosity: 0  // Suppress non-error messages
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + ' ';
    }

    fullText = fullText.trim();

    if (!fullText) {
      const error = new Error('No text content found in PDF - the file might be scanned or have security restrictions');
      error.name = 'NoTextContentError';
      throw error;
    }

    return fullText;
  } catch (error) {
    if (error.name === 'NoTextContentError') {
      debug('PDF parsing succeeded but document appears to be a scan:', getRelativeToScanDir(pdfPath));
    } else {
      debug('PDF parsing failed:', error);
    }
    throw error;
  }
}

async function convertPDFPageToImage(pdfPath: string, pageNumber = 1): Promise<Buffer> {
  debug(`Converting PDF page to image: ${getRelativeToScanDir(pdfPath)}`);

  try {
    const exists = await ensureFileExists(pdfPath);
    if (!exists) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    const dataBuffer = await safeReadFile(pdfPath);

    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(dataBuffer);

    const loadingTask = getDocument({
      data: uint8Array,
      verbosity: 0
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);

    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    return canvas.toBuffer('image/png');
  } catch (error) {
    debug('Failed to convert PDF page to image:', error);
    throw new Error(`Failed to convert PDF page to image ${pdfPath}: ${error.message}`);
  }
}

export async function updatePDFWithOCRText(
  inputPath: string,
  ocrText: string,
  outputPath?: string
): Promise<string> {
  try {
    debug(`Ensuring output directory exists at: ${OUT_DIR}`);
    if (!fs.existsSync(OUT_DIR)) {
      debug('Creating output directory');
      fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const finalOutputPath = outputPath || path.resolve(OUT_DIR, `${path.basename(inputPath).replace('.pdf', '_ocr.pdf')}`);
    debug(`Will write final output to: ${getRelativeToScanDir(finalOutputPath)}`);

    // Convert PDF to image first
    debug('Converting PDF to image for OCR');
    const imageBuffer = await convertPDFPageToImage(inputPath);

    // Create a temporary file for the image
    const tempImagePath = path.join(OUT_DIR, `temp_${Date.now()}.png`);
    await fs.promises.writeFile(tempImagePath, imageBuffer);

    // Perform OCR on the image
    const { createWorker } = tesseract;
    const worker = await createWorker();

    debug('Starting OCR on converted image');
    const { data } = await worker.recognize(tempImagePath);

    // Load original PDF for modification
    const pdfBytes = await fs.promises.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed Helvetica font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Instead of processing word by word or line by line,
    // just add all text as one block with minimal formatting
    const allText = data.words
      .map(word => word.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Add text as a single invisible block
    firstPage.drawText(allText, {
      x: 0,
      y: height,
      size: 8,
      font,
      color: rgb(0, 0, 0),
      opacity: 0,
      maxWidth: width,
      lineHeight: 12,
    });

    await worker.terminate();

    // Clean up temporary image file
    await fs.promises.unlink(tempImagePath);

    // Save modified PDF
    debug('Saving modified PDF bytes');
    const modifiedPdfBytes = await pdfDoc.save();
    debug(`Writing ${modifiedPdfBytes.length} bytes to ${finalOutputPath}`);
    await fs.promises.writeFile(finalOutputPath, modifiedPdfBytes);

    debug(`Successfully saved PDF to ${getRelativeToScanDir(finalOutputPath)}`);
    return finalOutputPath;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug(`Error in updatePDFWithOCRText: ${errorMessage}`);
    throw new Error(`Failed to update PDF with OCR text: ${errorMessage}`);
  }
}

export async function parsePDF(buffer: Buffer) {
  try {
    const data = await PDFDocument.load(buffer);
    return data;
  } catch (error) {
    debug('PDF parsing failed:', error);
    throw error;
  }
} 