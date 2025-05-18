"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLinkIcon,
  MoreHorizontalIcon,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PDF } from "@/lib/db";
import { DocumentMetadata } from "@/components/document-metadata";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { usePdfMetadata } from "@/hooks/use-pdf-metadata";
import { formatDate } from "@/lib/utils";
const TOOLTIP_WIDTH = 384; // max-w-sm = 24rem = 384px

interface PdfListItemProps {
  pdf: PDF;
  handleDelete: (id: number) => void;
  style?: React.CSSProperties; // For react-window
}

export function PdfListItem({ pdf, handleDelete, style }: PdfListItemProps) {
  const router = useRouter();
  const {
    metadata: currentMetadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = usePdfMetadata(pdf.id, pdf.metadata, pdf.metadata_failed);

  const [mouseX, setMouseX] = useState<number | null>(null);
  const [rowBottom, setRowBottom] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const effectiveMetadata = currentMetadata || {};
  const displayTitle =
    effectiveMetadata.descriptiveTitle || pdf.title || pdf.filename;
  const handleMouseMove = (e: React.MouseEvent) => {
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      setMouseX(e.clientX);
      setRowBottom(rect.bottom);

      // Calculate absolute position for tooltip
      const halfTooltip = TOOLTIP_WIDTH / 2;
      const viewportWidth = window.innerWidth;

      // Only hide tooltip if it would extend beyond right viewport edge
      if (e.clientX + halfTooltip > viewportWidth) {
        setTooltipPosition(null);
      } else {
        // Center the tooltip on the mouse
        setTooltipPosition(e.clientX);
      }
    }
  };

  const renderTooltip = () => {
    if (
      !isHovering ||
      !effectiveMetadata.summary ||
      mouseX === null ||
      rowBottom === null ||
      tooltipPosition === null
    ) {
      return null;
    }

    const formattedDate = formatDate(effectiveMetadata.primaryDate);

    return createPortal(
      <div
        className="fixed w-96 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md transition-opacity duration-200"
        style={{
          left: tooltipPosition,
          top: rowBottom + 8, // Small gap between row and tooltip
          transform: "translateX(-50%)",
          opacity: isHovering ? 1 : 0,
        }}
      >
        {formattedDate && (
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            {formattedDate}
          </div>
        )}
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown>{effectiveMetadata.summary}</ReactMarkdown>
        </div>
      </div>,
      document.body,
    );
  };

  return (
    <Link
      data-testid="pdf-list-item"
      href={`/pdfs/${pdf.id}`}
      className="block w-full"
    >
      <div
        ref={rowRef}
        className="flex items-center px-3 py-1 border-b-slate-100 border-b hover:bg-muted/50 transition-colors relative"
        style={style}
        data-id={pdf.id}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setMouseX(null);
          setRowBottom(null);
          setTooltipPosition(null);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center w-full min-w-0">
            <div className="min-w-0 flex-1 pr-4 overflow-hidden flex flex-row justify-between">
              <div className="flex items-center overflow-hidden">
                <DocumentMetadata
                  metadata={effectiveMetadata}
                  isListView={true}
                  showLabels={false}
                  className="mr-2"
                />
                <div className="font-medium text-sm mr-2 whitespace-nowrap">
                  {displayTitle}
                </div>
              </div>
              <div className="flex items-center justify-end min-w-0 overflow-hidden">
                <DocumentMetadata
                  metadata={effectiveMetadata}
                  isListView={true}
                  showOrganization={false}
                  className="ml-2"
                />
                {isMetadataLoading && !metadataError && (
                  <Loader2
                    data-testid="metadata-loader"
                    className="h-3 w-3 ml-1 animate-spin text-muted-foreground inline-block"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-12 flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-testid="pdf-list-item-menu-button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <MoreHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/pdfs/${pdf.id}`)}>
                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                View PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="pdf-list-item-delete-button"
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(pdf.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="">Delete PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {renderTooltip()}
      </div>
    </Link>
  );
}
