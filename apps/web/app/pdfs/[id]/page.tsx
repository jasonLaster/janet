import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf-viewer";
import { ArrowLeft, Download } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default function PDFViewPage({ params }: PageProps) {
  const { id } = params;

  return (
    <div className="container mx-auto py-6">
      <div className="border rounded-lg overflow-hidden bg-white">
        <PdfViewer pdfId={id} />
      </div>
    </div>
  );
}
