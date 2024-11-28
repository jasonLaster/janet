import * as path from 'path';
import * as fs from 'fs';
import { getScanDir } from '../utils/file.js';
import { extractTextFromPDF } from './pdf.js';
import { suggestNewName } from './openai.js';
import { performOCR } from './ocr.js';
import { debugLog as debug } from '../utils/debug.js';

export interface ProcessResult {
  success: boolean;
  error?: string;
  oldName: string;
  newName: string;
  content: string;
  tempPath?: string;
}

export async function processFile(filename: string): Promise<ProcessResult> {
  const filepath = path.join(getScanDir(), filename);

  try {
    // Try normal text extraction first
    try {
      const content = await extractTextFromPDF(filepath);
      if (content) {
        debug('Successfully extracted text directly from PDF');
        const newName = await suggestNewName(filename, content);
        return {
          success: true,
          oldName: filename,
          newName: newName || filename,
          content
        };
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'NoTextContentError') {
        throw error;
      }
      debug('No text content found, falling back to OCR');
    }

    // Fall back to OCR
    const ocrResult = await performOCR(filepath);

    if (!ocrResult.success) {
      throw new Error(ocrResult.error);
    }

    const newName = await suggestNewName(filename, ocrResult.text);

    return {
      success: true,
      oldName: filename,
      newName: newName || filename,
      content: ocrResult.text,
      tempPath: ocrResult.searchablePdfPath
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug(`Error processing ${filename}: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      oldName: filename,
      newName: filename,
      content: ''
    };
  }
} 