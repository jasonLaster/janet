import * as tesseract from 'tesseract.js';
import { debugLog as debug } from '../utils/debug.js';
import { convertPDFPageToImage } from './pdf.js';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { getDocument } from 'pdfjs-dist';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';

async function createSearchablePDF(imageBuffer: Buffer, text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.image(imageBuffer, 0, 0, {
      fit: [doc.page.width, doc.page.height]
    });

    doc.fillColor('white')
      .fontSize(0)
      .text(text, 0, 0);

    doc.end();
  });
}

export interface OCRResult {
  success: boolean;
  text: string;
  searchablePdfPath?: string;
  error?: string;
}

export async function performOCR(filepath: string): Promise<OCRResult> {
  const worker = await tesseract.createWorker();

  try {
    const dataBuffer = await fs.promises.readFile(filepath);
    const pdf = await getDocument(new Uint8Array(dataBuffer)).promise;
    const numPages = pdf.numPages;

    debug(`Processing ${numPages} pages with OCR`);
    let fullText = '';
    const outputBuffers: Buffer[] = [];

    for (let i = 1; i <= numPages; i++) {
      debug(`Converting page ${i}/${numPages} to image`);
      const imageBuffer = await convertPDFPageToImage(filepath);

      debug(`Running OCR on page ${i}`);
      const { data } = await worker.recognize(imageBuffer);
      debug(`Page ${i} OCR Confidence: ${data.confidence}%`);

      fullText += data.text + '\n\n';

      const pageBuffer = await createSearchablePDF(imageBuffer, data.text);
      outputBuffers.push(pageBuffer);
    }

    if (!fullText.trim()) {
      throw new Error('OCR extraction produced no text');
    }

    const tempPath = path.join(os.tmpdir(), `ocr-${randomUUID()}.pdf`);
    await fs.promises.writeFile(tempPath, Buffer.concat(outputBuffers));

    return {
      success: true,
      text: fullText,
      searchablePdfPath: tempPath
    };

  } catch (error) {
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await worker.terminate();
  }
} 