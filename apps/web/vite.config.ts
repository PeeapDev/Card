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
    allowedHosts: true,
    proxy: {
      '/_school-proxy': {
        target: 'https://gov.school.edu.sl',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/_school-proxy/, '/api/peeap'),
      },
      '/monime-api': {
        target: 'https://api.monime.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/monime-api/, ''),
        secure: false,
      },
      '/api': {
        target: 'https://api.peeap.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/router/, '').replace(/^\/api/, ''),
        secure: false,
      },
    },
  },
});
