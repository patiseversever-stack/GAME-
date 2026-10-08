// Shared headless screenshot helper (SwiftShader WebGL2). FPS is meaningless here.
// Usage: node tools/shot.mjs <url> <out.png> [width] [height] [dpr] [waitMs]
// The page may set window.__shotReady = true when the frame is ready (else waitMs is used).
import { chromium } from 'playwright-core';

export const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const CHROME_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];

export async function launch() {
  return chromium.launch({ executablePath: CHROME, args: CHROME_ARGS, headless: true });
}

export async function shot(url, out, { width = 390, height = 844, dpr = 1, waitMs = 8000, isMobile = true } = {}) {
  const browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile, hasTouch: isMobile });
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
    await page.goto(url, { waitUntil: 'load' });
    try { await page.waitForFunction(() => window.__shotReady === true, null, { timeout: waitMs }); } catch { /* fall back to timeout */ }
    await page.screenshot({ path: out });
    return logs;
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [url, out, w, h, dpr, wait] = process.argv.slice(2);
  const logs = await shot(url, out, { width: Number(w || 390), height: Number(h || 844), dpr: Number(dpr || 1), waitMs: Number(wait || 8000) });
  console.log(logs.slice(-40).join('\n'));
  console.log('saved', out);
}
