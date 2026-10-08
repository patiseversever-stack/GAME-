import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { collectPublicFiles, injectPack, SINGLE_HTML_BUDGET } from './tools/gen-single-pack.ts';

// Single-file build: dist/single/kanat.html. Runtime data under public/ is embedded by the
// kanat-pack plugin below (tools/gen-single-pack.ts → src/core/assets.ts reads it at boot).
// Over 25 MB, whole world groups overflow into dist/single/packs/*.js (documented in INTEGRATION.md).
// KANAT_SINGLE_ENTRY / KANAT_SINGLE_OUTDIR override the entry/output (platform dev harness only).

const entry = process.env.KANAT_SINGLE_ENTRY ?? 'kanat.html';
const outDir = process.env.KANAT_SINGLE_OUTDIR ?? 'dist/single';

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== 'packs') out.push(...htmlFiles(full));
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function kanatPack(): Plugin {
  return {
    name: 'kanat-single-pack',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const files = collectPublicFiles('public');
      for (const file of htmlFiles(outDir)) {
        const res = injectPack(readFileSync(file, 'utf8'), files, SINGLE_HTML_BUDGET);
        writeFileSync(file, res.html);
        for (const p of res.packs) {
          const target = join(dirname(file), p.name);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, p.content);
        }
        const r = res.report;
        const mb = (n: number): string => (n / 1e6).toFixed(2);
        console.log(
          `[kanat-pack] ${file}: ${r.files} files (${mb(r.rawBytes)} MB raw) → ${r.inlineFiles} inline, ${r.overflowFiles} in ${res.packs.length} pack(s); html ${mb(r.htmlBytes)} MB (budget ${mb(SINGLE_HTML_BUDGET)} MB)`,
        );
        if (r.htmlBytes > SINGLE_HTML_BUDGET) throw new Error(`[kanat-pack] ${file} is ${mb(r.htmlBytes)} MB > budget`);
        // report next to (not inside) the deliverable folder: dist/single-pack-report.json
        writeFileSync(join(outDir, '..', `${basename(outDir)}-pack-report.json`), JSON.stringify(r, null, 2));
      }
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  define: { __KANAT_SINGLE__: 'true' },
  plugins: [viteSingleFile({ removeViteModuleLoader: true }), kanatPack()],
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000,
    modulePreload: { polyfill: false },
    rolldownOptions: { input: entry, output: { codeSplitting: false } },
  },
});
