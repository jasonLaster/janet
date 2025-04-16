"use client"

import { useState, useEffect } from "react"
import { PdfViewer } from "@/components/pdf-viewer"
import { FallbackPdfViewer } from "@/components/fallback-pdf-viewer"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PdfViewerPageProps {
  pdfId: number
}

export function PdfViewerPage({ pdfId }: PdfViewerPageProps) {
  const [pdfData, setPdfData] = useState<{
    url: string
    title: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    async function fetchPdfData() {
      try {
        setLoading(true)
        console.log(`Fetching PDF data for ID: ${pdfId}`)

        const response = await fetch(`/api/pdfs/${pdfId}`)
        console.log(`API response status: ${response.status}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error(`API error response:`, errorData)
          throw new Error(errorData.error || `Failed to fetch PDF data (Status: ${response.status})`)
        }

        const data = await response.json()
        console.log(`PDF data received:`, data)

        setPdfData({
          url: data.url,
          title: data.title || data.name,
        })
      } catch (error) {
        console.error("Error fetching PDF data:", error)
        setError(error instanceof Error ? error.message : "Failed to load PDF data")
      } finally {
        setLoading(false)
      }
    }

    fetchPdfData()
  }, [pdfId])

  // Function to handle fallback when the PDF viewer fails
  const handleViewerError = () => {
    setUseFallback(true)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Skeleton className="w-[600px] h-[800px]" />
      </div>
    )
  }

  if (error || !pdfData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="mb-4">{error || "Failed to load PDF"}</p>
          <Button asChild>
            <Link href="/pdfs">Back to PDFs</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Use the fallback viewer if needed
  if (useFallback) {
    return <FallbackPdfViewer pdfUrl={pdfData.url} pdfTitle={pdfData.title} />
  }

  return <PdfViewer pdfUrl={pdfData.url} pdfTitle={pdfData.title} onError={handleViewerError} />
}
