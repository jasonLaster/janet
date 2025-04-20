# PDF Viewer with SWR Caching

This component provides a feature-rich PDF viewer with metadata caching capabilities.

## Features

- SWR-based metadata fetching with caching and revalidation
- PDF document caching
- Responsive layout with resizable panels
- Thumbnail navigation

## Usage

### Basic Client-Side Usage

```tsx
import { PdfViewer } from "@/components/pdf-viewer";

export default function MyPage() {
  return (
    <PdfViewer
      pdfUrl="/path/to/document.pdf"
      pdfTitle="My Document"
      pdfId={123}
    />
  );
}
```

## How It Works

1. The `PdfViewer` component uses SWR to fetch and cache metadata
2. SWR's caching mechanism prevents redundant API calls
3. This improves performance by reusing previously fetched data

## API Reference

### PdfViewer Props

| Prop             | Type     | Description                                |
| ---------------- | -------- | ------------------------------------------ |
| pdfUrl           | string   | URL to the PDF document                    |
| pdfTitle         | string   | Title of the PDF (optional)                |
| pdfId            | number   | Unique identifier for the PDF              |
| existingMetadata | object   | Pre-fetched metadata (optional)            |
| onError          | function | Callback when PDF fails to load (optional) |

### Research

- [Gemini 2.5 - precise citations](https://www.sergey.fyi/articles/using-gemini-for-precise-citations)
