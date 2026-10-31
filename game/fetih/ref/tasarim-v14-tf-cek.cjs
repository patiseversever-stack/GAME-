// Gerçek oyun DOM'u ve CSS'i (defter/galeri) anlık kaydedilir; WebGL'siz statik sayfada 2x çekilir.
const { chromium } = require('playwright');
const fs = require('fs');
const LONG = process.env.L || 'Türk kadınları seçme ve seçilme hakkını Fransız ve İtalyan kadınlarından önce elde etti.';
const PICK = process.env.P || 'fl-yes';
const PRE = process.env.N || 's';
const MAP = 'data:image/png;base64,' + fs.readFileSync('/home/user/work/harita.png').toString('base64');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  const snap = (n) =>
    p
      .evaluate((MAP) => {
        const d = document.documentElement.cloneNode(true);
        d.querySelectorAll('script,canvas,.gal,.gal-pn').forEach((x) => x.remove());
        const st = document.createElement('style');
        st.textContent = `body{background:#0b1020 url(${MAP}) center top/100% auto no-repeat!important}`;
        d.querySelector('head').appendChild(st);
        d.querySelector('head').insertAdjacentHTML('afterbegin', '<meta charset="utf-8">');
        return '<!DOCTYPE html>' + d.outerHTML;
      }, MAP)
      .then((h) => fs.writeFileSync(`/home/user/work/${n}.html`, h));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/SoruGalerisi.html?q=0#tf');
  await p.waitForSelector('.fl-q.tf.on:not(.rv)', { timeout: 30000 });
  await p.evaluate((L) => {
    const q = document.querySelector('.fl-q.tf');
    q.querySelector('.fl-qtext').textContent = L;
    q.classList.toggle('qlong', L.length > 80);
    q.classList.toggle('qmid', L.length > 50 && L.length <= 80);
  }, LONG);
  await p.waitForTimeout(900);
  await snap(PRE + '1');
  await p.evaluate((c) => document.querySelector('.fl-q.tf .' + c).click(), PICK);
  await p.waitForTimeout(500);
  await snap(PRE + '2');
  await p.waitForSelector('.fl-q.tfy, .fl-q.tfn', { timeout: 40000 });
  await p.waitForTimeout(1600);
  await snap(PRE + '3');
  console.log(errs.join('\n') || 'hata yok', await p.evaluate(() => document.querySelector('.fl-q').className));
  await b.close();
  const b2 = await chromium.launch();
  const q = await b2.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
  for (const n of ['1', '2', '3']) {
    await q.goto(`file:///home/user/work/${PRE}${n}.html`);
    await q.waitForTimeout(n === '3' ? 1800 : 1000);
    await q.screenshot({ path: `/home/user/work/${PRE}${n}.jpg`, quality: 90 });
  }
  await q.goto(`file:///home/user/work/${PRE}3.html`);
  await q.waitForTimeout(50);
  await q.evaluate(() => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = 560;
    }
  });
  await q.screenshot({ path: `/home/user/work/${PRE}3a.jpg`, quality: 90 });
  await b2.close();
})();
