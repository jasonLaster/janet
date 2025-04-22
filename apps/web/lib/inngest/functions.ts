import { enhancePdfMetadata, ocrPdf } from "@/lib/server/pdf";
import { inngest } from "./client";
import { getPdfById } from "@/lib/db";
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  }
);

// fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metadata`, {
//     method: "POST",
//     body: JSON.stringify({ pdfId: pdfRecord.id }),
//   });

//   fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ocr`, {
//     method: "POST",
//     body: JSON.stringify({ pdfId: pdfRecord.id }),
//   });

export const enrichDocument = inngest.createFunction(
  { id: "enrich-document" },
  { event: "pdf/enrich-document" },
  async ({ event, step }) => {
    const { pdfId } = event.data;

    const pdf = await getPdfById(pdfId);

    if (!pdf) {
      throw new Error("PDF not found");
    }

    const [metadata, ocr] = await Promise.all([
      step.run("enhance-metadata", async () => {
        const metadata = await enhancePdfMetadata(pdf.blob_url, +pdf.id);
        return metadata;
      }),
      step.run("ocr", async () => {
        const ocr = await ocrPdf(pdf.id);
        return ocr;
      }),
    ]);

    return { metadata, ocr };
  }
);
