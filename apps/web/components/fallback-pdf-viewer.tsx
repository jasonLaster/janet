"use client"
import { Button } from "@/components/ui/button"
import { ExternalLink, Download, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FallbackPdfViewerProps {
  pdfUrl: string
  pdfTitle?: string
}

export function FallbackPdfViewer({ pdfUrl, pdfTitle = "Document" }: FallbackPdfViewerProps) {
  const { toast } = useToast()

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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b bg-muted/20">
        <h2 className="text-lg font-medium">{pdfTitle}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in New Tab
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-gray-100">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">{pdfTitle}</h3>
          <p className="mb-4 text-gray-600">This PDF can be viewed in a new tab or downloaded to your device.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={handleDownload}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open PDF in New Tab
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
