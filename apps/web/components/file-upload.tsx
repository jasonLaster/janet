"use client";

import type React from "react";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileIcon, UploadCloudIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  dropZoneOnly?: boolean;
  className?: string;
}

export function FileUpload({
  dropZoneOnly = false,
  className = "",
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }
    setFile(selectedFile);

    // If dropZoneOnly is true, upload immediately
    if (dropZoneOnly && !uploading) {
      handleUpload(selectedFile);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set dragging to false if leaving the actual drop zone (not a child element)
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Explicitly set the drop effect to 'copy'
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleUpload = async (fileToUpload = file) => {
    if (!fileToUpload) return;

    setUploading(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append("pdf", fileToUpload);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      clearInterval(interval);
      setProgress(100);

      toast({
        title: "Upload successful",
        description: "Your PDF has been uploaded",
      });

      // Reset form and refresh data
      setTimeout(() => {
        setFile(null);
        setUploading(false);
        setProgress(0);
        // Only refresh the page, don't navigate away
        router.refresh();
      }, 1000);
    } catch (error) {
      clearInterval(interval);
      setUploading(false);

      toast({
        title: "Upload failed",
        description: "There was an error uploading your PDF",
        variant: "destructive",
      });
    }
  };

  const dropZoneContent = (
    <div className="bg-blue-500 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors cursor-pointer border-2  border-blue-400 h-8 w-40 text-sm">
      <UploadCloudIcon className="h-5 w-5" />
      <span>Upload PDF</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div
        ref={dropZoneRef}
        className={`${className || "hover:bg-muted/50 transition-colors"} ${
          isDragging ? "bg-accent/40 border-accent" : ""
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dropZoneContent}
        <Input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {file && !dropZoneOnly && (
        <div className="p-3 border rounded-lg flex items-center gap-3">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {uploading ? (
            <Progress value={progress} className="w-20" />
          ) : (
            <Button size="sm" onClick={() => handleUpload()}>
              Upload
            </Button>
          )}
        </div>
      )}

      {uploading && dropZoneOnly && (
        <div className="p-3 border rounded-lg flex items-center gap-3">
          <FileIcon className="h-5 w-5 text-muted-foreground mr-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file?.name}</p>
          </div>
          <Progress value={progress} className="w-20" />
        </div>
      )}
    </div>
  );
}
