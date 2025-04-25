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
import { PdfViewerProps } from "./pdf-viewer-types";
import { pdfjs } from "react-pdf";
import { usePDFDocument } from "@/hooks/use-pdf-document";
import { PDF_WORKER_URL } from "./constants";

import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
// Initialize the PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
}

const maxWidth = 800;
const sidebarDefaultWidth = 250;
const sidebarDefaultPercentage = 25;

export function PdfViewer({
  pdfTitle = "Document",
  pdfId,
  pdfMetadata,
  onError,
}: PdfViewerProps) {
  // Updated to match the new hook API, only passing pdfId
  const {
    cachedDocument,
    loading: cacheLoading,
    error: cacheError,
    isCached,
    cachePDFDocument,
  } = usePDFDocument(pdfId);

  // Now cachedDocument is already a base64 string, no conversion needed
  // We just need to format it as a data URL
  const [cachedDocumentUrl, setCachedDocumentUrl] = useState<string | null>(
    null
  );

  // Create a data URL from the cached document when it's available
  useEffect(() => {
    if (cachedDocument) {
      try {
        // Simply prefix the base64 string with the data URL format
        const dataUrl = `data:application/pdf;base64,${cachedDocument}`;
        setCachedDocumentUrl(dataUrl);
      } catch (error) {
        console.error("Error creating data URL from cached document:", error);
        setCachedDocumentUrl(null);
      }
    } else {
      setCachedDocumentUrl(null);
    }
  }, [cachedDocument, pdfId]);

  // Determine if we should show loading state
  const isLoading = cacheLoading;

  // Use the cached document URL if available, otherwise fall back to the provided URL
  const effectivePdfUrl = cachedDocumentUrl || `/api/pdfs/${pdfId}/content`;

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
  const [showTextLayer, setShowTextLayer] = useState<boolean>(true);
  const [isManualPageChange, setIsManualPageChange] = useState<boolean>(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [searchText, setSearchText] = useState<string>("");
  const [documentLoaded, setDocumentLoaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("info");

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

    // Track if we're currently processing a scroll event
    let isProcessingScroll = false;

    const handleScroll = () => {
      // Skip scroll handling if we're in a manual page change
      if (!mainContentRef.current || isManualPageChange) return;

      // Avoid processing scroll events when already processing one
      if (isProcessingScroll) return;

      isProcessingScroll = true;

      // Clear any existing timeout for debouncing scroll events
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      // Use a small timeout to avoid excessive updates while scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        if (!mainContentRef.current) {
          isProcessingScroll = false;
          return;
        }

        // Skip the processing if a manual page change happened while we were waiting
        if (isManualPageChange) {
          isProcessingScroll = false;
          return;
        }

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

          // Update sidebar scroll position to show current page, but don't trigger another page change
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

        isProcessingScroll = false;
        scrollTimeoutRef.current = null;
      }, 250); // Increased debounce time to reduce flickering
    };

    const scrollContainer = mainContentRef.current.parentElement;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    // Initial check after a longer delay to ensure PDF has rendered completely
    const initialCheckTimeout = setTimeout(() => {
      // Only run initial check if not in manual page change mode
      if (!isManualPageChange) {
        handleScroll();
      }
    }, 800);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
      // Clean up timeouts
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      clearTimeout(initialCheckTimeout);
      isProcessingScroll = false;
    };
  }, [mainContentRef, currentPage, numPages, isManualPageChange]);

  useEffect(() => {
    // Reset page number when PDF URL changes
    setCurrentPage(1);
  }, [effectivePdfUrl]);

  function onDocumentLoadSuccess({
    numPages,
    metadata,
  }: {
    numPages: number;
    metadata?: any;
  }) {
    setNumPages(numPages);
    setDocumentLoaded(true);
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
      // Clear any existing timeouts that would reset isManualPageChange
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      // Set flag to prevent scroll detection from overriding manual navigation
      setIsManualPageChange(true);
      setCurrentPage(page);

      // Scroll to the selected page
      if (mainContentRef.current) {
        const targetElement = document.getElementById(`page-${page}`);
        if (targetElement) {
          // Use smooth scrolling for better UX
          targetElement.scrollIntoView({ behavior: "smooth", block: "start" });

          // Reset the manual page change flag after scrolling finishes with a clear reference
          scrollTimeoutRef.current = setTimeout(() => {
            setIsManualPageChange(false);
            scrollTimeoutRef.current = null;
          }, 1000); // Extend to allow time for the scroll animation to complete fully
        } else {
          // If we can't find the target element yet (still loading), wait and try again
          scrollTimeoutRef.current = setTimeout(() => {
            const retryElement = document.getElementById(`page-${page}`);
            if (retryElement) {
              retryElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
            setIsManualPageChange(false);
            scrollTimeoutRef.current = null;
          }, 800);
        }
      } else {
        // If no main content ref, just reset the flag
        scrollTimeoutRef.current = setTimeout(() => {
          setIsManualPageChange(false);
          scrollTimeoutRef.current = null;
        }, 800);
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
    if (
      !effectivePdfUrl.startsWith("http") &&
      !effectivePdfUrl.startsWith("/")
    ) {
      toast({
        title: "Download error",
        description: "Cannot download this PDF",
        variant: "destructive",
      });
      return;
    }

    // Open the PDF in a new tab for download
    window.open(effectivePdfUrl, "_blank");
  };

  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };

  const toggleTextLayer = () => {
    setShowTextLayer((prev) => !prev);
  };

  // Combined effect for cache loading and error handling
  useEffect(() => {
    // Update loading state
    if (cacheLoading) {
      setDocumentLoaded(false);
    }

    // Handle cache errors
    if (cacheError) {
      console.error("Error loading PDF from cache:", cacheError);
      onDocumentLoadError(new Error(cacheError));
    }
  }, [cacheLoading, cacheError, onDocumentLoadError]);

  // Add a new effect to fetch and cache the PDF if not already cached
  useEffect(() => {
    async function fetchAndCachePDF() {
      if (!effectivePdfUrl || !pdfId || isCached || cacheLoading) {
        return;
      }

      // Retry logic for network flakiness
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000; // ms

      const fetchWithRetry = async (attempt = 1): Promise<ArrayBuffer> => {
        try {
          const response = await fetch(effectivePdfUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          }
          return await response.arrayBuffer();
        } catch (error) {
          if (attempt < MAX_RETRIES) {
            console.warn(
              `Fetch attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`
            );
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(attempt + 1);
          }
          throw error;
        }
      };

      try {
        // Attempt fetch with retry logic
        const pdfData = await fetchWithRetry();

        // Cache the fetched PDF
        await cachePDFDocument(pdfData);
      } catch (err) {
        console.error("Error fetching and caching PDF after retries:", err);
        // Could add notification to user here that caching failed
      }
    }

    fetchAndCachePDF();
  }, [effectivePdfUrl, pdfId, isCached, cacheLoading, cachePDFDocument]);

  // If we have a PDF error, show a fallback UI
  if (pdfLoadError) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
          <h2 className="font-medium">
            {pdfMetadata?.descriptiveTitle || pdfTitle}
          </h2>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Open in New Tab
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-gray-100">
          <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="mb-4 text-gray-600">
              Apologies, we couldn't load this PDF.
            </p>
            <Button onClick={handleDownload}>Open PDF in New Tab</Button>
          </div>
        </div>
      </div>
    );
  }

  if (cacheLoading) {
    return null;
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
      ref={setContainerRef}
      className="w-full h-full overflow-hidden flex flex-col"
    >
      <PdfViewerHeader
        title={pdfTitle}
        searchText={searchText}
        metadata={pdfMetadata}
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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Show loading state during cache loading */}

        {!isLoading && (
          <ResizablePanelGroup
            ref={resizablePanelGroupRef}
            direction="horizontal"
            className="w-full h-full"
          >
            {/* Show sidebar only if enabled */}
            {showSidebar && (
              <>
                <ResizablePanel
                  defaultSize={sidebarDefaultPercentage}
                  minSize={15}
                  maxSize={40}
                  className="h-full"
                >
                  <PdfSidebar
                    pdfUrl={effectivePdfUrl}
                    numPages={numPages}
                    currentPage={currentPage}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    goToPage={goToPage}
                    changePage={changePage}
                    pdfMetadata={pdfMetadata}
                    onDocumentLoadSuccess={onDocumentLoadSuccess}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle>
                  <div className="w-3 h-full flex items-center justify-center">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                </ResizableHandle>
              </>
            )}

            {/* Main PDF view */}
            <ResizablePanel className="h-full overflow-hidden">
              {pdfLoadError ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-gray-50">
                  <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Failed to load PDF
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {pdfLoadError || "There was an error loading the document."}
                  </p>
                  <Button onClick={handleDownload}>Open in New Tab</Button>
                </div>
              ) : (
                <div className="relative h-full overflow-auto">
                  <PdfViewerContent
                    pdfUrl={effectivePdfUrl}
                    numPages={numPages}
                    currentPage={currentPage}
                    scale={scale}
                    rotation={rotation}
                    showTextLayer={showTextLayer}
                    isManualPageChange={isManualPageChange}
                    mainContentRef={mainContentRef}
                    pageWidth={pageWidth}
                    onDocumentSuccess={onDocumentLoadSuccess}
                    onDocumentFailed={onDocumentLoadError}
                    onPageChange={goToPage}
                    handleDownload={handleDownload}
                  />

                  {pdfId && documentLoaded && (
                    <FloatingPdfChat
                      pdfId={pdfId}
                      pdfTitle={pdfTitle}
                      pdfUrl={effectivePdfUrl}
                    />
                  )}
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
