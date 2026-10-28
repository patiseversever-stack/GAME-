// Tüm kategorilerin soruları. questions.js ile birleştirmeyi koordinatör yapar.
import tarih from './tarih.js';
import cografya from './cografya.js';
import spor from './spor.js';
import bilim from './bilim.js';
import sanat from './sanat.js';
import eglence from './eglence.js';

export const ALL = [...tarih, ...cografya, ...spor, ...bilim, ...sanat, ...eglence];
export { tarih, cografya, spor, bilim, sanat, eglence };
export default ALL;
