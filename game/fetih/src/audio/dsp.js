// Ses: örnek (sample) üretimi ve son işlem. Dosya yok; bütün vuruşlar, teller ve çanlar JS ile sentezlenir.
// Çalışma zamanında yalnızca AudioBufferSource çalınır: düşük cihazlarda CPU'yu en aza indirir.
// Üretilen diziler modül düzeyinde saklanır; her motor (canlı ya da çevrimdışı) bunlardan kendi AudioBuffer'ını kurar.

const TAU = Math.PI * 2;

// Tohumlu rastgele (mulberry32): çevrimdışı ölçüm her seferinde aynı sonucu verir.
// Oyunun Math.random'ına dokunmaz (akış testi tohumlu Math.random kullanır).
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

// RBJ ikinci derece süzgeç katsayıları (a0'a bölünmüş): lp, hp, bp (sabit 0 dB tepe), peak (gdb dB)
export function coefs(type, f, q, sr, gdb = 0) {
	const w = (TAU * Math.min(Math.max(f, 10), sr * 0.45)) / sr;
	const cw = Math.cos(w);
	const al = Math.sin(w) / (2 * q);
	let b0, b1, b2, a0, a1, a2;
	a1 = -2 * cw;
	if (type === 'lp') {
		b0 = (1 - cw) / 2;
		b1 = 1 - cw;
		b2 = b0;
		a0 = 1 + al;
		a2 = 1 - al;
	} else if (type === 'hp') {
		b0 = (1 + cw) / 2;
		b1 = -(1 + cw);
		b2 = b0;
		a0 = 1 + al;
		a2 = 1 - al;
	} else if (type === 'peak') {
		const A = Math.pow(10, gdb / 40);
		b0 = 1 + al * A;
		b1 = -2 * cw;
		b2 = 1 - al * A;
		a0 = 1 + al / A;
		a2 = 1 - al / A;
	} else if (type === 'hs' || type === 'ls') {
		// raf süzgeci (RBJ, eğim 1): hs yüksek raf, ls alçak raf; gdb dB
		const A = Math.pow(10, gdb / 40);
		const sw = Math.sin(w);
		const al2 = (sw / 2) * Math.SQRT2;
		const sA = 2 * Math.sqrt(A) * al2;
		if (type === 'hs') {
			b0 = A * (A + 1 + (A - 1) * cw + sA);
			b1 = -2 * A * (A - 1 + (A + 1) * cw);
			b2 = A * (A + 1 + (A - 1) * cw - sA);
			a0 = A + 1 - (A - 1) * cw + sA;
			a1 = 2 * (A - 1 - (A + 1) * cw);
			a2 = A + 1 - (A - 1) * cw - sA;
		} else {
			b0 = A * (A + 1 - (A - 1) * cw + sA);
			b1 = 2 * A * (A - 1 - (A + 1) * cw);
			b2 = A * (A + 1 - (A - 1) * cw - sA);
			a0 = A + 1 + (A - 1) * cw + sA;
			a1 = -2 * (A - 1 + (A + 1) * cw);
			a2 = A + 1 + (A - 1) * cw - sA;
		}
	} else {
		b0 = al;
		b1 = 0;
		b2 = -al;
		a0 = 1 + al;
		a2 = 1 - al;
	}
	return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

// RBJ ikinci derece süzgeç (diziye uygulanır; yeni dizi döner)
export function biquad(x, type, f, q, sr, gdb = 0) {
	const [b0, b1, b2, a1, a2] = coefs(type, f, q, sr, gdb);
	const y = new Float32Array(x.length);
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	for (let i = 0; i < x.length; i++) {
		const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
		x2 = x1;
		x1 = x[i];
		y2 = y1;
		y1 = v;
		y[i] = v;
	}
	return y;
}

// Zamanla değişen süzgeç: kesim frekansı fAt(i) (Hz); katsayılar her `blk` örnekte bir yenilenir.
export function sweepBiquad(x, type, fAt, q, sr, blk = 32) {
	const y = new Float32Array(x.length);
	let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	for (let i = 0; i < x.length; i++) {
		if (i % blk === 0) [b0, b1, b2, a1, a2] = coefs(type, fAt(i), q, sr);
		const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
		x2 = x1;
		x1 = x[i];
		y2 = y1;
		y1 = v;
		y[i] = v;
	}
	return y;
}

// Tepeyi hedefe getirir; baştaki ~0.5 ms yükseliş (ilk örnek sıfır: tıkırtı yok) ve sondaki sönüş eklenir.
function norm(a, peak = 0.92, fade = 0.006, sr = BANK_RATE) {
	let m = 0;
	for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
	const g = m > 0 ? peak / m : 1;
	const nf = Math.min(a.length, Math.floor(fade * sr));
	const ni = Math.min(a.length, Math.max(2, Math.floor(0.0005 * sr)));
	for (let i = 0; i < a.length; i++) {
		a[i] *= g;
		if (i >= a.length - nf) a[i] *= (a.length - 1 - i) / nf;
		if (i < ni) a[i] *= i / ni;
	}
	return a;
}

const noise = (r) => () => r() * 2 - 1;

// ---------------------------------------------------------------- vuruşlar ve çanlar

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
	// kös: mehter kazanı. Derin, uzun, perdesi düşen; yumuşak tokmak
	kos(sr) {
		const r = noise(rng(21));
		let ph = 0;
		const body = make(1.6, sr, (t) => {
			ph += (TAU * (46 + 58 * Math.exp(-t * 16))) / sr;
			return Math.sin(ph) * Math.exp(-t * 3.0) + 0.3 * Math.sin(ph * 1.51) * Math.exp(-t * 7) + 0.16 * Math.sin(ph * 2.26) * Math.exp(-t * 11);
		});
		const thud = biquad(make(0.08, sr, (t) => r() * Math.exp(-t * 55)), 'lp', 900, 0.7, sr);
		return norm(add(body, thud, 0.55), 0.93, 0.05);
	},
	// def (tef): tok gövde ve tel (çıngırak) cızırtısı
	def(sr) {
		const r = noise(rng(22));
		let ph = 0;
		const body = make(0.55, sr, (t) => {
			ph += (TAU * (96 + 70 * Math.exp(-t * 38))) / sr;
			return Math.sin(ph) * Math.exp(-t * 9) + 0.22 * Math.sin(TAU * 232 * t) * Math.exp(-t * 18);
		});
		const rattle = biquad(make(0.35, sr, (t) => r() * Math.exp(-t * 14) * (0.55 + 0.45 * Math.sin(TAU * 79 * t))), 'bp', 5400, 0.8, sr);
		return norm(add(body, rattle, 0.4), 0.9, 0.04);
	},
	// çevgen / zilli tef: kısa parlak şıkırtı
	shake(sr) {
		const r = noise(rng(23));
		return norm(biquad(make(0.1, sr, (t) => r() * Math.exp(-t * 46)), 'hp', 6200, 0.8, sr), 0.85, 0.012);
	},
	// mehter küçük davulu: tel sesli, ince
	snare(sr) {
		const r = noise(rng(24));
		const n = biquad(make(0.17, sr, (t) => r() * Math.exp(-t * 32)), 'bp', 3300, 0.6, sr);
		const b = make(0.17, sr, (t) => Math.sin(TAU * 195 * t) * Math.exp(-t * 40));
		return norm(add(n, b, 0.55), 0.9, 0.012);
	},
	// çan: düzensiz üst seslerle parlak, uzun (temel 880 Hz; oynatma hızıyla perdesi ayarlanır)
	chime(sr) {
		const ratio = [1, 2.756, 5.404, 8.933];
		const amp = [1, 0.55, 0.3, 0.16];
		const dec = [3.2, 4.5, 6.5, 9];
		return norm(
			make(1.4, sr, (t) => {
				let s = 0;
				for (let k = 0; k < 4; k++) if (880 * ratio[k] < sr * 0.45) s += Math.sin(TAU * 880 * ratio[k] * t) * amp[k] * Math.exp(-t * dec[k]);
				return s * (1 - Math.exp(-t * 900));
			}),
			0.9,
			0.04,
		);
	},
	// küçük "pop": baloncuk, yıldız belirmesi
	pop(sr) {
		return norm(make(0.07, sr, (t) => Math.sin(TAU * (520 + 520 * Math.exp(-t * 75)) * t) * Math.exp(-t * 50) * (1 - Math.exp(-t * 2500))), 0.9, 0.008);
	},
	// taş çarpması: alçak gövde + toz
	thud(sr) {
		const r = noise(rng(25));
		let ph = 0;
		const body = make(0.5, sr, (t) => {
			ph += (TAU * (45 + 50 * Math.exp(-t * 30))) / sr;
			return Math.sin(ph) * Math.exp(-t * 11);
		});
		const dust = biquad(make(0.12, sr, (t) => r() * Math.exp(-t * 38)), 'lp', 1500, 0.7, sr);
		return norm(add(body, dust, 0.7), 0.92, 0.02);
	},
	// çatlama: kısa, parlak kırılma
	crack(sr) {
		const r = noise(rng(26));
		const n = biquad(make(0.1, sr, (t) => r() * Math.exp(-t * 90)), 'hp', 1800, 0.8, sr);
		return norm(add(n, make(0.1, sr, (t) => Math.sin(TAU * 900 * t) * Math.exp(-t * 120)), 0.4), 0.9, 0.008);
	},
	// altın: madeni para şıngırtısı
	tink(sr) {
		return norm(
			make(0.22, sr, (t) => (Math.sin(TAU * 2100 * t) * Math.exp(-t * 20) + 0.7 * Math.sin(TAU * 3350 * t) * Math.exp(-t * 28) + 0.4 * Math.sin(TAU * 5230 * t) * Math.exp(-t * 44)) * (1 - Math.exp(-t * 3000))),
			0.9,
			0.02,
		);
	},
};

export const BANK_NAMES = Object.keys(DEFS);

const CACHE = new Map();

/** Örnek verisi (Float32Array); modül düzeyinde bir kez üretilir ve paylaşılır (yalnızca okunur). */
export function buildSample(name, sr = BANK_RATE) {
	const key = name + '@' + sr;
	let d = CACHE.get(key);
	if (d) return d;
	const f = DEFS[name];
	if (!f) return null;
	d = f(sr);
	CACHE.set(key, d);
	return d;
}

// ---------------------------------------------------------------- Karplus-Strong tel
// Tel boyu tam sayı olsun diye AudioBuffer örnekleme hızı = frekans * N seçilir.
// Böylece mikrotonal (makam) perdeler bile tam doğru çalar; çalma sırasında oynatıcı yeniden örnekler.
// body: [merkez Hz, Q, karışım]: gövde (kasa) yankılanması; teli ahşap bir çalgı gibi renklendirir.
const KS = {
	// bağlama: parlak, kısa, ahşap gövdeli
	baglama: { rate: 24000, t60: 0.95, damp: 0.5, bright: 0.85, pick: 0.2, len: 1.0, body: [[190, 4, 0.34], [430, 5, 0.26], [1080, 6, 0.14]] },
	// kanun: çok parlak, uzun, tınlayan
	kanun: { rate: 24000, t60: 1.8, damp: 0.5, bright: 1, pick: 0.12, len: 1.6, body: [[260, 3, 0.1], [900, 4, 0.08]] },
	// tambur: koyu, yumuşak, uzun saplı (alçak tel)
	tambur: { rate: 24000, t60: 1.3, damp: 0.42, bright: 0.55, pick: 0.27, len: 1.3, body: [[170, 4, 0.38], [380, 5, 0.22]] },
};

const PLUCKS = new Map();

export function pluckSample(kind, freq, seed = 1) {
	const key = kind + ':' + Math.round(freq * 20);
	const hit = PLUCKS.get(key);
	if (hit) return hit;
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
	let out = new Float32Array(n);
	let idx = 0;
	let prev = line[N - 1];
	for (let i = 0; i < n; i++) {
		const cur = line[idx];
		out[i] = cur;
		line[idx] = (p.damp * cur + (1 - p.damp) * prev) * loss;
		prev = cur;
		if (++idx >= N) idx = 0;
	}
	// gövde: sabit frekanslı yankılanmalar (kasa); perde değişse de aynı ahşap rengi
	if (p.body) {
		const dry = out;
		out = dry.slice();
		for (const [f, q, g] of p.body) {
			const b = biquad(dry, 'bp', f, q, sr);
			for (let i = 0; i < n; i++) out[i] += b[i] * g * 3.2;
		}
	}
	// tırnak vuruşu: ilk milisaniyelere vurgu
	const cl = Math.min(n, Math.floor(0.004 * sr));
	for (let i = 0; i < cl; i++) out[i] *= 1 + 0.6 * (1 - i / cl);
	norm(out, 0.9, 0.05, sr);
	const res = { data: out, rate: sr };
	PLUCKS.set(key, res);
	if (PLUCKS.size > 220) PLUCKS.delete(PLUCKS.keys().next().value); // en eski teli at
	return res;
}

/** Çevrimdışı çizim bittikten sonra bellek boşaltmak için (tel örnekleri bir sonraki parçada yeniden üretilir). */
export function clearPlucks() {
	PLUCKS.clear();
}

// ---------------------------------------------------------------- son işlem (pişirilen tamponlar için)

/** Doğru akım bileşenini kaldırır (tek kutuplu yüksek geçiren, yerinde). */
export function dcBlock(x, r = 0.9995) {
	let px = 0;
	let py = 0;
	for (let i = 0; i < x.length; i++) {
		const v = x[i];
		py = v - px + r * py;
		px = v;
		x[i] = py;
	}
	return x;
}

/** Yumuşak sınırlayıcı: eşiğin altı dokunulmaz, üstü 1'e doğru tanh ile yaklaşır (yerinde). */
export function softLimit(x, thr = 0.6, ceil = 0.97) {
	const k = ceil - thr;
	for (let i = 0; i < x.length; i++) {
		const a = Math.abs(x[i]);
		if (a > thr) x[i] = Math.sign(x[i]) * (thr + k * Math.tanh((a - thr) / k));
	}
	return x;
}

export function peakOf(x, i0 = 0, i1 = x.length) {
	let m = 0;
	for (let i = i0; i < i1; i++) {
		const a = x[i] < 0 ? -x[i] : x[i];
		if (a > m) m = a;
	}
	return m;
}

export function rmsOf(x, i0 = 0, i1 = x.length) {
	let s = 0;
	for (let i = i0; i < i1; i++) s += x[i] * x[i];
	return i1 > i0 ? Math.sqrt(s / (i1 - i0)) : 0;
}

/** Kısa doğrusal yükseliş ve sönüş (yerinde): tek seferlik sesin uçlarında tıkırtıyı önler. */
export function fadeEdges(x, sr, fin = 0.002, fout = 0.03) {
	const a = Math.min(x.length, Math.floor(fin * sr));
	const b = Math.min(x.length, Math.floor(fout * sr));
	for (let i = 0; i < a; i++) x[i] *= i / a;
	for (let i = 0; i < b; i++) x[x.length - 1 - i] *= i / b;
	return x;
}

// ---------------------------------------------------------------- ana zincir (pişirilmiş karışım için, parçalı ve yerinde)

// durumlu ikinci derece süzgeç (örnek örnek)
class Biq {
	constructor(type, f, q, sr, gdb = 0) {
		[this.b0, this.b1, this.b2, this.a1, this.a2] = coefs(type, f, q, sr, gdb);
		this.x1 = this.x2 = this.y1 = this.y2 = 0;
	}
	tick(x) {
		const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
		this.x2 = this.x1;
		this.x1 = x;
		this.y2 = this.y1;
		this.y1 = y;
		return y;
	}
}

/**
 * Pişirilmiş karışımın ana zinciri (iki kanal, yerinde): doğru akım süzgeci, küçük hoparlör için bas artırıcı (telefonlar
 * 150 Hz altını vermez: alt bandın 2f/3f harmonikleri eklenir), yapışkanlık sıkıştırıcısı (tepe izleyici, yumuşak diz).
 * Tek geçişte, 16k örneklik dilimlerle çalışır; yield() verilirse dilimler arasında ana iş parçacığına söz verir.
 * o: {bass (0..1), comp (bool), thr (dB), ratio, atk, rel, knee, eq: [[tür ('hs'|'ls'|'peak'), Hz, dB, Q?], ...]}
 * eq: ton ayarı (yüksek raf parlaklık verir; telefon hoparlörü 150 Hz altını ve 8 kHz üstünü zaten vermez).
 */
export async function masterChain(L, R, sr, o = {}, yield_ = null) {
	const bass = o.bass === undefined ? 0.3 : o.bass;
	const useComp = o.comp !== false;
	const thr = o.thr === undefined ? -18 : o.thr;
	const ratio = o.ratio || 3.5;
	const knee = o.knee || 10;
	const k = 1 - 1 / ratio;
	const ac = Math.exp(-1 / (sr * (o.atk || 0.006)));
	const rc = Math.exp(-1 / (sr * (o.rel || 0.16)));
	const thrLin = Math.pow(10, (thr - knee / 2) / 20);
	const lo = new Biq('lp', 110, 0.707, sr);
	const hp = new Biq('hp', 140, 0.707, sr);
	const lp2 = new Biq('lp', 600, 0.707, sr);
	const eqL = (o.eq || []).map(([ty, f, g, q]) => new Biq(ty, f, q || 0.707, sr, g));
	const eqR = (o.eq || []).map(([ty, f, g, q]) => new Biq(ty, f, q || 0.707, sr, g));
	const ne = eqL.length;
	let pxl = 0, pyl = 0, pxr = 0, pyr = 0;
	let env = 0;
	const n = L.length;
	const BLK = 16384;
	const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
	let tm = t0;
	for (let b0 = 0; b0 < n; b0 += BLK) {
		const b1 = Math.min(n, b0 + BLK);
		for (let i = b0; i < b1; i++) {
			// doğru akım
			let l = L[i];
			let r = R[i];
			let yl = l - pxl + 0.9995 * pyl;
			pxl = l;
			pyl = yl;
			let yr = r - pxr + 0.9995 * pyr;
			pxr = r;
			pyr = yr;
			// bas artırıcı (mono toplam üzerinden)
			if (bass > 0) {
				const m = Math.tanh(lo.tick((yl + yr) * 0.5) * 5);
				const h = lp2.tick(hp.tick(m)) * bass * 0.5;
				yl += h;
				yr += h;
			}
			// ton ayarı
			for (let k = 0; k < ne; k++) {
				yl = eqL[k].tick(yl);
				yr = eqR[k].tick(yr);
			}
			// sıkıştırıcı
			if (useComp) {
				const a = yl < 0 ? -yl : yl;
				const c = yr < 0 ? -yr : yr;
				const d = a > c ? a : c;
				env = d > env ? ac * env + (1 - ac) * d : rc * env + (1 - rc) * d;
				if (env > thrLin) {
					const over = 20 * Math.log10(env) - thr;
					const gr = over >= knee / 2 ? over * k : (k * (over + knee / 2) * (over + knee / 2)) / (2 * knee);
					const g = Math.pow(10, -gr / 20);
					yl *= g;
					yr *= g;
				}
			}
			L[i] = yl;
			R[i] = yr;
		}
		if (yield_ && typeof performance !== 'undefined' && performance.now() - tm > 6) {
			await yield_();
			tm = performance.now();
		}
	}
}

/**
 * Algısal seviye (K ağırlıklı, geçitli RMS; doğrusal genlik döner): 100 Hz altı sayılmaz (telefon vermez), 2 kHz üstü
 * +4 dB (kulak duyarlı). Sessiz bölümler geçitle (en yüksek bloğun 20 dB altı) dışlanır. Bas ağırlıklı karışımı fazla kısmaz.
 */
export function loudness(L, R, sr) {
	const mk = () => [new Biq('hp', 100, 0.6, sr), new Biq('hs', 2000, 0.707, sr, 4)];
	const fl = mk();
	const fr = mk();
	const blk = Math.max(256, Math.round(sr * 0.2));
	const pw = [];
	let acc = 0;
	let cnt = 0;
	for (let i = 0; i < L.length; i++) {
		const a = fl[1].tick(fl[0].tick(L[i]));
		const b = fr[1].tick(fr[0].tick(R ? R[i] : L[i]));
		acc += (a * a + b * b) * 0.5;
		if (++cnt === blk) {
			pw.push(acc / blk);
			acc = 0;
			cnt = 0;
		}
	}
	if (cnt > blk / 2) pw.push(acc / cnt);
	const mx = Math.max(...pw, 1e-20);
	let s = 0;
	let n = 0;
	for (const p of pw)
		if (p > mx * 0.01) {
			s += p;
			n++;
		}
	return Math.sqrt(n ? s / n : 0);
}
