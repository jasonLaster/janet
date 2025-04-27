"use client";

import React, { useRef, useCallback, useState } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";

import { UploadCloudIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useOrganization } from "@clerk/nextjs";
import { uploadingFilesAtom, uploadFileAtom } from "@/lib/store";

interface FileUploadProps {
  className?: string;
}

export function FileUpload({ className = "" }: FileUploadProps) {
  const [uploadingFiles] = useAtom(uploadingFilesAtom);
  const [, uploadFile] = useAtom(uploadFileAtom);
  const router = useRouter();

  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { user, isLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const userId = user?.id;
  const orgId = organization?.id;

  const { toast } = useToast();

  const processFiles = useCallback(
    (selectedFiles: FileList | File[]) => {
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
            (f) =>
              f.file.name === file.name && (f.uploading || f.progress === 0)
          )
        ) {
          if (!userId && !orgId) {
            console.error("User ID or Org ID is missing");
            toast({
              title: "Authentication Error",
              description:
                "Could not upload file due to missing user information.",
              variant: "destructive",
            });
            return;
          }
          uploadFile({ file, userId, orgId, refresh: router.refresh });
        }
      });
    },
    [uploadFile, userId, orgId, uploadingFiles, toast, router]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = ""; // Reset file input
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
    // Check if the leave event target is outside the drop zone
    const relatedTarget = e.relatedTarget as Node;
    if (!dropZoneRef.current?.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy"; // Show a copy cursor
    setIsDragging(true);
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const isAnyFileUploading = uploadingFiles.some((f) => f.uploading);

  if (!isLoaded || !isOrgLoaded) {
    return null;
  }

  return (
    <div className="">
      <div
        ref={dropZoneRef}
        className={`rounded-lg cursor-pointer ${className} ${
          isDragging ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
        onClick={() => !isAnyFileUploading && fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={onDrop}
        role="button"
        aria-label="File upload area"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          data-testid="file-upload-input"
          multiple
          accept="application/pdf"
          disabled={isAnyFileUploading}
        />
        <div
          className={`rounded-lg py-1 px-1 flex items-center justify-center gap-2 transition-colors h-6 w-6 text-lg text-white ${
            isAnyFileUploading
              ? "cursor-not-allowed bg-slate-500"
              : isDragging
              ? "cursor-pointer bg-slate-500"
              : "cursor-pointer bg-slate-400 hover:bg-slate-500"
          }`}
        >
          {isAnyFileUploading ? (
            <Loader2
              data-testid="upload-loader"
              className="h-3 w-3 animate-spin stroke-[3]"
            />
          ) : (
            <UploadCloudIcon className="h-3 w-3 stroke-[3]" />
          )}
        </div>
      </div>
    </div>
  );
}
