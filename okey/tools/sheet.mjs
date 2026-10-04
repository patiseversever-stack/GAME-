// Birden çok PNG'yi tek bir montaj görseline dizer (Chromium ile). Kullanım: node tools/sheet.mjs out.png cols img1 img2 ...
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const [, , out, colsArg, ...imgs] = process.argv;
const cols = +colsArg || 4;
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},auto);gap:4px;width:max-content">${imgs.map((p) => `<figure style="margin:0;position:relative"><img src="data:image/png;base64,${readFileSync(p).toString('base64')}" style="display:block;width:${Math.floor(1600 / cols)}px"><figcaption style="position:absolute;left:4px;top:2px;color:#fff;font:11px sans-serif;text-shadow:0 0 3px #000">${p.split('/').pop().replace('flow_', '').replace('.png', '')}</figcaption></figure>`).join('')}</body>`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
