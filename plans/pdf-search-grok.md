### Implementing In-Page PDF Search with React-PDF

To add search functionality to a PDF viewer using React-PDF, including highlighting all matches across pages and navigating between results, you can use a combination of React-PDF’s text rendering features and custom logic. This approach involves extracting text from the PDF, searching for matches, highlighting them on the displayed page, and providing navigation buttons. Below is a clear guide to achieve this.

**Key Points:**

- React-PDF lacks built-in search but supports text extraction and custom rendering.
- You can extract text from all pages to find search matches.
- Highlight matches on the current page using `customTextRenderer`.
- Navigate matches by switching pages and scrolling to highlighted text.
- Performance may be a concern for large PDFs, so rendering one page at a time is recommended.

#### Step 1: Set Up the PDF Viewer

Use React-PDF to load and display the PDF. Install it via npm and set up a basic viewer with a single page displayed at a time for efficiency.

#### Step 2: Extract Text Content

When the PDF loads, use the `onLoadSuccess` callback to access the PDF document. Loop through all pages to extract text content using PDF.js’s `getTextContent` method. Store this data to search later.

#### Step 3: Search and Highlight Matches

Create a search input for users to enter terms. When the term changes, search through the stored text content to find all matches across pages. Use `customTextRenderer` to highlight matches on the current page by wrapping them in HTML elements with unique IDs.

#### Step 4: Navigate Between Matches

Store all matches with their page and position details. Add “next” and “previous” buttons to cycle through matches. When a button is clicked, update the displayed page to the match’s page and scroll to the highlighted text using its unique ID.

#### Example Code

Below is a simplified example to illustrate the setup. The full implementation is detailed later.

```jsx
import React, { useState } from "react";
import { Document, Page } from "react-pdf";

const PdfSearch = ({ file }) => {
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  return (
    <div>
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Search..."
      />
      <Document file={file}>
        <Page pageIndex={currentPage} />
      </Document>
    </div>
  );
};
```

#### Considerations

- **Performance**: Rendering one page at a time is efficient, but extracting text for large PDFs may take time.
- **Limitations**: React-PDF doesn’t natively support PDF.js’s search features, so you’re building search from scratch.
- **Alternative**: For a more feature-rich solution, consider React-PDF-Viewer, which has a search plugin, but it’s a different library.

---

### Detailed Implementation Guide

To implement in-page PDF search with React-PDF, including highlighting all matches across all pages and navigating between search results, you need to leverage React-PDF’s text extraction and rendering capabilities. Since React-PDF does not provide built-in search functionality, you’ll use PDF.js’s text extraction features indirectly and implement custom logic for searching, highlighting, and navigation. Below is a comprehensive guide, including code, to achieve this.

#### Overview

React-PDF is a library for rendering PDFs in React applications, built on PDF.js. It offers components like `Document` and `Page`, with props such as `onLoadSuccess` for accessing the PDF document and `customTextRenderer` for customizing text display. The goal is to:

1. **Highlight all matches**: Extract text from all pages, find matches for a search term, and highlight them on the displayed page.
2. **Navigate between results**: Allow users to jump to the next or previous match, switching pages and scrolling to the highlighted text as needed.

This implementation renders one page at a time for performance, highlighting matches only on the current page, which aligns with standard PDF viewer behavior (e.g., Adobe Reader highlights matches on the visible page).

#### Step-by-Step Implementation

##### 1. Set Up the React-PDF Environment

Install React-PDF using npm:

```bash
npm install react-pdf
```

Ensure you have a PDF file to display, either as a URL, file object, or data. Set up a basic React component with a `Document` and `Page` to render the PDF.

##### 2. Extract Text Content from All Pages

Use the `onLoadSuccess` callback of the `Document` component to get the PDF document object (a PDF.js `PDFDocumentProxy`). Iterate through all pages, calling `getTextContent` on each to extract text items, which include the text string (`str`) and positional data (`transform`). Store this data in state for searching.

**Code Example**:

```jsx
onLoadSuccess = (pdf) => {
  const totalPages = pdf.numPages;
  const promises = [];
  for (let i = 1; i <= totalPages; i++) {
    promises.push(pdf.getPage(i).then((page) => page.getTextContent()));
  }
  Promise.all(promises).then((textContents) => {
    const textItems = textContents.map((tc, index) => ({
      pageIndex: index,
      items: tc.items,
    }));
    this.setState({ textItems });
  });
};
```

Each `textContent` object contains an `items` array, where each item has a `str` property (the text) and other metadata like `transform` for positioning.

##### 3. Implement Search Functionality

Create a search input to capture the user’s search term. When the term changes, iterate through the stored `textItems` to find all occurrences of the term. For each text item, use `indexOf` to locate matches, recording their positions (`pageIndex`, `itemIndex`, `start`, `end`) and assigning a unique ID (e.g., `match-0`, `match-1`) for navigation.

**Code Example**:

```jsx
findMatches = () => {
  const { textItems, searchText } = this.state;
  const matches = [];
  let matchId = 0;
  textItems.forEach((pageItems, pageIndex) => {
    pageItems.items.forEach((item, itemIndex) => {
      let start = 0;
      while (true) {
        const pos = item.str.indexOf(searchText, start);
        if (pos === -1) break;
        const end = pos + searchText.length;
        matches.push({
          pageIndex,
          itemIndex,
          start: pos,
          end,
          id: `match-${matchId}`,
        });
        matchId++;
        start = end;
      }
    });
  });
  this.setState({ allMatches: matches });
};
```

##### 4. Highlight Matches with `customTextRenderer`

Use the `customTextRenderer` prop of the `Page` component to customize text rendering. For each text item on the current page, check the `allMatches` array for matches specific to that page and item. Split the text into chunks (non-matching and matching parts), wrapping each match in a `<span>` with a unique ID and a `<mark>` for highlighting.

**Code Example**:

```jsx
customTextRenderer = ({ str, itemIndex }) => {
  const { currentPage, allMatches } = this.state;
  const matchesForThisItem = allMatches
    .filter((m) => m.pageIndex === currentPage && m.itemIndex === itemIndex)
    .sort((a, b) => a.start - b.start);

  let chunks = [];
  let lastEnd = 0;
  matchesForThisItem.forEach((match) => {
    if (lastEnd < match.start) {
      chunks.push({ text: str.slice(lastEnd, match.start), isMatch: false });
    }
    chunks.push({
      text: str.slice(match.start, match.end),
      isMatch: true,
      id: match.id,
    });
    lastEnd = match.end;
  });
  if (lastEnd < str.length) {
    chunks.push({ text: str.slice(lastEnd), isMatch: false });
  }

  return (
    <React.Fragment>
      {chunks.map((chunk, index) =>
        chunk.isMatch ? (
          <span key={index} id={chunk.id}>
            <mark>{chunk.text}</mark>
          </span>
        ) : (
          chunk.text
        )
      )}
    </React.Fragment>
  );
};
```

The `customTextRenderer` function ensures that matches are highlighted with unique IDs, making them accessible for navigation. The text layer, rendered as HTML by default (`renderTextLayer=true`), allows these `<span>` elements to be part of the DOM.

##### 5. Navigate Between Search Results

Store all matches in state as an array of objects with `pageIndex` and `id`. Add “next” and “previous” buttons to cycle through matches. When a button is clicked:

- Update the `currentMatchIndex` to the next or previous match.
- Set `currentPage` to the match’s `pageIndex`.
- Use `useEffect` to scroll to the match’s element using its ID (`scrollIntoView`).

**Code Example**:

```jsx
handleNext = () => {
  const { allMatches, currentMatchIndex } = this.state;
  if (currentMatchIndex < allMatches.length - 1) {
    const nextIndex = currentMatchIndex + 1;
    const nextMatch = allMatches[nextIndex];
    this.setState({
      currentPage: nextMatch.pageIndex,
      currentMatchIndex: nextIndex,
    });
  }
};

handlePrevious = () => {
  const { allMatches, currentMatchIndex } = this.state;
  if (currentMatchIndex > 0) {
    const prevIndex = currentMatchIndex - 1;
    const prevMatch = allMatches[prevIndex];
    this.setState({
      currentPage: prevMatch.pageIndex,
      currentMatchIndex: prevIndex,
    });
  }
};

useEffect(() => {
  const { allMatches, currentMatchIndex } = this.state;
  if (allMatches.length > 0 && currentMatchIndex >= 0) {
    const element = document.getElementById(allMatches[currentMatchIndex].id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }
}, [currentMatchIndex]);
```

##### 6. Render the Current Page

Render only the current page using the `Page` component with `pageIndex={currentPage}`. This ensures performance efficiency, especially for large PDFs. The `customTextRenderer` highlights matches on the displayed page.

**Code Example**:

```jsx
<Document file={file} onLoadSuccess={onLoadSuccess}>
  <Page pageIndex={currentPage} customTextRenderer={customTextRenderer} />
</Document>
```

##### 7. Handle Edge Cases

- **No Matches**: If `allMatches` is empty, display a message like “No results found.”
- **Initial Match**: When matches are found, set `currentMatchIndex` to 0 and `currentPage` to the first match’s page.
- **Page Rendering**: Ensure the page is rendered before scrolling. The `useEffect` hook typically runs after DOM updates, but for robustness, you could add a retry mechanism if the element isn’t found.
- **Large PDFs**: Text extraction may be slow for large PDFs. Consider showing a loading indicator during `onLoadSuccess`.

##### Full Component Example

Below is a complete React component implementing the search functionality. It uses modern React hooks and Tailwind CSS for styling, served via CDN for simplicity.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PDF Search with React-PDF</title>
    <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.development.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/babel-standalone@7/babel.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/react-pdf@9.2.1/dist/umd/react-pdf.min.js"></script>
    <script
      src="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs"
      type="module"
    ></script>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <style>
      .pdf-container {
        max-height: 600px;
        overflow-y: auto;
      }
      mark {
        background-color: yellow;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      const { useState, useEffect } = React;
      const { Document, Page, pdfjs } = ReactPDF;

      // Set PDF.js worker
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";

      const PdfSearch = ({ file }) => {
        const [searchText, setSearchText] = useState("");
        const [textItems, setTextItems] = useState([]);
        const [allMatches, setAllMatches] = useState([]);
        const [currentPage, setCurrentPage] = useState(0);
        const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

        // Extract text content
        const onLoadSuccess = (pdf) => {
          const totalPages = pdf.numPages;
          const promises = [];
          for (let i = 1; i <= totalPages; i++) {
            promises.push(pdf.getPage(i).then((page) => page.getTextContent()));
          }
          Promise.all(promises).then((textContents) => {
            const items = textContents.map((tc, index) => ({
              pageIndex: index,
              items: tc.items,
            }));
            setTextItems(items);
          });
        };

        // Find matches when search text changes
        useEffect(() => {
          if (searchText && textItems.length > 0) {
            const matches = [];
            let matchId = 0;
            textItems.forEach((pageItems, pageIndex) => {
              pageItems.items.forEach((item, itemIndex) => {
                let start = 0;
                while (true) {
                  const pos = item.str.indexOf(searchText, start);
                  if (pos === -1) break;
                  const end = pos + searchText.length;
                  matches.push({
                    pageIndex,
                    itemIndex,
                    start: pos,
                    end,
                    id: `match-${matchId}`,
                  });
                  matchId++;
                  start = end;
                }
              });
            });
            setAllMatches(matches);
            if (matches.length > 0) {
              setCurrentMatchIndex(0);
              setCurrentPage(matches[0].pageIndex);
            } else {
              setCurrentMatchIndex(-1);
            }
          } else {
            setAllMatches([]);
            setCurrentMatchIndex(-1);
          }
        }, [searchText, textItems]);

        // Custom text renderer for highlighting
        const customTextRenderer = ({ str, itemIndex }) => {
          const matchesForThisItem = allMatches
            .filter(
              (m) => m.pageIndex === currentPage && m.itemIndex === itemIndex
            )
            .sort((a, b) => a.start - b.start);

          let chunks = [];
          let lastEnd = 0;
          matchesForThisItem.forEach((match) => {
            if (lastEnd < match.start) {
              chunks.push({
                text: str.slice(lastEnd, match.start),
                isMatch: false,
              });
            }
            chunks.push({
              text: str.slice(match.start, match.end),
              isMatch: true,
              id: match.id,
            });
            lastEnd = match.end;
          });
          if (lastEnd < str.length) {
            chunks.push({ text: str.slice(lastEnd), isMatch: false });
          }

          return (
            <React.Fragment>
              {chunks.map((chunk, index) =>
                chunk.isMatch ? (
                  <span key={index} id={chunk.id}>
                    <mark>{chunk.text}</mark>
                  </span>
                ) : (
                  chunk.text
                )
              )}
            </React.Fragment>
          );
        };

        // Navigation handlers
        const handleNext = () => {
          if (currentMatchIndex < allMatches.length - 1) {
            const nextIndex = currentMatchIndex + 1;
            setCurrentMatchIndex(nextIndex);
            setCurrentPage(allMatches[nextIndex].pageIndex);
          }
        };

        const handlePrevious = () => {
          if (currentMatchIndex > 0) {
            const prevIndex = currentMatchIndex - 1;
            setCurrentMatchIndex(prevIndex);
            setCurrentPage(allMatches[prevIndex].pageIndex);
          }
        };

        // Scroll to current match
        useEffect(() => {
          if (allMatches.length > 0 && currentMatchIndex >= 0) {
            const element = document.getElementById(
              allMatches[currentMatchIndex].id
            );
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            }
          }
        }, [currentMatchIndex]);

        return (
          <div className="p-4">
            <div className="mb-4 flex space-x-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search..."
                className="border p-2 rounded"
              />
              <button
                onClick={handlePrevious}
                disabled={currentMatchIndex <= 0}
                className="bg-blue-500 text-white p-2 rounded disabled:bg-gray-300"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentMatchIndex >= allMatches.length - 1}
                className="bg-blue-500 text-white p-2 rounded disabled:bg-gray-300"
              >
                Next
              </button>
            </div>
            {allMatches.length === 0 && searchText && (
              <p className="text-red-500">No results found.</p>
            )}
            <div className="pdf-container">
              <Document file={file} onLoadSuccess={onLoadSuccess}>
                <Page
                  pageIndex={currentPage}
                  customTextRenderer={customTextRenderer}
                />
              </Document>
            </div>
          </div>
        );
      };

      const App = () => {
        // Replace with your PDF file URL or data
        const file =
          "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";
        return <PdfSearch file={file} />;
      };

      ReactDOM.render(<App />, document.getElementById("root"));
    </script>
  </body>
</html>
```

#### Technical Details

##### Text Extraction

The `getTextContent` method from PDF.js returns a `TextContent` object with an `items` array. Each item includes:

- `str`: The text string.
- `transform`: A matrix for positioning (x, y coordinates).
- `dir`, `width`, `height`, `fontName`, `hasEOL`: Additional metadata.

This data is sufficient for searching and determining match positions.

##### Highlighting

The `customTextRenderer` prop allows you to return React elements for each text item. By default, React-PDF renders the text layer as HTML (`renderTextLayer=true`), so highlighted `<span>` elements are part of the DOM, enabling scrolling via `scrollIntoView`.

##### Navigation

The `allMatches` array stores match details:
| Property | Description |
|-------------|--------------------------------------|
| `pageIndex` | The page number (0-based) |
| `itemIndex` | Index of the text item on the page |
| `start` | Start position of the match in `str` |
| `end` | End position of the match in `str` |
| `id` | Unique ID (e.g., `match-0`) |

Navigation updates `currentPage` and `currentMatchIndex`, triggering a re-render of the `Page` component and scrolling to the match.

##### Performance Considerations

- **Single Page Rendering**: Rendering one page at a time reduces memory usage, suitable for large PDFs.
- **Text Extraction**: Extracting text for many pages can be slow. A loading indicator can improve user experience.
- **Large PDFs**: For very large PDFs, consider lazy-loading text content or limiting the number of pages processed initially.

#### Limitations

- **No Native Search**: React-PDF doesn’t expose PDF.js’s `PDFFindController`, requiring manual search implementation ([GitHub Issue #938](https://github.com/wojtekmaj/react-pdf/issues/938)).
- **Rendering Issue**: Some users report that `customTextRenderer` doesn’t trigger re-renders when the search term changes, but this implementation avoids that by ensuring state changes propagate correctly ([GitHub Issue #212](https://github.com/wojtekmaj/react-pdf/issues/212)).
- **Highlighting Scope**: Matches are highlighted only on the current page. Highlighting across all pages requires rendering all pages, which is impractical for large PDFs.

#### Alternative Approach

For a more feature-rich solution, consider using React-PDF-Viewer, which offers a search plugin (`@react-pdf-viewer/search`) with built-in highlighting and navigation ([React PDF Viewer Search](https://react-pdf-viewer.dev/plugins/search/)). However, since the query specifies React-PDF, the above implementation is tailored to that library.

#### Example Usage

To use the provided code:

1. Save it as `index.html`.
2. Serve it via a local server (e.g., `npx serve`) to handle CORS for PDF.js.
3. Replace the `file` URL with your PDF file.
4. Open in a browser to test the search and navigation.

The search input allows entering terms, and the “Previous” and “Next” buttons navigate through matches, switching pages and scrolling as needed.

#### Conclusion

This implementation provides a robust way to add in-page PDF search to a React-PDF application. It extracts text content, highlights matches on the current page, and enables navigation between results. While it requires manual search logic due to React-PDF’s limitations, it meets the requirements effectively for most use cases.

### Key Citations

- [React-PDF npm Package Documentation](https://www.npmjs.com/package/react-pdf)
- [React-PDF GitHub Repository](https://github.com/wojtekmaj/react-pdf)
- [React-PDF-Viewer Search Plugin](https://react-pdf-viewer.dev/plugins/search/)
- [Search Functionality Issue #189](https://github.com/wojtekmaj/react-pdf/issues/189)
- [CustomTextRenderer Search Issue #212](https://github.com/wojtekmaj/react-pdf/issues/212)
- [Native PDF Search Issue #938](https://github.com/wojtekmaj/react-pdf/issues/938)
- [PDF.js Search Stack Overflow](https://stackoverflow.com/questions/35501417/how-to-search-with-pdf-js)
- [PDF.js Examples](https://mozilla.github.io/pdf.js/examples/)
