import { FileUpload } from "@/components/file-upload";
import { Search } from "@/components/search";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  OrganizationSwitcher,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  return (
    <div className="w-64 border-r flex flex-col h-full bg-stone-50">
      <div className="p-4 border-b flex justify-between items-center w-full">
        <div className="grow-1">
          <OrganizationSwitcher />
        </div>
        <FileUpload className="grow-0" dropZoneOnly={true}></FileUpload>
      </div>

      <Search />

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
          <div className="p-2"></div>
        </SignedIn>
      </div>
    </div>
  );
}
