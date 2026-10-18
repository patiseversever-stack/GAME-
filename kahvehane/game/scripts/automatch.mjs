// Kendiliğinden oynayan tam maç testi (tek dosya sürümü üzerinde): sonuç ekranı gelene dek bekler, jeton farkı ve konsol hatalarını yazar.
// Kullanım:  python3 -m http.server 4198 --bind 127.0.0.1   (teslim/vNN klasöründe; kahvehane-pisti.html + voice/ yan yana)
//            node scripts/automatch.mjs <mod: 1v1|4|esli> <W> <H> <oyun: pisti|blof> [ekstraSorgu]
//   örnek:   node scripts/automatch.mjs esli 412 915 pisti "&len=51&chat=geveze"
// Ortam: BASE (varsayılan http://127.0.0.1:4198/kahvehane-pisti.html), CHROME (Chromium yolu; boşsa playwright'ın kendi tarayıcısı).
import {chromium, devices} from 'playwright-core';
const [,, mode = '1v1', W = '412', H = '839', game = 'pisti', extra = ''] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:4198/kahvehane-pisti.html';
const b = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({...devices['Pixel 7'], viewport: {width: +W, height: +H}});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });
await p.addInitScript(() => localStorage.getItem('kh.profile3') || localStorage.setItem('kh.profile3', JSON.stringify({v: 3, onboarded: true, name: 'Test', char: 'dursun', coins: 5000, owned: {char: ['dursun', 'cem', 'defne', 'riza'], deck: ['yildizli'], table: ['arena'], fx: ['klasik'], frame: ['standart']}})));
const t0 = Date.now();
await p.goto(`${BASE}?auto=1&game=${game}&mode=${mode}&q=low&seed=11&skipintro=1${extra}`);
await p.waitForSelector('.kh-nav, .ar', {timeout: 30000});
const c0 = await p.evaluate(() => window.__kh?.profile?.data?.coins);
let got = false;
try { await p.waitForSelector('[data-act=again]', {timeout: 600000}); got = true; } catch {}
await p.waitForTimeout(7000);
await p.screenshot({path: `automatch_${game}_${mode}_${W}_sonuc.png`});
const c1 = await p.evaluate(() => window.__kh?.profile?.data?.coins);
console.log(`${got ? '✓' : '✗'} ${game} ${mode} ${W}x${H}: sonuç ekranı ${got ? 'geldi' : 'GELMEDİ'} (${((Date.now() - t0) / 1000).toFixed(0)} sn) | coin ${c0} → ${c1} | ${errs.length ? 'HATA: ' + errs.slice(0, 2).join(' | ') : 'konsol temiz'}`);
await b.close();
