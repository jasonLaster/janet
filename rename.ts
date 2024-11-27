import { getFilenames, loadExistingMappings, saveRenameMapping, getScanDir } from './src/utils/file.js';
import { suggestNewName } from './src/services/openai.js';
import { extractTextFromPDF, updatePDFWithOCRText } from './src/services/pdf.js';
import { RenameMapping, RemappingCache } from './src/types.js';
import { debugLog as debug } from './src/utils/debug.js';
import * as path from 'path';
import * as fs from 'fs';

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
}

async function processFile(filename: string): Promise<RenameResult> {
  const filepath = path.join(getScanDir(), filename);

  try {
    const content = await extractTextFromPDF(filepath);
    if (!content) {
      console.warn('No content extracted, possibly due to font issues');
      return { oldName: filename, newName: filename, success: false };
    }

    if (process.env.DEBUG) {
      console.log(`📄 Extracted ${content.length} characters of content`);
      console.log(`📝 First 100 characters: ${content.slice(0, 100).replace(/\n/g, ' ')}...`);
    }

    const newName = await suggestNewName(filename, content);

    // if (path.extname(filepath).toLowerCase() === '.pdf') {
    //   const ocrPath = await updatePDFWithOCRText(filepath, content); // Reuse existing content instead of re-extracting
    //   await updateRemappingCache(filepath, newName, ocrPath);
    // } else {
    // await updateCache('rename-mappings.json', filepath, newName);
    // }

    return {
      success: true,
      oldName: filename,
      newName: newName || filename
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug(`Error processing ${filename}: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      oldName: filename,
      newName: filename
    };
  }
}

async function renameFile(oldPath: string, newPath: string) {
  try {
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
  const unprocessedFiles = filenames.filter(filename => {
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
    const oldPath = path.join(getScanDir(), result.oldName);
    const newPath = path.join(getScanDir(), result.newName);

    const renameSuccess = await renameFile(oldPath, newPath);

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
