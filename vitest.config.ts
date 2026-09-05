import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The `obsidian` package only ships type definitions (empty `main`),
      // so stub it for tests.
      obsidian: fileURLToPath(
        new URL('./src/__tests__/obsidian-stub.ts', import.meta.url)
      ),
    },
  },
  test: {
    // Test files live in src/__tests__ and use the `*-tests.ts` naming
    include: ['src/__tests__/**/*-tests.ts'],
    environment: 'jsdom',
    clearMocks: true,
    coverage: {
      enabled: true,
      provider: 'v8',
    },
  },
})
