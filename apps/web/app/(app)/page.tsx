import { PdfList } from "@/components/pdf-list";
import { Sidebar } from "@/components/sidebar";
import { getAllPdfs, PDF } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export default async function HomePage() {
  const { userId, orgId } = await auth();

  let pdfs: PDF[] = [];
  if (orgId) {
    try {
      pdfs = await getAllPdfs("", orgId);
    } catch (error) {
      console.error(`Failed to fetch PDFs for org ${orgId}:`, error);
    }
  } else if (userId) {
    try {
      pdfs = await getAllPdfs(userId, null);
    } catch (error) {
      console.error(`Failed to fetch PDFs for user ${userId}:`, error);
    }
  } else {
    console.log("No user or org context, skipping PDF fetch.");
  }

  return (
    <>
      <Sidebar pdfs={pdfs} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <PdfList pdfs={pdfs} />
        </main>
      </div>
    </>
  );
}
