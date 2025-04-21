// Only import components with conditional check for browser environment to avoid SSR issues
let PdfViewer;
let PdfViewerContext;
let PdfViewerProvider;
let usePdfViewerContext;
let usePdfDocument;

// Safe exports that don't depend on browser APIs
export { initPdfWorker } from './utils';
export type * from './types';

// Only import components in a browser environment
if (typeof window !== 'undefined') {
  // Re-export components
  PdfViewer = require('./components/pdf-viewer');
  
  // Export context and provider
  const contextExports = require('./context/pdf-viewer-context');
  PdfViewerContext = contextExports.PdfViewerContext;
  PdfViewerProvider = contextExports.PdfViewerProvider;
  usePdfViewerContext = contextExports.usePdfViewerContext;
  
  // Export hooks
  const hookExports = require('./hooks/use-pdf-document');
  usePdfDocument = hookExports.usePdfDocument;
}

export {
  PdfViewer,
  PdfViewerContext,
  PdfViewerProvider,
  usePdfViewerContext,
  usePdfDocument
};