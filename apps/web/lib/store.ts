import { atom } from "jotai";
import { toast } from "@/hooks/use-toast"; // Assuming useToast is accessible globally or via context

// Define the shape of a PDF object based on usage in PdfList
export interface PDF {
  id: number;
  name: string;
  title?: string | null;
  description?: string | null;
  uploadedAt: string; // Assuming string based on formatDate usage
  // Add other fields if necessary based on your API response
}

// Define the shape for an uploading file's state
export interface UploadingFileState {
  id: string; // Add a unique ID for easier state updates
  file: File;
  progress: number;
  uploading: boolean; // Keep track if the fetch request is active
  error?: string;
}

// --- PDF List State Atoms ---

// Holds the array of PDF objects fetched from the API
export const pdfsAtom = atom<PDF[]>([]);

// Tracks the loading state during the fetch operation
export const pdfsLoadingAtom = atom<boolean>(true);

// Stores any error message if the fetch fails
export const pdfsErrorAtom = atom<string | null>(null);

// --- Upload State Atoms ---

// Holds the state for files currently in the upload process
export const uploadingFilesAtom = atom<UploadingFileState[]>([]);

// --- Action Atoms ---

// Atom to trigger fetching PDFs
export const fetchPdfsAtom = atom(null, async (get, set) => {
  set(pdfsLoadingAtom, true);
  set(pdfsErrorAtom, null);
  try {
    const response = await fetch("/api/pdfs");
    if (!response.ok) {
      throw new Error("Failed to fetch PDFs");
    }
    const data = await response.json();
    set(pdfsAtom, data.pdfs);
  } catch (error: any) {
    console.error("Error fetching PDFs:", error);
    set(pdfsErrorAtom, error.message || "Failed to load PDFs");
    // Optionally show toast here if not handled in component
    // toast({ title: "Error", description: "Failed to load your PDFs", variant: "destructive" });
  } finally {
    set(pdfsLoadingAtom, false);
  }
});

// Atom to handle uploading a single file
export const uploadFileAtom = atom(
  null,
  async (get, set, fileToUpload: File) => {
    // Generate a temporary unique ID for this upload
    const uploadId = `${fileToUpload.name}-${Date.now()}`;

    // Add to upload list
    set(uploadingFilesAtom, (prev) => [
      ...prev,
      { id: uploadId, file: fileToUpload, progress: 0, uploading: true },
    ]);

    // Simulate progress (optional, similar to original FileUpload)
    const interval = setInterval(() => {
      set(uploadingFilesAtom, (prev) =>
        prev.map((f) =>
          f.id === uploadId && f.uploading && f.progress < 95
            ? { ...f, progress: f.progress + 5 }
            : f
        )
      );
    }, 300); // Adjust interval as needed

    try {
      const formData = new FormData();
      formData.append("pdf", fileToUpload);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${response.statusText || errorData}`);
      }

      // Update progress to 100 and mark as not uploading anymore
      set(uploadingFilesAtom, (prev) =>
        prev.map((f) =>
          f.id === uploadId ? { ...f, progress: 100, uploading: false } : f
        )
      );

      // Show success toast
      toast({
        title: "Upload successful",
        description: `${fileToUpload.name} uploaded.`,
      });

      // Trigger a refetch of the PDF list
      await set(fetchPdfsAtom);

      // Optional: Remove the completed upload from the list after a delay
      setTimeout(() => {
        set(uploadingFilesAtom, (prev) =>
          prev.filter((f) => f.id !== uploadId)
        );
      }, 2000);
    } catch (error: any) {
      clearInterval(interval);
      console.error("Upload error:", error);

      // Update state with error message
      set(uploadingFilesAtom, (prev) =>
        prev.map((f) =>
          f.id === uploadId
            ? {
                ...f,
                uploading: false,
                error: error.message || "Upload failed",
                progress: 0, // Reset progress on error
              }
            : f
        )
      );

      // Show error toast
      toast({
        title: `Upload failed for ${fileToUpload.name}`,
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  }
);

// Atom to remove a file from the upload queue (if it's not actively uploading)
export const removeUploadingFileAtom = atom(
  null,
  (get, set, uploadIdToRemove: string) => {
    set(uploadingFilesAtom, (prev) =>
      prev.filter((f) => {
        // Only allow removal if it's not the one currently uploading OR if it has an error
        if (f.id === uploadIdToRemove) {
          return f.uploading && !f.error; // Keep if uploading without error
        }
        return true; // Keep others
      })
    );
  }
);

// --- Derived State (Example - if needed later) ---
// export const hasActiveUploadsAtom = atom((get) =>
//   get(uploadingFilesAtom).some(f => f.uploading)
// );

// Action atoms for fetching, uploading, deleting will be added next.
