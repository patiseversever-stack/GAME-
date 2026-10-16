// Açılış ölçümü: sayfa açılışından ilk ekrana kadar süre ve ana iş parçacığını kilitleyen uzun görevler.
// Kullanım: node scripts/boot.mjs <url> [cpuYavaşlatma=4]
import {chromium, devices} from 'playwright-core';
const [,, url = 'http://127.0.0.1:4190/?skipintro=1', slow = '4'] = process.argv;
const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const ctx = await b.newContext({...devices['Pixel 7'], viewport: {width: 412, height: 839}});
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.getItem('kh.profile3') || localStorage.setItem('kh.profile3', JSON.stringify({v: 3, onboarded: true, char: 'dursun', owned: {char: ['dursun'], deck: ['yildizli'], table: ['arena'], fx: ['klasik'], frame: ['standart']}}));
  window.__lt = [];
  new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({type: 'longtask', buffered: true});
});
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', {rate: +slow});
const t0 = Date.now();
await p.goto(url);
const seen = {};
const marks = {splash: '.kh-splash', home: '.kh-hp, .kh-nav'};
while (Date.now() - t0 < 60000 && Object.keys(seen).length < 2) {
  for (const [k, sel] of Object.entries(marks)) if (!seen[k] && await p.$(sel)) seen[k] = Date.now() - t0;
  await p.waitForTimeout(50);
}
await p.waitForTimeout(1500);
const lt = await p.evaluate(() => window.__lt);
const total = lt.reduce((s, x) => s + Math.max(0, x[1] - 50), 0);
console.log(`CPU ${slow}× yavaş | splash görünür: ${seen.splash ?? '?'} ms | ana ekran: ${seen.home ?? '?'} ms | uzun görev sayısı ${lt.length} | engelleme toplamı ≈ ${Math.round(total)} ms`);
console.log('en uzun görevler (başlangıç ms, süre ms):', lt.sort((a, c) => c[1] - a[1]).slice(0, 6).map(x => x.join('→')).join('  '));
await b.close();
