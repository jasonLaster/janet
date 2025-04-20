import { useState, useEffect } from "react";
import { getPDFFromCache, cachePDF } from "@/lib/pdf-cache";

// This hook now focuses only on caching PDFs by ID and retrieving cached versions
export function usePDFDocument(pdfId?: string | number | null) {
  // Changed from ArrayBuffer to string since we're storing base64
  const [cachedDocument, setCachedDocument] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only proceed if we have a valid pdfId
    if (!pdfId) {
      setCachedDocument(null);
      setIsCached(false);
      setLoading(false);
      return;
    }

    // At this point, pdfId is guaranteed to be string | number
    const validPdfId: string | number = pdfId;

    // Check cache for existing PDF
    async function checkCache() {
      setLoading(true);

      try {
        // Now returns base64 string directly
        const cachedPDF = await getPDFFromCache(validPdfId);

        if (cachedPDF) {
          // Set the base64 string directly - no conversion needed!
          setCachedDocument(cachedPDF);
          setIsCached(true);
        } else {
          setCachedDocument(null);
          setIsCached(false);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unknown cache error");
        setCachedDocument(null);
        setIsCached(false);
      } finally {
        setLoading(false);
      }
    }
    checkCache();
  }, [pdfId]);

  // Function to cache a PDF after it's been loaded externally
  const cachePDFDocument = async (pdfData: ArrayBuffer) => {
    if (!pdfId) return;

    // Same type narrowing for the caching function
    const validPdfId: string | number = pdfId;

    try {
      await cachePDF(validPdfId, pdfData);
    } catch (err) {}
  };

  return {
    cachedDocument, // Now returns a base64 string
    loading,
    error,
    isCached,
    cachePDFDocument,
  };
}
