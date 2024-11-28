import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Enable TypeScript support
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'node'
  }
}) 