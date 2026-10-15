import {chromium} from 'playwright-core';
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, hasTouch: true, isMobile: true});
p.on('pageerror', e => console.log('pageerror', e.message));
p.on('console', m => console.log('console', m.type(), m.text().slice(0, 200)));
await p.goto('http://127.0.0.1:5212' + process.argv[2]);
await p.waitForTimeout(+process.argv[3] || 3000);
console.log(await p.evaluate(process.argv[4]));
await b.close();
