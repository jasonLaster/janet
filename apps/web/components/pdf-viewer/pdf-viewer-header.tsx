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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import { DocumentMetadata } from "../document-metadata";
import debounce from "lodash/debounce";

export interface PdfViewerHeaderProps {
  title: string;
  enhancedMetadata?: EnhancedPdfMetadata | null;
  searchText: string;
  onSearchChange: (text: string) => void;
  onToggleTextLayer: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onDownload: () => void;
  showTextLayer: boolean;
  scale: number;
}

const DEBOUNCE_DELAY = 500; // ms

export function PdfViewerHeader({
  title,
  enhancedMetadata,
  searchText,
  onSearchChange,
  onToggleTextLayer,
  onZoomIn,
  onZoomOut,
  onRotate,
  onDownload,
  showTextLayer,
  scale,
}: PdfViewerHeaderProps) {
  const debouncedOnSearchChange = React.useCallback(
    debounce((value: string) => {
      onSearchChange(value);
    }, DEBOUNCE_DELAY),
    [onSearchChange]
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/20">
      <div className="flex items-center gap-2 flex-shrink min-w-0 mr-4">
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
        <div className="relative flex items-center">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            defaultValue={searchText}
            onChange={(e) => debouncedOnSearchChange(e.target.value)}
            className="h-8 pl-8 w-48 md:w-64"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
            <DropdownMenuItem onClick={onToggleTextLayer}>
              <EyeOff
                className={`h-4 w-4 mr-2 ${
                  !showTextLayer ? "text-blue-500" : ""
                }`}
              />
              {showTextLayer ? "Hide text layer" : "Show text layer"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
