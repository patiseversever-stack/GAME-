// YENİ 10 · deneme grubu 1 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   kasa    Kasa Soygunu  çelik kasa kapısında 2–4 şifre tamburu; kol çekilince soldan yoklanır: ilk yanlışta alarm,
//                         hepsi doğruysa kapı açılır, altın ışık taşar (stetoskop: bir tamburu yarım tambur bedelle dinle)
//   terazi  Terazi        pirinç terazinin kefelerinde etiketli, değeri gizli ağırlıklar: sol ağır, dengede, sağ ağır?
//                         Cevapta değerler sayılır, kol yay fiziğiyle devrilir, ağır kefe tok sesle iner
//
// Örnekler elle yazıldı; her sayı oyunun doğrulanmış bankasındakiyle aynı (kaynak kimliği yanında).

import { PROFILE } from './timing.js';
import { kasa } from './d_kasa.js';
import { terazi } from './d_terazi.js';

// süre profilleri (d_ortak.js stamp): en az 20 sn (FLOOR)
Object.assign(PROFILE, {
	kasa: { min: 15, max: 40, think: [3.5, 1.5] }, // sayıyı hatırla, basamak basamak çevir, kolu çek
	terazi: { min: 12, max: 32, think: [3, 1.25] }, // her ağırlığı kestir, kefeleri topla, karşılaştır
});

export const TYPES = { kasa, terazi };

export const ORDER = [
	['kasa', 'Kasa Soygunu', 'Şifre tamburlarını çevir, kolu çek: kapı açılacak mı?'],
	['terazi', 'Terazi', 'Gizli ağırlıklar: hangi kefe ağır basar?'],
];

const K = (id, cat, diff, q, ans, unit, not) => ({ id, cat, diff, type: 'kasa', q, ans, ...(unit ? { unit } : {}), not });
const T = (id, cat, diff, q, unit, sol, sag, tuzak, not) => ({ id, cat, diff, type: 'terazi', q, unit, sol, sag, tuzak, not });

export const SAMPLES = {
	kasa: [
		// egl-nu-003: 52 kâğıt (2 tambur, sayı)
		K('yn-kasa-1', 'eglence', 1, 'Şifre: jokersiz bir iskambil destesinde kaç kâğıt var?', 52, 'kâğıt', 'Dört renk, her renkte 13 kâğıt.'),
		// cog-nu-012: Uludağ 2543 m (4 tambur, yükseklik)
		K('yn-kasa-2', 'cografya', 2, 'Şifre: Uludağ’ın yüksekliği kaç metre?', 2543, 'm', 'Bursa’daki Uludağ, Marmara Bölgesi’nin en yüksek dağı.'),
		// tar-nu-031, tar-ch-067: Ayasofya 537 (3 tambur, yıl: üç tambur, binden önceki bir yıl demek)
		K('yn-kasa-3', 'tarih', 3, 'Şifre: İstanbul’daki Ayasofya hangi yıl tamamlandı?', 537, '', 'I. Justinianus yaptırdı; yapımı beş yıl sürdü (532–537).'),
	],
	terazi: [
		// spo-or-011 (basketbol 5, voleybol 6, futbol 11), spo-hl-002 (hentbol 7): üç küçük takım futbolu geçer; not: futbol
		// kuralı (IFAB Kural 3, bankada da soru: sahada 7'nin altına düşen takımın maçı tatil edilir)
		T('yn-terazi-1', 'spor', 1, 'Takımların sahadaki oyuncu sayısını tartıyoruz. Hangi kefe ağır basar?', 'oyuncu', [['Basketbol', 5], ['Voleybol', 6], ['Hentbol', 7]], [['Futbol', 11]], 2, 'Futbolda sahadaki oyuncu sayısı 7’nin altına düşen takımın maçı tatil edilir.'),
		// egl-tf-019: zürafanın boyun omuru insanınkinden fazla değil, yedi; memelilerin hemen hepsinde yedi (fare de)
		T('yn-terazi-2', 'bilim', 2, 'Boyundaki omur sayısını tartıyoruz. Hangi kefe ağır basar?', 'omur', [['Zürafa', 7]], [['Fare', 7]], 0, 'Memelilerin hemen hepsinin boynunda 7 omur var; zürafanınkiler yalnızca çok daha uzun.'),
		// n006 (Everest 8849), cog-nu-005 (Ağrı 5137), cog-nu-011 (Erciyes 3917): iki Türk dağı Everest’i 205 m geçer
		T('yn-terazi-3', 'cografya', 3, 'Dağların yüksekliğini metreyle tartıyoruz. Hangi kefe ağır basar?', 'm', [['Everest', 8849]], [['Ağrı Dağı', 5137], ['Erciyes', 3917]], 0, 'Ağrı ile Erciyes’in toplamı, Everest’i 205 metre geçer.'),
	],
};
