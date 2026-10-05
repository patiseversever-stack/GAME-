// Ürün paylaşım görselleri (1200×630 JPG): WhatsApp/sosyal medyada ürün linki atılınca görünen önizleme.
// Dev sunucusundaki /arama.json'dan ürün listesini alır. node scripts/og-products.mjs → public/og/urun/<slug>.jpg
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
const font = (p) => `data:font/woff2;base64,${readFileSync(p).toString('base64')}`;
const sg = font('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-ext-wght-normal.woff2');
const sg2 = font('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2');
const mono = font('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-ext-500-normal.woff2');
const mono2 = font('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2');
const rows = (await (await fetch('http://127.0.0.1:4321/arama.json')).json()).filter((r) => r.s && r.i);
mkdirSync('public/og/urun', { recursive: true });
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const r of rows) {
  const img = `data:image/webp;base64,${readFileSync('public' + r.i.replace('-s.webp', '.webp')).toString('base64')}`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
@font-face{font-family:SG;src:url(${sg2}) format('woff2');unicode-range:U+0000-00FF,U+0131}
@font-face{font-family:SG;src:url(${sg}) format('woff2');unicode-range:U+0100-02BA}
@font-face{font-family:M;src:url(${mono2}) format('woff2');unicode-range:U+0000-00FF,U+0131}
@font-face{font-family:M;src:url(${mono}) format('woff2');unicode-range:U+0100-02BA}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:radial-gradient(60% 80% at 74% 50%,#22252b,#0b0c0e 72%);color:#e7e9ec;font-family:SG;overflow:hidden;position:relative}
.g{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px}
img{position:absolute;width:760px;height:570px;right:-10px;top:30px;object-fit:contain;filter:drop-shadow(0 40px 40px rgba(0,0,0,.55))}
.l{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:14px;font-weight:700;font-size:24px;letter-spacing:.06em}
.l small{display:block;font-family:M;font-size:11px;letter-spacing:.2em;opacity:.6;font-weight:500}
.t{position:absolute;left:64px;top:190px;width:520px}
.e{font-family:M;font-size:15px;letter-spacing:.12em;color:#d9a441;text-transform:uppercase}
h1{font-family:M;font-size:${r.c.length > 16 ? 44 : 58}px;line-height:1.05;letter-spacing:-.01em;font-weight:500;margin-top:18px}
p{font-size:26px;line-height:1.3;color:#a9b0b9;margin-top:18px}
.f{position:absolute;left:64px;bottom:56px;display:flex;gap:10px;align-items:center;font-family:M;font-size:16px;color:#e7e9ec;letter-spacing:.04em}
.f b{background:#25d366;color:#04170b;padding:10px 16px;border-radius:999px;font-weight:600}
.f span{color:#7d858f}
</style></head><body><div class="g"></div><img src="${img}">
<div class="l"><svg width="38" height="38" viewBox="0 0 32 32"><path d="M16 1.8 29.2 16 16 30.2 2.8 16Z" fill="#d9a441"/><circle cx="16" cy="16" r="3.4" fill="#0b0c0e"/></svg><span>AKSOY<small>KESİCİ TAKIMLAR</small></span></div>
<div class="t"><div class="e">${esc(r.sc)}</div><h1>${esc(r.c)}</h1><p>${esc(r.n)}</p></div>
<div class="f"><b>WhatsApp’tan teklif</b><span>Ostim / İvedik · Ankara</span></div></body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: `public/og/urun/${r.s}.jpg`, type: 'jpeg', quality: 80 });
}
console.log(rows.length, 'görsel');
await browser.close();
