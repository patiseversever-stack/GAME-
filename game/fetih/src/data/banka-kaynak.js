// Soru bankasının ham kaynağı, Node yolu (sınamalar, araçlar, çevrimiçi sunucu): içerik dosyaları eşzamanlı içe
// aktarılır, bank.js BANK'ı modül yüklenirken kurar.
//
// Tarayıcı paketinde build.mjs bu dosyanın yerine banka-paket.js'i koyar (aynı adlar): orada soru verisi sıkıştırılmış
// gömülüdür ve menüden sonra açılır. Bu dosyanın içe aktardıkları (q/*.js, q/ek/*.js, q/harita.js) oyun paketine girmez.
import { QUESTIONS as SEED } from './questions.js';
import { ALL, PIN_EK } from './q/index.js';
import HARITA from './q/harita.js';

/** Ham içerik (eşzamanlı). Paket sürümünde null. */
export const ham = { SEED, ALL, HARITA, PIN_EK };
/** Paket açıcı. Node sürümünde yok: banka zaten hazır. */
export const yukle = null;
