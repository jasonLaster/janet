"use client";

import { useState, useCallback } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSetAtom } from "jotai";
import { searchQueryAtom, searchResultsAtom } from "@/lib/store";
import debounce from "lodash/debounce";
import { trpc } from "@/utils/trpcClient";

export function Search() {
  const setSearchQuery = useSetAtom(searchQueryAtom);
  const setSearchResults = useSetAtom(searchResultsAtom);
  const [inputValue, setInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const searchMutation = trpc.pdf.search.useMutation();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchQuery("");
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await searchMutation.mutateAsync({ query });
        const results = (response.results || []).map((hit) => {
          const h = hit as { id: number; title: string };
          return {
            id: h.id,
            query: h.title,
            score: 1,
          };
        });
        setSearchResults(results);
        setSearchQuery(query);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [setSearchQuery, setSearchResults, searchMutation]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    debouncedSearch(newValue);
  };

  return (
    <div className="relative mx-2 my-2">
      <SearchIcon
        className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
          isSearching ? "text-blue-500" : "text-muted-foreground"
        }`}
      />
      <Input
        type="search"
        placeholder="Search your PDFs..."
        className="pl-9 bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-input focus:border-input"
        value={inputValue}
        onChange={handleInputChange}
      />
    </div>
  );
}
