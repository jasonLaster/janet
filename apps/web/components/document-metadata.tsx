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

interface DocumentMetadataProps {
  metadata: any;
}

export function DocumentMetadata({ metadata }: DocumentMetadataProps) {
  // Calculate visible labels dynamically, default is 3 but fewer if organization exists
  const maxVisibleLabels = metadata.issuingOrganization ? 2 : 3;
  const labels = metadata.labels || [];
  const visibleLabels = labels.slice(0, maxVisibleLabels);
  const hiddenCount = Math.max(0, labels.length - maxVisibleLabels);

  return (
    <div className="flex flex-nowrap overflow-hidden ml-2 max-w-full">
      {metadata.issuingOrganization && (
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0.5 shrink-0 truncate"
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
            className="text-xs px-1.5 py-0.5 ml-1 shrink-0 truncate"
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
                      className="text-xs px-1.5 py-0.5 justify-start w-full"
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
