"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileIcon, SearchIcon, TrashIcon, ExternalLinkIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PDF {
  id: number
  name: string
  size: number
  uploadedAt: string
  url: string
  title?: string
  description?: string
  pageCount?: number
}

export function PdfList() {
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function fetchPdfs() {
      try {
        setLoading(true)
        const response = await fetch("/api/pdfs")
        if (!response.ok) {
          throw new Error("Failed to fetch PDFs")
        }
        const data = await response.json()
        setPdfs(data.pdfs)
      } catch (error) {
        console.error("Error fetching PDFs:", error)
        toast({
          title: "Error",
          description: "Failed to load your PDFs",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPdfs()
  }, [toast])

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/pdfs/${id}/delete`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete PDF")
      }

      setPdfs(pdfs.filter((pdf) => pdf.id !== id))

      toast({
        title: "PDF deleted",
        description: "The PDF has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting PDF:", error)
      toast({
        title: "Error",
        description: "Failed to delete the PDF",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-muted/50" />
            <CardContent className="h-16 bg-muted/30 mt-4" />
            <CardFooter className="h-10 bg-muted/20 mt-4" />
          </Card>
        ))}
      </div>
    )
  }

  if (pdfs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">No PDFs found</h2>
        <p className="text-muted-foreground mb-4">Upload your first PDF to get started</p>
        <Button asChild>
          <Link href="/">Upload PDF</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pdfs.map((pdf) => (
        <Card key={pdf.id}>
          <CardHeader>
            <CardTitle className="flex items-start gap-2">
              <FileIcon className="h-5 w-5 mt-1 flex-shrink-0" />
              <span className="truncate">{pdf.title || pdf.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Size: {(pdf.size / 1024 / 1024).toFixed(2)} MB</p>
              <p>Uploaded: {new Date(pdf.uploadedAt).toLocaleDateString()}</p>
              {pdf.pageCount > 0 && <p>Pages: {pdf.pageCount}</p>}
              {pdf.description && <p className="mt-2 text-sm line-clamp-2">{pdf.description}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/viewer/${pdf.id}`}>
                  <ExternalLinkIcon className="h-4 w-4 mr-1" />
                  View
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/search?pdf=${pdf.id}`}>
                  <SearchIcon className="h-4 w-4 mr-1" />
                  Search
                </Link>
              </Button>
            </div>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(pdf.id)}>
              <TrashIcon className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
