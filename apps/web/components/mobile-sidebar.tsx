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
      <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-center h-12 border-t bg-background md:hidden">
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <MenuIcon className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent side="bottom" className="p-0 md:hidden">
        <Sidebar pdfs={pdfs} />
      </SheetContent>
    </Sheet>
  );
}
