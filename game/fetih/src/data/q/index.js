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

export const ALL = [...tarih, ...cografya, ...spor, ...bilim, ...sanat, ...eglence, ...ekTarih, ...ekCografya, ...ekSpor, ...ekBilim, ...ekSanat, ...ekEglence, ...ek2Tarih, ...ek2Cografya, ...ek2Spor, ...ek2Bilim, ...ek2Sanat, ...ek2Eglence];
export { tarih, cografya, spor, bilim, sanat, eglence };
export default ALL;
