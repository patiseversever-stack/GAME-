import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto('http://127.0.0.1:4401/?debug', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__S, null, { timeout: 90000 });
await page.waitForTimeout(3000);
await page.evaluate(() => { const S = window.__S; Object.assign(S, { rx: 0.2, ry: 0.5, rz: 0.06, px: 0.0, py: 0, scale: 1.2, focus: 22, block: 1, cut: 1, heat: 1, hole: 1, plunge: 0.6 }); window.__intro.k = 0; });
await page.waitForTimeout(1200);
console.log(JSON.stringify(await page.evaluate(() => {
  const m = window.__mach;
  const P = m.sP.array, L = m.sL.array, V = m.sV.array;
  let alive = 0; let ex = null;
  for (let i = 0; i < L.length; i++) if (L[i] < 1) { alive++; if (!ex) ex = { p: [P[i*3],P[i*3+1],P[i*3+2]], v: [V[i*3],V[i*3+1],V[i*3+2]], l: L[i] }; }
  return { alive, ex, uRes: m.sparkMat.uniforms.uRes.value, uW: m.sparkMat.uniforms.uWidth.value, inst: m.sparkGeo.instanceCount };
})));
await browser.close();
