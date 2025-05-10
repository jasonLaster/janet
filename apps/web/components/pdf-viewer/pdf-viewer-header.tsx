"use client";

import React, { forwardRef } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MoreVertical,
  ArrowLeft,
  Layers,
  EyeOff,
  ZoomOut,
  ZoomIn,
  RotateCw,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import { DocumentMetadata } from "../document-metadata";
import { useRouter } from "next/navigation";

export interface PdfViewerHeaderProps {
  title: string;
  pdfMetadata?: EnhancedPdfMetadata | null;
  searchText: string;
  onSearchChange: (text: string) => void;
  onJumpToNextMatch: (headerHeight?: number) => void;
  onJumpToPreviousMatch: (headerHeight?: number) => void;
  onToggleSidebar: () => void;
  onToggleTextLayer: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onDownload: () => void;
  showSidebar: boolean;
  showTextLayer: boolean;
  scale: number;
  numMatches?: number;
  currentMatchIndex?: number;
  headerHeight?: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const MemoizedButton = React.memo(
  ({ children, ...props }: ButtonProps & { children: React.ReactNode }) => {
    return <Button {...props}>{children}</Button>;
  }
);

MemoizedButton.displayName = "MemoizedButton";

export const PdfViewerHeader = forwardRef<HTMLDivElement, PdfViewerHeaderProps>(
  (
    {
      title,
      pdfMetadata,
      searchText,
      onSearchChange,
      onJumpToNextMatch,
      onJumpToPreviousMatch,
      onToggleSidebar,
      onToggleTextLayer,
      onZoomIn,
      onZoomOut,
      onRotate,
      onDownload,
      showSidebar,
      showTextLayer,
      scale,
      numMatches,
      currentMatchIndex,
      headerHeight,
      searchInputRef,
    },
    ref
  ) => {
    const router = useRouter();

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && searchText) {
        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          onJumpToPreviousMatch(headerHeight ?? 0);
        } else {
          onJumpToNextMatch(headerHeight ?? 0);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onSearchChange(""); // Clear search on Escape
        event.currentTarget.blur(); // Remove focus from input
      }
    };

    return (
      <div
        ref={ref}
        className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/20"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              router.push("/");
            }}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h2 className="font-medium flex items-center gap-2">
            {pdfMetadata?.descriptiveTitle || title}
            <DocumentMetadata metadata={pdfMetadata || undefined} />
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <>
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="relative flex items-center">
              <Input
                id="pdf-search-input"
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                data-testid="pdf-search-input"
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 w-60 pr-16"
              />
              {numMatches !== undefined &&
                numMatches > 0 &&
                currentMatchIndex !== undefined && (
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none whitespace-nowrap">
                    {currentMatchIndex + 1} / {numMatches}
                  </span>
                )}
            </div>
          </>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggleSidebar}>
                <Layers
                  className={`h-4 w-4 mr-2 ${
                    showSidebar ? "text-blue-500" : ""
                  }`}
                />
                {showSidebar ? "Hide sidebar" : "Show sidebar"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleTextLayer}>
                <EyeOff
                  className={`h-4 w-4 mr-2 ${
                    !showTextLayer ? "text-blue-500" : ""
                  }`}
                />
                {showTextLayer ? "Hide text layer" : "Show text layer"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onZoomOut} disabled={scale <= 0.5}>
                <ZoomOut className="h-4 w-4 mr-2" />
                Zoom out
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onZoomIn} disabled={scale >= 3}>
                <ZoomIn className="h-4 w-4 mr-2" />
                Zoom in
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRotate}>
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }
);

PdfViewerHeader.displayName = "PdfViewerHeader";
