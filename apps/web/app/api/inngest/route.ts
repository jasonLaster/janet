import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { helloWorld, enrichDocument } from "@/lib/inngest/functions";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [helloWorld, enrichDocument],
});
