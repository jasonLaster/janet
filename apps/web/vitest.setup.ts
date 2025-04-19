import { expect, afterEach } from "vitest";
import { vi } from "vitest";

// Make vi available globally
// @ts-ignore - Adding vi to global scope for tests
(globalThis as any).vi = vi;

// Setup environment variables for testing
process.env = {
  ...process.env,
  ANTHROPIC_API_KEY: "test-api-key",
};

// Reset all mocks automatically after each test
afterEach(() => {
  vi.resetAllMocks();
});
