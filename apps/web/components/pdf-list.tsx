"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import {
  FileIcon,
  SearchIcon,
  TrashIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  SortAscIcon,
  Trash2,
  Building,
  Tag,
  Calendar,
  MenuIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAtom, useAtomValue } from "jotai";
import {
  pdfsAtom,
  pdfsLoadingAtom,
  pdfsErrorAtom,
  fetchPdfsAtom,
  searchQueryAtom,
  metadataFilterAtom,
  PDF,
} from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PdfList() {
  const pdfs = useAtomValue(pdfsAtom);
  const loading = useAtomValue(pdfsLoadingAtom);
  const error = useAtomValue(pdfsErrorAtom);
  const [, fetchPdfs] = useAtom(fetchPdfsAtom);
  const searchQuery = useAtomValue(searchQueryAtom);
  const metadataFilter = useAtomValue(metadataFilterAtom);
  const { toast } = useToast();
  const router = useRouter();
  const { organization } = useOrganization();

  useEffect(() => {
    fetchPdfs();
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

  // Filter PDFs based on both search query and metadata filter
  const filteredPdfs = pdfs.filter((pdf) => {
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
          <Tag className="h-4 w-4 mx-1 inline" />
        ) : (
          <Building className="h-4 w-4 mx-1 inline" />
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
    <div data-testid="pdf-list" className="w-full h-full flex flex-col">
      <div className="flex-1 flex flex-col border-b">
        {/* Header */}
        <div className="sticky top-0 flex items-center p-3 font-medium text-sm bg-background z-10 shadow-sm border-b">
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

        {/* Scrollable container */}
        <div className="flex-1 overflow-y-auto">
          {/* PDF Items */}
          {filteredPdfs.map((pdf) => (
            <PdfListItem key={pdf.id} pdf={pdf} handleDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}

// New component for metadata display
function DocumentMetadata({ metadata }: { metadata: any }) {
  // Calculate visible labels dynamically, default is 3 but fewer if organization exists
  const maxVisibleLabels = metadata.issuingOrganization ? 2 : 3;
  const labels = metadata.labels || [];
  const visibleLabels = labels.slice(0, maxVisibleLabels);
  const hiddenCount = Math.max(0, labels.length - maxVisibleLabels);

  return (
    <div className="flex flex-nowrap overflow-hidden ml-2 max-w-full">
      {metadata.issuingOrganization && (
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0.5 shrink-0 truncate"
        >
          <Building className="h-3 w-3 mr-1 opacity-70 flex-shrink-0" />
          <span className="truncate">{metadata.issuingOrganization}</span>
        </Badge>
      )}
      <div className="flex overflow-hidden flex-nowrap">
        {visibleLabels.map((label: string, index: number) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs px-1.5 py-0.5 ml-1 shrink-0 truncate"
          >
            <Tag className="h-3 w-3 mr-1 opacity-70 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 ml-1 shrink-0 cursor-pointer"
                >
                  +{hiddenCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="p-2 max-w-xs">
                <div className="flex flex-col space-y-1">
                  {labels.map((label: string, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5 justify-start w-full"
                    >
                      <Tag className="h-3 w-3 mr-1 opacity-70" />
                      {label}
                    </Badge>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

function PdfListItem({
  pdf,
  handleDelete,
}: {
  pdf: PDF;
  handleDelete: (id: number) => void;
}) {
  const router = useRouter();
  const metadata = (pdf as any).metadata || {};

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Use descriptive title from metadata if available, otherwise fallback to title or filename
  const displayTitle = metadata.descriptiveTitle || pdf.title || pdf.name;
  // Use primary date from metadata if available, otherwise use uploaded date
  const displayDate = metadata.primaryDate || formatDate(pdf.uploadedAt);

  return (
    <div className="flex items-center px-3  py-3 border-b hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <Link
          data-testid="pdf-list-item"
          href={`/pdfs/${pdf.id}`}
          className="block w-full"
        >
          <div className="flex items-center w-full min-w-0">
            <div className="min-w-0 flex-1 pr-4 overflow-hidden">
              <div className="flex items-center overflow-hidden">
                <div className="font-medium text-sm mr-2 whitespace-nowrap">
                  {displayTitle}
                </div>
                <div className="overflow-hidden flex-shrink min-w-0">
                  <DocumentMetadata metadata={metadata} />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="text-sm text-right whitespace-nowrap w-28">
        <div className="flex items-center justify-end">
          <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
          <span>{displayDate}</span>
        </div>
      </div>

      <div className="w-12 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/pdfs/${pdf.id}`)}>
              <ExternalLinkIcon className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/chat?pdf=${pdf.id}`)}
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              Chat with PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/search?pdf=${pdf.id}`)}
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              Search Inside
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(pdf.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">
                Delete &quot;{pdf.title || pdf.name}&quot;
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
