import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true,
    port: 5174,
    watch: {
      usePolling: true,
    },
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir:        'dist',
    sourcemap:     false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          charts:   ['recharts'],
          ui:       ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
          query:    ['@tanstack/react-query', 'axios', 'zustand'],
        },
      },
    },
  },
});
