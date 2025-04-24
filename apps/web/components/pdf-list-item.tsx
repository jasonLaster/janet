"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PDF } from "@/lib/store";
import { DocumentMetadata } from "@/components/document-metadata";
import { useRef } from "react";
import { useState } from "react";

interface PdfListItemProps {
  pdf: PDF;
  handleDelete: (id: number) => void;
  style?: React.CSSProperties; // For react-window
}

export function PdfListItem({ pdf, handleDelete, style }: PdfListItemProps) {
  const router = useRouter();
  const metadata = (pdf as any).metadata || {};
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return null;
    }

    const date = new Date(dateString);

    const isInvalid = isNaN(date.getTime());

    if (isInvalid) {
      return null;
    }
    // Format with ordinal suffix
    const day = date.getDate();
    const ordinal = (d: number) =>
      d +
      (["th", "st", "nd", "rd"][
        d % 10 > 3 || Math.floor((d % 100) / 10) == 1 ? 0 : d % 10
      ] || "th");

    const formattedDate = `${date.toLocaleString("en-US", {
      month: "long",
    })} ${ordinal(day)}, ${date.getFullYear()}`;

    return formattedDate;
  };

  // Use descriptive title from metadata if available, otherwise fallback to title or filename
  const displayTitle = metadata.descriptiveTitle || pdf.title || pdf.name;
  // Use primary date from metadata if available, otherwise use uploaded date
  const displayDate = formatDate(pdf.uploadedAt) || "";

  const handleMouseMove = (e: React.MouseEvent) => {
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      // Calculate mouse position relative to the row's left edge
      const relativeX = e.clientX - rect.left;
      setMouseX(relativeX);
    }
  };

  return (
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
      }}
    >
      <div className="flex-1 min-w-0">
        <Link
          data-testid="pdf-list-item"
          href={`/pdfs/${pdf.id}`}
          className="block w-full"
        >
          <div className="flex items-center w-full min-w-0">
            <div className="min-w-0 flex-1 pr-4 overflow-hidden">
              <div className="flex items-center overflow-hidden">
                <div className="font-medium text-sm mr-2 whitespace-nowrap">
                  {displayTitle}
                </div>
                <div className="overflow-hidden flex-shrink min-w-0">
                  <DocumentMetadata metadata={metadata} />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="text-sm text-right whitespace-nowrap w-28">
        <div className="flex items-center justify-end">
          <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
          <span>{displayDate}</span>
        </div>
      </div>

      <div className="w-12 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
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

      {isHovering && metadata.summary && mouseX !== null && (
        <div
          className="absolute z-50 max-w-sm rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md transition-opacity duration-200"
          style={{
            left: mouseX,
            top: "100%",
            marginTop: "0.5rem",
            transform: "translateX(-50%)",
            opacity: isHovering ? 1 : 0,
          }}
        >
          <p className="text-sm">{metadata.summary}</p>
        </div>
      )}
    </div>
  );
}
