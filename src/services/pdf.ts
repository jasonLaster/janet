import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import * as tesseract from 'tesseract.js';
import { PDFDocument, rgb } from 'pdf-lib'
import { debugLog as debug } from '../utils/debug.js'
import * as path from 'path';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { StandardFonts } from 'pdf-lib'
import { safeReadFile, ensureFileExists, getScanDir, getRelativeToScanDir } from '../utils/file.js';
import sharp from 'sharp';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
const exec = promisify(execCallback);

// Configure PDF.js worker
if (typeof window === 'undefined') {
  GlobalWorkerOptions.workerSrc = require.resolve(
    'pdfjs-dist/build/pdf.worker.mjs'
  );
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

    // Try OCR first for scanned PDFs
    try {
      debug('Attempting OCR extraction first');
      const { createWorker } = tesseract;
      const worker = await createWorker();

      // Load PDF to get page count
      const pdfBuffer = await safeReadFile(pdfPath);
      const pdf = await getDocument(new Uint8Array(pdfBuffer)).promise;
      const numPages = pdf.numPages;

      debug(`Processing ${numPages} pages with OCR`);
      let fullText = '';

      // Process each page
      for (let i = 1; i <= numPages; i++) {
        debug(`Converting page ${i}/${numPages} to image...`);
        const imageBuffer = await convertPDFPageToImage(pdfPath, i);

        debug(`Running OCR on page ${i}...`);
        const { data } = await worker.recognize(imageBuffer);
        debug(`Page ${i} OCR Confidence: ${data.confidence}%`);

        // Only use OCR text if confidence is high enough
        if (data.confidence > 85) {
          fullText += data.text + '\n\n';
        } else {
          throw new Error('Low OCR confidence');
        }
      }

      await worker.terminate();
      return fullText.trim();
    } catch (error) {
      debug('OCR failed or had low confidence, falling back to PDF.js extraction');

      // Fall back to PDF.js text extraction
      const pdfBuffer = await safeReadFile(pdfPath);
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdf = await getDocument(uint8Array).promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items
          .map((item: any) => item.str)
          .join(' ') + '\n';
      }

      return text.trim();
    }
  } catch (error) {
    debug('PDF extraction failed:', error);
    throw error;
  }
}

export async function convertPDFPageToImage(pdfPath: string, pageNumber = 1): Promise<Buffer> {
  debug(`Converting PDF page to image: ${getRelativeToScanDir(pdfPath)}`);

  try {
    const exists = await ensureFileExists(pdfPath);
    if (!exists) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Create a temporary output file
    const tempOutput = `/tmp/pdf-page-${Date.now()}.png`;

    try {
      // Use pdftocairo to convert PDF page to PNG
      await exec(`pdftocairo -png -singlefile -f ${pageNumber} -l ${pageNumber} "${pdfPath}" "${tempOutput}"`);

      // Read the generated image
      const imageBuffer = await fs.promises.readFile(`${tempOutput}.png`);

      // Clean up the temporary file
      await fs.promises.unlink(`${tempOutput}.png`);

      return imageBuffer;
    } catch (error: unknown) {
      if (error instanceof Error) {
        debug('Failed to convert PDF using pdftocairo:', error);
        throw new Error(`Failed to convert PDF using pdftocairo: ${error.message}`);
      }
      throw error;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      debug('Failed to convert PDF page to image:', error);
      throw new Error(`Failed to convert PDF page to image ${pdfPath}: ${error.message}`);
    }
    throw error;
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

    // Use Courier font which has better character support
    const font = await pdfDoc.embedFont(StandardFonts.Courier);

    // Clean and normalize the text
    const cleanText = ocrText
      .normalize('NFKD') // Decompose characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only basic ASCII
      .replace(/\s+/g, ' ')
      .trim();

    // Add text in smaller chunks to avoid font space issues
    const maxChunkSize = 500; // Reduced chunk size
    for (let i = 0; i < cleanText.length; i += maxChunkSize) {
      const chunk = cleanText.slice(i, i + maxChunkSize);
      firstPage.drawText(chunk, {
        x: 0,
        y: height - (Math.floor(i / maxChunkSize) * 12),
        size: 8,
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
        maxWidth: width,
        lineHeight: 12,
      });
    }

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