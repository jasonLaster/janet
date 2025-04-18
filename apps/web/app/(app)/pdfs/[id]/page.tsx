import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getPdfById } from "@/lib/db";
import { PdfViewer } from "@/components/pdf-viewer";

interface PageProps {
  params: {
    id: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function PDFViewPage({ params }: PageProps) {
  const { id } = await params;
  const pdfId = Number.parseInt(id);

  const { userId } = await auth();
  if (!userId) {
    return <div>Unauthorized</div>;
  }

  if (isNaN(pdfId)) {
    notFound();
  }

  const pdf = await getPdfById(pdfId);

  if (!pdf) {
    notFound();
  }

  if (typeof pdf !== "object" || pdf === null || !("blob_url" in pdf)) {
    console.error("PDF object is not valid or missing blob_url", pdf);
    notFound();
  }

  // Log metadata for debugging
  console.log(`PDF ${pdfId} has metadata:`, pdf.metadata ? "Yes" : "No");

  return (
    // @ts-ignore - Interface issue will be resolved with full implementation
    <PdfViewer
      pdfUrl={pdf.blob_url}
      pdfTitle={pdf.title || pdf.filename}
      pdfId={pdfId}
      existingMetadata={pdf.metadata}
    />
  );
}
