import { defineConfig } from 'vitest/config';

// The server is ESM with NodeNext, so intra-package imports carry a `.js`
// specifier that maps to the sibling `.ts` source. Vite's resolver handles that
// mapping natively, so no extra alias config is needed here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Domain logic is pure and deterministic — no globals/setup required.
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/services/**', 'src/lib/**', 'src/i18n/**'],
      exclude: ['**/*.test.ts'],
    },
  },
});
