import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['koreanstudy.me', 'www.koreanstudy.me', 'joyhan-foq2p.ondigitalocean.app'],
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
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
          'canvas': ['konva', 'react-konva'],
          // UI 图标库
          'ui': ['lucide-react'],
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
