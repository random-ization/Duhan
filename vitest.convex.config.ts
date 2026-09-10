import { defineConfig } from 'vitest/config';
import path from 'path';

import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['convex/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['convex/**/*.e2e.{test,spec}.{ts,tsx}', 'node_modules/**'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    root: path.resolve(__dirname),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Include convex/_generated files in the module graph
  server: {
    fs: {
      allow: ['.', './convex/_generated'],
    },
  },
});
