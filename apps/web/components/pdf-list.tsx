"use client";

import { useEffect, useRef } from "react";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { FileIcon, SearchIcon, SortAscIcon, MenuIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { usePdfs, searchQueryAtom, metadataFilterAtom } from "@/lib/store";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { PdfListItem } from "./pdf-list-item";

export function PdfList() {
  const { pdfs, isLoading: loading, error, refetch: fetchPdfs } = usePdfs();
  const searchQuery = useAtomValue(searchQueryAtom);
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

  // Sort PDFs by date (newest first)
  const sortedPdfs = [...pdfs].sort((a, b) => {
    // Use primary date from metadata if available, otherwise use uploadedAt
    const dateA = (a as any).metadata?.primaryDate || a.uploadedAt;
    const dateB = (b as any).metadata?.primaryDate || b.uploadedAt;

    // Convert to Date objects for comparison
    const dateObjA = new Date(dateA);
    const dateObjB = new Date(dateB);

    // Sort newest first (descending order)
    return dateObjB.getTime() - dateObjA.getTime();
  });

  // Filter PDFs based on both search query and metadata filter
  const filteredPdfs = sortedPdfs.filter((pdf) => {
    // First apply text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        pdf.title?.toLowerCase().includes(query) ||
        false ||
        pdf.name.toLowerCase().includes(query) ||
        pdf.description?.toLowerCase().includes(query) ||
        false ||
        // Also search in metadata
        (pdf as any).metadata?.descriptiveTitle
          ?.toLowerCase()
          .includes(query) ||
        false ||
        (pdf as any).metadata?.labels?.some((label: string) =>
          label.toLowerCase().includes(query)
        ) ||
        false;

      if (!matchesSearch) return false;
    }

    // Then apply metadata filter if active
    if (metadataFilter.type && metadataFilter.value) {
      const metadata = (pdf as any).metadata;

      if (metadataFilter.type === "label") {
        // Check if the PDF has this label
        return (
          metadata?.labels &&
          Array.isArray(metadata.labels) &&
          metadata.labels.includes(metadataFilter.value)
        );
      }

      if (metadataFilter.type === "company") {
        // Check if the PDF is from this company
        return metadata?.issuingOrganization === metadataFilter.value;
      }
    }

    // If no metadata filter or it passed the filter
    return true;
  });

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
  const ITEM_HEIGHT = 60; // Updated to match actual item height

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
        <div className="flex items-center p-3 font-medium text-sm bg-background z-10 shadow-sm border-b">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              Document <SortAscIcon className="h-3 w-3 ml-1" />
            </div>
          </div>
          <div className="w-28 text-right flex items-center justify-end">
            Date
          </div>
          <div className="w-12 flex justify-center">
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
