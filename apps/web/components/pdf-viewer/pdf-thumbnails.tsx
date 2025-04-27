"use client";

import React from "react";
import { Document, Page } from "react-pdf";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PdfPageNavigation } from "./pdf-page-navigation";
import { DocumentLoader } from "../ui/document-loader";

const thumbnailWidth = 140;

export interface PdfThumbnailsProps {
  pdfUrl: string;
  numPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  changePage: (offset: number) => void;
  onLoadSuccess?: ({
    numPages,
    metadata,
  }: {
    numPages: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any;
  }) => void;
}

export function PdfThumbnails({
  pdfUrl,
  numPages,
  currentPage,
  goToPage,
  changePage,
  onLoadSuccess,
}: PdfThumbnailsProps) {
  // Generate array of page numbers for rendering thumbnails
  const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center py-2 gap-2">
          <Document
            file={pdfUrl}
            onLoadSuccess={onLoadSuccess}
            loading={
              <div className="p-4 text-center text-sm text-gray-500">
                <DocumentLoader mode="small" pulseWidth="w-10" />
              </div>
            }
          >
            {pageNumbers.map((pageNumber) => (
              <div
                key={`thumb-${pageNumber}`}
                data-page-thumb={pageNumber}
                data-testid={`pdf-thumbnail-${pageNumber}`}
                className={`cursor-pointer w-[150px] p-[2px] border rounded transition-colors mb-2 ${
                  pageNumber === currentPage
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-100"
                }`}
                onClick={() => goToPage(pageNumber)}
              >
                <div className="text-center text-xs text-gray-600 mb-1">
                  {pageNumber}
                </div>
                <Page
                  pageNumber={pageNumber}
                  width={thumbnailWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="thumbnail-page"
                  loading={
                    <div className="h-[150px] bg-gray-100 animate-pulse flex items-center justify-center">
                      <span className="text-xs text-gray-400">Loading...</span>
                    </div>
                  }
                />
              </div>
            ))}
          </Document>
        </div>
      </ScrollArea>

      {/* Page navigation footer */}
      <PdfPageNavigation
        currentPage={currentPage}
        numPages={numPages}
        changePage={changePage}
        goToPage={goToPage}
      />
    </div>
  );
}
