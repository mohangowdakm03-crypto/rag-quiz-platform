import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        teacher: resolve(__dirname, 'teacher.html'),
        create: resolve(__dirname, 'create.html')
      },
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          qrcode: ['qrcode']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
