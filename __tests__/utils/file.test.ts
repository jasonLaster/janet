import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadExistingMappings, saveRenameMapping } from '../../src/utils/file.js';
import { debugLog } from '../../src/utils/debug.js';

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }
}));

// Mock debug
vi.mock('../../src/utils/debug', () => ({
  debugLog: vi.fn()
}));

describe('File Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ... rest of the test file content ...
}); 