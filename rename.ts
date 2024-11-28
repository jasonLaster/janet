import { getFilenames, loadExistingMappings, saveRenameMapping, getScanDir } from './src/utils/file.js';
import { suggestNewName } from './src/services/openai.js';
import { extractTextFromPDF, convertPDFPageToImage } from './src/services/pdf.js';
import { RenameMapping, RemappingCache } from './src/types.js';
import { debugLog as debug } from './src/utils/debug.js';
import * as path from 'path';
import * as fs from 'fs';
import { getDocument } from 'pdfjs-dist';
import * as tesseract from 'tesseract.js';

interface Cache {
  version: string;
  mappings: {
    [key: string]: {
      originalPath: string;
      newPath: string;
      ocrPath?: string;
    };
  };
}

async function loadCache(cachePath: string): Promise<Cache> {
  try {
    const cacheContent = await fs.promises.readFile(cachePath, 'utf8');
    const cache = JSON.parse(cacheContent);
    // Ensure cache has the correct structure
    return {
      version: cache.version || '1.0',
      mappings: cache.mappings || {}
    };
  } catch {
    // Return a fresh cache object if file doesn't exist or is invalid
    return {
      version: '1.0',
      mappings: {}
    };
  }
}

export async function updateCache(
  cachePath: string,
  originalPath: string,
  newPath: string,
  ocrPath?: string
) {
  const cache = await loadCache(cachePath);

  cache.mappings[originalPath] = {
    originalPath,
    newPath,
    ...ocrPath && { ocrPath }
  };

  await fs.promises.writeFile(cachePath, JSON.stringify(cache, null, 2));
  return cache;
}

interface RenameResult {
  success: boolean;
  error?: string;
  oldName: string;
  newName: string;
  content: string;
}

async function processFile(filename: string): Promise<RenameResult> {
  const filepath = path.join(getScanDir(), filename);

  try {
    // First try normal text extraction
    try {
      const content = await extractTextFromPDF(filepath);
      if (content) {
        debug('Successfully extracted text directly from PDF');
        const newName = await suggestNewName(filename, content);
        return {
          success: true,
          oldName: filename,
          newName: newName || filename,
          content
        };
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'NoTextContentError') {
        throw error;  // Re-throw if it's not a "no text" error
      }
      debug('No text content found, falling back to OCR');
    }

    // If text extraction failed, try OCR
    debug('Starting OCR process');
    const { createWorker } = tesseract;
    const worker = await createWorker();

    try {
      // Get page count
      const dataBuffer = await fs.promises.readFile(filepath);
      const pdf = await getDocument(new Uint8Array(dataBuffer)).promise;
      const numPages = pdf.numPages;

      debug(`Processing ${numPages} pages with OCR`);
      let fullText = '';

      // Process each page
      for (let i = 1; i <= numPages; i++) {
        debug(`Converting page ${i}/${numPages} to image`);
        const imageBuffer = await convertPDFPageToImage(filepath, i);

        debug(`Running OCR on page ${i}`);
        const { data } = await worker.recognize(imageBuffer);
        debug(`Page ${i} OCR Confidence: ${data.confidence}%`);

        fullText += data.text + '\n\n';
      }

      if (!fullText.trim()) {
        throw new Error('OCR extraction produced no text');
      }

      debug(`Successfully extracted ${fullText.length} characters using OCR`);
      const newName = await suggestNewName(filename, fullText);

      return {
        success: true,
        oldName: filename,
        newName: newName || filename,
        content: fullText
      };

    } finally {
      await worker.terminate();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug(`Error processing ${filename}: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      oldName: filename,
      newName: filename,
      content: ''
    };
  }
}

async function renameFile(result: RenameResult) {

  if (!result.success) {
    console.log(`❌ Skipping because it failed to process`);
    return false;
  }

  try {
    const oldPath = path.join(getScanDir(), result.oldName);
    const newPath = path.join(getScanDir(), result.newName);


    await fs.promises.rename(oldPath, newPath);
    console.log(`✅ Renamed file:
      From: ${path.basename(oldPath)}
      To:   ${path.basename(newPath)}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Error renaming file: ${err.message}`);
    return false;
  }
}

async function main() {
  const filenames = await getFilenames();
  const existingMappings = loadExistingMappings();


  // Only process files that haven't been successfully renamed
  const unprocessedFiles = filenames.filter((filename: string) => {
    const mapping = existingMappings[filename];
    return !mapping || !mapping.success;
  });



  if (unprocessedFiles.length === 0) {
    console.log('✅ All files have been successfully processed');
    return;
  }

  console.log(`🆕 Files to rename: ${unprocessedFiles.length}`);

  let processedCount = 0;
  let successCount = 0;

  for (const filename of unprocessedFiles) {
    console.log(`\n📋 Processing: ${filename} (${++processedCount}/${unprocessedFiles.length})`);

    const result = await processFile(filename);

    const renameSuccess = await renameFile(result);

    const mapping: RenameMapping = {
      ...result,
      success: result.success && renameSuccess,
      timestamp: new Date().toISOString(),
      content: result.content
    };

    await saveRenameMapping(mapping);

    if (renameSuccess) {
      successCount++;
    }
  }

  console.log(`\n Final Summary:
    Total files processed: ${unprocessedFiles.length}
    Successfully renamed: ${successCount}
    Failed to rename: ${unprocessedFiles.length - successCount}`);
}

main().catch(console.error);
