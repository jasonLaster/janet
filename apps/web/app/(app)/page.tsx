import { PdfList } from "@/components/pdf-list";
import { Sidebar } from "@/components/sidebar";

export default function HomePage() {
  return (
    <>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <PdfList />
        </main>
      </div>
    </>
  );
}
