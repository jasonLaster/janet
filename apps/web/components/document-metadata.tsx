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
}

export function DocumentMetadata({
  metadata,
  isListView = false,
}: DocumentMetadataProps) {
  if (!metadata) {
    return null;
  }

  // Calculate visible labels dynamically, default is 3 but fewer if organization exists
  const maxVisibleLabels = metadata.issuingOrganization ? 2 : 3;
  const labels = metadata.labels || [];
  const visibleLabels = labels.slice(0, maxVisibleLabels);
  const hiddenCount = Math.max(0, labels.length - maxVisibleLabels);

  const setFilter = useSetAtom(metadataFilterAtom);

  const onLabelClick = (label: string) => {
    setFilter((prev) => ({ ...prev, labels: [label] }));
  };

  const onOrganizationClick = (organization: string) => {
    setFilter((prev) => ({ ...prev, organization }));
  };

  return (
    <div
      data-testid="document-metadata"
      className="flex flex-nowrap overflow-hidden ml-2 max-w-full"
    >
      {metadata.issuingOrganization && (
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
    </div>
  );
}
