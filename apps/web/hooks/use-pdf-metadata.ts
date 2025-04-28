"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/utils/trpcClient";

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

  // Use tRPC for the initial fetch
  const {
    data,
    isLoading: trpcLoading,
    error: trpcError,
    refetch,
  } = trpc.pdf.metadata.useQuery(pdfId ? { id: pdfId } : { id: -1 }, {
    enabled: !!pdfId && !initialMetadata && !initialMetadataFailed,
  });

  useEffect(() => {
    // If tRPC returns metadata, use it and stop polling
    if (data?.metadata) {
      setMetadata(data.metadata);
      setIsLoading(false);
      setError(null);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }
    // If tRPC returns failed, stop polling and set error
    if (data && data.failed) {
      setError("Metadata processing failed.");
      setIsLoading(false);
      setMetadata(null);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }
    // If pdfId is invalid, stop
    if (!pdfId) {
      setIsLoading(false);
      setError(null);
      return;
    }
    // If already polling, don't start again
    if (isLoading && intervalIdRef.current) {
      return;
    }
    // Reset state for a new polling session
    setIsLoading(true);
    setError(null);
    attemptsRef.current = 0;

    const poll = async () => {
      if (!pdfId || metadata) {
        setIsLoading(false);
        return;
      }
      if (data && data.failed) {
        setError("Metadata processing failed.");
        setIsLoading(false);
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        return;
      }
      attemptsRef.current++;
      try {
        const result = await refetch();
        const { metadata: fetchedMetadata, failed } = result.data || {};
        if (failed) {
          setError("Metadata processing failed.");
          setMetadata(null);
          setIsLoading(false);
          if (intervalIdRef.current) clearInterval(intervalIdRef.current);
          return;
        }
        if (fetchedMetadata) {
          setMetadata(fetchedMetadata);
          setIsLoading(false);
          setError(null);
          if (intervalIdRef.current) clearInterval(intervalIdRef.current);
          return;
        }
      } catch (err) {
        setError("Network error during polling.");
      }
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

    // Cleanup
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [pdfId, data, metadata, isLoading, refetch]);

  // If tRPC errored (404, etc), show error
  useEffect(() => {
    if (trpcError) {
      setError(trpcError.message || "Unknown error");
      setIsLoading(false);
    }
  }, [trpcError]);

  return { metadata, isLoading: isLoading || trpcLoading, error };
}
