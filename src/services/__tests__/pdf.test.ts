import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock debug first, before any other imports
vi.mock('../utils/debug', () => ({
  debug: vi.fn().mockImplementation((msg: string) => console.log(msg))
}))

// Rest of the mocks
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
  createWriteStream: vi.fn(),
}))

vi.mock('pdf-parse', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(async () => ({ text: '' }))
}))

vi.mock('tesseract.js', () => ({
  recognize: vi.fn(),
  createWorker: vi.fn(),
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(() => ({
      getPages: () => ([{
        getSize: () => ({ width: 612, height: 792 }),
        drawText: vi.fn(),
      }]),
      save: vi.fn(() => new Uint8Array()),
    })),
  },
  rgb: vi.fn(() => ({ r: 0, g: 0, b: 0 })),
}))

// Now import everything else
import * as fs from 'fs'
import * as path from 'path'
import { PDFDocument, rgb } from 'pdf-lib'
import * as tesseract from 'tesseract.js'
import { extractTextFromPDF, updatePDFWithOCRText } from '../pdf'
import { debug } from '../utils/debug'
import pdfParse from 'pdf-parse'

describe('PDF Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(debug).mockImplementation(() => { })
  })

  describe('extractTextFromPDF', () => {
    it('should extract text from PDF using pdf-parse', async () => {
      const mockText = 'Sample PDF text'
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from(''))
      vi.mocked(pdfParse).mockResolvedValueOnce({ text: mockText })

      const result = await extractTextFromPDF('test.pdf')
      expect(result).toBe(mockText)
      expect(fs.readFileSync).toHaveBeenCalledWith('test.pdf')
    })

    it('should fall back to OCR if pdf-parse returns empty text', async () => {
      const mockOCRText = 'OCR extracted text'
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from(''))
      vi.mocked(pdfParse).mockResolvedValueOnce({ text: '' })
      vi.mocked(tesseract.recognize).mockResolvedValue({
        data: {
          text: mockOCRText,
          words: [],
          blocks: [],
          confidence: 100,
          lines: [],
          oem: '1',
        }
      })

      const result = await extractTextFromPDF('test.pdf')
      expect(result).toBe(mockOCRText)
    })
  })

  describe('updatePDFWithOCRText', () => {
    const mockWorker = {
      recognize: vi.fn(),
      terminate: vi.fn(),
      load: vi.fn(),
      writeText: vi.fn(),
      readText: vi.fn(),
      removeText: vi.fn(),
      detect: vi.fn(),
      setParameters: vi.fn(),
      initialize: vi.fn(),
      reset: vi.fn(),
    }

    beforeEach(() => {
      vi.mocked(tesseract.createWorker).mockResolvedValue(mockWorker as any)
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.promises.readFile).mockResolvedValue(new Uint8Array())
    })

    it('should create output directory if it doesn\'t exist', async () => {
      mockWorker.recognize.mockResolvedValue({
        data: {
          words: [],
          text: '',
          blocks: [],
          confidence: 100,
          lines: [],
          oem: '1',
        }
      })

      await updatePDFWithOCRText('input.pdf', 'test text')

      expect(fs.existsSync).toHaveBeenCalledWith('out')
      expect(fs.mkdirSync).toHaveBeenCalledWith('out', { recursive: true })
    })

    it('should process OCR text and position it correctly', async () => {
      const mockWords = [{
        text: 'test',
        bbox: { x0: 100, y0: 100, y1: 120 }
      }]

      mockWorker.recognize.mockResolvedValue({
        data: {
          words: mockWords,
          text: '',
          blocks: [],
          confidence: 100,
          lines: [],
          oem: '1',
        }
      })

      const result = await updatePDFWithOCRText('input.pdf', 'test text')

      expect(result).toMatch(/out\/input_ocr\.pdf$/)
      expect(fs.promises.writeFile).toHaveBeenCalled()
      expect(PDFDocument.load).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockWorker.recognize.mockRejectedValue(new Error('OCR failed'))

      await expect(
        updatePDFWithOCRText('input.pdf', 'test text')
      ).rejects.toThrow('Failed to update PDF with OCR text: OCR failed')
    })

    it('should use custom output path when provided', async () => {
      mockWorker.recognize.mockResolvedValue({
        data: {
          words: [],
          text: '',
          blocks: [],
          confidence: 100,
          lines: [],
          oem: '1',
        }
      })

      const customPath = 'custom/output.pdf'
      const result = await updatePDFWithOCRText('input.pdf', 'test text', customPath)

      expect(result).toBe(customPath)
      expect(fs.promises.writeFile).toHaveBeenCalledWith(customPath, expect.any(Uint8Array))
    })
  })
}) 