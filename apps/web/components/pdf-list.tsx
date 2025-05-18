"use client";

import { useMemo, useOptimistic, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { FileIcon, SearchIcon, SortAscIcon, MenuIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import {
  searchQueryAtom,
  metadataFilterAtom,
  searchResultsAtom,
  getFilteredPdfs,
} from "@/lib/store";
import { PDF } from "@/lib/db";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { PdfListItem } from "./pdf-list-item";
import { PdfPreviewPanel } from "./pdf-preview-panel";

interface PdfListProps {
  pdfs: PDF[];
}

export function PdfList({ pdfs }: PdfListProps) {
  const searchQuery = useAtomValue(searchQueryAtom);
  const searchResults = useAtomValue(searchResultsAtom);
  const metadataFilter = useAtomValue(metadataFilterAtom);
  const { toast } = useToast();
  const router = useRouter();
  useOrganization();

  const [optimisticPdfs, removeOptimisticPdf] = useOptimistic(
    pdfs,
    (state: PDF[], pdfIdToRemove: number) =>
      state.filter((pdf) => pdf.id !== pdfIdToRemove)
  );

  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleDelete = async (id: number) => {
    removeOptimisticPdf(id);

    try {
      const response = await fetch(`/api/pdfs/${id}/delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete PDF from server");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to delete the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredPdfs = useMemo(() => {
    const filtered = getFilteredPdfs(
      optimisticPdfs,
      searchQuery,
      searchResults.map((result) => ({ id: result.id, title: "" })),
      metadataFilter
    );

    return [...filtered].sort((a, b) => {
      const dateA = a.uploaded_at;
      const dateB = b.uploaded_at;
      const dateObjA = new Date(dateA);
      const dateObjB = new Date(dateB);
      return dateObjB.getTime() - dateObjA.getTime();
    });
  }, [optimisticPdfs, searchQuery, searchResults, metadataFilter]);

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const pdf = filteredPdfs[index];
    return (
      <PdfListItem
        key={pdf.id}
        pdf={pdf}
        handleDelete={handleDelete}
        style={style}
        onOpen={(p) => {
          setSelectedPdf(p);
          setViewerOpen(true);
        }}
      />
    );
  };

  const ITEM_HEIGHT = 40;

  if (pdfs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">No PDFs found</h2>
        <p className="text-muted-foreground mb-4">
          Upload your first PDF to get started
        </p>
        <div className="flex justify-center gap-4">
          <FileUpload className="w-auto" />
        </div>
      </div>
    );
  }

  if (filteredPdfs.length === 0 && pdfs.length > 0) {
    let filterMessage: React.ReactNode = "";

    if (metadataFilter.type && metadataFilter.value) {
      const filterType = metadataFilter.type === "label" ? "label" : "company";
      const filterIcon =
        metadataFilter.type === "label" ? (
          <span className="inline-block mx-1">🏷️</span>
        ) : (
          <span className="inline-block mx-1">🏢</span>
        );

      filterMessage = (
        <>
          No PDFs match the {filterType} {filterIcon}
          <span className="font-medium">
            &quot;{metadataFilter.value}&quot;
          </span>
          {searchQuery && ' and search query "' + searchQuery + '"'}
        </>
      );
    } else if (searchQuery) {
      filterMessage = (
        <>No PDFs match your search for &quot;{searchQuery}&quot;</>
      );
    }

    return (
      <div className="text-center py-12">
        <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">No matching PDFs</h2>
        <p className="text-muted-foreground mb-4">{filterMessage}</p>
        <Button variant="outline" onClick={() => router.refresh()}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        data-testid="pdf-list"
        className="w-full h-full flex flex-col"
        style={{ height: "calc(100vh - 10px)" }}
      >
        <div className="flex-1 flex flex-col border-b overflow-hidden">
        <div className="flex items-center p-3 font-medium text-sm bg-background z-10 border-b">
          <div className="flex-1">
            <div className="flex items-center gap-1">Document</div>
          </div>
          <div className="w-32 text-right flex items-center justify-end">
            Uploaded Date <SortAscIcon className="h-3 w-3 ml-1" />
          </div>
          <div className="w-12 mr-[15px] flex justify-center">
            <MenuIcon className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={filteredPdfs.length}
                itemSize={ITEM_HEIGHT}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        </div>
      </div>
      </div>
      {selectedPdf && (
        <PdfPreviewPanel
          pdf={selectedPdf}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
