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
  ThumbnailIcon,
  type DefaultLayoutPlugin,
} from "@react-pdf-viewer/default-layout";
import { searchPlugin, type SearchPlugin } from "@react-pdf-viewer/search";
import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import the custom info panel
import {
  PdfInfoPanel,
  type PdfInfoPanelProps,
} from "../pdf-viewer/pdf-info-panel";

// Define the internal component to handle page rendering logic - RESTORED
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
  pdfTitle: string;
  onBackClick: () => void;
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
  pdfTitle,
  onBackClick,
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
  // Wrapper for onPageChange to ensure correct page number (1-indexed) is emitted
  const handleInternalPageChange = (event: PageChangeEvent) => {
    const newPage = event.currentPage + 1; // Convert 0-indexed to 1-indexed
    onPageChange?.(newPage);
  };

  // Initialize plugins first so instances are available for configuration
  const searchPluginInstance = searchPlugin();
  const { highlight, jumpToNextMatch, jumpToPreviousMatch } =
    searchPluginInstance;

  // Define the defaultLayoutPluginInstance using the plugins
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    // Define the custom renderToolbar function inline or separately
    renderToolbar: (Toolbar) => {
      // Assuming Toolbar renders the standard slots
      // We get the necessary slots from the searchPluginInstance
      const { ShowSearchPopover } = searchPluginInstance;

      return (
        <Toolbar>
          {(slots) => {
            // Destructure default slots we want to use
            const {
              MoreActionsPopover,
              EnterFullScreen,
              ZoomIn,
              ZoomOut,
              Rotate,
            } = slots;

            // Use enhanced title if available, otherwise fallback to pdfTitle prop
            const displayTitle = enhancedMetadata?.descriptiveTitle || pdfTitle;
            // Simple metadata string (example, adjust as needed)
            const displayMetadata = pdfMetadata?.author
              ? `by ${pdfMetadata.author}`
              : "";

            return (
              <div
                className="flex items-center w-full px-2" // Use Tailwind for padding/layout
                style={{ height: "40px" }} // Ensure consistent height
              >
                {/* Left side: Back button + Title/Metadata */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBackClick}
                  className="h-8 w-8 mr-2" // Tailwind classes
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis mr-4">
                  <span className="font-medium">{displayTitle}</span>
                  {displayMetadata && (
                    <span className="text-sm text-gray-500 ml-2">
                      {displayMetadata}
                    </span>
                  )}
                </div>

                {/* Right side: Standard controls + Search + Actions */}
                <div className="flex items-center space-x-1">
                  {/* Standard controls can be included directly from slots */}
                  {/* {ZoomOut && <ZoomOut />}
                  {ZoomIn && <ZoomIn />}
                  {Rotate && <Rotate />} */}
                  {/* Search UI - using the default popover */}
                  {ShowSearchPopover && <ShowSearchPopover />}
                  {/* Actions dropdown (print/download/etc.) */}
                  {MoreActionsPopover && <MoreActionsPopover />}
                  {/* Full screen button */}
                  {EnterFullScreen && <EnterFullScreen />}
                </div>
              </div>
            );
          }}
        </Toolbar>
      );
    },
    // Configure sidebar tabs - Simplified thumbnail tab
    sidebarTabs: (defaultTabs) => {
      // Get the thumbnail plugin instance from the default layout plugin
      const thumbnailPluginInstance =
        defaultLayoutPluginInstance.thumbnailPluginInstance;
      const { Thumbnails } = thumbnailPluginInstance;

      return [
        // Info Panel Tab
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
        // Simplified Thumbnails Tab
        {
          // Use the Thumbnails component directly
          // The default layout plugin handles scrolling and highlighting
          content: <Thumbnails />,
          icon: <ThumbnailIcon />,
          title: "Pages",
        },
        // Remove other default tabs if not needed, or keep them:
        // ...defaultTabs.filter(tab => tab.title !== 'Thumbnails' && tab.title !== 'Info'),
      ];
    },
  });

  // Type casting needed as react-pdf-viewer doesn't expose perfect ref types
  const viewerRef = useRef<any>(null);

  // Handle imperative zoom/rotation changes
  useEffect(() => {
    if (viewerRef.current) {
      // Imperative zoom/rotate might conflict with toolbar controls.
      // Consider removing if scale/rotation are fully managed by parent/header.
      // Or ensure parent state reflects toolbar actions if needed.
      // For now, keep existing logic.
      viewerRef.current.zoom(scale);
      viewerRef.current.rotate(rotation);
    }
  }, [scale, rotation]);

  // Handle imperative page changes
  useEffect(() => {
    if (viewerRef.current) {
      // Ensure parent's currentPage drives the viewer
      viewerRef.current.scrollToPage(currentPage - 1); // Viewer is 0-indexed
    }
  }, [currentPage]);

  // Handle search text changes - Hook up parent state to plugin actions
  useEffect(() => {
    // Use jumpToNext/Previous if specific strings are passed (parent controls navigation)
    if (searchText === "next" && jumpToNextMatch) {
      jumpToNextMatch();
      // Potentially clear searchText in parent or notify parent action occurred
      onSearchNext?.(); // Call parent handler if provided
    } else if (searchText === "prev" && jumpToPreviousMatch) {
      jumpToPreviousMatch();
      onSearchPrevious?.(); // Call parent handler if provided
    } else if (searchText && searchText !== "next" && searchText !== "prev") {
      // Otherwise, perform highlight if text is not a navigation command
      highlight({
        keyword: searchText,
        matchCase: false, // Example option
        // Other options like `wholeWord: true` can be added
      });
    }
    // Dependencies: include plugin actions
  }, [
    searchText,
    highlight,
    jumpToNextMatch,
    jumpToPreviousMatch,
    onSearchNext,
    onSearchPrevious,
  ]);

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
          // Ensure the order is correct: defaultLayout must come before search for toolbar slots
          plugins={[defaultLayoutPluginInstance, searchPluginInstance]}
          initialPage={currentPage - 1} // Set initial page (0-indexed)
          onPageChange={handleInternalPageChange} // Use wrapper for 1-indexed pages
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
