import { nanoid } from "nanoid";

// Cache constants
const CACHE_NAME = "pdf-cache-v1";
const METADATA_KEY = "pdf-cache-metadata";
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

// Cache metadata structure
interface CacheMetadata {
  totalSize: number;
  entries: {
    [key: string]: {
      id: string;
      size: number;
      lastAccessed: number;
      hasBase64: boolean; // Track if we've stored the base64 version
    };
  };
}

// Initialize cache metadata
let cacheMetadata: CacheMetadata = {
  totalSize: 0,
  entries: {},
};

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Use chunk-based conversion for large files to avoid call stack issues
  // We process in chunks of 1024 bytes to prevent stack overflow errors
  // that can occur when converting very large strings in a single operation
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 1024; // Small enough to avoid stack issues, large enough for efficiency

  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.byteLength));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }

  const base64 = btoa(binary);
  return base64;
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Load cache metadata from localStorage
function loadCacheMetadata(): void {
  try {
    const storedMetadata = localStorage.getItem(METADATA_KEY);
    if (storedMetadata) {
      cacheMetadata = JSON.parse(storedMetadata);
    } else {
      cacheMetadata = { totalSize: 0, entries: {} };
    }
  } catch (error) {
    console.error("Failed to load cache metadata:", error);
    // Reset metadata in case of error
    cacheMetadata = { totalSize: 0, entries: {} };
  }
}

// Save cache metadata to localStorage
function saveCacheMetadata(): void {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(cacheMetadata));
  } catch (error) {
    console.error("Failed to save cache metadata:", error);
  }
}

// Get Cache instance
async function getCache(): Promise<Cache> {
  const cache = await caches.open(CACHE_NAME);
  return cache;
}

// Create a Request object for a PDF (binary)
function createPdfRequest(pdfId: string | number): Request {
  return new Request(`pdf-${pdfId}`);
}

// Create a Request object for a PDF's base64 version
function createPdfBase64Request(pdfId: string | number): Request {
  return new Request(`pdf-base64-${pdfId}`);
}

// Evict least recently used items to make space
async function evictIfNeeded(requiredSize: number): Promise<void> {
  if (cacheMetadata.totalSize + requiredSize <= MAX_CACHE_SIZE) {
    return;
  }

  try {
    // Sort entries by lastAccessed (oldest first)
    const sortedEntries = Object.values(cacheMetadata.entries).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );

    const cache = await getCache();

    let spaceFreed = 0;
    for (const entry of sortedEntries) {
      // Delete both binary and base64 versions from Cache API
      await cache.delete(createPdfRequest(entry.id));
      await cache.delete(createPdfBase64Request(entry.id));

      // Update metadata
      cacheMetadata.totalSize -= entry.size;
      delete cacheMetadata.entries[entry.id];
      spaceFreed += entry.size;
      if (cacheMetadata.totalSize + requiredSize <= MAX_CACHE_SIZE) {
        break;
      }
    }

    saveCacheMetadata();
  } catch (error) {
    console.error("Error evicting cache entries:", error);
  }
}

// Add PDF to cache
export async function cachePDF(
  pdfId: string | number,
  pdfData: ArrayBuffer
): Promise<void> {
  try {
    // Load metadata from localStorage
    loadCacheMetadata();

    const stringId = String(pdfId);
    const size = pdfData.byteLength;

    // Skip if already in cache with same size
    if (
      cacheMetadata.entries[stringId] &&
      cacheMetadata.entries[stringId].size === size
    ) {
      // Just update lastAccessed
      cacheMetadata.entries[stringId].lastAccessed = Date.now();
      saveCacheMetadata();

      return;
    }

    // Make space if needed
    await evictIfNeeded(size);

    // Store binary version
    const response = new Response(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdfData.byteLength),
      },
    });

    // Get cache and store the PDF binary with retry logic
    const cache = await getCache();
    
    // Add retry logic for cache operations
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 500; // ms
    
    let retryCount = 0;
    let success = false;
    
    while (!success && retryCount < MAX_RETRIES) {
      try {
        await cache.put(createPdfRequest(stringId), response.clone()); // Need to clone for retries
        success = true;
      } catch (err) {
        retryCount++;
        if (retryCount >= MAX_RETRIES) throw err;
        
        console.warn(`Cache put attempt ${retryCount} failed, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }

    // We don't store base64 here initially to avoid the cost on the critical path
    // It will be created and stored on first retrieval

    // Update metadata
    cacheMetadata.entries[stringId] = {
      id: stringId,
      size,
      lastAccessed: Date.now(),
      hasBase64: false,
    };
    cacheMetadata.totalSize += size;

    // Save updated metadata to localStorage
    saveCacheMetadata();
  } catch (error) {}
}

// Get PDF from cache and convert to base64 for react-pdf
export async function getPDFFromCache(
  pdfId: string | number
): Promise<string | null> {
  try {
    // Quick check in metadata first
    loadCacheMetadata();
    const stringId = String(pdfId);

    // If not in metadata, return null quickly
    if (!cacheMetadata.entries[stringId]) {
      return null;
    }

    // Update last accessed time
    cacheMetadata.entries[stringId].lastAccessed = Date.now();
    saveCacheMetadata();

    // Check if base64 version exists
    const cache = await getCache();
    
    // Add retry logic for cache operations
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 500; // ms
    
    // Helper function for retry logic on cache reads
    const matchWithRetry = async (request: Request): Promise<Response | undefined> => {
      let retryCount = 0;
      
      while (retryCount < MAX_RETRIES) {
        try {
          const response = await cache.match(request);
          return response || undefined;
        } catch (err) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) return undefined;
          
          console.warn(`Cache match attempt ${retryCount} failed, retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
      
      return undefined;
    };
    
    if (cacheMetadata.entries[stringId].hasBase64) {
      // Try to get the base64 version first (fastest path)
      const base64Response = await matchWithRetry(createPdfBase64Request(stringId));

      if (base64Response) {
        const base64 = await base64Response.text();
        return base64;
      }

      // If it was supposed to be there but wasn't, update metadata
      cacheMetadata.entries[stringId].hasBase64 = false;
      saveCacheMetadata();
    }

    // If we get here, we need to get the binary and convert to base64
    const response = await matchWithRetry(createPdfRequest(stringId));

    if (!response) {
      // Remove from metadata if not found in cache
      delete cacheMetadata.entries[stringId];
      saveCacheMetadata();

      return null;
    }

    // Get the PDF data as ArrayBuffer
    const pdfBuffer = await response.arrayBuffer();

    // Convert to base64 for react-pdf
    const base64 = arrayBufferToBase64(pdfBuffer);

    // Store the base64 version for future retrievals with retry
    try {
      const base64Response = new Response(base64, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
      
      // Reuse retry logic for storing the base64 version
      let retryCount = 0;
      let success = false;
      
      while (!success && retryCount < MAX_RETRIES) {
        try {
          await cache.put(createPdfBase64Request(stringId), base64Response.clone());
          success = true;
        } catch (err) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) throw err;
          
          console.warn(`Base64 cache put attempt ${retryCount} failed, retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }

      // Update metadata to indicate we have a base64 version
      cacheMetadata.entries[stringId].hasBase64 = true;
      saveCacheMetadata();
    } catch (error) {
      // Continue anyway, as we already have the base64 for this request
      console.warn("Failed to store base64 version in cache:", error);
    }

    return base64;
  } catch (error) {
    return null;
  }
}

// Clear entire cache
export async function clearCache(): Promise<void> {
  try {
    const cache = await getCache();
    const keys = await cache.keys();

    // Delete all entries
    for (const key of keys) {
      await cache.delete(key);
    }

    // Reset metadata
    cacheMetadata = { totalSize: 0, entries: {} };
    saveCacheMetadata();
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

// Get cache stats
export async function getCacheStats(): Promise<{
  totalSize: number;
  entryCount: number;
  percentUsed: number;
}> {
  loadCacheMetadata();

  return {
    totalSize: cacheMetadata.totalSize,
    entryCount: Object.keys(cacheMetadata.entries).length,
    percentUsed: (cacheMetadata.totalSize / MAX_CACHE_SIZE) * 100,
  };
}
