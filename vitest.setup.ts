import { vi } from 'vitest'
import * as path from 'path'

// Mock PDF.js
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {
    workerSrc: path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.js')
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