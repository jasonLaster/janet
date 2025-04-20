import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PDF_WORKER_URL } from "@/components/pdf-viewer/constants";
// Loading component to show while redirecting
function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse text-gray-500">Preparing PDF viewer...</div>
    </div>
  );
}

// This preloads the PDF viewer content
export function generateMetadata() {
  return {
    title: "PDF Viewer",
    description: "View your PDFs",
    preloadLinks: [
      // Preload the PDF.js worker
      {
        rel: "preload",
        href: PDF_WORKER_URL,
        as: "script",
      },
      // Preload the react-pdf module
      { rel: "modulepreload", href: "/chunks/react-pdf.js" },
    ],
  };
}

export default function PDFsRedirect() {
  return (
    <Suspense fallback={<Loading />}>
      <RedirectComponent />
    </Suspense>
  );
}

function RedirectComponent() {
  redirect("/");
  return null;
}
