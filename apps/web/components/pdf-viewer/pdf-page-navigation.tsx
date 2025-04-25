"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PdfPageNavigationProps {
  currentPage: number;
  numPages: number;
  // Function to go to a specific page (1-indexed)
  goToPage: (page: number) => void;
  // Optional: Function to change page by offset (+1 or -1)
  // If not provided, we'll calculate based on goToPage
  changePage?: (offset: number) => void;
}

export function PdfPageNavigation({
  currentPage,
  numPages,
  goToPage,
  changePage, // Destructure optional prop
}: PdfPageNavigationProps) {
  const handlePrevious = () => {
    if (changePage) {
      changePage(-1);
    } else if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (changePage) {
      changePage(1);
    } else if (currentPage < numPages) {
      goToPage(currentPage + 1);
    }
  };

  if (numPages <= 0) {
    return null; // Don't render if no pages
  }

  return (
    <div className="flex items-center justify-between p-2 border-t bg-background text-sm text-muted-foreground sticky bottom-0 z-10">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        className="h-7 w-7"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous Page</span>
      </Button>
      <span>
        Page {currentPage} of {numPages}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        disabled={currentPage >= numPages}
        className="h-7 w-7"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next Page</span>
      </Button>
    </div>
  );
}
