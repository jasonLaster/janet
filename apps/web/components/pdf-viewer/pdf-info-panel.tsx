"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

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

export function PdfInfoPanel({
  pdfMetadata,
  enhancedMetadata,
  isLoadingAiMetadata,
  metadataError,
}: PdfInfoPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        {metadataError && (
          <div className="mb-4 p-2 bg-red-50 rounded-md shadow-sm">
            <p className="text-red-700">Failed to load metadata.</p>
          </div>
        )}
        <dl className="space-y-2 text-sm">
          {enhancedMetadata?.summary && <div>{enhancedMetadata.summary}</div>}

          {enhancedMetadata?.labels && enhancedMetadata.labels.length > 0 && (
            <div>
              <dd>
                <div className="flex flex-wrap gap-1 mt-1">
                  {enhancedMetadata.issuingOrganization && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-violet-100 text-violet-800">
                      {enhancedMetadata.issuingOrganization}
                    </span>
                  )}

                  {enhancedMetadata.primaryDate && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                      {enhancedMetadata.primaryDate}
                    </span>
                  )}

                  {enhancedMetadata.labels.map((label, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
          )}

          {pdfMetadata.author && (
            <div>
              <dt className="text-gray-500">Author</dt>
              <dd>{pdfMetadata.author}</dd>
            </div>
          )}

          {pdfMetadata.subject && (
            <div>
              <dt className="text-gray-500">Subject</dt>
              <dd>{pdfMetadata.subject}</dd>
            </div>
          )}

          {pdfMetadata.creationDate && (
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd>{pdfMetadata.creationDate}</dd>
            </div>
          )}

          {enhancedMetadata?.documentType && (
            <div>
              <dt className="text-gray-500">Document Type</dt>
              <dd>{enhancedMetadata.documentType}</dd>
            </div>
          )}

          {enhancedMetadata?.accountHolder && (
            <div>
              <dt className="text-gray-500">Account Holder</dt>
              <dd>{enhancedMetadata.accountHolder}</dd>
            </div>
          )}

          {enhancedMetadata?.accountDetails && (
            <div>
              <dt className="text-gray-500">Account Details</dt>
              <dd>{enhancedMetadata.accountDetails}</dd>
            </div>
          )}

          {enhancedMetadata?.deadlines && (
            <div>
              <dt className="text-gray-500">Deadlines/Action Items</dt>
              <dd>{enhancedMetadata.deadlines}</dd>
            </div>
          )}

          {enhancedMetadata?.monetaryAmounts &&
            enhancedMetadata.monetaryAmounts.length > 0 && (
              <div>
                <dt className="text-gray-500">Monetary Amounts</dt>
                <dd>
                  <ul className="list-disc list-inside">
                    {enhancedMetadata.monetaryAmounts.map((amount, index) => (
                      <li key={index}>{amount}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

          {enhancedMetadata?.otherPeople &&
            enhancedMetadata.otherPeople.length > 0 && (
              <div>
                <dt className="text-gray-500">Other People Mentioned</dt>
                <dd>
                  <ul className="list-disc list-inside">
                    {enhancedMetadata.otherPeople.map((person, index) => (
                      <li key={index}>{person}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

          {pdfMetadata.producer && (
            <div>
              <dt className="text-gray-500">Producer</dt>
              <dd>{pdfMetadata.producer}</dd>
            </div>
          )}

          {pdfMetadata.creator && (
            <div>
              <dt className="text-gray-500">Creator</dt>
              <dd>{pdfMetadata.creator}</dd>
            </div>
          )}

          {isLoadingAiMetadata && (
            <div className="mt-4 text-center text-sm text-gray-500">
              <div className="animate-pulse">Analyzing document with AI...</div>
            </div>
          )}
        </dl>
      </div>
    </ScrollArea>
  );
}
