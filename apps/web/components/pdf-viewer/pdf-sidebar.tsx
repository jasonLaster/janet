"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, FileText } from "lucide-react";
import { PdfThumbnails } from "./pdf-thumbnails";
import { PdfInfoPanel } from "./pdf-info-panel";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

export interface PdfSidebarProps {
  pdfUrl: string;
  numPages: number;
  currentPage: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  goToPage: (page: number) => void;
  changePage: (offset: number) => void;
  pdfMetadata?: EnhancedPdfMetadata;

  onDocumentLoadSuccess?: ({
    numPages,
    metadata,
  }: {
    numPages: number;
    metadata?: EnhancedPdfMetadata;
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

  onDocumentLoadSuccess,
}: PdfSidebarProps) {
  return (
    <Tabs
      defaultValue="info"
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full h-full flex flex-col"
    >
      <TabsList className="w-full grid grid-cols-2 px-2 rounded-none">
        <TabsTrigger value="info">
          <FileText className="h-4 w-4 mr-1" />
          <span className="sr-only sm:not-sr-only sm:inline-block text-xs">
            Info
          </span>
        </TabsTrigger>
        <TabsTrigger value="thumbnails">
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Icon has adjacent text label */}
          <Image className="h-4 w-4 mr-1" />
          <span className="sr-only sm:not-sr-only sm:inline-block text-xs">
            Pages
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="flex-1 m-0 overflow-hidden px-4">
        <PdfInfoPanel pdfMetadata={pdfMetadata} />
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
