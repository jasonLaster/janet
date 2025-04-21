import { useState, useEffect } from 'react';
import { getDocument, PDFDocumentProxy } from 'pdfjs-dist';
import { PdfMetadata } from '../types';

/**
 * Hook for loading and managing a PDF document
 */
export const usePdfDocument = (url: string) => {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  useEffect(() => {
    if (!url) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadDocument = async () => {
      try {
        const loadingTask = getDocument(url);
        const pdfDocument = await loadingTask.promise;
        
        if (!isMounted) return;
        
        // Extract basic metadata
        const metaData = await pdfDocument.getMetadata();
        const info = metaData.info as Record<string, any>;
        
        const extractedMetadata: PdfMetadata = {
          title: info.Title,
          author: info.Author,
          subject: info.Subject,
          keywords: info.Keywords,
          creator: info.Creator,
          producer: info.Producer,
          creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
          modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
          pageCount: pdfDocument.numPages,
        };
        
        setDocument(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setMetadata(extractedMetadata);
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (document) {
        document.destroy();
      }
    };
  }, [url]);

  return {
    document,
    isLoading,
    error,
    metadata,
    totalPages,
  };
};