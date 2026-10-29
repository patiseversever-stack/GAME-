// Oyun saati: duraklatılabilir zamanlayıcılar ve zaman.
//
// Arayüz, sinema ve soru tipleri setTimeout / setInterval / performance.now yerine buradakileri kullanır
// (aynı adlarla içe aktarılır, çağrı yerleri değişmez; performance.now() yerine clock.now()).
// Duraklatınca bekleyen zamanlayıcılar durur ve clock.now() donar; devam edince kalan süreleriyle sürerler.
// Böylece soru sayacı, bot cevapları, sahne bayrakları ve sinema beklemeleri birlikte durur.
// Gerçek zamanlayıcılar her çağrıda globalThis üzerinden alınır (Playwright'ın sahte saati de çalışsın).

const G = globalThis;
const real = () => G.performance.now();

let paused = false;
let pausedAt = 0;
let lost = 0; // duraklamada geçen toplam süre (ms)
let seq = 0;
const timers = new Map(); // id → { fn, args, due, every, h }

export const clock = {
	/** Duraklamalar çıkarılmış zaman (ms). */
	now: () => (paused ? pausedAt : real()) - lost,
	get paused() {
		return paused;
	},
	pause() {
		if (paused) return;
		pausedAt = real();
		paused = true;
		for (const t of timers.values()) G.clearTimeout(t.h);
	},
	resume() {
		if (!paused) return;
		lost += real() - pausedAt;
		paused = false;
		for (const t of timers.values()) arm(t);
	},
	/** Bekleyen bütün zamanlayıcıları at (maçtan çıkış: yarım kalan akış bir daha uyanmaz). */
	drop() {
		for (const t of timers.values()) G.clearTimeout(t.h);
		timers.clear();
	},
};

function arm(t) {
	t.h = G.setTimeout(() => fire(t), Math.max(0, t.due - clock.now()));
}

function fire(t) {
	if (!timers.has(t.id)) return;
	if (t.every) {
		t.due += t.every;
		arm(t);
	} else timers.delete(t.id);
	t.fn(...t.args);
}

function add(fn, ms, args, every) {
	const t = { id: ++seq, fn, args, due: clock.now() + (Number(ms) || 0), every, h: 0 };
	timers.set(t.id, t);
	if (!paused) arm(t);
	return t.id;
}

export const setTimeout = (fn, ms = 0, ...args) => add(fn, ms, args, 0);
export const setInterval = (fn, ms = 0, ...args) => add(fn, ms, args, Math.max(1, Number(ms) || 0));

export function clearTimeout(id) {
	const t = timers.get(id);
	if (!t) return;
	G.clearTimeout(t.h);
	timers.delete(id);
}
export const clearInterval = clearTimeout;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
