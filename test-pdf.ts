import { extractTextFromPDF, convertPDFPageToImage } from './src/services/pdf.js';
import { getScanDir } from './src/utils/file.js';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as tesseract from 'tesseract.js';

// Configure PDF.js worker
if (typeof window === 'undefined') {
  // Use the ESM version of the worker
  GlobalWorkerOptions.workerSrc = require.resolve(
    'pdfjs-dist/build/pdf.worker.mjs'
  );
}

async function extractWithPdfParse(filepath: string) {
  const dataBuffer = await Bun.file(filepath).arrayBuffer();
  const data = await pdfParse(Buffer.from(dataBuffer));
  console.log('PDF-Parse metadata:', {
    numpages: data.numpages,
    info: data.info,
    metadata: data.metadata,
    version: data.version
  });
  return data.text;
}

async function extractWithPdfLib(filepath: string) {
  const dataBuffer = await Bun.file(filepath).arrayBuffer();
  const pdfDoc = await PDFDocument.load(dataBuffer);
  const pages = pdfDoc.getPages();

  let text = '';
  for (const page of pages) {
    const { width, height } = page.getSize();
    console.log('Page size:', { width, height });

    // Try to get text objects
    const textObjects = page.node.Contents()?.toString() || '';
    text += textObjects + '\n';
  }
  return text;
}

async function extractWithPdfJs(filepath: string) {
  const dataBuffer = await Bun.file(filepath).arrayBuffer();
  const pdf = await getDocument(new Uint8Array(dataBuffer)).promise;
  let fullText = '';

  console.log('PDF.js document info:', {
    numPages: pdf.numPages,
    fingerprints: pdf.fingerprints,
  });

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    console.log(`Page ${i} info:`, {
      rotate: page.rotate,
      view: page.view,
    });

    const textContent = await page.getTextContent();
    console.log(`Page ${i} items:`, textContent.items.length);

    interface TextItem {
      str: string;
      dir: string;
      transform: number[];
      width: number;
      height: number;
      // Add other required properties
    }

    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) {
          if (i === 1 && textContent.items.indexOf(item) < 5) {
            console.log('Text item:', item);
          }
          return item.str;
        }
        return '';
      })
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

async function extractWithTesseract(filepath: string) {
  console.log('Converting PDF to image for OCR...');
  const { createWorker } = tesseract;
  const worker = await createWorker();

  try {
    // Load PDF to get page count
    const dataBuffer = await Bun.file(filepath).arrayBuffer();
    const pdf = await getDocument(new Uint8Array(dataBuffer)).promise;
    const numPages = pdf.numPages;

    console.log(`Processing ${numPages} pages...`);
    let fullText = '';

    // Process each page
    for (let i = 1; i <= numPages; i++) {
      console.log(`Converting page ${i}/${numPages} to image...`);
      const imageBuffer = await convertPDFPageToImage(filepath, i);

      console.log(`Running OCR on page ${i}...`);
      const { data } = await worker.recognize(imageBuffer);
      console.log(`Page ${i} OCR Confidence: ${data.confidence}%`);

      fullText += data.text + '\n\n';
    }

    return fullText;
  } finally {
    await worker.terminate();
  }
}

async function testPDF(filename: string) {
  console.log(`\n🔍 Testing PDF: ${filename}`);

  const filepath = path.join(getScanDir(), filename);
  console.log(`📄 Full path: ${filepath}`);

  const methods = [
    { name: 'PDF.js (Current)', fn: () => extractTextFromPDF(filepath) },
    { name: 'pdf-parse', fn: () => extractWithPdfParse(filepath) },
    { name: 'pdf-lib', fn: () => extractWithPdfLib(filepath) },
    { name: 'pdf.js (Direct)', fn: () => extractWithPdfJs(filepath) },
    { name: 'Tesseract OCR', fn: () => extractWithTesseract(filepath) }
  ];

  let anyMethodSucceeded = false;

  for (const method of methods) {
    console.log(`\n📚 Trying ${method.name}:`);
    console.log('----------------------------------------');

    try {
      const content = await method.fn();
      const preview = content.slice(0, 500).replace(/\n/g, ' ');
      console.log('✅ Success!');
      console.log(`Characters: ${content.length}`);
      if (content.length === 0) {
        console.log('⚠️  Warning: Extracted text is empty');
      } else {
        console.log(`Preview: ${preview}${content.length > 500 ? '...' : ''}`);
        anyMethodSucceeded = true;
      }
      // Show non-printable characters
      console.log('First 100 chars (hex):', Buffer.from(content.slice(0, 100)).toString('hex'));
    } catch (error: unknown) {
      console.log('❌ Failed:');
      if (error instanceof Error) {
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        if (error.stack) {
          console.log('Stack:', error.stack);
        }
        if ('cause' in error) {
          console.log('Cause:', error.cause);
        }
      } else {
        console.log('Unknown error:', error);
      }
    }
    console.log('----------------------------------------');
  }

  if (!anyMethodSucceeded) {
    console.log('❌ All methods failed to extract text from this PDF');
    // You might want to examine the PDF structure
    try {
      const dataBuffer = await Bun.file(filepath).arrayBuffer();
      const pdfDoc = await PDFDocument.load(dataBuffer);
      const pages = pdfDoc.getPages();
      console.log('PDF Structure:');
      console.log('- Number of pages:', pages.length);
      console.log('- First page size:', pages[0].getSize());
      // Get version from document metadata
      const pdfInfo = await pdfParse(Buffer.from(dataBuffer));
      console.log('- PDF Version:', pdfInfo.version);
      // Add more PDF structure information as needed
    } catch (error) {
      console.log('Failed to examine PDF structure:', error);
    }
  }

  return anyMethodSucceeded;
}

// Get filename from arguments
const filename = process.argv.slice(2).join(' ');

if (!filename) {
  console.log('Please provide a filename as an argument');
  console.log('Example: bun test-pdf "2023-07-30 Empire HealthChoice.pdf"');
  process.exit(1);
}

testPDF(filename).catch(console.error); 