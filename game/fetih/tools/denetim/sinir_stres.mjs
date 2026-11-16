// STRES DENETİMİ İÇİN SAHTE SORULAR (SORU-100K.md Aşama 0.2): her tipte bankanın en dolu sorusu alınır, ekranda görünen
// her alanı uzunluk sözleşmesinin (src/quiz/sinirlar.js SINIR) sınırına dek geniş harfli Türkçe kelimelerle doldurulur;
// her alana o tipin en uzun kelimesi (uzunKelime) kadar bir kelime konur. Kimlik: sx-<tip>.
//   node tools/denetim/sinir_stres.mjs <çıktı.json> [tip,tip]
//   TEK=1 node tools/denetim/cakisma.cjs dist/SoruGalerisi.html <çıktı.json> hepsi <klasör> soru,joker,cevap 3
// İşaretler (yanlış bul {…}, şive […], atasözü ___) bozulmaz: dolgu alanın SONUNA eklenir. Çengel ve kelime avının
// kelimeleri değişmez (yerleşim kesişime bağlı); adam asmaca, anagram ve harf al kelimesi büyük harfle uzatılır.
import { writeFileSync } from 'node:fs';
process.chdir(new URL('../..', import.meta.url).pathname);
await import('../../test/kanca.mjs');
const { BANK } = await import('../../src/data/bank.js');
const { yeniBank } = await import('../../src/quiz/mac.js');
const { DENEME_SAMPLES } = await import('../../src/quiz/deneme.js');
const { SINIR, gez, metinler, ihlaller, kelimeSiniri } = await import('../../src/quiz/sinirlar.js');

const [out, tipA] = process.argv.slice(2);
if (!out) {
	console.log('kullanım: node tools/denetim/sinir_stres.mjs <çıktı.json> [tip,tip]');
	process.exit(2);
}
const L = (s) => [...String(s ?? '')].length;
// geniş harfli gerçek Türkçe kelimeler (m, w yerine ş, ğ, ü, ö, M, Ş, Ğ yoğun): gerçek metnin en kötüsüne yakın genişlik
const HAVUZ = ['Muğla', 'Gümüşhane', 'Şömine', 'Mümkün', 'Gömülmüş', 'Ömürlük', 'Düğmeler', 'Mühürlü', 'Şimşekmiş', 'Gümüşlüğün', 'Müzeleşmiş', 'Böğürtlen', 'Görmüşüm', 'Ömer', 'Müşfik', 'Gömlek'];
const UZUN = 'Müşkülpesentliklerimizdenmişmiymişsiniz';
const HARF = 'ŞĞÜÖMÇŞĞÜÖM';
let tohum = 0;
/** tam n karakterlik dolgu (başında boşluk), içinde bir adet maxw uzunluğunda kelime, başka kelime maxw'yi aşmaz */
function dolgu(n, maxw) {
	if (n < 2) return '';
	const w = [];
	let len = 0; // ' ' + kelime toplamı
	const koy = (s) => (w.push(s), (len += 1 + L(s)));
	const uz = Math.min(maxw, n - 1);
	if (uz >= 4) koy(UZUN.slice(0, uz));
	for (let k = 0; k < 400; k++) {
		const s = HAVUZ[(tohum++ * 7) % HAVUZ.length];
		if (len + 1 + L(s) > n) break;
		koy(s);
	}
	const r = n - len;
	if (r >= 2) koy('m'.repeat(Math.min(r - 1, maxw)));
	let s = ' ' + w.join(' ');
	while (L(s) < n) s += 'm'; // son kelimeyi uzat (maxw aşılırsa kısalt)
	return s.slice(0, n);
}

const seen = new Set();
const all = [];
for (const q of [...BANK, ...yeniBank(), ...Object.values(DENEME_SAMPLES).flat()]) if (!seen.has(q.id)) seen.add(q.id), all.push(q);
const toplam = (q) => metinler(q).reduce((a, [, s]) => a + L(s), 0);
const tipler = tipA ? tipA.split(',') : Object.keys(SINIR);
const sahte = [];
for (const t of tipler) {
	const S = SINIR[t];
	// türev (Mancınık ikizi) kaynağıyla aynı metni taşır; tipin bütün soruları türevse (Mancınık) onlardan seçilir
	const tumu = all.filter((q) => q.type === t);
	const aday = tumu.some((q) => !q.src) ? tumu.filter((q) => !q.src) : tumu;
	if (!S || !aday.length) {
		console.log(`${t}: atlandı (${!S ? 'sözleşme yok' : 'soru yok'})`);
		continue;
	}
	const base = aday.reduce((a, b) => (toplam(b) > toplam(a) ? b : a));
	const q = JSON.parse(JSON.stringify(base));
	q.id = 'sx-' + t;
	gez(q, (alan, metin, ekle) => {
		const n = S[alan] - L(metin);
		if (n <= 0) return;
		if (alan === 'kelime') {
			if (t === 'hang' || t === 'anagram' || t === 'harfal') ekle(HARF.repeat(4).slice(0, n));
			return; // çengel ve kelime avı kelimeleri yerleşime bağlı: değişmez
		}
		// kelime sınırı mevcut metnin son kelimesiyle birleşmesin diye dolgu boşlukla başlar
		ekle(dolgu(n, kelimeSiniri(S, alan)));
	});
	const ih = ihlaller(q);
	const eksik = metinler(q).filter(([alan, s]) => alan !== 'kelime' && L(s) < S[alan] - 1);
	console.log(`${t.padEnd(10)} taban ${base.id.padEnd(22)} ${ih.length ? 'SÖZLEŞMEYİ AŞIYOR ' + ih.map((v) => v.alan).join(',') : 'sınırda'}${eksik.length ? ' · eksik dolu: ' + eksik.map(([a]) => a).join(',') : ''}`);
	sahte.push(q);
}
writeFileSync(out, JSON.stringify(sahte, null, 1));
console.log(`\n${sahte.length} sahte soru → ${out}`);
