// Entegre oyunu GERÇEK yükleme akışıyla açar; CDP screencast ile compositor'un ürettiği kareleri kaydeder.
// Amaç: oyun ana iş parçacığını kilitlerken (new Game) yükleme animasyonu akıyor mu? çıkış oyuna bağlanıyor mu?
// node scripts/verify/real-load.mjs <görünüm> [cpuThrottle=1] [çıktı-klasörü]
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, VIEWS, root } from './lib.mjs';

const [, , viewName = 'land-mid', throttle = '1', tag = ''] = process.argv;
const view = VIEWS[viewName];
const file = 'file://' + path.join(root, 'game', 'Gece_Postasi_Yatay_Hafif.html');
const outDir = path.join(root, 'verify-out', `real-${viewName}${tag ? '-' + tag : ''}-x${throttle}`);
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });

const browser = await launch();
const { ctx, page } = await newPage(browser, view, 1);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +throttle });
const frames = [];
cdp.on('Page.screencastFrame', async ev => {
  frames.push({ ts: ev.metadata.timestamp * 1000, data: ev.data });
  cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
});
await page.addInitScript(() => { window.__gpEvents = []; addEventListener('gp-loader:done', () => window.__gpEvents.push(['done', performance.now()])); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 55, everyNthFrame: 1 });
const t0 = Date.now() / 1000 * 1000;
await page.goto(file, { waitUntil: 'commit' });
await page.waitForFunction(() => window.game && !document.getElementById('gp-loader'), null, { timeout: 170000, polling: 200 });
await page.waitForTimeout(1500);
await cdp.send('Page.stopScreencast');
const info = await page.evaluate(() => ({
  marks: Object.fromEntries(performance.getEntriesByType('mark').map(m => [m.name, Math.round(m.startTime)])),
  events: window.__gpEvents, quality: window.Posta.getDiagnostics().quality,
}));
const first = frames[0].ts;
const ts = frames.map(f => f.ts - first);
const gaps = ts.slice(1).map((t, i) => t - ts[i]);
console.log(`görünüm ${viewName} ${view.w}x${view.h}  CPU x${throttle}`);
console.log('işaretler (ms):', JSON.stringify(info.marks));
console.log(`screencast: ${frames.length} kare, süre ${(ts.at(-1) / 1000).toFixed(2)} sn, ort. aralık ${(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1)} ms, en büyük boşluk ${Math.max(...gaps).toFixed(0)} ms`);
// yükleme süresince (gp-start → gp-done) kare akışı
const navStart = await page.evaluate(() => performance.timeOrigin);
const st = info.marks['gp-start'], dn = info.marks['gp-done'];
const inLoad = frames.filter(f => { const t = f.ts - (navStart); return true; });
fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ info, ts }, null, 0));
// eşit aralıklı 20 kare kaydet
const pick = 20, step = Math.max(1, Math.floor(frames.length / pick));
frames.forEach((f, i) => { if (i % step === 0) fs.writeFileSync(path.join(outDir, `f${String(i).padStart(4, '0')}_${Math.round(ts[i])}ms.jpg`), Buffer.from(f.data, 'base64')); });
console.log('kareler →', outDir);
await browser.close();
