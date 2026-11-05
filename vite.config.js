import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
      
    }
  },
  preview: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@xterm')) {
            return 'vendor-xterm';
          }
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'vendor-compliance-pdf';
          }
          if (id.includes('sortablejs')) {
            return 'vendor-sortable';
          }
        }
      }
    }
  }
});
