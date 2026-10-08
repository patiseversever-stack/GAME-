import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// Primary multi-file build: dist/web (relative paths, hashed assets, fully offline).
// host-demo.html (bridge test host) is built next to index.html.

/** Preload hints for boot-critical runtime data that exists in public/ at build time. */
function preloadHints(): Plugin {
  return {
    name: 'kanat-preload-hints',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!html.includes('<!--kanat:preload-->')) return html;
        const links: string[] = [];
        if (ctx.bundle !== undefined || ctx.server === undefined) {
          const first = 'worlds/kapadokya/world.json';
          if (existsSync(`public/${first}`)) links.push(`<link rel="preload" href="./${first}" as="fetch" type="application/json" crossorigin />`);
        }
        return html.replace('<!--kanat:preload-->', links.join('\n    '));
      },
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: 'public',
  define: { __KANAT_SINGLE__: 'false' },
  plugins: [preloadHints()],
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
