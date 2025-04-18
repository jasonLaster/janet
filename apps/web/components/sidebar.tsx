import { FileUpload } from "@/components/file-upload";
import { Search } from "@/components/search";
import { DocumentLabels } from "@/components/document-labels";
import { DocumentCompanies } from "@/components/document-companies";
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

      {/* Scrollable content section */}
      <div className="flex-1 overflow-y-auto">
        <DocumentCompanies />
        <div className="border-t border-gray-100 mx-4"></div>
        <DocumentLabels />
      </div>

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
