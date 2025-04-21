"use client";

import React, { ReactNode, useEffect } from "react";
import { usePdfs } from "@/lib/store";

interface PdfStoreProviderProps {
  children: ReactNode;
  debug?: boolean; // Add a debug prop to show loading state
}

/**
 * PdfStoreProvider initializes the PDF store with SWR and ensures
 * the SWR hooks run at the top level of the app.
 *
 * To use this provider, add it to your app's layout or root component:
 *
 * ```tsx
 * // In app/layout.tsx or similar
 * import { PdfStoreProvider } from "@/components/pdf-store-provider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <PdfStoreProvider>
 *           {children}
 *         </PdfStoreProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function PdfStoreProvider({
  children,
  debug = false,
}: PdfStoreProviderProps) {
  // Initialize SWR for PDFs
  const { pdfs, isLoading, error, refetch } = usePdfs();

  // Log initial fetch status
  useEffect(() => {
    console.log("PdfStoreProvider mounted, fetching PDFs");

    // Add a delayed refetch to ensure data is loaded
    const timer = setTimeout(() => {
      if (pdfs?.length === 0 && !isLoading) {
        console.log("No PDFs loaded after initial fetch, triggering refetch");
        refetch();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [pdfs, isLoading, refetch]);

  // Log whenever the data changes
  useEffect(() => {
    console.log(
      `PDF store data updated: ${
        pdfs?.length || 0
      } PDFs loaded, loading: ${isLoading}`
    );
    if (error) {
      console.error("PDF loading error:", error);
    }
  }, [pdfs, isLoading, error]);

  // When debugging, show loading state
  if (debug) {
    return (
      <>
        {isLoading && (
          <div className="fixed top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm z-50">
            Loading PDFs...
          </div>
        )}
        {error && (
          <div className="fixed top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-md text-sm z-50">
            Error: {error}
          </div>
        )}
        {!isLoading && !error && (
          <div className="fixed top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-md text-sm z-50">
            {pdfs?.length || 0} PDFs loaded
          </div>
        )}
        {children}
      </>
    );
  }

  // Regular rendering - no debug info
  return <>{children}</>;
}
