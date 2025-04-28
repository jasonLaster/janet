import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getPdfById } from "@/lib/db";
import { PdfViewer } from "@/components/pdf-viewer";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export default async function PDFViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  return <PdfViewer pdf={pdf} />;
}
