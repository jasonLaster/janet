import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PdfViewerPage } from "@/components/pdf-viewer-page";
import { getPdfById } from "@/lib/db";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PDFViewerPage({ params }: PageProps) {
  const id = Number.parseInt(params.id, 10);

  if (isNaN(id)) {
    notFound();
  }

  try {
    const pdf = await getPdfById(id);

    if (!pdf) {
      return (
        <div className="container mx-auto py-10">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="icon" asChild>
              <Link href="/pdfs">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">PDF Not Found</h1>
          </div>
          <div className="p-8 text-center">
            <p className="mb-4">
              The requested PDF (ID: {id}) could not be found.
            </p>
            <Button asChild>
              <Link href="/pdfs">Back to PDFs</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <PdfViewerPage pdfId={id} />
        </div>
      </div>
    );
  } catch (error) {
    console.error(`Error in viewer page for ID ${id}:`, error);
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link href="/pdfs">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Error Loading PDF</h1>
        </div>
        <div className="p-8 text-center">
          <p className="mb-4">
            There was an error loading the PDF. Please try again later.
          </p>
          <Button asChild>
            <Link href="/pdfs">Back to PDFs</Link>
          </Button>
        </div>
      </div>
    );
  }
}
