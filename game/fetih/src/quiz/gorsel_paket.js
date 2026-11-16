// GÖRSEL PAKETLERİ. Yayın ortamında bir sürüm en çok 511 dosya alır (16 Kasım 2026: 510 Göz Kararı görseli + maskeleri +
// yapı görselleri 695 dosya tuttu, yayın reddedildi). Göz Kararı görselleri derlemede (build.mjs gorselPaketle) onarlı
// paketlere toplanır: gkp/<k>.bin (GK-001…010 → 0.bin, siluet maskeleri kendi görselinin paketinde). Dizin sayfaya
// çalışmayan bir veri bloğu olarak gömülür: <script type="application/json" id="fl-gkp">{"GK-001.webp":[k,baş,uzunluk]…}.
//
// Görsel tek tek bayt aralığıyla (Range) istenir: yalnız o görselin baytları iner. Sunucu aralığı tanımazsa (200) paketin
// tamamı gelir; bellekte tutulur, aynı paketteki öteki görseller ondan kesilir. Dizin yoksa (geliştirme: dist/gk düz
// dosyaları; fetih.esm.js) düz yol kullanılır: davranış eskisiyle aynı.
const PAKET_KLASORU = 'gkp/';

let DIZIN; // undefined: bakılmadı · null: yok · nesne: ad → [paket, başlangıç, uzunluk]
function dizin() {
	if (DIZIN !== undefined) return DIZIN;
	DIZIN = null;
	try {
		const el = typeof document !== 'undefined' ? document.getElementById('fl-gkp') : null;
		if (el) DIZIN = JSON.parse(el.textContent);
	} catch {
		DIZIN = null;
	}
	return DIZIN;
}

/** Görseller paketli mi (yayın derlemesi)? */
export const paketli = () => !!dizin();

const SOZ = new Map(); // ad → Promise<adres>
const HAZIR = new Map(); // ad → adres (çözülmüş; kart ilk çizimde boş kalmasın diye eşzamanlı okunur)
const TAM = new Map(); // paket → Promise<ArrayBuffer> (sunucu aralığı tanımadıysa paketin tamamı)
const turu = (ad) => (ad.endsWith('.png') ? 'image/png' : 'image/webp');

async function baytlar(k, bas, uz) {
	if (TAM.has(k)) return (await TAM.get(k)).slice(bas, bas + uz);
	const r = await fetch(`${PAKET_KLASORU}${k}.bin`, { headers: { Range: `bytes=${bas}-${bas + uz - 1}` } });
	if (!r.ok) throw new Error(`görsel paketi ${k}: ${r.status}`);
	if (r.status === 206) {
		const b = await r.arrayBuffer();
		if (b.byteLength === uz) return b;
		// beklenmedik aralık: güvenli yol, paketin tamamı
		const t = fetch(`${PAKET_KLASORU}${k}.bin`).then((x) => (x.ok ? x.arrayBuffer() : Promise.reject(new Error(`görsel paketi ${k}: ${x.status}`))));
		TAM.set(k, t);
		return (await t).slice(bas, bas + uz);
	}
	const t = r.arrayBuffer();
	TAM.set(k, t);
	t.catch(() => TAM.delete(k));
	return (await t).slice(bas, bas + uz);
}

/**
 * Görselin adresi. Paketliyse bayt aralığından blob: adresi, değilse klasör + ad.
 * @param {string} klasor düz dosya klasörü ('gk/')
 * @param {string} ad dosya adı ('GK-001.webp', 'GK-012.m.png')
 * @returns {Promise<string>}
 */
export function gorselUrl(klasor, ad) {
	const d = dizin();
	if (!d || !d[ad]) return Promise.resolve(klasor + ad);
	if (SOZ.has(ad)) return SOZ.get(ad);
	const [k, bas, uz] = d[ad];
	const p = baytlar(k, bas, uz).then((b) => {
		const u = URL.createObjectURL(new Blob([b], { type: turu(ad) }));
		HAZIR.set(ad, u);
		return u;
	});
	SOZ.set(ad, p);
	p.catch(() => SOZ.delete(ad)); // ağ hatası: bir dahakine yeniden denensin
	return p;
}

/** Adres şimdiden biliniyorsa (paketsiz ya da önden indirilmiş) eşzamanlı döner, yoksa null. */
export function gorselUrlHemen(klasor, ad) {
	const d = dizin();
	if (!d || !d[ad]) return klasor + ad;
	return HAZIR.get(ad) || null;
}
