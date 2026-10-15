// Oyun içi ekran görüntüleri (dev/game.html). Kullanım:
//   node dev/game-shots.mjs "<sorgu>" <ad> adım...    (sunucu: npx vite --port 5211 --host 127.0.0.1)
// Adımlar: w:<ms> bekle · s:<ad> ekran görüntüsü · u:<js ifade> doğru olana dek bekle (en çok 60 sn)
//          e:<js> çalıştır · f dondur (bütün animasyonlar durur) · r sürdür
// Ortam: VW, VH (390×844), DPR (2), PORT (5211). Çıktı: test-out/game/<ad>_<adım>.png
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';

const [, , query, name, ...steps] = process.argv;
const port = process.env.PORT || 5211;
mkdirSync('test-out/game', {recursive: true});
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: +(process.env.VW || 390), height: +(process.env.VH || 844)}, deviceScaleFactor: +(process.env.DPR || 2), hasTouch: true, isMobile: true});
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300));
  else if (process.env.LOG) console.log('log:', m.text().slice(0, 200));
});
p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
await p.goto(`http://127.0.0.1:${port}/dev/game.html?${query}`);
for (const st of steps) {
  const [k, ...rest] = st.split(':');
  const v = rest.join(':');
  if (k === 'w') await p.waitForTimeout(+v);
  else if (k === 's') await p.screenshot({path: `test-out/game/${name}_${v}.png`});
  else if (k === 'u')
    await p.waitForFunction(v, null, {timeout: +(process.env.TMO || 90000), polling: 40}).catch(async e => {
      errs.push('bekleme zaman aşımı: ' + v);
      await p.screenshot({path: `test-out/game/${name}_timeout.png`});
    });
  else if (k === 'e') console.log('eval:', JSON.stringify(await p.evaluate(v)));
  else if (k === 'f') await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  else if (k === 'r') await p.evaluate(() => document.getAnimations().forEach(a => a.play()));
}
console.log(errs.length ? errs.join('\n') : 'konsol temiz');
await b.close();
