import { neon } from "@neondatabase/serverless";
import { EnhancedPdfMetadata } from "@/lib/prompts/pdf-metadata";

// Define PDF interface for type safety
export interface PDF {
  id: number;
  filename: string;
  blob_url: string;
  original_blob_url: string;
  size_bytes: number;
  user_id?: string;
  organization_id?: string;
  title?: string;
  description?: string;
  page_count?: number;
  uploaded_at: string;
  metadata?: EnhancedPdfMetadata | null; // Use imported type
  text?: string; // Add text field to PDF interface
  is_public?: boolean; // Add is_public field
  metadata_failed: boolean;
  ocr_failed: boolean;
}

// Create a SQL client with the pooled connection
export const sql = neon(process.env.DATABASE_URL!);

// Helper function to get a PDF by ID, checking ownership and organization context
export async function getPdfById(id: number): Promise<PDF | null> {
  const query = sql`
    SELECT 
      id,
      filename,
      blob_url,
      original_blob_url,
      size_bytes,
      user_id,
      organization_id,
      title,
      description,
      page_count,
      uploaded_at,
      metadata,
      is_public,
      metadata_failed,
      ocr_failed
     FROM pdfs 
    WHERE id = ${id}
    `;

  const result = await query;
  console.log(`Query result for PDF ID ${id}: ${result.length} row(s)`);
  return result[0] as PDF | null;
}

// Function to get all PDFs for a user, optionally filtered by organization
export async function getAllPdfs(
  userId: string,
  organizationId?: string | null
): Promise<PDF[]> {
  console.log(
    `Executing database query for PDFs for user ID: ${userId}, Org ID: ${organizationId}`
  );

  let query;
  if (organizationId) {
    console.log("Getting PDFs for organization ID: ", organizationId);
    // If organizationId is provided, filter by it
    query = sql`
      SELECT       
        id,
        filename,
        blob_url,
        original_blob_url,
        size_bytes,
        user_id,
        organization_id,
        title,
        description,
        page_count,
        uploaded_at,
        metadata,
        metadata_failed,
        ocr_failed
      FROM pdfs 
      WHERE organization_id = ${organizationId}
      ORDER BY uploaded_at DESC
    `;
  } else {
    console.log("Getting PDFs for user ID: ", userId);
    // If organizationId is null or undefined, filter for personal PDFs (organization_id is NULL)
    query = sql`
      SELECT 
        id,
        filename,
        blob_url,
        original_blob_url,
        size_bytes,
        user_id,
        organization_id,
        title,
        description,
        page_count,
        uploaded_at,
        metadata,
        metadata_failed,
        ocr_failed
      FROM pdfs 
      WHERE user_id = ${userId} AND organization_id IS NULL
      ORDER BY uploaded_at DESC
    `;
  }

  const result = await query;
  console.log("Number of PDFs: ", result.length);

  return result as PDF[];
}

type InsertPdfResult = {
  id: number;
  filename: string;
  blob_url: string;
  size_bytes: number;
  user_id: string;
  organization_id: string | null;
};
export async function insertPdf(
  pdfData: Omit<PDF, "id" | "uploaded_at" | "metadata_failed" | "ocr_failed">
): Promise<InsertPdfResult> {
  const result = await sql`
    INSERT INTO pdfs (
      filename, 
      blob_url, 
      size_bytes, 
      user_id, 
      organization_id, 
      title, 
      description, 
      page_count,
      original_blob_url
    ) VALUES (
      ${pdfData.filename}, 
      ${pdfData.blob_url}, 
      ${pdfData.size_bytes}, 
      ${pdfData.user_id},
      ${pdfData.organization_id ?? null}, -- Use ?? null to handle undefined
      ${pdfData.title ?? null}, 
      ${pdfData.description ?? null}, 
      ${pdfData.page_count ?? null},
      ${pdfData.original_blob_url}
    )
    RETURNING id, filename, blob_url, size_bytes, user_id, organization_id
  `;
  return result[0] as InsertPdfResult;
}

// Helper function to delete a PDF
export async function deletePdf(id: number): Promise<void> {
  await sql`
    DELETE FROM pdfs WHERE id = ${id}
  `;
}

// Function to update PDF metadata
export async function updatePdfMetadata(
  id: number,
  metadata: Partial<{
    title: string;
    description: string;
    page_count: number;
  }>
): Promise<PDF | null> {
  const fields = Object.keys(metadata);
  if (fields.length === 0) {
    return null; // No updates needed
  }

  const setClauses = fields.map((field, index) => `${field} = $${index + 1}`);
  const values = Object.values(metadata);

  const updateQuery = `UPDATE pdfs SET ${setClauses.join(", ")} WHERE id = $${
    fields.length + 1
  } RETURNING *`;
  values.push(id);

  const result = await sql.query(updateQuery, values);
  // Adjust result handling: Neon's query might return rows directly or within a different structure
  // Assuming it returns an array of rows similar to the tagged template literal
  return result && result.length > 0 ? (result[0] as PDF) : null;
}

// Function to update PDF enhanced metadata
export async function updatePdfEnhancedMetadata(
  id: number,
  metadata?: EnhancedPdfMetadata
): Promise<PDF | null> {
  if (!metadata) {
    await sql`
      UPDATE pdfs SET metadata_failed = true WHERE id = ${id}
    `;
    return null;
  }

  try {
    const result = await sql`
      UPDATE pdfs 
      SET metadata = ${JSON.stringify(metadata)}
      WHERE id = ${id}
      RETURNING *
    `;

    return result && result.length > 0 ? (result[0] as PDF) : null;
  } catch (error) {
    console.error("Error updating PDF metadata:", error);
    return null;
  }
}

// set ocr_failed to true
export async function setOcrFailed(id: number): Promise<void> {
  await sql`
    UPDATE pdfs SET ocr_failed = true WHERE id = ${id}
  `;
}
