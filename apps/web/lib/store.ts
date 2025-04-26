import { atom } from "jotai";

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

// --- PDF List State Atoms ---

// Holds the array of PDF objects fetched from the API
// export const pdfsAtom = atom<PDF[]>([]);

// Tracks the loading state during the fetch operation
// export const pdfsLoadingAtom = atom<boolean>(false);

// Stores any error message if the fetch fails
// export const pdfsErrorAtom = atom<string | null>(null);

// Define the fetcher function for useSWR
// const pdfsFetcher = async (url: string) => {
//   const response = await fetch(url);
//   if (!response.ok) {
//     // Attempt to get more specific error from response body if available
//     let errorBody = "Failed to fetch PDFs";
//     try {
//       const errorJson = await response.json();
//       errorBody = errorJson.error || errorBody; // Use error from JSON if present
//     } catch (_) {
//       // Ignore if response is not JSON or body is empty
//     }
//     throw new Error(errorBody);
//   }
//   const data = await response.json();
//   return data.pdfs;
// };

// Create a global cache for SWR mutate functions
// const mutateCache = new Map<string, KeyedMutator<any>>();

// Hook to use SWR for fetching PDFs
// export function usePdfs() {
//   const setPdfs = useSetAtom(pdfsAtom);
//   const setPdfsLoading = useSetAtom(pdfsLoadingAtom);
//   const setPdfsError = useSetAtom(pdfsErrorAtom);
//   const pdfs = useAtomValue(pdfsAtom);

//   const { data, error, isLoading, mutate } = useSWR<PDF[], Error>(
//     "/api/pdfs",
//     pdfsFetcher,
//     {
//       revalidateOnFocus: true,
//       dedupingInterval: 5000, // Deduplicate requests within 5 seconds
//       onSuccess: (data) => {
//         // This callback may not be reliable for state updates
//         console.log("SWR success, fetched PDFs:", data?.length || 0);
//       },
//       onError: (error) => {
//         console.error("Error fetching PDFs:", error);
//       },
//     }
//   );

//   // Use an effect to update the atoms when SWR state changes
//   // This is more reliable than the callbacks
//   React.useEffect(() => {
//     if (data) {
//       console.log("Updating pdfs atom with", data.length, "PDFs");
//       setPdfs(data);
//     }

//     if (error) {
//       setPdfsError(error.message);
//     } else {
//       setPdfsError(null);
//     }

//     setPdfsLoading(isLoading);
//   }, [data, error, isLoading, setPdfs, setPdfsLoading, setPdfsError]);

//   // Store the mutate function in the global cache
//   if (mutate) {
//     mutateCache.set("/api/pdfs", mutate);
//   }

//   // Always use SWR data if available, fall back to atom state
//   const currentPdfs = data || pdfs;

//   console.log("usePdfs returning", {
//     pdfsCount: currentPdfs?.length || 0,
//     isLoading,
//     hasError: !!error,
//   });

//   return {
//     pdfs: currentPdfs,
//     isLoading,
//     error: error?.message || null,
//     refetch: mutate,
//   };
// }

// Function to trigger a refetch from outside components
// export const refetchPdfs = async () => {
//   const mutate = mutateCache.get("/api/pdfs");
//   if (mutate) {
//     return mutate();
//   }
//   return Promise.resolve();
// };

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
    file: File,
    userId: string | undefined,
    orgId: string | undefined
  ) => {
    const controller = new AbortController();
    const fileId = `${file.name}-${file.lastModified}`;

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
      if (xhr.status >= 200 && xhr.status < 300) {
        set(uploadingFilesAtom, (prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, uploading: false } : f))
        );
        // Optionally trigger a refetch of the PDF list after successful upload
        // triggerRefetchPdfs();
      } else {
        let errorMessage = `Upload failed with status: ${xhr.status}`;
        try {
          const response = JSON.parse(xhr.responseText);
          errorMessage = response.error || errorMessage;
        } catch (e) {
          // Ignore JSON parse error
        }
        set(uploadingFilesAtom, (prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, uploading: false, error: errorMessage }
              : f
          )
        );
      }
    };

    xhr.onerror = () => {
      set(uploadingFilesAtom, (prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                uploading: false,
                error: "Network error during upload",
              }
            : f
        )
      );
    };

    xhr.onabort = () => {
      set(uploadingFilesAtom, (prev) => prev.filter((f) => f.id !== fileId));
      console.log(`Upload aborted for ${file.name}`);
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
