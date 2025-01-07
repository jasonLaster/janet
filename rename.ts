import { getFilenames, loadExistingMappings, saveRenameMapping, getScanDir } from './src/utils/file';
import { processFile, ProcessResult } from './src/services/fileProcessor';
import * as path from 'path';
import * as fs from 'fs';

async function backupMappings(mappings: ProcessResult[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'output', 'cache');
  const backupPath = path.join(process.cwd(), 'output', 'cache', `rename-mappings-${timestamp}.json`);

  // Ensure backup directory exists
  await fs.promises.mkdir(backupDir, { recursive: true });

  console.log(`📦 Backing up mappings to ${backupPath}`);
  await fs.promises.writeFile(backupPath, JSON.stringify(mappings, null, 2));
}

async function renameFile(result: ProcessResult) {
  if (!result.success) {
    console.log(`❌ Skipping file ${result.oldName} because:
    Error: ${result.error || 'Unknown error during processing'}`);
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
    console.error(`❌ Error renaming file ${result.oldName}:
    Operation: ${result.tempPath ? 'OCR PDF rename' : 'Simple rename'}
    Error: ${err.message}
    Stack: ${err.stack}`);
    return false;
  }
}

async function main() {
  try {
    const filenames = await getFilenames();
    const existingMappings = loadExistingMappings();

    // Backup existing mappings before processing new files
    if (existingMappings.length > 0) {
      await backupMappings(existingMappings);
    }

    const filesToProcess = filenames.filter((filename) => {
      const mapping = existingMappings.find(m => m.newName === filename);
      return !mapping || !mapping.success;
    });

    if (filesToProcess.length === 0) {
      console.log('✅ All files have been successfully processed');
      process.exit(0);
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

    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Fatal error in rename process:
    Error: ${err.message}
    Stack: ${err.stack}
    `);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
