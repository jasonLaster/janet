# PDF Viewer Component

This project contains a standalone, composable PDF viewer component for Next.js applications, built with React.

## Project Structure

The project is organized as a pnpm workspace with the following packages:

- `packages/next-pdf` - The core PDF viewer component package
- `packages/demo` - A Next.js demo application that showcases the PDF viewer
- `apps/web` - The original application that uses the PDF viewer

## PDF Viewer Package

The `@pdf-viewer/next-pdf` package provides a composable, headless PDF viewer component inspired by modern component libraries like Radix UI and Shadcn UI.

### Features

- Modern, composable API with slot-based customization
- Built for Next.js with App Router support
- Built on top of react-pdf and PDF.js
- Extension points for custom metadata and annotations

### Usage

```tsx
import { PdfViewer, PdfViewerProvider } from '@pdf-viewer/next-pdf';

function MyPdfViewer() {
  return (
    <PdfViewerProvider url="/document.pdf">
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

## Demo App

The demo app showcases the PDF viewer component. To run it:

```bash
pnpm --filter @pdf-viewer/demo dev
```

## Development Status

The project is currently in development. Check the [todo.md](./todo.md) file for current status and upcoming tasks.

## License

MIT