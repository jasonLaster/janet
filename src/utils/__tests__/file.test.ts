import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadExistingMappings, saveRenameMapping } from '../file.js';
import { debugLog } from '../debug.js';

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
vi.mock('../debug', () => ({
  debugLog: vi.fn()
}));

describe('File Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadExistingMappings', () => {
    it('should load and parse existing mappings', () => {
      const mockMappings = {
        'test.pdf': {
          success: true,
          oldName: 'test.pdf',
          newName: 'new-test.pdf',
          content: 'test content'
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockMappings));

      const result = loadExistingMappings();
      expect(result).toEqual(mockMappings);
    });
  });

  describe('saveRenameMapping', () => {
    it('should save new mappings and merge with existing ones', async () => {
      const existingMappings = {
        'existing.pdf': {
          oldName: 'existing.pdf',
          newName: 'new-existing.pdf',
          success: true,
          timestamp: '2023-01-01',
          needsRename: false
        }
      };

      const newMapping = {
        oldName: 'test.pdf',
        newName: 'new-test.pdf',
        success: true,
        timestamp: '2023-01-02',
        content: 'test content',
        needsRename: false
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMappings));

      await saveRenameMapping(newMapping);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1].toString());

      expect(writtenContent).toHaveProperty('existing.pdf');
      expect(writtenContent).toHaveProperty('test.pdf');
      expect(writtenContent['test.pdf']).toEqual(newMapping);
    });
  });
});