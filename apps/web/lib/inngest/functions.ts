import { enhancePdfMetadata, ocrPdf } from "@/lib/server/pdf";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  }
);

export const enrichDocument = inngest.createFunction(
  { id: "enrich-document" },
  {
    event: "pdf/enrich-document",
    concurrency: {
      limit: 4,
    },
  },
  async ({ event, step }) => {
    const { pdf } = event.data;

    if (!pdf) {
      throw new Error("PDF not found");
    }

    const [metadata, ocr] = await Promise.all([
      step.run("enhance-metadata", async () => {
        const metadata = await enhancePdfMetadata(+pdf.id);
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
