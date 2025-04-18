"use client";

import React, { useEffect, RefObject } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

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
  showThumbnails: boolean;
  showTextLayer: boolean;
  isManualPageChange: boolean;
  mainContentRef: RefObject<HTMLDivElement>;
  pageWidth: number;
  onDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void;
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
  showThumbnails,
  showTextLayer,
  isManualPageChange,
  mainContentRef,
  pageWidth,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  goToPage,
  changePage,
  handleDownload,
}: PdfViewerContentProps) {
  // Generate array of page numbers for rendering thumbnails
  const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);

  return (
    <>
      {/* Thumbnails sidebar */}
      {showThumbnails && (
        <div className="w-[180px] border-r border-gray-200 bg-gray-50 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-200 bg-gray-100 font-medium text-sm">
            Pages
          </div>
          <ScrollArea className="flex-1 pdf-sidebar-scroll">
            <div className="p-2 space-y-2">
              <Document
                file={pdfUrl}
                options={options}
                loading={
                  <div className="p-4 text-center text-sm text-gray-500">
                    Loading thumbnails...
                  </div>
                }
              >
                {pageNumbers.map((pageNum) => (
                  <div
                    key={`thumb-${pageNum}`}
                    data-page-thumb={pageNum}
                    className={`cursor-pointer p-1 rounded-md transition-colors mb-2 ${
                      currentPage === pageNum
                        ? "bg-blue-100 border border-blue-300"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => goToPage(pageNum)}
                  >
                    <div className="text-center text-xs text-gray-600 mb-1">
                      {pageNum}
                    </div>
                    <Page
                      pageNumber={pageNum}
                      width={thumbnailWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="thumbnail-page"
                      loading={
                        <div className="h-[150px] w-[120px] bg-gray-100 animate-pulse flex items-center justify-center">
                          <span className="text-xs text-gray-400">
                            Loading...
                          </span>
                        </div>
                      }
                    />
                  </div>
                ))}
              </Document>
            </div>
          </ScrollArea>
          {/* Page navigation footer */}
          <div className="p-2 border-t border-gray-200 bg-gray-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <div className="flex items-center gap-1 text-sm">
              <Input
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const page = Number.parseInt(e.target.value);
                  if (page >= 1 && page <= numPages) {
                    goToPage(page);
                  }
                }}
                className="w-12 h-8"
                min={1}
                max={numPages}
              />
              <span>/ {numPages}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => changePage(1)}
              disabled={currentPage >= numPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main PDF viewer */}
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
                <div className="animate-pulse text-gray-500">
                  Loading PDF...
                </div>
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
    </>
  );
}
