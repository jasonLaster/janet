import { neon } from "@neondatabase/serverless";

// Create a SQL client with the pooled connection
export const sql = neon(process.env.DATABASE_URL!);

// Helper function to get a PDF by ID, checking ownership
export async function getPdfById(id: number, userId: string) {
  try {
    console.log(
      `Executing database query for PDF ID: ${id} and user ID: ${userId}`
    );
    const result = await sql`
      SELECT * FROM pdfs 
      WHERE id = ${id} AND user_id = ${userId}
    `;
    console.log(`Query result for PDF ID ${id} and user ${userId}:`, result);
    return result[0] || null;
  } catch (error) {
    console.error(
      `Database error when fetching PDF ID ${id} for user ${userId}:`,
      error
    );
    throw error;
  }
}

// Helper function to get all PDFs for a specific user
export async function getAllPdfs(userId: string) {
  console.log(`Executing database query for all PDFs for user ID: ${userId}`);
  const result = await sql`
    SELECT * FROM pdfs 
    WHERE user_id = ${userId} 
    ORDER BY uploaded_at DESC
  `;
  // console.log(`Query result for all PDFs for user ${userId}:`, result);
  return result;
}

// Helper function to insert a new PDF
export async function insertPdf(pdf: {
  filename: string;
  blob_url: string;
  size_bytes: number;
  user_id: string;
  title?: string;
  description?: string;
  page_count?: number;
}) {
  const result = await sql`
    INSERT INTO pdfs (
      filename, 
      blob_url, 
      size_bytes, 
      user_id,
      title, 
      description, 
      page_count
    ) VALUES (
      ${pdf.filename}, 
      ${pdf.blob_url}, 
      ${pdf.size_bytes}, 
      ${pdf.user_id},
      ${pdf.title || null}, 
      ${pdf.description || null}, 
      ${pdf.page_count || null}
    ) RETURNING id
  `;
  return result[0];
}

// Helper function to delete a PDF
export async function deletePdf(id: number) {
  await sql`
    DELETE FROM pdfs WHERE id = ${id}
  `;
}

// Helper function to update PDF metadata
export async function updatePdf(
  id: number,
  data: {
    title?: string;
    description?: string;
    page_count?: number;
  }
) {
  const updates = [];
  const values = [];

  if (data.title !== undefined) {
    updates.push(`title = $${updates.length + 1}`);
    values.push(data.title);
  }

  if (data.description !== undefined) {
    updates.push(`description = $${updates.length + 1}`);
    values.push(data.description);
  }

  if (data.page_count !== undefined) {
    updates.push(`page_count = $${updates.length + 1}`);
    values.push(data.page_count);
  }

  if (updates.length === 0) return null;

  const updateQuery = `
    UPDATE pdfs 
    SET ${updates.join(", ")} 
    WHERE id = $${updates.length + 1} 
    RETURNING *
  `;

  values.push(id);

  const result = await sql.query(updateQuery, values);
  return result.rows[0] || null;
}
