// Yankı evrişimi, saf JS (ses işçisinde): tarayıcının ConvolverNode'u ile aynı sonuç, ana iş parçacığına hiç dokunmadan.
//
// Neden: ConvolverNode'a dürtü yanıtı atanırken (convolver.buffer = …) tarayıcı çekirdeği ana iş parçacığında, eşzamanlı
// hazırlar (~15 ms, 2,4 sn'lik yanıt). Her pişirmede bir kare kaçıyordu. Burada aynı dürtü yanıtı (reverb.js makeIR ile
// örnek örnek aynı) ve aynı normalleştirme (Web Audio: −58 dB kalibrasyon, 44,1 kHz'e göre ölçek, en az güç 0,000125)
// ile örtüşen-toplanan (overlap-add) FFT evrişimi yapılır. Stereo giriş + stereo yanıt: sol·sol, sağ·sağ (ConvolverNode gibi).

import { rng } from './dsp.js';

/** reverb.js makeIR'in birebir aynısı, AudioBuffer yerine Float32Array çifti üretir. */
export function irData(sr, { seconds = 2.2, rt60 = 1.9, pre = 0.014, seed = 5, bright = 0.85 } = {}) {
	const n = Math.floor(seconds * sr);
	const out = [];
	for (let ch = 0; ch < 2; ch++) {
		const d = new Float32Array(n);
		const r = rng(seed * 131 + ch * 7919);
		let lp = 0;
		const p0 = Math.floor(pre * sr);
		for (let i = p0; i < n; i++) {
			const t = (i - p0) / sr;
			const env = Math.exp((-6.9 * t) / rt60);
			const a = Math.max(0.08, bright * Math.exp(-t * 1.2));
			lp += (r() * 2 - 1 - lp) * a;
			const soft = t < 0.04 ? t / 0.04 : 1;
			d[i] = lp * env * soft;
		}
		for (let k = 0; k < 6; k++) {
			const at = Math.floor((0.014 + r() * 0.07) * sr);
			if (at < n) d[at] += (r() < 0.5 ? -1 : 1) * (0.5 - k * 0.06);
		}
		out.push(d);
	}
	return out;
}

/** Web Audio ConvolverNode normalleştirmesi (Chromium/WebKit Reverb::CalculateNormalizationScale). */
export function normScale(chans, sr) {
	let p = 0;
	let len = 0;
	for (const c of chans) {
		for (let i = 0; i < c.length; i++) p += c[i] * c[i];
		len = c.length;
	}
	p = Math.sqrt(p / (chans.length * len));
	if (!isFinite(p) || p < 0.000125) p = 0.000125;
	return (1 / p) * Math.pow(10, -58 * 0.05) * (44100 / sr);
}

// ---------------------------------------------------------------- FFT (yerinde, radix-2, karmaşık)
const TW = new Map();
function twiddles(n) {
	let t = TW.get(n);
	if (!t) {
		t = { c: new Float64Array(n / 2), s: new Float64Array(n / 2), rev: new Uint32Array(n) };
		for (let i = 0; i < n / 2; i++) {
			t.c[i] = Math.cos((2 * Math.PI * i) / n);
			t.s[i] = Math.sin((2 * Math.PI * i) / n);
		}
		const bits = Math.log2(n) | 0;
		for (let i = 0; i < n; i++) {
			let r = 0;
			for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
			t.rev[i] = r;
		}
		TW.set(n, t);
	}
	return t;
}

export function fft(re, im, inv = false) {
	const n = re.length;
	const { c, s, rev } = twiddles(n);
	for (let i = 0; i < n; i++) {
		const j = rev[i];
		if (j > i) {
			let x = re[i];
			re[i] = re[j];
			re[j] = x;
			x = im[i];
			im[i] = im[j];
			im[j] = x;
		}
	}
	const sg = inv ? 1 : -1;
	for (let size = 2; size <= n; size <<= 1) {
		const half = size >> 1;
		const step = n / size;
		for (let i = 0; i < n; i += size) {
			for (let j = 0, k = 0; j < half; j++, k += step) {
				const wr = c[k];
				const wi = sg * s[k];
				const a = i + j;
				const b = a + half;
				const xr = re[b] * wr - im[b] * wi;
				const xi = re[b] * wi + im[b] * wr;
				re[b] = re[a] - xr;
				im[b] = im[a] - xi;
				re[a] += xr;
				im[a] += xi;
			}
		}
	}
	if (inv) {
		for (let i = 0; i < n; i++) {
			re[i] /= n;
			im[i] /= n;
		}
	}
}

// yanıt tayfı önbelleği (aynı yanıt her efektte yeniden dönüştürülmesin)
const SPEC = new Map();
function irSpec(key, h, N) {
	const k = key + ':' + N;
	let sp = SPEC.get(k);
	if (!sp) {
		const re = new Float64Array(N);
		const im = new Float64Array(N);
		re.set(h);
		fft(re, im);
		SPEC.set(k, (sp = { re, im }));
	}
	return sp;
}

/** x ⊛ h (ilk x.length örnek; ConvolverNode çevrimdışı çiziminde olduğu gibi kuyruk kesilir), ölçek g. */
function convolve(x, h, g, key) {
	const n = x.length;
	const m = h.length;
	let N = 1;
	while (N < m * 2) N <<= 1;
	N = Math.max(N, 1 << 15);
	const B = N - m + 1; // blok boyu
	const H = irSpec(key, h, N);
	const y = new Float32Array(n);
	const re = new Float64Array(N);
	const im = new Float64Array(N);
	for (let p = 0; p < n; p += B) {
		re.fill(0);
		im.fill(0);
		const e = Math.min(n, p + B);
		let any = false;
		for (let i = p; i < e; i++) {
			const v = x[i];
			re[i - p] = v;
			if (v !== 0) any = true;
		}
		if (!any) continue; // sessiz blok (efektlerin çoğu kısa): atla
		fft(re, im);
		for (let i = 0; i < N; i++) {
			const a = re[i];
			const b = im[i];
			re[i] = a * H.re[i] - b * H.im[i];
			im[i] = a * H.im[i] + b * H.re[i];
		}
		fft(re, im, true);
		const lim = Math.min(N, n - p);
		for (let i = 0; i < lim; i++) y[p + i] += re[i] * g;
	}
	return y;
}

const IRC = new Map();
/** Islak karışıma yankı: { L, R } (aynı uzunlukta). */
export function reverbJS(wL, wR, sr, opts = {}) {
	const key = sr + JSON.stringify(opts);
	let ir = IRC.get(key);
	if (!ir) {
		const [hL, hR] = irData(sr, opts);
		ir = { hL, hR, g: normScale([hL, hR], sr) };
		IRC.set(key, ir);
	}
	return { L: convolve(wL, ir.hL, ir.g, key + 'L'), R: convolve(wR, ir.hR, ir.g, key + 'R') };
}
