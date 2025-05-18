"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Building, Tag } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSetAtom } from "jotai";
import { metadataFilterAtom } from "@/lib/store";
import { cn } from "@/lib/utils";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

interface DocumentMetadataProps {
  metadata?: EnhancedPdfMetadata;
  isListView?: boolean;
  showOrganization?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function DocumentMetadata({
  metadata,
  isListView = false,
  showOrganization = true,
  showLabels = true,
  className,
}: DocumentMetadataProps) {
  const setFilter = useSetAtom(metadataFilterAtom);

  if (!metadata) {
    return null;
  }

  // Calculate visible labels dynamically.
  // Default is 3, but limit to 2 when both organization and labels are shown
  // to keep the badges compact in list view.
  const labels = showLabels ? metadata.labels || [] : [];
  const maxVisibleLabels = showLabels
    ? showOrganization && metadata.issuingOrganization
      ? 2
      : 3
    : 0;
  const visibleLabels = labels.slice(0, maxVisibleLabels);
  const hiddenCount = Math.max(0, labels.length - maxVisibleLabels);

  const onLabelClick = (label: string) => {
    setFilter((prev) => ({ ...prev, labels: [label] }));
  };

  const onOrganizationClick = (organization: string) => {
    setFilter((prev) => ({ ...prev, organization }));
  };

  return (
    <div
      data-testid="document-metadata"
      className={cn(
        "flex flex-nowrap overflow-hidden max-w-full",
        className
      )}
    >
      {showOrganization && metadata.issuingOrganization && (
        <Badge
          variant="secondary"
          className={cn(
            "flex items-center gap-1 mr-2 whitespace-nowrap",
            isListView
              ? ""
              : "max-w-[150px] overflow-hidden text-ellipsis cursor-pointer"
          )}
          onClick={() => onOrganizationClick(metadata.issuingOrganization!)}
        >
          <Building size={12} />
          <span className="truncate">{metadata.issuingOrganization}</span>
        </Badge>
      )}
      {showLabels && (
        <TooltipProvider>
          <div className="flex flex-nowrap overflow-hidden">
            {visibleLabels.map((label) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "flex items-center gap-1 mr-1 whitespace-nowrap",
                      isListView
                        ? ""
                        : "max-w-[100px] overflow-hidden text-ellipsis cursor-pointer"
                    )}
                    onClick={() => onLabelClick(label)}
                  >
                    <Tag size={12} />
                    <span className="truncate">{label}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {hiddenCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="ml-1">
                    +{hiddenCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {labels
                      .slice(maxVisibleLabels)
                      .map((label) => label)
                      .join(", ")}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
