"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { FileIcon, UploadIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        })
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + 5
      })
    }, 100)

    try {
      const formData = new FormData()
      formData.append("pdf", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()

      clearInterval(interval)
      setProgress(100)

      toast({
        title: "Upload successful",
        description: "Your PDF has been uploaded",
      })

      // Reset form and refresh data
      setTimeout(() => {
        setFile(null)
        setUploading(false)
        setProgress(0)
        router.push("/pdfs") // Navigate to PDFs page after successful upload
      }, 1000)
    } catch (error) {
      clearInterval(interval)
      setUploading(false)

      toast({
        title: "Upload failed",
        description: "There was an error uploading your PDF",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-1">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground">PDF (max 10MB)</p>
        <Input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
      </div>

      {file && (
        <div className="p-3 border rounded-lg flex items-center gap-3">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          {uploading ? (
            <Progress value={progress} className="w-20" />
          ) : (
            <Button size="sm" onClick={handleUpload}>
              Upload
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
