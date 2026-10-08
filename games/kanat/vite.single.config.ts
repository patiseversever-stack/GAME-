import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file build: dist/single/kanat.html. Runtime data under public/ is embedded via
// the generated pack module (see tools/gen-single-pack.ts and src/core/assets.ts).
export default defineConfig({
  base: './',
  publicDir: false,
  define: { __KANAT_SINGLE__: 'true' },
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist/single',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000,
    rolldownOptions: { input: 'kanat.html' },
  },
});
