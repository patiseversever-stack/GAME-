// Defterden (galeri) gerçek DOM anlık kaydı → statik 2x çekim. Kullanım: node gsnap.cjs <tip> <ad> [şık-index]
const { chromium } = require('playwright');
const fs = require('fs');
const [type, name, pick] = process.argv.slice(2);
const MAP = 'data:image/png;base64,' + fs.readFileSync('/home/user/work/harita.png').toString('base64');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const snap = (n) => p.evaluate((MAP) => {
    const d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script,canvas,.gal,.gal-pn').forEach((x) => x.remove());
    d.querySelector('head').insertAdjacentHTML('afterbegin', '<meta charset="utf-8">');
    d.querySelector('head').insertAdjacentHTML('beforeend', `<style>body{background:#0b1020 url(${MAP}) center top/100% auto no-repeat!important}</style>`);
    return '<!DOCTYPE html>' + d.outerHTML;
  }, MAP).then((h) => fs.writeFileSync(`/home/user/work/${n}.html`, h));
  await p.goto(`file:///home/user/GAME-/game/fetih/dist/SoruGalerisi.html?q=0#${type}`);
  await p.waitForSelector('.fl-q.on:not(.rv)', { timeout: 30000 });
  await p.waitForTimeout(900);
  await snap(name + '1');
  const shots = [name + '1'];
  if (pick != null) {
    await p.evaluate((i) => document.querySelector(`.fl-q .fl-opt[data-i="${i}"]`).click(), Number(pick));
    await p.waitForTimeout(500); await snap(name + '2'); shots.push(name + '2');
    await p.waitForSelector('.fl-q.rv', { timeout: 40000 }); await p.waitForTimeout(1500); await snap(name + '3'); shots.push(name + '3');
  }
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
  const b2 = await chromium.launch();
  const q = await b2.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
  for (const n of shots) { await q.goto(`file:///home/user/work/${n}.html`); await q.waitForTimeout(1500); await q.screenshot({ path: `/home/user/work/${n}.jpg`, quality: 90 }); }
  await b2.close();
})();
