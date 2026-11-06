// YENİ 10 · deneme grubu 4 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   penalti  Penaltı       dört şık kalenin dört köşesinde; köşeye dokun, şutu çek. Kaleci rakiptir ve rakibin kendi
//                          seçtiği köşeye uçar. Doğru: GOL (ağ dalgalanır, flaş, konfeti); yanlış: direk, aut ya da kurtarış
//   kacis    Kaçış Odası   bir soru = art arda üç oda, zorluk artar; doğru kapı açılır, kamera 3B koridordan sonraki odaya
//                          koşar, yanlış kapı tuzak (alarm, parmaklık). Üçüncü odadan sonra gün ışığı: ÇIKIŞ! Puan: geçilen oda
//
// Örnekler elle yazıldı; her bilgi oyunun kendi bankasıyla (src/data/q/*.js) ve genel kaynaklarla sınandı.

import { PROFILE } from './timing.js';
import { penalti } from './d_penalti.js';
import { kacis } from './d_kacis.js';

// süre profilleri (d_ortak.js stamp): Penaltı dört şıklı testle aynı iş (oku, dört levhayı tara, köşeye dokun);
// Kaçış Odası sabit koşu: ortanca oyuncunun üç odayı bitirdiği süre, en az 30 sn (koşu, kapı başına düşünme oda zorluğuyla)
Object.assign(PROFILE, {
	penalti: { min: 10, max: 25, think: [2.5, 1.25] },
	kacis: { min: 30, max: 40, think: [2, 0.8], round: true },
});

export const TYPES = { penalti, kacis };
export const ORDER = [
	['penalti', 'Penaltı', 'Köşeni seç, şutu çek: kaleci rakibin'],
	['kacis', 'Kaçış Odası', 'Üç oda, üç kapı: tuzağa düşmeden kaç'],
];

const PK = (id, cat, diff, hava, q, a) => ({ id, cat, diff, type: 'penalti', hava, q, a });
const KC = (id, cat, diff, tema, q, cikis, rooms) => ({ id, cat, diff, type: 'kacis', tema, q, cikis, rooms: rooms.map(([ad, q2, a, d]) => ({ ad, q: q2, a, d })) });

export const SAMPLES = {
	penalti: [
		// gece maçı, ışıklar altında: 17 Mayıs 2000, Kopenhag; 0-0 biten final penaltılarla 4-1 (çeldiriciler aynı kupa yolunun
		// rakipleri: yarı finalde Leeds United, son 16'da Borussia Dortmund; Real Madrid aynı yılın Süper Kupası)
		PK('yn-penalti-1', 'spor', 1, 'gece', 'Galatasaray 2000 UEFA Kupası finalinde penaltılarla hangi takımı yendi?', ['Arsenal', 'Leeds United', 'Borussia Dortmund', 'Real Madrid']),
		// karlı derbi: Sinekli Bakkal (1936) Halide Edib'in; Çalıkuşu ve Yaprak Dökümü Reşat Nuri'nin, Kürk Mantolu Madonna Sabahattin Ali'nin
		PK('yn-penalti-2', 'sanat', 2, 'kar', 'Hangisi Halide Edib Adıvar’ın romanıdır?', ['Sinekli Bakkal', 'Çalıkuşu', 'Yaprak Dökümü', 'Kürk Mantolu Madonna']),
		// akşam finali: James Watson ve Francis Crick, Nature 1953; çeldiriciler başka ünlü bilim ikilileri
		PK('yn-penalti-3', 'bilim', 3, 'aksam', 'DNA’nın çift sarmal yapısını 1953’te ortaya koyan ikili hangisidir?', ['Watson ve Crick', 'Darwin ve Wallace', 'Pierre ve Marie Curie', 'Bohr ve Rutherford']),
	],
	kacis: [
		// maç bitti, kapılar kilitlendi: soyunma odasından tünele, oradan basın tribününe. Kırkpınar Edirne'de (banka spo-ch-007);
		// Türkiye 2002'de üçüncü oldu (üçüncülük maçında Güney Kore'yi yendi, banka spo-ch-030); teniste sıfıra "love" denir
		// (deuce 40-40 eşitliği, ace karşılanamayan servis)
		KC('yn-kacis-1', 'spor', 1, 'stad', 'Stadyumdan kaçış!', 'STADYUMUN DIŞ KAPISI', [
			['SOYUNMA ODASI', 'Kırkpınar güreşleri hangi ilde yapılır?', ['Edirne', 'Bursa', 'Konya'], 1],
			['OYUNCU TÜNELİ', 'Türkiye 2002 Dünya Kupası’nı kaçıncı bitirdi?', ['Üçüncü', 'İkinci', 'Dördüncü'], 1],
			['BASIN TRİBÜNÜ', 'Teniste sıfır sayıya ne denir?', ['Love', 'Deuce', 'Ace'], 2],
		]),
		// odaların adı sorusuyla bağlı: gözlemevi (gezegen), sera (fotosentez), kimya deposu (element simgesi; Au altın,
		// Ag gümüş, Al alüminyum)
		KC('yn-kacis-2', 'bilim', 2, 'lab', 'Laboratuvardan kaçış!', 'ACİL ÇIKIŞ', [
			['GÖZLEM ODASI', 'Güneş’e en yakın gezegen hangisidir?', ['Merkür', 'Venüs', 'Mars'], 1],
			['SERA', 'Bitkiler fotosentezde havadan hangi gazı alır?', ['Karbondioksit', 'Oksijen', 'Azot'], 2],
			['KİMYA DEPOSU', 'Simgesi “Au” olan element hangisidir?', ['Altın', 'Gümüş', 'Alüminyum'], 3],
		]),
		// gerçek kaçış yolu: Harem'in kapısı ikinci avluya (Divan, Kubbealtı) açılır; Orta Kapı (Bâbüsselâm) birinci avluya,
		// oradan Bâb-ı Hümâyûn dışarıya. Sarayı Fatih yaptırdı; Fatih'ten sonra Divan'a sadrazam başkanlık etti;
		// Bâbüssaâde üçüncü avlunun kapısıdır (çeldirici)
		KC('yn-kacis-3', 'tarih', 3, 'saray', 'Topkapı Sarayı’ndan kaçış!', 'BÂB-I HÜMÂYÛN', [
			['HAREM', 'Topkapı Sarayı’nı hangi padişah yaptırdı?', ['Fatih', 'Kanuni', 'Yavuz'], 2],
			['KUBBEALTI', 'Fatih’ten sonra Divan’a kim başkanlık ederdi?', ['Sadrazam', 'Şeyhülislam', 'Kaptanıderya'], 2],
			['ORTA KAPI', 'Orta Kapı’nın öbür adı nedir?', ['Bâbüsselâm', 'Bâbüssaâde', 'Bâb-ı Hümâyûn'], 3],
		]),
	],
};
