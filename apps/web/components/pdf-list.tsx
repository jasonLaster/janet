"use client";

import { useContext, useEffect } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchContext } from "@/app/(app)/layout";
import { useAtom, useAtomValue } from "jotai";
import {
  pdfsAtom,
  pdfsLoadingAtom,
  pdfsErrorAtom,
  fetchPdfsAtom,
} from "@/lib/store";

export function PdfList() {
  const pdfs = useAtomValue(pdfsAtom);
  const loading = useAtomValue(pdfsLoadingAtom);
  const error = useAtomValue(pdfsErrorAtom);
  const [, fetchPdfs] = useAtom(fetchPdfsAtom);
  const { toast } = useToast();
  const router = useRouter();
  const searchQuery = useContext(SearchContext);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const filteredPdfs = pdfs.filter((pdf) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      pdf.title?.toLowerCase().includes(query) ||
      false ||
      pdf.name.toLowerCase().includes(query) ||
      pdf.description?.toLowerCase().includes(query) ||
      false
    );
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
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
          <Button variant="outline" onClick={() => router.push("/chat")}>
            Go to Chat
          </Button>
        </div>
      </div>
    );
  }

  if (filteredPdfs.length === 0 && pdfs.length > 0 && !loading) {
    return (
      <div className="text-center py-12">
        <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">No matching PDFs</h2>
        <p className="text-muted-foreground mb-4">
          No PDFs match your search for "{searchQuery}"
        </p>
        <Button variant="outline" onClick={() => router.refresh()}>
          Clear Search
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60%]">
              <div className="flex items-center gap-1">
                Name <SortAscIcon className="h-3 w-3 ml-1" />
              </div>
            </TableHead>
            <TableHead>Last modified</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPdfs.map((pdf) => (
            <TableRow key={pdf.id} className="hover:bg-muted/50 cursor-pointer">
              <TableCell
                className="font-medium"
                onClick={() => router.push(`/pdfs/${pdf.id}`)}
              >
                <div className="flex items-center gap-2">
                  <FileIcon className="h-5 w-5 text-blue-500" />
                  <span className="truncate">{pdf.title || pdf.name}</span>
                </div>
              </TableCell>
              <TableCell>{formatDate(pdf.uploadedAt)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontalIcon className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/pdfs/${pdf.id}`)}
                    >
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
                      onClick={() => handleDelete(pdf.id)}
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
