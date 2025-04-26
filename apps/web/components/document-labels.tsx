"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAtomValue, useSetAtom } from "jotai";
import {
  metadataFilterAtom,
  searchQueryAtom,
  searchResultsAtom,
  getFilteredPdfs,
  SearchResult,
} from "@/lib/store";
import { PDF } from "@/lib/db";
import { Button } from "@/components/ui/button";

interface Label {
  label: string;
  count: number;
}

interface DocumentLabelsProps {
  pdfs: PDF[];
}

export function DocumentLabels({ pdfs }: DocumentLabelsProps) {
  const searchQuery = useAtomValue(searchQueryAtom);
  const searchResults = useAtomValue(searchResultsAtom);
  const metadataFilter = useAtomValue(metadataFilterAtom);
  const setMetadataFilter = useSetAtom(metadataFilterAtom);
  const [showAll, setShowAll] = useState(false);

  // Get filtered PDFs based on current filters
  const filteredPdfs = useMemo(
    () =>
      getFilteredPdfs(
        pdfs,
        searchQuery,
        searchResults.map((result) => ({ id: result.id, title: "" })),
        {
          ...metadataFilter,
          type: metadataFilter.type === "label" ? null : metadataFilter.type,
          value: metadataFilter.type === "label" ? null : metadataFilter.value,
        }
      ),
    [pdfs, searchQuery, searchResults, metadataFilter]
  );

  // Extract and count labels from filtered PDF metadata
  const labels = useMemo(() => {
    // Create a frequency map for each label
    const labelDocuments = new Map<string, Set<number>>();

    // Process each PDF
    filteredPdfs.forEach((pdf) => {
      const metadata = (pdf as any).metadata;
      // Skip if no metadata or labels
      if (!metadata?.labels || !Array.isArray(metadata.labels)) return;

      metadata.labels.forEach((label: string) => {
        const trimmedLabel = label.trim();
        if (!trimmedLabel) return;

        // Add to tracking map
        if (!labelDocuments.has(trimmedLabel)) {
          labelDocuments.set(trimmedLabel, new Set());
        }

        // Add this document ID to the set of documents with this label
        labelDocuments.get(trimmedLabel)?.add(pdf.id);
      });
    });

    // Convert to the Label[] format with counts
    return Array.from(labelDocuments.entries())
      .map(([label, documentIds]) => ({
        label,
        count: documentIds.size,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [filteredPdfs]);

  const handleLabelClick = (label: string) => {
    // Check if already selected
    if (metadataFilter.type === "label" && metadataFilter.value === label) {
      // Clear the filter if clicking the same label
      setMetadataFilter({ type: null, value: null });
    } else {
      // Set new filter
      setMetadataFilter({ type: "label", value: label });
    }
  };

  if (labels.length === 0) {
    return (
      <div className="p-4">
        <div className="mb-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">
            Labels
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">No labels found</p>
      </div>
    );
  }

  // Determine which labels to show based on the showAll state
  const displayedLabels = showAll ? labels : labels.slice(0, 10);
  const hasMoreLabels = labels.length > 10;

  return (
    <div className="p-4">
      <div className="mb-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">
          Labels
        </h3>
      </div>
      <ul className="space-y-1">
        {displayedLabels.map((label) => (
          <li key={label.label}>
            <button
              onClick={() => handleLabelClick(label.label)}
              className={cn(
                "w-full flex justify-between items-center px-2 py-1 rounded-md text-sm",
                "transition-colors hover:bg-stone-200",
                metadataFilter.type === "label" &&
                  metadataFilter.value === label.label
                  ? "bg-stone-200 font-medium"
                  : ""
              )}
            >
              <span className="flex items-center min-w-0 max-w-[calc(100%-40px)]">
                <Tag className="h-3 w-3 mr-2 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{label.label}</span>
              </span>
              <span className="ml-1 flex-shrink-0 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
                {label.count}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {hasMoreLabels && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Less" : `Show ${labels.length - 10} More`}
        </Button>
      )}
    </div>
  );
}
