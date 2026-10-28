// Ses: örnek (sample) üretimi. Dosya yok; bütün vuruşlar ve teller JS ile sentezlenir.
// Çalışma zamanında yalnızca AudioBufferSource çalınır: düşük cihazlarda CPU'yu en aza indirir.

const TAU = Math.PI * 2;

// Tohumlu rastgele (mulberry32): çevrimdışı ölçüm her seferinde aynı sonucu verir.
export function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const BANK_RATE = 32000;

function make(dur, sr, fn) {
	const n = Math.max(1, Math.floor(dur * sr));
	const a = new Float32Array(n);
	for (let i = 0; i < n; i++) a[i] = fn(i / sr, i);
	return a;
}

function add(a, b, g = 1) {
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) a[i] += b[i] * g;
	return a;
}

// RBJ ikinci derece süzgeç (diziye uygulanır)
function biquad(x, type, f, q, sr) {
	const w = (TAU * Math.min(f, sr * 0.45)) / sr;
	const cw = Math.cos(w);
	const al = Math.sin(w) / (2 * q);
	let b0, b1, b2;
	const a0 = 1 + al;
	const a1 = -2 * cw;
	const a2 = 1 - al;
	if (type === 'lp') {
		b0 = (1 - cw) / 2;
		b1 = 1 - cw;
		b2 = b0;
	} else if (type === 'hp') {
		b0 = (1 + cw) / 2;
		b1 = -(1 + cw);
		b2 = b0;
	} else {
		b0 = al;
		b1 = 0;
		b2 = -al;
	}
	const y = new Float32Array(x.length);
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	for (let i = 0; i < x.length; i++) {
		const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
		x2 = x1;
		x1 = x[i];
		y2 = y1;
		y1 = v;
		y[i] = v;
	}
	return y;
}

function norm(a, peak = 0.92, fade = 0.006, sr = BANK_RATE) {
	let m = 0;
	for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
	const g = m > 0 ? peak / m : 1;
	const nf = Math.min(a.length, Math.floor(fade * sr));
	for (let i = 0; i < a.length; i++) {
		a[i] *= g;
		if (i >= a.length - nf) a[i] *= (a.length - 1 - i) / nf;
	}
	return a;
}

const noise = (r) => () => r() * 2 - 1;

// ---------------------------------------------------------------- vuruşlar

const DEFS = {
	// davul (bas): membran, vurucu tıkırtısı
	dum(sr) {
		const r = noise(rng(11));
		let ph = 0;
		const body = make(0.9, sr, (t) => {
			ph += (TAU * (52 + 95 * Math.exp(-t * 26))) / sr;
			return Math.sin(ph) * Math.exp(-t * 6.5) + 0.32 * Math.sin(ph * 2.01) * Math.exp(-t * 15) + 0.22 * Math.sin(TAU * 138 * t) * Math.exp(-t * 13);
		});
		const click = biquad(make(0.05, sr, (t) => r() * Math.exp(-t * 95)), 'lp', 2200, 0.7, sr);
		return norm(add(body, click, 0.5));
	},
	// büyük davul darbesi: daha derin, uzun kuyruk
	dumBig(sr) {
		const r = noise(rng(12));
		let ph = 0;
		const body = make(1.7, sr, (t) => {
			ph += (TAU * (36 + 80 * Math.exp(-t * 16))) / sr;
			return Math.sin(ph) * Math.exp(-t * 3.4) + 0.35 * Math.sin(ph * 2.02) * Math.exp(-t * 9) + 0.25 * Math.sin(TAU * 96 * t) * Math.exp(-t * 7);
		});
		const click = biquad(make(0.09, sr, (t) => r() * Math.exp(-t * 55)), 'lp', 1800, 0.7, sr);
		const air = biquad(make(0.7, sr, (t) => r() * Math.exp(-t * 6)), 'lp', 260, 0.7, sr);
		return norm(add(add(body, click, 0.55), air, 0.8), 0.94, 0.03);
	},
	// davul tek: ince çubuk, parlak
	tek(sr) {
		const r = noise(rng(13));
		const n = biquad(make(0.22, sr, (t) => r() * Math.exp(-t * 42)), 'bp', 2600, 0.9, sr);
		const t2 = make(0.22, sr, (t) => Math.sin(TAU * 330 * t) * Math.exp(-t * 32));
		return norm(add(n, t2, 0.4));
	},
	// kenar vuruşu (tahta/kasnak)
	rim(sr) {
		return norm(make(0.11, sr, (t) => Math.sin(TAU * (1250 - 400 * t) * t) * Math.exp(-t * 85) + 0.4 * Math.sin(TAU * 1930 * t) * Math.exp(-t * 130)));
	},
	// arayüz tıkı: tok, kısa tahta
	woodTap(sr) {
		const r = noise(rng(14));
		const click = biquad(make(0.02, sr, (t) => r() * Math.exp(-t * 300)), 'bp', 3500, 1, sr);
		return norm(add(make(0.1, sr, (t) => Math.sin(TAU * 720 * t) * Math.exp(-t * 62) + 0.45 * Math.sin(TAU * 1480 * t) * Math.exp(-t * 90)), click, 0.5), 0.9, 0.004);
	},
	woodLow(sr) {
		return norm(make(0.14, sr, (t) => Math.sin(TAU * (430 - 120 * t) * t) * Math.exp(-t * 44) + 0.3 * Math.sin(TAU * 860 * t) * Math.exp(-t * 80)), 0.9, 0.005);
	},
	// darbuka
	dbDoum(sr) {
		let ph = 0;
		return norm(
			make(0.5, sr, (t) => {
				ph += (TAU * (108 + 120 * Math.exp(-t * 34))) / sr;
				return Math.sin(ph) * Math.exp(-t * 8.5) + 0.22 * Math.sin(TAU * 310 * t) * Math.exp(-t * 20);
			}),
		);
	},
	dbTek(sr) {
		const r = noise(rng(15));
		const n = biquad(make(0.15, sr, (t) => r() * Math.exp(-t * 38)), 'bp', 3600, 1.3, sr);
		return norm(add(n, make(0.15, sr, (t) => Math.sin(TAU * 1500 * t) * Math.exp(-t * 55)), 0.5));
	},
	dbKa(sr) {
		const r = noise(rng(16));
		return norm(biquad(make(0.1, sr, (t) => r() * Math.exp(-t * 60)), 'bp', 4800, 1.1, sr));
	},
	// zil: düzensiz üst sesler + gürültü
	zil(sr) {
		const r = noise(rng(17));
		const f = [3.1, 4.3, 5.2, 6.9, 8.4, 9.7, 11.3, 13.1].map((m) => 560 * m);
		const air = biquad(make(1.8, sr, (t) => r() * Math.exp(-t * 3)), 'hp', 3800, 0.7, sr);
		const parts = make(1.8, sr, (t) => {
			let s = 0;
			for (let k = 0; k < f.length; k++) if (f[k] < sr * 0.45) s += Math.sin(TAU * f[k] * t) * Math.exp(-t * (2.4 + k * 0.5)) * (1 - k * 0.07);
			return s;
		});
		return norm(add(parts, air, 1.2), 0.9, 0.05);
	},
	// kalkan/kılıç çınlaması
	clang(sr) {
		const r = noise(rng(18));
		const f = [520, 1180, 1860, 2750, 3920];
		const body = make(1.1, sr, (t) => {
			let s = 0;
			for (let k = 0; k < f.length; k++) s += Math.sin(TAU * f[k] * t) * Math.exp(-t * (5 + k * 4)) * (1 - k * 0.15);
			return s;
		});
		return norm(add(body, biquad(make(0.03, sr, (t) => r() * Math.exp(-t * 200)), 'hp', 2000, 0.7, sr), 0.6), 0.9, 0.04);
	},
	// çatırtı/kaya parçası: kısa alçak geçirgen gürültü
	rock(sr) {
		const r = noise(rng(19));
		return norm(biquad(make(0.09, sr, (t) => r() * Math.exp(-t * 48)), 'lp', 1400, 0.9, sr), 0.9, 0.004);
	},
};

export const BANK_NAMES = Object.keys(DEFS);

export function buildSample(name, sr = BANK_RATE) {
	const d = DEFS[name];
	return d ? d(sr) : null;
}

// ---------------------------------------------------------------- Karplus-Strong tel
// Tel boyu tam sayı olsun diye AudioBuffer örnekleme hızı = frekans * N seçilir.
// Böylece mikrotonal (makam) perdeler bile tam doğru çalar; çalma sırasında oynatıcı yeniden örnekler.
const KS = {
	// bağlama: parlak, kısa
	baglama: { rate: 24000, t60: 0.85, damp: 0.5, bright: 0.85, pick: 0.2, len: 0.9 },
	// kanun: çok parlak, uzun, tınlayan
	kanun: { rate: 24000, t60: 1.7, damp: 0.5, bright: 1, pick: 0.12, len: 1.5 },
};

export function pluckSample(kind, freq, seed = 1) {
	const p = KS[kind] || KS.baglama;
	const N = Math.max(8, Math.round(p.rate / freq));
	const sr = freq * (N + (1 - p.damp)); // gerçek örnekleme hızı (süzgeç gecikmesi dahil)
	const r = rng(seed * 7919 + Math.round(freq * 10));
	const line = new Float32Array(N);
	// başlangıç: gürültü, bir kutuplu alçak geçirgenle yumuşatılır (parlaklık ayarı)
	let lp = 0;
	for (let i = 0; i < N; i++) {
		lp += (r() * 2 - 1 - lp) * p.bright;
		line[i] = lp;
	}
	// çalma noktası: tarak süzgeci (tel nerede çekilirse)
	const k = Math.max(1, Math.round(N * p.pick));
	const tmp = line.slice();
	for (let i = 0; i < N; i++) line[i] = tmp[i] - tmp[(i + k) % N] * 0.8;
	// döngü başına kayıp: T60 sabit kalsın
	const loss = Math.pow(10, -3 / (p.t60 * freq));
	const n = Math.floor(p.len * sr);
	const out = new Float32Array(n);
	let idx = 0;
	let prev = line[N - 1];
	for (let i = 0; i < n; i++) {
		const cur = line[idx];
		out[i] = cur;
		line[idx] = (p.damp * cur + (1 - p.damp) * prev) * loss;
		prev = cur;
		if (++idx >= N) idx = 0;
	}
	// tırnak vuruşu: ilk milisaniyelere vurgu
	const cl = Math.min(n, Math.floor(0.004 * sr));
	for (let i = 0; i < cl; i++) out[i] *= 1 + 0.6 * (1 - i / cl);
	norm(out, 0.9, 0.05, sr);
	return { data: out, rate: sr };
}
