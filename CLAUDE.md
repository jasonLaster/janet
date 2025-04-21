# PDF Viewer - Commands and Guidelines

## Commands
- **Build**: `pnpm build` or `pnpm --filter web build`
- **Dev**: `pnpm dev:web` or `pnpm --filter web dev`
- **Lint**: `pnpm --filter web lint`
- **Test (All)**: `pnpm test` or `pnpm --filter web test`
- **Test (Watch)**: `pnpm test:watch` or `pnpm --filter web test:watch`
- **Test (E2E)**: `pnpm test:e2e` or `pnpm --filter web test:e2e`
- **Test (Single)**: `pnpm test path/to/test.test.ts` or `vitest run path/to/test.test.ts`

## Code Style
- **Runtime**: Use Bun instead of tsx for running TypeScript files
- **Imports**: Sort imports, group by external then internal
- **Formatting**: Follow Next.js/TypeScript conventions
- **Types**: Strict TypeScript with explicit return types
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Error Handling**: Use try/catch with specific error types
- **Testing**: Use Vitest for unit tests, Playwright for E2E tests
- **State Management**: Use Jotai for state
- **UI Components**: Use Radix UI with Tailwind for styling

## Cursor Rules
- Use GPT-4o for all OpenAI calls
- Use Vitest for testing
- Use Bun instead of tsx