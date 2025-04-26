"use client";

import { Button } from "@/components/ui/button";
import { FileText, Search, MessageSquare, Users } from "lucide-react";
import { Waitlist, SignInButton } from "@clerk/nextjs";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import React from "react";

const Index = () => {
  const [showWaitlist, setShowWaitlist] = useState(false);

  return (
    <div className="min-h-screen bg-violet-50 text-violet-900 px-4 py-32 sm:px-6 lg:px-8 relative">
      <div className="absolute top-6 right-6 sm:right-10">
        <SignInButton mode="modal">
          <Button variant="outline" className="text-sm">
            Sign In
          </Button>
        </SignInButton>
      </div>

      <div className="mx-auto max-w-2xl">
        <header className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Janet Logo"
            width={32}
            height={32}
            className="object-contain -ml-[44px]"
          />
          <h1 className="text-lg  font-inter">
            <span className="font-bold text-violet-900">Janet</span>
          </h1>
        </header>

        <div className="prose prose-lg text-violet-900 mx-auto mt-6 mb-6 ">
          <p>
            Tired of documents coming in the mail and getting lost in the
            shuffle? With Janet, you can save your documents in one place, find
            them when you need them, and get answers on demand.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-16">
          <Feature
            icon={FileText}
            text="Automatically name, label, and summarize your documents"
          />
          <Feature
            icon={Search}
            text="Search across your files with natural language"
          />
          <Feature
            icon={MessageSquare}
            text="Chat with your documents to find answers instantly"
          />
          <Feature
            icon={Users}
            text="Share and collaborate with family and team members"
          />
        </div>

        <div className="">
          <Button
            size="lg"
            className="bg-violet-500 hover:bg-violet-600 text-lg h-12 px-8"
            onClick={() => setShowWaitlist(true)}
          >
            Join the Waitlist
          </Button>

          <Dialog open={showWaitlist} onOpenChange={setShowWaitlist}>
            <DialogContent className="sm:max-w-md">
              <Waitlist />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

const Feature = ({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) => (
  <div className="flex items-center space-x-4">
    <div className="flex-shrink-0">
      <Icon className="h-6 w-6 text-violet-800" />
    </div>
    <p className="text-lg ">{text}</p>
  </div>
);

export default Index;
