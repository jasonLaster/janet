import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import type { Worker, LoggerMessage } from 'tesseract.js';
import { PDFDocument } from 'pdf-lib'
import { debugLog as debug } from '../utils/debug.js'
import * as path from 'path';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { promisify } from 'util';
import { exec } from 'child_process';
import type { Subprocess } from 'bun';

// Configure PDF.js worker
if (typeof window === 'undefined') {
  // Node environment
  const pdfjsPath = require.resolve('pdfjs-dist');
  const workerPath = path.join(path.dirname(pdfjsPath), 'build', 'pdf.worker.js');
  GlobalWorkerOptions.workerSrc = workerPath;
} else {
  // Browser environment
  GlobalWorkerOptions.workerSrc = '/pdf.worker';
}

/**
 * Convert a PDF page to an image buffer using pdftoppm
 */
export async function convertPDFPageToImage(pdfPath: string): Promise<Buffer> {
  const tempDir = path.join(process.cwd(), 'temp');
  const outputBasePath = path.join(tempDir, 'temp');
  let proc: Subprocess | null = null;

  try {
    // Validate input path
    if (!pdfPath || typeof pdfPath !== 'string') {
      throw new Error('Invalid PDF path provided');
    }

    // Ensure the PDF file exists and is readable
    try {
      await fs.promises.access(pdfPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Cannot access PDF file: ${pdfPath}`);
    }

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Convert PDF to PNG using pdftoppm (first page only)
    proc = Bun.spawn(['pdftoppm', '-png', '-f', '1', '-l', '1', '-singlefile', pdfPath, outputBasePath], {
      stderr: 'pipe',
      stdout: 'pipe',
      onExit(proc, exitCode, signalCode, error) {
        if (error) debug('Process error:', error);
        if (signalCode) debug('Process terminated with signal:', signalCode);
      }
    });

    // Set a timeout for the process
    const timeoutMs = 30000; // 30 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('PDF conversion timed out')), timeoutMs);
    });

    // Wait for process completion with timeout
    const [exitCode] = await Promise.race([
      Promise.all([proc.exited, Promise.resolve()]),
      timeoutPromise
    ]);

    // Collect stderr output
    const stderrChunks: Uint8Array[] = [];
    if (proc.stderr && proc.stderr instanceof ReadableStream) {
      const reader = proc.stderr.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) stderrChunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    if (exitCode !== 0) {
      const stderr = Buffer.concat(stderrChunks).toString().trim();
      throw new Error(`pdftoppm error (${exitCode}): ${stderr || 'No error message available'}`);
    }

    // Verify the output file exists
    const outputPath = outputBasePath + '.png';
    try {
      await fs.promises.access(outputPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error('PDF conversion failed: output file not created');
    }

    // Read the generated image
    const imageBuffer = await fs.promises.readFile(outputPath);
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('PDF conversion failed: output file is empty');
    }

    return imageBuffer;
  } catch (error) {
    debug('PDF to image conversion failed:', error);
    throw error;
  } finally {
    // Kill the process if it's still running
    if (proc && !proc.exited) {
      proc.kill();
    }

    // Clean up temp files
    try {
      const outputPath = outputBasePath + '.png';
      if (fs.existsSync(outputPath)) {
        await fs.promises.unlink(outputPath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      debug('Failed to clean up temporary files:', err);
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
    let worker: Worker | null = null;
    try {
      worker = await createWorker();

      // Convert PDF to image first
      const imageBuffer = await convertPDFPageToImage(pdfPath);

      const { data } = await worker.recognize(imageBuffer);
      const text = data.text.trim();

      // Explicitly terminate worker before returning
      await worker.terminate();
      worker = null;

      return text;
    } catch (error) {
      debug('OCR failed:', error);
      throw error;
    } finally {
      // Ensure worker is terminated even if an error occurs
      if (worker) {
        try {
          await worker.terminate();
        } catch (err) {
          debug('Failed to terminate worker:', err);
        }
      }
    }
  } catch (error) {
    debug('PDF extraction failed:', error);
    throw error;
  }
} 