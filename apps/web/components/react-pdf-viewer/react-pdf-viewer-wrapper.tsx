"use client";

import {
  Viewer,
  Worker,
  type PageChangeEvent,
  type DocumentLoadEvent,
  type RenderPageProps,
} from "@react-pdf-viewer/core";
import {
  defaultLayoutPlugin,
  type DefaultLayoutPlugin,
  ThumbnailIcon,
} from "@react-pdf-viewer/default-layout";
import { searchPlugin, type SearchPlugin } from "@react-pdf-viewer/search";
import { useEffect, useMemo, useRef } from "react";
import React from "react";
import { FileText } from "lucide-react";

// Import the custom info panel
import {
  PdfInfoPanel,
  type PdfInfoPanelProps,
} from "../pdf-viewer/pdf-info-panel";

// Define the internal component to handle page rendering logic
const PageRenderer: React.FC<RenderPageProps & { showTextLayer: boolean }> = ({
  showTextLayer,
  ...props
}) => {
  // Call markRendered when the necessary layers are rendered
  React.useEffect(() => {
    if (props.canvasLayerRendered && props.textLayerRendered) {
      props.markRendered(props.pageIndex);
    }
  }, [
    props.canvasLayerRendered,
    props.textLayerRendered,
    props.pageIndex,
    props.markRendered,
  ]);

  return (
    <>
      {/* Always render canvas */}
      {props.canvasLayer.children}

      {/* Conditionally render text layer */}
      {showTextLayer && props.textLayer.children}

      {/* Always render annotation layer */}
      {props.annotationLayer.children}
    </>
  );
};

interface ReactPdfViewerWrapperProps {
  pdfUrl: string;
  currentPage: number;
  showTextLayer: boolean;
  scale: number;
  rotation: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (event: DocumentLoadEvent) => void;
  searchText?: string;
  onSearchNext?: () => void;
  onSearchPrevious?: () => void;
  pdfMetadata: PdfInfoPanelProps["pdfMetadata"];
  enhancedMetadata: PdfInfoPanelProps["enhancedMetadata"];
  isLoadingAiMetadata: PdfInfoPanelProps["isLoadingAiMetadata"];
  metadataError: PdfInfoPanelProps["metadataError"];
}

export const ReactPdfViewerWrapper = ({
  pdfUrl,
  currentPage,
  showTextLayer,
  scale,
  rotation,
  onPageChange,
  onDocumentLoad,
  searchText,
  onSearchNext,
  onSearchPrevious,
  pdfMetadata,
  enhancedMetadata,
  isLoadingAiMetadata,
  metadataError,
}: ReactPdfViewerWrapperProps) => {
  // Use type assertion for plugins to help with ref typing later
  const defaultLayout = defaultLayoutPlugin({
    // Configure sidebar tabs
    sidebarTabs: (defaultTabs) => [
      {
        content: (
          <PdfInfoPanel
            pdfMetadata={pdfMetadata}
            enhancedMetadata={enhancedMetadata}
            isLoadingAiMetadata={isLoadingAiMetadata}
            metadataError={metadataError}
          />
        ),
        icon: <FileText className="h-4 w-4" />,
        title: "Info",
      },
      defaultTabs[0], // Assuming the default thumbnail tab is the first one
      // Add other default tabs if needed (like attachments, bookmarks)
      // ...defaultTabs.slice(1),
    ],
  }) as DefaultLayoutPlugin;
  const searchPluginInstance = searchPlugin();
  const { highlight, jumpToNextMatch, jumpToPreviousMatch } =
    searchPluginInstance;

  // Type casting needed as react-pdf-viewer doesn't expose perfect ref types
  const viewerRef = useRef<any>(null);

  // Handle imperative zoom/rotation changes
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.zoom(scale);
      viewerRef.current.rotate(rotation);
    }
  }, [scale, rotation]);

  // Handle imperative page changes
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.scrollToPage(currentPage - 1); // Viewer is 0-indexed
    }
  }, [currentPage]);

  // Handle search text changes
  useEffect(() => {
    if (searchText === "next" && onSearchNext) {
      onSearchNext();
    } else if (searchText === "prev" && onSearchPrevious) {
      onSearchPrevious();
    } else if (searchText && searchText !== "next" && searchText !== "prev") {
      highlight({
        keyword: searchText,
        matchCase: false,
      });
    }
  }, [searchText, highlight, onSearchNext, onSearchPrevious]);

  // Memoize worker URL to avoid re-creation
  const workerUrl = useMemo(() => {
    // Construct the URL for the pdf.js worker
    // This assumes the worker file is copied to the public directory during build
    // Adjust the path as necessary based on your build setup
    return `/pdf.worker.min.js`;
  }, []);

  return (
    <Worker workerUrl={workerUrl}>
      {/* Add relative positioning and overflow hidden for proper layout */}
      <div
        style={{
          height: "100%",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayout, searchPluginInstance]}
          initialPage={currentPage - 1} // Set initial page (0-indexed)
          onPageChange={(e: PageChangeEvent) =>
            onPageChange?.(e.currentPage + 1)
          } // Convert back to 1-indexed
          onDocumentLoad={onDocumentLoad} // Pass the callback directly
          // Use the internal component for rendering, passing necessary props
          renderPage={(props: RenderPageProps) => (
            <PageRenderer {...props} showTextLayer={showTextLayer} />
          )}
          // Direct ref type might mismatch, use `any` for now
          ref={viewerRef as any}
        />
      </div>
    </Worker>
  );
};
