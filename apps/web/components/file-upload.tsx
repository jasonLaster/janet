"use client";

import React, { useRef, useCallback, useState } from "react";
import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";
import {
  uploadingFilesAtom,
  uploadFileAtom,
  removeUploadingFileAtom,
  UploadingFileState,
} from "@/lib/store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  className?: string;
}

export function FileUpload({ className = "" }: FileUploadProps) {
  const [uploadingFiles] = useAtom(uploadingFilesAtom);
  const [, uploadFile] = useAtom(uploadFileAtom);
  const [, removeFile] = useAtom(removeUploadingFileAtom);

  const [isDragging, setIsDragging] = React.useState(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const userId = user?.id;
  const orgId = user?.publicMetadata.organizationId as string;

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
        if (!userId || !orgId) {
          console.error("User ID or Org ID is missing");
          toast({
            title: "Authentication Error",
            description:
              "Could not upload file due to missing user information.",
            variant: "destructive",
          });
          return;
        }
        uploadFile(file, userId, orgId);
      }
    });
  };

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
    [processFiles, userId, orgId] // Add dependencies
  );

  const isAnyFileUploading = uploadingFiles.some((f) => f.uploading);

  return (
    <div className="">
      <FileUploadList uploadingFiles={uploadingFiles} removeFile={removeFile} />

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
          multiple
          accept="application/pdf"
          disabled={isAnyFileUploading}
        />
        <div
          className={`rounded-lg py-1 px-1 flex items-center justify-center gap-2 transition-colors cursor-pointer h-6 w-6 text-lg text-white ${
            isDragging ? "bg-slate-500 " : "bg-slate-400  hover:bg-slate-500  "
          }`}
        >
          <UploadCloudIcon className="h-3 w-3 stroke-[3]" />
        </div>
      </div>
    </div>
  );
}

interface FileUploadListProps {
  uploadingFiles: UploadingFileState[];
  removeFile: (id: string) => void;
}

function FileUploadList({ uploadingFiles, removeFile }: FileUploadListProps) {
  if (uploadingFiles.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 mb-4 space-y-2">
      {uploadingFiles.map((fileState) => (
        <div
          key={fileState.id}
          className="p-2 border rounded-md flex items-center justify-between"
        >
          <div className="flex items-center space-x-2 flex-1 overflow-hidden">
            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate" title={fileState.file.name}>
              {fileState.file.name}
            </span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {fileState.uploading && (
              <Progress value={fileState.progress} className="w-24 h-2" />
            )}
            {fileState.error && (
              <span
                className="text-xs text-destructive"
                title={fileState.error}
              >
                Error
              </span>
            )}
            {!fileState.uploading && !fileState.error && (
              <span className="text-xs text-green-600">Done</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto"
              onClick={() => removeFile(fileState.id)}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
