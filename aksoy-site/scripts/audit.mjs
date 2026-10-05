// Sayfa denetimi: tam sayfa ekran görüntüsü + otomatik kontroller (taşma, küçük dokunma hedefleri,
// alt metni olmayan görseller, etiketsiz alanlar, başlık sırası, konsol hataları).
// node scripts/audit.mjs <çıktı klasörü> [base url] [sayfa adı süzgeci]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [outDir = 'verify-out/audit', base = 'http://127.0.0.1:4401', only = ''] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

export const PAGES = [
  ['anasayfa', '/'],
  ['urunler', '/urunler'],
  ['kategori', '/kategori/tornalama'],
  ['urun', '/urun/cnmg-120408'],
  ['urun-kater', '/urun/mgehr-2020-3'],
  ['markalar', '/markalar'],
  ['marka', '/markalar/iscar'],
  ['araclar', '/teknik-araclar'],
  ['kesme', '/teknik-araclar/kesme-hizi-hesaplama'],
  ['iso', '/teknik-araclar/iso-uc-kodu-cozucu'],
  ['kilavuz', '/teknik-araclar/kilavuz-matkap-tablosu'],
  ['blog', '/blog'],
  ['yazi', '/blog/u-matkap-nedir'],
  ['iletisim', '/iletisim'],
  ['kvkk', '/kvkk'],
  ['404', '/bu-sayfa-yok'],
];
const VIEWS = [['d', 1440, 900, false], ['m', 390, 844, true]];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = {};
for (const [name, path] of PAGES) {
  if (only && !only.split(',').includes(name)) continue;
  for (const [v, w, h, mobile] of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404 \(Not Found\)/.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
    await page.goto(base + path, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1200);
    // Belirme animasyonlarını bitmiş hâle getir; ana sayfada 3D vitrini çekimden çıkar (ayrı çekilir)
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation-duration:0s!important;animation-delay:0s!important} [data-showcase]{display:none!important}' });
    await page.evaluate(() => document.querySelectorAll('.reveal,.split-line,[data-reveal]').forEach((e) => e.classList.add('is-in')));
    await page.waitForTimeout(400);
    const checks = await page.evaluate((isMobile) => {
      const vw = document.documentElement.clientWidth;
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
      const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
      const overflow = [];
      if (document.documentElement.scrollWidth > vw + 1) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.right > vw + 1 && vis(el) && !el.closest('[data-marquee],.marquee,.tl-tablewrap,[aria-hidden="true"]')) overflow.push(`${desc(el)} → ${Math.round(r.right)}px`);
          if (overflow.length > 8) break;
        }
        // Gizli (aria-hidden) bir süs öğesi de sayfayı yana kaydırabilir: kaynağı bulunamasa da bildir
        if (!overflow.length) overflow.push(`scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
      }
      const small = [];
      if (isMobile) {
        for (const el of document.querySelectorAll('a[href], button, input, select, [role="button"], [role="tab"]')) {
          if (!vis(el) || el.closest('[aria-hidden="true"]')) continue;
          const r = el.getBoundingClientRect();
          if ((r.width < 40 || r.height < 40) && el.textContent.trim().length < 40 && !el.closest('p, li p, .prose')) small.push(`${desc(el)} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`);
        }
      }
      const noAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(-40));
      const unlabeled = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter((i) => {
        if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.closest('label')) return false;
        return !(i.id && document.querySelector(`label[for="${i.id}"]`));
      }).map(desc);
      const heads = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map((h) => `${h.tagName}:${h.textContent.trim().replace(/\s+/g, ' ').slice(0, 48)}`);
      const h1 = document.querySelectorAll('h1').length;
      const title = document.title, metaDesc = document.querySelector('meta[name=description]')?.content ?? '';
      return { overflow, small: small.slice(0, 30), smallCount: small.length, noAlt, unlabeled, h1, heads: heads.slice(0, 40), title, metaDesc, height: document.documentElement.scrollHeight };
    }, mobile);
    report[`${name}-${v}`] = { ...checks, errors };
    await page.screenshot({ path: `${outDir}/${name}-${v}.png`, fullPage: true });
    await ctx.close();
    console.log(`${name}-${v}: h=${checks.height} overflow=${checks.overflow.length} small=${checks.smallCount} noAlt=${checks.noAlt.length} unlabeled=${checks.unlabeled.length} h1=${checks.h1} errors=${errors.length}`);
  }
}
fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
