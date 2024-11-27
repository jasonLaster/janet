import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromPDF } from '../../src/services/pdf.js';
import * as fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist';
import * as pdfParse from 'pdf-parse';
import * as tesseract from 'tesseract.js';

// Mock fs
vi.mock('fs');

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn()
}));

// Mock tesseract.js
vi.mock('tesseract.js', () => ({
  recognize: vi.fn()
}));

describe('PDF Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractTextFromPDF', () => {
    it('should fall back to OCR when text extraction fails', async () => {
      // Mock pdf-parse to throw an error
      vi.mocked(pdfParse.default).mockRejectedValue(new Error('PDF parsing failed'));

      // Mock tesseract to return OCR result
      vi.mocked(tesseract.recognize).mockResolvedValue({
        data: { text: 'OCR Text' }
      });

      const result = await extractTextFromPDF('test.pdf');
      expect(result).toBeDefined();
      expect(result).toBe('OCR Text');
      expect(tesseract.recognize).toHaveBeenCalledWith('test.pdf');
    });
  });
}); 