"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import { DocumentLoader } from "../ui/document-loader";
import { PDF_VERSION } from "./constants";
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
  searchText?: string;
  onSearchResultsChange?: (total: number) => void;
  onCurrentMatchChange?: (current: number) => void;
}

interface SearchMatch {
  pageNumber: number;
  element: HTMLElement;
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
  searchText = "",
  onSearchResultsChange,
  onCurrentMatchChange,
}: PdfViewerContentProps) {
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const previousSearchText = useRef(searchText);

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

  // Function to highlight matches in a text layer
  const highlightMatches = (pageNumber: number) => {
    const textLayer = document.querySelector(
      `#page-${pageNumber} .react-pdf__Page__textContent`
    );
    if (!textLayer || !searchText) return [];

    // Remove existing highlights
    const existingHighlights = textLayer.querySelectorAll(".search-highlight");
    existingHighlights.forEach((el) => {
      if (el.parentElement) {
        el.replaceWith(el.textContent || "");
      }
    });

    if (!searchText.trim()) return [];

    const matches: SearchMatch[] = [];
    const spans = textLayer.querySelectorAll('span[role="presentation"]');

    spans.forEach((span) => {
      const text = span.textContent || "";
      if (!text.toLowerCase().includes(searchText.toLowerCase())) return;

      const regex = new RegExp(
        searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );
      let match;
      let lastIndex = 0;
      let newHtml = "";

      while ((match = regex.exec(text)) !== null) {
        newHtml += text.slice(lastIndex, match.index);
        newHtml += `<mark class="search-highlight bg-yellow-200">${match[0]}</mark>`;
        lastIndex = regex.lastIndex;
      }
      newHtml += text.slice(lastIndex);

      span.innerHTML = newHtml;

      const highlights = span.querySelectorAll(".search-highlight");
      highlights.forEach((highlight) => {
        matches.push({
          pageNumber,
          element: highlight as HTMLElement,
        });
      });
    });

    return matches;
  };

  // Update search results when text changes or pages load
  useEffect(() => {
    if (searchText !== previousSearchText.current || allPagesLoaded) {
      previousSearchText.current = searchText;
      const allMatches: SearchMatch[] = [];

      for (let i = 1; i <= numPages; i++) {
        const pageMatches = highlightMatches(i);
        allMatches.push(...pageMatches);
      }

      setSearchMatches(allMatches);
      setCurrentMatchIndex(-1);
      onSearchResultsChange?.(allMatches.length);
      onCurrentMatchChange?.(-1);
    }
  }, [searchText, numPages, allPagesLoaded]);

  // Navigate to next/previous match
  useEffect(() => {
    if (currentMatchIndex >= 0 && searchMatches.length > 0) {
      const match = searchMatches[currentMatchIndex];
      match.element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Add visual indicator for current match
      searchMatches.forEach((m, i) => {
        m.element.classList.toggle("ring-2", i === currentMatchIndex);
        m.element.classList.toggle("ring-blue-500", i === currentMatchIndex);
      });

      onCurrentMatchChange?.(currentMatchIndex);
    }
  }, [currentMatchIndex, searchMatches]);

  // Expose search navigation methods
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (searchMatches.length === 0) return;

        if (e.shiftKey) {
          // Previous match
          setCurrentMatchIndex((prev) =>
            prev <= 0 ? searchMatches.length - 1 : prev - 1
          );
        } else {
          // Next match
          setCurrentMatchIndex((prev) =>
            prev >= searchMatches.length - 1 ? 0 : prev + 1
          );
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchMatches.length]);

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
          onLoadSuccess={(pdf) => {
            onDocumentSuccess(pdf);
          }}
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
                onLoadSuccess={() => {
                  handlePageLoadSuccess(pageNum);
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
                renderTextLayer={showTextLayer}
                renderAnnotationLayer={showTextLayer}
                customTextRenderer={({
                  str,
                  itemIndex,
                }: {
                  str: string;
                  itemIndex: number;
                }) => {
                  return str;
                }}
                className="pdf-page shadow-md mx-auto bg-stone-50!"
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
