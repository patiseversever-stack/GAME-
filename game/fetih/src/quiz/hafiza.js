/*
 * SORU HAFIZASI (2026-11): oyuncu bir soruyu bir kez görür; ilgili havuz tükenmeden ikinci kez çıkmaz.
 *
 *  Sıra      her sorunun değişmeyen bir tam sayı sırası var (src/data/sira.json, tools/soru/sira.mjs --guncelle): kayıt
 *            kimliği değil sırayı tutar. Yalnız eklenir; silinen sorunun numarası boşta kalır, hiçbir numara yeniden
 *            verilmez. siraOf(id) kaydı ilk çağrıda bir kez çözer (bankaya dokunmaz). Sırası olmayan kimlik yazılmaz
 *            (dusen sayacı); test/sira.test.mjs bankadaki her kimliğin sırası olduğunu denetler.
 *  Kayıt     sıra → maç yaşı, sabit boyutlu bayt dizisi (y): 0 hiç görülmedi, 1 bu maçta, k+1 k maç önce, 255 254 ya da
 *            daha çok maç önce. Maç başında (yeniMac) bütün yaşlar bir artar. Soru SORULDUĞU an yazılır: maçı yarıda
 *            bırakan da gördüğünü bir daha görmez. Yazma maliyeti görülen soru sayısından bağımsız (100 bin soru: 100 KB bayt).
 *  Kardeş    kardes(q): aynı bilgiyi soran farklı sorular (aynı doğru cevap: "Selanik" şıklı soru ile SELANİK adam asmaca;
 *            Mancınık ile kaynağı olan tahmin sorusu; aynı ilin Kimim'i). Aynı maçta ikisi çıkmaz, yakında görülen bilginin
 *            kardeşi geri düşer. Kayıtta anahtarın 32 bitlik özeti (FNV-1a) ve maçı tutulur, yalnız son K_PENCERE maç
 *            (bayatlık yalnız son 5 maça bakar). Çakışma: bir taze sorunun özeti saklanan K özetten birine denk gelme
 *            olasılığı ≈ K / 2³²; tipik K ≈ 2 000 (30 maç × ~60 soru) için 5·10⁻⁷, en çok K_MAX = 6 000 için 1,4·10⁻⁶.
 *            100 bin soruluk bankada herhangi birinin yanlışlıkla "kardeşi görülmüş" sayılması ≈ %5 (yalnız +0,5
 *            bayatlık: o soru taze katmandan bir basamak geri düşer, yasaklanmaz). Saklanan iki anahtarın aynı özete
 *            düşmesi (doğum günü) K = 2 000'de ≈ 5·10⁻⁴: ikisinin yaşı birleşir, etkisi yok denecek kadar az.
 *  Bayatlık  bayat(q, H, usedK): 0 taze; soruyu gören her insan için +2 (son 30 maçta) ya da +1 (daha eski), kardeşini son
 *            5 maçta gören için +0,5, kardeşi bu maçta sorulduysa +3. Seçici (Match.pick) en düşük bayatlık katmanından
 *            seçer (katman içinde zorluk ağırlığıyla), görülmüşler katmanında en eskisi önce (eskilik, seçici 200 maçta
 *            keser: 254'te doygun yaş sırayı değiştirmez).
 *  Çevrimiçi istemci ozet() gönderir (kaydın kendisi, sınırsız: bütün banka görülmüşken 100 binde ≈ 150 KB, tipik oyuncuda
 *            seyrek biçimle 10–25 KB); sunucu her insan koltuğunun hafızasını Hafiza.from(ozet) ile kurar ve soruyu
 *            odadaki herkes için en taze olandan seçer. Maç içinde sorulanlar sunucuda da yazılır (koltuğun kendi kaydı
 *            istemcide yazılır). Geçiş dönemi: eski istemcinin v2 özeti de okunur.
 *  Hesap     sunucu, kimliği doğrulanmış oyuncunun kaydını kendisi saklar (src/game/sunucu.js setHafizaDeposu): maç başında
 *            depodan okunur, cihazın özetiyle birleşir (birlestir: her sırada daha yakın görülme), maç sonunda ya da
 *            yarıda kalınca depoya yazılır. Telefon değiştiren ya da veriyi silen oyuncu gördüğü soruları yeniden görmez.
 *  Saklama   v3: { v: 3, n, y: base64 (yoğun: sıra başına bir bayt) | s: base64 (seyrek: [sıra farkı − 1 (LEB128), bayt]
 *            dizisi), k: base64 ([özet 4 bayt LE, yaş 1 bayt] dizisi) }. Hangisi kısaysa o yazılır: az soru görmüş oyuncuda
 *            seyrek, bankanın yarısını görmüşte yoğun. Bütün banka görülmüşken 100 bin soruda kayıt ≈ 150 KB, kardeş kaydı
 *            da doluyken (K_MAX) en çok ≈ 170 KB (hedef ≤ 250 KB); yazma (gor + toJSON + JSON) ≈ 1 ms (masaüstü).
 *            Göç: v1 (kimlik dizisi: "bir önceki maçta") ve v2 ({ g: { maç: 'id id …' }, k: { maç: 'anahtar …' } })
 *            kayıpsız okunur; sırası olmayan kimlik sessizce düşer (dusen).
 */

// içe aktarma niteliği: düz node da (JSON kancasız: net.js, progress.js'i doğrudan alan sınamalar) okur; esbuild gömer
import SIRA from '../data/sira.json' with { type: 'json' };

/** Kardeş anahtarları en çok bu kadar maç saklanır (bayatlık son 5 maça bakar; pay bırakıldı). */
export const K_PENCERE = 30;
/** En çok saklanan kardeş anahtarı (en eskiler düşer). */
export const K_MAX = 6000;
/** En çok sıra (dışarıdan gelen özet belleği şişirmesin). */
export const SINIR = 1 << 20;

// ---------------------------------------------------------------- kalıcı sıra numarası (src/data/sira.json)

/**
 * Sıra kaydını çöz: { r: [...] } → kimlik dizisi (indeks = sıra). r'nin her öğesi ya tek kimlik (metin) ya da grup:
 * [önek, ilk sayı (metin, sıfır dolgusu genişliği verir), adım, adım, …]. Adım k > 0: ardışık k kimlik daha (+1);
 * adım −d: bir kimlik, sayı d artar. Kodlayıcı: tools/soru/sira.mjs siraKodla.
 */
export function siraCoz(d) {
	const out = [];
	const r = d && Array.isArray(d.r) ? d.r : [];
	for (const e of r) {
		if (typeof e === 'string') {
			out.push(e);
			continue;
		}
		if (!Array.isArray(e) || typeof e[0] !== 'string' || typeof e[1] !== 'string') continue;
		const p = e[0];
		const w = e[1].length;
		let n = Number(e[1]);
		out.push(p + e[1]);
		for (let i = 2; i < e.length; i++) {
			const a = e[i];
			if (a > 0) for (let k = 0; k < a; k++) out.push(p + String(++n).padStart(w, '0'));
			else out.push(p + String((n -= a)).padStart(w, '0'));
		}
	}
	return out;
}

let KAYIT = null; // { ids: sıra → kimlik, of: kimlik → sıra }
const kur = (ids) => {
	const of = new Map();
	for (let i = 0; i < ids.length; i++) of.set(ids[i], i);
	return { ids, of };
};
const kayit = () => (KAYIT ||= kur(siraCoz(SIRA)));

/** Kimliğin kalıcı sırası; kayıtta yoksa −1. */
export function siraOf(id) {
	const s = kayit().of.get(id);
	return s === undefined ? -1 : s;
}

/** Sıranın kimliği (yoksa undefined). */
export const kimlikOf = (s) => kayit().ids[s];

/** Kayıttaki sıra sayısı (boştakiler dahil). */
export const siraSayisi = () => kayit().ids.length;

/** Sınama: sıra kaydını verilen kimlik dizisiyle değiştir (null: sira.json'a dön). Önceki dizi döner. */
export function siraKur(ids) {
	const eski = KAYIT?.ids ?? null;
	KAYIT = ids ? kur(ids) : null;
	return eski;
}

// ---------------------------------------------------------------- base64 (tarayıcı ve node; Buffer yok)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64K = new Uint8Array(64);
const B64I = new Int8Array(128).fill(-1);
for (let i = 0; i < 64; i++) (B64K[i] = B64.charCodeAt(i)), (B64I[B64.charCodeAt(i)] = i);
const TD = typeof TextDecoder === 'function' ? new TextDecoder() : null;

function b64(u8, n = u8.length) {
	const out = new Uint8Array(Math.ceil(n / 3) * 4);
	let o = 0;
	let i = 0;
	for (; i + 2 < n; i += 3) {
		const x = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
		out[o++] = B64K[x >> 18];
		out[o++] = B64K[(x >> 12) & 63];
		out[o++] = B64K[(x >> 6) & 63];
		out[o++] = B64K[x & 63];
	}
	if (i < n) {
		const iki = i + 1 < n;
		const x = (u8[i] << 16) | (iki ? u8[i + 1] << 8 : 0);
		out[o++] = B64K[x >> 18];
		out[o++] = B64K[(x >> 12) & 63];
		out[o++] = iki ? B64K[(x >> 6) & 63] : 61; // '='
		out[o++] = 61;
	}
	if (TD) return TD.decode(out);
	let s = '';
	for (let j = 0; j < out.length; j += 8192) s += String.fromCharCode.apply(null, out.subarray(j, j + 8192));
	return s;
}

/** base64 → bayt dizisi; geçersizse ya da en çok baytı aşıyorsa null. */
function b64coz(s, max) {
	if (typeof s !== 'string') return null;
	let L = s.length;
	while (L && s.charCodeAt(L - 1) === 61) L--;
	const n = (L * 3) >> 2;
	if (n > max) return null;
	const out = new Uint8Array(n);
	let o = 0;
	let acc = 0;
	let bits = 0;
	for (let i = 0; i < L; i++) {
		const c = s.charCodeAt(i);
		const v = c < 128 ? B64I[c] : -1;
		if (v < 0) return null;
		acc = ((acc << 6) | v) & 0xffffff;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			out[o++] = (acc >> bits) & 255;
		}
	}
	return out;
}

// ---------------------------------------------------------------- kardeş anahtarı

const norm = (s) =>
	String(s ?? '')
		.toLocaleLowerCase('tr-TR')
		.normalize('NFC')
		.replace(/[^0-9a-zçğıöşüâîû]+/g, '');

const KC = new WeakMap(); // soru nesnesi → anahtar (seçici her soruda bütün havuzu tarar)

/** Sorunun bilgi anahtarı (aynı bilgiyi soran sorular aynı anahtarı taşır) ya da null. */
export function kardes(q) {
	if (!q || typeof q !== 'object') return null;
	let k = KC.get(q);
	if (k === undefined) KC.set(q, (k = anahtar(q)));
	return k;
}

function anahtar(q) {
	// Açık kardeş: kökü başka soruların cevabını söyleyen soru (Wikidata doğum yılı: '"Savaş ve Barış"ın yazarı Lev Tolstoy
	// hangi yıl doğdu?' kökü "Savaş ve Barış'ın yazarı kimdir?" sorusunun cevabını açar). Anahtarı o cevabın anahtarıdır
	// ('a:' + cevap); Mancınık ikizi kaynaktan kopyalandığı için aynı anahtarı taşır.
	if (typeof q.kardes === 'string' && q.kardes) return q.kardes;
	if (q.src) return 'q:' + q.src; // Mancınık: bankadaki tahmin sorusunun kardeşi
	let a = null;
	switch (q.type) {
		case 'num':
			return 'q:' + q.id;
		case 'choice':
		case 'riddle':
			a = q.a?.[0];
			break;
		case 'proverb':
			return q.text ? 'p:' + norm(q.text) : null;
		case 'hang':
		case 'anagram':
		case 'harfal':
			a = q.w;
			break;
		case 'kimim':
			return q.il != null ? 'il:' + q.il : null;
		case 'yanlis':
			a = q.ok;
			break;
		default:
			return null;
	}
	const k = norm(a);
	return k.length >= 3 ? 'a:' + k : null;
}

/** Kardeş anahtarının 32 bitlik özeti (FNV-1a, UTF-16 birimleri üzerinden; önbelleksiz: kısa metinde Map'ten ucuz). */
export function kOzet(key) {
	let h = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
	return h >>> 0;
}

// ---------------------------------------------------------------- hafıza

/** k maç önce görülene yazılan bayt (1 = bu maç, 255 = 254 ya da daha eski). */
const deger = (yas) => (yas > 253 ? 255 : yas < 0 ? 1 : yas + 1);
// LEB128 bayt sayısı (seyrek biçimde sıra farkı)
const vlen = (x) => (x < 0x80 ? 1 : x < 0x4000 ? 2 : 3);

export class Hafiza {
	/** d: toJSON() ya da ozet() çıktısı; eski biçimler (v2 nesnesi, v1 kimlik dizisi) de okunur. */
	constructor(d = null) {
		this.n = 0;
		this.y = new Uint8Array(siraSayisi()); // sıra → yaş + 1 (0: hiç)
		this.k = new Map(); // kardeş özeti → maç sırası (Map sırası = görülme sırası, en eski başta)
		this.dusen = 0; // sırası olmayan (bilinmeyen) kimlik: yazılmadı
		if (Array.isArray(d)) {
			// v1: son görülen kimlikler (sıralı): hepsi "bir önceki maçta" sayılır
			this.n = 1;
			for (const id of d) if (typeof id === 'string') this._yaz(id, deger(1));
		} else if (d && typeof d === 'object') {
			this.n = Number.isFinite(d.n) ? Math.max(0, d.n | 0) : 0;
			if (typeof d.y === 'string' || typeof d.s === 'string' || typeof d.k === 'string') this._oku3(d);
			else this._oku2(d);
		}
	}

	static from(d) {
		return d instanceof Hafiza ? d : new Hafiza(d);
	}

	_buyut(n) {
		if (n <= this.y.length) return;
		const y = new Uint8Array(Math.min(n, SINIR));
		y.set(this.y);
		this.y = y;
	}

	/** Kimliği verilen bayta yaz (daha yakın görülme kalır). */
	_yaz(id, v) {
		const s = siraOf(id);
		if (s < 0) {
			this.dusen++;
			return;
		}
		if (s >= this.y.length) this._buyut(s + 1);
		const c = this.y[s];
		if (!c || v < c) this.y[s] = v;
	}

	_kYaz(h, t) {
		const c = this.k.get(h);
		if (c == null || t > c) this.k.set(h, t);
	}

	// v2: { n, g: { maç: 'id id …' }, k: { maç: 'anahtar …' } }
	_oku2(d) {
		const grup = (g, fn) => {
			if (!g || typeof g !== 'object') return;
			for (const [t, s] of Object.entries(g)) {
				const at = Number(t);
				if (!Number.isFinite(at) || typeof s !== 'string') continue;
				for (const x of s.split(' ')) if (x) fn(x, Math.min(at, this.n));
			}
		};
		grup(d.g, (id, at) => this._yaz(id, deger(this.n - at)));
		grup(d.k, (key, at) => this.n - at < K_PENCERE && this._kYaz(kOzet(key), at));
		this._kDiz();
	}

	// v3: { n, y | s, k } (base64)
	_oku3(d) {
		if (typeof d.y === 'string') {
			const b = b64coz(d.y, SINIR);
			if (b) {
				this._buyut(b.length);
				this.y.set(b);
			}
		} else if (typeof d.s === 'string') {
			const b = b64coz(d.s, 4 * SINIR);
			if (b) {
				let s = -1;
				for (let i = 0; i < b.length; ) {
					let g = 0;
					let sh = 0;
					let c;
					do {
						c = b[i++];
						g |= (c & 0x7f) << sh;
						sh += 7;
					} while (c & 0x80 && sh < 28 && i < b.length);
					s += g + 1;
					const v = b[i++];
					if (s >= SINIR || v === undefined) break;
					if (s >= this.y.length) this._buyut(s + 1);
					if (v) this.y[s] = v;
				}
			}
		}
		if (typeof d.k === 'string') {
			const b = b64coz(d.k, 5 * K_MAX * 4);
			if (b) {
				// kayıt yaşa göre yaşlıdan gence dizili: en çok K_MAX, en yeniler kalır
				for (let i = Math.max(0, Math.floor(b.length / 5) - K_MAX) * 5; i + 4 < b.length; i += 5) {
					const h = (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
					if (b[i + 4] < K_PENCERE) this._kYaz(h, this.n - b[i + 4]);
				}
				this._kDiz();
			}
		}
	}

	/** Kardeş kaydını görülme sırasına diz, pencere dışını ve fazlasını at. */
	_kDiz() {
		const e = [...this.k].filter(([, t]) => this.n - t < K_PENCERE).sort((a, b) => a[1] - b[1]);
		this.k = new Map(e.slice(Math.max(0, e.length - K_MAX)));
	}

	/** Yeni maç başladı: bütün yaşlar bir artar; bundan sonra görülenler bu maçın yaşıyla (0) yazılır. */
	yeniMac() {
		this.n++;
		const y = this.y;
		for (let i = 0; i < y.length; i++) {
			const v = y[i];
			if (v && v < 255) y[i] = v + 1;
		}
		for (const [h, t] of this.k) {
			if (this.n - t < K_PENCERE) break; // Map sırası görülme sırası: ilk genç kayıttan sonrası hep genç
			this.k.delete(h);
		}
		return this.n;
	}

	/** Soru görüldü (soruldu). */
	gor(q) {
		if (!q?.id) return;
		this._yaz(q.id, 1);
		const k = kardes(q);
		if (k) {
			const h = kOzet(k);
			this.k.delete(h); // Map sırası = görülme sırası (en eski başta): kırpma eskiyi atar
			this.k.set(h, this.n);
			if (this.k.size > K_MAX) this.k.delete(this.k.keys().next().value);
		}
	}

	/**
	 * Başka bir kaydı bu kayda kat (sunucudaki hesap kaydı + cihazın özeti; eski biçimdeki özet de olur). Yaşlar iki
	 * kayıtta da "kaç maç önce" olarak tutulur: her sırada daha yakın görülme kalır. Kardeşlerde öbür kaydın maç sayacı
	 * bu kaydınkine çevrilir.
	 */
	birlestir(o) {
		o = Hafiza.from(o);
		this._buyut(o.y.length);
		const a = this.y;
		const b = o.y;
		for (let i = 0; i < b.length; i++) {
			const v = b[i];
			if (v && (!a[i] || v < a[i])) a[i] = v;
		}
		for (const [h, t] of o.k) this._kYaz(h, this.n - (o.n - t));
		this._kDiz();
		this.dusen += o.dusen;
		return this;
	}

	/** Kaç maç önce görüldü (bu maçta: 0; 254: 254 ya da daha eski); hiç görülmediyse Infinity. */
	yas(id) {
		const s = (KAYIT || kayit()).of.get(id); // seçici her soruda çağırır: siraOf'un kısası
		const v = s === undefined ? 0 : this.y[s];
		return v ? v - 1 : Infinity;
	}

	/** Kardeş anahtarı kaç maç önce görüldü (son K_PENCERE maç); yoksa Infinity. */
	kYas(key) {
		const t = key ? this.k.get(kOzet(key)) : undefined;
		return t == null ? Infinity : this.n - t;
	}

	/** Görülmüş soru sayısı. */
	get size() {
		let c = 0;
		for (const v of this.y) if (v) c++;
		return c;
	}

	/** Görülmüş soruların kimlikleri (sırası bu sürümün kaydında olanlar). */
	kimlikler() {
		const out = [];
		const y = this.y;
		for (let i = 0; i < y.length; i++) if (y[i]) out.push(kimlikOf(i));
		return out.filter((id) => id !== undefined);
	}

	toJSON() {
		const y = this.y;
		// seyrek mi yoğun mu: hangisi kısaysa (az soru görmüş oyuncuda seyrek: 6 000 soruda ~20 KB)
		let L = y.length;
		while (L && !y[L - 1]) L--;
		let sb = 0;
		let p = -1;
		for (let i = 0; i < L; i++)
			if (y[i]) {
				sb += vlen(i - p - 1) + 1;
				p = i;
				if (sb >= L) break;
			}
		const out = { v: 3, n: this.n };
		if (sb < L) {
			const b = new Uint8Array(sb);
			let o = 0;
			p = -1;
			for (let i = 0; i < L; i++)
				if (y[i]) {
					let g = i - p - 1;
					while (g >= 0x80) {
						b[o++] = (g & 0x7f) | 0x80;
						g >>>= 7;
					}
					b[o++] = g;
					b[o++] = y[i];
					p = i;
				}
			out.s = b64(b, o);
		} else out.y = b64(y, L);
		// kardeşler: görülme sırasıyla (yaşlıdan gence), [özet 4 bayt LE, yaş]
		const kb = new Uint8Array(this.k.size * 5);
		let o = 0;
		for (const [h, t] of this.k) {
			const a = this.n - t;
			if (a >= K_PENCERE || a < 0) continue;
			kb[o++] = h & 255;
			kb[o++] = (h >>> 8) & 255;
			kb[o++] = (h >>> 16) & 255;
			kb[o++] = h >>> 24;
			kb[o++] = a;
		}
		out.k = b64(kb, o);
		return out;
	}

	/** Çevrimiçi özet (sunucuya katılımda gider): kaydın kendisi; sınır yok. */
	ozet() {
		return this.toJSON();
	}
}

/**
 * Bayatlık: soru, maçtaki insanların hafızalarına (H) ve bu maçta sorulmuş bilgi anahtarlarına (usedK) göre ne kadar
 * "görülmüş". 0 = herkes için taze.
 */
export function bayat(q, H, usedK, twin = null) {
	let s = 0;
	const k = kardes(q);
	if (k && usedK?.has(k)) s += 3;
	const t = twin?.get(q.id);
	for (const h of H) {
		const a = t ? Math.min(h.yas(q.id), h.yas(t)) : h.yas(q.id);
		if (a !== Infinity) s += a < 30 ? 2 : 1;
		else if (k && h.kYas(k) < 5) s += 0.5;
	}
	return s;
}

/**
 * İkizler: aynı soru iki kimlikle (Mancınık sorusu = bankadaki tahmin sorusu, q.src). Kimlik → ikizinin kimliği, iki
 * yönlü: biri görüldüyse öbürü de görülmüş sayılır.
 */
export function ikizler(pool) {
	const m = new Map();
	for (const q of pool)
		if (q.src) {
			m.set(q.id, q.src);
			m.set(q.src, q.id);
		}
	return m;
}

/** Görülmüş katmanda tercih: en uzun zaman önce görülen (insanların en yakın gördüğü an). */
export function eskilik(q, H, twin = null) {
	let a = Infinity;
	const t = twin?.get(q.id);
	for (const h of H) a = Math.min(a, h.yas(q.id), t ? h.yas(t) : Infinity);
	return a === Infinity ? 1e6 : a;
}
