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
import { PDF_WORKER_URL } from "./constants";
import { usePdfSearch } from "./hooks/use-pdf-search";

import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

// Initialize the PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
}

const maxWidth = 800;
const sidebarDefaultWidth = 280;
const SIDEBAR_DEFAULT_PERCENTAGE = 25;
const SIDEBAR_MIN_PERCENTAGE = 10;
const SIDEBAR_MAX_PERCENTAGE = 60;
const LOCALSTORAGE_KEY = "pdfViewerSidebarSizePercent";

export function PdfViewer({
  pdfTitle = "Document",
  pdfId,
  pdfMetadata,
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
  const [showTextLayer, setShowTextLayer] = useState<boolean>(true);
  const [isManualPageChange, setIsManualPageChange] = useState<boolean>(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [documentLoaded, setDocumentLoaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("info");
  const [sidebarSize, setSidebarSize] = useState<number>(
    SIDEBAR_DEFAULT_PERCENTAGE
  );

  const resizablePanelGroupRef = useRef(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add the search hook
  const {
    keyword: searchKeyword,
    setKeyword: setSearchKeyword,
    matches,
    currentMatchIndex,
    jumpToNextMatch,
    jumpToPreviousMatch,
    clearSearch,
  } = usePdfSearch(mainContentRef, numPages);

  // Calculate header height dynamically
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [headerRef.current?.offsetHeight]); // Re-run if header height changes

  // Add keyboard listener for Enter/Shift+Enter to the main container
  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if the event originates from the search input itself
      // (handled by the input's onKeyDown)
      if ((event.target as HTMLElement)?.closest("#pdf-search-input")) {
        return;
      }
      // Ignore if modifier keys are pressed (except Shift for Shift+Enter)
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation(); // Stop it bubbling further

        if (event.shiftKey) {
          console.log(
            "[Keyboard] Shift+Enter pressed in container, going to previous match"
          );
          jumpToPreviousMatch(headerHeight);
        } else {
          console.log(
            "[Keyboard] Enter pressed in container, going to next match"
          );
          jumpToNextMatch(headerHeight);
        }
      }
    };

    // Use capture phase to potentially intercept before other handlers if needed,
    // but regular bubbling phase is likely fine here.
    mainEl.addEventListener("keydown", handleKeyDown);

    return () => {
      mainEl.removeEventListener("keydown", handleKeyDown);
    };
  }, [mainContentRef, jumpToNextMatch, jumpToPreviousMatch, headerHeight]);

  // Add global listener for Cmd/Ctrl+F to focus search input
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []); // Empty dependency array ensures this runs once on mount

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

  // Re-run search if the document changes (e.g., cached doc loads later)
  useEffect(() => {
    if (documentLoaded) {
      clearSearch();
    }
  }, [documentLoaded, clearSearch]);

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
      }, 150);
    };

    mainContentRef.current?.addEventListener("scroll", handleScroll);
    return () => {
      mainContentRef.current?.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [numPages, isManualPageChange]); // Removed currentPage dependency

  useEffect(() => {
    // Reset page number when PDF ID changes
    setCurrentPage(1);
    setDocumentLoaded(false);
    setPdfLoadError(null);
  }, [pdfId]);

  // Load sidebar size from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSize = localStorage.getItem(LOCALSTORAGE_KEY);
      if (savedSize) {
        try {
          const parsedSize = parseFloat(savedSize);
          // Validate the saved size
          if (
            !isNaN(parsedSize) &&
            parsedSize >= SIDEBAR_MIN_PERCENTAGE &&
            parsedSize <= SIDEBAR_MAX_PERCENTAGE
          ) {
            setSidebarSize(parsedSize);
            console.log(
              `[PdfViewer] Loaded sidebar size from localStorage: ${parsedSize}%`
            );
          }
        } catch (e) {
          console.error("[PdfViewer] Error parsing saved sidebar size:", e);
          localStorage.removeItem(LOCALSTORAGE_KEY); // Clear invalid entry
        }
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleLayout = (sizes: number[]) => {
    if (sizes.length >= 1) {
      const newSidebarSize = sizes[0];
      // Update state and localStorage
      setSidebarSize(newSidebarSize);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCALSTORAGE_KEY, newSidebarSize.toString());
        // Optional: log the save
        // console.log(`[PdfViewer] Saved sidebar size to localStorage: ${newSidebarSize}%`);
      }
    }
  };

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

  // Define the effective URL directly
  const effectivePdfUrl = `/api/pdfs/${pdfId}/content`;

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
      <div ref={headerRef}>
        <PdfViewerHeader
          title={pdfTitle}
          pdfMetadata={pdfMetadata}
          searchText={searchKeyword}
          onSearchChange={setSearchKeyword}
          onJumpToNextMatch={() => jumpToNextMatch(headerHeight)}
          onJumpToPreviousMatch={() => jumpToPreviousMatch(headerHeight)}
          numMatches={matches.length}
          currentMatchIndex={currentMatchIndex}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRotate={handleRotate}
          onDownload={handleDownload}
          onToggleSidebar={toggleSidebar}
          showSidebar={showSidebar}
          onToggleTextLayer={toggleTextLayer}
          showTextLayer={showTextLayer}
          scale={scale}
          ref={headerRef}
          headerHeight={headerHeight}
          searchInputRef={searchInputRef as React.RefObject<HTMLInputElement>}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup
          ref={resizablePanelGroupRef}
          direction="horizontal"
          className="w-full h-full"
          onLayout={handleLayout}
        >
          {/* Show sidebar only if enabled */}
          {showSidebar && (
            <>
              <ResizablePanel
                id="pdf-sidebar-panel"
                order={1}
                defaultSize={sidebarSize}
                minSize={SIDEBAR_MIN_PERCENTAGE}
                maxSize={SIDEBAR_MAX_PERCENTAGE}
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
                  onDocumentLoadSuccess={() => {}}
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
          <ResizablePanel
            id="pdf-content-panel"
            order={2}
            defaultSize={100 - sidebarSize}
            minSize={100 - SIDEBAR_MAX_PERCENTAGE}
            className="h-full overflow-hidden"
          >
            {pdfLoadError ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-gray-50">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Failed to load PDF</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {pdfLoadError || "There was an error loading the document."}
                </p>
                <Button onClick={handleDownload}>Open in New Tab</Button>
              </div>
            ) : (
              <div className="relative h-full overflow-auto bg-gray-100">
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
                  searchKeyword={searchKeyword}
                  matches={matches}
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
      </div>
    </div>
  );
}
