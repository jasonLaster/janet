import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/file-upload"

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">PDF Manager</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Upload New PDF</h2>
          <FileUpload />
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/pdfs">View All PDFs</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/search">Search PDFs</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
