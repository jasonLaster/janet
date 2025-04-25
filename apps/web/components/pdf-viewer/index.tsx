"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FloatingPdfChat } from "@/components/floating-pdf-chat";
import { PdfViewerHeader } from "./pdf-viewer-header";
import { ReactPdfViewerWrapper } from "../react-pdf-viewer/react-pdf-viewer-wrapper";
import { PdfMetadata, PdfViewerProps } from "./pdf-viewer-types";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import useSWR, { preload } from "swr";
import { PDF_WORKER_URL } from "./constants";
import { type DocumentLoadEvent } from "@react-pdf-viewer/core";
import { usePDFDocument } from "@/hooks/use-pdf-document";

const maxWidth = 800;
const sidebarDefaultWidth = 250;
const sidebarDefaultPercentage = 25;

export function PdfViewer({
  pdfUrl,
  pdfTitle = "Document",
  pdfId,
  existingMetadata,
  onError,
}: PdfViewerProps) {
  const {
    cachedDocument,
    loading: cacheLoading,
    error: cacheError,
    isCached,
    cachePDFDocument,
  } = usePDFDocument(pdfId);

  const [cachedDocumentUrl, setCachedDocumentUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (cachedDocument) {
      try {
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

  const isLoading = cacheLoading;

  const effectivePdfUrl = cachedDocumentUrl || pdfUrl;

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
  const [showTextLayer, setShowTextLayer] = useState<boolean>(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [searchText, setSearchText] = useState<string>("");
  const searchRef = useRef<{
    jumpToNext: () => void;
    jumpToPrevious: () => void;
  } | null>(null);
  const [documentLoaded, setDocumentLoaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("info");
  const [pdfMetadata, setPdfMetadata] = useState<PdfMetadata>({});
  const [enhancedMetadata, setEnhancedMetadata] =
    useState<EnhancedPdfMetadata | null>(existingMetadata || null);
  const [metadataError, setMetadataError] = useState<boolean>(false);
  const [isLoadingAiMetadata, setIsLoadingAiMetadata] =
    useState<boolean>(false);
  const resizablePanelGroupRef = useRef(null);

  const metadataFetcher = useCallback(
    async (
      url: string,
      { pdfUrl, pdfId }: { pdfUrl: string; pdfId?: string | number }
    ) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000;

      const fetchWithRetry = async (attempt = 1) => {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ pdfUrl, pdfId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.details || "Server-side extraction failed"
            );
          }

          return response.json();
        } catch (error) {
          if (
            attempt < MAX_RETRIES &&
            !(error instanceof Error && error.message.includes("Server-side"))
          ) {
            console.warn(
              `Metadata fetch attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(attempt + 1);
          }
          throw error;
        }
      };

      return fetchWithRetry();
    },
    []
  );

  const {
    data: metadataResponse,
    error: metadataFetchError,
    isLoading: isMetadataLoading,
  } = useSWR(
    pdfUrl && pdfId && !existingMetadata
      ? ["/api/metadata", { pdfUrl, pdfId }]
      : null,
    ([url, params]) => metadataFetcher(url, params),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      shouldRetryOnError: true,
    }
  );

  const prefetchMetadata = useCallback(() => {
    if (pdfUrl && pdfId && !existingMetadata) {
      preload(["/api/metadata", { pdfUrl, pdfId }], ([url, params]) =>
        metadataFetcher(url, params)
      );
    }
  }, [pdfUrl, pdfId, existingMetadata, metadataFetcher]);

  useEffect(() => {
    if (metadataResponse?.metadata) {
      setEnhancedMetadata(metadataResponse.metadata);
    }

    setIsLoadingAiMetadata(isMetadataLoading);

    if (metadataFetchError) {
      console.error("Failed to fetch metadata:", metadataFetchError);
      setMetadataError(true);

      toast({
        title: "Metadata Analysis Failed",
        description:
          metadataFetchError.message || "Could not analyze the document.",
        variant: "destructive",
      });
    }
  }, [metadataResponse, metadataFetchError, isMetadataLoading, toast]);

  useEffect(() => {
    if (cacheLoading) {
      setDocumentLoaded(false);
    }

    if (cacheError) {
      console.error("Error loading PDF from cache:", cacheError);
      onError?.();
    }
  }, [cacheLoading, cacheError, onError]);

  useEffect(() => {
    async function fetchAndCachePDF() {
      if (!pdfUrl || !pdfId || isCached || cacheLoading) {
        return;
      }

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000;

      const fetchWithRetry = async (attempt = 1): Promise<ArrayBuffer> => {
        try {
          const response = await fetch(pdfUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          }
          return await response.arrayBuffer();
        } catch (error) {
          if (attempt < MAX_RETRIES) {
            console.warn(
              `Fetch attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(attempt + 1);
          }
          throw error;
        }
      };

      try {
        const pdfData = await fetchWithRetry();

        await cachePDFDocument(pdfData);
      } catch (err) {
        console.error("Error fetching and caching PDF after retries:", err);
      }
    }

    fetchAndCachePDF();
  }, [pdfUrl, pdfId, isCached, cacheLoading, cachePDFDocument]);

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

  useEffect(() => {
    // Reset page number when PDF URL changes
    setCurrentPage(1);
  }, [pdfUrl]);

  const handleDocumentLoad = useCallback(
    async (event: DocumentLoadEvent) => {
      console.log("[PdfViewer] Document loaded (react-pdf-viewer)", {
        numPages: event.doc.numPages,
      });
      setNumPages(event.doc.numPages);
      setPdfLoadError(null);
      setDocumentLoaded(true);

      try {
        const pdfJsMetadata = await event.doc.getMetadata();
        if (pdfJsMetadata && pdfJsMetadata.info) {
          console.log("[PdfViewer] Extracted Metadata:", pdfJsMetadata.info);
          const extractedMetadata: PdfMetadata = {};

          if (pdfJsMetadata.info.Title)
            extractedMetadata.title = pdfJsMetadata.info.Title;
          if (pdfJsMetadata.info.Author)
            extractedMetadata.author = pdfJsMetadata.info.Author;
          if (pdfJsMetadata.info.Subject)
            extractedMetadata.subject = pdfJsMetadata.info.Subject;
          if (pdfJsMetadata.info.Keywords)
            extractedMetadata.keywords = pdfJsMetadata.info.Keywords;
          if (pdfJsMetadata.info.Creator)
            extractedMetadata.creator = pdfJsMetadata.info.Creator;
          if (pdfJsMetadata.info.Producer)
            extractedMetadata.producer = pdfJsMetadata.info.Producer;
          if (pdfJsMetadata.info.CreationDate) {
            const dateStr = pdfJsMetadata.info.CreationDate.replace(
              /^D:/,
              ""
            ).substring(0, 8);
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            extractedMetadata.creationDate = `${month}/${day}/${year}`;
          }
          if (pdfJsMetadata.info.ModDate) {
            const dateStr = pdfJsMetadata.info.ModDate.replace(
              /^D:/,
              ""
            ).substring(0, 8);
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            extractedMetadata.modificationDate = `${month}/${day}/${year}`;
          }

          setPdfMetadata(extractedMetadata);
        } else {
          console.log("[PdfViewer] No metadata found in PDF.");
          setPdfMetadata({});
        }
      } catch (error) {
        console.error("[PdfViewer] Error fetching PDF metadata:", error);
        setPdfMetadata({});
      }

      if (pdfUrl && !cachedDocumentUrl) {
        console.warn(
          "[PdfViewer] Caching logic needs review for react-pdf-viewer"
        );
      }

      if (currentPage > event.doc.numPages) {
        setCurrentPage(1);
      }

      if (!enhancedMetadata) {
        prefetchMetadata();
      }
    },
    [pdfUrl, cachedDocumentUrl, currentPage, enhancedMetadata, prefetchMetadata]
  );

  const handlePageChange = useCallback((page: number) => {
    console.log(`[PdfViewer] Page changed to: ${page}`);
    setCurrentPage(page);
  }, []);

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

    window.open(pdfUrl, "_blank");
  };

  const toggleTextLayer = () => {
    setShowTextLayer((prev) => !prev);
  };

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
            <p className="mb-4 text-gray-600">
              Apologies, we couldn't load this PDF.
            </p>
            <Button onClick={handleDownload}>Open PDF in New Tab</Button>
          </div>
        </div>
      </div>
    );
  }

  const pageWidth = containerWidth
    ? Math.min(
        containerWidth - (showTextLayer ? sidebarDefaultWidth : 0),
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
        enhancedMetadata={enhancedMetadata}
        searchText={searchText}
        onSearchChange={setSearchText}
        onToggleTextLayer={toggleTextLayer}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onDownload={handleDownload}
        showTextLayer={showTextLayer}
        scale={scale}
      />

      <div className="flex-1 flex overflow-hidden">
        {pdfLoadError ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-gray-50">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load PDF</h3>
            <p className="text-sm text-gray-500 mb-4">
              {pdfLoadError || "There was an error loading the document."}
            </p>
            <Button onClick={handleDownload}>Open in New Tab</Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-gray-50">
            <p className="text-center text-sm text-muted-foreground">
              Loading PDF...
            </p>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <ReactPdfViewerWrapper
              pdfUrl={effectivePdfUrl}
              currentPage={currentPage}
              scale={scale}
              rotation={rotation}
              showTextLayer={showTextLayer}
              onDocumentLoad={handleDocumentLoad}
              onPageChange={handlePageChange}
              searchText={searchText}
              onSearchNext={searchRef.current?.jumpToNext}
              onSearchPrevious={searchRef.current?.jumpToPrevious}
              pdfMetadata={pdfMetadata}
              enhancedMetadata={enhancedMetadata}
              isLoadingAiMetadata={isLoadingAiMetadata}
              metadataError={metadataError}
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
      </div>
    </div>
  );
}
