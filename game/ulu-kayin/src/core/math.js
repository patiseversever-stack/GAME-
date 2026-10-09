// Küçük matematik yardımcıları. Kare başına nesne üretmezler (çöp toplayıcı duraklaması olmasın).

export const TAU = Math.PI * 2;

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const saturate = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => saturate((x - a) / (b - a));
export const smoothstep = (a, b, x) => {
	const t = saturate((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

/** Kare hızından bağımsız yumuşak yaklaşma: k büyüdükçe hızlı. */
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);

/** Açıyı (-π, π] aralığına sarar. */
export const wrapAngle = (a) => {
	a = (a + Math.PI) % TAU;
	return (a < 0 ? a + TAU : a) - Math.PI;
};

/** İki açı arasındaki en kısa fark (b - a). */
export const angleDelta = (a, b) => wrapAngle(b - a);

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** Tohumlu rastgele sayı (mulberry32): aynı tohum her cihazda aynı ağacı üretir. */
export function rng(seed) {
	let a = seed >>> 0;
	const next = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	next.range = (lo, hi) => lo + (hi - lo) * next();
	next.pick = (arr) => arr[(next() * arr.length) | 0];
	next.sign = () => (next() < 0.5 ? -1 : 1);
	return next;
}

/** 1B değer gürültüsü (rüzgâr, sallanma gibi yumuşak dalgalanmalar için). */
export function noise1(x) {
	const i = Math.floor(x);
	const f = x - i;
	const h = (n) => {
		const s = Math.sin(n * 127.1) * 43758.5453;
		return s - Math.floor(s);
	};
	const u = f * f * (3 - 2 * f);
	return lerp(h(i), h(i + 1), u) * 2 - 1;
}
