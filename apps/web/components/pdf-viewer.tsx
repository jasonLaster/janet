"use client"

import { useState, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Try to set up the worker with a more reliable approach
// We'll use a try-catch block to handle potential errors
try {
  // Try to use a different CDN
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
} catch (error) {
  console.error("Failed to set up PDF.js worker:", error)
  // If that fails, we'll handle it in the component
}

interface PdfViewerProps {
  pdfUrl: string
  pdfTitle?: string
  onError?: () => void
}

export function PdfViewer({ pdfUrl, pdfTitle = "Document", onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [workerError, setWorkerError] = useState<boolean>(false)
  const [pdfError, setPdfError] = useState<Error | null>(null)
  const { toast } = useToast()

  // Check if the worker is available
  useEffect(() => {
    const checkWorker = async () => {
      try {
        // Try to dynamically import the worker
        await import("pdfjs-dist/build/pdf.worker.entry")
      } catch (error) {
        console.error("Failed to load PDF.js worker:", error)
        setWorkerError(true)
        if (onError) onError()
      }
    }

    checkWorker()
  }, [onError])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setIsLoading(false)
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error)
    setPdfError(error)
    setIsLoading(false)

    toast({
      title: "Error loading PDF",
      description: error.message,
      variant: "destructive",
    })

    if (onError) onError()
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPageNumber = prevPageNumber + offset
      return newPageNumber >= 1 && newPageNumber <= numPages ? newPageNumber : prevPageNumber
    })
  }

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3))
  }

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5))
  }

  const handleRotate = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360)
  }

  const handleDownload = () => {
    if (!pdfUrl.startsWith("http") && !pdfUrl.startsWith("/")) {
      toast({
        title: "Download error",
        description: "Cannot download this PDF",
        variant: "destructive",
      })
      return
    }

    // Open the PDF in a new tab for download
    window.open(pdfUrl, "_blank")
  }

  // If we have a worker error or PDF error, show a fallback UI
  if (workerError || pdfError) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
          <h2 className="text-lg font-medium">{pdfTitle}</h2>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in New Tab
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-gray-100">
          <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">PDF Viewer Issue</h3>
            <p className="mb-4 text-gray-600">
              {workerError
                ? "We couldn't load the PDF viewer components. This might be due to network restrictions or browser security settings."
                : `We couldn't load this PDF: ${pdfError?.message || "Unknown error"}`}
            </p>
            <Button onClick={handleDownload}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open PDF in New Tab
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <div className="flex items-center gap-1 text-sm">
            <Input
              type="number"
              value={pageNumber}
              onChange={(e) => {
                const page = Number.parseInt(e.target.value)
                if (page >= 1 && page <= numPages) {
                  setPageNumber(page)
                }
              }}
              className="w-16 h-8"
              min={1}
              max={numPages}
            />
            <span>/ {numPages}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => changePage(1)} disabled={pageNumber >= numPages}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
            <span className="sr-only">Zoom out</span>
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
            <span className="sr-only">Zoom in</span>
          </Button>
          <Button variant="outline" size="icon" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
            <span className="sr-only">Rotate</span>
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-100">
        <div className="pdf-container">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-[600px] w-[450px]">
                <div className="animate-pulse text-gray-500">Loading PDF...</div>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-[600px] w-[450px] p-4 text-center">
                <div className="text-red-500 mb-4">Failed to load PDF</div>
                <Button onClick={handleDownload}>Open PDF in New Tab</Button>
              </div>
            }
            options={{
              cMapUrl: "https://unpkg.com/pdfjs-dist@3.4.120/cmaps/",
              cMapPacked: true,
            }}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              loading={
                <div className="flex items-center justify-center h-[600px] w-[450px]">
                  <div className="animate-pulse text-gray-500">Loading page {pageNumber}...</div>
                </div>
              }
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="pdf-page"
            />
          </Document>
        </div>
      </div>
    </div>
  )
}
