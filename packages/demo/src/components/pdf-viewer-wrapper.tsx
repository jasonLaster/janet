"use client";

import React, { useEffect } from "react";
import { PdfViewer, PdfViewerProvider } from "@pdf-viewer/next-pdf";
import { pdfjs } from "react-pdf";

export default function PdfViewerWrapper() {
  // Sample PDF URL
  const pdfUrl = "http://localhost:3002/zoning.pdf";

  // Initialize PDF.js worker on the client side
  useEffect(() => {
    // This is the key part - set worker directly using pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;
  }, []);

  return (
    <PdfViewerProvider url={pdfUrl}>
      <div className="flex flex-col h-[80vh]">
        <PdfViewer.Toolbar className="p-2 bg-gray-100 border-b">
          <PdfViewer.ToolbarSlot name="start">
            <PdfViewer.ZoomControls className="flex items-center space-x-2" />
            <PdfViewer.RotateButton className="ml-4 px-3 py-1 bg-blue-500 text-white rounded" />
          </PdfViewer.ToolbarSlot>

          <PdfViewer.ToolbarSlot name="end">
            <PdfViewer.DownloadButton
              className="px-3 py-1 bg-green-500 text-white rounded"
              label="Download PDF"
            />
          </PdfViewer.ToolbarSlot>
        </PdfViewer.Toolbar>

        <div className="flex flex-1 overflow-hidden">
          <PdfViewer.Sidebar className="w-48 bg-gray-50 border-r overflow-y-auto">
            <PdfViewer.Thumbnails />
          </PdfViewer.Sidebar>

          <div className="flex-1 overflow-auto flex flex-col items-center">
            <PdfViewer.Content className="flex-1 flex justify-center p-4" />
            <PdfViewer.Navigation className="p-2 bg-gray-100 border-t w-full flex justify-center space-x-4" />
          </div>
        </div>
      </div>
    </PdfViewerProvider>
  );
}
