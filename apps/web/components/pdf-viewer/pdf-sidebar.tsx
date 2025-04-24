"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, FileText } from "lucide-react";
import { PdfThumbnails } from "./pdf-thumbnails";
import { PdfInfoPanel } from "./pdf-info-panel";
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

export interface PdfSidebarProps {
  pdfUrl: string;
  numPages: number;
  currentPage: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  goToPage: (page: number) => void;
  changePage: (offset: number) => void;
  pdfMetadata: PdfMetadata;
  enhancedMetadata: EnhancedPdfMetadata | null;
  isLoadingAiMetadata: boolean;
  metadataError: boolean;
  onDocumentLoadSuccess?: ({
    numPages,
    metadata,
  }: {
    numPages: number;
    metadata?: any;
  }) => void;
}

export function PdfSidebar({
  pdfUrl,
  numPages,
  currentPage,
  activeTab,
  setActiveTab,
  goToPage,
  changePage,
  pdfMetadata,
  enhancedMetadata,
  isLoadingAiMetadata,
  metadataError,
  onDocumentLoadSuccess,
}: PdfSidebarProps) {
  return (
    <Tabs
      defaultValue="info"
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full h-full flex flex-col"
    >
      <TabsList className="w-full grid grid-cols-2 px-2">
        <TabsTrigger value="info">
          <FileText className="h-4 w-4 mr-1" />
          <span className="sr-only sm:not-sr-only sm:inline-block text-xs">
            Info
          </span>
        </TabsTrigger>
        <TabsTrigger value="thumbnails">
          <Image className="h-4 w-4 mr-1" />
          <span className="sr-only sm:not-sr-only sm:inline-block text-xs">
            Pages
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="flex-1 m-0 overflow-hidden">
        <PdfInfoPanel
          pdfMetadata={pdfMetadata}
          enhancedMetadata={enhancedMetadata}
          isLoadingAiMetadata={isLoadingAiMetadata}
          metadataError={metadataError}
        />
      </TabsContent>

      <TabsContent
        value="thumbnails"
        className="flex-1 m-0 overflow-hidden flex flex-col"
      >
        <PdfThumbnails
          pdfUrl={pdfUrl}
          numPages={numPages}
          currentPage={currentPage}
          goToPage={goToPage}
          changePage={changePage}
          onLoadSuccess={onDocumentLoadSuccess}
        />
      </TabsContent>
    </Tabs>
  );
}
