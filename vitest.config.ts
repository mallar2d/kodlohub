import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./lib/brat-td/__tests__/setup.ts'],
    include: ['lib/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
  },
});
