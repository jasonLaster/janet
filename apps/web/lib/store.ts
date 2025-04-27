import { atom } from "jotai";
import { PDF } from "./db";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"; // Import necessary type if needed, or use a simpler () => void type

// Define the shape for an uploading file's state
export interface UploadingFileState {
  id: string;
  file: File;
  progress: number;
  uploading: boolean;
  error: string | null;
  controller: AbortController;
}

// --- Search State Atoms ---
export const searchQueryAtom = atom<string>("");
export const searchResultsAtom = atom<SearchResult[]>([]);

// Metadata filter for filtering by specific metadata values
export interface MetadataFilter {
  type: "label" | "company" | null;
  value: string | null;
}

export const metadataFilterAtom = atom<MetadataFilter>({
  type: null,
  value: null,
});

// --- Upload State Atoms ---

// Holds the state for files currently in the upload process
export const uploadingFilesAtom = atom<UploadingFileState[]>([]);

// --- Action Atoms ---

// Atom to handle uploading a single file
export const uploadFileAtom = atom(
  null,
  (
    get,
    set,
    config: {
      file: File;
      userId: string | undefined;
      orgId: string | undefined;
      refresh: () => void; // Function to trigger data refresh
    }
  ) => {
    const { file, userId, orgId, refresh } = config; // Destructure config
    const controller = new AbortController();
    const fileId = `${file.name}-${file.lastModified}`;

    // Helper function to check if uploads are finished and refresh
    const checkAndRefresh = () => {
      const currentUploads = get(uploadingFilesAtom);
      if (!currentUploads.some((f) => f.uploading)) {
        refresh();
      }
    };

    const newFileState: UploadingFileState = {
      id: fileId,
      file,
      progress: 0,
      uploading: true,
      error: null,
      controller,
    };

    set(uploadingFilesAtom, (prev) => [...prev, newFileState]);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total);
        set(uploadingFilesAtom, (prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: percentage } : f
          )
        );
      }
    };

    xhr.onload = () => {
      let updatedState: UploadingFileState[] = [];
      if (xhr.status >= 200 && xhr.status < 300) {
        set(uploadingFilesAtom, (prev) => {
          updatedState = prev.map((f) =>
            f.id === fileId ? { ...f, uploading: false } : f
          );
          return updatedState;
        });
      } else {
        let errorMessage = `Upload failed with status: ${xhr.status}`;
        try {
          const response = JSON.parse(xhr.responseText);
          errorMessage = response.error || errorMessage;
        } catch (e) {
          // Ignore JSON parse error
        }
        set(uploadingFilesAtom, (prev) => {
          updatedState = prev.map((f) =>
            f.id === fileId
              ? { ...f, uploading: false, error: errorMessage }
              : f
          );
          return updatedState;
        });
      }
      // Check completion status *after* state update
      if (!updatedState.some((f) => f.uploading)) {
        refresh();
      }
    };

    xhr.onerror = () => {
      let updatedState: UploadingFileState[] = [];
      set(uploadingFilesAtom, (prev) => {
        updatedState = prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                uploading: false,
                error: "Network error during upload",
              }
            : f
        );
        return updatedState;
      });
      // Check completion status *after* state update
      if (!updatedState.some((f) => f.uploading)) {
        refresh();
      }
    };

    xhr.onabort = () => {
      let updatedState: UploadingFileState[] = [];
      set(uploadingFilesAtom, (prev) => {
        updatedState = prev.filter((f) => f.id !== fileId);
        return updatedState;
      });
      console.log(`Upload aborted for ${file.name}`);
      // Check completion status *after* state update
      if (!updatedState.some((f) => f.uploading)) {
        refresh();
      }
    };

    xhr.open("POST", "/api/pdfs/file-upload", true);
    xhr.setRequestHeader("Content-Type", file.type);
    // Add Content-Disposition header for filename
    xhr.setRequestHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.name)}"`
    );
    // Add custom headers for user/org context
    if (userId) xhr.setRequestHeader("x-user-id", userId);
    if (orgId) xhr.setRequestHeader("x-org-id", orgId);

    xhr.send(file);
  }
);

// Atom to remove a file from the upload queue (if it's not actively uploading)
export const removeUploadingFileAtom = atom(
  null,
  (get, set, fileId: string) => {
    const fileToCancel = get(uploadingFilesAtom).find((f) => f.id === fileId);
    if (fileToCancel?.uploading) {
      fileToCancel.controller.abort(); // This triggers the onabort handler
    } else {
      // If not currently uploading (e.g., finished or error), just filter it out
      set(uploadingFilesAtom, (prev) => prev.filter((f) => f.id !== fileId));
    }
  }
);

// Properly typed setUploadingFilesAtom
export const setUploadingFilesAtom = atom(
  null,
  (get, set, update: UploadingFileState[]) => {
    set(uploadingFilesAtom, update);
  }
);

// --- Legacy support (for backward compatibility) ---
// export const fetchPdfsAtom = atom(null, async (get, set) => {
//   await refetchPdfs();
// });

// Helper function to get filtered PDFs based on all active filters
export function getFilteredPdfs(
  pdfs: PDF[],
  searchQuery: string,
  searchResults: Array<{ id: number; title: string }>,
  metadataFilter: MetadataFilter
) {
  // Start with all PDFs
  let filteredPdfs = pdfs;

  // Apply search filter if active
  if (searchQuery && searchResults.length > 0) {
    filteredPdfs = filteredPdfs.filter((pdf) =>
      searchResults.some((result) => result.id === pdf.id)
    );
  }

  // Apply metadata filter if active
  if (metadataFilter.type && metadataFilter.value) {
    filteredPdfs = filteredPdfs.filter((pdf) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (pdf as any).metadata;

      if (metadataFilter.type === "label") {
        return (
          metadata?.labels &&
          Array.isArray(metadata.labels) &&
          metadata.labels.includes(metadataFilter.value)
        );
      }

      if (metadataFilter.type === "company") {
        return metadata?.issuingOrganization === metadataFilter.value;
      }

      return false;
    });
  }

  return filteredPdfs;
}

// Restore SearchResult type definition
export interface SearchResult {
  id: number;
  query: string;
  score: number;
}
