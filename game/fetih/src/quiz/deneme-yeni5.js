// YENİ 10 · deneme grubu 5 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   tunel      Zaman Tüneli   iki çapa olayın yılı açık; üç kart sırayla gelir, her biri tünelde doğru boşluğa
//                             sürüklenir. Doğruysa yıl sayacı döner ve kilitlenir, yanlışsa kart gerçek yerine kayar.
//   kelimeavi  Kelime Avı     7×7 … 9×9 harf tablosunda üç gizli kelime; ipucundan bul, düz çizgide kaydırarak avla.
//
// Örnek sorular elle yazıldı. Yıllar ve olgular oyunun kendi doğrulanmış sorularıyla karşılaştırıldı (src/data/q:
// tar-or-001/004/012, bil-or-004, tar-or-008, spo-or-001/010, egl/spo ek sıralama soruları; il adları turkiye.json).

import { PROFILE } from './timing.js';
import { tunel } from './d_tunel.js';
import { kelimeavi } from './d_kelimeavi.js';

// süre profilleri (d_ortak.js stamp): Zaman Tüneli kart başına hatırla + karşılaştır + sürükle (üç kart);
// Kelime Avı kelime başına ipucunu çöz + tabloyu tara + kaydır (tablo büyüdükçe arama uzar)
Object.assign(PROFILE, {
	tunel: { min: 20, max: 45, think: [2.5, 1.2] },
	kelimeavi: { min: 25, max: 60, think: [2, 1] },
});

export const TYPES = { tunel, kelimeavi };
export const ORDER = [
	['tunel', 'Zaman Tüneli', 'Kartı yılların arasına sok, sayaç dönsün'],
	['kelimeavi', 'Kelime Avı', 'Harf tablosunda üç kelimeyi kaydırıp avla'],
];

const TN = (id, cat, diff, q, anchors, cards) => ({ id, cat, diff, type: 'tunel', q, anchors, cards });
const KA = (id, cat, diff, q, words) => ({ id, cat, diff, type: 'kelimeavi', q, words });

export const SAMPLES = {
	tunel: [
		// kolay: kartlar sırayla araya, en başa ve en sona düşer (her bölge bir kez)
		TN('yn-tunel-1', 'tarih', 1, 'Türk tarihinin dönüm noktaları: kartları tünelde yerine koy!', [
			['İstanbul’un Fethi', 1453],
			['Cumhuriyet’in İlanı', 1923],
		], [
			['Tanzimat Fermanı', 1839],
			['Malazgirt Zaferi', 1071],
			['Harf Devrimi', 1928],
		]),
		// orta: ikinci kart ilk kartla çapa arasına, son kart çapanın sekiz yıl öncesine
		TN('yn-tunel-2', 'bilim', 2, 'Bilim ve icatlar: hangisi önce geldi?', [
			['Wright kardeşlerin ilk uçuşu', 1903],
			['Ay’a ilk insanlı iniş', 1969],
		], [
			['İlk yapay uydu Sputnik', 1957],
			['Penisilinin keşfi', 1928],
			['X ışınlarının keşfi', 1895],
		]),
		// zor: yılı çapalara çok yakın kartlar (2 ve 11 yıl), son kart beş boşluğun ortasında
		TN('yn-tunel-3', 'spor', 3, 'Spor tarihinde büyük anlar: kartları tünelde yerine koy!', [
			['İlk modern Olimpiyat Oyunları', 1896],
			['Galatasaray’ın UEFA Kupası', 2000],
		], [
			['Millî Takım dünya üçüncüsü', 2002],
			['Fenerbahçe’nin kuruluşu', 1907],
			['Naim’in ilk olimpiyat altını', 1988],
		]),
	],
	kelimeavi: [
		// kolay (7×7; → ↓ ↘): Osmanlı’nın ilk şehirleri
		KA('yn-kelimeavi-1', 'tarih', 1, 'Osmanlı’nın ilk şehirleri: üç kelimeyi tabloda avla!', [
			['SÖĞÜT', 'Osmanlı Beyliği’nin kurulduğu yer'],
			['BURSA', '1326’da alınıp başkent yapılan şehir'],
			['EDİRNE', 'İstanbul’dan önceki başkent'],
		]),
		// orta (8×8; + ↗): illerin simgeleri
		KA('yn-kelimeavi-2', 'cografya', 2, 'Türkiye’nin illeri: üç ili tabloda avla!', [
			['NEVŞEHİR', 'Göreme’nin ve peri bacalarının ili'],
			['DENİZLİ', 'Pamukkale travertenlerinin ili'],
			['MALATYA', 'Kayısısıyla ünlü il'],
		]),
		// zor (9×9; sekiz yön, tersten okunanlar dahil): sanat ve edebiyat
		KA('yn-kelimeavi-3', 'sanat', 3, 'Sanat ve edebiyat: üç kelimeyi tabloda avla!', [
			['SELİMİYE', 'Sinan’ın ustalık eseri sayılan cami'],
			['GÜNTEKİN', 'Çalıkuşu’nun yazarı Reşat Nuri …'],
			['VEYSEL', 'Sazıyla ünlü Sivaslı ozan Âşık …'],
		]),
	],
};
