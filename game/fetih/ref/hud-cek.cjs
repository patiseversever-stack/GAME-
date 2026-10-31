// Üst afişin bütün kipleri gerçek oyundan: 1'e 1 düello, 1'e 1 yayılma, eşli (2v2), 3'lü, 4'lü.
const { chromium } = require('playwright');
const fs = require('fs');
const MAP = 'data:image/png;base64,' + fs.readFileSync('/home/user/work/harita.png').toString('base64');
const CASES = [
    ['ikili', '1v1', false],
  ['esli', 'team', false],
  ['uclu', 'ffa3', false],
  ['dortlu', 'ffa4', false],
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const W = +(process.env.W || 412);
  const p = await b.newPage({ viewport: { width: W, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=0&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 60000 });
  for (const [name, mode, duel] of CASES) {
    await p.evaluate(async ({ mode, duel }) => {
      const app = window.__fl.app;
      app.ui.reset?.();
      await app.debugScene({ show: 'none', cfg: { mode, region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
      const m = app.match;
      const ps = m.players;
      ps.forEach((x, k) => { x.score = [2200, 2400, 1850, 1600][k]; x.name = ['ŞAHİNBEYOĞLU', 'MUSTAFAKEMAL', 'AYŞEGÜLÇİÇEK', 'MEHMETMÜMTAZ'][k]; });
      m.turn = 1;
      app.ui.hud(m);
      app.ui.$.hud.classList.remove('off');
    }, { mode, duel });
    await p.waitForTimeout(2500);
    const h = await p.evaluate((MAP) => {
      const d = document.documentElement.cloneNode(true);
      d.querySelectorAll('script,canvas').forEach((x) => x.remove());
      d.querySelector('head').insertAdjacentHTML('afterbegin', '<meta charset="utf-8">');
      d.querySelector('head').insertAdjacentHTML('beforeend', `<style>body{background:#0b1020 url(${MAP}) center top/100% auto no-repeat!important}*{animation-delay:-10s!important;animation-play-state:paused!important}</style>`);
      return '<!DOCTYPE html>' + d.outerHTML;
    }, MAP);
    fs.writeFileSync(`/home/user/work/hd_${name}.html`, h);
    console.log(name, await p.evaluate(() => document.querySelector('.fl-hud').className + ' n=' + document.querySelector('.fl-hud').dataset.n));
  }
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
  const b2 = await chromium.launch();
  const q2 = await b2.newPage({ viewport: { width: W, height: 892 }, deviceScaleFactor: 2 });
  for (const [name] of CASES) {
    await q2.goto(`file:///home/user/work/hd_${name}.html`);
    await q2.evaluate(() => Promise.all([document.fonts.load('italic 900 20px "Barlow Condensed"', 'ŞAHİNĞÜÇÖ'), document.fonts.load('italic 800 20px "Barlow Condensed"', 'ŞAHİN'), document.fonts.load('20px "Lilita One"')]));
    await q2.waitForTimeout(800);
    await q2.screenshot({ path: `/home/user/work/hd_${name}_${W}.png`, clip: { x: 0, y: 0, width: W, height: 130 } });
  }
  await b2.close();
})();
