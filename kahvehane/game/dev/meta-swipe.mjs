// Galeri kaydırma testi: hediye galerisinde sola fiske, sonra ekran görüntüsü.
import {chromium} from 'playwright-core';
const out = new URL('../test-out/meta/', import.meta.url).pathname;
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 1});
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:5212/dev/screens.html?s=onboarding&p=new');
await p.waitForTimeout(1000);
await p.click('.kh-ob__skip');
await p.waitForTimeout(2600);
const idx = () => p.evaluate(() => [...document.querySelectorAll('.kh-gc')].findIndex(e => e.classList.contains('is-center')));
console.log('başta', await idx());
// hızlı fiske sola (bir sonraki kart)
await p.mouse.move(300, 420); await p.mouse.down();
for (let i = 1; i <= 6; i++) { await p.mouse.move(300 - i * 22, 420); await p.waitForTimeout(12); }
await p.mouse.up();
await p.waitForTimeout(900);
console.log('fiskeden sonra', await idx());
// yavaş, kısa sürükleme (geri yerine oturmalı)
await p.mouse.move(200, 420); await p.mouse.down();
for (let i = 1; i <= 10; i++) { await p.mouse.move(200 + i * 4, 420); await p.waitForTimeout(40); }
await p.mouse.up();
await p.waitForTimeout(900);
console.log('kısa sürüklemeden sonra', await idx());
await p.screenshot({path: out + 'swipe.png'});
console.log(errs.length ? errs.join('\n') : 'konsol temiz');
await b.close();
