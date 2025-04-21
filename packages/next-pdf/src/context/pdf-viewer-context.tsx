import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDocument, PDFDocumentProxy } from 'pdfjs-dist';
import { PdfViewerContextState, PdfMetadata } from '../types';

// Default context state
const defaultContextState: PdfViewerContextState = {
  url: '',
  currentPage: 1,
  totalPages: 0,
  scale: 1,
  rotation: 0,
  isDocumentLoaded: false,
  textLayerEnabled: true,
  sidebarVisible: true,
  isLoading: false,
  error: null,
  document: null,
  metadata: null,
  
  // Methods with empty implementations (will be overridden)
  setPage: () => {},
  nextPage: () => {},
  previousPage: () => {},
  setScale: () => {},
  zoomIn: () => {},
  zoomOut: () => {},
  setRotation: () => {},
  rotateClockwise: () => {},
  rotateCounterclockwise: () => {},
  toggleTextLayer: () => {},
  toggleSidebar: () => {},
  downloadPdf: () => {},
};

// Create the context
export const PdfViewerContext = createContext<PdfViewerContextState>(defaultContextState);

// Custom hook to use the context
export const usePdfViewerContext = () => useContext(PdfViewerContext);

export interface PdfViewerProviderProps {
  /** Children components */
  children: React.ReactNode;
  /** URL to the PDF file (optional at provider level) */
  url?: string;
  /** Initial page number */
  initialPage?: number;
  /** Default zoom/scale level */
  defaultScale?: number;
  /** Default rotation in degrees */
  defaultRotation?: number;
  /** Whether the text layer is enabled by default */
  textLayerEnabled?: boolean;
  /** Whether the sidebar is visible by default */
  sidebarVisible?: boolean;
}

export const PdfViewerProvider: React.FC<PdfViewerProviderProps> = ({
  children,
  url = '',
  initialPage = 1,
  defaultScale = 1,
  defaultRotation = 0,
  textLayerEnabled = true,
  sidebarVisible = true,
}) => {
  // State
  const [currentUrl, setCurrentUrl] = useState<string>(url);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(defaultScale);
  const [rotation, setRotation] = useState<number>(defaultRotation);
  const [isDocumentLoaded, setIsDocumentLoaded] = useState<boolean>(false);
  const [isTextLayerEnabled, setIsTextLayerEnabled] = useState<boolean>(textLayerEnabled);
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(sidebarVisible);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);

  // Update URL if it changes at provider level
  useEffect(() => {
    if (url && url !== currentUrl) {
      setCurrentUrl(url);
    }
  }, [url, currentUrl]);

  // Load the document when URL changes
  useEffect(() => {
    if (!currentUrl) return;

    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const loadingTask = getDocument(currentUrl);
        const pdfDocument = await loadingTask.promise;
        
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
        setIsDocumentLoaded(true);
        
        // Reset page number if needed
        if (currentPage > pdfDocument.numPages) {
          setCurrentPage(1);
        }
      } catch (err) {
        setError(err as Error);
        setIsDocumentLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();

    // Cleanup
    return () => {
      if (document) {
        document.destroy();
        setDocument(null);
        setIsDocumentLoaded(false);
      }
    };
  }, [currentUrl]);

  // Page navigation methods
  const setPage = (pageNumber: number) => {
    if (!totalPages) return;
    
    // Ensure page number is within valid range
    const validPage = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Zoom methods
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.1, 3));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.1, 0.5));
  };

  // Rotation methods
  const rotateClockwise = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  const rotateCounterclockwise = () => {
    setRotation(prevRotation => (prevRotation - 90 + 360) % 360);
  };

  // Toggle methods
  const toggleTextLayer = () => {
    setIsTextLayerEnabled(prev => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(prev => !prev);
  };

  // Download method
  const downloadPdf = () => {
    if (currentUrl && typeof window !== 'undefined') {
      const link = window.document.createElement('a');
      link.href = currentUrl;
      link.download = metadata?.title || 'document.pdf';
      link.target = '_blank';
      link.click();
    }
  };

  // Context value
  const contextValue: PdfViewerContextState = {
    url: currentUrl,
    currentPage,
    totalPages,
    scale,
    rotation,
    isDocumentLoaded,
    textLayerEnabled: isTextLayerEnabled,
    sidebarVisible: isSidebarVisible,
    isLoading,
    error,
    document,
    metadata,
    
    // Methods
    setPage,
    nextPage,
    previousPage,
    setScale,
    zoomIn,
    zoomOut,
    setRotation,
    rotateClockwise,
    rotateCounterclockwise,
    toggleTextLayer,
    toggleSidebar,
    downloadPdf,
  };

  return (
    <PdfViewerContext.Provider value={contextValue}>
      {children}
    </PdfViewerContext.Provider>
  );
};