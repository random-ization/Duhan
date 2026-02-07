import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  define: {
    'import.meta.env.VITE_I18N_VERSION': JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || String(Date.now())
    ),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    // 本地开发代理：自动转发 /api 请求到后端服务器
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['koreanstudy.me', 'www.koreanstudy.me', 'joyhan-foq2p.ondigitalocean.app'],
  },
  plugins: [
    react(),
    visualizer({
      filename: 'stats.html',
      open: false, // Set to true to auto-open after build
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          const normalized = id.replaceAll('\\', '/');
          if (!normalized.includes('node_modules')) return undefined;

          // React core
          if (
            normalized.includes('/node_modules/react-dom/') ||
            normalized.includes('/node_modules/react/') ||
            normalized.includes('/node_modules/react-router-dom/') ||
            // react-i18next depends on React context; keep it with React to avoid cyclic chunks.
            normalized.includes('/node_modules/react-i18next/')
          ) {
            return 'vendor-react';
          }

          // Canvas 画板功能
          if (normalized.includes('/node_modules/konva/')) return 'vendor-konva';
          if (normalized.includes('/node_modules/react-konva/')) return 'vendor-react-konva';

          // UI 图标库
          if (normalized.includes('/node_modules/lucide-react/')) return 'ui';

          // Excel 处理 (admin heavy but keep split)
          if (normalized.includes('/node_modules/xlsx/')) return 'vendor-xlsx';

          // Media player / podcast/video
          if (normalized.includes('/node_modules/vidstack/')) return 'vendor-vidstack-core';
          if (normalized.includes('/node_modules/@vidstack/react/player/')) {
            return 'vendor-vidstack-player';
          }
          if (normalized.includes('/node_modules/@vidstack/')) return 'vendor-vidstack-react';

          // Charts
          if (normalized.includes('/node_modules/recharts/')) return 'vendor-recharts';

          // PDF export
          if (normalized.includes('/node_modules/@react-pdf/')) return 'vendor-pdf';

          // Animation
          if (normalized.includes('/node_modules/framer-motion/')) return 'vendor-motion';

          // YouTube embeds
          if (normalized.includes('/node_modules/react-youtube/')) return 'vendor-youtube';

          // Keyboard typing
          if (normalized.includes('/node_modules/react-simple-keyboard/')) return 'vendor-keyboard';

          // Data fetching
          if (normalized.includes('/node_modules/@tanstack/react-query/')) return 'vendor-query';

          // i18n
          if (normalized.includes('/node_modules/i18next/')) return 'vendor-i18n';
          if (normalized.includes('/node_modules/i18next-http-backend/')) return 'vendor-i18n';

          // Toasts
          if (normalized.includes('/node_modules/react-hot-toast/')) return 'vendor-toast';

          return undefined;
        },
      },
    },
    // Reduce chunk size warning threshold
    chunkSizeWarningLimit: 300,
    // Enable source maps for debugging (optional, remove in production for smaller builds)
    sourcemap: false,
    // Minify options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
});
