"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";
import ReactMarkdown from "react-markdown";

export interface PdfInfoPanelProps {
  pdfMetadata?: EnhancedPdfMetadata;
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
export function PdfInfoPanel({ pdfMetadata }: PdfInfoPanelProps) {
  if (!pdfMetadata) {
    return null;
  }

  return (
    <ScrollArea className="h-full">
      <dl className="space-y-2 text-sm">
        <PdfInfoPanelItem label="Summary" value={pdfMetadata?.summary} />

        <PdfInfoPanelItem
          label="Document Type"
          value={pdfMetadata?.documentType}
        />

        <PdfInfoPanelItem
          label="Account Holder"
          value={pdfMetadata?.accountHolder}
        />

        <PdfInfoPanelItem
          label="Account Details"
          value={pdfMetadata?.accountDetails}
        />

        <PdfInfoPanelItem
          label="Deadlines/Action Items"
          value={pdfMetadata?.deadlines}
        />

        <PdfInfoPanelItem
          label="Deadlines/Action Items"
          value={pdfMetadata?.deadlines}
        />

        {pdfMetadata?.otherPeople && pdfMetadata.otherPeople.length > 0 && (
          <div>
            <dt className="text-gray-500">Other People Mentioned</dt>
            <dd>
              <ul className="list-disc list-inside">
                {pdfMetadata.otherPeople.map((person, index) => (
                  <li className="text-sm  list-none" key={index}>
                    {person}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </ScrollArea>
  );
}
