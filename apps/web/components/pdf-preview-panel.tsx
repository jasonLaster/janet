"use client";

import { PDF } from "@/lib/db";
import { PdfViewer } from "@/components/pdf-viewer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfPreviewPanelProps {
  pdf: PDF;
  open: boolean;
  onClose: () => void;
}

export function PdfPreviewPanel({ pdf, open, onClose }: PdfPreviewPanelProps) {
  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-40 w-full max-w-3xl bg-background border-l shadow-xl transform transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <button
        aria-label="Close"
        className="absolute top-2 right-2 rounded-md p-2 hover:bg-muted"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
      <PdfViewer pdf={pdf} />
    </div>
  );
}
