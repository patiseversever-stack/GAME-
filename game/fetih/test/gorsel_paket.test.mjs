// Görsel paketleri (src/quiz/gorsel_paket.js): dizin yokken düz yol; dizin varken bayt aralığı (206) ve aralığı tanımayan
// sunucu (200, paketin tamamı) aynı baytları verir; aynı paketten ikinci görsel yeniden indirilmez.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const MOD = new URL('../src/quiz/gorsel_paket.js', import.meta.url).href;
let n = 0;
const taze = () => import(`${MOD}?t=${++n}`); // modül dizini bir kez okur: her durum kendi kopyasıyla

// iki görsellik sahte paket: GK-001.webp = [1,2,3], GK-002.webp = [4,5,6,7]
const PAKET = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
const DIZIN = { 'GK-001.webp': [0, 0, 3], 'GK-002.webp': [0, 3, 4] };

function ortam(aralik) {
	const log = [];
	globalThis.document = { getElementById: (id) => (id === 'fl-gkp' ? { textContent: JSON.stringify(DIZIN) } : null) };
	globalThis.fetch = async (u, o = {}) => {
		const r = o.headers?.Range;
		log.push(`${u} ${r || 'tam'}`);
		if (aralik && r) {
			const [, a, b] = /bytes=(\d+)-(\d+)/.exec(r).map(Number);
			return { ok: true, status: 206, arrayBuffer: async () => PAKET.slice(a, b + 1).buffer };
		}
		return { ok: true, status: 200, arrayBuffer: async () => PAKET.slice().buffer };
	};
	const bloblar = [];
	globalThis.URL.createObjectURL = (b) => (bloblar.push(b), `blob:${bloblar.length}`);
	return { log, bloblar };
}
const baytlari = async (b) => Array.from(new Uint8Array(await b.arrayBuffer()));

test('dizin yok: düz yol, eşzamanlı da hazır', async () => {
	delete globalThis.document;
	const m = await taze();
	assert.equal(m.paketli(), false);
	assert.equal(await m.gorselUrl('gk/', 'GK-001.webp'), 'gk/GK-001.webp');
	assert.equal(m.gorselUrlHemen('gk/', 'GK-001.webp'), 'gk/GK-001.webp');
});

test('sunucu aralığı tanıyor: yalnız o görselin baytları', async () => {
	const { log, bloblar } = ortam(true);
	const m = await taze();
	assert.equal(m.paketli(), true);
	assert.equal(m.gorselUrlHemen('gk/', 'GK-002.webp'), null); // henüz inmedi
	const u = await m.gorselUrl('gk/', 'GK-002.webp');
	assert.match(u, /^blob:/);
	assert.deepEqual(await baytlari(bloblar[0]), [4, 5, 6, 7]);
	assert.equal(bloblar[0].type, 'image/webp');
	assert.deepEqual(log, ['gkp/0.webp bytes=3-6']);
	assert.equal(m.gorselUrlHemen('gk/', 'GK-002.webp'), u); // artık eşzamanlı
	assert.equal(await m.gorselUrl('gk/', 'GK-002.webp'), u); // ikinci istek yok
	assert.equal(log.length, 1);
});

test('sunucu aralığı tanımıyor: paketin tamamı bir kez, ikisi de doğru kesilir', async () => {
	const { log, bloblar } = ortam(false);
	const m = await taze();
	await m.gorselUrl('gk/', 'GK-002.webp');
	await m.gorselUrl('gk/', 'GK-001.webp');
	assert.deepEqual(await baytlari(bloblar[0]), [4, 5, 6, 7]);
	assert.deepEqual(await baytlari(bloblar[1]), [1, 2, 3]);
	assert.equal(log.length, 1, 'aynı paket ikinci kez indirilmemeli: ' + log.join(' | '));
});

test('dizinde olmayan dosya: düz yol', async () => {
	ortam(true);
	const m = await taze();
	assert.equal(await m.gorselUrl('gk/', 'GK-999.webp'), 'gk/GK-999.webp');
});
