Here’s a punch-list to get the “Update search” commit production-ready. Items are grouped so you can parallelize the work or cherry-pick the quick wins first.
────────────────────────
Functional & UX gaps
────────────────────────

- [ ]Highlight markup is wrong
  ‑ customTextRenderer currently returns a raw string containing <mark …> tags; React treats this as literal text.
  ‑ Return a React element array instead, e.g. parts.push(<mark … key={…}>{match[0]}</mark>). Provide keys.

- [ ] Double-highlight strategy
      ‑ usePdfSearch no longer wraps text nodes, so the DOM-walker highlight code is dead; remove search-dom-utils.ts (or put wrapping back and remove the in-renderer marking). Pick one path.

- [ ]Clearing highlights
  ‑ When the keyword is cleared you only reset matches; any <mark> tags remain rendered until each page re-renders (which never happens after first load).
  ‑ Force a lightweight re-render of pages on keyword clear (state flag or key prop on <Page>).

- [ ]Current-match visual cue
  ‑ .pdf-search-current is referenced but never added in customTextRenderer. Insert a data-index or unique id on each mark so the hook can apply the class when currentMatchIndex changes.

- [ ] Page re-render on keyword change
      ‑ Confirm that react-pdf actually re-runs customTextRenderer when the closure value searchKeyword changes. If not, add an explicit key={searchKeyword} prop on each <Page>.
- [ ] Keyboard shortcuts scope
      ‑ window.addEventListener('keydown') captures all Enter presses, including those in content-editable areas. Limit with a more precise selector or use delegated handler on the container.
      ────────────────────────
      Performance & correctness
      ────────────────────────
- [ ] Heavy DOM walking
      ‑ usePdfSearch loops through every page, extracts text via TreeWalker each time you type. For big docs this will stutter. Options:

1. Cache page texts on first load; reuse on subsequent keystrokes.
2. Use page.getTextContent() from PDF.js once, store plain strings.

- [ ] Debounce fine-tuning
      ‑ 200 ms may still feel laggy on large docs; consider 150 ms + caching for smooth UX.
      • Regex generation
      ‑ The basic replacement in PdfViewerContent doesn’t honor wholeWords or matchCase flags you expose in normalize-keyword; wire those props up.

- [ ] Memory leaks
      ‑ window.addEventListener('keydown') cleanup is fine, but the second useEffect referencing headerRef.current?.offsetHeight has a mutable dep array element that won’t fire. Add a ResizeObserver instead.

────────────────────────
Code quality & type safety
────────────────────────
• Split fat components
‑ PdfViewer is >700 LOC; extract search-specific logic into PdfSearchProvider or at least move the many useEffects into dedicated hooks (useVisiblePage, useKeyboardNavigation, etc.).
• Narrow any‐typed params
‑ onDocumentLoadSuccess and pdfjs.PDFDocumentProxy should be strongly typed.
• Remove unused helpers
‑ getTextContent in use-pdf-search.ts and search-dom-utils.ts are no longer referenced after the refactor.
• CSS collocation
‑ Add a scoped class to globals.css (e.g. .pdf-search-highlight + .pdf-search-current).
────────────────────────

────────────────────────
Suggested patch order
────────────────────────

- [ ] Fix customTextRenderer to return React nodes + unique ids.
- [ ] Wire currentMatchIndex → mark element to add .pdf-search-current.
- [ ] Cache page plain-text inside usePdfSearch; remove DOM walking per keystroke.
- [ ] Delete unused DOM-wrap helpers or keep them behind a feature flag.
- [ ] Tighten types and clean effects.
- [ ] Add CSS & README.

Land those and the feature should be solid for production
