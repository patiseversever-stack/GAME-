// YENİ 10 · deneme grubu 1 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   kasa  Kasa Soygunu  çelik kasa kapısında 2–4 şifre tamburu; soldan yoklanır, ilk yanlışta alarm, hepsi doğruysa
//                       kapı açılır ve altın ışık taşar (stetoskop: bir tamburu yarım tambur bedelle dinle)
//
// Örnekler elle yazıldı; sayılar oyunun doğrulanmış bankasıyla aynı (kaynak kimliği yanında).

import { PROFILE } from './timing.js';
import { kasa } from './d_kasa.js';

// süre profilleri (d_ortak.js stamp): en az 20 sn (FLOOR)
Object.assign(PROFILE, {
	kasa: { min: 15, max: 40, think: [3.5, 1.5] }, // sayıyı hatırla, basamak basamak çevir, kolu çek
});

export const TYPES = { kasa };

export const ORDER = [['kasa', 'Kasa Soygunu', 'Şifre tamburlarını çevir, kolu çek: kapı açılacak mı?']];

const K = (id, cat, diff, q, ans, unit, not) => ({ id, cat, diff, type: 'kasa', q, ans, ...(unit ? { unit } : {}), not });

export const SAMPLES = {
	kasa: [
		// egl-nu-003: 52 kâğıt (2 tambur)
		K('yn-kasa-1', 'eglence', 1, 'Şifre: jokersiz bir iskambil destesinde kaç kâğıt var?', 52, 'kâğıt', 'Dört renk, her renkte 13 kâğıt.'),
		// spo-nu-004: 305 cm (3 tambur)
		K('yn-kasa-2', 'spor', 2, 'Şifre: basketbol potası yerden kaç santimetre yüksekte?', 305, 'cm', '10 fit: NBA’de de FIBA’da da aynı yükseklik.'),
		// tar-ch-049: 1934 (4 tambur)
		K('yn-kasa-3', 'tarih', 3, 'Şifre: Türk kadını milletvekili seçme ve seçilme hakkını hangi yıl kazandı?', 1934, '', '5 Aralık 1934’te tanındı; kadınlar 1935’te Meclis’e girdi.'),
	],
};
