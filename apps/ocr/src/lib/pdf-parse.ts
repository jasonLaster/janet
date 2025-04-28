// load-pdf.ts
import fs from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Function to extract text
export async function parsePDFContents(pdfPath: string): Promise<any[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data }).promise;

  const items: any[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    items.push(...content.items);
  }

  return items;
}

export async function parsePDFText(pdfPath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data }).promise;

  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    text += pageText + "\n";
  }

  return text;
}
