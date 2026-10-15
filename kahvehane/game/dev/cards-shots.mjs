// Kart atlası ekran görüntüleri: node dev/cards-shots.mjs [taban-url] [çıktı klasörü]
// Önce geliştirme sunucusu açık olmalı (ör. npx vite --port 5196 --host 127.0.0.1).
//   v2-full.png   2048 atlas (birebir)
//   v2-1024.png   1024 atlas (birebir)
//   v2-phone.png  telefon benzetimi (2048 atlas, cihaz ölçeği 2.6)
//   v2-phone-1024.png  telefon benzetimi (1024 atlas, cihaz ölçeği 2.6) — düşük kalite denetimi
import {writeFileSync, mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5196/dev/cards.html';
const out = process.argv[3] || 'test-out/cards';
mkdirSync(out, {recursive: true});

const browser = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const errs = [];

async function open(w, dpr) {
  const page = await browser.newPage({viewport: {width: 1120, height: 900}, deviceScaleFactor: dpr});
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300));
  });
  await page.goto(`${base}?w=${w}`);
  await page.waitForSelector('body[data-ready]', {timeout: 60000});
  const ready = await page.evaluate(() => document.body.dataset.ready);
  if (ready !== '1') throw new Error(await page.evaluate(() => document.getElementById('info').textContent));
  return page;
}

async function saveAtlas(page, file) {
  const url = await page.evaluate(() => document.getElementById('atlas').toDataURL('image/png'));
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}

const timings = {};
for (const w of [2048, 1536, 1024]) {
  const p = await open(w, 1);
  timings[w] = await p.evaluate(() => window.__atlas);
  if (w === 2048) await saveAtlas(p, `${out}/v2-full.png`);
  if (w === 1024) await saveAtlas(p, `${out}/v2-1024.png`);
  await p.close();
}
for (const [w, name] of [[2048, 'v2-phone.png'], [1024, 'v2-phone-1024.png']]) {
  const p = await open(w, 2.6);
  await (await p.$('#phone')).screenshot({path: `${out}/${name}`});
  await p.close();
}
for (const [w, t] of Object.entries(timings)) {
  console.log(`${w}: ilk ${t.first.toFixed(1)} ms, sıcak ${t.warm.toFixed(1)} ms (${t.times.map((x) => x.toFixed(1)).join(', ')})`);
}
console.log(errs.length ? errs.join('\n') : 'konsol temiz');
await browser.close();
