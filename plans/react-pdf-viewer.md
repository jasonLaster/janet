# Migration to @react-pdf-viewer

Below is a pragmatic, step-by-step plan to replace the existing custom `PdfViewer` stack with `@react-pdf-viewer`, preserving current functionality (header, metadata badges, search, zoom, rotate, thumbnails, sidebar toggle, etc.) while minimising disruption to the rest of the codebase.

---

## 1. Install dependencies

```bash
pnpm add pdfjs-dist@3.4.120 \
         @react-pdf-viewer/core@3.12.0 \
         @react-pdf-viewer/default-layout@3.12.0
# Optional plugins we'll likely need
pnpm add @react-pdf-viewer/search@3.12.0 \
         @react-pdf-viewer/thumbnail@3.12.0
```

([Docs](https://react-pdf-viewer.dev/docs/getting-started/))

---

## 2. Global styles

Import once (e.g. in `layout.tsx` or `globals.css`):

```ts
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
```

---

## 3. Feature mapping

| Current feature                  | `@react-pdf-viewer` equivalent          |
| -------------------------------- | --------------------------------------- |
| Page rendering (scale, rotation) | `Viewer` props (`scale`, `rotation`)    |
| Sidebar + thumbnails             | `defaultLayoutPlugin` (customisable)    |
| Search (input + prev/next)       | `searchPlugin`                          |
| Zoom in/out                      | built-in toolbar/`zoomPlugin`           |
| Rotate                           | toolbar or `viewerInstance.rotate()`    |
| Hide/show text layer             | `renderPageLayer` callback              |
| Manual page navigation           | `viewer.scrollToPage()` / `initialPage` |

## 4. Directory layout for side-by-side testing

To avoid breaking the existing `PdfViewer` while migrating, create a **new folder** to contain all `@react-pdf-viewer`–based code:

```bash
mkdir -p apps/web/components/react-pdf-viewer
```

We will place **all new files** (wrapper component, helpers, plugin customisations) inside this directory so the old viewer and the new one can coexist during the migration period.

---

## 5. Add a thin wrapper component

Create `apps/web/components/react-pdf-viewer/react-pdf-viewer-wrapper.tsx` that wraps `Viewer`, sets up plugins, and exposes imperative controls (scale, rotation, page change, hide text layer).

Skeleton:

```tsx
"use client";

import { Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { searchPlugin } from "@react-pdf-viewer/search";
import { useEffect, useRef } from "react";

interface Props {
  /* …see plan */
}

export const ReactPdfViewerWrapper = ({
  pdfUrl,
  currentPage,
  showTextLayer,
  scale,
  rotation,
  onPageChange,
}: Props) => {
  const defaultLayout = defaultLayoutPlugin();
  const search = searchPlugin();
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.scrollToPage(currentPage);
      viewerRef.current.zoom(scale);
      viewerRef.current.rotate(rotation);
    }
  }, [currentPage, scale, rotation]);

  return (
    <Viewer
      fileUrl={pdfUrl}
      plugins={[defaultLayout, search]}
      onPageChange={(e) => onPageChange?.(e.currentPage + 1)}
      renderPageLayer={(props) => (showTextLayer ? props.layer : null)}
      ref={viewerRef}
    />
  );
};
```

---

## 6. Refactor `PdfViewer`

1. Remove `PdfViewerContent`; replace it with the wrapper above.
2. Keep `PdfViewerHeader` + `DocumentMetadata`.
3. Wire header search buttons into `searchPlugin` instance:

```ts
jumpToNextMatch();
jumpToPreviousMatch();
highlight(searchTerm);
```

---

## 7. Custom thumbnails (optional)

If we need per-page checkboxes like the [custom thumbnail example](https://github.com/react-pdf-viewer/examples/blob/main/customize-thumbnail-items/CustomThumbnailItemsDefaultLayoutExample.tsx), inject a custom tab into `defaultLayoutPlugin`:

```tsx
defaultLayoutPlugin({
  sidebarTabs: (tabs) => [customThumbnailTab, ...tabs.slice(1)],
});
```

---

## 8. Delete obsolete code

- pdf.js worker init, manual canvas/text-layer handling.
- `PdfViewerContent` and related hooks.
- Deprecated packages (e.g. `react-pdf`).

---

## 9. Next.js / SSR

`Viewer` is DOM-dependent; wrap with `dynamic(() => import('./react-pdf-viewer-wrapper'), { ssr: false })` when rendered on the server.

---

## 10. QA checklist

- [ ] Pages render correctly.
- [ ] Sidebar toggle & thumbnails work.
- [ ] Search highlights & prev/next navigation work.
- [ ] Zoom, rotate, hide/show text layer all function.
- [ ] Metadata badges still display.
- [ ] Performance acceptable on large PDFs.

---

## 11. Effort estimate

| Task                             | Time        |
| -------------------------------- | ----------- |
| Install & wire basic viewer      | 1–2 h       |
| Hook UI controls                 | 1 h         |
| Optional thumbnail customisation | 1–2 h       |
| Cleanup & regression tests       | 2 h         |
| **Total**                        | **≈ 1 day** |

---

Migrating to `@react-pdf-viewer` consolidates multiple custom features into well-maintained plugins, reducing maintenance overhead and unlocking advanced future functionality (printing, annotations, etc.).
