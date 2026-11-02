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

// --- v1.5: cihaz neyse onun en iyisi -------------------------------------------------------------------------------
import { launchTier, HI } from '../src/core/quality.js';

test('güçlü cihaz (60 Hz, 3 ms): ölçek 1’in üstüne (ekranın çözünürlüğüne) çıkar, sonraki açılış bir üst kademe', () => {
	const st = store();
	const g = new Governor({ tier: 0, gpu: 'güçlü', store: st, mobile: true });
	g.hi = HI; // pixelRatio: ekranın kendi çözünürlüğü bütçenin 1,35 katı
	sim(g, { hz: 60, seconds: 120, work: () => 3, idleAt: (t) => t % 10000 > 9500 }); // arada kısa durgunluklar
	assert.ok(g.scale >= HI - 0.01, `ölçek ${g.scale} (beklenen ${HI})`);
	assert.equal(st.get('perf').adj, 1, 'kademe yükseltmesi kaydedilmedi');
	assert.equal(launchTier(0, st, 'güçlü'), 1);
	assert.equal(launchTier(0, st, 'başka kart'), 0, 'başka ekran kartına uygulanmamalı');
});

test('masaüstü, GPU süresi ölçülebiliyorsa (4 ms / 16,7): süper örnekleme gerekmeden kademe yükselir; mobilde GPU saatine güvenilmez', () => {
	const m0 = store();
	const gm = new Governor({ tier: 1, gpu: 'mobil', store: m0, mobile: true });
	gm.gpuMs = 4;
	gm.cpuMs = 2;
	sim(gm, { hz: 60, seconds: 40, work: () => 4 });
	assert.equal(launchTier(1, m0, 'mobil'), 1, 'mobilde GPU saatiyle yükseltildi');
	const st = store();
	const g = new Governor({ tier: 1, gpu: 'ölçülü', store: st, mobile: false });
	g.gpuMs = 4;
	g.cpuMs = 2;
	sim(g, { hz: 60, seconds: 40, work: () => 4 });
	assert.equal(launchTier(1, st, 'ölçülü'), 2);
});

test('120 Hz ekranda 120’yi tutamayan cihaz yükselmez, 60’ta süper örnekleme yapmaz (önce akıcılık)', () => {
	const st = store();
	const g = new Governor({ tier: 1, gpu: 'orta', store: st, mobile: true });
	g.hi = HI;
	sim(g, { hz: 120, seconds: 90, work: (t) => (t < 1000 ? 2 : 11), idleAt: (t) => t < 1000 || t % 10000 > 9500 });
	assert.ok(g.cap === 60 || g._probe?.cap === 60, `kare sınırı ${g.cap}`); // (o an bir 120 denemesi sürüyor olabilir)
	assert.ok(g.scale <= 1.001, `ölçek ${g.scale}: 120 tutmayan cihazda süper örnekleme`);
	assert.equal(launchTier(1, st, 'orta'), 1, 'tutamayan cihaz yükseltildi');
});

test('zayıf cihaz yüksek kademede (her kare 40 ms): en alta iner, sonraki açılış bir alt kademe ve o kademe bir daha denenmez', () => {
	const st = store();
	const g = new Governor({ tier: 2, gpu: 'zayıf', store: st, mobile: true });
	sim(g, { hz: 60, seconds: 60, work: () => 40, idleAt: (t) => t % 6000 > 5600 });
	assert.ok(g.scale <= g.T.minScale + 0.01, `ölçek ${g.scale}`);
	assert.equal(g.cap, 30);
	assert.equal(launchTier(2, st, 'zayıf'), 1);
	// yeni oturum q1'de: rahat olsa bile q2'ye geri çıkmaz
	const g2 = new Governor({ tier: 1, base: 2, gpu: 'zayıf', store: st, mobile: true });
	g2.hi = HI;
	sim(g2, { hz: 60, seconds: 40, work: () => 3 });
	assert.equal(launchTier(2, st, 'zayıf'), 1, 'kısa rahat oturumla tutmadığı görülen kademeye geri çıktı');
	// ama düşüş geçici bir sebepten olduysa (ısınma, pil tasarrufu): uzun süre (60 sn kanıt) süper örneklemede ekran
	// hızını tutan cihaz o kademeyi yeniden dener (bir kez kötü gün yaşayan cihaz sonsuza dek düşük kalmasın)
	const g3 = new Governor({ tier: 1, base: 2, gpu: 'zayıf', store: st, mobile: true });
	g3.hi = HI;
	sim(g3, { hz: 60, seconds: 240, work: () => 3, idleAt: (t) => t % 10000 > 9500 });
	assert.equal(launchTier(2, st, 'zayıf'), 2, 'uzun ve kesin kanıtla bile eski kademeye dönmedi');
});

test('işlemci darboğazı (JS 14 ms): çözünürlük boşuna kısılmaz, kare sınırı iner', () => {
	const g = new Governor({ tier: 1, gpu: 'cpu', store: store(), mobile: true });
	g.cpuMs = 14;
	sim(g, { hz: 60, seconds: 20, work: () => 20, idleAt: (t) => t % 5000 > 4700 });
	assert.ok(g.scale >= 0.99, `ölçek kısıldı: ${g.scale}`);
	assert.equal(g.cap, 30);
});

test('tutmayan yükseltme denemesi: geri alınır ve her seferinde iki kat uzun beklenir (gidip gelme yok)', () => {
	const g = new Governor({ tier: 1, gpu: 'sınır', store: store(), mobile: true });
	// 120 Hz ekran, 60 kareyi rahat (7 ms) ama 120'yi tutmuyor: 9 ms
	let probes = 0;
	let last = g.cap;
	sim(g, {
		hz: 120,
		seconds: 180,
		work: (t) => (t < 1000 ? 2 : 9),
		idleAt: (t) => t < 1000,
		onFrame: () => {
			if (g.cap > last) probes++;
			last = g.cap;
		},
	});
	assert.equal(g.cap, 60);
	assert.ok(probes <= 5, `3 dakikada ${probes} kez 120 denendi`);
});

test('kayıt v2 (eski sürüm) okunur, kademe başına ayrı tutulur', () => {
	const st = store();
	st.set('perf', { v: 2, gpu: 'eski', scale: 0.8, cap: 60, ceil: 1 });
	const g = new Governor({ tier: 1, gpu: 'eski', store: st, mobile: true });
	assert.equal(g.scale, 0.8);
	assert.equal(g.cap, 60);
	g.save();
	const m = st.get('perf');
	assert.equal(m.v, 3);
	assert.deepEqual(m.q[1], { scale: 0.8, cap: 60 });
	assert.equal(launchTier(1, st, 'eski'), 1);
});
