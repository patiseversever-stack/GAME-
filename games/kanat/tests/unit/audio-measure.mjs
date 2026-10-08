// Headless audio measurement: serves dev/audio.html with Vite on port 5186, renders every mix in
// Chromium through OfflineAudioContext (real master chain), prints the table, writes the JSON
// report + WAV previews to .cache/ and sanity-checks the previews with ffmpeg.
// Usage: node tests/unit/audio-measure.mjs   (exit code 1 when any row fails)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 5186;
const OUT = resolve(ROOT, '.cache/audio-previews');

const server = await createServer({ root: ROOT, configFile: false, logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
let failed = 0;
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:${PORT}/dev/audio.html?measure=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__audioDone === true, null, { timeout: 600_000, polling: 1000 });
  const err = await page.evaluate(() => window.__audioError);
  if (err) {
    console.error(logs.join('\n'));
    throw new Error(err);
  }
  const report = await page.evaluate(() => window.__audioReport);
  const previews = await page.evaluate(() => window.__audioPreviews);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(ROOT, '.cache/audio-measure.json'), JSON.stringify(report, null, 1));

  const f = (x) => (Number.isFinite(x) ? x.toFixed(1) : String(x));
  const lines = [];
  lines.push('| Ölçüm | tür | peak dBFS | true peak dBFS | RMS dBFS | LUFS (int.) | max M LUFS | min 400 ms RMS | NaN | sonuç |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const r of report.rows) {
    if (!r.pass) failed++;
    lines.push(`| ${r.name} | ${r.kind} | ${f(r.peakDb)} | ${f(r.truePeakDb)} | ${f(r.rmsDb)} | ${f(r.lufs)} | ${f(r.maxMomentaryLufs)} | ${f(r.minWindowRmsDb)} | ${r.nanCount} | ${r.pass ? 'OK' : 'FAIL ' + r.note} |`);
  }
  const worst = report.rows.reduce((a, r) => Math.max(a, r.truePeakDb), -Infinity);
  const quiet = report.rows.reduce((a, r) => Math.min(a, r.minWindowRmsDb), Infinity);
  lines.push('');
  lines.push(`Toplam ${report.rows.length} ölçüm, ${failed} başarısız. En yüksek true peak ${f(worst)} dBFS; en sessiz 400 ms pencere ${f(quiet)} dBFS.`);
  lines.push(`Ses bankası (tarayıcı, ana iş parçacığı, senkron): ${report.bankMs.toFixed(0)} ms, ${report.bankMB.toFixed(1)} MB PCM. Toplam ölçüm süresi ${(report.renderMs / 1000).toFixed(1)} s.`);
  const table = lines.join('\n');
  writeFileSync(resolve(ROOT, '.cache/audio-measure.md'), table + '\n');
  console.log(table);

  // WAV previews + ffmpeg sanity check.
  console.log('\nWAV önizlemeleri (.cache/audio-previews):');
  for (const [name, b64] of Object.entries(previews)) {
    const file = resolve(OUT, `${name}.wav`);
    writeFileSync(file, Buffer.from(b64, 'base64'));
    const res = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect,ebur128=peak=true,astats=metadata=0:reset=0', '-f', 'null', '-'], { encoding: 'utf8' });
    const info = `${res.stdout}\n${res.stderr}`;
    const pick = (re) => (info.match(re) || [])[1];
    const maxVol = pick(/max_volume:\s*(-?[\d.]+) dB/);
    const meanVol = pick(/mean_volume:\s*(-?[\d.]+) dB/);
    const I = pick(/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/);
    const tp = pick(/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/);
    const nan = pick(/Number of NaNs:\s*(\d+)/);
    const dc = pick(/DC offset:\s*(-?[\d.]+)/);
    console.log(`  ${name}.wav  max_volume ${maxVol} dB · mean_volume ${meanVol} dB · I ${I} LUFS · true peak ${tp} dBFS · NaN ${nan ?? 0} · DC ${dc}`);
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
