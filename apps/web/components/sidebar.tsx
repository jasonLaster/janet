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
import { PDF } from "@/lib/db";
import { cn } from "@/lib/utils";
import { SheetClose } from "@/components/ui/sheet";
import { X } from "lucide-react";

interface SidebarProps {
  pdfs: PDF[];
  className?: string;
  isSheetContext?: boolean;
}

export function Sidebar({ pdfs, className, isSheetContext }: SidebarProps) {
  return (
    <div className={cn("border-r flex flex-col h-full bg-stone-50", className)}>
      <div className="px-4 h-[45px] border-b flex justify-between items-center w-full">
        <SignedIn>
          <div className="flex-grow">
            <OrganizationSwitcher />
          </div>
          <div className="flex items-center gap-2">
            <FileUpload />
            {isSheetContext && (
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden bg-muted hover:bg-muted/90 rounded-lg h-6 w-6"
                >
                  <X className="h-3 w-3 stroke-[3]" />
                  <span className="sr-only">Close sidebar</span>
                </Button>
              </SheetClose>
            )}
          </div>
        </SignedIn>
      </div>

      <Search />

      {/* Scrollable content section */}
      <div className="flex-1 overflow-y-auto">
        <DocumentCompanies pdfs={pdfs} />
        <div className="border-t border-gray-100 mx-4"></div>
        <DocumentLabels pdfs={pdfs} />
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
      </div>
    </div>
  );
}
