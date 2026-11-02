// SEÇİM SIRASI uç durumlar: uzun adlar (21 harf), en büyük pay (8), uzun yakınlık değeri, 2/3/4 kişi, eşli; 3 telefon boyu.
const { chromium } = require('playwright');
const dist = process.argv[2], tag = process.argv[3];
const SIZES = (process.env.S || '320x568,360x640,412x892').split(',').map((x) => x.split('x').map(Number));
const CASES = [
  { id: 'dort_uzun', mode: 'ffa4', names: ['Sen', 'Akdeniz Sultanı Güneş', 'Fırtına Reisi Dumrul', 'MUSTAFAKEMAL'], picks: [5, 3, 3, 0], closest: false },
  { id: 'iki_sekiz', mode: '1v1', names: ['ŞAHİNBEYOĞLU', 'Bozkır Kağanı Börü'], picks: [8, 4], closest: true },
  { id: 'uc_sekiz', mode: 'ffa3', names: ['AYŞEGÜLÇİÇEK', 'Ege Beyi Karaefe', 'Poyraz Reis'], picks: [8, 4, 0], closest: true },
  { id: 'esli', mode: 'team', names: ['MEHMETMÜMTAZ', 'Akdeniz Sultanı Güneş', 'Nilay', 'Fırtına Reisi Dumrul'], picks: [5, 3, 3, 0], closest: false },
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = [];
  for (const c of CASES) for (const [w, h] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await p.goto(`file://${dist}/FetihLigi.html?q=0&debug`);
    await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
    await p.evaluate(async (c) => {
      const app = window.__fl.app;
      await app.debugScene({ show: 'none', cfg: { mode: c.mode, region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); window.__fl.app.start?.();
      const m = app.match, ui = app.ui;
      c.names.forEach((n, k) => (m.players[k].name = n));
      ui.$.hud.classList.remove('off'); ui.hud(m);
      const res = m.players.map((p, k) => c.closest
        ? { p, i: p.i, name: p.name, color: p.css, value: 8400000 + k * 1250000, time: 4 + k * 3.1, correct: false, err: k * 1250000 }
        : { p, i: p.i, name: p.name, color: p.css, value: 1, time: 5.4 + k * 2.3, correct: k !== 0, err: 0 });
      const order = m.rank(res, c.closest ? 'closest' : 'exact');
      ui._pend = { results: res, closest: c.closest, T: { kind: c.closest ? 'closest' : 'exact' }, v: { q: { unit: 'kişi' } }, me: res[0], gen: ui._gen };
      ui._hold = () => new Promise(() => {});
      ui.ranking(m, order, c.picks);
    }, c);
    await p.waitForTimeout(3000);
    const r = await p.evaluate(() => {
      const R = (e) => e.getBoundingClientRect();
      const rows = [...document.querySelectorAll('.sr-r')];
      const hud = document.querySelector('.fl-hud') ? R(document.querySelector('.fl-hud')).bottom : 0;
      const h = R(document.querySelector('.sr-h'));
      const bad = [];
      for (const row of rows) {
        const rr = R(row);
        for (const e of row.querySelectorAll('.nm, .sr-pk, .sr-who small, .fl-av')) { const x = R(e); if (x.right > rr.right + 1 || x.bottom > rr.bottom + 1 || x.top < rr.top - 14) bad.push(e.className + ':' + e.textContent.trim().slice(0, 12)); }
        const nm = row.querySelector('.nm'); const lines = Math.round(R(nm).height / parseFloat(getComputedStyle(nm).lineHeight));
        if (nm.scrollHeight > nm.clientHeight + 1) bad.push('ad 2 satıra sığmadı: ' + nm.textContent);
        const u = row.querySelector('.sr-who small u'); if (u && u.scrollWidth > u.clientWidth + 1) bad.push('kısaltıldı: ' + u.textContent);
      }
      const last = R(rows[rows.length - 1]);
      return { ust: Math.round(h.top - hud), alt: Math.round(innerHeight - last.bottom), tasma: rows.some((x) => R(x).right > innerWidth || R(x).left < 0), sorun: bad, iki: rows.map((x) => Math.round(R(x.querySelector('.nm')).height)).join('/'), pay: [...document.querySelectorAll('.sr-pk b')].map((e) => e.textContent).join(' ') };
    });
    await p.screenshot({ path: `${tag}_${c.id}_${w}.png` });
    out.push(`${c.id} ${w}x${h} | üst ${r.ust} | alt ${r.alt} | taşma ${r.tasma ? 'VAR' : 'yok'} | ad yük. ${r.iki} | pay ${r.pay} | ${r.sorun.join('; ') || 'sorun yok'} ${errs.join('|')}`);
    await p.close();
  }
  console.log(out.join('\n'));
  await b.close();
})();
