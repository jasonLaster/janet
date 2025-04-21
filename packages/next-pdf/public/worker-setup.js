// This file is used to set up the PDF.js worker.
// It should be imported in your Next.js app's layout or page component.

import { GlobalWorkerOptions } from "pdfjs-dist";

// Set the worker source path
GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

// Export a function to be used in Next.js apps for worker initialization
export function initPdfWorker() {
  // This function can be called in app components to ensure the worker is set up
  return true;
}
