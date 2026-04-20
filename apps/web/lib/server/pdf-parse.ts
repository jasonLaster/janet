import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Function to extract text
export async function parsePDFContents(data: Uint8Array): Promise<any[]> {
  const pdf = await getDocument({ data }).promise;

  const items: any[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    items.push(...content.items);
  }

  return items;
}

// Function to extract text from PDF contents (Buffer)
export async function parsePDFText(data: Uint8Array): Promise<string> {
  const items = await parsePDFContents(data);
  const text = items.map((item) => ("str" in item ? item.str : "")).join(" ");

  return text.trim();
}
