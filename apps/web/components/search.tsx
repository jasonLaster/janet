"use client";

import { useAtom } from "jotai";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchQueryAtom } from "@/lib/store";

export function Search() {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);

  return (
    <div className="relative max-w-2xl">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search your PDFs..."
        className="pl-9"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
