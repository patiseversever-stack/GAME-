// Geçiş takılma ölçümü: senaryo sırasında kare süreleri (rAF aralığı). 4× yavaş CPU'da kötümser ama karşılaştırılabilir.
// Kullanım: node scripts/jank.mjs <url> [cpuYavaşlatma=4] [senaryolar=hepsi]
import {chromium, devices} from 'playwright-core';
const [,, url = 'http://127.0.0.1:4190/?q=high', slow = '4', only = ''] = process.argv;
const want = only ? new Set(only.split(',')) : null;
const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const ctx = await b.newContext({...devices['Pixel 7'], viewport: {width: 412, height: 839}});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => {
  localStorage.getItem('kh.profile3') || localStorage.setItem('kh.profile3', JSON.stringify({v: 3, onboarded: true, char: 'dursun', owned: {char: ['dursun', 'cem'], deck: ['yildizli'], table: ['arena'], fx: ['klasik'], frame: ['standart']}, coins: 20000}));
  window.__jk = {run: false, t: [], last: 0};
  const loop = t => { const j = window.__jk; if (j.run) { if (j.last) j.t.push(t - j.last); j.last = t; } else j.last = 0; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', {rate: +slow});
const start = () => p.evaluate(() => { window.__jk.t = []; window.__jk.run = true; });
const stop = async name => {
  const t = await p.evaluate(() => { window.__jk.run = false; return window.__jk.t; });
  if (!t.length) return console.log(name.padEnd(26), '(ölçüm yok)');
  const s = [...t].sort((a, c) => a - c), n = s.length, sum = t.reduce((x, y) => x + y, 0);
  const pct = k => s[Math.min(n - 1, Math.floor(n * k))];
  const bad = t.filter(x => x > 50).length;
  console.log(`${bad > 2 || pct(0.95) > 40 ? '⚠' : '✓'} ${name.padEnd(26)} ${String(n).padStart(3)} kare / ${(sum / 1000).toFixed(1)} sn | ort ${(sum / n).toFixed(0)} ms | p95 ${pct(0.95).toFixed(0)} ms | en kötü ${s[n - 1].toFixed(0)} ms | >50 ms: ${bad}`);
};
const run = async (name, fn) => { if (want && !want.has(name)) return; await start(); await fn(); await stop(name); };
const click = async (sel, wait = 800) => { try { await p.click(sel, {timeout: 6000, force: true}); } catch { console.log('  (tıklanamadı ' + sel + ')'); } await p.waitForTimeout(wait); };

await p.goto(url + '&skipintro=1');
await p.waitForSelector('.kh-nav', {timeout: 60000});
await p.waitForTimeout(3500);
await run('sekme-geçişleri', async () => { for (const t of ['shop', 'profile', 'quests', 'home']) await click(`.kh-nav [data-tab=${t}]`, 900); });
await run('market-ürün-aç', async () => { await click('.kh-nav [data-tab=shop]', 1200); await click('.kh-item, .kh-deal', 1500); await click('.kh-sheet__x, .kh-modal__x, [data-act=close]', 900); await click('.kh-nav [data-tab=home]', 900); });
await run('oyna→giriş→masa', async () => { await click('[data-act=play]', 11000); });
for (let i = 0; i < 4; i++) {
  const box = await p.evaluate(() => { const els = [...document.querySelectorAll('.c2.is-hand')]; if (!els.length) return null; const r = els[0].getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
  if (box) { await start(); await p.mouse.click(box.x, box.y); await p.waitForTimeout(3200); await stop('kart-at-' + (i + 1)); }
  else await p.waitForTimeout(1500);
}
console.log(errs.length ? 'HATA: ' + errs.slice(0, 3).join(' | ') : 'konsol temiz');
await b.close();
