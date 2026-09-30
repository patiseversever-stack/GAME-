// Ortak test yardımcıları (Playwright + yerel Chromium).
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const previewURL = q => 'file://' + path.join(root, 'loader', 'preview', 'index.html') + '?' + new URLSearchParams(q).toString();
export const VIEWS = {
  'land-small': { w: 667, h: 375, dpr: 2, coarse: true }, 'land-mid': { w: 844, h: 390, dpr: 3, coarse: true }, 'land-big': { w: 932, h: 430, dpr: 3, coarse: true },
  'port-small': { w: 360, h: 640, dpr: 2, coarse: true }, 'port-mid': { w: 390, h: 844, dpr: 3, coarse: true }, 'port-big': { w: 430, h: 932, dpr: 3, coarse: true },
  tablet: { w: 1024, h: 768, dpr: 2, coarse: false }, desktop: { w: 1440, h: 900, dpr: 1, coarse: false },
};
export async function launch() {
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
}
export async function newPage(browser, view, dprOverride) {
  const ctx = await browser.newContext({ viewport: { width: view.w, height: view.h }, deviceScaleFactor: dprOverride ?? view.dpr, isMobile: view.coarse, hasTouch: view.coarse });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
  return { ctx, page };
}
