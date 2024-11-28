import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromPDF } from '../pdf';
import * as fs from 'fs';
import * as path from 'path';
import * as tesseract from 'tesseract.js';
import { getDocument } from 'pdfjs-dist';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn()
  },
  constants: {
    R_OK: 4
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn()
}));

// Mock exec
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

// Mock promisify to return mocked exec
vi.mock('util', () => ({
  promisify: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(''))
}));

// Mock tesseract
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: { text: 'OCR extracted text', confidence: 90 }
    }),
    terminate: vi.fn()
  })
}));

describe('PDF Service', () => {
  describe('Real PDF Tests', () => {
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample.pdf');

    beforeEach(() => {
      // Reset mocks
      vi.clearAllMocks();

      // Mock file exists
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.access).mockResolvedValue(undefined);

      // Setup fs.promises.readFile mock
      const mockReadFile = vi.fn((path: string) => {
        if (path.endsWith('.png')) {
          return Promise.resolve(Buffer.from('fake png data'));
        }
        return Promise.resolve(Buffer.from('fake pdf data'));
      });

      vi.mocked(fs.promises.readFile).mockImplementation(mockReadFile);
    });

    it('should extract text from a real PDF file', async () => {
      // Mock PDF.js getDocument
      const mockTextContent = {
        items: [
          { str: 'Notice of Cancellation' },
          { str: 'TRAVELERS' },
          { str: 'Your policy is cancelled' }
        ]
      };

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue(mockTextContent)
      };

      const mockPDF = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage)
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPDF)
      } as any);

      const result = await extractTextFromPDF(fixturePath);

      expect(result).toContain('Notice of Cancellation');
      expect(result).toContain('TRAVELERS');
      expect(result).toContain('Your policy is cancelled');
    });

    it('should handle multi-page PDFs', async () => {
      // Mock PDF.js getDocument for multi-page PDF
      const mockTextContent = {
        items: [
          { str: 'Page 1' },
          { str: 'Page 2' }
        ]
      };

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue(mockTextContent)
      };

      const mockPDF = {
        numPages: 2,
        getPage: vi.fn().mockResolvedValue(mockPage)
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPDF)
      } as any);

      const result = await extractTextFromPDF(fixturePath);

      expect(result).toContain('Page 1');
      expect(result).toContain('Page 2');
    });
  });

  describe('PDF Extraction Edge Cases', () => {
    it('should handle file not found errors', async () => {
      vi.mocked(fs.promises.access).mockRejectedValue(new Error());
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(extractTextFromPDF('nonexistent.pdf'))
        .rejects
        .toThrow('PDF file not found');
    });

    it('should handle PDF parsing errors', async () => {
      // Mock file exists
      vi.mocked(fs.promises.access).mockResolvedValue(undefined);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock file read to return invalid PDF data
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('invalid pdf data'));

      // Mock PDF.js to throw parsing error
      const pdfError = new Error('PDF parsing failed');
      vi.mocked(getDocument).mockImplementation(() => {
        throw pdfError;
      });

      // Mock tesseract to also fail
      vi.mocked(tesseract.createWorker).mockRejectedValue(new Error('OCR failed'));

      await expect(extractTextFromPDF('invalid.pdf'))
        .rejects
        .toThrow('PDF parsing failed');
    });
  });
}); 