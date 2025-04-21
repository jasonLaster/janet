/**
 * Initialize the PDF.js worker
 * @param workerUrl Path to the PDF.js worker file, defaults to '/pdf.worker.min.js'
 */
export function initPdfWorker(workerUrl: string = "/pdf.worker.js") {
  if (typeof window !== "undefined") {
    try {
      // Import pdfjs dynamically to avoid SSR issues
      import("react-pdf").then(({ pdfjs }) => {
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      });
      return true;
    } catch (error) {
      console.error("Failed to initialize PDF.js worker:", error);
      return false;
    }
  }
  return false;
}
