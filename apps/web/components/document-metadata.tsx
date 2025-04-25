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
  metadata?: EnhancedPdfMetadata | null;
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
  const setMetadataFilter = useSetAtom(metadataFilterAtom);

  const handleBadgeClick =
    (type: "company" | "label", value: string) => (e: React.MouseEvent) => {
      if (!isListView) return;
      e.preventDefault(); // Prevent link navigation when clicking badge
      setMetadataFilter({ type, value });
    };

  return (
    <div className="flex flex-nowrap overflow-hidden ml-2 max-w-full">
      {metadata.issuingOrganization && (
        <Badge
          variant="secondary"
          className={cn(
            "text-xs px-1.5 py-0.5 shrink-0 truncate",
            isListView && "cursor-pointer hover:bg-secondary/80"
          )}
          onClick={handleBadgeClick("company", metadata.issuingOrganization)}
        >
          <Building className="h-3 w-3 mr-1 opacity-70 flex-shrink-0" />
          <span className="truncate">{metadata.issuingOrganization}</span>
        </Badge>
      )}
      <div className="flex overflow-hidden flex-nowrap">
        {visibleLabels.map((label: string, index: number) => (
          <Badge
            key={index}
            variant="secondary"
            className={cn(
              "text-xs px-1.5 py-0.5 ml-1 shrink-0 truncate",
              isListView && "cursor-pointer hover:bg-secondary/80"
            )}
            onClick={handleBadgeClick("label", label)}
          >
            <Tag className="h-3 w-3 mr-1 opacity-70 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 ml-1 shrink-0 cursor-pointer"
                >
                  +{hiddenCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="p-2 max-w-xs">
                <div className="flex flex-col space-y-1">
                  {labels.map((label: string, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={cn(
                        "text-xs px-1.5 py-0.5 justify-start w-full",
                        isListView && "cursor-pointer hover:bg-secondary/80"
                      )}
                      onClick={
                        isListView
                          ? handleBadgeClick("label", label)
                          : undefined
                      }
                    >
                      <Tag className="h-3 w-3 mr-1 opacity-70" />
                      {label}
                    </Badge>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
