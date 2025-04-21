import React from 'react';
import { PdfNavigationProps } from '../../types';
import { usePdfViewerContext } from '../../context/pdf-viewer-context';

/**
 * Navigation component for page navigation controls
 */
export const Navigation: React.FC<PdfNavigationProps> = ({
  className = '',
  showPageInput = true,
  showTotalPages = true,
}) => {
  const {
    currentPage,
    totalPages,
    setPage,
    previousPage,
    nextPage,
  } = usePdfViewerContext();

  // Handle page input change
  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageNumber = parseInt(e.target.value, 10);
    if (!isNaN(pageNumber)) {
      setPage(pageNumber);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNumber = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(pageNumber)) {
        setPage(pageNumber);
      }
    }
  };

  return (
    <div className={`pdf-viewer-navigation ${className}`} data-testid="pdf-viewer-navigation">
      <button
        className="pdf-viewer-navigation-prev"
        onClick={previousPage}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      
      {showPageInput && (
        <input
          type="number"
          className="pdf-viewer-navigation-input"
          value={currentPage}
          onChange={handlePageChange}
          onKeyDown={handleKeyDown}
          min={1}
          max={totalPages}
          aria-label="Page number"
        />
      )}
      
      {showTotalPages && (
        <span className="pdf-viewer-navigation-total">
          of {totalPages}
        </span>
      )}
      
      <button
        className="pdf-viewer-navigation-next"
        onClick={nextPage}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
};