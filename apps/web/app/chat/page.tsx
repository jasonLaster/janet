"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { useChat } from "ai/react";

// Define the attachment type
interface Attachment {
  url: string;
  name: string;
  contentType: string;
}

export default function ChatWithPDF() {
  const [messages, setMessages] = useState<
    { id: string; role: string; content: string; attachments?: Attachment[] }[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useChat({
    api: "/api/chat", // Ensure this points to your Next.js API route
    onError: (error: unknown) => {
      // Handle errors, e.g., show a toast notification
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to get response.",
        variant: "destructive",
      });
    },
    body: { pdfUrl: files ? URL.createObjectURL(files[0]) : null }, // Pass the pdfUrl to the API
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() && !files?.length) return;

    // Create attachment URLs for files if they exist
    const attachments = [];
    let pdfUrl = "";

    if (files?.length) {
      const file = files[0]; // For now, just use the first file
      const fileUrl = URL.createObjectURL(file);
      pdfUrl = fileUrl;

      attachments.push({
        url: fileUrl,
        name: file.name,
        contentType: file.type,
      });
    }

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      attachments: attachments.length ? attachments : undefined,
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

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
      toast({
        title: "Error",
        description: `Failed to get response: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setFiles(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl py-12 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat with Your PDFs</h1>
      <p className="text-muted-foreground mb-6">
        Upload PDFs and ask questions about their contents.
      </p>

      <div className="flex-1 overflow-y-auto mb-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`whitespace-pre-wrap p-4 rounded-lg ${
              m.role === "user" ? "bg-muted" : "bg-muted/50"
            }`}
          >
            <div className="font-semibold mb-2">
              {m.role === "user" ? "You" : "AI"}:
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {m.role === "assistant" ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
            <div className="mt-3">
              {m.attachments
                ?.filter(
                  (attachment) =>
                    attachment?.contentType?.startsWith("image/") ||
                    attachment?.contentType?.startsWith("application/pdf")
                )
                .map((attachment, index) =>
                  attachment.contentType?.startsWith("image/") ? (
                    <Image
                      key={`${m.id}-${index}`}
                      src={attachment.url}
                      width={500}
                      height={500}
                      alt={attachment.name ?? `attachment-${index}`}
                      className="rounded-md"
                    />
                  ) : attachment.contentType?.startsWith("application/pdf") ? (
                    <iframe
                      key={`${m.id}-${index}`}
                      src={attachment.url}
                      width="100%"
                      height="600"
                      title={attachment.name ?? `attachment-${index}`}
                      className="border rounded-md"
                    />
                  ) : null
                )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="animate-pulse">Generating response...</div>
          </div>
        )}
      </div>

      <form
        className="w-full p-4 border border-input rounded-lg shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="mb-4">
          <input
            type="file"
            className="w-full mb-2"
            onChange={(event) => {
              if (event.target.files) {
                setFiles(event.target.files);
              }
            }}
            accept=".pdf"
            ref={fileInputRef}
          />
          <p className="text-xs text-muted-foreground">
            Upload PDFs to ask questions about them
          </p>
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 p-2 border rounded-md"
            value={input}
            placeholder="Ask a question about your PDF..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
