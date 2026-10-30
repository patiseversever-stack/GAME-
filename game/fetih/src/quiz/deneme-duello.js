// YENİ · deneme grubu: düello ve strateji tipleri (defter 6, 7, 10, 11, 17). Bkz. deneme.js başı ve ref/yeni-soru-tipleri/.
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
//
//   halat     Halat Çekme   20 sn canlı düello: hızlı sorular, her doğru halatı bir adım çeker (yanlış: −1 ve kilit)
//   mancinik  Mancınık      tahmin et ama aşma: kaydırıcı mancınığın gücü, taş surun önüne düşer ya da üstünden uçar
//
// Örnekler bankadan (src/data/bank.js, oyunun doğrulanmış soruları) seçilir: Halat için kategori başına kısa doğru/yanlış,
// karşılaştır ve kısa şıklı sorular; Mancınık için tahmin (num) soruları olduğu gibi.

import { PROFILE } from './timing.js';
import { BANK } from '../data/bank.js';
import { halat } from './d_halat.js';
import { mancinik } from './d_mancinik.js';

// süre profilleri (d_ortak.js stamp): Halat sabit 20 sn tur; Mancınık tahminle aynı iş + "aşma" temkini (en az 20 sn)
Object.assign(PROFILE, {
	halat: { min: 20, max: 20, think: [0, 0], round: true },
	mancinik: { min: 12, max: 28, think: [4, 1.5] },
});

export const TYPES = { halat, mancinik };
export const ORDER = [
	['halat', 'Halat Çekme', '20 sn canlı düello, her doğru bir adım'],
	['mancinik', 'Mancınık', 'Tahmin et ama aşma: taş surun önüne düşsün'],
];

const L = (s) => [...String(s)].length;
const CAT_NAME = { tarih: 'Tarih', cografya: 'Coğrafya', bilim: 'Bilim', spor: 'Spor', sanat: 'Sanat', eglence: 'Eğlence' };

/** Halat turu: kategorinin kısa doğru/yanlış (≤18), karşılaştır (≤10) ve kısa şıklı soruları; toplam 34. */
function halatRound(cat, i) {
	const of = (t) => BANK.filter((q) => q.cat === cat && q.type === t);
	const tf = of('tf')
		.filter((q) => L(q.q) <= 70)
		.slice(0, 18)
		.map((q) => ({ t: q.q, o: ['DOĞRU', 'YANLIŞ'], r: q.ans ? 0 : 1, d: q.diff, tf: true }));
	const hl = of('hilo')
		.filter((q) => q.left.v !== q.right.v && L(q.left.t) <= 24 && L(q.right.t) <= 24 && L(q.q) <= 60)
		.slice(0, 10)
		.map((q) => ({ t: q.q, o: [q.left.t, q.right.t], r: q.left.v > q.right.v ? 0 : 1, d: q.diff }));
	const ch = of('choice')
		.filter((q) => L(q.q) <= 60 && q.a.every((x) => L(x) <= 16))
		.slice(0, Math.max(8, 34 - tf.length - hl.length))
		// şık sayısı karışık: 3 ve 4
		.map((q, j) => ({ t: q.q, o: j % 2 ? q.a.slice(0, 3) : q.a.slice(), r: 0, d: q.diff }));
	return { id: `dn-ht${i + 1}`, cat, diff: 2, type: 'halat', q: `Halatı kendine çek! · ${CAT_NAME[cat]}`, items: [...tf, ...hl, ...ch] };
}

// Mancınık: bankadaki tahmin soruları (yükseklik, uzunluk, yıl, gün: "aşma" kuralına uygun, aralığı geniş olanlar)
const MANCINIK_IDS = ['n002', 'n001', 'tar-nu-022', 'cog-nu-008', 'spo-nu-004', 'n011', 'n006', 'tar-nu-009',
	// v1.1: kesin değerli (yıl, metre, adet) ve tahmini geniş aralıklı olanlar; "yaklaşık" yuvarlaması tartışmasız olanlar
	'tar-nu-029', 'tar-nu-010', 'tar-nu-011', 'tar-nu-013', 'tar-nu-016', 'tar-nu-018', 'tar-nu-023', 'tar-nu-024', 'tar-nu-031', 'tar-nu-028',
	'cog-nu-011', 'cog-nu-012', 'cog-nu-026', 'cog-nu-020', 'cog-nu-023', 'cog-nu-025',
	'spo-nu-005', 'spo-nu-010', 'bil-nu-004', 'bil-nu-020', 'san-nu-003', 'egl-nu-008'];

// v1.1 Halat ek turları: her kategoriye ikinci tur, tarih, coğrafya ve eğlenceye üçüncü tur. Bankanın önceki turlarda
// kullanılmamış soruları (şıklılar 2, 3 ve 4 şıkla karışık) + elle yazılmış kısa doğru/yanlışlar (tur başına 8).
// [ifade, doğru mu]; ders kitabı düzeyinde, tartışmasız bilgiler.
const HT = {
	tarih: [
		['TBMM 23 Nisan 1920’de açıldı.', true],
		['Kanuni Sultan Süleyman, Fatih Sultan Mehmet’in babasıdır.', false],
		['Harf Devrimi 1928’de yapıldı.', true],
		['Sakarya Meydan Muharebesi 1922’de yapıldı.', false],
		['Topkapı Sarayı’nı Fatih Sultan Mehmet yaptırdı.', true],
		['Osman Gazi, Orhan Gazi’nin oğludur.', false],
		['Yavuz Sultan Selim, Mısır seferiyle Kahire’ye girdi.', true],
		['Kanuni Sultan Süleyman Viyana’yı fethetti.', false],
		['Lozan Antlaşması 1923’te imzalandı.', true],
		['Hititlerin başkenti Hattuşa’ydı.', true],
		['Ankara Savaşı’nda Yıldırım Bayezid, Timur’u yendi.', false],
		['Mohaç Muharebesi’nde Osmanlı ordusu Macarları yendi.', true],
		['II. Abdülhamid 33 yıl tahtta kaldı.', true],
		['Fatih Sultan Mehmet İstanbul’u 1071’de fethetti.', false],
		['Cumhuriyet’in ilk başbakanı Celal Bayar’dır.', false],
		['Kurtuluş Savaşı’nda Doğu Cephesi’ni Kâzım Karabekir yönetti.', true],
	],
	cografya: [
		['Tuz Gölü İç Anadolu Bölgesi’ndedir.', true],
		['Türkiye’nin en büyük gölü Tuz Gölü’dür.', false],
		['Kızılırmak Karadeniz’e dökülür.', true],
		['Fırat Nehri Karadeniz’e dökülür.', false],
		['Erciyes Dağı Kayseri’dedir.', true],
		['Ankara, Türkiye’nin en kalabalık ilidir.', false],
		['Gökçeada, Türkiye’nin en büyük adasıdır.', true],
		['Uludağ Antalya’dadır.', false],
		['Marmara Denizi’nin tamamı Türkiye sınırları içindedir.', true],
		['Ege Denizi Türkiye’nin güneyindedir.', false],
		['Dicle Nehri Türkiye topraklarında doğar.', true],
		['Van Gölü’nün suyu sodalıdır.', true],
		['Türkiye’nin en doğu ucu Iğdır sınırları içindedir.', true],
		['Mersin Ege Bölgesi’ndedir.', false],
		['Yüzölçümü en büyük ilimiz Konya’dır.', true],
		['Türkiye’nin en yüksek dağı Erciyes’tir.', false],
	],
	bilim: [
		['Deniz seviyesinde saf su 0 °C’de donar.', true],
		['Örümcekler böcek değildir.', true],
		['Yarasalar kuş sınıfındandır.', false],
		['Mars’a Kızıl Gezegen denir.', true],
		['Altının kimyasal simgesi Ag’dir.', false],
		['İnsan kalbinin dört odacığı vardır.', true],
		['Ses boşlukta yayılmaz.', true],
		['Balinalar balık sınıfındandır.', false],
	],
	spor: [
		['Voleybolda bir takım sahada 6 oyuncuyla oynar.', true],
		['Hentbolda top ayakla oynanır.', false],
		['Teniste sayılar 15, 30, 40 diye ilerler.', true],
		['Yaz Olimpiyat Oyunları dört yılda bir yapılır.', true],
		['Satranç, Olimpiyat Oyunları’nda madalya verilen bir daldır.', false],
		['Futbolda kaleci kendi ceza sahasında topu elle tutabilir.', true],
		['Maraton koşusu 42.195 metredir.', true],
		['Bir futbol takımı sahaya 12 oyuncuyla çıkar.', false],
	],
	sanat: [
		['Mona Lisa’yı Leonardo da Vinci yaptı.', true],
		['Sefiller romanının yazarı Victor Hugo’dur.', true],
		['Beethoven İtalyan bir bestecidir.', false],
		['Kürk Mantolu Madonna’nın yazarı Sabahattin Ali’dir.', true],
		['İstiklal Marşı’nın bestecisi Mehmet Akif Ersoy’dur.', false],
		['Ney, üflemeli bir çalgıdır.', true],
		['Yaprak Dökümü romanını Halide Edib Adıvar yazdı.', false],
		['Picasso İspanyol bir ressamdır.', true],
	],
	eglence: [
		['Karagöz ile Hacivat bir gölge oyunudur.', true],
		['Keloğlan bir Japon masal kahramanıdır.', false],
		['Tavla iki zarla oynanır.', true],
		['Satrançta fil yalnız düz ilerler.', false],
		['Menemen yumurtayla yapılır.', true],
		['Lahmacun hamursuz yapılır.', false],
		['Satrançta at L biçiminde hareket eder.', true],
		['Türk kahvesi süzülerek içilir.', false],
		['Nasreddin Hoca göle maya çaldı.', true],
		['Baklava şerbetli bir tatlıdır.', true],
		['Simidin üstü susamla kaplanır.', true],
		['Ayran, yoğurt ve sudan yapılır.', true],
		['Pinokyo yalan söyleyince burnu uzar.', true],
		['Kırmızı Başlıklı Kız’ı masalda bir ayı kandırır.', false],
		['Standart bir domino setinde en büyük sayı dokuzdur.', false],
		['Gökkuşağında geleneksel olarak yedi renk sayılır.', true],
	],
};

/** Ek turlar: önceki turlarda geçmeyen banka soruları + HT'nin k. sekizlisi; toplam 34. */
function halatMore(base) {
	const used = new Set(base.flatMap((r) => r.items.map((x) => x.t)));
	const plan = [...Object.keys(CAT_NAME).map((c) => [c, 0]), ['tarih', 1], ['cografya', 1], ['eglence', 1]];
	return plan.map(([cat, k], j) => {
		const of = (t) => BANK.filter((q) => q.cat === cat && q.type === t && !used.has(q.q));
		const own = HT[cat].slice(k * 8, k * 8 + 8).map(([t, a]) => ({ t, o: ['DOĞRU', 'YANLIŞ'], r: a ? 0 : 1, d: 1, tf: true }));
		const tf = of('tf')
			.filter((q) => L(q.q) <= 70)
			.slice(0, 6)
			.map((q) => ({ t: q.q, o: ['DOĞRU', 'YANLIŞ'], r: q.ans ? 0 : 1, d: q.diff, tf: true }));
		const hl = of('hilo')
			.filter((q) => q.left.v !== q.right.v && L(q.left.t) <= 24 && L(q.right.t) <= 24 && L(q.q) <= 60)
			.slice(0, 6)
			.map((q) => ({ t: q.q, o: [q.left.t, q.right.t], r: q.left.v > q.right.v ? 0 : 1, d: q.diff }));
		const ch = of('choice')
			.filter((q) => L(q.q) <= 60 && q.a.every((x) => L(x) <= 16))
			.slice(0, 34 - own.length - tf.length - hl.length)
			// şık sayısı karışık: 3, 2 ve 4 (iki şıklıda doğru şık ve ilk çeldirici)
			.map((q, i) => ({ t: q.q, o: q.a.slice(0, [3, 2, 4][i % 3]), r: 0, d: q.diff }));
		const items = [...own, ...tf, ...hl, ...ch];
		for (const x of items) used.add(x.t);
		return { id: `dn-ht${7 + j}`, cat, diff: 2, type: 'halat', q: `Halatı kendine çek! · ${CAT_NAME[cat]}`, items };
	});
}
const HALAT = ['tarih', 'cografya', 'bilim', 'spor', 'sanat', 'eglence'].map(halatRound);

export const SAMPLES = {
	halat: [...HALAT, ...halatMore(HALAT)],
	mancinik: MANCINIK_IDS.map((id) => BANK.find((q) => q.id === id))
		.filter(Boolean)
		.map((q, i) => ({ ...q, id: `dn-mc${i + 1}`, src: q.id, type: 'mancinik' })),
};
