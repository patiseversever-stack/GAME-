// Paylaşım görseli (1200×630): node scripts/og.mjs → public/og.jpg
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const font = (p) => `data:font/woff2;base64,${readFileSync(p).toString('base64')}`;
const sg = font('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-ext-wght-normal.woff2');
const sg2 = font('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2');
const mono = font('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-ext-500-normal.woff2');
const mono2 = font('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2');
const poster = `data:image/webp;base64,${readFileSync('public/img/udrill-poster.webp').toString('base64')}`;
const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
@font-face{font-family:SG;src:url(${sg2}) format('woff2');unicode-range:U+0000-00FF,U+0131}
@font-face{font-family:SG;src:url(${sg}) format('woff2');unicode-range:U+0100-02BA}
@font-face{font-family:M;src:url(${mono2}) format('woff2');unicode-range:U+0000-00FF,U+0131}
@font-face{font-family:M;src:url(${mono}) format('woff2');unicode-range:U+0100-02BA}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:radial-gradient(70% 70% at 70% 45%,#1b1d22,#0b0c0e 70%);color:#e7e9ec;font-family:SG;overflow:hidden;position:relative}
.g{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px);background-size:48px 48px}
img{position:absolute;width:1440px;height:900px;left:-260px;top:-190px;object-fit:cover}
.t{position:absolute;left:64px;bottom:72px;width:620px}
.e{font-family:M;font-size:16px;letter-spacing:.12em;color:#d9a441;text-transform:uppercase}
h1{font-size:76px;line-height:.95;letter-spacing:-.04em;font-weight:600;margin-top:18px}
h1 b{color:#d9a441;font-weight:600}
.l{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:14px;font-weight:700;font-size:26px;letter-spacing:.06em}
.l small{display:block;font-family:M;font-size:12px;letter-spacing:.2em;opacity:.6;font-weight:500}
.f{position:absolute;right:56px;bottom:56px;font-family:M;font-size:14px;color:#7d858f;letter-spacing:.08em}
</style></head><body><div class="g"></div><img src="${poster}">
<div class="l"><svg width="40" height="40" viewBox="0 0 32 32"><path d="M16 1.8 29.2 16 16 30.2 2.8 16Z" fill="#d9a441"/><circle cx="16" cy="16" r="3.4" fill="#0b0c0e"/></svg><span>AKSOY<small>KESİCİ TAKIMLAR</small></span></div>
<div class="t"><div class="e">Ostim / İvedik · Ankara</div><h1>Doğru kesici takım, <b>aynı gün</b> teklif.</h1></div>
<div class="f">ELMAS UÇ · KARBÜR MATKAP · KILAVUZ · WHATSAPP TEKLİF</div></body></html>`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'public/og.jpg' });
await browser.close();
