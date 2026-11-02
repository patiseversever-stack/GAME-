// Menü (KURAL bölümü) ve kural göstergesi. node menu.cjs <dist> <etiket>
const { chromium } = require('playwright');
const [dist, tag] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/FetihLigi.html?q=0&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
  await p.evaluate(() => window.__fl.app.ui.debug({ show: 'menu' }));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${tag}_menu.png` });
  if (tag !== 'once') {
    await p.evaluate(async () => { const app = window.__fl.app; app.ui.$.menu.classList.add('off'); await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); app.start?.(); });
    for (const rule of ['klasik', 'sureli', 'hakimiyet', 'olum', 'olum2']) {
      await p.evaluate((rule) => {
        const app = window.__fl.app, m = app.match, ui = app.ui;
        m.rule = rule === 'olum2' ? 'olum' : rule; m.phase = 'fetih'; m.round = 3; m.rounds = 6; m.over = false;
        m.suddenDeath = rule === 'olum2';
        m.t0 = (window.__clockNow ? window.__clockNow() : performance.now()) - (rule === 'sureli' ? 12.4 * 60e3 : rule === 'olum' ? 21.7 * 60e3 : 3e5);
        ui.$.hud.classList.remove('off'); ui._ruleChip && (ui._ruleT && clearInterval(ui._ruleT), ui._ruleT = 0); ui.hud(m);
      }, rule);
      await p.waitForTimeout(1600);
      await p.screenshot({ path: `${tag}_hud_${rule}.png`, clip: { x: 0, y: 0, width: 412, height: 200 } });
    }
  }
  console.log(tag, errs.join(' | ') || 'hata yok');
  await b.close();
})();
