import React, { useEffect } from 'react';
import { PdfViewerRootProps } from '../../types';
import { usePdfViewerContext } from '../../context/pdf-viewer-context';

/**
 * Root component for the PDF viewer
 * Acts as the main container and coordinates all child components
 */
export const Root: React.FC<PdfViewerRootProps> = ({
  url,
  initialPage = 1,
  defaultScale = 1,
  defaultRotation = 0,
  enableTextLayer = true,
  enableAnnotations = true,
  showSidebar = true,
  className = '',
  onDocumentLoadSuccess,
  onDocumentLoadError,
  onPageChange,
  children,
}) => {
  const {
    setPage,
    document,
    error,
    isDocumentLoaded,
    currentPage,
    setScale,
    setRotation,
  } = usePdfViewerContext();

  // Set initial values when component mounts
  useEffect(() => {
    if (initialPage) setPage(initialPage);
    if (defaultScale) setScale(defaultScale);
    if (defaultRotation) setRotation(defaultRotation);
  }, [initialPage, defaultScale, defaultRotation]);

  // Call onDocumentLoadSuccess when document is loaded
  useEffect(() => {
    if (isDocumentLoaded && document) {
      onDocumentLoadSuccess?.({
        numPages: document.numPages,
        document,
      });
    }
  }, [isDocumentLoaded, document, onDocumentLoadSuccess]);

  // Call onDocumentLoadError when there's an error
  useEffect(() => {
    if (error) {
      onDocumentLoadError?.(error);
    }
  }, [error, onDocumentLoadError]);

  // Call onPageChange when current page changes
  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  return (
    <div className={`pdf-viewer ${className}`} data-testid="pdf-viewer-root">
      {children}
    </div>
  );
};