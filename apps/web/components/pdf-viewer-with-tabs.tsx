"use client";

import React, {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  AlertTriangle,
  Layers,
  EyeOff,
  Search,
  MoreVertical,
  ArrowLeft,
  FileText,
  Image,
  GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FloatingPdfChat } from "@/components/floating-pdf-chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document, Page, pdfjs } from "react-pdf";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

// Initialize the PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;
}

// Configuration options
const options = {
  cMapUrl: "https://unpkg.com/pdfjs-dist@4.8.69/cmaps/",
  cMapPacked: true,
};

const maxWidth = 800;
const sidebarDefaultWidth = 250;
const thumbnailWidth = 140;

interface PdfViewerWithTabsProps {
  pdfUrl: string;
  pdfTitle?: string;
  onError?: () => void;
}

// Define a type for PDF metadata
interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

// Create a loading fallback component for PDF document
function DocumentLoadingFallback() {
  return (
    <div className="flex flex-col w-full h-full bg-white rounded-lg overflow-hidden animate-pulse">
      <div className="flex items-center justify-between p-2 border-b bg-muted/20">
        <div className="h-6 w-[50%] bg-gray-100 rounded"></div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-[180px] border-r bg-gray-50 p-2 flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded"></div>
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center">
          <div className="w-full max-w-3xl h-[800px] bg-gray-200 rounded mb-4"></div>
          <div className="w-full max-w-3xl h-[800px] bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function PdfViewerWithTabs({
  pdfUrl,
  pdfTitle = "Document",
  onError,
}: PdfViewerWithTabsProps) {
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
  const [activeTab, setActiveTab] = useState<string>("thumbnails");
  const [pdfMetadata, setPdfMetadata] = useState<PdfMetadata>({});
  const [enhancedMetadata, setEnhancedMetadata] =
    useState<EnhancedPdfMetadata | null>(null);
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

    setIsLoadingAiMetadata(true);

    try {
      try {
        const response = await fetch("/api/pdf-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pdfUrl }),
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
  }, [pdfUrl, pdfTitle, toast, pdfMetadata, numPages]);

  // If we have a PDF error, show a fallback UI
  if (pdfLoadError) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
          <h2 className="font-medium">
            {enhancedMetadata?.descriptiveTitle || pdfTitle}
          </h2>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <ExternalLink className="h-4 w-4 mr-1" />
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
            <Button onClick={handleDownload}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open PDF in New Tab
            </Button>
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

  // Generate array of page numbers for rendering thumbnails
  const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);

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
        {/* Header area */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h2 className="font-medium">
              {enhancedMetadata?.descriptiveTitle || pdfTitle}
              <span className="ml-2 text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                {enhancedMetadata?.issuingOrganization}
              </span>
              <span className="ml-2 text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                {enhancedMetadata?.primaryDate}
              </span>
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-8"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleSidebar}>
                  <Layers
                    className={`h-4 w-4 mr-2 ${
                      showSidebar ? "text-blue-500" : ""
                    }`}
                  />
                  {showSidebar ? "Hide sidebar" : "Show sidebar"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTextLayer}>
                  <EyeOff
                    className={`h-4 w-4 mr-2 ${
                      !showTextLayer ? "text-blue-500" : ""
                    }`}
                  />
                  {showTextLayer ? "Hide text layer" : "Show text layer"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4 mr-2" />
                  Zoom out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleZoomIn} disabled={scale >= 3}>
                  <ZoomIn className="h-4 w-4 mr-2" />
                  Zoom in
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRotate}>
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

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
                <Tabs
                  defaultValue="thumbnails"
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full h-full flex flex-col"
                >
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="thumbnails">
                      <Image className="h-4 w-4 mr-1" />
                      <span className="sr-only sm:not-sr-only sm:inline-block text-xs">
                        Pages
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="info">
                      <FileText className="h-4 w-4 mr-1" />
                      <span className="sr-only sm:not-sr-only sm:inline-block text-xs">
                        Info
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="thumbnails"
                    className="flex-1 m-0 overflow-hidden flex flex-col"
                  >
                    <ScrollArea className="flex-1">
                      <div className="flex flex-col items-center py-2 gap-2">
                        <Document
                          file={pdfUrl}
                          options={options}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={
                            <div className="p-4 text-center text-sm text-gray-500">
                              Loading thumbnails...
                            </div>
                          }
                        >
                          {pageNumbers.map((pageNumber) => (
                            <div
                              key={`thumb-${pageNumber}`}
                              data-page-thumb={pageNumber}
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
                    <div className="p-2 border-t border-gray-200 bg-gray-100 flex items-center justify-between mt-auto">
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
                  </TabsContent>

                  <TabsContent
                    value="info"
                    className="flex-1 m-0 overflow-hidden"
                  >
                    <ScrollArea className="h-full">
                      <div className="p-3">
                        {metadataError && (
                          <div className="mb-4 p-2 bg-red-50 rounded-md shadow-sm">
                            <p className="text-red-700">
                              Failed to load metadata.
                            </p>
                          </div>
                        )}
                        <dl className="space-y-2 text-sm">
                          {enhancedMetadata?.summary && (
                            <div>{enhancedMetadata.summary}</div>
                          )}

                          {enhancedMetadata?.labels &&
                            enhancedMetadata.labels.length > 0 && (
                              <div>
                                <dd>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {enhancedMetadata.issuingOrganization && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-violet-100 text-violet-800">
                                        {enhancedMetadata.issuingOrganization}
                                      </span>
                                    )}

                                    {enhancedMetadata.primaryDate && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                        {enhancedMetadata.primaryDate}
                                      </span>
                                    )}

                                    {enhancedMetadata.labels.map(
                                      (label, index) => (
                                        <span
                                          key={index}
                                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                          {label}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </dd>
                              </div>
                            )}

                          {pdfMetadata.author && (
                            <div>
                              <dt className="text-gray-500">Author</dt>
                              <dd>{pdfMetadata.author}</dd>
                            </div>
                          )}

                          {pdfMetadata.subject && (
                            <div>
                              <dt className="text-gray-500">Subject</dt>
                              <dd>{pdfMetadata.subject}</dd>
                            </div>
                          )}

                          {pdfMetadata.creationDate && (
                            <div>
                              <dt className="text-gray-500">Created</dt>
                              <dd>{pdfMetadata.creationDate}</dd>
                            </div>
                          )}

                          {enhancedMetadata?.documentType && (
                            <div>
                              <dt className="text-gray-500">Document Type</dt>
                              <dd>{enhancedMetadata.documentType}</dd>
                            </div>
                          )}

                          {enhancedMetadata?.accountHolder && (
                            <div>
                              <dt className="text-gray-500">Account Holder</dt>
                              <dd>{enhancedMetadata.accountHolder}</dd>
                            </div>
                          )}

                          {enhancedMetadata?.accountDetails && (
                            <div>
                              <dt className="text-gray-500">Account Details</dt>
                              <dd>{enhancedMetadata.accountDetails}</dd>
                            </div>
                          )}

                          {enhancedMetadata?.deadlines && (
                            <div>
                              <dt className="text-gray-500">
                                Deadlines/Action Items
                              </dt>
                              <dd>{enhancedMetadata.deadlines}</dd>
                            </div>
                          )}

                          {enhancedMetadata?.monetaryAmounts &&
                            enhancedMetadata.monetaryAmounts.length > 0 && (
                              <div>
                                <dt className="text-gray-500">
                                  Monetary Amounts
                                </dt>
                                <dd>
                                  <ul className="list-disc list-inside">
                                    {enhancedMetadata.monetaryAmounts.map(
                                      (amount, index) => (
                                        <li key={index}>{amount}</li>
                                      )
                                    )}
                                  </ul>
                                </dd>
                              </div>
                            )}

                          {enhancedMetadata?.otherPeople &&
                            enhancedMetadata.otherPeople.length > 0 && (
                              <div>
                                <dt className="text-gray-500">
                                  Other People Mentioned
                                </dt>
                                <dd>
                                  <ul className="list-disc list-inside">
                                    {enhancedMetadata.otherPeople.map(
                                      (person, index) => (
                                        <li key={index}>{person}</li>
                                      )
                                    )}
                                  </ul>
                                </dd>
                              </div>
                            )}

                          {pdfMetadata.producer && (
                            <div>
                              <dt className="text-gray-500">Producer</dt>
                              <dd>{pdfMetadata.producer}</dd>
                            </div>
                          )}

                          {pdfMetadata.creator && (
                            <div>
                              <dt className="text-gray-500">Creator</dt>
                              <dd>{pdfMetadata.creator}</dd>
                            </div>
                          )}

                          {isLoadingAiMetadata && (
                            <div className="mt-4 text-center text-sm text-gray-500">
                              <div className="animate-pulse">
                                Analyzing document with AI...
                              </div>
                            </div>
                          )}
                        </dl>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
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
            {/* Main PDF viewer */}
            <div
              className="h-full overflow-auto bg-gray-100 pdf-content-scroll w-full"
              ref={mainContentRef}
            >
              <div className="pdf-container w-full h-full">
                <Document
                  file={pdfUrl}
                  options={options}
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
                      <div className="text-red-500 mb-4">
                        Failed to load PDF
                      </div>
                      <Button onClick={handleDownload}>
                        Open PDF in New Tab
                      </Button>
                    </div>
                  }
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Floating Chat Component */}
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
