// Tüm kategorilerin soruları. questions.js ile birleştirmeyi koordinatör yapar.
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
import veri from './veri.js'; // il verisinden üretilen sorular (tools/soru/veri_uret.mjs), bankanın küçük payı

export const ALL = [...tarih, ...cografya, ...spor, ...bilim, ...sanat, ...eglence, ...ekTarih, ...ekCografya, ...ekSpor, ...ekBilim, ...ekSanat, ...ekEglence, ...ek2Tarih, ...ek2Cografya, ...ek2Spor, ...ek2Bilim, ...ek2Sanat, ...ek2Eglence, ...ek3Tarih, ...ek3Cografya, ...ek3Spor, ...ek3Bilim, ...ek3Sanat, ...ek3Eglence, ...ek4Tarih, ...ek4Cografya, ...ek4Spor, ...ek4Bilim, ...ek4Sanat, ...ek4Eglence, ...veri];
export { tarih, cografya, spor, bilim, sanat, eglence };
export default ALL;
