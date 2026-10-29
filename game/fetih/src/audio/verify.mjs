// Ses doğrulama (başsız Chromium): her müzik temasını ve her efekti GERÇEK pişirme hattından (bake.js) geçirir, tepe/RMS,
// kırpılma, NaN, uç tıkırtısı, döngü dikişi ve tayf dengesini ölçer; WAV dosyaları yazar. Ardından oyunun canlı hattını
// (sıkıştırıcı + sınırlayıcı + ducking) çevrimdışı çalıştırıp karışımı sınar.
//
//   node src/audio/verify.mjs [çıkışKlasörü] [--only=sfx,music,mix,game] [--low] [--no-wav]
//
// Gerekli: node_modules (esbuild, playwright-core) ve Chromium (/opt/pw-browsers; CHROMIUM ortam değişkeniyle de verilir).
// --game: dist/FetihLigi.html'i açar (önce `node build.mjs --dev`), gerçek bir tıklamayla sesi açar, ekranları gezip tema
//   geçişlerini, sessiz düğmesini ve hata çıkmadığını denetler.
// Çıkış kodu: 0 = hepsi geçti, 1 = en az bir denetim başarısız.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const outDir = args.find((a) => !a.startsWith('--')) || join(here, '../../.audio-out');
const ONLY = new Set((opt.only || 'sfx,music,mix').split(','));
const LOW = 'low' in opt;
const WAV = !('no-wav' in opt);
mkdirSync(outDir, { recursive: true });

let fails = 0;
const bad = (msg) => {
	fails++;
	console.log('  BAŞARISIZ: ' + msg);
};

// ---------------------------------------------------------------- 1) besteleme (düğümde, tarayıcısız)
const songs = await import(join(here, 'songs.js'));
console.log('PARÇALAR (besteleme, tarayıcısız)');
for (const n of songs.THEME_NAMES) {
	try {
		const c = songs.compose(n);
		const kinds = {};
		for (const e of c.ev) kinds[e.k] = (kinds[e.k] || 0) + 1;
		console.log(`  ${n.padEnd(9)} ${c.T.makam.padEnd(8)} ${String(c.T.bpm).padStart(3)} bpm  ${c.bs} adım x ${c.T.bars} ölçü = ${c.L.toFixed(2)} sn  olay ${String(c.ev.length).padStart(4)}  katman ${c.stems}  ${JSON.stringify(kinds)}`);
		for (const e of c.ev) {
			if (!(e.t >= 0 && e.t < c.L)) bad(`${n}: olay döngü dışında (${e.t})`);
			const hz = e.f || (e.fs && e.fs[0]);
			if (hz && (hz < 30 || hz > 5000)) bad(`${n}: perde aralık dışı ${hz.toFixed(1)} Hz (${e.k})`);
		}
	} catch (err) {
		bad(`${n}: ${err.message}`);
	}
}

if (!ONLY.has('sfx') && !ONLY.has('music') && !ONLY.has('mix') && !ONLY.has('game') && !('parts' in opt)) process.exit(fails ? 1 : 0);

// ---------------------------------------------------------------- 2) tarayıcı
const bundle = await build({
	stdin: {
		contents: `export * from './sfx.js'; export * from './bake.js'; export * from './songs.js'; export * from './sounds.js'; export * from './dsp.js'; export { Engine } from './engine.js'; export { Bank } from './bank.js';`,
		resolveDir: here,
	},
	bundle: true,
	format: 'iife',
	globalName: 'FA',
	write: false,
	target: 'es2020',
});
const code = bundle.outputFiles[0].text;

const exe =
	process.env.CHROMIUM ||
	process.env.CHROME ||
	['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: code });

// sayfada çalışacak ölçüm kodu
await page.evaluate(() => {
	const db = (v) => (v > 0 ? 20 * Math.log10(v) : -200);
	// radix-2 FFT (yerinde), N = 2'nin kuvveti
	const fft = (re, im) => {
		const n = re.length;
		for (let i = 1, j = 0; i < n; i++) {
			let bit = n >> 1;
			for (; j & bit; bit >>= 1) j ^= bit;
			j ^= bit;
			if (i < j) {
				[re[i], re[j]] = [re[j], re[i]];
				[im[i], im[j]] = [im[j], im[i]];
			}
		}
		for (let len = 2; len <= n; len <<= 1) {
			const ang = (-2 * Math.PI) / len;
			const wr = Math.cos(ang);
			const wi = Math.sin(ang);
			for (let i = 0; i < n; i += len) {
				let cr = 1;
				let ci = 0;
				for (let k = 0; k < len / 2; k++) {
					const a = i + k;
					const b = a + len / 2;
					const tr = re[b] * cr - im[b] * ci;
					const ti = re[b] * ci + im[b] * cr;
					re[b] = re[a] - tr;
					im[b] = im[a] - ti;
					re[a] += tr;
					im[a] += ti;
					const nr = cr * wr - ci * wi;
					ci = cr * wi + ci * wr;
					cr = nr;
				}
			}
		}
	};
	// tayf: oktav bantlarında enerji (dB, en yüksek banda göre) ve ağırlık merkezi
	const spectrum = (m, sr) => {
		const N = 2048;
		const edges = [45, 90, 180, 355, 710, 1400, 2800, 5600, 11200, Infinity]; // oktav bantları: ~63 125 250 500 1k 2k 4k 8k 16k
		const acc = new Float64Array(edges.length);
		let cen = 0;
		let tot = 0;
		const re = new Float64Array(N);
		const im = new Float64Array(N);
		const hop = Math.max(N, Math.floor(m.length / 60));
		for (let s = 0; s + N <= m.length; s += hop) {
			for (let i = 0; i < N; i++) {
				re[i] = m[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
				im[i] = 0;
			}
			fft(re, im);
			for (let k = 1; k < N / 2; k++) {
				const f = (k * sr) / N;
				const p = re[k] * re[k] + im[k] * im[k];
				let b = 0;
				while (f >= edges[b]) b++;
				acc[b] += p;
				cen += p * f;
				tot += p;
			}
		}
		const mx = Math.max(...acc, 1e-30);
		// bantlar: <90 | 90-180 | 180-355 | 355-710 | 710-1.4k | 1.4-2.8k | 2.8-5.6k | 5.6-11k | >11k  (en güçlü banda göre dB)
		const oct = Array.from(acc.slice(1), (v) => Math.round(10 * Math.log10(v / mx + 1e-12)));
		return { bands: Array.from(acc, (v) => (tot > 0 ? Math.round((v / tot) * 1000) / 10 : 0)), oct, centroid: tot > 0 ? Math.round(cen / tot) : 0 };
	};
	window.measure = (L, R, sr) => {
		const n = L.length;
		let peak = 0;
		let sum = 0;
		let nan = 0;
		let clip = 0;
		let dc = 0;
		let first = -1;
		let last = -1;
		const mono = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const a = L[i];
			const b = R ? R[i] : a;
			if (a !== a || b !== b) {
				nan++;
				continue;
			}
			const m = Math.max(Math.abs(a), Math.abs(b));
			if (m > peak) peak = m;
			if (m >= 0.9999) clip++;
			if (m > 0.001) {
				if (first < 0) first = i;
				last = i;
			}
			dc += (a + b) / 2;
			sum += (a * a + b * b) / 2;
			mono[i] = (a + b) / 2;
		}
		const rms = Math.sqrt(sum / n);
		// uç tıkırtısı: ilk/son örnek ve ilk 2 ms'deki en büyük sıçrama
		const k2 = Math.max(2, Math.floor(0.002 * sr));
		let jump = 0;
		for (let i = 1; i < Math.min(n, k2); i++) jump = Math.max(jump, Math.abs(L[i] - L[i - 1]));
		const sp = spectrum(mono, sr);
		return {
			peak,
			rms,
			nan,
			clip,
			dc: dc / n,
			dur: n / sr,
			active: first < 0 ? 0 : (last - first) / sr,
			startAbs: Math.max(Math.abs(L[0]), R ? Math.abs(R[0]) : 0),
			endAbs: Math.max(Math.abs(L[n - 1]), R ? Math.abs(R[n - 1]) : 0),
			startJump: jump,
			bands: sp.bands,
			oct: sp.oct,
			centroid: sp.centroid,
		};
	};
	// döngü dikişi: son ve ilk örnek sıçraması, ortalama komşu farkına oranla; dikiş çevresi RMS oranı
	window.seam = (L, R, sr) => {
		const n = L.length;
		let md = 0;
		for (let i = 1; i < n; i++) md += Math.abs(L[i] - L[i - 1]);
		md /= n - 1;
		const jump = Math.max(Math.abs(L[0] - L[n - 1]), Math.abs(R[0] - R[n - 1]));
		const w = Math.floor(0.05 * sr);
		const rm = (a, i0, i1) => {
			let s = 0;
			for (let i = i0; i < i1; i++) s += a[i] * a[i];
			return Math.sqrt(s / (i1 - i0));
		};
		const tail = rm(L, n - w, n) + rm(R, n - w, n);
		const head = rm(L, 0, w) + rm(R, 0, w);
		return { jumpRatio: md > 0 ? jump / md : 0, levelRatioDb: db(head / Math.max(1e-9, tail)) };
	};
	const b64 = (i16) => {
		const u8 = new Uint8Array(i16.buffer, i16.byteOffset, i16.byteLength);
		let s = '';
		for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
		return btoa(s);
	};
	window.pack = (L, R) => {
		const n = L.length;
		const i16 = new Int16Array(n * 2);
		for (let i = 0; i < n; i++) {
			i16[2 * i] = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767)));
			i16[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round((R ? R[i] : L[i]) * 32767)));
		}
		return b64(i16);
	};
	window.tryBake = async (fn) => {
		const t0 = performance.now();
		try {
			const r = await fn();
			return { r, ms: performance.now() - t0 };
		} catch (e) {
			return { err: String((e && e.stack) || e), ms: performance.now() - t0 };
		}
	};
});

function wav(path, b64, sr) {
	const pcm = Buffer.from(b64, 'base64');
	const h = Buffer.alloc(44);
	h.write('RIFF', 0);
	h.writeUInt32LE(36 + pcm.length, 4);
	h.write('WAVE', 8);
	h.write('fmt ', 12);
	h.writeUInt32LE(16, 16);
	h.writeUInt16LE(1, 20);
	h.writeUInt16LE(2, 22);
	h.writeUInt32LE(sr, 24);
	h.writeUInt32LE(sr * 4, 28);
	h.writeUInt16LE(4, 32);
	h.writeUInt16LE(16, 34);
	h.write('data', 36);
	h.writeUInt32LE(pcm.length, 40);
	writeFileSync(path, Buffer.concat([h, pcm]));
}
const dbs = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf');
const report = { sfx: [], music: [], mix: null, game: null };

// ---------------------------------------------------------------- 3) efektler
if (ONLY.has('sfx')) {
	const samples = { tick: { speed: 600 }, count: { left: 3 }, answered: { player: 2 }, tap: {}, fireworks: {}, combo: { n: 3 } };
	const jobs = await page.evaluate(() => {
		const out = [];
		for (const n of FA.SOUND_NAMES) {
			const def = FA.SOUNDS[n];
			const vs = def.all ? def.all() : [{}];
			if (def.all && vs.length === 0) vs.push({});
			for (const o of vs) {
				const v = def.variant ? def.variant(o) : {};
				const tag = Object.keys(v)
					.map((k) => v[k])
					.join('_');
				out.push({ n, o, v, tag: tag === '' ? '' : tag.replace(/[^\wÇĞİÖŞÜçğıöşü.-]/g, '_') });
			}
		}
		return out;
	});
	console.log(`\nEFEKTLER (pişmiş tampon: ${jobs.length} ses ve değişken; tepe hedefi sesin kendi peak değeri)`);
	console.log('ad'.padEnd(24) + 'sr    süre   tepe   RMS   kırp NaN  baş/son   merkez  oktav dB (90-180|180-355|355-710|710-1.4k|1.4-2.8k|2.8-5.6k|5.6-11k)  pişme ms');
	for (const j of jobs) {
		const o = { ...(samples[j.n] || {}), ...j.v };
		const res = await page.evaluate(
			async ([n, o, low]) => {
				const { r, ms, err } = await window.tryBake(() => FA.renderSfx(n, o, { low }));
				if (err) return { err, ms };
				if (!r) return { err: 'tarif yok', ms };
				const m = window.measure(r.L, r.R || r.L, r.sr);
				return { m, ms, sr: r.sr, mono: !r.R, pcm: window.pack(r.L, r.R || r.L), gain: r.gain };
			},
			[j.n, o, LOW],
		);
		const label = j.n + (j.tag ? ':' + j.tag : '');
		if (res.err) {
			bad(`${label}: pişirme hatası ${res.err.slice(0, 200)}`);
			continue;
		}
		const m = res.m;
		report.sfx.push({ name: label, ...m, ms: res.ms, mono: res.mono });
		console.log(
			label.padEnd(24) +
				`${String(res.sr / 1000).padStart(2)}k ${m.dur.toFixed(2).padStart(5)}s ${dbs(m.peak).padStart(6)} ${dbs(m.rms).padStart(6)}  ${String(m.clip).padStart(3)} ${m.nan}   ${m.startAbs.toFixed(3)}/${m.endAbs.toFixed(3)}  ${String(m.centroid).padStart(5)}  ${m.oct.slice(0, 7).map((x) => String(x).padStart(4)).join(' ')}  ${res.ms.toFixed(0).padStart(5)}${res.mono ? ' mono' : ''}`,
		);
		if (m.nan) bad(`${label}: NaN`);
		if (m.clip) bad(`${label}: kırpılma (${m.clip} örnek)`);
		if (m.peak > 0.985) bad(`${label}: tepe çok yüksek ${dbs(m.peak)} dBFS`);
		if (m.peak < 0.05) bad(`${label}: neredeyse sessiz (${dbs(m.peak)} dBFS)`);
		if (m.startAbs > 0.02) bad(`${label}: başlangıç tıkırtısı (ilk örnek ${m.startAbs.toFixed(3)})`);
		if (m.endAbs > 0.01) bad(`${label}: bitiş tıkırtısı (son örnek ${m.endAbs.toFixed(3)})`);
		if (Math.abs(m.dc) > 0.01) bad(`${label}: DC kayması ${m.dc.toFixed(4)}`);
		if (m.dur > 6) bad(`${label}: çok uzun (${m.dur.toFixed(1)} sn)`);
		if (WAV) wav(join(outDir, `sfx_${j.n}${j.tag ? '_' + j.tag : ''}.wav`), res.pcm, res.sr);
	}
	const totalBytes = report.sfx.reduce((a, m) => a + (m.mono ? 1 : 2) * m.dur * (LOW ? 24000 : 32000) * 4, 0);
	console.log(`  toplam bellek (tahmini, hepsi yerleşik): ${(totalBytes / 1e6).toFixed(1)} MB; pişme toplam ${(report.sfx.reduce((a, m) => a + m.ms, 0) / 1000).toFixed(1)} sn (masaüstü)`);
}

// ---------------------------------------------------------------- 4) müzik
if (ONLY.has('music')) {
	console.log('\nMÜZİK (kusursuz döngü; her katman ayrı; WAV iki tur art arda yazılır: dikişi duymak için)');
	console.log('tema'.padEnd(10) + 'sr    döngü   tepe   RMS    kırp  dikiş(sıçrama,seviye dB)  merkez  oktav bantları dB (90-180|180-355|355-710|710-1.4k|1.4-2.8k|2.8-5.6k|5.6-11k)  pişme ms  bellek MB');
	const names = await page.evaluate(() => FA.THEME_NAMES);
	for (const th of names) {
		const res = await page.evaluate(
			async ([th, low]) => {
				const { r, ms, err } = await window.tryBake(() => FA.renderTheme(th, { low }));
				if (err) return { err, ms };
				const out = { ms, sr: r.sr, len: r.len, P: r.P, gain: r.gain, hot: r.hot, stems: [] };
				r.stems.forEach((st, i) => {
					const m = window.measure(st.L, st.R, r.sr);
					const sm = window.seam(st.L, st.R, r.sr);
					// iki tur art arda (dikişi duyurmak için)
					const n = st.L.length;
					const L2 = new Float32Array(n * 2);
					const R2 = new Float32Array(n * 2);
					L2.set(st.L);
					L2.set(st.L, n);
					R2.set(st.R);
					R2.set(st.R, n);
					out.stems.push({ m, sm, pcm: window.pack(L2, R2) });
				});
				return out;
			},
			[th, LOW],
		);
		if (res.err) {
			bad(`${th}: pişirme hatası ${res.err.slice(0, 300)}`);
			continue;
		}
		const bytes = res.stems.length * res.len * res.sr * 2 * 4;
		res.stems.forEach((st, i) => {
			const m = st.m;
			const sm = st.sm;
			const tag = i === 0 ? th : th + '+hot';
			report.music.push({ name: tag, ...m, seam: sm, ms: res.ms, bytes });
			console.log(
				tag.padEnd(10) +
					`${String(res.sr / 1000).padStart(2)}k ${res.len.toFixed(2).padStart(6)}s ${dbs(m.peak).padStart(6)} ${dbs(m.rms).padStart(6)}  ${String(m.clip).padStart(4)}   ${sm.jumpRatio.toFixed(1).padStart(5)}x ${sm.levelRatioDb.toFixed(1).padStart(6)}        ${String(m.centroid).padStart(5)}  ${m.oct.slice(0, 7).map((x) => String(x).padStart(4)).join(' ')}   ${i === 0 ? res.ms.toFixed(0).padStart(7) : '       '}  ${i === 0 ? (bytes / 1e6).toFixed(1) : ''}`,
			);
			if (m.nan) bad(`${tag}: NaN`);
			if (m.clip) bad(`${tag}: kırpılma (${m.clip} örnek)`);
			if (m.peak > 0.985) bad(`${tag}: tepe çok yüksek`);
			if (m.rms < 0.01) bad(`${tag}: çok sessiz`);
			if (i === 0 && m.rms > 0.25) bad(`${tag}: çok gürültülü (RMS ${dbs(m.rms)} dBFS)`);
			if (sm.jumpRatio > 12) bad(`${tag}: döngü dikişinde sıçrama (${sm.jumpRatio.toFixed(1)}x ortalama fark)`);
			if (Math.abs(m.dc) > 0.01) bad(`${tag}: DC kayması`);
			if (WAV) wav(join(outDir, `music_${tag.replace('+', '_')}.wav`), st.pcm, res.sr);
		});
	}
}

// ---------------------------------------------------------------- 4b) parça başına seviye (karışım dengesi; --parts)
if ('parts' in opt) {
	console.log('\nPARÇA BAŞINA SEVİYE (kuru, tek başına; K ağırlıklı dBFS, tepe dBFS; oktav dB 90-180|180-355|355-710|710-1.4k|1.4-2.8k|2.8-5.6k|5.6-11k)');
	const names = await page.evaluate(() => FA.THEME_NAMES);
	for (const th of names) {
		const info = await page.evaluate(([th]) => FA.compose(th).T.parts.map((p, i) => ({ i, s: p.s || 0, t: p.t, ins: p.ins || '', vol: p.vol === undefined ? '' : p.vol })), [th]);
		console.log(`  ${th}`);
		for (const p of info) {
			const r = await page.evaluate(
				async ([th, i]) => {
					const d = await FA.renderDry(th, [i], {});
					const k = FA.loudness(d.L, d.R, d.sr);
					const m = window.measure(d.L, d.R, d.sr);
					return { k: 20 * Math.log10(k + 1e-9), peak: m.peak, oct: m.oct, cen: m.centroid };
				},
				[th, p.i],
			);
			console.log(`    ${String(p.i).padStart(2)} ${(p.s ? 'hot ' : '') + p.t + ' ' + p.ins}`.padEnd(26) + ` vol ${String(p.vol).padEnd(5)} K ${r.k.toFixed(1).padStart(6)}  tepe ${dbs(r.peak).padStart(6)}  ${r.oct.slice(0, 7).map((x) => String(x).padStart(4)).join(' ')}  merkez ${r.cen}`);
		}
	}
}

// ---------------------------------------------------------------- 5) karışım: canlı hat (sıkıştırıcı, sınırlayıcı, ducking)
if (ONLY.has('mix')) {
	console.log('\nKARIŞIM (canlı hat çevrimdışı: tema + efektler, ducking ve toplam tepe)');
	const mix = await page.evaluate(
		async ([low]) => {
			const SR = 44100;
			const LEN = 34;
			const ctx = new OfflineAudioContext(2, SR * LEN, SR);
			const s = new FA.Sfx({}, { ctx, persist: false, low, bake: true, preload: false });
			// pişirilmiş tamponları bankaya koy (gerçek çalma yolu sınanır)
			const need = [
				['banner', { title: 'FETİH' }],
				['castle', {}],
				['question', {}],
				['right', { n: 2 }],
				['wrong', {}],
				['attack', {}],
				['conquer', {}],
				['win', {}],
				['tap', {}],
			];
			for (const [n, o] of need) {
				const def = FA.SOUNDS[n];
				const v = def.variant ? def.variant(o) : {};
				let k = def.variant ? n + ':' : n;
				if (def.variant) for (const x in v) k += x + '=' + v[x] + ',';
				const r = await FA.renderSfx(n, v, { low });
				s.bank.sfx.set(k, { buf: FA.sfxToBuffer(r), dur: r.dur, gain: r.gain });
			}
			for (const th of ['duel', 'victory']) {
				const r = await FA.renderTheme(th, { low });
				s.bank.music.set(th, { stems: FA.toBuffers(r), len: r.len, sr: r.sr, sync: r.sync, hot: r.hot, bytes: 0, used: 0 });
			}
			const ev = [];
			s.music('duel');
			// 4-9 sn: sessiz arka plan; 8: hot katman açılır; 12: büyük an (conquer); 17: kısa ses yığını; 20: zafer
			const at = (t, n, o) => ev.push([t, n, o]);
			at(2.0, 'banner', { title: 'FETİH' });
			at(6.0, 'question', {});
			at(9.0, 'right', { n: 2 });
			at(10.2, 'wrong', {});
			at(12.0, 'conquer', {});
			at(16.0, 'castle', {});
			for (let i = 0; i < 10; i++) at(18 + i * 0.07, 'tap', {});
			at(18.2, 'attack', {});
			at(18.25, 'right', { n: 2 });
			at(18.3, 'wrong', {});
			at(18.35, 'castle', {});
			at(18.4, 'conquer', {});
			at(24.0, 'win', {});
			const res = [];
			for (const [t, n, o] of ev) res.push(s.play(n, { ...o, at: t }));
			ctx.suspend(8.0).then(() => {
				s.intensity(1);
				ctx.resume();
			});
			const buf = await ctx.startRendering();
			const L = buf.getChannelData(0);
			const R = buf.getChannelData(1);
			// 0.5 sn pencerelerde RMS ve tepe (zaman çizgisi)
			const win = SR / 2;
			const tl = [];
			for (let i = 0; i + win <= L.length; i += win) {
				let s2 = 0;
				let p = 0;
				for (let j = i; j < i + win; j++) {
					const a = L[j];
					const b = R[j];
					s2 += (a * a + b * b) / 2;
					p = Math.max(p, Math.abs(a), Math.abs(b));
				}
				tl.push([+(i / SR).toFixed(1), +(20 * Math.log10(Math.sqrt(s2 / win) + 1e-9)).toFixed(1), +(20 * Math.log10(p + 1e-9)).toFixed(1)]);
			}
			const m = window.measure(L, R, SR);
			return { res, tl, m, pcm: window.pack(L, R), played: s.debug() };
		},
		[LOW],
	);
	const m = mix.m;
	console.log(`  oynatma sonuçları: ${mix.res.map((x) => (x ? '1' : '0')).join('')}  (hepsi 1 olmalı)`);
	console.log(`  toplam: tepe ${dbs(m.peak)} dBFS, RMS ${dbs(m.rms)} dBFS, kırpılan örnek ${m.clip}, NaN ${m.nan}`);
	console.log('  zaman çizgisi (sn, RMS dBFS, tepe dBFS):');
	console.log('   ' + mix.tl.map(([t, r, p]) => `${t}:${r}/${p}`).join('  '));
	report.mix = { peak: m.peak, rms: m.rms, clip: m.clip, tl: mix.tl };
	if (mix.res.some((x) => !x)) bad('karışım: bazı sesler çalınamadı (tepe değerlendirmesi eksik)');
	if (m.clip) bad(`karışım: kırpılma (${m.clip} örnek)`);
	if (m.peak > 0.99) bad('karışım: tepe 0 dBFS yakını');
	if (m.nan) bad('karışım: NaN');
	// musiki seviyesi (ilk 2 sn): efektlerin altında kalmalı
	const base = mix.tl.filter(([t]) => t < 2)[1];
	const big = mix.tl.filter(([t]) => t >= 12 && t < 13)[0];
	if (base && big) console.log(`  müzik tek başına ~${base[1]} dBFS RMS; 'conquer' anında ${big[1]} dBFS RMS (ducking dahil)`);
	if (WAV) wav(join(outDir, 'mix_duel_sfx.wav'), mix.pcm, 44100);
}

// ---------------------------------------------------------------- 6) tel perdesi doğruluğu (Karplus-Strong)
if (ONLY.has('sfx')) {
	console.log('\nTEL PERDE DOĞRULUĞU (otokorelasyon)');
	for (const [k, f] of [['baglama', 293.66], ['baglama', 311.1], ['kanun', 440], ['kanun', 880], ['baglama', 146.8], ['tambur', 73.4], ['kanun', 1318.5]]) {
		const r = await page.evaluate(
			async ([k, f]) => {
				const SR = 44100;
				const ctx = new OfflineAudioContext(1, SR, SR);
				const e = new FA.Engine({ ctx });
				e.pluck(k, f, 0.01, 0.8);
				const buf = await ctx.startRendering();
				const x = buf.getChannelData(0).subarray(Math.floor(SR * 0.05), Math.floor(SR * 0.45));
				const lag0 = SR / f;
				let best = 0;
				let bl = 0;
				for (let l = Math.floor(lag0 * 0.9); l <= Math.ceil(lag0 * 1.1); l += 0.05) {
					let c = 0;
					let n = 0;
					for (let i = 0; i + Math.ceil(l) + 1 < x.length; i += 2) {
						const j = i + l;
						const q = Math.floor(j);
						const fr = j - q;
						c += x[i] * (x[q] * (1 - fr) + x[q + 1] * fr);
						n++;
					}
					if (c / n > best) {
						best = c / n;
						bl = l;
					}
				}
				const got = SR / bl;
				return { got, cents: 1200 * Math.log2(got / f) };
			},
			[k, f],
		);
		console.log(`  ${k} ${f} Hz -> ${r.got.toFixed(2)} Hz  (${r.cents.toFixed(1)} sent)`);
		if (Math.abs(r.cents) > 30) bad(`${k} ${f} Hz perde sapması ${r.cents.toFixed(1)} sent`);
	}
}

// ---------------------------------------------------------------- 7) oyun entegrasyonu (--game)
if (ONLY.has('game')) {
	const gamePage = await browser.newPage({ viewport: { width: 412, height: 892 } });
	const gerrs = [];
	gamePage.on('pageerror', (e) => gerrs.push(String(e)));
	gamePage.on('console', (m) => m.type() === 'error' && !/WebGL|GPU|swiftshader|GL_/i.test(m.text()) && gerrs.push(m.text()));
	const url = 'file://' + resolve(here, '../../dist/FetihLigi.html') + '?debug&q=0';
	console.log('\nOYUN ENTEGRASYONU (' + url + ')');
	await gamePage.goto(url);
	await gamePage.waitForFunction(() => window.__fl, null, { timeout: 240000 });
	const st0 = await gamePage.evaluate(() => window.__fl.app.sfx.debug());
	console.log('  açılışta:', JSON.stringify({ ctx: st0.ctx, muted: st0.muted, want: st0.want, canBake: st0.canBake }));
	if (st0.ctx !== null) bad('oyun: jest gelmeden AudioContext kuruldu (iOS kilidi bozulur)');
	// gerçek bir dokunuş: sesi açar
	await gamePage.mouse.click(206, 440);
	await gamePage.waitForTimeout(600);
	const st1 = await gamePage.evaluate(() => window.__fl.app.sfx.debug());
	console.log('  ilk dokunuştan sonra:', JSON.stringify({ ctx: st1.ctx, want: st1.want, queue: st1.queue }));
	if (st1.ctx !== 'running') bad(`oyun: ilk dokunuştan sonra bağlam çalışmıyor (${st1.ctx})`);
	// menü müziği pişsin
	await gamePage.waitForFunction(() => window.__fl.app.sfx.debug().music.includes('menu'), null, { timeout: 120000 });
	await gamePage.waitForFunction(() => window.__fl.app.sfx.debug().playing === 'menu', null, { timeout: 20000 }).catch(() => {});
	const st2 = await gamePage.evaluate(() => window.__fl.app.sfx.debug());
	console.log('  menü müziği:', JSON.stringify({ playing: st2.playing, music: st2.music, sfx: st2.sfx, running: st2.running }));
	if (st2.playing !== 'menu') bad('oyun: menü teması çalmıyor');
	const seq = await gamePage.evaluate(async () => {
		const a = window.__fl.app;
		const ui = a.ui;
		const out = {};
		const wait = (ms) => new Promise((r) => setTimeout(r, ms));
		const th = () => a.sfx.debug().playing;
		// ekran geçişleri (gerçek UI yöntemleri)
		ui.showMenu();
		await wait(300);
		out.menu = a.sfx.want;
		ui.showCampaign();
		await wait(300);
		out.campaign = a.sfx.want;
		ui.title(true);
		await wait(300);
		out.title = a.sfx.want;
		// sessiz düğmesi
		const btn = ui.el.querySelector('[data-snd]');
		out.btn = !!btn;
		if (btn) {
			btn.click();
			await wait(200);
			out.muted = a.sfx.muted;
			out.pressed = btn.getAttribute('aria-pressed');
			out.stored = JSON.stringify(a.store.get('audio'));
			btn.click();
			await wait(200);
			out.unmuted = !a.sfx.muted;
		}
		return out;
	});
	console.log('  ekran geçişleri:', JSON.stringify(seq));
	if (seq.menu !== 'menu') bad(`oyun: showMenu sonrası tema ${seq.menu}`);
	if (seq.campaign !== 'campaign') bad(`oyun: showCampaign sonrası tema ${seq.campaign}`);
	if (seq.title !== 'menu') bad(`oyun: title(true) sonrası tema ${seq.title}`);
	if (!seq.btn) bad('oyun: sessiz düğmesi bulunamadı');
	else if (!seq.muted || seq.pressed !== 'true' || !/"x":1/.test(seq.stored || '')) bad('oyun: sessiz düğmesi durumu/kalıcılığı çalışmıyor');
	else if (!seq.unmuted) bad('oyun: sessiz düğmesi geri açmıyor');
	if (gerrs.length) {
		console.log('  sayfa hataları:', gerrs.slice(0, 6));
		bad('oyun: sayfa hatası');
	}
	report.game = { st0, st1, st2, seq };
	await gamePage.close();
}

writeFileSync(join(outDir, 'rapor.json'), JSON.stringify(report, null, 1));
if (errors.length) {
	console.log('\nSAYFA HATALARI:', errors.slice(0, 8));
	bad('doğrulama sayfasında hata');
}
await browser.close();
console.log(`\n${fails ? 'BAŞARISIZ: ' + fails + ' denetim' : 'HEPSİ GEÇTİ'}  (WAV ve rapor: ${outDir})`);
process.exit(fails ? 1 : 0);
