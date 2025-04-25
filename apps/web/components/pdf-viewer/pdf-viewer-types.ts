import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

// Define a type for PDF metadata
export interface PdfDocumentLoadSuccess {
  numPages: number;
  metadata?: any;
}

export interface PdfViewerProps {
  pdfUrl: string;
  pdfTitle?: string;
  pdfId: number;
  pdfMetadata?: EnhancedPdfMetadata;
  onError?: () => void;
}
