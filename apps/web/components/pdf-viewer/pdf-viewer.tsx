"use client";

import React, { useState, useRef, useEffect } from "react";
import { PdfViewerHeader } from "./pdf-viewer-header";
import { PdfViewerContent } from "./pdf-viewer-content";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

interface PdfViewerProps {
  pdfUrl: string;
  title: string;
  enhancedMetadata?: EnhancedPdfMetadata | null;
}

export function PdfViewer({ pdfUrl, title, enhancedMetadata }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTextLayer, setShowTextLayer] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isManualPageChange, setIsManualPageChange] = useState(false);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState(800);
  const searchRef = useRef<{ currentText: string }>({ currentText: "" });

  const handleDocumentSuccess = (pdf: any) => {
    console.log("[PdfViewer] Document loaded");
    setNumPages(pdf.numPages);
  };

  const handleDocumentFailed = (error: Error) => {
    console.error("[PdfViewer] Failed to load PDF:", error);
  };

  const handleSearchChange = (value: string) => {
    console.log("[PdfViewer] Search change called with:", {
      value,
      type: typeof value,
      currentSearchText: searchText,
      currentRef: searchRef.current.currentText,
    });

    if (value === "next" || value === "prev") {
      // For navigation, we want to keep the current search text
      setSearchText(value);
    } else {
      setSearchText(value);
      searchRef.current.currentText = value;
    }
  };

  // Add debug effect to track search text changes
  useEffect(() => {
    console.log("[PdfViewer] Search text state changed:", {
      searchText,
      refText: searchRef.current.currentText,
    });
  }, [searchText]);

  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleToggleTextLayer = () => {
    setShowTextLayer(!showTextLayer);
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  };

  const handleRotate = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  const handleDownload = () => {
    window.open(pdfUrl, "_blank");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setIsManualPageChange(true);
  };

  return (
    <div className="flex flex-col h-full">
      <PdfViewerHeader
        title={title}
        enhancedMetadata={enhancedMetadata}
        searchText={searchText}
        onSearchChange={handleSearchChange}
        onToggleSidebar={handleToggleSidebar}
        onToggleTextLayer={handleToggleTextLayer}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onDownload={handleDownload}
        showSidebar={showSidebar}
        showTextLayer={showTextLayer}
        scale={scale}
      />
      <div className="flex-1 overflow-hidden">
        <PdfViewerContent
          pdfUrl={pdfUrl}
          numPages={numPages}
          currentPage={currentPage}
          scale={scale}
          rotation={rotation}
          showTextLayer={showTextLayer}
          isManualPageChange={isManualPageChange}
          mainContentRef={mainContentRef}
          pageWidth={pageWidth}
          onDocumentSuccess={handleDocumentSuccess}
          onDocumentFailed={handleDocumentFailed}
          cachedDocumentUrl={null}
          onPageChange={handlePageChange}
          searchText={searchText}
          onSearchChange={handleSearchChange}
        />
      </div>
    </div>
  );
}
