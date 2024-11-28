import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromPDF, convertPDFPageToImage } from '../../src/services/pdf.js';
import * as fs from 'fs';
import * as path from 'path';
import * as tesseract from 'tesseract.js';
import { getDocument } from 'pdfjs-dist';

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn()
    }
  },
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn()
  }
}));

// Mock tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: { text: 'OCR extracted text', confidence: 90 }
    }),
    terminate: vi.fn()
  })
}));

// Mock child_process exec
vi.mock('util', () => ({
  promisify: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(''))
}));

describe('PDF Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('mock pdf content'));
  });

  describe('extractTextFromPDF', () => {
    it('should extract text from regular PDFs using PDF.js', async () => {
      // Mock PDF.js getDocument
      const mockTextContent = {
        items: [{ str: 'Sample text' }]
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

      const result = await extractTextFromPDF('test.pdf');
      expect(result).toBe('Sample text');
    });

    it('should handle scanned PDFs using OCR', async () => {
      // Mock low confidence for PDF.js to trigger OCR
      const mockTextContent = {
        items: []
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

      const result = await extractTextFromPDF('test.pdf');
      expect(result).toBe('OCR extracted text');
    });

    it('should handle file not found errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(extractTextFromPDF('nonexistent.pdf'))
        .rejects
        .toThrow('PDF file not found');
    });

    it('should handle PDF parsing errors', async () => {
      vi.mocked(getDocument).mockImplementation(() => {
        throw new Error('PDF parsing failed');
      });

      await expect(extractTextFromPDF('invalid.pdf'))
        .rejects
        .toThrow('PDF parsing failed');
    });
  });

  describe('Real PDF Tests', () => {
    it('should extract text from a real PDF file', async () => {
      // Use actual fs module for this test
      vi.unmock('fs');

      const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample.pdf');
      const result = await extractTextFromPDF(fixturePath);

      // Assert specific content we know exists in the Travelers notice
      expect(result).toContain('Notice of Cancellation');
      expect(result).toContain('TRAVELERS');
      expect(result).toContain('Your policy is cancelled');

      // Restore mocks for other tests
      vi.mock('fs');
    });

    it('should handle multi-page PDFs', async () => {
      vi.unmock('fs');

      const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample.pdf');
      const result = await extractTextFromPDF(fixturePath);

      // Test that we got content from multiple pages
      expect(result).toContain('Page 1');
      expect(result).toContain('Page 2');

      vi.mock('fs');
    });

    it('should extract numbers and dates correctly', async () => {
      vi.unmock('fs');

      const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample.pdf');
      const result = await extractTextFromPDF(fixturePath);

      // Test specific formatted data
      expect(result).toContain('612266004'); // Policy number
      expect(result).toContain('FEBRUARY 25, 2024'); // Cancellation date

      vi.mock('fs');
    });
  });
}); 