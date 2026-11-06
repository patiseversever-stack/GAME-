// YENİ 10 · deneme grubu 4 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   penalti  Penaltı       dört şık kalenin dört köşesinde; köşeye dokun, şutu çek. Kaleci rakiptir ve rakibin kendi
//                          seçtiği köşeye uçar. Doğru: GOL (ağ dalgalanır, flaş, konfeti); yanlış: direk, aut ya da kurtarış
//
// Örnekler elle yazıldı; her bilgi oyunun kendi bankasıyla (src/data/q/*.js) ve genel kaynaklarla sınandı.

import { PROFILE } from './timing.js';
import { penalti } from './d_penalti.js';

// süre profilleri (d_ortak.js stamp): Penaltı dört şıklı testle aynı iş (oku, dört levhayı tara, köşeye dokun);
// Kaçış Odası sabit koşu: ortanca oyuncunun üç odayı bitirdiği süre, en az 30 sn (koşu, kapı başına düşünme oda zorluğuyla)
Object.assign(PROFILE, {
	penalti: { min: 10, max: 25, think: [2.5, 1.25] },
});

export const TYPES = { penalti };
export const ORDER = [
	['penalti', 'Penaltı', 'Köşeni seç, şutu çek: kaleci rakibin'],
];

const PK = (id, cat, diff, hava, q, a) => ({ id, cat, diff, type: 'penalti', hava, q, a });

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
};
