import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

// Define a type for PDF metadata
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

export interface PdfDocumentLoadSuccess {
  numPages: number;
  metadata?: any;
}

export interface PdfViewerProps {
  pdfUrl: string;
  pdfTitle?: string;
  pdfId: number;
  existingMetadata?: any;
  onError?: () => void;
}
