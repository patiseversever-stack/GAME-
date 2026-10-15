// Meta ekranların ekran görüntüleri (dikey). Kullanım:
//   node dev/meta-shots.mjs <ad> <yol> [bekleme ms ...]   → test-out/meta/<ad>[_i].png
// Ortam: VW, VH (varsayılan 390×844), DPR (2), CLICK="seçici;ms|seçici;ms" (sırayla tıkla), EVAL="js" (yüklemeden sonra)
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
const [,, name, path, ...times] = process.argv;
const out = new URL('../test-out/meta/', import.meta.url).pathname;
mkdirSync(out, {recursive: true});
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: +(process.env.VW || 390), height: +(process.env.VH || 844)}, deviceScaleFactor: +(process.env.DPR || 2), hasTouch: true, isMobile: true});
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
if (process.env.STORE) await p.addInitScript(s => { for (const [k, v] of Object.entries(JSON.parse(s))) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, process.env.STORE);
await p.goto('http://127.0.0.1:5212' + path);
if (process.env.EVAL) await p.evaluate(process.env.EVAL);
const ts = times.length ? times : ['1500'];
let i = 0;
const clicks = (process.env.CLICK || '').split('|').filter(Boolean);
for (const t of ts) {
  if (t.startsWith('c')) {
    // c<n>: n. tıklamayı yap
    const [sel, ms] = clicks[+t.slice(1)].split(';');
    try { await p.click(sel, {timeout: 3000, force: true}); } catch (e) { errs.push('click fail ' + sel); }
    await p.waitForTimeout(+(ms || 300));
    continue;
  }
  if (t.startsWith('e')) {
    await p.evaluate(process.env['EVAL' + t.slice(1)]);
    continue;
  }
  await p.waitForTimeout(+t);
  const f = ts.filter(x => !x.startsWith('c') && !x.startsWith('e')).length > 1 ? `${out}${name}_${i++}.png` : `${out}${name}.png`;
  await p.screenshot({path: f});
}
console.log(errs.length ? errs.join('\n') : 'konsol temiz');
await b.close();
