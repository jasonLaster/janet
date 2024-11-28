import * as fs from 'fs';
import * as path from 'path';
import { RenameMapping } from '../types.js';
import { debugLog, errorLog } from './debug.js';

function expandPath(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return filepath.replace('~', process.env.HOME || '');
  }
  return filepath;
}

export async function ensureFileExists(filePath: string): Promise<boolean> {
  const expandedPath = expandPath(filePath);
  try {
    await fs.promises.access(expandedPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function safeReadFile(filePath: string): Promise<Buffer> {
  const expandedPath = expandPath(filePath);
  try {
    debugLog(`Reading file: ${getRelativeToScanDir(expandedPath)}`);
    const exists = await ensureFileExists(expandedPath);

    if (!exists) {
      throw new Error(`File does not exist: ${expandedPath}`);
    }

    return await fs.promises.readFile(expandedPath);
  } catch (error) {
    errorLog(`Failed to read file: ${expandedPath}`, error);
    throw error;
  }
}

export function getScanDir(): string {
  const baseDir = process.env.SCAN_DIR || '~/My Drive (jason.laster.11@gmail.com)/LastPech/Scans/';
  return expandPath(baseDir);
}

export async function getFilenames(): Promise<string[]> {
  const scanDir = getScanDir();
  try {
    const files = await fs.promises.readdir(scanDir);

    const filteredFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      const isValidExt = ext === '.pdf' || ext === '.jpg' || ext === '.jpeg' || ext === '.png';
      return isValidExt;
    });

    return filteredFiles;
  } catch (error) {
    console.error(`Error reading directory: ${error}`);
    return [];
  }
}

export function loadExistingMappings(): Record<string, RenameMapping> {
  const outputPath = path.join(process.cwd(), 'rename-mappings.json');
  debugLog(`📖 Loading mappings from: ${outputPath}`);

  try {
    const content = fs.readFileSync(outputPath, 'utf-8');
    const mappings = JSON.parse(content) as Record<string, RenameMapping>;

    // Filter out unsuccessful mappings
    return Object.fromEntries(
      Object.entries(mappings).filter(([_, mapping]) => mapping.success)
    );
  } catch (error) {
    debugLog(`No existing mappings found or error reading file: ${error}`);
    return {};
  }
}

export async function saveRenameMapping(mapping: RenameMapping | RenameMapping[]) {
  const outputPath = path.join(process.cwd(), 'rename-mappings.json');
  debugLog(`💾 Saving mappings to: ${outputPath}`);

  try {
    // Load existing mappings
    let existingMappings: Record<string, RenameMapping> = {};
    try {
      const content = await fs.promises.readFile(outputPath, 'utf-8');
      existingMappings = JSON.parse(content);
    } catch {
      // If file doesn't exist or is invalid, start with empty mappings
    }

    // Convert single mapping to array
    const mappingsArray = Array.isArray(mapping) ? mapping : [mapping];

    // Merge new mappings with existing ones
    const newMappings = {
      ...existingMappings,
      ...Object.fromEntries(
        mappingsArray.map(m => [m.oldName, m])
      )
    };

    // Write back to file
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(newMappings, null, 2)
    );

    debugLog(`✅ Successfully saved mappings`);
  } catch (error) {
    console.error(`Error saving mappings: ${error}`);
    throw error;
  }
}

export function getRelativeToScanDir(fullPath: string): string {
  const scanDir = getScanDir();
  if (!fullPath.startsWith(scanDir)) {
    return path.basename(fullPath);
  }
  return fullPath.slice(scanDir.length + 1); // +1 to remove the leading slash
} 