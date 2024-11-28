import { extractTextFromPDF, convertPDFPageToImage } from './src/services/pdf';
import { getScanDir } from './src/utils/file';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist';
import * as tesseract from 'tesseract.js';

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
    fingerprint: pdf.fingerprint,
  });

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    console.log(`Page ${i} info:`, {
      rotate: page.rotate,
      view: page.view,
    });

    const textContent = await page.getTextContent();
    console.log(`Page ${i} items:`, textContent.items.length);

    const pageText = textContent.items
      .map((item: any) => {
        // Log first few items to see their structure
        if (i === 1 && textContent.items.indexOf(item) < 5) {
          console.log('Text item:', item);
        }
        return item.str;
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
  console.log(`🔍 Testing PDF: ${filename}`);

  const filepath = path.join(getScanDir(), filename);
  console.log(`📄 Full path: ${filepath}`);

  const methods = [
    { name: 'PDF.js (Current)', fn: () => extractTextFromPDF(filepath) },
    { name: 'pdf-parse', fn: () => extractWithPdfParse(filepath) },
    { name: 'pdf-lib', fn: () => extractWithPdfLib(filepath) },
    { name: 'pdf.js (Direct)', fn: () => extractWithPdfJs(filepath) },
    { name: 'Tesseract OCR', fn: () => extractWithTesseract(filepath) }
  ];

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
      }
      // Show non-printable characters
      console.log('First 100 chars (hex):', Buffer.from(content.slice(0, 100)).toString('hex'));
    } catch (error) {
      console.log('❌ Failed:');
      console.log(error.message);
      if (error.stack) {
        console.log('Stack:', error.stack);
      }
    }
    console.log('----------------------------------------');
  }
}

// Get filename by joining all arguments after the script name
const filename = process.argv.slice(2).join(' ');

if (!filename) {
  console.log('Please provide a filename as an argument');
  console.log('Example: bun test-pdf "2023-07-30 Empire HealthChoice.pdf"');
  process.exit(1);
}

testPDF(filename).catch(console.error); 