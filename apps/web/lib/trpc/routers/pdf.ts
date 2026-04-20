import { z } from "zod";
import { protectedProcedure, router } from "../init";
import { getPdfById } from "@/lib/db"; // Assuming this exists and is correctly typed
import { auth } from "@clerk/nextjs/server";
import { MeiliSearch } from "meilisearch";
import { sendChatWithPDF } from "@/lib/ai";
import { deletePdf } from "@/lib/db";
import { del } from "@vercel/blob";

export const pdfRouter = router({
  // Placeholder for upload - We'll implement the presigned URL flow later
  getUploadUrl: protectedProcedure
    .input(
      z.object({ filename: z.string(), type: z.string(), size: z.number() })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement Vercel Blob presigned URL generation
      console.log("Generate presigned URL for:", input, ctx);
      return { url: "", key: "" }; // Placeholder
    }),

  // Placeholder for registering the upload after direct blob upload
  registerUpload: protectedProcedure
    .input(
      z.object({
        key: z.string(), // Key/path from blob storage
        filename: z.string(),
        size_bytes: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement DB insertion and Inngest trigger
      console.log("Registering upload:", input, ctx);
      // const pdfRecord = await insertPdf({...});
      // await inngest.send({...});
      return { success: true, id: 0 }; // Placeholder
    }),

  metadata: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const pdf = await getPdfById(input.id);
      if (!pdf) {
        throw new Error("PDF not found");
      }
      return {
        metadata: pdf.metadata || null,
        failed: pdf.metadata_failed || false,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      // Get the PDF to find its blob URL
      const pdf = await getPdfById(id);

      if (!pdf) {
        throw new Error("PDF not found");
      }

      // Ensure blob_url exists before proceeding
      if (!pdf.blob_url) {
        console.error(
          "PDF record found but blob_url is missing, proceeding with DB deletion only.",
          { pdfId: id }
        );
        // Skipping blob deletion for now, but deleting the DB record
      } else {
        // Delete from Vercel Blob only if blob_url exists
        try {
          await del(pdf.blob_url, {
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          if (pdf.original_blob_url && pdf.original_blob_url !== pdf.blob_url) {
            await del(pdf.original_blob_url, {
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
          }
        } catch (blobError) {
          console.error("Error deleting blob:", blobError);
          // Continue even if blob deletion fails
        }
      }

      // Delete from database (moved after blob deletion attempt)
      await deletePdf(id);
      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { query } = input;
      const { userId, orgId } = ctx;

      if (!query) {
        throw new Error("No search query provided");
      }

      const client = new MeiliSearch({
        host: process.env.MEILISEARCH_HOST || "",
        apiKey: process.env.MEILISEARCH_API_KEY || "",
      });

      const filters: string[] = [];
      if (userId) {
        filters.push(`userId = ${userId}`);
      }
      if (orgId) {
        filters.push(`organizationId = ${orgId}`);
      }

      const index = client.index("pdfs");
      const { hits } = await index.search(query, {
        limit: 10,
        filter: [], // TODO: add filters if needed
        attributesToRetrieve: ["id", "title"],
      });

      return { results: hits };
    }),

  chat: protectedProcedure
    .input(z.object({ messages: z.array(z.any()), pdfId: z.number() }))
    .mutation(async ({ input }) => {
      const { messages, pdfId } = input;
      const text = await sendChatWithPDF({
        messages,
        pdfId,
        systemPrompt:
          "You are an AI assistant that analyzes PDF documents and answer's the user's question. Keep your answers concise and to the point. Ideally no more than a sentence or two.",
      });
      return { text };
    }),
});
