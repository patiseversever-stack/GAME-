// YENİ · deneme grubu: harita tipleri (defter 9 Kimim Ben?, 29 Şive Haritası). deneme.js bu dosyayı otomatik yükler.
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri her tipin kendi dosyasında: Object.assign(PROFILE, { tip: { min, max, think } }).

import { kimim, KIMIM_SAMPLES } from './d_kimim.js';
import { sive, SIVE_SAMPLES } from './d_sive.js';

export const TYPES = { kimim, sive };
export const ORDER = [
	['kimim', 'Kimim Ben?', '5 ipucu akar, bildiğin an ile dokun'],
	['sive', 'Şive Haritası', 'Yöresel söz: hangi yörenin ağzı?'],
];
export const SAMPLES = { kimim: KIMIM_SAMPLES, sive: SIVE_SAMPLES };
