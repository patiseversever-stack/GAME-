// JS sentez ve karıştırıcı (pişirme motoru). Hiçbir Web Audio düğümü kullanılmaz: örnek düzeyinde sentez + dizi toplama.
// Neden: çevrimdışı düğüm çizgesinde her düğüm her render diliminde dolaşılır; binlerce nota düğümü telefonda tek temayı
// onlarca saniyeye çıkarır. Örnek düzeyinde sentez ve nota önbelleği (aynı perde + süre bir kez üretilir) ~10 kat hızlıdır,
// ana iş parçacığında küçük dilimler halinde çalışır ve düğümde de (tarayıcısız) sınanabilir.
//
// JsEngine, canlı Engine ile aynı çağrıları sunar (hit, pluck, tone, noise, zurna, ney, horn, strings, choir, droneLoop);
// böylece sounds.js tarifleri ve besteler iki motorda da aynı çalışır. `to` burada hat adıdır (perc, string, wind, pad, fx).
import { rng, biquad, sweepBiquad, buildSample, pluckSample, BANK_RATE } from './dsp.js';
import { BUS } from './reverb.js';

const TAU = Math.PI * 2;
const C1200 = Math.LN2 / 1200;
const cents = (c) => Math.exp(c * C1200);
const dbq = (q) => Math.pow(10, q / 20); // lowpass/highpass Q'su Web Audio'da dB'dir

// ---------------------------------------------------------------- osilatörler (PolyBLEP: bant sınırlı testere/kare)
function blep(t, dt) {
	if (t < dt) {
		t /= dt;
		return t + t - t * t - 1;
	}
	if (t > 1 - dt) {
		t = (t - 1) / dt;
		return t * t + t + t + 1;
	}
	return 0;
}
const saw = (p, dt) => 2 * p - 1 - blep(p, dt);
const sqr = (p, dt) => (p < 0.5 ? 1 : -1) + blep(p, dt) - blep(p + 0.5 >= 1 ? p - 0.5 : p + 0.5, dt);
const tri = (p) => 1 - 4 * Math.abs(p - 0.5);

// ---------------------------------------------------------------- tek seferlik sentez işlevleri
/** Frekans süpürmeli, zarflı ses dalgası (Engine.tone ile aynı zarf: doğrusal atak, üstel sönüş). */
export function synthTone(sr, type, f0, f1, dur, vol, a, sweep, lp) {
	const n = Math.ceil((dur + 0.03) * sr);
	const x = new Float32Array(n);
	const sw = Math.max(1e-3, dur * (sweep || 1));
	const ratio = f1 && f1 !== f0 ? Math.max(20, f1) / f0 : 1;
	const aa = Math.max(1e-4, Math.min(a, dur * 0.9));
	const decay = Math.log(0.0001 / Math.max(vol, 0.0002));
	let ph = 0;
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		const f = ratio === 1 ? f0 : f0 * Math.pow(ratio, t < sw ? t / sw : 1);
		const dt = f / sr;
		ph += dt;
		if (ph >= 1) ph -= 1;
		const s = type === 'sine' ? Math.sin(TAU * ph) : type === 'triangle' ? tri(ph) : type === 'square' ? sqr(ph, dt) : saw(ph, dt);
		let g = 0;
		if (t < aa) g = vol * (t / aa);
		else if (t < dur) g = vol * Math.exp((decay * (t - aa)) / (dur - aa));
		x[i] = s * g;
	}
	return lp ? biquad(x, 'lp', lp, dbq(1), sr) : x;
}

const NTYPE = { lowpass: 'lp', highpass: 'hp', bandpass: 'bp' };

/** Süzgeçli gürültü: kesim f0→f1 üstel süpürme; zarf: doğrusal atak, isteğe bağlı tutma, üstel sönüş. */
export function synthNoise(r, sr, dur, vol, f0, f1, o = {}) {
	const n = Math.ceil((dur + 0.03) * sr);
	const w = new Float32Array(n);
	for (let i = 0; i < n; i++) w[i] = r() * 2 - 1;
	const type = NTYPE[o.type || 'bandpass'] || 'bp';
	const q = o.q === undefined ? 1 : o.q;
	const ql = type === 'bp' ? q : dbq(q);
	const ratio = f1 && f1 !== f0 ? Math.max(30, f1) / f0 : 1;
	const x = ratio === 1 ? biquad(w, type, f0, ql, sr) : sweepBiquad(w, type, (i) => f0 * Math.pow(ratio, Math.min(1, i / sr / dur)), ql, sr);
	const a = Math.max(1e-4, o.a === undefined ? 0.01 : o.a);
	const hold = Math.max(a, o.hold || 0);
	const decay = Math.log(0.0001 / Math.max(vol, 0.0002));
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		let g = 0;
		if (t < a) g = vol * (t / a);
		else if (t < hold) g = vol;
		else if (t < dur) g = vol * Math.exp((decay * (t - hold)) / Math.max(1e-3, dur - hold));
		x[i] *= g;
	}
	return x;
}

/** Zurna: çift kamış (testere + 11 sent detune), gırtlak süzgeçleri, gecikmeli titreşim, perdeye kayma ya da süs vuruşu. */
export function synthZurna(sr, f, dur, o, low) {
	const rel = 0.07;
	const n = Math.ceil((dur + rel + 0.12) * sr);
	const x = new Float32Array(n);
	const b0 = o.bend ? -o.bend : o.orn || 0;
	const rampT = o.orn ? 0.07 : 0.05;
	const vib = dur > 0.35;
	const r2 = cents(11);
	let p1 = 0;
	let p2 = 0;
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		let c = 0;
		if (b0 && t < rampT) c = b0 * (1 - t / rampT);
		if (vib && t >= 0.18) c += 18 * (t < 0.45 ? (t - 0.18) / 0.27 : 1) * Math.sin(TAU * 5.6 * t);
		const d1 = (c ? f * cents(c) : f) / sr;
		p1 += d1;
		if (p1 >= 1) p1 -= 1;
		let s = saw(p1, d1);
		if (low) s *= 0.8;
		else {
			const d2 = d1 * r2;
			p2 += d2;
			if (p2 >= 1) p2 -= 1;
			s = (s + saw(p2, d2)) * 0.55;
		}
		let g;
		if (t < 0.02) g = t / 0.02;
		else if (t < 0.12) g = 1 - 0.18 * ((t - 0.02) / 0.1);
		else if (t < dur) g = 0.82;
		else g = 0.82 * Math.max(0, 1 - (t - dur) / rel);
		x[i] = s * g;
	}
	let y = biquad(x, 'hp', 260, 0.9, sr);
	y = biquad(y, 'peak', 950, 3.5, sr, 9);
	y = biquad(y, 'peak', 2300, 3, sr, 7);
	return biquad(y, 'lp', o.bright ? 6500 : 4600, 0.9, sr);
}

/** Ney: sinüs + üçgen, nefes gürültüsü, yavaş atak, geç gelen titreşim, perdeye aşağıdan kayış. */
export function synthNey(sr, f, dur, o, low, r) {
	const att = o.attack === undefined ? 0.11 : o.attack;
	const rel = o.release || 0.25;
	const n = Math.ceil((dur + rel + 0.05) * sr);
	const x = new Float32Array(n);
	const sc = o.scoop === undefined ? -55 : -o.scoop;
	const vib = dur > 0.5;
	let p = 0;
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		let c = t < 0.14 ? sc * (1 - t / 0.14) : 0;
		if (vib && t >= 0.3) c += 22 * (t < 0.8 ? (t - 0.3) / 0.5 : 1) * Math.sin(TAU * 5.1 * t);
		p += (c ? f * cents(c) : f) / sr;
		if (p >= 1) p -= 1;
		x[i] = Math.sin(TAU * p) + 0.3 * tri(p);
	}
	const y = biquad(x, 'lp', Math.min(6000, f * 5), 0.9, sr);
	if (!low) {
		const w = new Float32Array(n);
		for (let i = 0; i < n; i++) w[i] = r() * 2 - 1;
		const b = biquad(w, 'bp', Math.min(7000, f * 2.02), 7, sr);
		for (let i = 0; i < n; i++) y[i] += b[i] * 0.9;
	}
	const tr = Math.max(att, dur - 0.05);
	const end = dur + rel;
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		const g = t < att ? t / att : t < tr ? 1 : Math.max(0, 1 - (t - tr) / (end - tr));
		y[i] *= g;
	}
	return y;
}

/** Boru/borazan: alçak, kalın, süzgeci açılan testere + kare. */
export function synthHorn(sr, f, dur, o) {
	const rel = 0.25;
	const n = Math.ceil((dur + rel + 0.05) * sr);
	const x = new Float32Array(n);
	const open = o.open || 1300;
	let p1 = 0;
	let p2 = 0;
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		const d1 = (t < 0.15 ? f * (0.97 + (0.03 * t) / 0.15) : f) / sr;
		p1 += d1;
		if (p1 >= 1) p1 -= 1;
		const d2 = (f * 1.004) / sr;
		p2 += d2;
		if (p2 >= 1) p2 -= 1;
		x[i] = saw(p1, d1) + 0.35 * sqr(p2, d2);
	}
	const y = sweepBiquad(x, 'lp', (i) => 220 * Math.pow(open / 220, Math.min(1, i / sr / (dur * 0.7))), dbq(2), sr);
	const att = Math.min(0.4, dur * 0.4);
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		y[i] *= t < att ? t / att : t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel);
	}
	return y;
}

/** Yaylı pad: detune'lu testereler, yavaş açılan alçak geçiren, yavaş atak ve bırakış. */
export function synthStrings(sr, freqs, dur, o, low) {
	const att = o.att === undefined ? 0.7 : o.att;
	const rel = o.rel === undefined ? 0.9 : o.rel;
	const bright = o.bright || 1800;
	const n = Math.ceil((dur + rel + 0.05) * sr);
	const x = new Float32Array(n);
	const per = low ? 1 : 2;
	const g0 = 0.5 / (freqs.length * per);
	for (const f of freqs) {
		for (let k = 0; k < per; k++) {
			const d = (per === 1 ? f : f * cents((k ? 1 : -1) * (6 + (f % 5)))) / sr;
			let p = k * 0.37;
			for (let i = 0; i < n; i++) {
				p += d;
				if (p >= 1) p -= 1;
				x[i] += saw(p, d) * g0;
			}
		}
	}
	const span = att + dur * 0.4;
	const y = sweepBiquad(x, 'lp', (i) => 500 + (bright - 500) * Math.min(1, i / sr / span), 0.75, sr, 64);
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		y[i] *= t < att ? t / att : t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel);
	}
	return y;
}

const VOWEL = { a: [800, 1150, 2900], o: [450, 800, 2830], u: [325, 700, 2530] };

/** Koro "aa/oo": testereler + gırtlak (formant) süzgeçleri, hafif titreşim, yavaş atak. */
export function synthChoir(sr, freqs, dur, o, low) {
	const att = o.att === undefined ? 0.9 : o.att;
	const rel = o.rel === undefined ? 1.1 : o.rel;
	const fm = VOWEL[o.vowel || 'o'];
	const n = Math.ceil((dur + rel + 0.05) * sr);
	const x = new Float32Array(n);
	const per = low ? 1 : 2;
	const g0 = 0.9 / (freqs.length * per);
	for (const f of freqs) {
		for (let k = 0; k < per; k++) {
			let p = k * 0.41;
			const det = per === 1 ? 0 : (k ? 1 : -1) * 7;
			for (let i = 0; i < n; i++) {
				const c = det + 9 * Math.sin((TAU * 5.2 * i) / sr);
				const d = (f * cents(c)) / sr;
				p += d;
				if (p >= 1) p -= 1;
				x[i] += saw(p, d) * g0;
			}
		}
	}
	const bands = low ? 2 : 3;
	const y = new Float32Array(n);
	for (let b = 0; b < bands; b++) {
		const bp = biquad(x, 'bp', fm[b], 5 + b * 2, sr);
		const gg = [1, 0.7, 0.35][b];
		for (let i = 0; i < n; i++) y[i] += bp[i] * gg;
	}
	for (let i = 0; i < n; i++) {
		const t = i / sr;
		y[i] *= t < att ? t / att : t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel);
	}
	return y;
}

/**
 * Döngü için bordo: bütün titreşimler döngüye tam sayıda oturur (loopLen), sarma yerinde faz atlaması olmaz.
 * Düşük hızda (sr/4) üretilir: alçak geçirenli ağır ses, dörtte bir maliyet; sonra doğrusal yükseltilir.
 */
export function synthDrone(sr, dur, freqs, loopLen, cut, low) {
	const sr2 = Math.round(sr / 4);
	const n2 = Math.ceil(dur * sr2) + 2;
	const snap = (f) => (loopLen ? Math.max(1, Math.round(f * loopLen)) / loopLen : f);
	const x = new Float32Array(n2);
	const add = (type, fr, g) => {
		const f = snap(fr);
		const d = f / sr2;
		let p = 0;
		for (let i = 0; i < n2; i++) {
			p += d;
			if (p >= 1) p -= 1;
			x[i] += (type === 's' ? Math.sin(TAU * p) : saw(p, d)) * g;
		}
	};
	freqs.forEach((f, i) => {
		const k = i === 0 ? 1 : 0.55;
		add('w', f, 0.5 * k);
		if (!low) add('w', f * 1.004, 0.4 * k);
		add('s', f * 0.5, 0.7 * k);
	});
	const lfo = loopLen ? Math.max(1, Math.round(0.09 * loopLen)) / loopLen : 0.09;
	const y = sweepBiquad(x, 'lp', (i) => cut * (1 + 0.3 * Math.sin((TAU * lfo * i) / sr2)), 0.9, sr2, 64);
	const n = Math.ceil(dur * sr);
	const out = new Float32Array(n);
	const k = sr2 / sr;
	for (let i = 0; i < n; i++) {
		const q = i * k;
		const j = q | 0;
		out[i] = y[j] + (y[j + 1] - y[j]) * (q - j);
	}
	return out;
}

// ---------------------------------------------------------------- nota önbelleği (bağlamlar arası, sınırlı bellek)
const NOTES = new Map();
let noteFloats = 0;
function noted(key, make) {
	let x = NOTES.get(key);
	if (x) return x;
	x = make();
	NOTES.set(key, x);
	noteFloats += x.length;
	while (noteFloats > 3.5e6 && NOTES.size > 1) {
		const k = NOTES.keys().next().value;
		noteFloats -= NOTES.get(k).length;
		NOTES.delete(k);
	}
	return x;
}
export function clearNotes() {
	NOTES.clear();
	noteFloats = 0;
}

// ---------------------------------------------------------------- JsEngine
export class JsEngine {
	/** sr: örnekleme hızı · len: toplam süre (sn) · wet: yankı çarpanı · loopLen: döngü süresi (bordo ve titreşim ayarı için). */
	constructor({ sr = 32000, len = 4, low = false, wet = 1, seed = 1, loopLen = 0, trim = null } = {}) {
		this.js = true;
		this.trim = trim || {}; // çalgı başına seviye düzeltmesi (müzik: aynı vol ≈ aynı algısal seviye)
		this.sr = sr;
		this.low = low;
		this.wet = wet;
		this.loopLen = loopLen;
		this.n = Math.max(1, Math.ceil(len * sr));
		this.dL = new Float32Array(this.n);
		this.dR = new Float32Array(this.n);
		this.wL = new Float32Array(this.n);
		this.wR = new Float32Array(this.n);
		this.r = rng(seed);
		this.dest = 'fx';
	}

	bus(name) {
		return name;
	}

	send(to) {
		const b = BUS[to] || BUS.fx;
		return b.wet * this.wet;
	}

	/** x'i (örnekleme hızı xr) t sn'den başlayarak karıştır: kazanç g, yan pan (-1..1, kanal dengesi), yankı payı w, hız rate. */
	mix(x, xr, t, g, pan, w, rate = 1) {
		const sr = this.sr;
		const step = (xr / sr) * rate;
		const i0 = Math.round(t * sr);
		const cnt = Math.floor((x.length - 1) / step);
		const gl = g * (pan > 0 ? 1 - pan : 1);
		const gr = g * (pan < 0 ? 1 + pan : 1);
		const glw = gl * w;
		const grw = gr * w;
		const dL = this.dL;
		const dR = this.dR;
		const wL = this.wL;
		const wR = this.wR;
		const k0 = i0 < 0 ? -i0 : 0;
		const k1 = Math.min(cnt, this.n - i0);
		if (step === 1) {
			for (let k = k0; k < k1; k++) {
				const s = x[k];
				const o = i0 + k;
				dL[o] += s * gl;
				dR[o] += s * gr;
				wL[o] += s * glw;
				wR[o] += s * grw;
			}
			return;
		}
		for (let k = k0; k < k1; k++) {
			const p = k * step;
			const j = p | 0;
			const s = x[j] + (x[j + 1] - x[j]) * (p - j);
			const o = i0 + k;
			dL[o] += s * gl;
			dR[o] += s * gr;
			wL[o] += s * glw;
			wR[o] += s * grw;
		}
	}

	hit(name, t, vol = 1, rate = 1, pan = 0, to = null) {
		const x = buildSample(name, BANK_RATE);
		if (x) this.mix(x, BANK_RATE, t, vol, pan, this.send(to), rate);
	}

	pluck(kind, freq, t, vol = 0.6, pan = 0, to = null, detune = 0) {
		const d = pluckSample(kind, freq);
		this.mix(d.data, d.rate, t, vol, pan, this.send(to), detune ? cents(detune) : 1);
	}

	tone(type, f0, f1, t, dur, vol, o = {}) {
		const x = synthTone(this.sr, type, f0, f1, dur, vol, o.a === undefined ? 0.004 : o.a, o.sweep, o.lp);
		this.mix(x, this.sr, t, 1, o.pan || 0, this.send(o.to), 1);
	}

	noise(t, dur, vol, f0, f1, o = {}) {
		const x = synthNoise(this.r, this.sr, dur, vol, f0, f1, o);
		this.mix(x, this.sr, t, 1, o.pan || 0, this.send(o.to), 1);
	}

	zurna(t, f, dur, vol, o = {}) {
		const key = `z|${this.sr}|${f.toFixed(2)}|${dur.toFixed(3)}|${o.bend || 0}|${o.orn || 0}|${o.bright ? 1 : 0}|${this.low ? 1 : 0}`;
		const x = noted(key, () => synthZurna(this.sr, f, dur, o, this.low));
		this.mix(x, this.sr, t, vol * 0.5 * (this.trim.zurna || 1), o.pan || 0, this.send(o.to), 1);
		if (!this.low) this.noise(t, 0.05, vol * 0.18 * (this.trim.zurna || 1), 2600, 1800, { q: 1.2, a: 0.002, to: o.to });
	}

	ney(t, f, dur, vol, o = {}) {
		const key = `n|${this.sr}|${f.toFixed(2)}|${dur.toFixed(3)}|${o.attack || 0}|${o.release || 0}|${o.scoop === undefined ? '' : o.scoop}|${this.low ? 1 : 0}`;
		const x = noted(key, () => synthNey(this.sr, f, dur, o, this.low, rng((f * 100) | 0)));
		this.mix(x, this.sr, t, vol * (this.trim.ney || 1), o.pan || 0, this.send(o.to), 1);
	}

	horn(t, f, dur, vol, o = {}) {
		const key = `h|${this.sr}|${f.toFixed(2)}|${dur.toFixed(3)}|${o.open || 0}`;
		const x = noted(key, () => synthHorn(this.sr, f, dur, o));
		this.mix(x, this.sr, t, vol * (this.trim.horn || 1), o.pan || 0, this.send(o.to), 1);
	}

	strings(t, freqs, dur, vol, o = {}) {
		const key = `s|${this.sr}|${freqs.map((f) => f.toFixed(1)).join(',')}|${dur.toFixed(3)}|${o.att}|${o.rel}|${o.bright || 0}|${this.low ? 1 : 0}`;
		const x = noted(key, () => synthStrings(this.sr, freqs, dur, o, this.low));
		this.mix(x, this.sr, t, vol * (this.trim.strings || 1), o.pan || 0, this.send(o.to), 1);
	}

	choir(t, freqs, dur, vol, o = {}) {
		const key = `c|${this.sr}|${freqs.map((f) => f.toFixed(1)).join(',')}|${dur.toFixed(3)}|${o.att}|${o.rel}|${o.vowel || 'o'}|${this.low ? 1 : 0}`;
		const x = noted(key, () => synthChoir(this.sr, freqs, dur, o, this.low));
		this.mix(x, this.sr, t, vol * (this.trim.choir || 1), o.pan || 0, this.send(o.to), 1);
	}

	droneLoop(t, dur, freqs, vol, o = {}) {
		const x = synthDrone(this.sr, dur, freqs, this.loopLen, o.cut || 520, this.low);
		this.mix(x, this.sr, t, vol * (this.trim.drone || 1), 0, this.send(o.to || 'pad'), 1);
	}
}
