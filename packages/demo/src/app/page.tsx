"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the PDF viewer with no SSR to avoid DOM API issues
const PDFViewerWithNoSSR = dynamic(
  () => import('../components/pdf-viewer-wrapper'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">PDF Viewer Demo</h1>
      
      <div className="w-full max-w-6xl border border-gray-300 rounded-lg overflow-hidden">
        <PDFViewerWithNoSSR />
      </div>
    </main>
  );
}