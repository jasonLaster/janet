"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { PDF } from "@/lib/db";

interface MobileSidebarProps {
  pdfs: PDF[];
}

export function MobileSidebar({ pdfs }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="fixed bottom-0 inset-x-0 z-40 flex h-12 w-full items-center justify-center border-t bg-background md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="p-0 w-full max-w-none left-0 right-0 md:hidden hide-default-sheet-close"
      >
        <Sidebar pdfs={pdfs} className="w-full md:w-64" isSheetContext={true} />
      </SheetContent>
    </Sheet>
  );
}
