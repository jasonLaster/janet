import { describe, it, expect } from 'vitest';
import { extractTextFromPDF } from '../../src/services/pdf.js';
import { getScanDir } from '../../src/utils/file.js';
import * as path from 'path';

describe('PDF Service', () => {
  // Test files we know exist in the scan directory
  const testPDFs = {
    // A medical bill that we know has embedded text
    searchable: '2023-07-30 Empire HealthChoice.pdf',
    // A scanned document we know needs OCR
    scanned: '2023-08-15 Scan.pdf',
  };

  // Helper to get full path to test PDFs
  const getTestPDFPath = (filename: string) => path.join(getScanDir(), filename);

  describe('extractTextFromPDF', () => {
    it('should extract text from searchable PDF', async () => {
      const result = await extractTextFromPDF(getTestPDFPath(testPDFs.searchable));

      // Basic validations
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Content-specific validations
      expect(result).toContain('Empire');
      expect(result).toContain('HealthChoice');

      // Log preview for debugging
      console.log('Preview:', result.slice(0, 200).replace(/\n/g, ' '));
      console.log('Characters:', result.length);

      // Show non-printable characters for debugging
      console.log('First 100 chars (hex):', Buffer.from(result.slice(0, 100)).toString('hex'));
    }, 30000);

    it('should handle scanned PDFs using OCR', async () => {
      const result = await extractTextFromPDF(getTestPDFPath(testPDFs.scanned));

      // Basic validations
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Log preview for debugging
      console.log('Preview:', result.slice(0, 200).replace(/\n/g, ' '));
      console.log('Characters:', result.length);
      console.log('First 100 chars (hex):', Buffer.from(result.slice(0, 100)).toString('hex'));
    }, 60000);

    it('should throw error for non-existent PDF', async () => {
      await expect(
        extractTextFromPDF(path.join(getScanDir(), 'non-existent.pdf'))
      ).rejects.toThrow('PDF file not found');
    });
  });
}); 