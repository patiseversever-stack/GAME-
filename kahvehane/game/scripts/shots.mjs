// Telefon yatay boyutunda ekran görüntüleri + konsol hataları. Kullanım: node scripts/shots.mjs <url> <outdir> <ms aralıkları...>
import {chromium} from 'playwright-core';
const [,, url, out, ...times] = process.argv;
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: 844, height: 390}, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: true, isMobile: true});
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
await p.goto(url);
let i = 0;
for (const t of times) {
  await p.waitForTimeout(+t);
  await p.screenshot({path: `${out}/shot_${i++}.png`});
}
console.log(errs.length ? errs.join('\n') : 'konsol temiz');
await b.close();
