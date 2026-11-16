// Tüm kategorilerin soruları. questions.js ile birleştirmeyi koordinatör yapar.
// Yalnız Node yolu (sınamalar, araçlar, sunucu; src/data/banka-kaynak.js): oyun paketine bu dosyalar girmez, soru verisi
// sıkıştırılmış paket olarak gömülür ve menüden sonra açılır (src/data/bank.js, build.mjs).
import tarih from './tarih.js';
import cografya from './cografya.js';
import spor from './spor.js';
import bilim from './bilim.js';
import sanat from './sanat.js';
import eglence from './eglence.js';
import ekTarih from './ek/tarih.js';
import ekCografya from './ek/cografya.js';
import ekSpor from './ek/spor.js';
import ekBilim from './ek/bilim.js';
import ekSanat from './ek/sanat.js';
import ekEglence from './ek/eglence.js';
import ek2Tarih from './ek/tarih-2.js';
import ek2Cografya from './ek/cografya-2.js';
import ek2Spor from './ek/spor-2.js';
import ek2Bilim from './ek/bilim-2.js';
import ek2Sanat from './ek/sanat-2.js';
import ek2Eglence from './ek/eglence-2.js';
import ek3Tarih from './ek/tarih-3.js';
import ek3Cografya from './ek/cografya-3.js';
import ek3Spor from './ek/spor-3.js';
import ek3Bilim from './ek/bilim-3.js';
import ek3Sanat from './ek/sanat-3.js';
import ek3Eglence from './ek/eglence-3.js';
import ek4Tarih from './ek/tarih-4.js';
import ek4Cografya from './ek/cografya-4.js';
import ek4Spor from './ek/spor-4.js';
import ek4Bilim from './ek/bilim-4.js';
import ek4Sanat from './ek/sanat-4.js';
import ek4Eglence from './ek/eglence-4.js';
import ek5Tarih from './ek/tarih-5.js';
import ek5Cografya from './ek/cografya-5.js';
import ek5Spor from './ek/spor-5.js';
import ek5Bilim from './ek/bilim-5.js';
import ek5Sanat from './ek/sanat-5.js';
import ek5Eglence from './ek/eglence-5.js';
import ek6Tarih from './ek/tarih-6.js';
import ek6Cografya from './ek/cografya-6.js';
import ek6Spor from './ek/spor-6.js';
import ek6Bilim from './ek/bilim-6.js';
import ek6Sanat from './ek/sanat-6.js';
import ek6Eglence from './ek/eglence-6.js';
import ekTahmin from './ek/tahmin.js'; // "kim daha yakın" tahmin soruları (num → Mancınık ikizi)
import veri from './veri.js'; // il verisinden üretilen sorular (tools/soru/veri_uret.mjs), bankanın küçük payı
// Wikidata aileleri (SORU-100K.md Aşama 1 pilotu; kimlikte -wd-, maç payı en çok %15: src/game/match.js WD_PAY).
// Üretilen dosyalar (tools/veri/pilot/*.mjs); haritada bul soruları (pin) ALL'a girmez, bank.js HARITA gibi alır.
import wdIlce from './wd/ilce.js';
import wdDogum from './wd/dogum.js';
import wdIlcePin from './wd/ilce_pin.js';

export const ALL = [...tarih, ...cografya, ...spor, ...bilim, ...sanat, ...eglence, ...ekTarih, ...ekCografya, ...ekSpor, ...ekBilim, ...ekSanat, ...ekEglence, ...ek2Tarih, ...ek2Cografya, ...ek2Spor, ...ek2Bilim, ...ek2Sanat, ...ek2Eglence, ...ek3Tarih, ...ek3Cografya, ...ek3Spor, ...ek3Bilim, ...ek3Sanat, ...ek3Eglence, ...ek4Tarih, ...ek4Cografya, ...ek4Spor, ...ek4Bilim, ...ek4Sanat, ...ek4Eglence, ...ek5Tarih, ...ek5Cografya, ...ek5Spor, ...ek5Bilim, ...ek5Sanat, ...ek5Eglence, ...ek6Tarih, ...ek6Cografya, ...ek6Spor, ...ek6Bilim, ...ek6Sanat, ...ek6Eglence, ...ekTahmin, ...veri, ...wdIlce, ...wdDogum];
/** Harita dışı dosyalardan gelen haritada bul (pin) soruları: bank.js q/harita.js ile birlikte alır. */
export const PIN_EK = [...wdIlcePin];
export { tarih, cografya, spor, bilim, sanat, eglence };
export default ALL;
