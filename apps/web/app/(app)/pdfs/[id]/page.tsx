import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf-viewer";
import { getPdfById } from "@/lib/db";
import { ArrowLeft, Download } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PDFViewPage({ params }: PageProps) {
  const { userId, orgId } = await auth();
  const pdfId = Number.parseInt(params.id);

  if (!userId) {
    return <div>Unauthorized</div>;
  }

  if (isNaN(pdfId)) {
    notFound();
  }

  const pdf = await getPdfById(pdfId, userId, orgId);

  if (!pdf) {
    notFound();
  }

  return (
    <PdfViewer pdfUrl={pdf.blob_url} pdfTitle={pdf.title || pdf.filename} />
  );
}
