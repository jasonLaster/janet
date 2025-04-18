"use client";

import React, { RefObject } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";

// Initialize the PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;
}

// Configuration options
const options = {
  cMapUrl: "https://unpkg.com/pdfjs-dist@4.8.69/cmaps/",
  cMapPacked: true,
};

const thumbnailWidth = 150;

export interface PdfViewerContentProps {
  pdfUrl: string;
  numPages: number;
  currentPage: number;
  scale: number;
  rotation: number;
  showTextLayer: boolean;
  isManualPageChange: boolean;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  pageWidth: number;
  onDocumentLoadSuccess: ({
    numPages,
    metadata,
  }: {
    numPages: number;
    metadata?: any;
  }) => void;
  onDocumentLoadError: (error: Error) => void;
  goToPage: (page: number) => void;
  changePage: (offset: number) => void;
  handleDownload: () => void;
}

export function PdfViewerContent({
  pdfUrl,
  numPages,
  currentPage,
  scale,
  rotation,
  showTextLayer,
  isManualPageChange,
  mainContentRef,
  pageWidth,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  handleDownload,
}: PdfViewerContentProps) {
  // Generate array of page numbers for rendering
  const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);

  return (
    <div
      className="flex-1 overflow-auto bg-gray-100 pdf-content-scroll w-full"
      ref={mainContentRef}
    >
      <div className="pdf-container w-full h-full">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center h-full w-full">
              <div className="animate-pulse text-gray-500">Loading PDF...</div>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-full w-full text-center">
              <div className="text-red-500 mb-4">Failed to load PDF</div>
              <Button onClick={handleDownload}>Open PDF in New Tab</Button>
            </div>
          }
          options={options}
          className="w-full"
        >
          {numPages > 0 &&
            pageNumbers.map((pageNum) => (
              <div
                key={`page_${pageNum}`}
                className="mb-8 pdf-page-container w-full"
                id={`page-${pageNum}`}
              >
                <div className="text-center text-sm text-gray-500 mb-2 bg-white py-1 rounded-t-md shadow-md border-b border-gray-300">
                  Page {pageNum} of {numPages}
                </div>
                <Page
                  key={`page_${pageNum}`}
                  pageNumber={pageNum}
                  scale={scale}
                  rotate={rotation}
                  width={pageWidth}
                  loading={
                    <div className="flex items-center justify-center h-[400px] w-full">
                      <div className="animate-pulse text-gray-500">
                        Loading page {pageNum}...
                      </div>
                    </div>
                  }
                  renderTextLayer={showTextLayer}
                  renderAnnotationLayer={showTextLayer}
                  className="pdf-page shadow-md mx-auto"
                  onRenderSuccess={() => {
                    // If this is a manual page change and this is the target page,
                    // ensure it's visible when rendered
                    if (isManualPageChange && pageNum === currentPage) {
                      const element = document.getElementById(
                        `page-${pageNum}`
                      );
                      if (element && mainContentRef.current) {
                        element.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }
                    }
                  }}
                />
              </div>
            ))}
        </Document>
      </div>
    </div>
  );
}
