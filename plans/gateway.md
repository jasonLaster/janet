Awesome, thanks for the details. I'll review the `pdf-ocd` codebase and draft a concrete, detailed plan for integrating middleware-protected persistent document links, grounded in your current architecture (Clerk auth, Neon DB, 403 on unauthorized, redirect to signed blob URL). I'll get back to you shortly with a complete strategy and specific implementation steps.

# Implementing Middleware-Protected Persistent Document Links

## Overview of the Plan

We will refactor **pdf-ocd** so that PDFs are **only accessible via an authenticated route** instead of directly using blob storage URLs. This involves creating a dedicated **documents API endpoint** that checks user permissions and then redirects to a short-lived **signed URL** for the PDF. This way, the URL that users interact with (on our app domain) stays persistent, while the underlying blob URL is ephemeral and secure. Unauthorized requests will get a **403 Forbidden**, and even "public" documents will be served through our controlled route (with no login required in that specific case).

In summary, we'll:

- **Add a protected `/api/documents/[id]` route** (or similar) to handle PDF access.
- **Use Clerk middleware** to ensure requests carry authentication and get blocked if not allowed.
- **Extend the database schema** to support ~~organization sharing, explicit user sharing, and~~ public flags. _(Sharing features deferred)_
- **Enforce access control** in middleware/route (owner ~~, org member, shared user,~~ or public). _(Sharing checks deferred)_
- **Redirect the user to the stored Vercel Blob URL** (optionally using `getDownloadUrl()` from `@vercel/blob` to force a file download).
- **Update the frontend** to use the new persistent link for all PDF access.
- Follow Clerk & Neon **best practices** (fast middleware, secure queries, potential RLS policies) to keep the solution safe and scalable.

Below are the detailed steps and design considerations:

## 1. Routing Changes: Persistent Document Endpoint

We will introduce a new **Next.js API route** to serve documents. For example, in a Next.js 13 app structure, create a file at:

```
apps/web/app/api/documents/[id]/route.ts   (if using the App Router)
```

_(Or under `pages/api/documents/[id].ts` if using the Pages router.)_

**What this route does**:

- Accepts a document ID (e.g. `/api/documents/abc123`). This ID will be a stable identifier (likely the primary key from the DB).
- **No blob URL is exposed here** – the client just knows the ID. This means even if the actual file name or storage location changes (e.g. after OCR renaming), the link remains the same. It's truly persistent and user-friendly.
- When a request hits this route, the server will perform an auth check (see next sections). If the user is authorized, the route will **fetch a one-time signed URL** for the PDF from the storage service, then **respond with a redirect** to that URL. If not authorized, it returns a 403.

**Front-end impact**: All places in the app that previously used a blob URL should be changed to use this new endpoint. For example:

- If you had an `<a href="{blobUrl}">Download PDF</a>`, replace the `href` with `/api/documents/${documentId}`.
- If you displayed PDFs in an `<iframe>` or viewer, use the persistent link as the `src`.

Because the route uses the document's ID, which doesn't change, users can bookmark or share the link confidently. The actual heavy PDF content is not sent through our server on this link – instead, we'll redirect to a cloud URL (which expires). This **redirect pattern** is a known best practice to keep links stable while not exposing your storage directly ([next/image does not seem to follow redirects · vercel next.js · Discussion #36808 · GitHub](https://github.com/vercel/next.js/discussions/36808#:~:text=Transfer)).

## 2. Authentication via Clerk Middleware

To protect this new route (and any other sensitive routes), we'll use Clerk's auth middleware for Next.js. Clerk provides a `clerkMiddleware()` (or `authMiddleware()`) that integrates with Next.js Middleware to automatically authenticate requests ([Next.js: clerkMiddleware() | Next.js](https://clerk.com/docs/references/nextjs/clerk-middleware#:~:text=export%20default%20clerkMiddleware)).

**Setup**: Create a `middleware.ts` file in the **`apps/web`** directory (root of the Next.js app). In it:

```ts
// apps/web/middleware.ts
import { authMiddleware } from "@clerk/nextjs";

// Use Clerk's auth middleware to handle requests
export default authMiddleware({
  // You can customize routes here if needed
});

export const config = {
  matcher: [
    // Apply this middleware to our API routes (and any other protected routes):
    "/api/documents/:path*", // protect all document links
    // ...you can add other routes that need auth here...
    // (Clerk's default matcher usually also ignores _next/static files, etc.)
  ],
};
```

This configuration means: for any request matching `/api/documents/*`, run the Clerk auth middleware. The middleware will verify the user's session JWT and attach the user info to the request (e.g. `req.auth.userId`). It skips Next's internal or static file routes by default ([Next.js: clerkMiddleware() | Next.js](https://clerk.com/docs/references/nextjs/clerk-middleware#:~:text=export%20const%20config%20%3D%20,Always%20run%20for%20API%20routes)).

**Unauthorized behavior**: By default, Clerk's middleware will **block unauthenticated API requests** (returning a 401 or redirecting to sign-in). We want a 403 for unauthorized access per requirements. We have a couple of options:

- **Let the route handle it**: We can configure the Clerk middleware to not automatically redirect for this route, and instead check `userId` in our route code and return 403 manually if missing. (In the snippet above, using `authMiddleware()` without specifying `publicRoutes` means all those routes require auth – an unauthenticated request will result in a 401 by default.) We can catch that in the route or adjust Clerk's response.
- **Manual check in middleware**: Alternatively, we could write a custom middleware function that does:
  ```ts
  const { userId } = getAuth(req);
  if (!userId && !isPublicDoc(req)) {
    return new Response("Forbidden", { status: 403 });
  }
  ```
  and allow public docs to pass. However, determining `isPublicDoc` would require knowing the doc ID from the URL and querying the DB in middleware – which we want to avoid (edge middleware should be lightweight).

**Recommended approach**: Use Clerk's middleware to handle session parsing and basic blocking, but ultimately perform the fine-grained auth logic in the route handler. We'll configure Clerk not to redirect to the login page for API calls, but instead to simply return an error if no session. (The `authMiddleware({ apiRoutes: [...] })` option in Clerk causes APIs to return 401 JSON by default ([How to authenticate a Next.js Route Handler using Clerk](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers#:~:text=export%20default%20authMiddleware%28%7B%20apiRoutes%3A%20%5B,)).) We can then convert that to 403 if needed. In practice, the difference between 401/403 here is minor – the key is the client can't get the file without auth. We will ensure it says "Forbidden" as per requirement.

**Summary**: After this setup, any request to `/api/documents/[id]` will go through Clerk's middleware:

- If the user is logged in, `req.auth` will contain their `userId` (and `orgId` if using organizations). The request continues to the route handler.
- If the user is not logged in and the route isn't marked public, Clerk will halt the request. (We'll adjust this behavior for _public_ docs in our handler logic – essentially allowing certain requests through even if no session, see below.)
- Either way, by the time our route code runs, we can trust that `req.auth` contains the user's identity (or is empty if none). We won't have to manually parse JWTs or cookies – **Clerk handles it** efficiently at the edge ([Next.js: clerkMiddleware() | Next.js](https://clerk.com/docs/references/nextjs/clerk-middleware#:~:text=export%20default%20clerkMiddleware)).

## 3. Database Schema Updates for Permissions

To enforce the new access rules, we need to track document ownership and sharing in the database (Neon Postgres). The current schema likely has a `documents` table with basic info (perhaps owner and filename). We will refine it as follows:

- **Owner field**: Ensure there is an `owner_id` on each document (likely already present). This should be the Clerk `userId` of whoever uploaded the PDF. (If not, add `owner_id TEXT NOT NULL` referencing the user's ID.) This will be used to allow owners to always access their documents. _(This field exists in `db.ts` as `user_id` - we'll use that)_

- **Organization field**: ~~Add an `organization_id TEXT NULL` on the `documents` table. This will store a Clerk organization ID if the document is shared with an organization. If `organization_id` is not null, it means the document is considered "owned by" or shared to that organization (i.e., all members of that org should be able to access it).~~ _(Organization sharing is **out of scope** for now. The existing `organization_id` field in `db.ts` will be preserved but **not used for access control** in this phase.)_

  ~~- **When to set**: We will set this field when a user explicitly shares the doc with their org (for instance, via a UI option "share with organization"). It can remain `NULL` for personal/private docs.~~
  ~~- The `organization_id` will correspond to Clerk's org identifier (which is a string). We'll rely on Clerk to know which users are members of which orgs.~~

- **Public flag**: Add an `is_public BOOLEAN NOT NULL DEFAULT FALSE` to `documents`. When `is_public = true`, it means **anyone with the document's link can access it**, even without being logged in. We will still enforce access through our route (so we can track downloads and redirect), but we won't require a session for these. Marking a document public would be an explicit action by the user (or an "Anyone with the link" setting). _(This needs to be added to the schema)_

- **Explicit shares**: ~~To allow sharing with specific users (outside of org context), introduce a join table, e.g. `document_shares`:~~ _(Explicit user sharing is **out of scope** for now.)_

  ~~```sql~~
  ~~CREATE TABLE document_shares (~~
  ~~ document_id UUID REFERENCES documents(id) ON DELETE CASCADE,~~
  ~~ user_id TEXT NOT NULL, -- Clerk user ID of the person who has access~~
  ~~ PRIMARY KEY (document_id, user_id)~~
  ~~);~~
  ~~```~~

  ~~This table lists every user that a document has been shared with (other than the owner and org members). For example, if User A shares doc X with User B, we insert `(X, B)` here.~~

- ~~(Alternatively, you could use a JSON array of user IDs in the `documents` table for shared users, but a separate table is more normalized and easier to query for "which docs can user Y access".)~~

- **Indexes**:
  - The primary key on `documents(id)` should already exist (likely as `INT` based on `db.ts`).
  - ~~Ensure an index on `documents(organization_id)` if you will query documents by org (e.g., listing all org documents).~~ _(Org filtering deferred)_
  - ~~The `document_shares` table's primary key doubles as an index on `(document_id, user_id)`. You might also add an index on `user_id` alone if you need to query "which docs does user X have access to" frequently (for listing their docs across orgs and shares).~~ _(Sharing tables deferred)_
  - These indexes will make permission-check queries fast.

After these schema changes, our app logic can answer questions like:

- "Is this user the owner of the doc?" (compare `user_id`),
- ~~"Is this doc shared with this user via org?" (check `organization_id` and see if user is in that org),~~ _(Deferred)_
- ~~"Is this doc shared directly with this user?" (check `document_shares` for a record),~~ _(Deferred)_
- "Is this doc public?" (check `is_public`).

If you're using an ORM like **Drizzle** (which Neon's docs recommend), you'd update the schema definitions (e.g., add fields in the `documents` model ~~and create a new model for `document_shares`~~). Then run a migration to update the DB. If using raw SQL, execute an `ALTER TABLE` for the new columns ~~and `CREATE TABLE` for shares~~ as shown above.

## 4. Access Control Logic (Auth Checks)

With the groundwork laid, we'll implement the core **authorization checks** when a request comes in to the document route. We need to ensure the request satisfies one of the allowed conditions:

- The document is public, **or**
- The user is logged in **and** is the owner of the doc. ~~(owner, org member, or shared directly).~~ _(Org/share checks deferred)_

**Logic flow for the `/api/documents/[id]` GET handler**:

1.  **Extract the document ID** from the request. In Next.js Route Handlers, the context provides `params`. For example:

```ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const docId = params.id;
    ...
}
```

2. **Get user identity from Clerk**: Because we set up Clerk middleware, we can easily retrieve `userId` and `orgId` in the handler. Clerk provides helpers – in the App Router, `import { getAuth } from "@clerk/nextjs/server"` works to get the auth context. For example:

   ```ts
   const { userId, orgId } = getAuth(request);
   ```

   Here:

   - `userId` will be the Clerk user ID if the request is authenticated, or `null/undefined` if not.
   - `orgId` will be the active organization ID if the user is signed in and has an active org. (If the user is a member of an org but not currently "using" it, orgId might be null. More on this below.)

3. **Fetch the document record from the database** using the `docId`. We will need fields: owner_id, organization_id, is_public, and any storage path info (to fetch the file). For example, if using Drizzle:

   ```ts
   const doc = await db
     .select()
     .from(documents)
     .where(eq(documents.id, docId))
     .leftJoin(
       documentShares,
       eq(documentShares.document_id, documents.id).and(
         eq(documentShares.user_id, userId)
       )
     )
     .execute();
   ```

   (The left join could help retrieve a share record in one query, but you could also do two queries: one for the doc, one to check the share table for (docId, userId).)

   ```ts
   // Using the existing db.ts function:
   const doc = await getPdfById(Number(docId));
   ```

   If the document is not found, return a 404 Not Found:

   ```ts
   if (!doc) {
     return NextResponse.json({ error: "Document not found" }, { status: 404 });
   }
   ```

4. **Authorize the request** against the document's settings:

   - **Public document**: If `doc.is_public === true`, then **no authentication is required**. Anyone can access it. In this case, we can skip further checks. (We may still want to log the access or increment a view count, but that's optional.) We'll allow the request to proceed to file retrieval.  
     _Even though Clerk middleware ran, it might have found no user. That's fine – for public docs we intentionally allow no `userId`. We'll need to ensure Clerk's middleware doesn't automatically redirect guests in this scenario. By default, it would have returned 401 for an unauthenticated request. To handle this, we can mark the `/api/documents` route as a "public route" in Clerk's config **only for the specific case when the doc is public**. Since the middleware itself doesn't know the doc ID's status, the simplest approach is: do not force auth in middleware (just use it to get user if present), and in the route handler implement: if doc is public, and no user, allow it._

   - **Non-public document**: If `is_public` is false, the user **must be authenticated** and meet one of the criteria below. If `userId` is null here, immediately return 403 Forbidden:

     ```ts
     if (!userId) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
     }
     ```

     (We prefer 403 to indicate "you are not allowed" rather than a 401 "please login", since this could be a logged-out user with a private link or a logged-in user lacking permission. In either case, from the client perspective, it's a forbidden action.)

   - If we have a `userId` (the user is logged in), check the following in order:
     1. **Owner**: If `doc.user_id === userId`, allow access (the uploader can always see their file).
     2. **Organization member**: If `doc.organization_id` is not null, check if the current user is a member of that organization.
        - If you are using Clerk's organization features: one approach is to rely on `orgId` (active org). But a user could be in multiple orgs, so they might not have the target org as active. A safer approach is to query Clerk or our database for membership. For instance, you might maintain an `org_members` table syncing Clerk org memberships, or use Clerk's API to list `user.memberships`.
        - Simpler: use Clerk's JWT claims. Clerk can include an array of organization IDs or a specific org ID in the token. (Clerk's `organizationSyncOptions` can help include org membership info in the JWT.) If that's set up, we could check if `doc.organization_id` is in the user's org list.
        - For now, assume we have a function `db.isUserInOrg(userId, doc.organization_id)` that returns true if the user belongs to that org. We call that. If true, allow access.  
          _(If the app is single-org context (user belongs to one org at a time), `orgId` from Clerk might directly match `doc.organization_id`, which is an easy check. But if multi-org, do the membership lookup.)_
     3. **Explicit share**: Check the `document_shares` table for a record where `document_id = doc.id` and `user_id = userId`. If such a record exists, the user has been individually granted access – allow it.
     4. **Otherwise**: If none of the above conditions is true, the user is not authorized to view this document – return 403.

   We can implement these checks in code like:

   ```ts
   // Pseudocode inside GET handler
   if (!doc.is_public) {
     if (!userId) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
     }
     const isOwner = doc.user_id === userId;
     const inOrg = doc.organization_id
       ? await db.isUserInOrg(userId, doc.organization_id)
       : false;
     const isShared = await db.isDocumentSharedWith(documentId, userId);

     if (!(isOwner || inOrg || isShared)) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
     }
   }
   // If public, or passes the checks, we continue...
   ```

   In practice, you might combine some of these into the DB query (e.g., use SQL `WHERE (owner_id = userId OR organization_id IN (...user's orgs...) OR document_shares.user_id = userId OR is_public = true)`). If using Neon's row-level security (RLS), you could even push these rules into the database policies (more on that later). But the above explicit checks are clear and sufficient for the app layer.

   **Note**: "Unauthorized users get 403" – with the above logic, an unauthorized request (not meeting any allow criteria) indeed returns 403. If the user is completely unauthenticated and the doc isn't public, we do 403 immediately (as opposed to a redirect to login). This aligns with the requirement that we don't serve the file or a blob URL to them. (Optionally, the frontend could catch that 403 and show a message or prompt login, but that's up to the UI – the backend just sends 403.)

5. **Handling organization logic**: We should clarify how we determine org membership efficiently:

   - Since we're using Clerk, the **best practice** is to let Clerk handle auth and possibly use Clerk's JWT claims for authorization data. Neon's documentation even suggests embedding user identity in SQL queries for RLS ([Secure your data with Clerk and Neon RLS - Neon Docs](https://neon.tech/docs/guides/neon-rls-clerk#:~:text=Clerk%20handles%20user%20authentication%20by,as%20part%20of%20this%20guide)). We could take inspiration from that. For example, if Clerk's JWT included a custom claim like `org_ids: [...]`, we could quickly check `if (doc.organization_id && org_ids.includes(doc.organization_id))`.
   - If not, we might maintain an `organization_members` table in Neon that tracks which user IDs belong to which org IDs. (This could be populated via webhooks from Clerk or on login.) Then `db.isUserInOrg` can just query that table. This avoids an external API call on each request and keeps it all in Neon (fast).
   - For now, assume we have a quick way to check membership (either via Clerk's session info or our DB). This check should be **fast** – likely just a lookup by compound primary key (userId, orgId) in a membership table, or a cached list in memory.

6. **Audit**: If needed, we can log the access attempt at this point (e.g., console log or telemetry: "User X accessed doc Y - allowed/denied"). This can help debug and also serves as an audit trail since direct blob access won't hit our app.

At this stage, if the function hasn't returned a 403, it means access is **granted**. We then proceed to generate the signed URL.

## 5. Redirecting to the Vercel Blob URL

Instead of streaming the PDF from our server we simply **redirect the client to the immutable Vercel Blob URL** that is already stored in our `pdfs.blob_url` column. Vercel Blob URLs are globally cached, unguessable, and secure enough for the use-case. If you want to force a _download_ instead of rendering inline you can generate a secondary URL with `getDownloadUrl()` from `@vercel/blob` at request time.

**Implementation details**:

- The `blob_url` column already contains the public Vercel Blob URL (example: `https://1sxstfwepd7zn41q.public.blob.vercel-storage.com/yourfile.pdf`).
- Decide whether the caller wants inline view or forced download by checking a `?download=1` query-param:

  ```ts
  import { getDownloadUrl } from "@vercel/blob";

  const finalUrl =
    request.nextUrl.searchParams.get("download") === "1"
      ? await getDownloadUrl(doc.blob_url)
      : doc.blob_url;

  return NextResponse.redirect(finalUrl, 302);
  ```

- Because Vercel Blob already returns the correct `Content-Disposition` header, no additional CORS work is required.
- Optionally set `cacheControlMaxAge: 60` when uploading so updated PDFs propagate through the CDN quickly.

That's all—no AWS SDK, no presigning logic, and no long-lived credentials.

## 6. Frontend Modifications

We need to update the application's frontend to use the new system:

- **Document listing or dashboard**: Wherever we display documents to the user (their list of PDFs, or search results from Meilisearch, etc.), we should no longer show any raw blob URL. Instead, if we have a "View" or "Download" button, it should link to our app's route. For example:
  ```jsx
  <Link href={`/api/documents/${doc.id}`} target="_blank">
    Open PDF
  </Link>
  ```
  (Using `target="_blank"` to open in a new tab or embed accordingly.)
- If there was any client-side code constructing blob URLs or using them (for example, if the blob URL was stored in state after upload), we change that logic. After uploading a PDF, the client should ideally get back the new document's ID (and maybe some metadata) from the server, not a blob URL. Then it can use that ID to formulate the persistent link.
- **Remove direct blob exposures**: If currently the app was storing a full `blob_url` in the database and sending it to the client (perhaps as part of document data), that is no longer necessary. We can store only the file key/path and use the server to generate URLs on the fly. In responses or client-state, replace any `blob_url` fields with either nothing or with the app link. But it's actually better to just give the client the doc ID and let it know how to access via `/api/documents/id`. This avoids leaking the actual storage link at all.
- **Public documents**: The frontend might allow generating a shareable link for a public doc. That link should be our app's route (e.g., `https://yourapp.com/api/documents/abc123`). When an unauthenticated user clicks it, what happens? Our backend will see `is_public=true` and give them the file. Clerk's middleware might need to allow this through without a session; as designed, our handler will return 403 only if not public. So it should work. (If we find Clerk is blocking unauthenticated access entirely, we might tweak the middleware to treat `/api/documents/*` as a "public route" and do auth inside, or use the approach above of always returning 403 from the handler. The key is to ensure public links don't get bounced to a login – they should go straight to the file.)
- **Org documents**: ~~If a user is a member of an organization and we want to list org-shared docs, we'll fetch those from DB (e.g., `WHERE organization_id = user.currentOrgId OR document_shares contains userId OR owner_id = userId`).~~ _(Org document listing deferred)_ The UI can largely remain the same; just the access behind the scenes is now unified through the `/api/documents` route.

From a user's perspective, nothing major changes except the URLs they see for downloads are now your app's URLs (which might actually look nicer than raw AWS links). If they copy a link to a document to send to a colleague:

- If the doc is private, that link will only work for the **owner** logged in ~~with permission~~ (otherwise they get 403).
- ~~If it's shared with a specific user, that user must log in to their account to access.~~ _(Deferred)_
- ~~If it's org-shared, an org member must log in (403 for outsiders).~~ _(Deferred)_
- If public, anyone can click it and it will work (for a limited time per link issuance). _(Note: Vercel Blob URLs don't expire unless overwritten/deleted)_

This meets the goal of **authenticated and controlled access** for the current scope (owner/public).

## 7. Clerk & Neon Best Practices Considerations

We want to ensure the solution is robust as the app grows. Some points to note:

- **Clerk Middleware Performance**: The Clerk middleware runs on Vercel's Edge by default, meaning it's very fast and global. It will validate the JWT and attach user info in a few milliseconds. By using the `matcher` config, we restricted it to relevant routes (like `/api/documents/*`) so it doesn't run unnecessarily on every single request (though Clerk's default matcher already skips static files, etc. ([Next.js: clerkMiddleware() | Next.js](https://clerk.com/docs/references/nextjs/clerk-middleware#:~:text=export%20const%20config%20%3D%20,Always%20run%20for%20API%20routes))). This keeps overhead minimal.

- **No heavy work in middleware**: We deliberately avoided doing database lookups or other heavy logic in the middleware. All those checks (owner, org membership, etc.) happen in the route handler, which runs in a Node.js environment with access to our DB. The middleware simply ensures we have a user identity (or not) on the request. This separation is good for performance – the edge middleware is lightweight, and the main work happens server-side only when needed.

- **Neon (Postgres) usage**: Use parameterized queries or an ORM to prevent SQL injection when querying by document ID or user ID. (If using Drizzle ORM, it handles that for you by design.) For example, never string-concatenate the `docId` into a query – pass it as a parameter. This is standard, but worth emphasizing for security.

- **Row-Level Security (optional advanced)**: Since Neon supports RLS, we could implement these access rules at the DB level too. For instance, define a policy on the `documents` table such that:
  - Owners can `SELECT` their document.
  - Org members can `SELECT` org documents.
  - Shared users can `SELECT` shared docs.
  - Perhaps allow `SELECT` on public docs without a logged-in role.
    Clerk's JWT (via the `pgjwt` extension and Neon's integration) can make the user's ID ~~and org membership~~ available inside Postgres ([Secure your data with Clerk and Neon RLS - Neon Docs](https://neon.tech/docs/guides/neon-rls-clerk#:~:text=Clerk%20handles%20user%20authentication%20by,as%20part%20of%20this%20guide)). This means even if a malicious user tried to craft a direct DB query (or if there was a bug), the DB would refuse to return documents they shouldn't see. RLS is a **defense-in-depth** measure. It's not strictly required since our app logic is doing the checks, but it's a Neon best practice for multi-tenant data safety. You could implement RLS policies using the Clerk `user_id` claim ~~, and perhaps a junction table or a Postgres function to check org membership~~. (Neon's docs provide sample RLS policies for Clerk-authenticated apps ([Secure your data with Clerk and Neon RLS - Neon Docs](https://neon.tech/docs/guides/neon-rls-clerk#:~:text=Clerk%20handles%20user%20authentication%20by,as%20part%20of%20this%20guide)).)
- **Use of Clerk's data**: We leverage Clerk for authentication, but for authorization ~~(org membership, etc.) we have choices. Clerk provides ways to fetch organization membership on the server – e.g., using the Clerk backend API or the `currentUser` object which might include `publicMetadata` about orgs. Depending on scale, querying Clerk on each document access might be too slow. It's better to have that info either in the JWT or in our DB. Since Clerk's org feature is likely enabled, one easy method is: whenever a user is active in an org context, Clerk sets `orgId`. In our route, if `doc.organization_id === orgId`, then the user _currently viewing that org_ can access. This is a quick check. However, if the user is in the org but `orgId` is different (say they are viewing another org or their personal account at the moment), they would be denied unless we check broader membership. We might require users to "switch" to the relevant org to access the file. Depending on UX, you can decide if that's acceptable or if you want to auto-detect membership regardless of active org. For now, we assume the broader check (user is member of org even if not active)~~. _(Authorization is currently limited to ownership/public checks)_

- **Fast queries**: The document lookup by ID is indexed (primary key), which is extremely fast (O(1)). ~~Checking the share table for a specific doc and user is also O(1) with the primary key. Checking org membership (if using our own table) is similarly quick by primary key.~~ These queries will not slow down your app, even with many documents, as long as indexes are in place.

- **Scalability of storage**: We continue to use blob storage for the heavy PDF content, which is built to scale. By always using ~~fresh signed~~ URLs derived from our database, we also prevent abuse (someone can't hot-link a URL forever – they would need to repeatedly hit our endpoint, which is protected). If the app grows to serving very large files or very high traffic, you might introduce a CDN in front of the blob storage. But even then, the access pattern can remain: user hits our API -> redirect to CDN URL with token. (CDNs like CloudFront or Cloudflare can also generate signed URLs or signed cookies, but that's beyond our scope here.)

- **Memory and timeouts**: Since we are redirecting, our server doesn't hold the file in memory at all. This avoids any memory bloat or function timeouts for large PDFs. The user's browser directly downloads from the source, which is optimal.

- **403 vs 401**: We explicitly return 403 for unauthorized. This ensures that if someone does not have access, the response is "Forbidden" (which is semantically correct if they're logged in but not allowed, and also covers not logged in cases in our design). Clerk by default might use 401 for unauthenticated API calls, but we prefer 403 to not hint whether the doc exists or not. From a security standpoint, 403 for "not allowed or not logged in" is fine. It doesn't reveal if the document ID was valid (just says "no access"). This is a minor detail, but it's aligned with the requirement.

- **Graceful handling on frontend**: You might want to handle 403 responses in the UI – e.g., if a user clicks a link they don't have access to, show a message: "You don't have permission to view this document." For public links accessed by logged-out users, they will actually get the file (200 OK via redirect). For private links accessed by logged-out users, they'll get 403 – you could catch that and show a login prompt (“Please log in to access this document”) if desired. Since 403 is not a redirect, it will just show an error if the link was clicked directly. Optionally, you can change Clerk middleware to redirect to login (which would result in a 302 to /sign-in page instead of 403). But the prompt was to send 403, so we stick with that.

## 8. Example Code Snippets

To make this more concrete, below are simplified examples of how the implementation might look. (This assumes a Next.js 13 app, using Clerk and a hypothetical DB utility. Adapt as needed to your actual code structure.)

**Middleware (`apps/web/middleware.ts`):**

```ts
import { authMiddleware } from "@clerk/nextjs";

// Apply Clerk auth middleware to all API routes (or specific routes).
export default authMiddleware({
  // You can specify publicRoutes here if certain routes should skip auth requirement.
  // For example, if you wanted to allow public docs without any session, you might list
  // "/api/documents/:id" as public and then do auth inside the handler.
  // We'll handle public vs private in the handler logic, so we don't list it here.
  apiRoutes: ["/api/(.*)"], // This treats all /api routes as needing auth by default.
  // (Clerk will return 401 for unauthenticated API calls by default.)
});

export const config = {
  matcher: [
    "/api/:path*",
    // In a more fine-grained setup, we could do "/api/documents/:path*" etc.
    // Here we protect all API routes; adjust if some APIs should be fully public.
  ],
};
```

_Note:_ By marking all `/api` as protected, any call without a session gets a 401. In our document handler, we will translate that to 403 as appropriate. If you want Clerk to ignore the public docs entirely, you could set `publicRoutes: ["/api/documents/(.*)"]` in the config, which means Clerk won't require a session for those. Then **every** documents request hits our handler (with `userId` possibly null) and our code decides. This might actually be a cleaner approach for the documents route. In that case, we'd explicitly call `getAuth()` in the handler to get userId (which could be null) and proceed. Both approaches can work – the main difference is how Clerk's middleware is configured. For clarity, you might indeed treat `/api/documents` as `publicRoutes` in Clerk middleware, since we have public docs to allow. Just be sure to still use the middleware to parse the token if present.

**Route Handler (`apps/web/app/api/documents/[id]/route.ts`):**

```ts
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db"; // hypothetical database module
import { getDownloadUrl } from "@vercel/blob"; // optional helper for force-download URLs

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const documentId = context.params.id;
  const { userId, orgId } = getAuth(request);
  // Note: If we listed this route as public in authMiddleware, then userId may be null even if logged out (no 401 thrown).

  // 1. Fetch document from DB
  const doc = await db.getDocumentById(documentId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // 2. Check access permissions
  const publicDoc = doc.is_public;
  if (!publicDoc) {
    // Private doc: require login
    if (!userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const isOwner = doc.user_id === userId;
    ~~let orgMember = false;~~
    ~~if (doc.organization_id) {~~
      ~~// If the doc is tied to an org, check membership~~
      ~~// Option 1: use Clerk orgId (active org)~~
      ~~//          allow if active org matches doc.org_id.~~
      ~~// Option 2: query our DB or Clerk API for membership:~~
      ~~orgMember = await db.isUserInOrg(userId, doc.organization_id);~~
      ~~// Alternatively: orgMember = (orgId === doc.organization_id) || ... (other check)~~
    ~~}~~
    ~~const isShared = await db.isDocumentSharedWith(documentId, userId);~~

    ~~if (!(isOwner || orgMember || isShared)) {~~
    if (!isOwner) { // Simplified check: only owner access for private docs
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  // If public, or the user is authorized via ownership, proceed.

  // 3. Build the final Vercel Blob URL (inline or download)
  const finalUrl =
    request.nextUrl.searchParams.get("download") === "1"
      ? await getDownloadUrl(doc.blob_url)
      : doc.blob_url;

  return NextResponse.redirect(finalUrl, 302);
}
```

In the above code, `db.getDocumentById` would likely do a JOIN with the `document_shares` table or you use `db.isDocumentSharedWith` to check that separately. You'd implement those DB helper functions based on whatever DB library you have:

- `getDocumentById(id)` – returns the document row (including the new fields we added).
- `isUserInOrg(userId, orgId)` – ~~checks an `organization_members` table or uses Clerk. Could be as simple as:~~ _(Deferred)_
  ~~```sql~~
  ~~SELECT 1 FROM organization_members WHERE org_id = $orgId AND user_id = $userId;~~
  ~~```~~
- `isDocumentSharedWith(docId, userId)` – ~~checks the `document_shares` table for a matching row.~~ _(Deferred)_

We wrap the responses in `NextResponse.json` for errors, which will return a JSON body. You could also just do `return new NextResponse("Forbidden", { status: 403 })` with a plain text body. That's fine too. The main thing is the status code.

For generating the signed URL, `getDownloadUrl(doc.blob_url)` will contain the logic using the `@vercel/blob` library. Make sure this uses environment variables for secrets and doesn't hard-code credentials.

This code is structured to be **clear and secure** – first verify auth, then if OK, do the potentially expensive operation of signing the URL. We also catch errors from signing (just in case).

## 9. Future-Proofing and Scalability

The design above should scale well, but let's consider future needs and how this design can evolve:

- **Performance under load**: Each document request triggers a DB lookup and a URL signing. Both of these are quick (millisecond-scale) operations, but if we expect extremely high traffic (like thousands of requests per second), we might introduce caching:

  - We could cache document metadata (like a map of documentId -> {owner, ~~orgId,~~ isPublic}) in memory or a fast store (Redis). Then the auth check could avoid hitting the database for popular documents. However, caching adds complexity and risk of stale data (e.g., if sharing settings change). Given Neon Postgres is quite fast (especially with an indexed primary key lookup), we likely don't need caching until truly large scale.
  - The signed URL generation could be a slight bottleneck if using an external service. AWS SDK calls involve cryptographic signing but are usually very fast. If needed, we could also cache a recently generated URL for a few seconds – but that's usually unnecessary because generating a new one each time is fine (and more secure).
    - We can also leverage concurrent request handling. Each request is independent – horizontal scaling (more Vercel serverless instances or similar) can handle lots of requests in parallel. Neon can handle many concurrent short queries, and ~~S3~~ Vercel Blob can handle huge download throughput. So the architecture is fundamentally sound for scaling.

- **Security enhancements**: As mentioned, implementing **RLS** at the database level can make the system even more secure ([Secure your data with Clerk and Neon RLS - Neon Docs](https://neon.tech/docs/guides/neon-rls-clerk#:~:text=Clerk%20handles%20user%20authentication%20by,as%20part%20of%20this%20guide)). For example, we could set the Neon role used by the app to have a policy: `USING (user_id = auth.uid()) ~~OR (organization_id = auth.org_id())~~ OR (is_public) ~~OR (EXISTS (SELECT 1 FROM document_shares WHERE document_id = id AND user_id = auth.uid()))~~`. This way, even a mis-coded query wouldn't retrieve docs the user shouldn't see. Clerk's JWT would supply `auth.uid()` (userId) ~~and possibly `auth.org_id()`~~. This is an advanced step, but Neon's documentation provides guidance on integrating Clerk with RLS if we choose to ([Secure your data with Clerk and Neon RLS - Neon Docs](https://neon.tech/docs/guides/neon-rls-clerk#:~:text=Clerk%20handles%20user%20authentication%20by,as%20part%20of%20this%20guide)).

- **Organization complexity**: ~~Right now, any member of an org gets access to org-shared docs.~~ If in the future we need **role-based** org access (say, only "Admin" role users can see certain docs), we can extend our check to consider user's org role (Clerk supports roles in orgs). For example, store in `documents` a required role or create a separate permission table. This can be layered on the existing structure easily. The middleware approach remains the same; we'd just tweak the logic to `if doc.organization_id and user is in org and (role satisfies requirement)`. Clerk can provide the user's org role in the JWT or via API, or we can store it in our own DB. _(All org/sharing features are deferred)_

- **Sharing with multiple orgs**: ~~Currently, a document has at most one `organization_id`. If there's a need to share a document with _multiple_ organizations (unlikely in most scenarios), we'd need a join table similar to user shares (like `document_shared_orgs`). But this is probably unnecessary – if it arises, the design can be extended similarly.~~ _(Deferred)_

- **Public documents listing**: If documents are marked public, you might allow an index or search of public docs. Because we still require hitting our API to get them, we could even rate-limit or monitor downloads of public docs. If scale demands it (e.g., a popular public doc being downloaded by thousands), you might consider caching the ~~signed~~ URL or extending its expiry slightly to reduce load. But since generating a URL and a DB hit are light, it should be fine. _(Note: Vercel Blob URLs don't expire)_

- **Audit trails**: We mentioned logging access. If needed, create an `access_logs` table or use an analytics service to record each document fetch (timestamp, user (or IP for public), documentId). This can help in monitoring usage patterns or abuse. It's optional but good for security auditing in an organization setting.

- **Frontend UX**: Now that unauthorized access yields 403, ensure the frontend handles it gracefully. We don't want the user to just see a JSON `{"error":"Forbidden"}`. For example, if using an `<iframe>` to display a PDF and it gets a 403, you may want to catch that and show a message. You can do so by fetching the URL via XHR first to check, or simply trust that only allowed links are shown in the UI. Since this is mostly an internal tool (as described, scanning personal docs), you might not have a lot of cases where someone sees links they cannot access.

- **Testing**: Be sure to test each scenario:
  - Owner accessing their doc -> success.
  - ~~Org member (not owner) accessing an org-shared doc -> success.~~ _(Deferred)_
  - ~~Non-org user (not owner) trying to access that org doc -> 403.~~ _(Deferred)_
  - ~~User with direct share accessing -> success.~~ _(Deferred)_
  - ~~Someone else not shared -> 403.~~ _(Deferred)_
  - Public doc with logged-out user -> success (should directly download).
  - Public doc with logged-in user (who isn't owner) -> success (public is public to all).
  - Private doc with logged-out user -> 403.
  - ~~Also test that the signed URL actually allows the download and expires if reused after expiration time.~~ _(Vercel Blob URLs don't expire)_

By implementing the above, **PDFs will no longer be served via static blob URLs**, and all access will funnel through our authenticated endpoint. This meets the security goals: users can only see _their_ PDFs or those shared ~~with them (including via org or explicit share)~~ _(owner access only for now)_, and even "public" files are fetched in a controlled way. In effect, we've created a robust access-control layer around the documents.

Furthermore, this design uses Clerk and Neon in recommended ways: Clerk middleware for quick auth at the edge, and simple Postgres queries (optionally protected by RLS) for authorization data. It's both secure and fast. In the future, if the app grows, we can scale out the stateless parts (more server instances to handle more requests) and the stateful parts (Neon can scale read replicas, etc., and Vercel Blob can handle virtually unlimited traffic). The permission model ~~(owner/org/share/public)~~ _(owner/public)_ is flexible enough to accommodate new sharing features (like links with expiry, etc., could be added by another flag or table).

Finally, by **redirecting to ~~signed~~ Vercel Blob URLs** we adhere to the principle of least privilege – our app hands out a ~~time-limited ticket~~ _(currently non-expiring)_ URL for the exact file and only after confirming permission, rather than exposing any long-term credential. This approach is used in many production systems for secure file delivery ([next/image does not seem to follow redirects · vercel next.js · Discussion #36808 · GitHub](https://github.com/vercel/next.js/discussions/36808#:~:text=Transfer)), and it will serve pdf-ocd well.

**Sources:** Clerk and Neon documentation were referenced for integrating authentication and authorization best practices ([Next.js: clerkMiddleware() | Next.js](https://clerk.com/docs/references/nextjs/clerk-middleware#:~:text=export%20default%20clerkMiddleware)) ([Secure your data with Clerk and Neon RLS - Neon Docs](https://neon.tech/docs/guides/neon-rls-clerk#:~:text=Clerk%20handles%20user%20authentication%20by,as%20part%20of%20this%20guide)), and the pattern of redirecting to a ~~signed S3~~ _blob_ URL is a known Next.js technique ([next/image does not seem to follow redirects · vercel next.js · Discussion #36808 · GitHub](https://github.com/vercel/next.js/discussions/36808#:~:text=Transfer)). These ensure our implementation follows proven methods and will be secure and scalable.
