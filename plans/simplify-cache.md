# Simplify PDF Caching Strategy

## 🎯 Goal

Eliminate our bespoke `pdf-cache.ts`, `usePDFDocument`, and `usePdfs()` logic in favour of:

1. Vercel-level HTTP caching for the binary PDFs.
2. Standard browser HTTP-cache primitives (ETag/`Cache-Control`).
3. Simpler React code that just points `react-pdf` at a URL.

---

## 0. Auth & Routing Primer 🚦

```
Browser ➜ /api/pdfs/[id]/content                (public URL)
           ├─▶ Middleware (Clerk + iron-session)
           │     – validates session
           │     – seals {pdfId,userId,orgId} → token (TTL 60 s)
           │     – **rewrites** request to
           └──▶  /api/pdfs/internal-stream/[token]    (server route)
                         ├─ DB lookup ➜ authZ check
                         └─ Streams Blob ➜ Response
```

Important implications:

- The **user-visible URL never contains the token**, so it is stable per PDF and therefore cache-key friendly.
- The internal-stream handler is the only place that must see the sealed token; cache behaviour is defined by the headers it sets.
- We must **not** set `Cache-Control: public` (would allow Vercel to share a private PDF across users). Use `private` + `s-maxage=0` to stop edge caching while still letting the **browser** cache.

---

## 1. Current Pain Points

- Extra **25-30 kB** of client JS (`pdf-cache.ts`, `usePDFDocument`, SWR) that runs on every document page.
- `Cache API` is not universally supported (Safari <16, FF private mode).
- Base64 duplication of files inflates storage quota & memory.
- Complicated retry / LRU code paths that are hard to reason about and test.

---

## 2. Requirements Recap

- Streaming (**range-request**) support so `react-pdf` can fetch byte ranges.
- Long-lived, immutable cache key while still allowing invalidation when a PDF changes.
- Works on Vercel Edge without extra infra.
- Zero additional client code.

---

## 3. Proposed Architecture

```
Browser ➜ /api/pdfs/[id]/content                (public URL)
           ├─▶ Middleware (Clerk + iron-session)
           │     – validates session
           │     – seals {pdfId,userId,orgId} → token (TTL 60 s)
           │     – **rewrites** request to
           └──▶  /api/pdfs/internal-stream/[token]    (server route)
                         ├─ DB lookup ➜ authZ check
                         └─ Streams Blob ➜ Response
```

1. **Middleware + Internal Stream**
   - We KEEP the existing pair. Our changes are limited to **headers** emitted from the internal-stream handler.
   - Header matrix:
     | Document visibility | Cache-Control (browser) | Edge behaviour |
     |---------------------|-----------------------------------|------------------|
     | private (default) | `private, immutable, max-age=31536000` | _Not stored by Vercel_ (because `private`) |
     | public | `public, immutable, max-age=31536000, s-maxage=31536000` | _Stored at edge_ |
   - We add an `ETag` (SHA-256 of blob) for conditional GETs if we ever relax `max-age`.
2. **Client**
   - Unchanged: fetches `/api/pdfs/${id}/content`.
   - Browser will happily serve from its own cache on repeat views **without** new middleware round-trip ➜ no token cost.

---

## 4. Implementation Steps (rev)

### 4.1 Server-Side – tweak existing internal-stream route

```ts
// inside apps/web/app/api/pdfs/internal-stream/[token]/route.ts
...
const isPublic = pdf.is_public;
const cacheHeader = isPublic
  ? "public, immutable, max-age=31536000, s-maxage=31536000"
  : "private, immutable, max-age=31536000"; // browser-only cache
...
headers.set("Cache-Control", cacheHeader);
headers.set("Accept-Ranges", "bytes");
// Optional but recommended
// headers.set("ETag", checksum); // where checksum = sha256(blob) or db column
```

_No new API route is required; we only patch headers._

### 4.2 Client-Side Clean-up

1. Delete `apps/web/lib/pdf-cache.ts` and any imports.
2. Delete/replace `usePDFDocument` hook.
   - In `PdfViewer` drop all cache-related logic (`cachedDocument`, `cacheLoading`, etc.).
   - Keep a single state: `pdfUrl = "/api/pdfs/" + pdfId + "/content"`.
3. _If_ we still need a list of PDFs (metadata), convert `usePdfs()` to a simple **server component** that calls `fetch('/api/pdfs', { cache: 'no-store' | 'force-cache' })` with `revalidate` where appropriate. For now we can inline this into the page that needs it.
4. Strip SWR dependency entirely from `apps/web` package.

### 4.3 Prefetch Optimisation (Optional)

- On file list page add:
  ```tsx
  import { useRouter } from "next/navigation";
  // …
  const router = useRouter();
  const onHover = (id: string) => {
    router.prefetch(`/api/pdfs/${id}/content` as any); // Next won't pre-hydrate but warms HTTP cache.
  };
  ```
- Alternatively add a `<link rel="prefetch">` tag to `Head` when the item becomes visible.

### 4.4 Delete Dead Code

```bash
pnpm remove swr
pnpm eslint --fix .
```

Ensure there are **zero** references to `usePdfs`, `usePDFDocument`, or `pdf-cache.ts`.

---

## 5. Roll-out / Migration

1. Merge the new route + `PdfViewer` simplification behind a feature flag (`NEXT_PUBLIC_SIMPLE_PDF_CACHE`).
2. Release to staging, open a couple of PDFs, confirm 200 w/ cache headers then 304/Memory cache on reload.
3. Ship to production, wait 1-2 days, then remove old code permanently.

---

## 6. Benefits

- ~1 s faster first render on low-end devices (no in-browser base64 conversion).
- 30–50 kB less JS shipped.
- Uniform behaviour across all browsers & private/incognito sessions.
- Free CDN edge caching courtesy of Vercel – no storage quota or eviction logic to maintain.
