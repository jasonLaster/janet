import { useState, useEffect, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { normalizeSingleKeyword } from "@/lib/search-normalize-keyword";

// Helper function to wrap text node content
function wrapTextNode(
  node: Text,
  start: number,
  end: number
): HTMLElement | null {
  try {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const mark = document.createElement("mark");
    mark.className = "pdf-search-highlight"; // Base class for all highlights
    range.surroundContents(mark);
    return mark;
  } catch (e) {
    console.error("Error wrapping text node:", e, { node, start, end });
    return null;
  }
}

// Helper function to unwrap a mark element
function unwrapMark(mark: HTMLElement) {
  const parent = mark.parentNode;
  if (parent) {
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize(); // Merges adjacent text nodes
  }
}

// Type for a single match result - Stores the mark element reference
export interface SearchMatch {
  pageIndex: number; // 0-based page index
  markElement: HTMLElement; // Reference to the created <mark> element
}

// Type for the hook's return value
export interface UsePdfSearchResult {
  keyword: string;
  setKeyword: (keyword: string) => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  jumpToNextMatch: (headerHeight?: number) => void;
  jumpToPreviousMatch: (headerHeight?: number) => void;
  jumpToMatch: (index: number, headerHeight?: number) => void;
  clearSearch: () => void; // Renamed from clearHighlights
}

// Debounce time for search execution after typing stops
const SEARCH_DEBOUNCE_MS = 150; // Reduced debounce time

export function usePdfSearch(
  mainContentRef: React.RefObject<HTMLDivElement | null>,
  numPages: number,
  initialKeyword: string = ""
): UsePdfSearchResult {
  const [keyword, setKeyword] = useState<string>(initialKeyword);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  // Store references to created mark elements to clean them up later
  const createdMarksRef = useRef<HTMLElement[]>([]);

  // --- Highlighting Logic ---

  // Function to clear all existing highlights from the DOM
  const clearAllHighlights = useCallback(() => {
    createdMarksRef.current.forEach(unwrapMark);
    createdMarksRef.current = []; // Clear the references
    // Also remove any lingering current highlight class
    if (mainContentRef.current) {
      mainContentRef.current
        .querySelectorAll(".pdf-search-current")
        .forEach((el) => el.classList.remove("pdf-search-current"));
    }
  }, [mainContentRef]);

  // Updated clearSearch to use clearAllHighlights
  const clearSearch = useCallback(() => {
    clearAllHighlights();
    setMatches([]);
    setCurrentMatchIndex(-1);
  }, [clearAllHighlights]);

  const performSearch = useCallback(
    (searchTerm: string) => {
      // Clear previous DOM highlights and match state
      clearSearch();
      console.log(`[Search] Performing search for: "${searchTerm}"`);

      if (!searchTerm || !mainContentRef.current || numPages <= 0) {
        console.log(
          "[Search] No search term, main content ref, or pages, aborting."
        );
        return;
      }

      // Get normalization options from keyword if needed (TODO: Pass these as args)
      const normalizedKeyword = normalizeSingleKeyword(
        searchTerm,
        false,
        false
      );
      if (!normalizedKeyword || normalizedKeyword.keyword === "") {
        console.log("[Search] Empty normalized keyword, aborting.");
        return;
      }

      console.log(`[Search] Normalized regex: ${normalizedKeyword.regExp}`);

      const foundMatches: SearchMatch[] = [];
      const marksCreated: HTMLElement[] = [];

      try {
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const pageContainer = mainContentRef.current.querySelector(
            `#page-${pageNum}`
          );
          const textContentLayer = pageContainer?.querySelector(
            ".react-pdf__Page__textContent"
          ) as HTMLElement | null;

          if (!textContentLayer) {
            console.warn(`[Search] Text layer not found for page ${pageNum}`);
            continue;
          }

          // Walk through text nodes to find and wrap matches
          const walker = document.createTreeWalker(
            textContentLayer,
            NodeFilter.SHOW_TEXT,
            null
          );
          let currentNode: Node | null;
          const textNodes: Text[] = [];
          while ((currentNode = walker.nextNode())) {
            // Ignore nodes already inside our highlights
            if (currentNode.parentElement?.nodeName !== "MARK") {
              textNodes.push(currentNode as Text);
            }
          }

          for (const textNode of textNodes) {
            if (!textNode.textContent) continue;

            const text = textNode.textContent;
            let match;
            // Reset lastIndex for each text node if using global flag
            normalizedKeyword.regExp.lastIndex = 0;

            // Store matches found in *this specific node* temporarily
            const nodeMatches: { start: number; end: number }[] = [];
            while ((match = normalizedKeyword.regExp.exec(text)) !== null) {
              nodeMatches.push({
                start: match.index,
                end: match.index + match[0].length,
              });
              // Ensure loop progresses with global flag
              if (normalizedKeyword.regExp.lastIndex === match.index) {
                normalizedKeyword.regExp.lastIndex++;
              }
            }

            // Wrap matches *in reverse order* to avoid messing up indices
            for (let i = nodeMatches.length - 1; i >= 0; i--) {
              const { start, end } = nodeMatches[i];
              const createdMark = wrapTextNode(textNode, start, end);
              if (createdMark) {
                foundMatches.push({
                  pageIndex: pageNum - 1,
                  markElement: createdMark,
                });
                marksCreated.push(createdMark); // Keep track for cleanup
              }
            }
          }
        }

        // Reverse the matches collected within this page to restore original order
        // Note: Since we collect across pages, we need a final sort based on DOM position if order matters strictly.
        // For now, order within page is reversed, then pages appended. Let's sort finally.

        // Sort all found matches based on their vertical position in the document
        foundMatches.sort((a, b) => {
          const rectA = a.markElement.getBoundingClientRect();
          const rectB = b.markElement.getBoundingClientRect();
          if (rectA.top !== rectB.top) {
            return rectA.top - rectB.top;
          }
          return rectA.left - rectB.left; // Secondary sort by horizontal position
        });

        console.log(
          `[Search] Finished search. Found ${foundMatches.length} total matches.`
        );
        setMatches(foundMatches);
        createdMarksRef.current = marksCreated; // Store refs to new marks

        if (foundMatches.length > 0) {
          setCurrentMatchIndex(0);
          // Highlight the first match immediately
          foundMatches[0].markElement.classList.add("pdf-search-current");
        } else {
          setCurrentMatchIndex(-1);
        }
      } catch (error) {
        console.error("[Search] Error during search execution:", error);
        // Attempt to clean up any partially created highlights
        clearAllHighlights();
        setMatches([]);
        setCurrentMatchIndex(-1);
      }
    },
    // Dependencies updated
    [numPages, mainContentRef, clearAllHighlights, clearSearch]
  );

  const debouncedSearch = useDebouncedCallback(
    performSearch,
    SEARCH_DEBOUNCE_MS
  );

  useEffect(() => {
    if (keyword.trim() !== "") {
      debouncedSearch(keyword);
    } else {
      clearSearch(); // Clear highlights when keyword is emptied
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [keyword, debouncedSearch, clearSearch]);

  // --- Navigation Logic ---

  const jumpToMatch = useCallback(
    (index: number, headerHeight: number = 0) => {
      if (
        index < 0 ||
        index >= matches.length ||
        !mainContentRef.current ||
        !document
      ) {
        return;
      }

      // Remove highlight from the previous match (if any)
      if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
        matches[currentMatchIndex].markElement.classList.remove(
          "pdf-search-current"
        );
      }

      // Highlight the new current match
      const targetMatch = matches[index];
      targetMatch.markElement.classList.add("pdf-search-current");
      setCurrentMatchIndex(index);

      // --- Scrolling Logic ---
      // Find the page container for the target match
      const targetPageNum = targetMatch.pageIndex + 1;
      const pageElement = document.getElementById(`page-${targetPageNum}`);

      if (pageElement && mainContentRef.current) {
        // Option 1: Scroll the page into view (simpler)
        const scrollOffset =
          pageElement.offsetTop -
          mainContentRef.current.offsetTop -
          headerHeight;

        // Option 2: Scroll the specific mark element into view (more precise, experimental)
        // const markRect = targetMatch.markElement.getBoundingClientRect();
        // const mainRect = mainContentRef.current.getBoundingClientRect();
        // const currentScrollTop = mainContentRef.current.scrollTop;
        // const scrollOffset = currentScrollTop + markRect.top - mainRect.top - headerHeight;

        console.log(
          `[Search] Scrolling to match ${index + 1} on page ${targetPageNum}`
        );

        mainContentRef.current.scrollTo({
          top: scrollOffset,
          behavior: "smooth",
        });

        // Optional: Check if mark is fully visible after scroll, adjust if needed
        // setTimeout(() => {
        //    const markRect = targetMatch.markElement.getBoundingClientRect();
        //    const mainRect = mainContentRef.current.getBoundingClientRect();
        //    if (markRect.top < mainRect.top + headerHeight || markRect.bottom > mainRect.bottom) {
        //       targetMatch.markElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        //    }
        // }, 300); // Delay to allow smooth scroll to finish
      } else {
        console.warn(
          `[Search] Could not find page element for page ${targetPageNum} to scroll to.`
        );
      }
    },
    [matches, mainContentRef, currentMatchIndex] // currentMatchIndex is needed now
  );

  const jumpToNextMatch = useCallback(
    (headerHeight?: number) => {
      if (matches.length === 0) return;
      const nextIndex = (currentMatchIndex + 1) % matches.length;
      jumpToMatch(nextIndex, headerHeight);
    },
    [matches, currentMatchIndex, jumpToMatch]
  );

  // Function to jump to the previous match
  const jumpToPreviousMatch = useCallback(
    (headerHeight?: number) => {
      if (matches.length === 0) return;
      const prevIndex =
        (currentMatchIndex - 1 + matches.length) % matches.length;
      jumpToMatch(prevIndex, headerHeight);
    },
    [matches, currentMatchIndex, jumpToMatch]
  );

  // Re-run search when `numPages` changes (i.e. document loaded)
  useEffect(() => {
    if (numPages > 0 && keyword.trim() !== "") {
      console.log(
        `[Search] numPages changed to ${numPages}, re-running search for "${keyword}"`
      );
      // Use debounced version? Or immediate? Let's try immediate for now.
      performSearch(keyword);
    } else if (numPages > 0 && keyword.trim() === "") {
      clearSearch(); // Ensure highlights are cleared if doc loads with empty keyword
    }
    // NOTE: This might run search twice if keyword changes *and* numPages changes simultaneously.
    // Could be optimized, but likely low impact.
  }, [numPages, keyword, performSearch, clearSearch]); // Added keyword back

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      clearAllHighlights();
    };
  }, [clearAllHighlights]);

  return {
    keyword,
    setKeyword,
    matches,
    currentMatchIndex,
    jumpToNextMatch,
    jumpToPreviousMatch,
    jumpToMatch,
    clearSearch, // Use the updated clearSearch
  };
}
