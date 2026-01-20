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
        manualChunks: {
          // Vendor chunks - split large libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Canvas 画板功能 - 懒加载，不阻塞首页
          canvas: ['konva', 'react-konva'],
          // UI 图标库
          ui: ['lucide-react'],
          // Excel 处理
          'vendor-xlsx': ['xlsx'],
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
