// Ses doğrulama: her efekti ve her müzik temasını OfflineAudioContext'te çizer, tepe/RMS ölçer.
//   node src/audio/verify.mjs [çıkışKlasörü]      (çıktı: rapor + WAV dosyaları)
// Gerekli: node_modules (esbuild, playwright-core) ve /opt/pw-browsers/chromium-1194.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] || join(here, '../../.audio-out');
mkdirSync(outDir, { recursive: true });

const bundle = await build({
	entryPoints: [join(here, 'sfx.js')],
	bundle: true,
	format: 'iife',
	globalName: 'FetihAudio',
	write: false,
	target: 'es2020',
});
const code = bundle.outputFiles[0].text;

const browser = await chromium.launch({
	executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
	args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: code });

// sayfada çalışacak ölçüm kodu
await page.evaluate(() => {
	const SR = 44100;
	window.measure = (L, R) => {
		let peak = 0, sum = 0, nan = 0, dc = 0;
		let first = -1, last = -1;
		const n = L.length;
		for (let i = 0; i < n; i++) {
			const a = L[i], b = R[i];
			if (a !== a || b !== b) nan++;
			const m = Math.max(Math.abs(a), Math.abs(b));
			if (m > peak) peak = m;
			if (m > 0.001) {
				if (first < 0) first = i;
				last = i;
			}
			dc += (a + b) / 2;
		}
		const i0 = Math.max(0, first), i1 = last < 0 ? 0 : last;
		for (let i = i0; i <= i1; i++) sum += (L[i] * L[i] + R[i] * R[i]) / 2;
		const rms = i1 > i0 ? Math.sqrt(sum / (i1 - i0 + 1)) : 0;
		// 1 sn'lik kayan RMS aralığı
		let lo = 9, hi = 0;
		const w = SR;
		for (let s = 0; s + w <= n; s += w) {
			let q = 0;
			for (let i = s; i < s + w; i++) q += (L[i] * L[i] + R[i] * R[i]) / 2;
			const r = Math.sqrt(q / w);
			if (r < lo) lo = r;
			if (r > hi) hi = r;
		}
		return { peak, rms, nan, dc: dc / n, startMs: first < 0 ? -1 : (first / SR) * 1000, endMs: (last / SR) * 1000, minWin: lo, maxWin: hi };
	};
	window.renderSfx = async (name, extra, len) => {
		const ctx = new OfflineAudioContext(2, SR * len, SR);
		const s = new FetihAudio.Sfx({}, { ctx, persist: false });
		const ok = s.play(name, Object.assign({ at: 0.02 }, extra || {}));
		const t0 = performance.now();
		const buf = await ctx.startRendering();
		const ms = performance.now() - t0;
		const L = buf.getChannelData(0), R = buf.getChannelData(1);
		return { ok, ms, m: window.measure(L, R), L: Array.from(L.subarray(0, Math.min(L.length, SR * len))), R: Array.from(R.subarray(0, Math.min(R.length, SR * len))) };
	};
	window.renderMusic = async (theme, len, low) => {
		const ctx = new OfflineAudioContext(2, SR * len, SR);
		const s = new FetihAudio.Sfx({}, { ctx, persist: false, low: !!low });
		s.music(theme);
		// gerçek zamanlı çalışmayı taklit et: 100 ms'de bir 0.45 sn ilerisi planlanır (düğümler az kalır)
		for (let t = 0.1; t < len; t += 0.1) ctx.suspend(t).then(() => { s.music_.pump(ctx.currentTime + 0.45); ctx.resume(); });
		const t0 = performance.now();
		const buf = await ctx.startRendering();
		const ms = performance.now() - t0;
		const L = buf.getChannelData(0), R = buf.getChannelData(1);
		return { ms, m: window.measure(L, R), L: Array.from(L), R: Array.from(R) };
	};
	// Karplus-Strong perde doğruluğu: otokorelasyonla
	window.pitchTest = async (kind, hz) => {
		const ctx = new OfflineAudioContext(1, SR, SR);
		const s = new FetihAudio.Sfx({}, { ctx, persist: false });
		s.e.pluck(kind, hz, 0.01, 0.8);
		const buf = await ctx.startRendering();
		const x = buf.getChannelData(0).subarray(Math.floor(SR * 0.05), Math.floor(SR * 0.45));
		const lag0 = SR / hz;
		let best = 0, bl = 0;
		for (let l = Math.floor(lag0 * 0.9); l <= Math.ceil(lag0 * 1.1); l += 0.05) {
			let c = 0, n = 0;
			for (let i = 0; i + Math.ceil(l) + 1 < x.length; i += 2) {
				const j = i + l, k = Math.floor(j), f = j - k;
				c += x[i] * (x[k] * (1 - f) + x[k + 1] * f);
				n++;
			}
			if (c / n > best) {
				best = c / n;
				bl = l;
			}
		}
		const got = SR / bl;
		return { want: hz, got, cents: 1200 * Math.log2(got / hz) };
	};
});

function wav(path, L, R, sr = 44100) {
	const n = L.length;
	const b = Buffer.alloc(44 + n * 4);
	b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12);
	b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(sr, 24);
	b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
	for (let i = 0; i < n; i++) {
		b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
		b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
	}
	writeFileSync(path, b);
}
const db = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf');

const names = await page.evaluate(() => FetihAudio.Sfx.names);
const extra = { wheel: {}, combo: { n: 3 }, right: { n: 3 }, tick: { left: 1.5 }, banner: {}, march: {}, fireworks: {} };
const rows = [];
console.log('\nEFEKTLER (44.1 kHz, ana hat: sıkıştırıcı + yumuşak sınırlayıcı sonrası)');
console.log('ad'.padEnd(11) + 'tepe dBFS  RMS dBFS  başl ms  bitiş ms  render ms  NaN');
for (const n of names) {
	const r = await page.evaluate(([n, x]) => window.renderSfx(n, x, 6), [n, extra[n] || {}]);
	rows.push({ n, ...r.m, ok: r.ok, ms: r.ms });
	wav(join(outDir, `sfx_${n}.wav`), r.L, r.R);
	console.log(n.padEnd(11) + `${db(r.m.peak).padStart(9)}  ${db(r.m.rms).padStart(8)}  ${String(Math.round(r.m.startMs)).padStart(7)}  ${String(Math.round(r.m.endMs)).padStart(8)}  ${r.ms.toFixed(0).padStart(9)}  ${r.m.nan}  ${r.ok ? '' : 'ÇALINMADI'}`);
}
// farklı varyantlar
console.log('\nVARYANTLAR');
for (const [n, x] of [['tick', { left: 3 }], ['tick', { left: 0.8 }], ['tick', {}], ['right', { n: 0 }], ['right', { n: 6 }], ['combo', { n: 1 }], ['combo', { n: 8 }], ['banner', { short: true }], ['banner', { tone: 'bad' }], ['march', { dur: 3 }]]) {
	const r = await page.evaluate(([n, x]) => window.renderSfx(n, x, 6), [n, x]);
	console.log(`${n} ${JSON.stringify(x)}`.padEnd(30) + `tepe ${db(r.m.peak)} dBFS  RMS ${db(r.m.rms)} dBFS`);
}

console.log('\nMÜZİK (20 sn)');
console.log('tema'.padEnd(9) + 'tepe dBFS  RMS dBFS  1sn-RMS aralık dBFS   render ms (gerçek zaman çarpanı)  NaN');
const mus = [];
for (const th of ['menu', 'match', 'siege', 'victory']) {
	const len = 20;
	const r = await page.evaluate(([th, len]) => window.renderMusic(th, len, false), [th, len]);
	const lowR = await page.evaluate(([th, len]) => window.renderMusic(th, len, true), [th, len]);
	mus.push({ th, ...r.m });
	wav(join(outDir, `music_${th}.wav`), r.L, r.R);
	console.log(th.padEnd(9) + `${db(r.m.peak).padStart(9)}  ${db(r.m.rms).padStart(8)}  ${(db(r.m.minWin) + ' .. ' + db(r.m.maxWin)).padStart(20)}   ${r.ms.toFixed(0).padStart(6)} ms (x${(len * 1000 / r.ms).toFixed(0)})  düşük: ${db(lowR.m.rms)} dBFS RMS, ${lowR.ms.toFixed(0)} ms   ${r.m.nan}`);
}

console.log('\nTEL PERDE DOĞRULUĞU (otokorelasyon)');
for (const [k, f] of [['baglama', 293.66], ['baglama', 311.1], ['kanun', 440], ['kanun', 880], ['baglama', 146.8], ['kanun', 1318.5]]) {
	const r = await page.evaluate(([k, f]) => window.pitchTest(k, f), [k, f]);
	console.log(`${k} ${f} Hz -> ${r.got.toFixed(2)} Hz  (${r.cents.toFixed(1)} sent)`);
}

writeFileSync(join(outDir, 'rapor.json'), JSON.stringify({ rows, mus }, null, 1));
if (errors.length) console.log('\nHATA:', errors.slice(0, 8));
await browser.close();
console.log('\nWAV ve rapor:', outDir);
