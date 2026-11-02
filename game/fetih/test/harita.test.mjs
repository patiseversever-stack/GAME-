// Harita soruları (v1.6): metin, alan ve değerlendirme denetimi.
//   1. Her sorunun kendi hedefi tam isabet (il sorusunda koordinat ilin içinde, göl sorusunda gölün içinde).
//   2. İlin ya da gölün içinde herhangi bir yer tam isabet; kenarın hemen dışı küçük hata, uzak yer büyük hata.
//   3. Maket (alt) gerçek konumdan kayıksa maketin üstü de tam isabet.
//   4. Metinler: soru işaretiyle biter, tek cümle, kaba kalıp ("X nerede?" tek kelime, "haritada işaretle") yok.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, lonLatToWorld, pinJudge, setPinAreas } from '../src/quiz/types.js';
import { BANK } from '../src/data/bank.js';
import DATA from '../src/data/turkiye.json' with { type: 'json' };

setPinAreas(DATA);
const PINS = BANK.filter((q) => q.type === 'pin');
const R = () => 0.5;

test('harita bankası dolu ve kimlikler eşsiz', () => {
	assert.ok(PINS.length >= 90, `yalnız ${PINS.length} harita sorusu`);
	assert.equal(new Set(PINS.map((q) => q.id)).size, PINS.length);
});

test('her sorunun kendi koordinatı tam isabet (il/göl içinde, yarıçapta)', () => {
	for (const q of PINS) {
		const v = TYPES.pin.prepare(q, R);
		const real = lonLatToWorld(q.lon, q.lat);
		const j = TYPES.pin.judge(v, real);
		assert.equal(j.err, 0, `${q.id} "${q.q}": kendi koordinatı ${j.err.toFixed(1)} km hatalı`);
		if (q.alt) {
			const a = lonLatToWorld(q.alt[1], q.alt[0]);
			assert.equal(TYPES.pin.judge(v, a).err, 0, `${q.id}: maketin üstü isabet sayılmadı`);
		}
	}
});

test('il sorusu: ilin her yeri isabet, dışı kenara uzaklık', () => {
	const q = PINS.find((x) => x.il === 'Konya');
	const v = TYPES.pin.prepare(q, R);
	const P = DATA.provinces.find((p) => p.name === 'Konya');
	// ilin halkasından içeri doğru birkaç nokta: hepsi isabet
	const r = P.rings[0];
	const [cx, cy] = P.center;
	for (let i = 0; i < r.length; i += Math.max(2, (r.length >> 4) & ~1)) {
		const x = r[i] + (cx - r[i]) * 0.1;
		const y = r[i + 1] + (cy - r[i + 1]) * 0.1;
		const j = TYPES.pin.judge(v, { x, z: -y });
		assert.ok(j.err < 2, `Konya'nın kenarına yakın iç nokta ${j.err.toFixed(1)} km hatalı`);
	}
	// İstanbul'a dokunmak çok uzak
	const ist = lonLatToWorld(28.98, 41.01);
	assert.ok(TYPES.pin.judge(v, ist).err > 300);
});

test('göl sorusu: kıyıya yakın göl içi isabet (eskiden merkeze uzaklık ~60 km sayılıyordu)', () => {
	const q = PINS.find((x) => x.gol === 'Van Gölü');
	const v = TYPES.pin.prepare(q, R);
	// Van Gölü'nün batı ucu (Tatvan yakını, gölün içi)
	const p = lonLatToWorld(42.35, 38.55);
	assert.equal(TYPES.pin.judge(v, p).err, 0);
});

test('nokta sorusu: yarıçap dışı uzaklıkla artar, 15 km altı isabet', () => {
	const q = { lat: 39, lon: 35, r: 5 };
	const t = lonLatToWorld(35, 39);
	const at = (km) => pinJudge(q, { x: t.x + km / (111.2 / 6), z: t.z }, t, null);
	assert.equal(at(4).err, 0);
	assert.ok(at(15).correct && !at(30).correct);
	assert.ok(at(100).err > at(50).err);
});

test('metinler: düzgün tek cümle, kaba kalıp yok', () => {
	for (const q of PINS) {
		assert.ok(/\?$/.test(q.q), `${q.id}: soru işaretiyle bitmiyor: ${q.q}`);
		assert.ok(!/haritada işaretle/i.test(q.q), `${q.id}: kaba kalıp: ${q.q}`);
		assert.ok(q.q.split(' ').length >= 4, `${q.id}: ipucusuz çıplak soru: ${q.q}`);
		assert.ok(q.q.length <= 72, `${q.id}: kartta iki satırı aşar (${q.q.length}): ${q.q}`);
	}
});
