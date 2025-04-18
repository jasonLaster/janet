"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAtom, useAtomValue } from "jotai";
import { pdfsAtom, metadataFilterAtom } from "@/lib/store";
import { Button } from "@/components/ui/button";

interface Label {
  label: string;
  count: number;
}

export function DocumentLabels() {
  const pdfs = useAtomValue(pdfsAtom);
  const [metadataFilter, setMetadataFilter] = useAtom(metadataFilterAtom);
  const [showAll, setShowAll] = useState(false);

  // Debug: Log PDFs metadata to understand the structure
  useEffect(() => {
    console.log("Total PDFs:", pdfs.length);
    console.log(
      "PDF IDs:",
      pdfs.map((pdf) => pdf.id)
    );

    // Log each PDF with its metadata
    pdfs.forEach((pdf, index) => {
      console.log(`PDF ${index + 1}:`, {
        id: pdf.id,
        name: (pdf as any).name || (pdf as any).filename,
        hasMetadata: !!(pdf as any).metadata,
        labels: (pdf as any).metadata?.labels,
      });
    });

    // Count PDFs with labels
    const pdfsWithLabels = pdfs.filter(
      (pdf) =>
        (pdf as any).metadata?.labels &&
        Array.isArray((pdf as any).metadata.labels) &&
        (pdf as any).metadata.labels.length > 0
    );
    console.log(
      `PDFs with labels: ${pdfsWithLabels.length} out of ${pdfs.length}`
    );
  }, [pdfs]);

  // Extract and count labels from PDF metadata
  const labels = useMemo(() => {
    console.log("--- Starting label computation ---");

    // Create a frequency map for each label
    const labelDocuments = new Map<string, Set<number>>();

    // Process each PDF
    pdfs.forEach((pdf) => {
      const metadata = (pdf as any).metadata;
      // Skip if no metadata or labels
      if (!metadata?.labels || !Array.isArray(metadata.labels)) {
        console.log(`PDF ${pdf.id}: No valid labels found`);
        return;
      }

      console.log(
        `PDF ${pdf.id}: Processing ${metadata.labels.length} labels:`,
        metadata.labels
      );

      // Process each label in this document
      metadata.labels.forEach((label: string) => {
        if (!labelDocuments.has(label)) {
          labelDocuments.set(label, new Set());
          console.log(`Created new tracking set for label "${label}"`);
        }
        // Add this document ID to the set of documents containing this label
        labelDocuments.get(label)?.add(pdf.id);
        console.log(`Added PDF ${pdf.id} to label "${label}"`);
      });
    });

    console.log(
      "Label document tracking map:",
      Array.from(labelDocuments.entries()).map(([label, docSet]) => ({
        label,
        docIds: Array.from(docSet),
        count: docSet.size,
      }))
    );

    // Convert to the Label[] format with counts
    const result = Array.from(labelDocuments.entries())
      .map(([label, documentIds]) => ({
        label,
        count: documentIds.size, // Count of unique documents with this label
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    console.log("Final computed labels with counts:", result);
    console.log("--- Label computation complete ---");

    return result;
  }, [pdfs]);

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
                "transition-colors hover:bg-muted",
                metadataFilter.type === "label" &&
                  metadataFilter.value === label.label
                  ? "bg-muted font-medium"
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
