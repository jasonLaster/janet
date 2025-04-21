import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

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
  metadata?: any;
}

dotenv.config({ path: ".env.local" });

// Create a SQL client with the pooled connection
export const sql = neon(process.env.DATABASE_URL!);

// Helper function to get a PDF by ID
export async function getPdfById(id: number): Promise<PDF | null> {
  try {
    const result = await sql`
      SELECT * FROM pdfs 
      WHERE id = ${id}
    `;
    return result[0] as PDF | null;
  } catch (error) {
    console.error(`Error getting PDF by ID ${id}:`, error);
    throw error;
  }
}

// Helper function to update PDF record with searchable PDF URL
export async function updatePdfWithSearchableUrl(
  id: number,
  searchableBlobUrl: string
): Promise<void> {
  try {
    await sql`
      UPDATE pdfs 
      SET blob_url = ${searchableBlobUrl}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error(`Error updating PDF record ${id}:`, error);
    throw error;
  }
}
