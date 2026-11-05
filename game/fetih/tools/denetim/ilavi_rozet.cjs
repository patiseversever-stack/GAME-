// İl Avı rozet taraması: defterdeki her İl Avı sorusunda gizli ile EN YAKIN 4 ile dokunulur (en sıkışık durum, hepsi
// yanlış → cevap filmi). İki anda ölçülür: son dokunuştan 0,8 sn sonra ve cevap filminin son çekiminden sonra (3,6 sn).
// Görünen yazı rozetleri: birbirine binme, ekran kenarından taşma, karta binme, damgaya binme. 412×892.
const { chromium } = require('playwright');
const DIST = process.argv[2] || '/home/user/GAME-/game/fetih/dist';
const W = +(process.argv[3] || 412), H = +(process.argv[4] || 892);
const SAMPLES = JSON.parse(require('child_process').execSync(`node --input-type=module -e "await import('/home/user/GAME-/game/fetih/test/kanca.mjs'); const {DENEME_SAMPLES}=await import('/home/user/GAME-/game/fetih/src/quiz/deneme.js'); console.log(JSON.stringify(DENEME_SAMPLES.ilavi.map(q=>[q.id,q.il])))"`).toString());
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`file://${DIST}/SoruGalerisi.html#ilavi`);
  await p.waitForFunction(() => document.querySelector('.fl-q.on .dn-ia'), null, { timeout: 240000, polling: 100 });
  await p.evaluate(() => document.getElementById('g-time').click());
  const audit = (when) => p.evaluate((when) => {
    const out = [];
    const R = (e) => e.getBoundingClientRect();
    const hit = (a, c, pad = 2) => a.left < c.right - pad && c.left < a.right - pad && a.top < c.bottom - pad && c.top < a.bottom - pad;
    const tags = [...document.querySelectorAll('.dn-tag:not(.dn-rt)')].filter((e) => e.style.opacity !== '0' && e.firstElementChild?.offsetWidth).map((e) => ({ t: e.textContent.trim(), r: R(e.firstElementChild) }));
    const qc = document.querySelector('.fl-q .fl-qc');
    const cardB = qc ? R(qc).bottom : 0;
    const st = document.querySelector('.fl-stamp');
    const sr = st && getComputedStyle(st).opacity > 0.3 && st.textContent ? R(st) : null;
    for (let i = 0; i < tags.length; i++) {
      const a = tags[i];
      if (a.r.left < -1 || a.r.right > innerWidth + 1) out.push(`${when}: "${a.t}" ekran kenarından taşıyor`);
      if (a.r.top < cardB - 2 && a.r.bottom > 0) out.push(`${when}: "${a.t}" kartın üstünde`);
      if (sr && hit(a.r, sr, 4)) out.push(`${when}: "${a.t}" damganın altında`);
      for (let j = i + 1; j < tags.length; j++) if (hit(a.r, tags[j].r)) out.push(`${when}: "${a.t}" ile "${tags[j].t}" üst üste`);
    }
    // yerleşimin hedefi (yumuşak geçişin varacağı yer): ui.pins'teki lox/loy
    const ui = window.__fl.app.ui;
    const SW = ui.el.clientWidth, SH = ui.el.clientHeight;
    const cutY = ui.el.classList.contains('qmap') && ui._mapTop ? ui._mapTop * SH - 8 : -1e9;
    const M = ui.pins.filter((q) => q.w && q.lox != null).map((q) => ({ t: q.el.textContent.trim(), r: { left: q.bx + q.lox - (q.w + 6) / 2, right: q.bx + q.lox + (q.w + 6) / 2, top: q.sy + q.loy - 6 - (q.h + 5), bottom: q.sy + q.loy - 4 } })).filter((q) => q.r.top >= cutY);
    const mo = [];
    if (when === 'cevap filmi' && !ui.pins.some((q) => q.el.classList.contains('big') && q.w && q.lox != null && q.sy + q.loy - 6 - (q.h + 5) >= cutY)) mo.push(`${when} [hedef]: gizli ilin rozeti görünmüyor (kartın altında)`);
    for (let i = 0; i < M.length; i++) {
      const a = M[i];
      if (a.r.left < -1 || a.r.right > SW + 1) mo.push(`${when} [hedef]: "${a.t}" ekran kenarından taşıyor`);
      if (ui._stampBox && hit(a.r, ui._stampBox, 4)) mo.push(`${when} [hedef]: "${a.t}" damganın altında`);
      for (let j = i + 1; j < M.length; j++) if (hit(a.r, M[j].r)) mo.push(`${when} [hedef]: "${a.t}" ile "${M[j].t}" üst üste`);
    }
    return { out, mo, n: tags.length };
  }, when);
  const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(Math.round((n * 1000) / (performance.now() - t0))); }; requestAnimationFrame(f); }));
  console.log('test tarayıcısında kare hızı: ' + fps + ' fps');
  const all = [];
  for (let k = 0; k < SAMPLES.length; k++) {
    if (k) await p.evaluate(() => document.getElementById('g-next').click());
    await p.waitForFunction((id) => document.querySelector('.meta b')?.textContent === id && document.querySelector('.fl-q.on .dn-ia') && !document.querySelector('.fl-q.on.rv') && +document.querySelector('.fl-q.on .fl-clock b').textContent > 100, SAMPLES[k][0], { timeout: 120000, polling: 100 });
    await p.waitForTimeout(900);
    // gizli ile en yakın 4 il (merkezler arası)
    const taps = await p.evaluate((plate) => {
      const app = window.__fl.app; const P = app.board.provinces; const t = P.find((x) => x.id === plate);
      return P.filter((x) => x !== t).map((x) => [x.name, Math.hypot(x.x - t.x, x.z - t.z)]).sort((a, c) => a[1] - c[1]).slice(0, 4).map((x) => x[0]);
    }, SAMPLES[k][1]);
    for (let i = 0; i < taps.length; i++) {
      await p.evaluate((name) => { const app = window.__fl.app; const pr = app.board.provinces.find((x) => x.name === name); app.onGround({ x: pr.x, z: pr.z }); }, taps[i]);
      await p.waitForTimeout(i < 3 ? 550 : 800);
    }
    const a1 = await audit('son dokunuş');
    await p.waitForFunction(() => document.querySelector('.fl-q.rv'), null, { timeout: 60000, polling: 50 });
    await p.waitForTimeout(3600);
    const a2 = await audit('cevap filmi');
    const name = await p.evaluate((plate) => window.__fl.app.board.provinces.find((x) => x.id === plate).name, SAMPLES[k][1]);
    const iss = [...new Set([...a1.out, ...a2.out])];
    const mos = [...new Set([...a1.mo, ...a2.mo])];
    all.push([SAMPLES[k][0], name, taps, iss, a1.n, a2.n, mos]);
    console.log(`${SAMPLES[k][0].padEnd(8)} ${name.padEnd(14)} dokunuş: ${taps.join(', ').padEnd(48)} rozet ${a1.n}/${a2.n} · ekranda ${iss.length ? 'SORUN ' + iss.length : 'temiz'} · hedef yerleşim ${mos.length ? 'SORUN ' + mos.length : 'temiz'}`);
    for (const s of [...mos, ...iss]) console.log('     ' + s);
  }
  const bad = all.filter((x) => x[3].length);
  const badM = all.filter((x) => x[6].length);
  console.log(`\n== ${W}x${H}: ${all.length} soru · hedef yerleşimde ${badM.length} soruda ${badM.reduce((s, x) => s + x[6].length, 0)} sorun · ekranda (geçiş gecikmesi dahil) ${bad.length} soruda ${bad.reduce((s, x) => s + x[3].length, 0)} sorun ${errs.length ? 'SAYFA HATASI ' + errs.join(' | ') : ''}`);
  await b.close();
})();
