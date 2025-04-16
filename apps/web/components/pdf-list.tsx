"use client";

import { useState, useEffect, useContext } from "react";
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

interface PDF {
  id: number;
  name: string;
  size: number;
  uploadedAt: string;
  url: string;
  title?: string;
  description?: string;
  pageCount?: number;
}

export function PdfList() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const searchQuery = useContext(SearchContext);
  const { organization } = useOrganization();

  useEffect(() => {
    async function fetchPdfs() {
      try {
        setLoading(true);
        const response = await fetch("/api/pdfs");
        if (!response.ok) {
          throw new Error("Failed to fetch PDFs");
        }
        const data = await response.json();
        setPdfs(data.pdfs);
      } catch (error) {
        console.error("Error fetching PDFs:", error);
        toast({
          title: "Error",
          description: "Failed to load your PDFs",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPdfs();
  }, [toast, organization?.id]);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/pdfs/${id}/delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete PDF");
      }

      setPdfs(pdfs.filter((pdf) => pdf.id !== id));

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

  // Filter PDFs based on search query
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

  if (pdfs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">No PDFs found</h2>
        <p className="text-muted-foreground mb-4">
          Upload your first PDF to get started
        </p>
        <div className="flex justify-center gap-4">
          <FileUpload dropZoneOnly={true}>
            <Button>Upload PDF</Button>
          </FileUpload>
          <Button variant="outline" onClick={() => router.push("/chat")}>
            Go to Chat
          </Button>
        </div>
      </div>
    );
  }

  if (filteredPdfs.length === 0) {
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
