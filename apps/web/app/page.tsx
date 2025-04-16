import { PdfList } from "@/components/pdf-list";

export default function HomePage() {
  return (
    <div className="p-6">
      {/* List view */}
      <div className="bg-white border rounded-md p-2">
        <PdfList />
      </div>
    </div>
  );
}
