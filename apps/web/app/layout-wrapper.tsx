"use client";

import { useState, createContext } from "react";
import Link from "next/link";
import { FileUpload } from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { FileIcon, SearchIcon } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

// Create a context for the search query
export const SearchContext = createContext("");

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col h-full">
        {/* Logo and Title */}
        <div className="p-4 border-b flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <FileIcon className="h-6 w-6 text-blue-500" />
            <h1 className="text-xl font-semibold">Janet</h1>
          </Link>
        </div>

        {/* Navigation - Empty for now, for future use */}
        <nav className="flex-1 p-4">
          <div className="text-sm text-muted-foreground">
            Available space for future navigation elements
          </div>
        </nav>

        {/* Upload Area */}
        <div className="p-2 mt-auto">
          <SignedOut>
            <SignInButton className="text-blue-500 underline hover:cursor " />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        <div className="p-2 mt-auto">
          <FileUpload dropZoneOnly={true}></FileUpload>
        </div>
      </div>

      {/* Main Content with Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with search */}
        <header className="border-b p-4">
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
        </header>

        {/* Main content with search query passed as prop */}
        <div className="flex-1 overflow-auto">
          {/* Pass the searchQuery to the child components via context */}
          <SearchContext.Provider value={searchQuery}>
            {children}
          </SearchContext.Provider>
        </div>
      </div>
    </div>
  );
}
