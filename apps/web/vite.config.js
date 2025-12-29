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
        allowedHosts: true, // Allow ngrok and other external hosts
        proxy: {
            '/monime-api': {
                target: 'https://api.monime.io',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/monime-api/, ''); },
                secure: true,
            },
            // Proxy /api/* to the actual API server
            '/api': {
                target: 'https://api.peeap.com',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api\/router/, '').replace(/^\/api/, ''); },
                secure: true,
            },
        },
    },
});
