// DENEME · GÖZ KARARI KİPLERİ (kullanıcı 16 Kasım 2026): yakından uzaklaşma ve ayrıntıdan bütüne kipleri görseli 5–6,5 kat
// büyüttüğü için piksel piksel görünüyor. Yerine büyütmesiz beş kip denenir (gk_kipler.js); karşılaştırma için mevcut
// netleşme ve siluet de aynı yerde. Kullanıcı galeride deneyip seçer; seçilenler maça girer, yakın çekim ve ayrıntı
// kaldırılır.
//
// Her kip galeride ayrı satır (en üstte, kırmızı YENİ). Örnek sorular gerçek Göz Kararı soruları, kip soruya yazılır
// (q.mode); tip yine gozkarari: kart, süre ve puan oyundakiyle birebir aynı. Yeni kipler ve netleşme aynı 8 soruyla
// (karşılaştırılabilsin: hayvan, böcek, eşya, mimari, 3D, gravür, tablo, minyatür); siluet maskesi olan 8 soruyla.

import { gozkarari } from './d_gozkarari.js';
import GK from '../data/gozkarari.js';

const ORTAK = ['GK-317', 'GK-325', 'GK-366', 'GK-414', 'GK-451', 'GK-412', 'GK-491', 'GK-505'];
const SILUET = ['GK-314', 'GK-318', 'GK-338', 'GK-373', 'GK-399', 'GK-413', 'GK-453', 'GK-483'];

// [galeri anahtarı, kip, ad, tanıtım, sorular]
const KIPLER = [
	['gkk_spot', 'spot', 'GK · Anahtar Deliği', 'Işık halkası ayrıntıda açılır, genişler', ORTAK],
	['gkk_yapboz', 'yapboz', 'GK · Yapboz', 'Karışık parçalar yerine kayar', ORTAK],
	['gkk_karo', 'karo', 'GK · Karo Karo', 'Kareler rastgele açılır', ORTAK],
	['gkk_perde', 'perde', 'GK · Perde', 'Şeritlerin aralığı genişler', ORTAK],
	['gkk_cizim', 'cizim', 'GK · Çizimden Fotoğrafa', 'Önce kontur, sonra renk', ORTAK],
	['gkk_blur', 'blur', 'GK · Netleşme (mevcut)', 'Bulanıktan nete', ORTAK],
	['gkk_sil', 'sil', 'GK · Siluet (mevcut)', 'Siyah gölge, cevapta görsel', SILUET],
];

export const TYPES = Object.fromEntries(KIPLER.map(([t]) => [t, gozkarari]));
export const ORDER = KIPLER.map(([t, , ad, tanitim]) => [t, ad, tanitim]);

const bul = (img) => GK.find((q) => q.img === img);
export const SAMPLES = Object.fromEntries(
	KIPLER.map(([t, kip, , , ids]) => [t, ids.map(bul).filter(Boolean).map((q) => ({ ...q, id: `${q.id}-${kip}`, type: 'gozkarari', mode: kip }))]),
);
