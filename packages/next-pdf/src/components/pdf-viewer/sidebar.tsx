import React from 'react';
import { PdfSidebarProps } from '../../types';
import { usePdfViewerContext } from '../../context/pdf-viewer-context';

/**
 * Sidebar component for the PDF viewer
 */
export const Sidebar: React.FC<PdfSidebarProps> = ({
  className = '',
  children,
}) => {
  const { sidebarVisible } = usePdfViewerContext();

  if (!sidebarVisible) {
    return null;
  }

  return (
    <div className={`pdf-viewer-sidebar ${className}`} data-testid="pdf-viewer-sidebar">
      {children}
    </div>
  );
};