"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PdfPageNavigationProps {
  currentPage: number;
  numPages: number;
  changePage: (offset: number) => void;
  goToPage: (page: number) => void;
}

export function PdfPageNavigation({
  currentPage,
  numPages,
  changePage,
  goToPage,
}: PdfPageNavigationProps) {
  return (
    <div className="p-2 border-t border-gray-200 bg-gray-100 flex items-center justify-between">
      <Button
        variant="outline"
        size="icon"
        onClick={() => changePage(-1)}
        disabled={currentPage <= 1}
        className="h-8 w-8"
        data-testid="pdf-page-navigation-previous"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>

      <div className="flex items-center gap-1 text-sm">
        <Input
          type="number"
          value={currentPage}
          data-testid="pdf-page-navigation-input"
          onChange={(e) => {
            const page = Number.parseInt(e.target.value);
            if (page >= 1 && page <= numPages) {
              goToPage(page);
            }
          }}
          className="w-12 h-8"
          min={1}
          max={numPages}
        />
        <span>/ {numPages}</span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => changePage(1)}
        disabled={currentPage >= numPages}
        className="h-8 w-8"
        data-testid="pdf-page-navigation-next"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
    </div>
  );
}
