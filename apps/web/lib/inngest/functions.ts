import {
  enhancePdfMetadata,
  ocrPdf,
  addPdfToSearchIndex,
} from "@/lib/server/pdf";
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
      step.run("enhance-metadata", async () => enhancePdfMetadata(pdf.id)),
      step.run("ocr", async () => ocrPdf(pdf.id)),
    ]);

    const searchIndex = await step.run("add-to-search-index", async () =>
      addPdfToSearchIndex(pdf.id)
    );

    return { metadata, ocr, searchIndex };
  }
);
