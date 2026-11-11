/*
 * SORU HAFIZASI (2026-11): oyuncu bir soruyu bir kez görür; ilgili havuz tükenmeden ikinci kez çıkmaz.
 *
 *  Kayıt     kimlik → görüldüğü maçın sırası (n). Maç başında n artar (yeniMac). Soru SORULDUĞU an yazılır: maçı yarıda
 *            bırakan da gördüğünü bir daha görmez (eskiden yalnız maç sonunda, son 400 kimlik tutuluyordu).
 *  Kardeş    kardes(q): aynı bilgiyi soran farklı sorular (aynı doğru cevap: "Selanik" şıklı soru ile SELANİK adam asmaca;
 *            Mancınık ile kaynağı olan tahmin sorusu; aynı ilin Kimim'i). Aynı maçta ikisi çıkmaz, yakında görülen bilginin
 *            kardeşi geri düşer.
 *  Bayatlık  bayat(q, H, usedK): 0 taze; soruyu gören her insan için +2 (son 30 maçta) ya da +1 (daha eski), kardeşini son
 *            5 maçta gören için +0,5, kardeşi bu maçta sorulduysa +3. Seçici (Match.pick) en düşük bayatlık katmanından
 *            seçer (katman içinde zorluk ağırlığıyla), görülmüşler katmanında en eskisi önce.
 *  Çevrimiçi istemci ozet() gönderir (son görülen en çok 6000 kimlik ve 3000 kardeş, maç yaşlarıyla; ~70 KB JSON, gzip'le
 *            ~20 KB); sunucu her insan koltuğunun hafızasını Hafiza.from(ozet) ile kurar ve soruyu odadaki herkes için en
 *            taze olandan seçer. Maç içinde sorulanlar sunucuda da yazılır (koltuğun kendi kaydı istemcide yazılır).
 *  Hesap     sunucu, kimliği doğrulanmış oyuncunun kaydını kendisi saklar (src/game/sunucu.js setHafizaDeposu): maç başında
 *            depodan okunur, cihazın özetiyle birleşir (birlestir), maç sonunda ya da yarıda kalınca depoya yazılır. Telefon
 *            değiştiren ya da veriyi silen oyuncu gördüğü soruları yeniden görmez.
 *  Saklama   { v: 2, n, g: { maç: 'id id …' }, k: { maç: 'anahtar anahtar …' } }: kimlik bir kez, maç sırası grup başına
 *            bir kez yazılır. En çok 15000 kimlik ve 8000 kardeş (eskiler düşer): 100+ maçlık geçmiş.
 */

const MAX_ID = 15000;
const MAX_K = 8000;

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

export class Hafiza {
	/** d: toJSON() ya da ozet() çıktısı; eski biçim (kimlik dizisi) de okunur. */
	constructor(d = null) {
		this.n = 0;
		this.m = new Map(); // kimlik → maç sırası
		this.k = new Map(); // kardeş anahtarı → maç sırası
		if (Array.isArray(d)) {
			// v1: son görülen kimlikler (sıralı): hepsi "bir önceki maçta" sayılır
			this.n = 1;
			for (const id of d) if (typeof id === 'string') this.m.set(id, 0);
		} else if (d && typeof d === 'object') {
			this.n = Number.isFinite(d.n) ? d.n | 0 : 0;
			const read = (g, into) => {
				if (!g || typeof g !== 'object') return;
				for (const [t, s] of Object.entries(g)) {
					const at = Number(t);
					if (!Number.isFinite(at) || typeof s !== 'string') continue;
					for (const id of s.split(' ')) if (id) into.set(id, at);
				}
			};
			read(d.g, this.m);
			read(d.k, this.k);
		}
	}

	static from(d) {
		return d instanceof Hafiza ? d : new Hafiza(d);
	}

	/** Yeni maç başladı: bundan sonra görülenler bu maçın sırasıyla yazılır. */
	yeniMac() {
		this.n++;
		return this.n;
	}

	/** Soru görüldü (soruldu). */
	gor(q) {
		if (!q?.id) return;
		this.m.delete(q.id); // Map sırası = görülme sırası (en eski başta): kırpma eskiyi atar
		this.m.set(q.id, this.n);
		const k = kardes(q);
		if (k) {
			this.k.delete(k);
			this.k.set(k, this.n);
		}
		if (this.m.size > MAX_ID) this._trim(this.m, MAX_ID);
		if (this.k.size > MAX_K) this._trim(this.k, MAX_K);
	}

	_trim(map, max) {
		let over = map.size - max;
		for (const key of map.keys()) {
			if (over-- <= 0) break;
			map.delete(key);
		}
	}

	/**
	 * Başka bir kaydı bu kayda kat (sunucudaki hesap kaydı + cihazın özeti). İki kaydın maç sayaçları ayrı: öbür kayıttaki
	 * "kaç maç önce" bu kaydın sayacına çevrilir; iki kayıtta da olan kimlikte daha yakın görülme kalır.
	 */
	birlestir(o) {
		o = Hafiza.from(o);
		const kat = (from, into) => {
			for (const [id, t] of from) {
				const at = this.n - (o.n - t);
				const cur = into.get(id);
				if (cur == null || at > cur) into.set(id, at);
			}
		};
		kat(o.m, this.m);
		kat(o.k, this.k);
		// Map sırası görülme sırası olmalı (kırpma en eskiyi atar): birleşince sıraya yeniden diz
		const sirala = (map) => new Map([...map.entries()].sort((a, b) => a[1] - b[1]));
		this.m = sirala(this.m);
		this.k = sirala(this.k);
		if (this.m.size > MAX_ID) this._trim(this.m, MAX_ID);
		if (this.k.size > MAX_K) this._trim(this.k, MAX_K);
		return this;
	}

	/** Kaç maç önce görüldü (bu maçta: 0); hiç görülmediyse Infinity. */
	yas(id) {
		const t = this.m.get(id);
		return t == null ? Infinity : this.n - t;
	}

	kYas(key) {
		const t = key ? this.k.get(key) : undefined;
		return t == null ? Infinity : this.n - t;
	}

	get size() {
		return this.m.size;
	}

	_pack(map, max) {
		const g = {};
		const list = [...map.entries()];
		for (const [id, t] of list.slice(Math.max(0, list.length - max))) (g[t] = g[t] ? g[t] + ' ' + id : id);
		return g;
	}

	toJSON() {
		return { v: 2, n: this.n, g: this._pack(this.m, MAX_ID), k: this._pack(this.k, MAX_K) };
	}

	/** Çevrimiçi özet: en yeni görülenler (sunucuya katılımda gider). */
	ozet(maxId = 6000, maxK = 3000) {
		return { v: 2, n: this.n, g: this._pack(this.m, maxId), k: this._pack(this.k, maxK) };
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
