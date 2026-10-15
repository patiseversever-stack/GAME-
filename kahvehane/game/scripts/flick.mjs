// Gerçek dokunma yolu testi: başlat, sıra gelince elden bir kartı yukarı fırlat.
import {chromium} from 'playwright-core';
const [,, url, out] = process.argv;
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: 844, height: 390}});
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(url);
await p.waitForSelector('text=Masaya Otur', {timeout: 60000});
await p.click('text=Masaya Otur');
await p.waitForFunction(() => window.__kh && window.__kh.hand.enabled, null, {timeout: 120000});
const before = await p.evaluate(() => window.__kh.table.pile.length);
// elin ortasındaki kartın ekran konumu
const pt = await p.evaluate(() => { const k = window.__kh; const s = k.hand.slots[1]; const q = [0,1,2,3].map(() => ({x:0,y:0})); k.cards.screenQuad(s, q); return {x: (q[0].x+q[1].x+q[2].x+q[3].x)/4, y: (q[0].y+q[1].y+q[2].y+q[3].y)/4}; });
await p.mouse.move(pt.x, pt.y);
await p.mouse.down();
for (let i = 1; i <= 8; i++) { await p.mouse.move(pt.x + i * 2, pt.y - i * 22); await p.waitForTimeout(16); }
await p.screenshot({path: `${out}/flick_drag.png`});
await p.mouse.up();
await p.waitForTimeout(2500);
const after = await p.evaluate(() => window.__kh.table.pile.length + window.__kh.table.stacks[0].length);
await p.screenshot({path: `${out}/flick_after.png`});
console.log(JSON.stringify({pt, before, after, errs}));
await b.close();
