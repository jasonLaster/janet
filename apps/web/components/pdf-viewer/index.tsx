"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { GripVertical, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FloatingPdfChat } from "@/components/floating-pdf-chat";
import { PdfViewerHeader } from "./pdf-viewer-header";
import { PdfViewerContent } from "./pdf-viewer-content";
import { PdfSidebar } from "./pdf-sidebar";
import { PdfMetadata, PdfViewerProps } from "./pdf-viewer-types";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import { pdfjs } from "react-pdf";

// Initialize the PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;
}

const maxWidth = 800;
const sidebarDefaultWidth = 250;

export function PdfViewer({
  pdfUrl,
  pdfTitle = "Document",
  pdfId,
  existingMetadata,
  onError,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      containerRef.current = node;
    }
  }, []);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showTextLayer, setShowTextLayer] = useState<boolean>(false);
  const [isManualPageChange, setIsManualPageChange] = useState<boolean>(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [searchText, setSearchText] = useState<string>("");
  const [documentLoaded, setDocumentLoaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("info");
  const [pdfMetadata, setPdfMetadata] = useState<PdfMetadata>({});
  const [enhancedMetadata, setEnhancedMetadata] =
    useState<EnhancedPdfMetadata | null>(existingMetadata || null);
  const [metadataError, setMetadataError] = useState<boolean>(false);
  const [isLoadingAiMetadata, setIsLoadingAiMetadata] =
    useState<boolean>(false);
  const resizablePanelGroupRef = useRef(null);

  // Manual resize observer implementation
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Track visible page based on scroll position
  useEffect(() => {
    if (!mainContentRef.current || numPages === 0) return;

    const handleScroll = () => {
      // Skip scroll handling if we're in a manual page change
      if (!mainContentRef.current || isManualPageChange) return;

      // Clear any existing timeout to debounce scroll events
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Use a small timeout to avoid excessive updates while scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        if (!mainContentRef.current) return;

        const pageContainers = Array.from(
          document.querySelectorAll(".pdf-page-container")
        );

        // Find the page that is most visible in the viewport
        let bestVisiblePage = 1;
        let maxVisibleArea = 0;

        for (let i = 0; i < pageContainers.length; i++) {
          const container = pageContainers[i] as HTMLElement;
          const rect = container.getBoundingClientRect();
          const mainContentRect =
            mainContentRef.current.getBoundingClientRect();

          // Calculate how much of the page is visible
          const top = Math.max(rect.top, mainContentRect.top);
          const bottom = Math.min(rect.bottom, mainContentRect.bottom);
          const visibleHeight = Math.max(0, bottom - top);

          // Get page number from element id
          const pageId = container.id;
          const pageNum = parseInt(pageId.replace("page-", ""));

          // Update if this page has more visible area than previous best
          if (visibleHeight > maxVisibleArea) {
            maxVisibleArea = visibleHeight;
            bestVisiblePage = pageNum;
          }
        }

        // Only update when page changes to avoid unnecessary re-renders
        if (bestVisiblePage !== currentPage) {
          setCurrentPage(bestVisiblePage);

          // Update sidebar scroll position to show current page
          const sidebarItem = document.querySelector(
            `[data-page-thumb="${bestVisiblePage}"]`
          );
          if (sidebarItem) {
            sidebarItem.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }
        }
      }, 100); // Short debounce time
    };

    const scrollContainer = mainContentRef.current;
    scrollContainer.addEventListener("scroll", handleScroll);

    // Initial check after a delay to ensure PDF has rendered
    const initialCheckTimeout = setTimeout(handleScroll, 500);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
      // Clean up timeouts
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      clearTimeout(initialCheckTimeout);
    };
  }, [mainContentRef, currentPage, numPages, isManualPageChange]);

  useEffect(() => {
    // Reset page number when PDF URL changes
    setCurrentPage(1);
  }, [pdfUrl]);

  function onDocumentLoadSuccess({
    numPages,
    metadata,
  }: {
    numPages: number;
    metadata?: any;
  }) {
    setNumPages(numPages);
    setDocumentLoaded(true);
    fetchEnhancedMetadata();

    // Extract metadata if available
    if (metadata) {
      const extractedMetadata: PdfMetadata = {};

      // Map common metadata fields
      if (metadata.get("Title"))
        extractedMetadata.title = metadata.get("Title");
      if (metadata.get("Author"))
        extractedMetadata.author = metadata.get("Author");
      if (metadata.get("Subject"))
        extractedMetadata.subject = metadata.get("Subject");
      if (metadata.get("Keywords"))
        extractedMetadata.keywords = metadata.get("Keywords");
      if (metadata.get("Creator"))
        extractedMetadata.creator = metadata.get("Creator");
      if (metadata.get("Producer"))
        extractedMetadata.producer = metadata.get("Producer");
      if (metadata.get("CreationDate")) {
        const date = new Date(metadata.get("CreationDate"));
        extractedMetadata.creationDate = date.toLocaleDateString();
      }
      if (metadata.get("ModDate")) {
        const date = new Date(metadata.get("ModDate"));
        extractedMetadata.modificationDate = date.toLocaleDateString();
      }

      setPdfMetadata(extractedMetadata);
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setPdfLoadError(error.message);

    toast({
      title: "Error loading PDF",
      description: error.message,
      variant: "destructive",
    });

    if (onError) onError();
  }

  const changePage = (offset: number) => {
    const newPageNumber = currentPage + offset;
    if (newPageNumber >= 1 && newPageNumber <= numPages) {
      goToPage(newPageNumber);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      // Set flag to prevent scroll detection from overriding manual navigation
      setIsManualPageChange(true);
      setCurrentPage(page);

      // Scroll to the selected page
      if (mainContentRef.current) {
        const targetElement = document.getElementById(`page-${page}`);
        if (targetElement) {
          // Use smooth scrolling for better UX
          targetElement.scrollIntoView({ behavior: "smooth", block: "start" });

          // Reset the manual page change flag after scrolling finishes
          setTimeout(() => {
            setIsManualPageChange(false);
          }, 800); // Allow time for the scroll animation to complete
        } else {
          // If we can't find the target element yet (still loading), wait and try again
          setTimeout(() => {
            const retryElement = document.getElementById(`page-${page}`);
            if (retryElement) {
              retryElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
            setIsManualPageChange(false);
          }, 500);
        }
      } else {
        // If no main content ref, just reset the flag
        setTimeout(() => {
          setIsManualPageChange(false);
        }, 500);
      }
    }
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  const handleDownload = () => {
    if (!pdfUrl.startsWith("http") && !pdfUrl.startsWith("/")) {
      toast({
        title: "Download error",
        description: "Cannot download this PDF",
        variant: "destructive",
      });
      return;
    }

    // Open the PDF in a new tab for download
    window.open(pdfUrl, "_blank");
  };

  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };

  const toggleTextLayer = () => {
    setShowTextLayer((prev) => !prev);
  };

  // Function to fetch enhanced metadata using OpenAI
  const fetchEnhancedMetadata = useCallback(async () => {
    if (!pdfUrl) return;

    // Skip fetching if we already have metadata
    if (existingMetadata) {
      console.log("Using existing metadata from database");
      setEnhancedMetadata(existingMetadata);
      return;
    }

    setIsLoadingAiMetadata(true);

    try {
      try {
        const response = await fetch("/api/metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pdfUrl, pdfId }),
        });

        if (response.ok) {
          // Server-side extraction succeeded
          const data = await response.json();
          console.log("Server-side metadata extraction succeeded:", data);
          setEnhancedMetadata(data.metadata);
          return;
        }

        // If we get here, the server-side extraction failed
        const errorData = await response.json();
        console.warn("Server-side metadata extraction failed:", errorData);
        throw new Error(errorData.details || "Server-side extraction failed");
      } catch (serverError) {
        console.warn("Falling back to client-side approach:", serverError);
        setMetadataError(true);
        // For client-side fallback, we'll just provide some basic metadata
        // In a real implementation, you could use a client-side ML model or other approach
        console.log("Using client-side fallback for metadata");
      }
    } catch (error) {
      console.error("Failed to extract PDF metadata:", error);
      toast({
        title: "Metadata Analysis Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not analyze the document.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAiMetadata(false);
    }
  }, [pdfUrl, pdfId, existingMetadata, toast]);

  // If we have a PDF error, show a fallback UI
  if (pdfLoadError) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
          <h2 className="font-medium">
            {enhancedMetadata?.descriptiveTitle || pdfTitle}
          </h2>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Open in New Tab
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-gray-100">
          <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">PDF Viewer Issue</h3>
            <p className="mb-4 text-gray-600">
              {`We couldn't load this PDF: ${pdfLoadError}`}
            </p>
            <Button onClick={handleDownload}>Open PDF in New Tab</Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate width to display page with
  const pageWidth = containerWidth
    ? Math.min(
        containerWidth - (showSidebar ? sidebarDefaultWidth : 0),
        maxWidth
      )
    : maxWidth;

  return (
    <div
      data-document-loaded={documentLoaded}
      className="flex flex-col h-full bg-white rounded-lg overflow-hidden"
    >
      {/* Wrap everything in a div with the container ref */}
      <div
        ref={setContainerRef}
        className="w-full h-full flex flex-col overflow-hidden"
      >
        {/* Header */}
        <PdfViewerHeader
          title={pdfTitle}
          enhancedMetadata={enhancedMetadata}
          searchText={searchText}
          onSearchChange={setSearchText}
          onToggleSidebar={toggleSidebar}
          onToggleTextLayer={toggleTextLayer}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRotate={handleRotate}
          onDownload={handleDownload}
          showSidebar={showSidebar}
          showTextLayer={showTextLayer}
          scale={scale}
        />

        {/* Main content area with optional sidebar */}
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 overflow-hidden"
          ref={resizablePanelGroupRef}
        >
          {showSidebar && (
            <>
              <ResizablePanel
                defaultSize={25}
                minSize={20}
                maxSize={40}
                className="bg-gray-50"
              >
                <PdfSidebar
                  pdfUrl={pdfUrl}
                  numPages={numPages}
                  currentPage={currentPage}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  goToPage={goToPage}
                  changePage={changePage}
                  pdfMetadata={pdfMetadata}
                  enhancedMetadata={enhancedMetadata}
                  isLoadingAiMetadata={isLoadingAiMetadata}
                  metadataError={metadataError}
                  onDocumentLoadSuccess={onDocumentLoadSuccess}
                />
              </ResizablePanel>

              <ResizableHandle
                withHandle
                className="opacity-0 hover:opacity-100 transition-opacity"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </ResizableHandle>
            </>
          )}

          <ResizablePanel defaultSize={showSidebar ? 80 : 100}>
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
              onDocumentLoadSuccess={onDocumentLoadSuccess}
              onDocumentLoadError={onDocumentLoadError}
              goToPage={goToPage}
              changePage={changePage}
              handleDownload={handleDownload}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <FloatingPdfChat
        pdfId={parseInt(
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("id") || "0"
            : "0",
          10
        )}
        pdfTitle={pdfTitle}
        pdfUrl={pdfUrl}
        onClose={() => {}}
      />
    </div>
  );
}
