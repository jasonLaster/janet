import Link from "next/link";
import Image from "next/image";
import { FileUpload } from "@/components/file-upload";
import { Search } from "@/components/search";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  OrganizationSwitcher,
  SignOutButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
              {/* <SignOutButton /> */}
              {/* Add other signed-in user controls if needed */}
            </div>
          </SignedIn>
        </div>
      </div>

      {/* Main Content with Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with search */}
        <header className="border-b p-4">
          <Search />
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
