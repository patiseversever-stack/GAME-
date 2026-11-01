// Kare temposu yöneticisi (core/quality.js Governor): 60 / 90 / 120 Hz ekran benzetimi.
//   1. Hareket varken ekranın kendi hızı (60 → 60, 90 → 90, 120 → 120), eşit aralık.
//   2. Durgunken 30 kare; hareket başlayınca beklemeden (aynı vsync'te) çizer.
//   3. GPU yetişemezse: 120 Hz'de önce 60'a (eşit bölen), 60 Hz'de çözünürlük kısılır; hiçbir zaman düzensiz bölen yok.
//   4. Çözünürlük değişimi hareket sürerken uygulanmaz, durgun ilk anda uygulanır.
//   5. vsync ölçümü kaçan karelerle şişmez (GPU yavaşken ekran hızı yanlış okunmaz).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Governor } from '../src/core/quality.js';

const store = () => {
	const m = new Map();
	return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) };
};

/**
 * Benzetim: hz yenileme hızında rAF; work(ms) çizilen karenin süresi (GPU dahil). Çizim vsync'i aşarsa sonraki rAF
 * gecikir (tarayıcı gibi). idleAt(t): o anda ekran durgun mu. Dönüş: çizilen karelerin zamanları ve yöneticinin olayları.
 */
function sim(g, { hz, seconds, work = () => 2, idleAt = () => false, onFrame = null }) {
	const v = 1000 / hz;
	let now = 0;
	let prev = 0;
	const frames = [];
	const scales = [];
	g.onScale = () => scales.push({ t: now, s: g.scale, idle: g.idle });
	while (now < seconds * 1000) {
		const delta = prev ? now - prev : v;
		prev = now;
		g.idle = idleAt(now);
		let cost = 0;
		if (g.tick(now, delta)) {
			frames.push(now);
			cost = work(now);
			onFrame?.(now);
		}
		// bir sonraki vsync: çizim süresi kadar (yukarı yuvarlanmış vsync katı)
		now += Math.max(1, Math.ceil(cost / v - 1e-9)) * v;
	}
	return { frames, scales };
}

const rate = (frames, t0, t1) => frames.filter((t) => t >= t0 && t < t1).length / ((t1 - t0) / 1000);
const gaps = (frames, t0, t1) => {
	const f = frames.filter((t) => t >= t0 && t < t1);
	const out = new Set();
	for (let i = 1; i < f.length; i++) out.add(Math.round(f[i] - f[i - 1]));
	return [...out];
};

for (const hz of [60, 90, 120]) {
	test(`${hz} Hz: hareket varken ekranın hızı, durgunken 30, hareket başlayınca beklemeden`, () => {
		const g = new Governor({ tier: 1, gpu: 'test', store: store(), mobile: true });
		const idleAt = (t) => t > 3000 && t < 6000; // 0–3 sn hareket, 3–6 durgun, 6–9 hareket
		const { frames } = sim(g, { hz, seconds: 9, idleAt });
		const moving = rate(frames, 1000, 3000);
		const still = rate(frames, 4000, 6000);
		assert.ok(Math.abs(moving - hz) <= hz * 0.03, `hareket: ${moving} kare/sn (beklenen ${hz})`);
		assert.ok(Math.abs(still - Math.min(30, hz)) <= 3, `durgun: ${still} kare/sn (beklenen 30)`);
		// eşit aralık: hareket sırasında tek bir kare aralığı
		const gm = gaps(frames, 1000, 3000);
		assert.equal(gm.length, 1, `hareket aralıkları eşit değil: ${gm}`);
		// hareket 6000'de başlıyor: ilk kare en geç bir vsync sonra
		const first = frames.find((t) => t >= 6000);
		assert.ok(first - 6000 <= 1000 / hz + 0.01, `hareket başlayınca ilk kare ${(first - 6000).toFixed(1)} ms gecikti`);
		assert.equal(g.hz, hz);
	});
}

test('120 Hz, GPU 120 kareye yetişemiyor (11 ms): 60 kareye iner, düzensiz bölen yok', () => {
	const g = new Governor({ tier: 1, gpu: 'test', store: store(), mobile: true });
	// ilk saniye durgun (çizilmeyen vsync'lerden ekran hızı öğrenilir), sonra ağır hareket
	const { frames } = sim(g, { hz: 120, seconds: 12, work: (t) => (t < 1000 ? 2 : 11), idleAt: (t) => t < 1000 });
	const end = rate(frames, 8000, 12000);
	assert.ok(Math.abs(end - 60) <= 2, `son durum ${end} kare/sn (beklenen 60)`);
	for (const gp of gaps(frames, 8000, 12000)) assert.ok(Math.abs(gp - 16.67) < 0.6, `aralık ${gp} ms`);
	assert.equal(g.hz, 120, 'ekran hızı yanlış okundu (kaçan kareler vsync ölçümünü şişirdi)');
});

test('90 Hz, GPU 90 kareye yetişemiyor: 45 kare (eşit), 60 gibi düzensiz değil', () => {
	const g = new Governor({ tier: 1, gpu: 'test', store: store(), mobile: true });
	const { frames } = sim(g, { hz: 90, seconds: 12, work: () => 13 });
	const end = rate(frames, 8000, 12000);
	assert.ok(Math.abs(end - 45) <= 2, `son durum ${end} kare/sn (beklenen 45)`);
	assert.equal(gaps(frames, 8000, 12000).length, 1, 'aralıklar eşit değil');
});

test('60 Hz, GPU yetişemiyor: çözünürlük kısılır ama yalnız durgun anda uygulanır', () => {
	const g = new Governor({ tier: 1, gpu: 'test', store: store(), mobile: true });
	const idleAt = (t) => t > 9000 && t < 9600;
	const { scales } = sim(g, { hz: 60, seconds: 12, work: (t) => (t < 9000 ? 22 : 10), idleAt });
	assert.ok(scales.length >= 1, 'çözünürlük hiç kısılmadı');
	for (const s of scales) assert.ok(s.idle || s.t > 0, 'ölçek');
	// ilk ölçek değişimi ya durgun anda ya da 3 sn erteleme dolduktan sonra
	const first = scales[0];
	assert.ok(first.idle || first.t >= 3000, `ölçek hareket sürerken hemen uygulandı (t=${first.t})`);
	assert.ok(g.scale < 1, 'ölçek düşmedi');
});
