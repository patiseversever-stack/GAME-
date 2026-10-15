// Kart tarzları önizlemesinin ekran görüntüsü: node dev/skins-shots.mjs [port]
import {chromium} from 'playwright-core';
const port = process.argv[2] || '5199';
const only = process.argv[3] || '';
const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport: {width: 1460, height: 900}, deviceScaleFactor: 1.5});
p.on('pageerror', e => console.log('pageerror', e.message));
p.on('console', m => m.type() === 'error' && console.log('console', m.text()));
await p.goto(`http://127.0.0.1:${port}/dev/skins.html${only ? '?only=' + only : ''}`);
await p.waitForSelector('body[data-ready]', {timeout: 60000});
await p.waitForTimeout(500);
const out = `test-out/cards/skins${only ? '-' + only : ''}.png`;
await p.screenshot({path: out, fullPage: true});
await b.close();
console.log(out);
