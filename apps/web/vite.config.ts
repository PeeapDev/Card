import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: true,  // Allow ngrok and other external hosts
    proxy: {
      '/monime-api': {
        target: 'https://api.monime.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/monime-api/, ''),
        secure: true,
      },
      '/api/monime': {
        target: 'https://my.peeap.com',
        changeOrigin: true,
        secure: true,
      },
      '/api/settings': {
        target: 'https://my.peeap.com',
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: 'https://my.peeap.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
