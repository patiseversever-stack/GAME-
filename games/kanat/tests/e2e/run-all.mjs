// E2E entry (`npm run test:e2e`). Assumes `npm run build` already produced dist/web and dist/single.
// Starts `vite preview` (dist/web) on a free localhost port, runs every tests/e2e/*.e2e.mjs in its own
// node process (Chromium + SwiftShader via playwright-core), prints a summary, exits non-zero on failure.
//
//   node tests/e2e/run-all.mjs                 # all specs
//   node tests/e2e/run-all.mjs bridge offline  # subset (name prefix match)
//   BASE_URL=http://127.0.0.1:5185 GAME_PAGE=dev/platform.html node tests/e2e/run-all.mjs   # existing server

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromePath } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const filters = process.argv.slice(2);
const SPEC_TIMEOUT_MS = Number(process.env.E2E_SPEC_TIMEOUT_MS ?? 300_000);

function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

async function waitHttp(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

function runSpec(file, env) {
  return new Promise((res) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [file], { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'inherit', 'inherit'] });
    const timer = setTimeout(() => {
      console.log(`!! ${file} timed out after ${SPEC_TIMEOUT_MS} ms`);
      child.kill('SIGKILL');
    }, SPEC_TIMEOUT_MS);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      res({ file, code: code ?? (signal ? 1 : 0), ms: Date.now() - t0 });
    });
  });
}

async function main() {
  let specs = readdirSync(here)
    .filter((f) => f.endsWith('.e2e.mjs'))
    .sort();
  if (filters.length) specs = specs.filter((f) => filters.some((p) => f.startsWith(p)));
  if (specs.length === 0) {
    console.error('no e2e specs matched');
    process.exit(1);
  }

  const env = {
    CHROME_PATH: chromePath(),
    SINGLE_HTML: process.env.SINGLE_HTML ?? join(root, 'dist/single/kanat.html'),
    GAME_PAGE: process.env.GAME_PAGE ?? 'index.html',
  };

  let server = null;
  if (process.env.BASE_URL) {
    env.BASE_URL = process.env.BASE_URL;
  } else {
    if (!existsSync(join(root, 'dist/web/index.html'))) {
      console.error('dist/web/index.html missing — run `npm run build` first');
      process.exit(1);
    }
    const port = await freePort();
    env.BASE_URL = `http://127.0.0.1:${port}`;
    server = spawn(
      process.execPath,
      [join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--config', 'vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let serverLog = '';
    server.stdout.on('data', (d) => (serverLog += d));
    server.stderr.on('data', (d) => (serverLog += d));
    if (!(await waitHttp(`${env.BASE_URL}/index.html`, 30_000))) {
      console.error(`vite preview did not come up on ${env.BASE_URL}\n${serverLog}`);
      server.kill('SIGKILL');
      process.exit(1);
    }
  }
  console.log(`e2e: ${specs.length} spec(s) against ${env.BASE_URL} (page ${env.GAME_PAGE}), chrome ${env.CHROME_PATH}`);

  const results = [];
  for (const s of specs) results.push(await runSpec(join(here, s), env));
  if (server) server.kill('SIGTERM');

  console.log('\n=== e2e summary ===');
  for (const r of results) console.log(`${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.file.replace(root + '/', '')}  (${(r.ms / 1000).toFixed(1)} s)`);
  const failed = results.filter((r) => r.code !== 0).length;
  console.log(`${results.length - failed}/${results.length} spec files passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
