// Bilmece (sır kartı) taraması: defterde bütün bilmeceler 360 ve 412 px; dize kartı taşıyor mu, kart haritayı ne kadar örtüyor,
// cevapta levha ve ipucu vurguları. İlk soru ve cevap ekranının görüntüsü /home/user/work/gorsel/ altına.
const { chromium } = require('playwright');
const DIST = process.argv[2] || '/home/user/GAME-/game/fetih/dist';
const SHOT = process.argv[3] || 'bilmece';
(async () => {
  for (const [w, h] of [[412, 892], [360, 740]]) {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w === 412 ? 2 : 1 });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`file://${DIST}/SoruGalerisi.html#riddle`);
    await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody .fl-opts'), null, { timeout: 180000 });
    const n = await p.evaluate(() => parseInt(document.querySelector('.nv b').textContent.split('/')[1]));
    const issues = []; let maxTop = 1e9;
    for (let k = 0; k < n; k++) {
      if (k) { await p.evaluate(() => document.getElementById('g-next').click()); await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody .fl-opts'), null, { timeout: 60000 }); }
      await p.waitForTimeout(2600);
      const r = await p.evaluate(() => {
        const c = document.querySelector('.fl-q.on'); const rv = c.querySelector('.fl-sir'); const id = document.querySelector('.meta b').textContent;
        const out = [];
        if (!rv) return { id, out: ['sır kartı yok'], top: 0 };
        const R = rv.getBoundingClientRect();
        for (const pp of rv.querySelectorAll('p')) { const q = pp.getBoundingClientRect(); if (q.right > R.right - 40 || q.bottom > R.bottom) out.push('dize taşıyor'); if (false && getComputedStyle(pp).opacity < 0.99) out.push('dize görünmüyor ' + getComputedStyle(pp).opacity + ' ' + getComputedStyle(pp).animationName + ' ' + (document.getAnimations?.().filter(a => a.effect?.target === pp).map(a => a.playState + ':' + Math.round(a.currentTime)).join(','))); }
        if (c.querySelector('.fl-qtext').offsetHeight) out.push('üst soru metni de görünüyor');
        const em = rv.querySelectorAll('em').length; if (em < 2) out.push('ipucu vurgusu az: ' + em);
        const jk = c.querySelector('.fl-jk').getBoundingClientRect(); if (jk.bottom > innerHeight + 1) out.push('jokerler ekran dışında ' + Math.round(jk.bottom) + '/' + innerHeight);
        return { id, out, top: Math.round(c.getBoundingClientRect().top), lines: rv.querySelectorAll('p').length };
      });
      maxTop = Math.min(maxTop, r.top);
      for (const o of r.out) issues.push(`${r.id}: ${o}`);
      if (r.id === 'bil-ri-002' && w === 412) {
        await p.screenshot({ path: `/home/user/work/gorsel/${SHOT}_soru.png`, timeout: 120000 });
        const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('.fl-q.on .fl-opts button')].find((x) => x.textContent.trim().endsWith('Sis')); b?.click(); return !!b + ' ' + document.querySelector('.fl-q.on').className; });
        console.log('   yanlış şık tıklandı: ' + hit);
        await p.waitForTimeout(400);
        await p.waitForFunction(() => document.querySelector('.fl-q.on.rv .fl-sir .sl'), null, { timeout: 90000, polling: 50 });
        await p.waitForTimeout(1100);
        await p.screenshot({ path: `/home/user/work/gorsel/${SHOT}_cevap.png`, timeout: 120000 });
      }
    }
    await p.waitForFunction(() => { const c = document.querySelector('.fl-q.on'); return c && [c, ...c.querySelectorAll('*')].every((e) => !e.getAnimations || e.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity)); }, null, { timeout: 60000 }).catch(() => console.log('  (devinim beklemesi zaman aşımı)'));
    console.log('   kart dönüşümü: ' + await p.evaluate(() => getComputedStyle(document.querySelector('.fl-q.on')).transform + ' / qc ' + getComputedStyle(document.querySelector('.fl-q.on .fl-qc')).transform));
    const ALL = JSON.parse(require('child_process').execSync(`node --input-type=module -e "import {BANK} from '/home/user/GAME-/game/fetih/src/data/bank.js'; console.log(JSON.stringify(BANK.filter(q=>q.type==='riddle').map(q=>[q.id,q.q])))"`).toString());
    const all = await p.evaluate((ALL) => {
      const c = document.querySelector('.fl-q'); const rv = c.querySelector('.fl-sir'); const out = []; let hi = 0;
      const ps = [...rv.querySelectorAll('p')];
      for (const [id, q] of ALL) {
        const L = q.split('\n'); ps.forEach((pp, i) => { pp.textContent = L[i] || ''; pp.style.animation = 'none'; pp.style.opacity = 1; pp.style.transform = 'none'; });
        rv.classList.toggle('s-lg', q.length > 92);
        const R = rv.getBoundingClientRect(); hi = Math.max(hi, R.height);
        for (const pp of ps) { const r = pp.getBoundingClientRect(); if (r.right > R.right - 40 || r.bottom > R.bottom) out.push(id + ': dize taşıyor'); }
        const jk = c.querySelector('.fl-jk').getBoundingClientRect(); if (jk.bottom > innerHeight + 1) out.push(id + ': jokerler ekran dışında ' + Math.round(jk.bottom));
        const top = c.querySelector('.fl-qc').getBoundingClientRect().top; if (top < innerHeight * 0.42) out.push(id + ': kart haritanın yarısından çoğunu örtüyor (üst ' + Math.round(top) + ')');
      }
      return { out, hi: Math.round(hi) };
    }, ALL);
    for (const o of all.out) issues.push('[40] ' + o);
    console.log(`   40 bilmecede sır kartı en çok ${all.hi}px`);
    console.log(`== ${w}x${h}: ${n} bilmece, ${issues.length} sorun, kartın en yüksek üstü ${maxTop}px ${errs.length ? 'HATA ' + errs.join('|') : ''}`);
    for (const x of issues.slice(0, 30)) console.log('  ' + x);
    await b.close();
  }
})();
