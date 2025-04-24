"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import ReactMarkdown from "react-markdown";

// Define a type for PDF metadata
interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

export interface PdfInfoPanelProps {
  pdfMetadata: PdfMetadata;
  enhancedMetadata: EnhancedPdfMetadata | null;
  isLoadingAiMetadata: boolean;
  metadataError: boolean;
}

function PdfInfoPanelItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex flex-col mt-4">
      <dt className="text-gray-500 mb-1">{label}</dt>
      <dd>
        <ReactMarkdown>{value}</ReactMarkdown>
      </dd>
    </div>
  );
}
export function PdfInfoPanel({
  pdfMetadata,
  enhancedMetadata,
  isLoadingAiMetadata,
  metadataError,
}: PdfInfoPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="py-3 px-4">
        {metadataError && (
          <div className="mb-4 p-2 bg-red-50 rounded-md shadow-sm">
            <p className="text-red-700">Failed to load metadata.</p>
          </div>
        )}

        {isLoadingAiMetadata && (
          <div className="mt-4 text-center text-sm text-gray-500">
            <div className="animate-pulse">Analyzing document with AI...</div>
          </div>
        )}

        <dl className="space-y-2 text-sm">
          <PdfInfoPanelItem label="Summary" value={enhancedMetadata?.summary} />
          <PdfInfoPanelItem label="Author" value={pdfMetadata.author || ""} />
          <PdfInfoPanelItem label="Subject" value={pdfMetadata.subject || ""} />

          <PdfInfoPanelItem label="Created" value={pdfMetadata.creationDate} />

          <PdfInfoPanelItem
            label="Document Type"
            value={enhancedMetadata?.documentType}
          />

          <PdfInfoPanelItem
            label="Account Holder"
            value={enhancedMetadata?.accountHolder}
          />

          <PdfInfoPanelItem
            label="Account Details"
            value={enhancedMetadata?.accountDetails}
          />

          <PdfInfoPanelItem
            label="Deadlines/Action Items"
            value={enhancedMetadata?.deadlines}
          />

          <PdfInfoPanelItem
            label="Deadlines/Action Items"
            value={enhancedMetadata?.deadlines}
          />

          {enhancedMetadata?.otherPeople &&
            enhancedMetadata.otherPeople.length > 0 && (
              <div>
                <dt className="text-gray-500">Other People Mentioned</dt>
                <dd>
                  <ul className="list-disc list-inside">
                    {enhancedMetadata.otherPeople.map((person, index) => (
                      <li className="text-sm  list-none" key={index}>
                        {person}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
        </dl>
      </div>
    </ScrollArea>
  );
}
