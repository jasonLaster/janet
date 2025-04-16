"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SendHorizontal } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface FloatingPdfChatProps {
  pdfId: number;
  pdfTitle: string;
  pdfUrl: string;
  onClose: () => void;
}

export function FloatingPdfChat({
  pdfId,
  pdfTitle,
  pdfUrl,
  onClose,
}: FloatingPdfChatProps) {
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [messages, setMessages] = useState<
    { id: string; role: string; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          pdfUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      // Add assistant response to chat
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text,
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      toast({
        title: "Error",
        description: `Failed to get response: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 max-w-md w-full bg-background shadow-lg border rounded-lg overflow-hidden transition-all duration-200 z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Chat with PDF</h3>
        </div>
        <div className="flex items-center">
          {expanded ? (
            <MinusIcon
              className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setExpanded(false)}
            />
          ) : (
            <PlusIcon
              className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setExpanded(true)}
            />
          )}
          <X
            className="h-5 w-5 ml-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleClose}
          />
        </div>
      </div>

      {expanded && (
        <>
          <ScrollArea className="h-[400px] p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <p className="mb-2">Ask questions about your PDF document</p>
                <p className="text-sm">
                  "What is this document about?"
                  <br />
                  "Summarize the key points"
                  <br />
                  "Extract the data from page 3"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col max-w-[90%] rounded-lg p-3",
                      message.role === "user"
                        ? "ml-auto bg-muted"
                        : "bg-muted/50"
                    )}
                  >
                    <div className="prose dark:prose-invert prose-sm max-w-none">
                      {message.role === "assistant" ? (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex flex-col max-w-[90%] rounded-lg p-3 bg-muted">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse delay-150" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse delay-300" />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex flex-col max-w-[90%] rounded-lg p-3 bg-destructive/10 text-destructive">
                    <p className="text-sm">Error: {error.message}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <form
              onSubmit={handleSubmit}
              className="flex items-center space-x-2"
            >
              <Input
                placeholder="Ask a question..."
                value={input}
                onChange={handleInputChange}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}
