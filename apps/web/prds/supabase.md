# PRD: Supabase Storage Signed Upload URL Endpoint

## Background & Motivation

We currently use Vercel Blob for file storage, but it does not support generating signed URLs for uploads. We need to allow external services (e.g., Google Apps Script, AWS Lambda) to upload PDFs directly to our storage securely, without exposing credentials or proxying uploads through our backend.

A Supabase project is already set up, and credentials are available in `.env.local`.

Supabase Storage offers:

- Simple setup and management.
- First-class TypeScript/JavaScript SDK.
- Built-in support for signed URLs for both uploads and downloads.
- Good documentation and a generous free tier.

## Goals

- **Create a new API endpoint that returns a signed upload URL for Supabase Storage.**
- **Authenticate requests using the `org`/`user` header, following the pattern in the `@form-upload` and `@file-upload` routes.**
- **No need to migrate existing usage at this time.**
- **Set up a test script in `apps/web/scripts` that verifies a PDF can be successfully uploaded using the new endpoint.**

## Requirements

### Functional

1. **Supabase Project & Storage Setup**

   - Supabase project is already configured; credentials are in `.env.local`.
   - Storage bucket (e.g., `pdf-uploads`) is available.

2. **Signed Upload URL Endpoint**

   - Implement a new backend API endpoint that returns a signed upload URL for a given file (e.g., PDF).
   - The signed URL should allow external services to upload directly to Supabase Storage without exposing credentials.
   - Use the Supabase JS SDK's `createSignedUploadUrl` method ([docs](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)).

3. **Access Control**

   - Authenticate requests using the `org`/`user` header, following the pattern in the `@form-upload` and `@file-upload` routes.
   - Only authenticated/authorized users or services can request signed upload URLs.
   - Signed URLs should have a short expiration time (e.g., 5–15 minutes).

4. **Test Script**

   - Create a test script in `apps/web/scripts` that requests a signed upload URL from the new endpoint and uploads a sample PDF to Supabase Storage using that URL.
   - The test should verify that the PDF is successfully uploaded and accessible in the storage bucket.

5. **Documentation**

   - Document the new upload flow for both internal and external developers.
   - Provide code samples for generating and using signed URLs.

## Out of Scope

- Migrating all historical files or existing usage.
- Supporting non-PDF file types (unless trivial).

## Success Criteria

- Developers can generate signed upload URLs via the new backend endpoint.
- External services (e.g., Google Apps Script, Lambda) can upload PDFs directly using the signed URL.
- The test script in `apps/web/scripts` verifies successful PDF upload.
- No sensitive credentials are exposed to clients or external services.
- Supabase Storage is set up and working in production with minimal ongoing maintenance.

## Implementation Plan

1. **Confirm Supabase project and storage bucket** (`pdf-uploads`) are set up and credentials are in `.env.local`.
2. **Implement the new API endpoint** to generate signed upload URLs using `createSignedUploadUrl`.
3. **Authenticate requests** using the `org`/`user` header, as in `@form-upload` and `@file-upload` routes.
4. **Create a test script in `apps/web/scripts`** to verify PDF upload via the signed URL.
5. **Update documentation and code samples** for the new flow.
6. **Test with external service (e.g., Google Apps Script) to confirm uploads work.**

## Example: Generating a Signed Upload URL

```typescript
// npm install @supabase/supabase-js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSignedUploadUrl(filePath: string, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage
    .from("pdf-uploads")
    .createSignedUploadUrl(filePath, expiresInSeconds);

  if (error) throw error;
  return data; // { signedUrl, path, token }
}
```

See [Supabase Storage: Create Signed URL](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) for more details.
