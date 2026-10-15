// Gerçek akış: açılış → lobi (OYNA) → giriş → masa (otomatik oyun) → ekran görüntüleri.
import {chromium} from 'playwright-core';
const [,, url, out, ...times] = process.argv;
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: true, isMobile: true});
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await p.goto(url);
await p.waitForTimeout(4000);
await p.screenshot({path: `${out}/f_lobby.png`});
await p.mouse.click(195, 716);
await p.waitForTimeout(1200);
await p.screenshot({path: `${out}/f_versus.png`});
let i = 0;
for (const t of times) { await p.waitForTimeout(+t); await p.screenshot({path: `${out}/f_game_${i++}.png`}); }
console.log(errs.length ? errs.join('\n') : 'konsol temiz');
await b.close();
