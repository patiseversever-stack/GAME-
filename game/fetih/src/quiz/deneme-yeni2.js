// YENİ 10 · deneme grubu 2 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   balon   Balon Patlat   gökyüzüne yükselen yazılı balonlardan kurala uyanları patlat (15 sn'lik aksiyon turu)
//   kazi    Kazı Kazan     gümüş folyoyu kazı, altındaki 3B yapıyı bil; az kazıyan çok kazanır, cevapta folyo soyulur
//
// Örnekler elle yazıldı. Ege illeri src/data/turkiye.json bölgelerinden; Mimar Sinan, memeliler ve yapılar bankanın
// doğrulanmış sorularıyla aynı bilgi (test/yeni2.test.mjs denetler: bölgeler, plakalar, yapıların maketi).

import { PROFILE } from './timing.js';
import { balon } from './d_balon.js';
import { kazi } from './d_kazi.js';

// süre profilleri (d_ortak.js stamp → timing.js formülü): Balon sabit 16 sn'lik tur; Kazı Kazan görsel tanıma + kazıma
Object.assign(PROFILE, {
	balon: { min: 16, max: 16, think: [0, 0], round: true }, // sabit tur: balonlar 0,7–14,8 sn arası uçar
	kazi: { min: 20, max: 30, think: [3, 1.5] }, // kazı, bak, dört yapıyı zihinde karşılaştır
});

export const TYPES = { balon, kazi };
export const ORDER = [
	['balon', 'Balon Patlat', 'Kurala uyan balonları patlat, yanlışı söndür'],
	['kazi', 'Kazı Kazan', 'Folyoyu kazı, yapıyı bil: az kazıyan kazanır'],
];

const BL = (id, cat, diff, q, dogru, yanlis, tema, ufuk) => ({ id, cat, diff, type: 'balon', q, dogru, yanlis, tema, ufuk });
// Kazı Kazan: kadraj = kamera (yaw, pitch), ışık (az, el: güneşin ya da ayın yönü), kutu (resmin dolduracağı parça),
// fill (kutunun kadraj payı), panY (mercek kaydırma: ufuk yukarıda kalsın), gy (zemin/deniz yüksekliği), ground (zemin rengi)
const KZ = (id, cat, diff, q, model, a, il, ad, alt, tema, folyo, kadraj) => ({ id, cat, diff, type: 'kazi', q, model, a, il, ad, alt, tema, folyo, kadraj });

export const SAMPLES = {
	balon: [
		// gündüz, Ege kıyısı: tuzaklar Ege'ye kıyısı olan ama Marmara'da sayılan iller ve Göller Yöresi'nin Akdeniz illeri
		BL('yn-balon-1', 'cografya', 1, 'Ege Bölgesi’ndeki illeri patlat!', ['Manisa', 'Uşak', 'Kütahya', 'Denizli'], ['Balıkesir', 'Çanakkale', 'Isparta', 'Bursa', 'Burdur'], 'gunduz', 'ege'),
		// gün batımı, uçurum ve fener: denizde yaşayan memeliler, uçan memeli, yumurtlayan memeli; tuzaklar kuş, balık, sürüngen
		BL('yn-balon-2', 'bilim', 2, 'Memeli hayvanları patlat!', ['Yunus', 'Yarasa', 'Balina', 'Ornitorenk'], ['Penguen', 'Köpek balığı', 'Timsah', 'Kurbağa', 'Deniz atı'], 'batim', 'kiyi'),
		// gece İstanbul: Sinan'ın çıraklık, kalfalık, ustalık eserleri ve Mihrimah Sultan; tuzaklar ondan önce ya da sonra
		BL('yn-balon-3', 'sanat', 3, 'Mimar Sinan’ın yaptığı camileri patlat!', ['Selimiye', 'Süleymaniye', 'Şehzade', 'Mihrimah Sultan'], ['Sultanahmet', 'Yeni Cami', 'Ortaköy', 'Üç Şerefeli', 'Bursa Ulu', 'Nuruosmaniye'], 'gece', 'istanbul'),
	],
	kazi: [
		// gündüz, gümüş folyo: ahşap at (antik kentin girişi), yanlışlar da ören yerleri
		KZ('yn-kazi-1', 'tarih', 1, 'Folyonun altında hangi yapı var?', 'truva', ['Truva Atı', 'Nemrut Dağı', 'Göbeklitepe', 'Hattuşa'], 17, 'Truva Atı', 'Truva Antik Kenti', 'gunduz', 'gumus', {
			yaw: 0.8, pitch: 0.13, az: 1.45, el: 0.8, box: [[-0.33, 0, -0.16], [0.33, 0.74, 0.16]], fill: 0.8, panY: 0.05, ground: [0.17, 0.24, 0.07],
		}),
		// mehtap, hologram folyo: denizdeki kule; yanlışlar adı ve biçimi benzeyen kuleler ve denizdeki kale
		KZ('yn-kazi-2', 'cografya', 2, 'Mehtapta parlayan bu yapı hangisi?', 'kizkulesi', ['Kız Kulesi', 'Galata Kulesi', 'Kızıl Kule', 'Kız Kalesi'], 34, 'Kız Kulesi', 'Üsküdar açıkları', 'gece', 'holo', {
			yaw: 0.55, pitch: 0.07, az: -2.35, el: 0.11, box: [[-0.22, -0.03, -0.2], [0.24, 0.4, 0.22]], fill: 0.8, panY: 0.07, gy: -0.012,
		}),
		// gün batımı, altın folyo: dev taş başlar ve tümülüs; yanlışlar Güneydoğu ve Hitit ören yerleri
		KZ('yn-kazi-3', 'tarih', 3, 'Gün batımındaki ören yeri hangisi?', 'nemrut', ['Nemrut Dağı', 'Göbeklitepe', 'Zeugma', 'Hattuşa'], 2, 'Nemrut Dağı', 'Kommagene Krallığı', 'batim', 'altin', {
			yaw: 0.3, pitch: 0.1, az: -1.15, el: 0.12, box: [[-0.55, 0, -0.45], [0.55, 0.62, 0.6]], fill: 0.82, panY: 0.07,
		}),
	],
};
