import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Keeps every test out of the real ~/.ipb. See test/setup/isolate-home.ts.
    setupFiles: ['test/setup/isolate-home.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', 'bin/', '**/*.d.ts', '**/*.config.*', '**/__mocks__/**'],
    },
  },
});
