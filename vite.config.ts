/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/mentor': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/notifications': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Zero Base',
        short_name: 'ZeroBase',
        description: 'Seu sistema inteligente de estudos para ENEM e concursos',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('recharts')) {
            return 'vendor-recharts';
          }

          if (id.includes('d3-')) {
            return 'vendor-d3';
          }

          if (id.includes('jspdf')) {
            return 'vendor-jspdf';
          }

          if (id.includes('html2canvas')) {
            return 'vendor-html2canvas';
          }

          if (id.includes('@supabase/supabase-js')) {
            return 'vendor-supabase';
          }

          if (id.includes('zod') || id.includes('@hookform') || id.includes('react-hook-form')) {
            return 'vendor-forms';
          }

          return;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
