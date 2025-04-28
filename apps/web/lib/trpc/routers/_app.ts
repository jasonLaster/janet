import { router } from "../init";
import { pdfRouter } from "./pdf";

export const appRouter = router({
  pdf: pdfRouter,
  // Add other routers here as they are created
});

// Export type router type signature, never consumers.
export type AppRouter = typeof appRouter;
