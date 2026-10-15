import {chromium} from 'playwright-core';
const [,, url, ms] = process.argv;
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: 844, height: 390}});
p.on('pageerror', e => console.log('pageerror', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')));
p.on('console', m => console.log('console', m.type(), m.text().slice(0, 300)));
p.on('requestfailed', r => console.log('reqfail', r.url()));
p.on('response', r => { if (r.status() >= 400) console.log('http', r.status(), r.url()); });
await p.goto(url);
for (let i = 0; i < 4; i++) {
  await p.waitForTimeout(+ms);
  console.log(await p.evaluate(() => { const k = window.__kh; if (!k) return 'yok'; return JSON.stringify({deck: k.table.deck.length, pile: k.table.pile.length, h0: k.table.hands[0]?.length, h1: k.table.hands[1]?.length, busy: k.stage.time.busy, ts: k.stage.time.timeScale, flying: k.cards.busy}); }));
}
await b.close();
