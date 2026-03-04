import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        viewer: resolve(__dirname, 'viewer.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        previewGenerator: resolve(__dirname, 'preview-generator.html'),
        activate: resolve(__dirname, 'activate.html')
      }
    },
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 2
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for debugging
    sourcemap: false
  },
  server: {
    port: 3000,
    open: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['three']
  }
});
