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
        drop_console: true, // Remove console.log in production (keep warn/error)
        pure_funcs: ['console.log'], // Also strip console.log calls
        passes: 2
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for debugging
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['three', 'gsap']
  }
});
