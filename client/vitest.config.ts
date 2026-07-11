import { defineConfig } from 'vitest/config';

// The client's unit tests target pure, framework-agnostic logic (engines,
// intent detection, formatting helpers), so they run in a plain Node
// environment — no jsdom needed. Component/DOM tests, if added later, can opt
// into `environment: 'jsdom'` per-file via a `// @vitest-environment` comment.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
