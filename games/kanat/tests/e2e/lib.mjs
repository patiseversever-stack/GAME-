// Shared e2e helpers: Chromium (SwiftShader) launch, offline network policy, console error capture,
// a tiny sequential test runner with CI-style exit codes.
//
// Env (set by run-all.mjs):
//   BASE_URL     http://127.0.0.1:<port>  (vite preview of dist/web)
//   GAME_PAGE    page under test (default index.html; the platform harness uses dev/platform.html)
//   SINGLE_HTML  absolute path of dist/single/kanat.html
//   CHROME_PATH  Chromium executable

import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { contextOptions } from './devices.mjs';

export const BASE_URL = (process.env.BASE_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
export const GAME_PAGE = process.env.GAME_PAGE ?? 'index.html';

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const fixed = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  if (existsSync(fixed)) return fixed;
  const root = '/opt/pw-browsers';
  if (existsSync(root)) {
    for (const d of readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
      const p = `${root}/${d}/chrome-linux/chrome`;
      if (existsSync(p)) return p;
    }
  }
  throw new Error('Chromium not found (set CHROME_PATH)');
}

export const CHROME_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
];

export async function launch() {
  return chromium.launch({ executablePath: chromePath(), args: CHROME_ARGS, headless: true });
}

/** localhost / file / data / blob only. Everything else is blocked and recorded. */
export function isAllowedUrl(url, { allowHttpLocalhost = true } = {}) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'file:' || u.protocol === 'about:') return true;
  if (!allowHttpLocalhost) return false;
  return (u.protocol === 'http:' || u.protocol === 'https:') && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname);
}

/**
 * New context + page with the offline policy and error capture.
 * Returns { context, page, errors, warnings, blocked, requests }.
 */
export async function openPage(browser, { device = 'iphone13', orientation = 'portrait', allowHttpLocalhost = true } = {}) {
  const context = await browser.newContext(contextOptions(device, orientation));
  const blocked = [];
  const requests = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    requests.push(url);
    if (isAllowedUrl(url, { allowHttpLocalhost })) return route.continue();
    blocked.push(url);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  const onConsole = (msg) => {
    const where = msg.location()?.url ?? '';
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()} ${where}`);
    else if (msg.type() === 'warning') warnings.push(msg.text());
  };
  page.on('console', onConsole);
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  context.on('page', (p) => {
    p.on('console', onConsole);
    p.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  });
  return { context, page, errors, warnings, blocked, requests };
}

export async function waitFor(fn, { timeout = 15000, interval = 50, message = 'condition' } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`timeout after ${timeout} ms waiting for ${message}${last instanceof Error ? ` (last error: ${last.message})` : ''}`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until boot() ran and window.__game.ready() resolved in `target` (page or frame). */
export async function waitGameReady(target, timeout = 45000) {
  try {
    await target.waitForFunction(() => document.documentElement.dataset.kanatBoot === 'ok', null, { timeout });
  } catch {
    throw new Error('boot() never completed: document.documentElement.dataset.kanatBoot !== "ok" — is src/main.ts calling boot() from src/core/boot.ts?');
  }
  const hasApi = await target.evaluate(() => typeof window.__game === 'object');
  if (!hasApi) throw new Error('window.__game missing although ?test=1 was given (installTestApi not reached)');
  await target.evaluate(() => window.__game.ready());
}

/** Fails clearly when the active build did not register the handlers a test needs. */
export async function requireHandlers(target, names) {
  const have = await target.evaluate(() => window.__game.handlers());
  const missing = names.filter((n) => !(n in have));
  if (missing.length) {
    throw new Error(
      `__game handler(s) not registered: ${missing.join(', ')} — the mode must call registerTestHandlers({ ${missing.join(', ')} }) (src/debug/testApi.ts). Registered: ${JSON.stringify(have)}`,
    );
  }
  return have;
}

export function assert(cond, message) {
  if (!cond) throw new Error(`assertion failed: ${message}`);
}

export function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertion failed: ${message}\n   expected ${e}\n   actual   ${a}`);
}

/** Simulate a visibility change (Chromium headless has no real background tabs). */
export async function setHidden(target, hidden) {
  await target.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: h, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

// ---- runner ----------------------------------------------------------------------------------

const tests = [];
export function test(name, fn) {
  tests.push({ name, fn });
}

export async function run(suite) {
  let failed = 0;
  const t0 = Date.now();
  console.log(`\n# ${suite}`);
  for (const t of tests) {
    const s = Date.now();
    try {
      await t.fn();
      console.log(`  ✓ ${t.name} (${Date.now() - s} ms)`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.name} (${Date.now() - s} ms)\n      ${String(err && err.stack ? err.stack : err).split('\n').slice(0, 6).join('\n      ')}`);
    }
  }
  console.log(`# ${suite}: ${tests.length - failed}/${tests.length} passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exitCode = failed ? 1 : 0;
  return failed;
}
