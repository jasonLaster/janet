import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PdfViewer } from "@/components/pdf-viewer"
import { ArrowLeft, Download } from "lucide-react"

interface PageProps {
  params: {
    id: string
  }
}

export default function PDFViewPage({ params }: PageProps) {
  const { id } = params

  // In a real app, fetch PDF details from the API
  const pdfName = id === "1" ? "Annual Report 2023.pdf" : id === "2" ? "Project Proposal.pdf" : "Research Paper.pdf"

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/pdfs">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{pdfName}</h1>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <PdfViewer pdfId={id} />
      </div>
    </div>
  )
}
