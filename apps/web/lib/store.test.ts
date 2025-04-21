import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PDF,
  pdfsAtom,
  pdfsLoadingAtom,
  pdfsErrorAtom,
  usePdfs,
  refetchPdfs,
} from "./store";

// Mock SWR
vi.mock("swr", () => {
  const originalModule = vi.importActual("swr");
  return {
    ...originalModule,
    default: vi.fn(),
  };
});

// Mock jotai's hooks
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai");
  return {
    ...actual,
    useSetAtom: vi.fn().mockImplementation(() => vi.fn()),
    useAtomValue: vi.fn().mockImplementation(() => []),
  };
});

import useSWR from "swr";

describe("PDF Store", () => {
  const mockPdfs: PDF[] = [
    {
      id: 1,
      name: "test1.pdf",
      uploadedAt: "2023-01-01T00:00:00.000Z",
    },
    {
      id: 2,
      name: "test2.pdf",
      title: "Test PDF",
      description: "A test PDF file",
      uploadedAt: "2023-01-02T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use SWR to fetch PDFs", async () => {
    // Mock successful SWR response
    const mockMutate = vi.fn();
    vi.mocked(useSWR).mockReturnValue({
      data: mockPdfs,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    } as any);

    // Call the hook
    const result = usePdfs();

    // Verify SWR was called with the correct arguments
    expect(useSWR).toHaveBeenCalledWith(
      "/api/pdfs",
      expect.any(Function),
      expect.objectContaining({
        revalidateOnFocus: true,
        dedupingInterval: 5000,
      })
    );

    // Check returned values
    expect(result.pdfs).toEqual(mockPdfs);
    expect(result.isLoading).toBe(false);
    expect(result.error).toBeNull();
    expect(result.refetch).toBe(mockMutate);
  });

  it("should handle loading state", () => {
    // Mock loading state
    vi.mocked(useSWR).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    } as any);

    const result = usePdfs();

    // Just test what we know for sure - the loading and error states
    expect(result.isLoading).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should handle error state", () => {
    // Mock error state
    const mockError = new Error("Failed to fetch PDFs");
    vi.mocked(useSWR).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    } as any);

    const result = usePdfs();

    // Just test what we know for sure - the error message
    expect(result.isLoading).toBe(false);
    expect(result.error).toBe("Failed to fetch PDFs");
  });

  it("should provide a way to refetch PDFs", async () => {
    // Setup mock
    const mockMutate = vi.fn().mockResolvedValue(undefined);

    // Simulate a hook call that sets up the mutate cache
    vi.mocked(useSWR).mockReturnValue({
      data: mockPdfs,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    } as any);

    // Initialize by calling the hook
    usePdfs();

    // Call refetchPdfs
    await refetchPdfs();

    // Check that mutate was called
    expect(mockMutate).toHaveBeenCalled();
  });
});
