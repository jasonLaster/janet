# @pdf-viewer/next-pdf

A composable PDF viewer component for Next.js applications.

## Features

- Modern, composable API inspired by Radix UI and Shadcn UI
- Built for Next.js with App Router support
- Customizable and extensible through slots and plugin system
- Built on top of react-pdf and PDF.js

## Installation

```bash
npm install @pdf-viewer/next-pdf
# or
yarn add @pdf-viewer/next-pdf
# or
pnpm add @pdf-viewer/next-pdf
```

## Setup

1. Copy the PDF.js worker file to your public directory:

```bash
cp node_modules/@pdf-viewer/next-pdf/public/pdf.worker.js public/
```

2. Import and use the component:

```tsx
"use client";

import { PdfViewer, PdfViewerProvider } from "@pdf-viewer/next-pdf";

export default function MyPdfViewer() {
  return (
    <PdfViewerProvider url="/sample.pdf">
      <PdfViewer.Toolbar>
        <PdfViewer.ZoomControls />
        <PdfViewer.RotateButton />
      </PdfViewer.Toolbar>

      <div className="flex">
        <PdfViewer.Sidebar>
          <PdfViewer.Thumbnails />
        </PdfViewer.Sidebar>

        <PdfViewer.Content />
      </div>

      <PdfViewer.Navigation />
    </PdfViewerProvider>
  );
}
```

## Customization

The component can be customized in various ways:

### Custom toolbar items

```tsx
<PdfViewer.Toolbar>
  <PdfViewer.ToolbarSlot name="start">
    <PdfViewer.ZoomControls />
    <MyCustomControl />
  </PdfViewer.ToolbarSlot>

  <PdfViewer.ToolbarSlot name="end">
    <PdfViewer.DownloadButton label="Download" />
  </PdfViewer.ToolbarSlot>
</PdfViewer.Toolbar>
```

### Custom styling

All components accept a `className` prop for styling:

```tsx
<PdfViewer.Content className="bg-gray-100 p-4" />
```

### Event handling

```tsx
<PdfViewerProvider
  url="/sample.pdf"
  onDocumentLoadSuccess={(data) => console.log("PDF loaded", data)}
  onPageChange={(page) => console.log("Page changed", page)}
/>
```

## API Reference

See the [API documentation](./docs/api.md) for a complete reference.

## License

MIT
