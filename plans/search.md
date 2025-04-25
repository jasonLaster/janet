## 🗺️ Plan: Add Full-Document Search to PDF Viewer

This plan explains how to add **in-document search** to the existing React-PDF based viewer (apps/web) by re-using ideas and utilities from the `@search` plugin that ships with `@react-pdf-viewer`, without migrating the whole viewer.

### Goals

1. While the user types in the header search box, **all occurrences** of the term across **all pages** are highlighted.
2. **Pressing <kbd>Enter</kbd>** jumps to the **next match** (cyclically) and scrolls the corresponding page/position into view.
3. Should work whether the document is loaded from cache or network.
4. Keep bundle size small and avoid breaking existing behaviour.

### High–Level Strategy

- **Leverage the rendered text layers** that `react-pdf` already adds to each `<Page>` (absolute-positioned `<span>` elements).
- Re-implement a minimal subset of `@react-pdf-viewer/search` in **plain React hooks**:
  - `usePdfSearch(keyword)` – responsible for collecting text layers, running regex search, producing a list of match rectangles and DOM nodes.
  - `usePdfSearchNavigation(matches)` – stores the current index, exposes `jumpTo(index)` / `jumpToNext()`.
- Style highlights using a dark-yellow translucent background (`class="pdf-search-highlight"`).
- All state lives in the **parent `<PdfViewer>`** component and is wired down via props.

### Concrete Steps

1. **Expose the search UI**

   - In `pdf-viewer-header.tsx` remove the `false &&` guard to always render `<Input>` and `<Search>` icon.
   - Add `onKeyDown` to the `<Input>` that calls `onJumpNext()` when `Enter` is pressed with a non-empty search string.

2. **Add state & hooks** (`apps/web/components/pdf-viewer/hooks/use-search.ts`)

   - `const { keyword, setKeyword, matches, currentIdx, jumpToNext, jumpTo } = usePdfSearch(rootRef, numPages);`
   - Markers are injected/removed using the algorithm described below.

3. **Highlight algorithm** (in `usePdfSearch`)

   - Whenever `keyword` changes (debounced 200 ms):
     1. Remove old highlight `<span class="pdf-search-highlight"/>` nodes.
     2. For each page container `#page-{n} .react-pdf__Page__textContent`:
        - Traverse child `<span>` nodes, run `indexOf` (case-insensitive) on `textContent`.
        - Wrap match substrings with `<mark class="pdf-search-highlight" data-match-idx={globalIdx}>...</mark>` using the `unwrap→wrap` helpers from `apps/search/src` (they deal with DOM ranges splitting).
     3. Collect `DOMRect` + page index for each `<mark>` into `matches` array.

4. **Navigation** (`usePdfSearchNavigation`)

   - `jumpToNext` increments `currentIdx`, resets to 0 on overflow.
   - Finds the `<mark>` by `data-match-idx` and `scrollIntoView({behavior:'smooth', block:'center'})`.
   - Adds an extra CSS class `pdf-search-current` to highlight the current match border (blue outline).

5. **Wire everything**

   - In `PdfViewer` maintain `searchKeyword` and pass setters to `PdfViewerHeader`.
   - Pass `jumpToNext` handler too.
   - `PdfViewerContent` receives `highlightKeyword` prop if needed for future optimisations (not required for scrolling).

6. **Styling** (`globals.css`)

   ```css
   .pdf-search-highlight {
     background-color: rgba(250, 204, 21, 0.5);
     border-radius: 2px;
   }
   .pdf-search-current {
     background-color: rgba(96, 165, 250, 0.6);
   }
   ```

7. **Keyboard shortcuts (optional)**
   - Later we can add ⌘+F / Ctrl+F to focus the input using ideas from `ShortcutHandler.tsx`.

### Important References from @search Package

| File                    | What to Reuse                               | Purpose                           |
| ----------------------- | ------------------------------------------- | --------------------------------- |
| `wrap.ts` & `unwrap.ts` | DOM utility to wrap matched ranges          | Avoid writing fragile Range logic |
| `normalizeKeyword.ts`   | Regex building for whole-word, case opts    | Reuse for robust matching         |
| `calculateOffset.ts`    | Compute cumulative match index across pages | Inspiration for navigation        |

### Estimated Work Breakdown

- [ ] Expose search input (½h)
- [ ] Hook & highlight logic (3h)
- [ ] Navigation logic (1h)
- [ ] Styling & polish (½h)
- [ ] Manual QA on large PDFs (1h)

### Out of Scope

- Replacing the whole viewer with `@react-pdf-viewer`.
- Regex/whole-word toggles, previous-match navigation.
- E2E & unit tests (per instruction not to add new Vitest tests).
