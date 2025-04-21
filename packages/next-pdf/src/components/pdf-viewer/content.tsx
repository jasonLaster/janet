import React, { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { PdfContentProps } from '../../types';
import { usePdfViewerContext } from '../../context/pdf-viewer-context';

/**
 * PDF content component that renders the PDF document and pages
 */
export const Content: React.FC<PdfContentProps> = ({
  className = '',
  children,
}) => {
  const {
    url,
    currentPage,
    scale,
    rotation,
    textLayerEnabled,
    isDocumentLoaded,
    setPage,
  } = usePdfViewerContext();

  const [windowHeight, setWindowHeight] = useState<number>(0);

  // Update window height for PDF sizing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowHeight(window.innerHeight);
      
      const handleResize = () => {
        setWindowHeight(window.innerHeight);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Render error message if PDF fails to load
  const renderError = () => (
    <div className="pdf-error">
      <p>Failed to load PDF. Please check the URL and try again.</p>
    </div>
  );

  // Loading component while PDF is loading
  const renderLoader = () => (
    <div className="pdf-loader">
      <p>Loading PDF...</p>
    </div>
  );

  return (
    <div className={`pdf-viewer-content ${className}`} data-testid="pdf-viewer-content">
      <Document
        file={url}
        onLoadSuccess={(pdf) => {
          if (pdf.numPages && currentPage > pdf.numPages) {
            setPage(1);
          }
        }}
        error={renderError}
        loading={renderLoader}
        noData={<div>No PDF document specified</div>}
      >
        {isDocumentLoaded && (
          <Page
            pageNumber={currentPage}
            scale={scale}
            rotate={rotation}
            renderTextLayer={textLayerEnabled}
            renderAnnotationLayer={true}
            height={windowHeight * 0.8}
          />
        )}
      </Document>
      {children}
    </div>
  );
};