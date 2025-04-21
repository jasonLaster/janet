import { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * Basic PDF metadata extracted from the document
 */
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}

/**
 * Event data when a PDF document is successfully loaded
 */
export interface PdfDocumentLoadSuccess {
  numPages: number;
  document: PDFDocumentProxy;
}

/**
 * Props for the PdfViewer root component
 */
export interface PdfViewerRootProps {
  /** URL to the PDF file */
  url: string;
  /** Optional initial page number (1-indexed) */
  initialPage?: number;
  /** Default zoom level */
  defaultScale?: number;
  /** Default rotation (in degrees, must be a multiple of 90) */
  defaultRotation?: number;
  /** Enable or disable text layer */
  enableTextLayer?: boolean;
  /** Enable or disable annotations */
  enableAnnotations?: boolean;
  /** Show or hide the sidebar */
  showSidebar?: boolean;
  /** Sidebar width in pixels */
  sidebarWidth?: number;
  /** Custom class name for the container */
  className?: string;
  /** Event handler for when the document loads successfully */
  onDocumentLoadSuccess?: (data: PdfDocumentLoadSuccess) => void;
  /** Event handler for when the document fails to load */
  onDocumentLoadError?: (error: Error) => void;
  /** Event handler for when the current page changes */
  onPageChange?: (pageNumber: number) => void;
  /** Children components */
  children?: React.ReactNode;
}

/**
 * Props for the PDF content component
 */
export interface PdfContentProps {
  /** Custom class name */
  className?: string;
  /** Children components (usually not needed) */
  children?: React.ReactNode;
}

/**
 * Props for the toolbar component
 */
export interface PdfToolbarProps {
  /** Custom class name */
  className?: string;
  /** Children components (toolbar items) */
  children?: React.ReactNode;
}

/**
 * Props for the toolbar slot component
 */
export interface PdfToolbarSlotProps {
  /** Slot name/position (start, center, end) */
  name: 'start' | 'center' | 'end';
  /** Children components */
  children: React.ReactNode;
}

/**
 * Props for the sidebar component
 */
export interface PdfSidebarProps {
  /** Custom class name */
  className?: string;
  /** Children components (sidebar content) */
  children?: React.ReactNode;
}

/**
 * Props for the thumbnails component
 */
export interface PdfThumbnailsProps {
  /** Custom class name */
  className?: string;
  /** Optional thumbnail width in pixels */
  width?: number;
  /** Gap between thumbnails in pixels */
  gap?: number;
}

/**
 * Props for the navigation component
 */
export interface PdfNavigationProps {
  /** Custom class name */
  className?: string;
  /** Show or hide page input */
  showPageInput?: boolean;
  /** Show or hide total pages */
  showTotalPages?: boolean;
}

/**
 * Props for the zoom controls component
 */
export interface PdfZoomControlsProps {
  /** Custom class name */
  className?: string;
  /** Zoom step percentage (default: 0.1 = 10%) */
  zoomStep?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
}

/**
 * Props for the rotate button component
 */
export interface PdfRotateButtonProps {
  /** Custom class name */
  className?: string;
  /** Rotation step in degrees (default: 90) */
  rotationStep?: number;
}

/**
 * Props for the download button component
 */
export interface PdfDownloadButtonProps {
  /** Custom class name */
  className?: string;
  /** Button label */
  label?: string;
}

/**
 * PDF Viewer context state
 */
export interface PdfViewerContextState {
  /** URL to the PDF file */
  url: string;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Current zoom/scale level */
  scale: number;
  /** Current rotation in degrees */
  rotation: number;
  /** Whether the document is loaded */
  isDocumentLoaded: boolean;
  /** Whether the text layer is enabled */
  textLayerEnabled: boolean;
  /** Whether the sidebar is visible */
  sidebarVisible: boolean;
  /** Whether the document is loading */
  isLoading: boolean;
  /** Error if document failed to load */
  error: Error | null;
  /** PDF document instance */
  document: PDFDocumentProxy | null;
  /** Basic PDF metadata */
  metadata: PdfMetadata | null;
  
  // Methods
  /** Set the current page number */
  setPage: (pageNumber: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  previousPage: () => void;
  /** Set the zoom/scale level */
  setScale: (scale: number) => void;
  /** Zoom in by the configured step */
  zoomIn: () => void;
  /** Zoom out by the configured step */
  zoomOut: () => void;
  /** Set the rotation in degrees */
  setRotation: (rotation: number) => void;
  /** Rotate clockwise by the configured step */
  rotateClockwise: () => void;
  /** Rotate counterclockwise by the configured step */
  rotateCounterclockwise: () => void;
  /** Toggle the text layer */
  toggleTextLayer: () => void;
  /** Toggle the sidebar visibility */
  toggleSidebar: () => void;
  /** Download the PDF */
  downloadPdf: () => void;
}