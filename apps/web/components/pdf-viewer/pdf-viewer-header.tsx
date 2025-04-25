"use client";

import React from "react";
import { Button } from "@/components/ui/button";
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
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import { DocumentMetadata } from "../document-metadata";

export interface PdfViewerHeaderProps {
  title: string;
  enhancedMetadata?: EnhancedPdfMetadata | null;
  searchText: string;
  onSearchChange: (text: string) => void;
  onToggleSidebar: () => void;
  onToggleTextLayer: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onDownload: () => void;
  showSidebar: boolean;
  showTextLayer: boolean;
  scale: number;
  searchResultCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPreviousMatch: () => void;
}

export function PdfViewerHeader({
  title,
  enhancedMetadata,
  searchText,
  onSearchChange,
  onToggleSidebar,
  onToggleTextLayer,
  onZoomIn,
  onZoomOut,
  onRotate,
  onDownload,
  showSidebar,
  showTextLayer,
  scale,
  searchResultCount,
  currentMatchIndex,
  onNextMatch,
  onPreviousMatch,
}: PdfViewerHeaderProps) {
  return (
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
        <h2 className="font-medium flex items-center gap-2">
          {enhancedMetadata?.descriptiveTitle || title}
          <DocumentMetadata metadata={enhancedMetadata} />
        </h2>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center gap-2 bg-background rounded-md border">
          <Search className="h-4 w-4 text-muted-foreground ml-2" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.shiftKey ? onPreviousMatch() : onNextMatch();
              }
            }}
            className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchResultCount > 0 && (
            <div className="flex items-center gap-1 px-2 border-l h-full">
              <span className="text-sm text-muted-foreground">
                {currentMatchIndex + 1}/{searchResultCount}
              </span>
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPreviousMatch}
                  className="h-4 w-4 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNextMatch}
                  className="h-4 w-4 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

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
                className={`h-4 w-4 mr-2 ${showSidebar ? "text-blue-500" : ""}`}
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
