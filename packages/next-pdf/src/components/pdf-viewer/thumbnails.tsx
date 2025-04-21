import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { PdfThumbnailsProps } from '../../types';
import { usePdfViewerContext } from '../../context/pdf-viewer-context';

/**
 * Thumbnails component for the PDF viewer sidebar
 */
export const Thumbnails: React.FC<PdfThumbnailsProps> = ({
  className = '',
  width = 120,
  gap = 8,
}) => {
  const {
    url,
    currentPage,
    totalPages,
    setPage,
  } = usePdfViewerContext();

  const [pages, setPages] = useState<number[]>([]);

  // Generate array of page numbers when total pages changes
  useEffect(() => {
    if (totalPages > 0) {
      setPages(Array.from({ length: totalPages }, (_, i) => i + 1));
    }
  }, [totalPages]);

  // Handle thumbnail click
  const handleThumbnailClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  return (
    <div className={`pdf-viewer-thumbnails ${className}`} data-testid="pdf-viewer-thumbnails">
      <Document
        file={url}
        loading={<div>Loading thumbnails...</div>}
        error={<div>Error loading thumbnails</div>}
      >
        {pages.map((pageNumber) => (
          <div
            key={`thumbnail-${pageNumber}`}
            className={`pdf-viewer-thumbnail ${currentPage === pageNumber ? 'active' : ''}`}
            onClick={() => handleThumbnailClick(pageNumber)}
            style={{ 
              marginBottom: gap,
              cursor: 'pointer',
              border: currentPage === pageNumber ? '2px solid blue' : '1px solid #ddd',
              padding: '4px'
            }}
          >
            <Page
              pageNumber={pageNumber}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={<div style={{ width, height: width * 1.4 }}>Loading...</div>}
            />
            <div className="pdf-viewer-thumbnail-label">
              {pageNumber}
            </div>
          </div>
        ))}
      </Document>
    </div>
  );
};