import React from 'react';
import { PdfToolbarProps, PdfToolbarSlotProps } from '../../types';
import { usePdfViewerContext } from '../../context/pdf-viewer-context';

/**
 * Toolbar component for PDF viewer controls
 */
export const Toolbar: React.FC<PdfToolbarProps> = ({
  className = '',
  children,
}) => {
  return (
    <div className={`pdf-viewer-toolbar ${className}`} data-testid="pdf-viewer-toolbar">
      <div className="pdf-viewer-toolbar-start">
        {/* Filter and render children for the start slot */}
        {React.Children.toArray(children).filter((child) => {
          if (React.isValidElement(child) && child.type === ToolbarSlot) {
            return (child.props as PdfToolbarSlotProps).name === 'start';
          }
          // For direct children without slots, default to start position
          return true;
        })}
      </div>
      <div className="pdf-viewer-toolbar-center">
        {/* Filter and render children for the center slot */}
        {React.Children.toArray(children).filter((child) => {
          if (React.isValidElement(child) && child.type === ToolbarSlot) {
            return (child.props as PdfToolbarSlotProps).name === 'center';
          }
          return false;
        })}
      </div>
      <div className="pdf-viewer-toolbar-end">
        {/* Filter and render children for the end slot */}
        {React.Children.toArray(children).filter((child) => {
          if (React.isValidElement(child) && child.type === ToolbarSlot) {
            return (child.props as PdfToolbarSlotProps).name === 'end';
          }
          return false;
        })}
      </div>
    </div>
  );
};

/**
 * Toolbar slot component for positioning toolbar items
 */
export const ToolbarSlot: React.FC<PdfToolbarSlotProps> = ({
  name,
  children,
}) => {
  // This component is just a wrapper for slot identification
  // The actual rendering is handled by the Toolbar component
  return <>{children}</>;
};

/**
 * Zoom controls component for the toolbar
 */
export const ZoomControls: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { scale, zoomIn, zoomOut } = usePdfViewerContext();

  return (
    <div className={`pdf-viewer-zoom-controls ${className}`}>
      <button onClick={zoomOut} aria-label="Zoom out">-</button>
      <span>{Math.round(scale * 100)}%</span>
      <button onClick={zoomIn} aria-label="Zoom in">+</button>
    </div>
  );
};

/**
 * Rotate button component for the toolbar
 */
export const RotateButton: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { rotateClockwise } = usePdfViewerContext();

  return (
    <button 
      className={`pdf-viewer-rotate-button ${className}`}
      onClick={rotateClockwise}
      aria-label="Rotate"
    >
      Rotate
    </button>
  );
};

/**
 * Download button component for the toolbar
 */
export const DownloadButton: React.FC<{ className?: string, label?: string }> = ({
  className = '',
  label = 'Download',
}) => {
  const { downloadPdf } = usePdfViewerContext();

  return (
    <button 
      className={`pdf-viewer-download-button ${className}`}
      onClick={downloadPdf}
      aria-label="Download PDF"
    >
      {label}
    </button>
  );
};