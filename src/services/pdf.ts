import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import * as tesseract from 'tesseract.js';
import { PDFDocument } from 'pdf-lib'
import { debugLog as debug } from '../utils/debug.js'
import * as path from 'path';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { promisify } from 'util';
import { exec } from 'child_process';

// Configure PDF.js worker
if (typeof window === 'undefined') {
  // Node environment
  const pdfjsPath = require.resolve('pdfjs-dist');
  const workerPath = path.join(path.dirname(pdfjsPath), 'build', 'pdf.worker.js');
  GlobalWorkerOptions.workerSrc = workerPath;
} else {
  // Browser environment
  GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

/**
 * Convert a PDF page to an image buffer using pdftoppm
 */
export async function convertPDFPageToImage(pdfPath: string): Promise<Buffer> {
  const execAsync = promisify(exec);
  const tempDir = path.join(process.cwd(), 'temp');
  const outputBasePath = path.join(tempDir, 'temp');

  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Convert PDF to PNG using pdftoppm
    await execAsync(`pdftoppm -png -singlefile "${pdfPath}" "${outputBasePath}"`);

    // Read the generated image
    const imageBuffer = await fs.promises.readFile(outputBasePath + '.png');

    // Clean up
    await fs.promises.unlink(outputBasePath + '.png');

    return imageBuffer;
  } catch (error) {
    debug('PDF to image conversion failed:', error);
    throw error;
  } finally {
    // Clean up temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      debug('Failed to clean up temp directory:', err);
    }
  }
}

export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    debug(`Attempting to parse PDF: ${pdfPath}`);

    // Check if file exists
    try {
      await fs.promises.access(pdfPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Read the file
    const pdfBuffer = await fs.promises.readFile(pdfPath);

    // Try PDF.js text extraction first
    try {
      const pdf = await getDocument(new Uint8Array(pdfBuffer)).promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items
          .map((item: any) => item.str)
          .join(' ') + '\n';
      }

      const trimmedText = text.trim();
      if (trimmedText.length > 0) {
        return trimmedText;
      }

      // If no text was extracted, fall back to OCR
      debug('No text extracted from PDF, falling back to OCR');
    } catch (error) {
      // If PDF.js fails with a parsing error, don't fall back to OCR
      if (error instanceof Error && error.message.includes('parsing')) {
        throw error;
      }
      debug('PDF.js extraction failed, trying OCR:', error);
    }

    // Fall back to OCR
    try {
      const worker = await tesseract.createWorker('eng', 1, {
        logger: m => debug('Tesseract:', m),
        errorHandler: err => debug('Tesseract error:', err)
      });

      try {
        // Convert PDF to image first
        const imageBuffer = await convertPDFPageToImage(pdfPath);

        const { data } = await worker.recognize(imageBuffer);
        return data.text.trim();
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      debug('OCR failed:', error);
      throw error;
    }
  } catch (error) {
    debug('PDF extraction failed:', error);
    throw error;
  }
} 