"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { DocumentLoader } from "../ui/document-loader";
import { PDF_VERSION } from "./constants";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { SearchMatch } from "./hooks/use-pdf-search";

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/standard_fonts/`,
  disableRange: false,
  disableStream: false,
  disableAutoFetch: false,
};

interface PdfViewerContentProps {
  pdfUrl: string;
  numPages: number;
  scale: number;
  rotation: number;
  pageWidth: number;
  showTextLayer: boolean;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  currentPage: number;
  isManualPageChange: boolean;
  onDocumentSuccess: (pdf: pdfjs.PDFDocumentProxy) => void;
  onDocumentFailed: (error: Error) => void;
}

export function PdfViewerContent({
  pdfUrl,
  numPages,
  scale,
  rotation,
  pageWidth,
  showTextLayer,
  mainContentRef,
  currentPage,
  isManualPageChange,
  onDocumentSuccess,
  onDocumentFailed,
}: PdfViewerContentProps) {
  // Track loading status of all pages
  const loadedPages = useRef<Set<number>>(new Set());
  const [allPagesLoaded, setAllPagesLoaded] = useState(false);

  // Generate array of page numbers for rendering
  const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);

  // Reset loaded pages when document source changes
  useEffect(() => {
    loadedPages.current = new Set();
    setAllPagesLoaded(false);
  }, [pdfUrl, numPages]);

  // Handler for successful page load
  const handlePageLoadSuccess = (pageNum: number) => {
    loadedPages.current.add(pageNum);
    if (numPages > 0 && loadedPages.current.size === numPages) {
      setAllPagesLoaded(true);
    }
  };

  return (
    <div
      data-document-loaded={allPagesLoaded}
      className="w-full h-full overflow-visible bg-stone-50"
    >
      <div
        className="pdf-container w-full relative h-full overflow-y-auto"
        ref={mainContentRef}
      >
        {/* Loading overlay that shows until all pages are loaded */}
        {!allPagesLoaded && numPages > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <DocumentLoader mode="large" />
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={(pdf: unknown) => {
            onDocumentSuccess(pdf as PDFDocumentProxy);
          }}
          loading={<DocumentLoader mode="large" />}
          onLoadError={(error: Error) => {
            onDocumentFailed(error);
          }}
          error={null}
          options={options}
          className="flex flex-col items-center py-2"
        >
          {pageNumbers.map((pageNum) => (
            <div
              key={`page_${pageNum}`}
              className="mb-8 pdf-page-container w-full bg-stone-50"
              id={`page-${pageNum}`}
              style={{ opacity: allPagesLoaded ? 1 : 0 }} // Hide pages until all loaded
            >
              <div className="text-center text-sm text-gray-500 mb-2 bg-white py-1 rounded-t-md shadow-md border-b border-gray-300 px-2 rounded mt-2">
                Page {pageNum} of {numPages}
              </div>
              <Page
                key={`page_${pageNum}`}
                pageNumber={pageNum}
                scale={scale}
                rotate={rotation}
                width={pageWidth}
                loading={null}
                onLoadError={() => {
                  console.error(`Error loading page ${pageNum}`);
                }}
                onLoadSuccess={() => {
                  // Optional: Can be used if specific per-page actions needed on load
                }}
                renderTextLayer={showTextLayer}
                renderAnnotationLayer={showTextLayer}
                className="pdf-page shadow-md mx-auto bg-stone-50!"
                onRenderSuccess={() => {
                  handlePageLoadSuccess(pageNum);
                  // Scroll to the current page ONLY if it's a manual change AND all pages are loaded
                  if (
                    isManualPageChange &&
                    pageNum === currentPage &&
                    allPagesLoaded
                  ) {
                    const element = document.getElementById(`page-${pageNum}`);
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
