import { defineConfig } from 'vitest/config';
import path from 'path';

import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: [path.resolve(__dirname, 'convex/**/*.{test,spec}.{ts,tsx}')],
    exclude: [path.resolve(__dirname, 'convex/**/*.e2e.{test,spec}.{ts,tsx}')],
    setupFiles: [path.resolve(__dirname, 'tests/setup.ts')],
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
