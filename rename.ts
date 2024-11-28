import { getFilenames, loadExistingMappings, saveRenameMapping, getScanDir } from './src/utils/file.js';
import { processFile } from './src/services/fileProcessor.js';
import * as path from 'path';
import * as fs from 'fs';

async function renameFile(result: ProcessResult) {
  if (!result.success) {
    console.log(`❌ Skipping because it failed to process`);
    return false;
  }

  try {
    const oldPath = path.join(getScanDir(), result.oldName);
    const newPath = path.join(getScanDir(), result.newName);

    if (result.tempPath) {
      await fs.promises.rename(result.tempPath, newPath);
      await fs.promises.unlink(oldPath);
    } else {
      await fs.promises.rename(oldPath, newPath);
    }

    console.log(`✅ Renamed file:
      From: ${path.basename(oldPath)}
      To:   ${path.basename(newPath)}
      ${result.tempPath ? '(with embedded OCR text)' : ''}`);
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

  const filesToProcess = filenames.filter((filename) => {
    const mapping = existingMappings.find(m => m.newName === filename);
    return !mapping || !mapping.success;
  });

  if (filesToProcess.length === 0) {
    console.log('✅ All files have been successfully processed');
    return;
  }

  console.log(`\n🆕 Files to rename: ${filesToProcess.length}`);

  let processedCount = 0;
  let successCount = 0;

  for (const filename of filesToProcess) {
    console.log(`\n📋 Processing: ${filename} (${++processedCount}/${filesToProcess.length})`);

    const result = await processFile(filename);
    const renameSuccess = await renameFile(result);

    await saveRenameMapping({
      ...result,
      success: result.success && renameSuccess,
      timestamp: new Date().toISOString()
    });

    if (renameSuccess) successCount++;
  }

  console.log(`\n Final Summary:
    Total files processed: ${filesToProcess.length}
    Successfully renamed: ${successCount}
    Failed to rename: ${filesToProcess.length - successCount}`);
}

main().catch(console.error);
