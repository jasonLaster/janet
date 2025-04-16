"use client";

import React from "react";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  uploadingFilesAtom,
  uploadFileAtom,
  removeUploadingFileAtom,
} from "@/lib/store";

interface FileUploadProps {
  dropZoneOnly?: boolean;
  className?: string;
}

export function FileUpload({
  dropZoneOnly = false,
  className = "",
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useAtom(uploadingFilesAtom);
  const [, uploadFile] = useAtom(uploadFileAtom);
  const [, removeFile] = useAtom(removeUploadingFileAtom);

  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const processFiles = (selectedFiles: FileList | File[]) => {
    const pdfFiles = Array.from(selectedFiles).filter(
      (file) => file.type === "application/pdf"
    );
    const nonPdfFiles = Array.from(selectedFiles).filter(
      (file) => file.type !== "application/pdf"
    );

    if (nonPdfFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: `${nonPdfFiles.length} file(s) were not PDFs and were ignored.`,
        variant: "default",
      });
    }

    pdfFiles.forEach((file) => {
      if (
        !uploadingFiles.some(
          (f) => f.file.name === file.name && (f.uploading || f.progress === 0)
        )
      ) {
        uploadFile(file);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = "";
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
    const relatedTarget = e.relatedTarget as Node;
    if (!dropZoneRef.current?.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const isAnyFileUploading = uploadingFiles.some((f) => f.uploading);

  const dropZoneText = isDragging
    ? "Drop PDF(s) here"
    : uploadingFiles.length > 0
    ? "Add more PDFs..."
    : dropZoneOnly
    ? "Upload PDF"
    : "Drag & Drop PDF(s) or Click to Upload";

  const dropZoneContent = (
    <div
      className={`text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer border-2 border-dashed h-12 w-full text-sm ${
        isDragging
          ? "bg-blue-600 border-blue-300"
          : "bg-blue-500 hover:bg-blue-600 border-blue-400"
      }`}
    >
      <UploadCloudIcon className="h-5 w-5" />
      <span>{dropZoneText}</span>
    </div>
  );

  return (
    <div className="space-y-4 w-full">
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(({ id, file, progress, uploading, error }) => (
            <div
              key={id}
              className="p-3 border rounded-lg flex items-center gap-3"
            >
              <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                {!error && (uploading || progress > 0) && progress < 100 && (
                  <Progress value={progress} className="w-full h-2 mt-1" />
                )}
                {error && (
                  <p className="text-xs text-destructive mt-1">
                    Error: {error}
                  </p>
                )}
                {!error && progress === 100 && (
                  <p className="text-xs text-green-600 mt-1">Upload complete</p>
                )}
                {!error && !uploading && progress === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB - Pending...
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeFile(id)}
                  disabled={uploading}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        ref={dropZoneRef}
        className={`rounded-lg cursor-pointer ${className} ${
          isDragging ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
        onClick={() => !isAnyFileUploading && fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        aria-label="Upload PDF files"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        {dropZoneContent}
        <Input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
          multiple
          disabled={isAnyFileUploading}
        />
      </div>
    </div>
  );
}
