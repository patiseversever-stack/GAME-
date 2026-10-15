// Masa temaları + avatar çerçeveleri ekran görüntüleri → test-out/themes/*.png
// Kullanım: node dev/themes-shots.mjs [port=5214] [yalnız-tema|frames|all]
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';

const port = process.argv[2] || '5214';
const what = process.argv[3] || 'all';
const base = `http://127.0.0.1:${port}/dev/themes.html`;
mkdirSync('test-out/themes', {recursive: true});
const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});

async function open(query, dpr, vw = 2200) {
  const p = await b.newPage({viewport: {width: vw, height: 1000}, deviceScaleFactor: dpr});
  p.on('pageerror', e => console.log('pageerror', e.message));
  p.on('console', m => (m.type() === 'error' || m.text().startsWith('timings')) && console.log(m.type(), m.text()));
  await p.goto(`${base}?${query}`);
  await p.waitForSelector('body[data-ready]', {timeout: 120000});
  await p.waitForTimeout(400);
  return p;
}

const out = [];
if (what === 'swatch') {
  const p = await open('tables=0&frames=0', 2, 1300);
  await p.locator('#sws').screenshot({path: 'test-out/themes/_swatch.png'});
  out.push('test-out/themes/_swatch.png');
  await p.close();
} else if (what !== 'frames') {
  // her tema: oyun ortası ve boş yığın, telefon başına ayrı dosya (2× yoğunluk)
  for (const state of ['play', 'empty']) {
    const p = await open(`frames=0${what !== 'all' ? '&only=' + what : ''}${state === 'empty' ? '&state=empty' : ''}`, 2);
    for (const col of await p.locator('.col').all()) {
      const id = await col.getAttribute('data-theme');
      const f = `test-out/themes/${id}${state === 'empty' ? '-bos' : ''}.png`;
      await col.locator('.ph').screenshot({path: f, animations: 'disabled'});
      out.push(f);
    }
    if (what === 'all' && state === 'play') {
      await p.locator('#tables').screenshot({path: 'test-out/themes/_hepsi.png'});
      await p.locator('#sws').screenshot({path: 'test-out/themes/_swatch.png'});
      out.push('test-out/themes/_hepsi.png', 'test-out/themes/_swatch.png');
    }
    await p.close();
  }
}
if (what === 'all' || what === 'frames') {
  const p = await open('tables=0', 2, 1300);
  const fr = p.locator('#frames');
  for (const [i, ms] of [0, 1300, 2600].entries()) {
    if (ms) await p.waitForTimeout(1300);
    const f = `test-out/themes/_cerceve${i ? '-' + i : ''}.png`;
    await fr.screenshot({path: f});
    out.push(f);
  }
  await p.close();
}
await b.close();
console.log(out.join('\n'));
