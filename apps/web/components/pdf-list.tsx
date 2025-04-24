"use client";

import { useEffect, useRef, useMemo } from "react";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { FileIcon, SearchIcon, SortAscIcon, MenuIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import {
  usePdfs,
  searchQueryAtom,
  metadataFilterAtom,
  searchResultsAtom,
  getFilteredPdfs,
} from "@/lib/store";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { PdfListItem } from "./pdf-list-item";

export function PdfList() {
  const { pdfs, isLoading: loading, error, refetch: fetchPdfs } = usePdfs();
  const searchQuery = useAtomValue(searchQueryAtom);
  const searchResults = useAtomValue(searchResultsAtom);
  const metadataFilter = useAtomValue(metadataFilterAtom);
  const { toast } = useToast();
  const router = useRouter();
  const { organization } = useOrganization();

  useEffect(() => {
    // SWR will fetch automatically, but we can manually trigger it too
    if (typeof fetchPdfs === "function") {
      fetchPdfs();
    }
  }, [fetchPdfs, organization?.id]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading PDFs",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/pdfs/${id}/delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete PDF");
      }

      fetchPdfs();

      toast({
        title: "PDF deleted",
        description: "The PDF has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to delete the PDF",
        variant: "destructive",
      });
    }
  };

  // Get filtered PDFs based on all active filters
  const filteredPdfs = useMemo(() => {
    // First apply all filters
    const filtered = getFilteredPdfs(
      pdfs,
      searchQuery,
      searchResults,
      metadataFilter
    );

    // Then sort by date
    return [...filtered].sort((a, b) => {
      const dateA = a.uploadedAt;
      const dateB = b.uploadedAt;
      const dateObjA = new Date(dateA);
      const dateObjB = new Date(dateB);
      return dateObjB.getTime() - dateObjA.getTime();
    });
  }, [pdfs, searchQuery, searchResults, metadataFilter]);

  // Row renderer for react-window
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
      />
    );
  };

  // Calculate item size (height)
  const ITEM_HEIGHT = 40; // Updated to match actual item height

  if (loading) {
    return (
      <div data-testid="pdf-list-loading" className="animate-pulse space-y-4">
        <div className="h-10 bg-muted/50 rounded-md w-full"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted/30 rounded-md w-full"></div>
        ))}
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>Error loading PDFs: {error}</p>
        <Button onClick={() => fetchPdfs()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (pdfs.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <FileIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">No PDFs found</h2>
        <p className="text-muted-foreground mb-4">
          Upload your first PDF to get started
        </p>
        <div className="flex justify-center gap-4">
          <FileUpload dropZoneOnly={true} className="w-auto" />
        </div>
      </div>
    );
  }

  if (filteredPdfs.length === 0 && pdfs.length > 0 && !loading) {
    // Determine appropriate message based on active filters
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
          <span className="font-medium">"{metadataFilter.value}"</span>
          {searchQuery && ' and search query "' + searchQuery + '"'}
        </>
      );
    } else if (searchQuery) {
      filterMessage = <>No PDFs match your search for "{searchQuery}"</>;
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
    <div
      data-testid="pdf-list"
      className="w-full h-full flex flex-col"
      style={{ height: "calc(100vh - 10px)" }}
    >
      <div className="flex-1 flex flex-col border-b overflow-hidden">
        {/* Header */}
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

        {/* Virtualized list container with AutoSizer */}
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
  );
}
