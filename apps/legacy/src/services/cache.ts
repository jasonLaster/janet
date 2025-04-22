import * as fs from 'fs';
import * as path from 'path';

export interface Cache {
  version: string;
  mappings: {
    [key: string]: {
      originalPath: string;
      newPath: string;
      ocrPath?: string;
    };
  };
}

async function backupCache(cache: Cache, cachePath: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join('output', 'cache');
  const backupPath = path.join(backupDir, `cache-${timestamp}.json`);

  // Ensure backup directory exists
  await fs.promises.mkdir(backupDir, { recursive: true });

  console.log(`Backing up cache to ${backupPath}`);
  // Save backup
  await fs.promises.writeFile(backupPath, JSON.stringify(cache, null, 2));
}

export async function loadCache(cachePath: string): Promise<Cache> {
  try {
    const cacheContent = await fs.promises.readFile(cachePath, 'utf8');
    const cache = JSON.parse(cacheContent);
    return {
      version: cache.version || '1.0',
      mappings: cache.mappings || {}
    };
  } catch {
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
): Promise<Cache> {
  const cache = await loadCache(cachePath);

  // Create backup before making changes
  await backupCache(cache, cachePath);

  cache.mappings[originalPath] = {
    originalPath,
    newPath,
    ...ocrPath && { ocrPath }
  };

  await fs.promises.writeFile(cachePath, JSON.stringify(cache, null, 2));
  return cache;
} 