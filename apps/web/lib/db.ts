import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

// Define PDF interface for type safety
export interface PDF {
  id: number;
  filename: string;
  blob_url: string;
  size_bytes: number;
  user_id: string;
  organization_id?: string | null;
  title?: string;
  description?: string;
  page_count?: number;
  uploaded_at: string;
  metadata?: any; // Add metadata field to PDF interface
}

// Create a SQL client with the pooled connection
export const sql = neon(process.env.DATABASE_URL!);

// Helper function to get a PDF by ID, checking ownership and organization context
export async function getPdfById(id: number): Promise<PDF | null> {
  const { userId, orgId } = await auth();

  console.log(
    `Executing database query for PDF ID: ${id}, User ID: ${userId}, Org ID: ${orgId}`
  );

  if (!userId) {
    throw new Error("Unauthorized");
  }

  let query;
  if (orgId) {
    // If orgId is provided, check user and organization
    query = sql`
      SELECT * FROM pdfs 
      WHERE id = ${id} AND user_id = ${userId} AND organization_id = ${orgId}
    `;
  } else {
    // If orgId is null, check user and that organization_id IS NULL (personal workspace)
    query = sql`
      SELECT * FROM pdfs 
      WHERE id = ${id} AND user_id = ${userId} AND organization_id IS NULL
    `;
  }

  const result = await query;
  console.log(
    `Query result for PDF ID ${id}, user ${userId}, Org ID: ${orgId}: ${result.length} row(s)`
  );
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
    // If organizationId is provided, filter by it
    query = sql`
      SELECT * FROM pdfs 
      WHERE user_id = ${userId} AND organization_id = ${organizationId}
      ORDER BY uploaded_at DESC
    `;
  } else {
    // If organizationId is null or undefined, filter for personal PDFs (organization_id is NULL)
    query = sql`
      SELECT * FROM pdfs 
      WHERE user_id = ${userId} AND organization_id IS NULL
      ORDER BY uploaded_at DESC
    `;
  }

  const result = await query;
  console.log(
    `Query result for user ${userId}, Org ID: ${organizationId}: ${result.length} rows` // Use result.length for Neon
  );
  return result as PDF[];
}

// Helper function to insert PDF metadata
export async function insertPdf(pdfData: {
  filename: string;
  blob_url: string;
  size_bytes: number;
  user_id: string;
  organization_id?: string | null; // Allow optional orgId
  title?: string;
  description?: string;
  page_count?: number;
}): Promise<{ id: number }> {
  const result = await sql`
    INSERT INTO pdfs (
      filename, 
      blob_url, 
      size_bytes, 
      user_id, 
      organization_id, 
      title, 
      description, 
      page_count
    ) VALUES (
      ${pdfData.filename}, 
      ${pdfData.blob_url}, 
      ${pdfData.size_bytes}, 
      ${pdfData.user_id},
      ${pdfData.organization_id ?? null}, -- Use ?? null to handle undefined
      ${pdfData.title ?? null}, 
      ${pdfData.description ?? null}, 
      ${pdfData.page_count ?? null}
    )
    RETURNING id
  `;
  return result[0] as { id: number };
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
  metadata: any
): Promise<PDF | null> {
  if (!id || !metadata) {
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
