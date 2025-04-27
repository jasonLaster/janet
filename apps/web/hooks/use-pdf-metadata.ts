"use client";

import { useState, useEffect, useRef } from "react";

const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
const MAX_POLLING_ATTEMPTS = 20; // Stop after ~1 minute

interface UsePdfMetadataResult {
  metadata: any | null;
  isLoading: boolean;
  error: string | null;
}

export function usePdfMetadata(
  pdfId: number | undefined,
  initialMetadata: any | null,
  initialMetadataFailed: boolean | null
): UsePdfMetadataResult {
  const [metadata, setMetadata] = useState<any | null>(initialMetadata);
  const [isLoading, setIsLoading] = useState<boolean>(
    !initialMetadata && !!pdfId
  );
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // --- Conditions to stop or not start polling ---
    // Don't poll if we already have metadata
    if (metadata) {
      setIsLoading(false);
      setError(null);
      // Clear any potential lingering interval (e.g., if initialMetadata arrived late)
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }
    // Don't poll if pdfId is invalid
    if (!pdfId) {
      setIsLoading(false);
      setError(null); // No error, just nothing to fetch
      return;
    }
    // Don't start polling if already loading (prevents duplicate intervals on rapid changes)
    if (isLoading && intervalIdRef.current) {
      return;
    }
    // ------------------------------------------------

    // Reset state for a new polling session
    setIsLoading(true);
    setError(null);
    attemptsRef.current = 0;

    const poll = async () => {
      if (!pdfId || metadata) {
        setIsLoading(false);
        return;
      } // Should not happen due to check above, but safety first

      if (initialMetadataFailed) {
        setError("Metadata processing failed.");
        setIsLoading(false);
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        return;
      }

      attemptsRef.current++;

      try {
        const response = await fetch(`/api/pdfs/${pdfId}/metadata`);

        if (response.status === 404) {
          setError("PDF not found.");
          setIsLoading(false);
          if (intervalIdRef.current) clearInterval(intervalIdRef.current);
          return;
        }

        if (!response.ok) {
          // Keep polling for transient errors, but stop if max attempts reached
        } else {
          const { metadata: fetchedMetadata, failed } = await response.json();

          if (failed) {
            setError("Metadata processing failed."); // Set an error state
            setMetadata(null); // Ensure metadata is null if failed
            setIsLoading(false);
            if (intervalIdRef.current) clearInterval(intervalIdRef.current);
            return;
          }

          if (fetchedMetadata) {
            setMetadata(fetchedMetadata);
            setIsLoading(false);
            setError(null);
            if (intervalIdRef.current) clearInterval(intervalIdRef.current);
            return; // Stop polling
          }
          // If metadata is null but not failed, continue polling
        }
      } catch (err) {
        // Keep polling for network errors, but stop if max attempts reached
        setError("Network error during polling."); // Reflect temporary error
      }

      // --- Check stop condition for attempts ---
      if (attemptsRef.current >= MAX_POLLING_ATTEMPTS) {
        setError("Polling timed out. Metadata might still be processing.");
        setIsLoading(false);
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    // Start polling immediately and then set interval
    poll();
    intervalIdRef.current = setInterval(poll, POLLING_INTERVAL_MS);

    // --- Cleanup function ---
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
    // Re-run effect if pdfId changes, or if metadata becomes available (to stop polling)
  }, [pdfId, metadata, isLoading]); // Added isLoading to deps to prevent loop if start conditions met while polling

  return { metadata, isLoading, error };
}
