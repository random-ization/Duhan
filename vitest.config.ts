import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^@tiptap\/core$/, replacement: path.resolve(__dirname, './node_modules/@tiptap/core/src/index.ts') },
      { find: '@tiptap/core/jsx-runtime', replacement: path.resolve(__dirname, './node_modules/@tiptap/core/src/jsx-runtime.ts') },
      { find: '@tiptap/core/jsx-dev-runtime', replacement: path.resolve(__dirname, './node_modules/@tiptap/core/src/jsx-runtime.ts') },
      { find: /^@tiptap\/react\/menus$/, replacement: path.resolve(__dirname, './node_modules/@tiptap/react/src/menus/index.ts') },
      { find: /^@tiptap\/react$/, replacement: path.resolve(__dirname, './node_modules/@tiptap/react/src/index.ts') },
      {
        find: '@tiptap/extensions',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extensions/src/index.ts'),
      },
      {
        find: /^@tiptap\/extension-(.+)$/,
        replacement: `${path.resolve(__dirname, './node_modules/@tiptap')}/extension-$1/src/index.ts`,
      },
      { find: /^@tiptap\/starter-kit$/, replacement: path.resolve(__dirname, './node_modules/@tiptap/starter-kit/src/index.ts') },
      {
        find: '@tiptap/extension-placeholder',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-placeholder/src/index.ts'),
      },
      { find: '@tiptap/extension-link', replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-link/src/index.ts') },
      {
        find: '@tiptap/extension-text-align',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-text-align/src/index.ts'),
      },
      {
        find: '@tiptap/extension-task-list',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-task-list/src/index.ts'),
      },
      {
        find: '@tiptap/extension-task-item',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-task-item/src/index.ts'),
      },
      {
        find: '@tiptap/extension-highlight',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-highlight/src/index.ts'),
      },
      {
        find: '@tiptap/extension-underline',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-underline/src/index.ts'),
      },
      { find: '@tiptap/extension-table', replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-table/src/index.ts') },
      {
        find: '@tiptap/extension-table-row',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-table-row/src/index.ts'),
      },
      {
        find: '@tiptap/extension-table-cell',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-table-cell/src/index.ts'),
      },
      {
        find: '@tiptap/extension-table-header',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-table-header/src/index.ts'),
      },
      {
        find: '@tiptap/extension-bubble-menu',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-bubble-menu/src/index.ts'),
      },
      {
        find: '@tiptap/extension-floating-menu',
        replacement: path.resolve(__dirname, './node_modules/@tiptap/extension-floating-menu/src/index.ts'),
      },
      { find: '@tiptap/suggestion', replacement: path.resolve(__dirname, './node_modules/@tiptap/suggestion/src/index.ts') },
      {
        find: /^@tiptap\/pm\/(.*)$/,
        replacement: `${path.resolve(__dirname, './node_modules/@tiptap/pm')}/$1/index.ts`,
      },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['utils/**', 'hooks/**'],
    },
  },
});
