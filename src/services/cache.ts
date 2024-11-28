import * as fs from 'fs';

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

  cache.mappings[originalPath] = {
    originalPath,
    newPath,
    ...ocrPath && { ocrPath }
  };

  await fs.promises.writeFile(cachePath, JSON.stringify(cache, null, 2));
  return cache;
} 