"use client";

import { useState, createContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileUpload } from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  OrganizationSwitcher,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

// Create a context for the search query
export const SearchContext = createContext("");

// Renamed from LayoutWrapper to RootLayout or similar standard name for layout files
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col h-full">
        {/* Logo and Title */}
        <div className="p-4 border-b flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Janet Logo" width={24} height={24} />
            <h1 className="text-xl font-semibold">Janet</h1>
          </Link>
        </div>

        {/* Navigation - Empty for now, for future use */}
        <nav className="flex-1 p-4">
          <div className="text-sm text-muted-foreground">
            Available space for future navigation elements
          </div>
        </nav>

        {/* User/Upload Area in Sidebar - Still uses SignedIn/Out */}
        <div className="mt-auto">
          <SignedOut>
            {/* Optionally keep a sign-in prompt here, or remove if redundant */}
            <div className="p-2 text-center">
              <SignInButton mode="modal">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </SignInButton>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="p-2">
              <FileUpload dropZoneOnly={true}></FileUpload>
            </div>
            <div className="p-2 border-t flex items-center justify-between">
              <OrganizationSwitcher />
              {/* Add other signed-in user controls if needed */}
            </div>
          </SignedIn>
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

        {/* Main content area - No longer needs SignedIn/SignedOut wrapper */}
        <main className="flex-1 overflow-auto">
          <SearchContext.Provider value={searchQuery}>
            {children}
          </SearchContext.Provider>
        </main>
      </div>
    </div>
  );
}
