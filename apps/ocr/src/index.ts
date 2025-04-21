import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { processPdf } from "./controllers/ocr-controller.js";
import { debug } from "./lib/ocr-utils.js";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Create Express app
const app = express();
const port = process.env.PORT || 8080;

// Configure middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// OCR processing endpoint
app.post("/api/ocr", async (req: Request, res: Response) => {
  const { pdfId } = req.body;

  if (!pdfId) {
    return res.status(400).json({
      success: false,
      error: "No PDF ID provided",
    });
  }

  try {
    debug(`Received OCR request for PDF ID: ${pdfId}`);
    const result = await processPdf(Number(pdfId));

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || "Failed to process PDF",
        message: result.message,
      });
    }

    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    debug(`Error processing OCR request: ${message}`);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message,
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`PDF OCR service listening on port ${port}`);
  console.log(`Health check endpoint: http://localhost:${port}/health`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  debug("SIGINT signal received: closing HTTP server");
  process.exit(0);
});
