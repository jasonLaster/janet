import * as fs from 'fs';
import * as path from 'path';
import { debugLog as debug } from './debug';
import { RenameMapping } from '../types';

const MAPPINGS_FILE = 'rename-mappings.json';

function expandPath(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return filepath.replace('~', process.env.HOME || '');
  }
  return filepath;
}

export function getScanDir(): string {
  const baseDir = process.env.SCAN_DIR || '~/My Drive (jason.laster.11@gmail.com)/LastPech/Scans/';
  return expandPath(baseDir);
}

export function loadExistingMappings(): RenameMapping[] {
  try {
    if (fs.existsSync(MAPPINGS_FILE)) {
      const content = fs.readFileSync(MAPPINGS_FILE, 'utf8');
      const data = JSON.parse(content);
      return data;
    }
  } catch (error) {
    debug('Error loading mappings:', error);
  }
  return [];
}

export async function saveRenameMapping(mapping: RenameMapping): Promise<void> {
  try {
    const existingMappings = loadExistingMappings();

    // Find and update existing mapping or add new one
    const index = existingMappings.findIndex(m =>
      m.oldName === mapping.oldName || m.newName === mapping.newName
    );

    if (index >= 0) {
      existingMappings[index] = mapping;
    } else {
      existingMappings.push(mapping);
    }

    await fs.promises.writeFile(
      MAPPINGS_FILE,
      JSON.stringify(existingMappings, null, 2)
    );
  } catch (error) {
    debug('Error saving mapping:', error);
    throw error;
  }
}

export function getFilenames(): string[] {
  const dir = getScanDir();
  return fs.readdirSync(dir)
    .filter(filename => filename.endsWith('.pdf'));
} 