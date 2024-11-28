import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadExistingMappings, saveRenameMapping } from '../../src/utils/file.js';
import { debug } from '../../src/utils/debug.js';

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }
}));

// Mock debug
vi.mock('../../src/utils/debug', () => ({
  debug: vi.fn()
}));

describe('File Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadExistingMappings', () => {
    it('should load and parse existing mappings', () => {
      const mockMappings = {
        'test1.pdf': {
          oldName: 'test1.pdf',
          newName: 'new1.pdf',
          success: true,
          timestamp: '2023-01-01',
          content: 'test content',
          needsRename: false
        }
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockMappings));

      const result = loadExistingMappings();
      expect(result).toHaveProperty('test1.pdf');
      expect(result['test1.pdf'].newName).toBe('new1.pdf');
    });

    it('should filter out unsuccessful mappings', () => {
      const mockMappings = {
        'success.pdf': {
          oldName: 'success.pdf',
          newName: 'new-success.pdf',
          success: true,
          timestamp: '2023-01-01',
          needsRename: false
        },
        'failure.pdf': {
          oldName: 'failure.pdf',
          newName: 'new-failure.pdf',
          success: false,
          timestamp: '2023-01-01',
          needsRename: true
        }
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockMappings));

      const result = loadExistingMappings();
      expect(result).toHaveProperty('success.pdf');
      expect(result).not.toHaveProperty('failure.pdf');
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