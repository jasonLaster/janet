"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileIcon, SearchIcon } from "lucide-react";
import { useSearchParams, redirect } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { debounce } from "lodash";
import { useState, useEffect, useRef, useMemo } from "react";

interface PDF {
  id: number;
  name: string;
  title?: string;
}

interface SearchResult {
  pdfId: number;
  pdfName: string;
  page: number;
  text: string;
  context: string;
}

export default function SearchRedirect({
  searchParams,
}: {
  searchParams: { pdf?: string; q?: string };
}) {
  // If there's an existing search query, redirect to home with the query
  if (searchParams.q) {
    redirect(`/?q=${encodeURIComponent(searchParams.q)}`);
  }

  // If there's a PDF ID, redirect to home with PDF ID
  if (searchParams.pdf) {
    redirect(`/?pdf=${encodeURIComponent(searchParams.pdf)}`);
  }

  // Otherwise just redirect to home
  redirect("/");
  return null;
}

const SearchPageComponent = () => {
  const [query, setQuery] = useState("");
  const [pdfFilter, setPdfFilter] = useState<string>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(true);

  const searchParams = useSearchParams();
  const pdfIdParam = searchParams?.get("pdf");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pdfIdParam) {
      setPdfFilter(pdfIdParam);
    }
  }, [pdfIdParam]);

  useEffect(() => {
    async function fetchPdfs() {
      try {
        setIsLoadingPdfs(true);
        const response = await fetch("/api/pdfs");
        if (!response.ok) {
          throw new Error("Failed to fetch PDFs");
        }
        const data = await response.json();
        setPdfs(data.pdfs);
      } catch (error) {
        console.error("Error fetching PDFs:", error);
      } finally {
        setIsLoadingPdfs(false);
      }
    }

    fetchPdfs();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    // In a real app, this would call the API to search PDFs
    // For demo purposes, we'll simulate a search with mock data
    setTimeout(() => {
      const mockResults: SearchResult[] = [
        {
          pdfId: 1,
          pdfName: "Annual Report 2023.pdf",
          page: 4,
          text: "Financial Performance",
          context:
            "...The company's financial performance exceeded expectations with a 15% increase in revenue compared to the previous year...",
        },
        {
          pdfId: 2,
          pdfName: "Project Proposal.pdf",
          page: 2,
          text: "Project Timeline",
          context:
            "...The project timeline spans 6 months, with key milestones scheduled at the end of each month...",
        },
        {
          pdfId: 3,
          pdfName: "Research Paper.pdf",
          page: 7,
          text: "Methodology",
          context:
            "...The research methodology employed a mixed-methods approach, combining qualitative interviews with quantitative surveys...",
        },
      ];

      // Filter results if a specific PDF is selected
      const filteredResults =
        pdfFilter === "all"
          ? mockResults
          : mockResults.filter((r) => r.pdfId === Number(pdfFilter));

      setResults(filteredResults);
      setIsSearching(false);
    }, 1500);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" asChild>
          <Link href="/pdfs">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Search PDFs</h1>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Enter your search query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={pdfFilter}
                  onValueChange={setPdfFilter}
                  disabled={isLoadingPdfs}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingPdfs ? "Loading PDFs..." : "All PDFs"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PDFs</SelectItem>
                    {pdfs.map((pdf) => (
                      <SelectItem key={pdf.id} value={pdf.id.toString()}>
                        {pdf.title || pdf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {hasSearched && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            {isSearching
              ? "Searching..."
              : results.length > 0
              ? `${results.length} results found`
              : "No results found"}
          </h2>

          {isSearching ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-12 bg-muted/50" />
                  <CardContent className="h-24 bg-muted/30" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <Card key={index}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          {result.pdfName}
                        </CardTitle>
                      </div>
                      <CardDescription>Page {result.page}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <p className="mb-2 font-medium">{result.text}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.context}
                    </p>
                  </CardContent>
                  <div className="px-6 py-3 bg-muted/20 flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/viewer/${result.pdfId}?page=${result.page}`}
                      >
                        <SearchIcon className="h-4 w-4 mr-1" />
                        View in PDF
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
