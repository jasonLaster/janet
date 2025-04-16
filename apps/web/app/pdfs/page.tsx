import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PdfList } from "@/components/pdf-list"

export default function PDFsPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your PDFs</h1>
        <Button asChild>
          <Link href="/">Upload New</Link>
        </Button>
      </div>

      <PdfList />
    </div>
  )
}
