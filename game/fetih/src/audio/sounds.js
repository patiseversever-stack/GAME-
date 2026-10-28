// Efekt tarifleri. Her biri e (motor), t (başlama zamanı), o (seçenekler) alır.
// Karakter: davul vuruşları = darbe; zurna/ney = zafer ve yas; tahta tıkı = arayüz.
import { degHz } from './music.js';
import { zurna, ney, horn } from './voices.js';

const R = (d) => degHz('rast', d);
const H = (d) => degHz('hicaz', d);
const U = (d) => degHz('ussak', d);

// küçük yardımcılar
const roll = (e, t, n, gap0, gap1, v0, v1, rate = 1) => {
	let tt = t;
	for (let i = 0; i < n; i++) {
		const k = i / Math.max(1, n - 1);
		e.hit('tek', tt, v0 + (v1 - v0) * k, rate * (0.95 + e.r() * 0.1), (i % 2 ? 0.2 : -0.2));
		tt += gap0 + (gap1 - gap0) * k;
	}
	return tt;
};
const sparkle = (e, t, vol = 0.25, n = 4, base = 1500) => {
	for (let i = 0; i < n; i++) e.tone('sine', base * Math.pow(1.5, i % 3) * (1 + (i >> 1) * 0.5), 0, t + i * 0.045, 0.22, vol * (1 - i * 0.12), { a: 0.002 });
};
const whoosh = (e, t, dur, vol, f0, f1, o = {}) => e.noise(t, dur, vol, f0, f1, { q: 0.9, a: dur * 0.6, ...o });

export const SOUNDS = {
	// ---------------------------------------------------------------- arayüz
	tap: {
		prio: 0, cd: 0.04, max: 3, dur: 0.12,
		fn(e, t, o) {
			e.hit('woodTap', t, 0.5, (o.rate || 1) * (0.95 + e.r() * 0.14));
		},
	},
	// çark mandalı ve sayaç tik'i. o.urgent / o.left (sn) ile son 4 saniye gerginleşir.
	tick: {
		prio: 0, cd: 0.025, max: 5, dur: 0.15,
		fn(e, t, o) {
			const left = o.left;
			const urgent = o.urgent || (typeof left === 'number' && left <= 4);
			if (!urgent) {
				e.hit('woodLow', t, o.vol || 0.34, (o.rate || 1) * (0.92 + e.r() * 0.16));
				return;
			}
			const k = typeof left === 'number' ? Math.max(0, Math.min(1, (4 - left) / 4)) : 0.5;
			e.hit('woodTap', t, 0.62 + k * 0.25, 1.3 + k * 0.5);
			e.hit('dbTek', t, 0.18 + k * 0.22, 1.1 + k * 0.3);
			if (typeof left === 'number' && left <= 2) e.hit('dum', t, 0.34 + (2 - left) * 0.12, 1.15);
		},
	},
	banner: {
		prio: 2, cd: 0.2, max: 1, dur: 1.0, duck: [0.35, 0.5, 0.6],
		fn(e, t, o) {
			const bad = o.tone === 'bad' || o.tone === 'lose';
			whoosh(e, t, 0.32, 0.22, 300, 2400);
			e.hit('dum', t + 0.2, 0.85, 1);
			e.hit('zil', t + 0.2, 0.2, 1.3);
			if (o.short) {
				e.pluck('kanun', bad ? H(1) : R(4), t + 0.22, 0.45);
				return;
			}
			if (bad) {
				ney(e, t + 0.2, H(4), 0.5, 0.4, { scoop: 40 });
				ney(e, t + 0.6, H(1), 0.6, 0.35, { scoop: 40 });
			} else {
				zurna(e, t + 0.2, R(0), 0.14, 0.4);
				zurna(e, t + 0.36, R(4), 0.5, 0.42, { bend: 50 });
				e.pluck('kanun', R(7), t + 0.4, 0.4);
			}
		},
	},
	question: {
		prio: 1, cd: 0.2, max: 1, dur: 0.6,
		fn(e, t) {
			whoosh(e, t, 0.2, 0.18, 500, 3000);
			e.hit('woodLow', t + 0.05, 0.6, 0.9);
			e.hit('woodTap', t + 0.14, 0.6, 1.1);
			e.pluck('kanun', R(4), t + 0.14, 0.4);
			e.pluck('kanun', R(7), t + 0.25, 0.34, 0.15);
		},
	},
	answer: {
		prio: 1, cd: 0.1, max: 2, dur: 0.4,
		fn(e, t) {
			e.hit('woodLow', t, 0.6, 1);
			e.hit('rim', t, 0.25, 1);
			e.pluck('baglama', R(2), t + 0.02, 0.4);
		},
	},
	timeout: {
		prio: 2, cd: 0.3, max: 1, dur: 0.7, duck: [0.3, 0.3, 0.5],
		fn(e, t) {
			e.hit('dum', t, 0.8, 0.8);
			e.tone('sawtooth', 240, 120, t, 0.45, 0.14, { a: 0.01, lp: 700 });
			e.noise(t, 0.3, 0.12, 400, 160, { type: 'lowpass', a: 0.01 });
		},
	},
	right: {
		prio: 2, cd: 0.12, max: 2, dur: 0.9, duck: [0.2, 0.2, 0.4],
		fn(e, t, o) {
			const n = Math.max(0, Math.min(6, o.n | 0));
			const sh = n * 1; // kombo: dizi basamağı yukarı
			const d = [0, 2, 4, 7];
			d.forEach((x, i) => e.pluck('kanun', R(x + sh), t + i * 0.055, 0.5 - i * 0.04, (i - 1.5) * 0.12));
			e.hit('woodTap', t, 0.5, 1.4);
			e.hit('dbTek', t, 0.3, 1);
			sparkle(e, t + 0.18, 0.1 + n * 0.02, 3 + Math.min(3, n), 1600 + n * 120);
			if (n >= 2) e.hit('zil', t + 0.1, 0.18 + n * 0.03, 1.4);
		},
	},
	wrong: {
		prio: 2, cd: 0.12, max: 1, dur: 0.7, duck: [0.25, 0.3, 0.5],
		fn(e, t) {
			e.hit('dum', t, 0.9, 0.85);
			zurna(e, t, H(2) * 0.5, 0.2, 0.3, { bend: 0 });
			zurna(e, t + 0.2, H(0) * 0.5, 0.3, 0.3, { bend: 120 });
			e.noise(t, 0.2, 0.1, 500, 120, { type: 'lowpass' });
		},
	},
	reveal: {
		prio: 1, cd: 0.2, max: 1, dur: 0.8,
		fn(e, t) {
			roll(e, t, 6, 0.045, 0.03, 0.18, 0.5);
			e.hit('dum', t + 0.32, 0.8, 1);
			e.pluck('baglama', H(0), t + 0.32, 0.5);
			e.pluck('baglama', H(4), t + 0.32, 0.4);
			e.hit('zil', t + 0.32, 0.2, 1.4);
		},
	},
	// çark: dönüş boyunca yavaşlayan mandallar, sonda vuruş. o.dur (varsayılan 2.35), o.pegs=false mandalları keser
	wheel: {
		prio: 2, cd: 0.4, max: 1, dur: 3.2, duck: [0.3, 2.4, 0.7],
		fn(e, t, o) {
			const dur = o.dur || 2.35;
			whoosh(e, t, 0.9, 0.2, 250, 1700, { a: 0.3 });
			if (o.pegs !== false) {
				const K = e.low ? 24 : 38;
				for (let k = 1; k <= K; k++) {
					const tau = 1 - Math.pow(1 - k / (K + 1), 1 / 3);
					const v = 0.16 + 0.22 * (0.4 + 0.6 * (tau > 0.6 ? tau : 0.6 - tau * 0.2));
					e.hit('woodLow', t + 0.05 + tau * dur, v, 0.95 + (k % 3) * 0.06 + tau * 0.12, ((k % 2) - 0.5) * 0.3);
				}
			}
			const te = t + dur + 0.05;
			e.hit('dum', te, 0.8, 1);
			e.pluck('kanun', R(4), te, 0.5);
			e.pluck('kanun', R(7), te + 0.07, 0.45);
			sparkle(e, te + 0.1, 0.1, 3, 1800);
		},
	},
	// ---------------------------------------------------------------- harita ve savaş
	castle: {
		prio: 3, cd: 0.3, max: 1, dur: 1.5, duck: [0.45, 0.7, 0.9],
		fn(e, t) {
			e.hit('dumBig', t, 1, 1);
			e.noise(t, 0.4, 0.3, 700, 200, { type: 'lowpass', a: 0.005 });
			for (let i = 0; i < 6; i++) e.hit('rock', t + 0.04 + i * 0.05 + e.r() * 0.03, 0.2, 0.7 + e.r() * 0.4, (e.r() - 0.5) * 0.7);
			zurna(e, t + 0.28, R(0), 0.16, 0.38);
			zurna(e, t + 0.46, R(4), 0.6, 0.4, { bend: 60 });
			e.hit('zil', t + 0.46, 0.3, 1);
		},
	},
	claim: {
		prio: 2, cd: 0.15, max: 2, dur: 0.7, duck: [0.15, 0.15, 0.4],
		fn(e, t) {
			e.hit('woodLow', t, 0.7, 0.8);
			e.hit('dum', t, 0.62, 1.15);
			e.pluck('baglama', R(0), t + 0.03, 0.5);
			e.pluck('kanun', R(4), t + 0.09, 0.45);
			e.pluck('kanun', R(7), t + 0.15, 0.4);
			sparkle(e, t + 0.14, 0.08, 3, 2000);
		},
	},
	siege: {
		prio: 3, cd: 0.5, max: 1, dur: 2.6, duck: [0.5, 1.6, 0.9],
		fn(e, t) {
			horn(e, t, 73.4, 1.3, 0.34, { open: 900 });
			const end = roll(e, t + 0.1, 16, 0.12, 0.035, 0.14, 0.55, 0.9);
			e.hit('dum', t, 0.7, 0.9);
			e.hit('dum', t + 0.6, 0.6, 0.9);
			e.hit('dumBig', t + 1.35, 1, 0.95);
			e.hit('zil', t + 1.35, 0.5, 0.9);
			zurna(e, t + 1.4, H(0), 0.5, 0.38, { bend: 80 });
			zurna(e, t + 1.4, H(0) * 1.5, 0.5, 0.2);
		},
	},
	attack: {
		prio: 2, cd: 0.2, max: 1, dur: 1.0, duck: [0.3, 0.4, 0.6],
		fn(e, t) {
			whoosh(e, t, 0.28, 0.26, 250, 2600, { a: 0.2 });
			e.hit('tek', t, 0.5, 1.1, -0.2);
			e.hit('tek', t + 0.07, 0.6, 1.2, 0.2);
			e.hit('dum', t + 0.15, 0.95, 1);
			zurna(e, t + 0.15, R(0), 0.12, 0.38);
			zurna(e, t + 0.28, R(4), 0.4, 0.4, { bend: 70 });
		},
	},
	conquer: {
		prio: 3, cd: 0.3, max: 1, dur: 2.2, duck: [0.5, 1.0, 0.9],
		fn(e, t) {
			e.hit('dumBig', t, 1, 1);
			e.hit('zil', t, 0.5, 1);
			e.hit('tek', t + 0.12, 0.5, 1.1);
			e.hit('tek', t + 0.18, 0.6, 1.1);
			zurna(e, t + 0.05, R(0), 0.2, 0.42);
			zurna(e, t + 0.28, R(4), 0.2, 0.42);
			zurna(e, t + 0.5, R(7), 0.9, 0.46, { bend: 60, bright: true });
			for (let i = 0; i < 7; i++) e.pluck('kanun', R(i * 2 - 2), t + 0.1 + i * 0.05, 0.4, -0.5 + i * 0.16);
			sparkle(e, t + 0.5, 0.1, 5, 1900);
		},
	},
	tower: {
		prio: 3, cd: 0.25, max: 1, dur: 1.4, duck: [0.45, 0.5, 0.8],
		fn(e, t) {
			e.hit('dumBig', t, 1, 1.05);
			e.hit('tek', t, 0.7, 0.8);
			e.noise(t, 0.9, 0.34, 900, 120, { type: 'lowpass', a: 0.01 });
			for (let i = 0; i < 12; i++) e.hit('rock', t + 0.05 + i * 0.07 + e.r() * 0.05, 0.28 * (1 - i / 16), 0.6 + e.r() * 0.7, (e.r() - 0.5) * 0.9);
		},
	},
	defend: {
		prio: 2, cd: 0.2, max: 1, dur: 1.0, duck: [0.3, 0.3, 0.5],
		fn(e, t) {
			e.hit('clang', t, 0.8, 1);
			e.hit('dum', t, 0.8, 1.1);
			e.hit('woodLow', t + 0.02, 0.5, 0.8);
			e.pluck('baglama', R(4), t + 0.12, 0.4);
			e.pluck('baglama', R(7), t + 0.2, 0.4);
		},
	},
	eliminate: {
		prio: 3, cd: 0.5, max: 1, dur: 2.8, duck: [0.55, 1.6, 1.0],
		fn(e, t) {
			e.hit('dumBig', t, 1, 0.8);
			e.hit('dum', t + 0.55, 0.7, 0.75);
			e.hit('dum', t + 1.1, 0.6, 0.7);
			e.noise(t, 1.6, 0.26, 600, 70, { type: 'lowpass', a: 0.01 });
			ney(e, t + 0.15, H(4), 0.7, 0.4, { scoop: 50 });
			ney(e, t + 0.85, H(1), 0.7, 0.38, { scoop: 50 });
			ney(e, t + 1.55, H(0), 1.0, 0.36, { scoop: 50 });
			e.hit('rock', t + 0.05, 0.3, 0.6);
		},
	},
	// ---------------------------------------------------------------- sonuç
	win: {
		prio: 3, cd: 1, max: 1, dur: 4.4, duck: [0.6, 3.2, 1.2],
		fn(e, t) {
			const b = 0.2;
			e.hit('dumBig', t, 1, 1);
			e.hit('zil', t, 0.5, 1);
			// davul figürü
			[[1, 'tek'], [1.5, 'tek'], [2, 'dum'], [2.5, 'tek'], [3, 'dum'], [3.5, 'dum']].forEach(([x, n]) => e.hit(n, t + x * b, n === 'dum' ? 0.75 : 0.5, 1.05));
			roll(e, t + 4 * b, 10, 0.05, 0.03, 0.2, 0.55);
			// zurna cümlesi
			zurna(e, t + 0.05, R(0), b * 0.9, 0.44);
			zurna(e, t + b, R(2), b * 0.9, 0.44);
			zurna(e, t + 2 * b, R(4), b * 0.9, 0.46);
			zurna(e, t + 3 * b, R(7), 2.4, 0.5, { bend: 70, bright: true });
			zurna(e, t + 3 * b, R(4), 2.4, 0.22);
			// kanun yükselen arpej
			for (let i = 0; i < 8; i++) e.pluck('kanun', R(i * 2 - 1), t + 0.5 + i * 0.055, 0.38, -0.5 + i * 0.14);
			// son vuruş
			e.hit('dumBig', t + 1.5, 0.9, 1.05);
			e.hit('zil', t + 1.5, 0.55, 0.9);
			[0, 2, 4, 7, 9].forEach((d, i) => e.pluck('kanun', R(d), t + 1.5 + i * 0.03, 0.4, -0.4 + i * 0.2));
			sparkle(e, t + 1.6, 0.1, 6, 1800);
		},
	},
	lose: {
		prio: 3, cd: 1, max: 1, dur: 4.0, duck: [0.55, 2.6, 1.2],
		fn(e, t) {
			e.hit('dumBig', t, 0.8, 0.8);
			e.hit('dum', t + 1.1, 0.5, 0.75);
			e.tone('sine', 73.4, 70, t, 3.4, 0.2, { a: 0.5 });
			const seq = [[4, 0.0, 0.9], [3, 0.8, 0.8], [2, 1.5, 0.8], [1, 2.2, 0.9], [0, 2.9, 1.3]];
			for (const [d, at, du] of seq) ney(e, t + 0.15 + at * 0.8, U(d), du * 0.9, 0.38, { scoop: 60, release: 0.4 });
			e.pluck('baglama', U(0) * 0.5, t + 2.4, 0.5);
		},
	},
	// ---------------------------------------------------------------- yeni
	combo: {
		prio: 2, cd: 0.1, max: 2, dur: 0.8,
		fn(e, t, o) {
			const n = Math.max(1, Math.min(8, o.n | 0 || 1));
			const f = R(n * 2 - 1);
			e.tone('sine', f * 0.5, f * 2, t, 0.16, 0.16, { a: 0.01, sweep: 1 });
			e.pluck('kanun', f, t + 0.08, 0.5);
			e.pluck('kanun', f * 1.5, t + 0.13, 0.36);
			e.tone('sine', f * 4, 0, t + 0.12, 0.3, 0.1);
			e.hit('woodTap', t, 0.4, 1.5 + n * 0.05);
			if (n >= 3) e.hit('zil', t + 0.1, 0.22, 1.5);
		},
	},
	joker: {
		prio: 2, cd: 0.2, max: 1, dur: 1.3, duck: [0.2, 0.3, 0.5],
		fn(e, t) {
			whoosh(e, t, 0.45, 0.2, 400, 4200, { a: 0.35 });
			[4, 6, 7, 9, 11, 13].forEach((d, i) => {
				e.tone('sine', R(d), 0, t + 0.08 + i * 0.065, 0.5, 0.22, { a: 0.003, pan: ((i % 2) - 0.5) * 0.7 });
				e.tone('sine', R(d) * 2.01, 0, t + 0.08 + i * 0.065, 0.3, 0.08, { a: 0.003 });
			});
			e.pluck('kanun', R(14), t + 0.5, 0.4);
			e.hit('zil', t + 0.5, 0.16, 1.6);
		},
	},
	fireworks: {
		prio: 1, cd: 0.06, max: 4, dur: 1.9,
		fn(e, t, o) {
			const f0 = 520 + e.r() * 300;
			const pan = o.pan !== undefined ? o.pan : (e.r() - 0.5) * 1.4;
			e.tone('sine', f0, f0 * 3.4, t, 0.5, 0.07, { a: 0.1, pan, sweep: 1 });
			const tb = t + 0.52;
			e.hit('dum', tb, 0.5, 1.3 + e.r() * 0.3, pan);
			e.noise(tb, 0.6, 0.3, 4000, 1200, { type: 'highpass', a: 0.002, pan });
			for (let i = 0; i < 14; i++) e.hit('rim', tb + 0.04 + i * 0.045 + e.r() * 0.05, 0.1 + e.r() * 0.08, 1.8 + e.r() * 1.6, pan + (e.r() - 0.5) * 0.5);
			sparkle(e, tb + 0.05, 0.05, 3, 2600 + e.r() * 800);
		},
	},
	march: {
		prio: 2, cd: 0.3, max: 1, dur: 2.2, duck: [0.18, 1.2, 0.6],
		fn(e, t, o) {
			const dur = o.dur || 1.6;
			const g = 0.2;
			const n = Math.floor(dur / g);
			for (let i = 0; i < n; i++) {
				const k = i / n;
				const tt = t + i * g;
				const v = 0.35 + 0.35 * k;
				if (i % 4 === 0) e.hit('dum', tt, v + 0.15, 0.95);
				else if (i % 4 === 2) e.hit('dum', tt, v, 1.1);
				else e.hit('tek', tt, v * 0.6, 1.0, i % 2 ? 0.2 : -0.2);
				if (i % 4 === 3) e.hit('tek', tt + g * 0.5, v * 0.4, 1.15);
				// ayak sesleri
				e.noise(tt, 0.1, 0.1 + 0.1 * k, 500, 120, { type: 'lowpass', a: 0.004, pan: (i % 2 ? 0.3 : -0.3) });
			}
		},
	},
	catapult: {
		prio: 2, cd: 0.4, max: 1, dur: 2.2, duck: [0.25, 0.8, 0.6],
		fn(e, t) {
			// gıcırtı: gerilen ahşap
			e.tone('sawtooth', 70, 150, t, 0.5, 0.1, { a: 0.1, lp: 520 });
			e.noise(t, 0.5, 0.1, 380, 700, { q: 7, a: 0.2 });
			// fırlatma
			const tr = t + 0.55;
			e.hit('woodLow', tr, 1, 0.55);
			e.hit('dum', tr, 0.85, 0.9);
			e.hit('rim', tr, 0.4, 0.8);
			whoosh(e, tr, 0.75, 0.3, 500, 1100, { a: 0.3 });
		},
	},
	crumble: {
		prio: 3, cd: 0.3, max: 1, dur: 2.3, duck: [0.4, 1.0, 0.8],
		fn(e, t) {
			e.hit('dumBig', t, 0.85, 0.75);
			e.noise(t, 1.9, 0.5, 380, 70, { type: 'lowpass', a: 0.05 });
			const N = e.low ? 16 : 28;
			for (let i = 0; i < N; i++) {
				const at = Math.pow(e.r(), 1.6) * 1.7;
				e.hit('rock', t + 0.06 + at, 0.28 * (1 - at / 2.4), 0.55 + e.r() * 0.9, (e.r() - 0.5) * 1.2);
			}
		},
	},
};

export const SOUND_NAMES = Object.keys(SOUNDS);
