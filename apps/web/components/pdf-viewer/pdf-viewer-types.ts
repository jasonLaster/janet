import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

// Define a type for PDF metadata
export interface PdfDocumentLoadSuccess {
  numPages: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export interface PdfViewerProps {
  pdfUrl: string;
  pdfTitle?: string;
  pdfId: number;
  pdfMetadata?: EnhancedPdfMetadata;
  onError?: () => void;
}
