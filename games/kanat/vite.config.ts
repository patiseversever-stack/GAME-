import { defineConfig } from 'vite';

// Primary multi-file build: dist/web (relative paths, hashed assets, fully offline).
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 4096,
    rolldownOptions: {
      input: {
        index: 'index.html',
        'host-demo': 'host-demo.html',
      },
    },
  },
  server: { host: true, port: 5173 },
  preview: { port: 4173 },
});
