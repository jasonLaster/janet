import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PdfViewerPage } from "@/components/pdf-viewer-page";
import { getPdfById } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PDFViewerPage({ params }: PageProps) {
  // Authentication check
  const { userId } = await auth();
  if (!userId) {
    // Redirect to sign-in page if not authenticated
    redirect("/sign-in"); // Assuming your Clerk sign-in page is at /sign-in
  }

  const id = Number.parseInt(params.id, 10);

  if (isNaN(id)) {
    notFound();
  }

  // NOTE: We don't strictly *need* to fetch the PDF here anymore for security,
  // because the API called by PdfViewerPage is already secured.
  // However, fetching here can provide a slightly better UX by showing
  // the "Not Found" state immediately if the PDF doesn't exist for the user,
  // rather than waiting for the client-side fetch.
  try {
    const pdf = await getPdfById(id, userId);

    if (!pdf) {
      // Use notFound() which renders the standard Next.js 404 page
      notFound();
    }

    // PDF exists and belongs to the user, render the viewer page component
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <PdfViewerPage pdfId={id} />
        </div>
      </div>
    );
  } catch (error) {
    console.error(`Error in viewer page for ID ${id}:`, error);
    // Generic error page for database or other unexpected errors
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
