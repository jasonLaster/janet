"use client";

import { useMemo, useState } from "react";
import { Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAtomValue, useSetAtom } from "jotai";
import {
  // usePdfs, // Keep commented out
  metadataFilterAtom,
  searchQueryAtom,
  searchResultsAtom,
  getFilteredPdfs,
} from "@/lib/store";
import { PDF } from "@/lib/db"; // Import PDF from lib/db
import { Button } from "@/components/ui/button";

interface DocumentCompaniesProps {
  pdfs: PDF[];
}

export function DocumentCompanies({ pdfs }: DocumentCompaniesProps) {
  const searchQuery = useAtomValue(searchQueryAtom);
  const searchResults = useAtomValue(searchResultsAtom);
  const metadataFilter = useAtomValue(metadataFilterAtom);
  const setMetadataFilter = useSetAtom(metadataFilterAtom);
  const [showAll, setShowAll] = useState(false);

  // Get filtered PDFs based on current filters
  const filteredPdfs = useMemo(
    () =>
      getFilteredPdfs(
        pdfs,
        searchQuery,
        // Map searchResults to the required {id, title} format
        searchResults.map((result) => ({ id: result.id, title: "" })), // Provide dummy title
        {
          ...metadataFilter,
          type: metadataFilter.type === "company" ? null : metadataFilter.type,
          value:
            metadataFilter.type === "company" ? null : metadataFilter.value,
        }
      ),
    [pdfs, searchQuery, searchResults, metadataFilter]
  );

  // Extract and count companies from filtered PDF metadata
  const companies = useMemo(() => {
    // Create a frequency map for each company
    const companyDocuments = new Map<string, Set<number>>();

    // Process each PDF
    filteredPdfs.forEach((pdf) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (pdf as any).metadata;
      // Skip if no metadata or issuing organization
      if (!metadata?.issuingOrganization) return;

      const company = metadata.issuingOrganization.trim();
      if (!company) return;

      // Add to tracking map
      if (!companyDocuments.has(company)) {
        companyDocuments.set(company, new Set());
      }

      // Add this document ID to the set of documents from this company
      companyDocuments.get(company)?.add(pdf.id);
    });

    // Convert to the Company[] format with counts
    return Array.from(companyDocuments.entries())
      .map(([name, documentIds]) => ({
        name,
        count: documentIds.size,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [filteredPdfs]);

  const handleCompanyClick = (company: string) => {
    // Check if already selected
    if (metadataFilter.type === "company" && metadataFilter.value === company) {
      // Clear the filter if clicking the same company
      setMetadataFilter({ type: null, value: null });
    } else {
      // Set new filter
      setMetadataFilter({ type: "company", value: company });
    }
  };

  if (companies.length === 0) {
    return (
      <div className="p-4">
        <div className="mb-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">
            Companies
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">No companies found</p>
      </div>
    );
  }

  // Determine which companies to show based on the showAll state
  const displayedCompanies = showAll ? companies : companies.slice(0, 10);
  const hasMoreCompanies = companies.length > 10;

  return (
    <div className="p-4">
      <div className="mb-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">
          Companies
        </h3>
      </div>
      <ul className="space-y-1">
        {displayedCompanies.map((company) => (
          <li key={company.name}>
            <button
              onClick={() => handleCompanyClick(company.name)}
              className={cn(
                "w-full flex justify-between items-center px-2 py-1 rounded-md text-sm",
                "transition-colors hover:bg-stone-200",
                metadataFilter.type === "company" &&
                  metadataFilter.value === company.name
                  ? "bg-stone-200 font-medium"
                  : ""
              )}
            >
              <span className="flex items-center min-w-0 max-w-[calc(100%-40px)]">
                <Building className="h-3 w-3 mr-2 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{company.name}</span>
              </span>
              <span className="ml-1 flex-shrink-0 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
                {company.count}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {hasMoreCompanies && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Less" : `Show ${companies.length - 10} More`}
        </Button>
      )}
    </div>
  );
}
