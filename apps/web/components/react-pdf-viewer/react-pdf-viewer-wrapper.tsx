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
import {
  toolbarPlugin,
  type ToolbarProps,
  type ToolbarSlot,
} from "@react-pdf-viewer/toolbar";
import { searchPlugin, type SearchPlugin } from "@react-pdf-viewer/search";
import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { FileText } from "lucide-react";

// Import the custom info panel
import {
  PdfInfoPanel,
  type PdfInfoPanelProps,
} from "../pdf-viewer/pdf-info-panel";

// Import the new page navigation
import { PdfPageNavigation } from "../pdf-viewer/pdf-page-navigation";

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
  numPages: number;
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
  numPages,
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
  // Wrapper for onPageChange to ensure goToPage receives the correct type
  const handleInternalPageChange = (event: PageChangeEvent) => {
    const newPage = event.currentPage + 1; // Convert 0-indexed to 1-indexed
    onPageChange?.(newPage);
  };

  // Ensure goToPage is available for PdfPageNavigation
  const goToPageHandler = (page: number) => {
    onPageChange?.(page);
  };

  // Custom toolbar rendering function - Define it before using it in the plugin config
  const renderToolbar = (
    Toolbar: (props: ToolbarProps) => React.ReactElement
  ) => (
    <Toolbar>
      {(slots: ToolbarSlot) => {
        // Add type to slots
        const { EnterFullScreen } = slots;
        return (
          <div
            style={{ display: "flex", alignItems: "center", padding: "4px" }}
          >
            <div style={{ marginLeft: "auto" }}>
              {EnterFullScreen && <EnterFullScreen />}
            </div>
          </div>
        );
      }}
    </Toolbar>
  );

  // Configure the default layout plugin WITH the custom toolbar
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    renderToolbar,
    // Configure sidebar tabs
    sidebarTabs: (defaultTabs) => {
      // Get the original Thumbnails component creator from the plugin instance
      const thumbnailPluginInstance =
        defaultLayoutPluginInstance.thumbnailPluginInstance;
      const { Thumbnails } = thumbnailPluginInstance;

      return [
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
        {
          content: (
            // Custom content wrapper for thumbnails + navigation
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <Thumbnails />
              </div>
              <PdfPageNavigation
                currentPage={currentPage}
                numPages={numPages}
                goToPage={goToPageHandler}
              />
            </div>
          ),
          icon: <ThumbnailIcon />,
          title: "Pages",
        },
        // Add other default tabs if needed (like attachments, bookmarks)
        // ...defaultTabs.slice(1),
      ];
    },
  });

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
          plugins={[defaultLayoutPluginInstance, searchPluginInstance]}
          initialPage={currentPage - 1} // Set initial page (0-indexed)
          onPageChange={handleInternalPageChange} // Use wrapper
          onDocumentLoad={onDocumentLoad} // Pass parent handler directly
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
