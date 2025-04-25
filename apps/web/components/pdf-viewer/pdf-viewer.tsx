"use client";

import React, { useState, useRef } from "react";
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

  const handleDocumentSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
  };

  const handleDocumentFailed = (error: Error) => {
    console.error("Failed to load PDF:", error);
  };

  const handleSearchChange = (value: string) => {
    if (value === "next" || value === "prev") {
      // Handle navigation
      setSearchText(value);
      // Reset after navigation
      setTimeout(() => setSearchText(searchText), 0);
    } else {
      setSearchText(value);
    }
  };

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
