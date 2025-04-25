"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import { DocumentLoader } from "../ui/document-loader";
import { PDF_VERSION } from "./constants";

interface TextMatch {
  pageIndex: number;
  itemIndex: number;
  start: number;
  end: number;
  id: string;
}

interface TextChunk {
  text: string;
  isMatch: boolean;
  id?: string;
}

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/standard_fonts/`,
  disableRange: false,
  disableStream: false,
  disableAutoFetch: false,
};

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
  onDocumentSuccess: (pdf: any) => void;
  onDocumentFailed: (error: Error) => void;
  cachedDocumentUrl: string | null;
  onPageChange?: (page: number) => void;
  isCached?: boolean;
  loading?: boolean;
  handleDownload?: () => void;
  searchText: string;
  onSearchChange: (action: string) => void;
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
  onDocumentSuccess,
  onDocumentFailed,
  cachedDocumentUrl,
  onPageChange,
  isCached,
  loading,
  handleDownload,
  searchText,
  onSearchChange,
}: PdfViewerContentProps) {
  const [textItems, setTextItems] = useState<
    Array<{ pageIndex: number; items: Array<{ str: string }> }>
  >([]);
  const [allMatches, setAllMatches] = useState<TextMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Using cached URL if available, otherwise falling back to the direct URL
  const documentSource = cachedDocumentUrl || pdfUrl;
  const hasValidSource =
    !!documentSource &&
    (documentSource.startsWith("http") ||
      documentSource.startsWith("blob:") ||
      documentSource.startsWith("data:"));

  // Track loading status of all pages
  const loadedPages = useRef<Set<number>>(new Set());
  const [allPagesLoaded, setAllPagesLoaded] = useState(false);

  // Generate array of page numbers for rendering
  const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);

  // Reset loaded pages when document source changes
  useEffect(() => {
    loadedPages.current = new Set();
    setAllPagesLoaded(false);
  }, [documentSource, numPages]);

  // Handler for successful page load
  const handlePageLoadSuccess = (pageNum: number) => {
    loadedPages.current.add(pageNum);
    if (numPages > 0 && loadedPages.current.size === numPages) {
      setAllPagesLoaded(true);
    }
  };

  // Extract text content when document loads
  const handleDocumentSuccess = async (pdf: any) => {
    onDocumentSuccess(pdf);
    const totalPages = pdf.numPages;
    const promises = [];
    for (let i = 1; i <= totalPages; i++) {
      promises.push(pdf.getPage(i).then((page: any) => page.getTextContent()));
    }
    const textContents = await Promise.all(promises);
    const items = textContents.map((tc, index) => ({
      pageIndex: index,
      items: tc.items,
    }));
    setTextItems(items);
  };

  // Find matches when search text changes
  useEffect(() => {
    if (searchText && textItems.length > 0) {
      const matches: TextMatch[] = [];
      let matchId = 0;
      textItems.forEach((pageItems, pageIndex) => {
        pageItems.items.forEach((item, itemIndex) => {
          let start = 0;
          while (true) {
            const pos = item.str
              .toLowerCase()
              .indexOf(searchText.toLowerCase(), start);
            if (pos === -1) break;
            const end = pos + searchText.length;
            matches.push({
              pageIndex,
              itemIndex,
              start: pos,
              end,
              id: `match-${matchId}`,
            });
            matchId++;
            start = end;
          }
        });
      });
      setAllMatches(matches);
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
        if (onPageChange) {
          onPageChange(matches[0].pageIndex + 1);
        }
      } else {
        setCurrentMatchIndex(-1);
      }
    } else {
      setAllMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [searchText, textItems]);

  // Handle search navigation
  useEffect(() => {
    if (searchText === "next" && currentMatchIndex < allMatches.length - 1) {
      const nextIndex = currentMatchIndex + 1;
      setCurrentMatchIndex(nextIndex);
      if (onPageChange) {
        onPageChange(allMatches[nextIndex].pageIndex + 1);
      }
    } else if (searchText === "prev" && currentMatchIndex > 0) {
      const prevIndex = currentMatchIndex - 1;
      setCurrentMatchIndex(prevIndex);
      if (onPageChange) {
        onPageChange(allMatches[prevIndex].pageIndex + 1);
      }
    }
  }, [searchText]);

  // Custom text renderer that returns string but adds data attributes for highlighting
  const customTextRenderer = ({
    str,
    itemIndex,
  }: {
    str: string;
    itemIndex: number;
  }): string => {
    const matchesForThisItem = allMatches
      .filter(
        (m) => m.pageIndex === currentPage - 1 && m.itemIndex === itemIndex
      )
      .sort((a, b) => a.start - b.start);

    if (matchesForThisItem.length === 0) {
      return str;
    }

    // Add a special class to the text container
    const container = document.querySelector(`.textLayer`);
    if (container) {
      container.classList.add("search-enabled");
    }

    // Return the original string - highlighting will be handled by CSS
    matchesForThisItem.forEach((match) => {
      const textElement = document.querySelector(
        `[data-item-index="${itemIndex}"]`
      );
      if (textElement) {
        textElement.setAttribute("data-match-id", match.id);
        textElement.setAttribute(
          "data-is-current",
          (
            currentMatchIndex >= 0 &&
            allMatches[currentMatchIndex].id === match.id
          ).toString()
        );
      }
    });

    return str;
  };

  // Add styles for search highlighting
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .textLayer.search-enabled [data-match-id] {
        background-color: #FEF9C3;
      }
      .textLayer.search-enabled [data-is-current="true"] {
        background-color: #FCD34D;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!hasValidSource) {
    return (
      <div className="w-full h-full overflow-visible" ref={mainContentRef}>
        <div className="pdf-container w-full bg-stone-50">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No valid PDF source available</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-document-loaded={allPagesLoaded}
      className="w-full h-full overflow-visible bg-stone-50"
      ref={mainContentRef}
    >
      <div className="pdf-container w-full relative">
        {/* Loading overlay that shows until all pages are loaded */}
        {!allPagesLoaded && numPages > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <DocumentLoader mode="large" />
          </div>
        )}
        <Document
          file={documentSource}
          onLoadSuccess={handleDocumentSuccess}
          loading={<DocumentLoader mode="large" />}
          onLoadError={(error) => {
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
              style={{ opacity: allPagesLoaded ? 1 : 0 }}
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
                onLoadError={() => {}}
                onLoadSuccess={() => {}}
                renderTextLayer={showTextLayer}
                renderAnnotationLayer={showTextLayer}
                customTextRenderer={customTextRenderer}
                className="pdf-page shadow-md mx-auto bg-stone-50!"
                onRenderSuccess={() => {
                  handlePageLoadSuccess(pageNum);
                  if (
                    (isManualPageChange || currentMatchIndex >= 0) &&
                    pageNum === currentPage &&
                    allPagesLoaded
                  ) {
                    const element = document.getElementById(`page-${pageNum}`);
                    if (element && mainContentRef.current) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });

                      // Scroll to current match if exists
                      if (currentMatchIndex >= 0) {
                        const match = allMatches[currentMatchIndex];
                        if (match.pageIndex === pageNum - 1) {
                          const matchElement = document.getElementById(
                            match.id
                          );
                          if (matchElement) {
                            matchElement.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        }
                      }
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
