// 3D poz ayarı: node scripts/pose.mjs out.png '{"rx":..}' [w] [h]
import { chromium } from 'playwright-core';
const [out, json = '{}', w = '1440', h = '900', extra = '{}'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto('http://127.0.0.1:4321/?debug&poster', { waitUntil: 'networkidle' });
await page.waitForFunction(() => (window).__posterReady, null, { timeout: 60000 });
await page.evaluate(([j, x]) => {
  const S = window.__S; Object.assign(S, JSON.parse(j));
  const e = JSON.parse(x);
  if (e.mats) for (const [k, v] of Object.entries(e.mats)) Object.assign(window.__mats[k], v);
  if (e.exposure) window.__renderer.toneMappingExposure = e.exposure;
  document.querySelectorAll('.chapter,.hud,.scroll-hint,.showcase__side').forEach((el) => (el.style.display = 'none'));
  document.querySelector('.site-header').style.display = 'none';
  document.querySelector('[data-showcase]').classList.add('is-live');
  window.__frame(); window.__frame();
}, [json, extra]);
await page.waitForTimeout(300);
await page.screenshot({ path: out });
await browser.close();
