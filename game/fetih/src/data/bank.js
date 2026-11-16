// Oyunun kullandığı soru bankası: başlangıç seti + içerik dosyaları (q/*.js).
// Yalnızca oyunda tipi tanımlı olan sorular alınır; aynı soru bir kez girer.
//
// TEMBEL BANKA (SORU-100K.md Aşama 0.5): BANK hep aynı dizidir, içi yerinde doldurulur.
//   NODE        sınamalar, araçlar, çevrimiçi sunucu: banka-kaynak.js içerik dosyalarını eşzamanlı verir, BANK modül
//               yüklenince doludur (eskisi gibi).
//   TARAYICI    build.mjs banka-kaynak.js yerine banka-paket.js koyar: sorular gzip + base64 gömülü, açılış betiği
//               onları değerlendirmez. Menü görününce bankaBosta() boşta açar (dilim dilim, menü takılmaz); maç ya da
//               galeri bankaHazir() ile bekler (açılış bitmemişse nefes almadan bitirtir).
//   TÜRETİMLER  bankadan türeyen her şey (maç havuzu, Mancınık ikizleri, Halat turları, Fitil havuzu) bankadan(fn)
//               ile ilk erişimde bir kez kurulur; banka kurulmadan modül yüklenirken BANK'tan bir şey türetilmez.
import { TYPES } from '../quiz/types.js';
import { ham, yukle } from './banka-kaynak.js';

/**
 * Yinelenme anahtarı. Sırala, eşleştir, atasözü gibi tiplerde soru metni ortaktır
 * ("Olayları eskiden yeniye sırala."), bu yüzden içeriğin kendisi anahtar olur.
 */
export function dupKey(q) {
	switch (q.type) {
		case 'order':
			return 'order|' + q.q + '|' + q.items.map((x) => x.t).sort().join('|');
		case 'match':
			return 'match|' + q.pairs.map((p) => p[0]).sort().join('|');
		case 'hilo':
			return 'hilo|' + [q.left?.t, q.right?.t].sort().join('|') + '|' + q.prop;
		case 'odd':
			return 'odd|' + q.q + '|' + (q.opts || []).slice().sort().join('|');
		case 'proverb':
			return 'proverb|' + q.text;
		case 'cross':
			return 'cross|' + (q.words || []).map((x) => x.w).join('|');
		case 'blitz':
			return 'blitz|' + q.q;
		default:
			return q.type + '|' + q.q;
	}
}

/** Ham içerikten banka (Node yolu; derleme de bankayı bununla kurup paketler, sıra aynı kalır). */
export function bankaKur({ SEED, ALL, HARITA, PIN_EK = [] }) {
	const seen = new Set();
	// harita soruları yalnız q/harita.js'ten (v1.6: alan tabanlı, elden geçmiş metin) ve haritada bul aileleri (PIN_EK:
	// Wikidata ilçe pilotu); eski dağınık iğne soruları alınmaz
	return [...[...SEED, ...ALL].filter((q) => q.type !== 'pin'), ...HARITA, ...PIN_EK].filter((q) => {
		if (!TYPES[q.type]) return false;
		// veriden üretilen il soruları aynı kalıp metnini paylaşır ("Hangisinin yüzölçümü en büyüktür?"): üretici benzersiz
		// kurar, kimlikleriyle girer
		const k = /^cog-vr-/.test(q.id) ? q.id : q.type === 'choice' || q.type === 'tf' || q.type === 'num' || q.type === 'pin' || q.type === 'hang' ? q.q : dupKey(q);
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

/** Soru bankası. Tarayıcıda paket açılana dek boş; içi bir kerede dolar, dizinin kendisi hiç değişmez. */
export const BANK = [];
let hazir = false;
let soz = null;
const ctl = { acele: false, uyan: null };
if (ham) {
	const liste = bankaKur(ham);
	for (let i = 0; i < liste.length; i++) BANK.push(liste[i]);
	hazir = true;
}

/** Banka kurulu mu (Node'da hep; tarayıcıda paket açılınca). */
export const bankaVar = () => hazir;

/**
 * Bankayı kur; hazır olunca BANK ile çözülen söz. acele (öntanımlı): biri bekliyor, paket nefes almadan açılsın (boşta
 * başlamış açılış da hızlanır). acele: false yalnız boşta yüklemede. Hata olursa söz reddedilir, sonraki çağrı yeniden
 * dener.
 */
export function bankaHazir({ acele = true } = {}) {
	if (hazir) return Promise.resolve(BANK);
	if (acele && !ctl.acele) {
		ctl.acele = true;
		ctl.uyan?.();
	}
	if (!soz)
		soz = Promise.resolve()
			.then(() => {
				globalThis.performance?.mark?.('fl-banka-basla'); // ölçüm (denetim betikleri okur)
				return yukle(ctl);
			})
			.then(
				(liste) => {
					for (let i = 0; i < liste.length; i++) BANK.push(liste[i]);
					hazir = true;
					globalThis.performance?.mark?.('fl-banka-hazir');
					return BANK;
				},
				(e) => {
					soz = null;
					ctl.acele = false;
					throw e;
				},
			);
	return soz;
}

let bosta = false;
/**
 * Menü göründükten sonra boşta yükle (açılışın kritik yolunda değil): ms sonra ilk boş anda başlar, paket dilim dilim
 * açılır. Birden çok çağrı zararsız; hata olursa maç başlarken bankaHazir() yeniden dener.
 */
export function bankaBosta(ms = 400) {
	if (hazir || soz || bosta) return;
	bosta = true;
	const basla = () => {
		if (!hazir && !soz) bankaHazir({ acele: false }).catch((e) => console.warn('[banka] soru paketi açılamadı', e));
	};
	setTimeout(() => (typeof requestIdleCallback === 'function' ? requestIdleCallback(basla, { timeout: 2000 }) : basla()), ms);
}

let uyarildi = false;
/**
 * Bankadan türeyen değer: fn ilk erişimde (banka kuruluyken) bir kez çalışır, sonuç saklanır. Banka henüz kurulu
 * değilse (tarayıcıda biri beklemeden okursa) bos() döner ve saklanmaz: sonraki erişim yeniden dener.
 */
export function bankadan(fn, bos = () => []) {
	let v;
	let oldu = false;
	return () => {
		if (oldu) return v;
		if (!hazir) {
			if (!uyarildi) {
				uyarildi = true;
				console.warn('[banka] soru bankası henüz açılmadı: önce await bankaHazir()');
			}
			return bos();
		}
		v = fn();
		oldu = true;
		return v;
	};
}
