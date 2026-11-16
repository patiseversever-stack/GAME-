// SORU PAKETİ: soru bankasının oyun dosyasına sıkıştırılmış gömülme biçimi (SORU-100K.md Aşama 0.5).
//
//   BİÇİM     paketMetni(liste): sorular sırasıyla PARCA'lık dilimlere bölünür, her dilim bir satırda JSON dizisi
//             (JSON.stringify satır sonunu kaçırır; ham '\n' yalnız ayraçtır). Metin gzip ile sıkıştırılır, base64 ile
//             betiğe dize olarak gömülür (build.mjs). Dize, betiğin ayrıştırılmasında yalnız taranır: 20 bin soruluk
//             nesne yazımını açılışta değerlendirmekten çok daha ucuz.
//   AÇMA      paketAc(b64, ctl): base64 dilim dilim bayta çevrilip DecompressionStream('gzip') akışına yazılır, açılan
//             metin satır satır JSON.parse edilir. Her dilimden sonra ana iş parçacığı nefes alır (menü takılmasın);
//             ctl.acele açılınca (maç bekliyor) nefes alınmadan bitirilir.
//   YEDEK     DecompressionStream olmayan eski tarayıcılarda (Safari 14–16.3) aşağıdaki küçük RFC 1951 açıcı.
//
// Bu dosya tarayıcıda ve Node'da aynı çalışır (sınama: test/banka.test.mjs paketi Node'da kurup açar).

/** Bir satırdaki soru sayısı: 100 bin soruda ~500 satır, satır başına JSON.parse 4× yavaş işlemcide birkaç ms. */
export const PARCA = 200;

/** Soru listesinden paket metni (sıkıştırılmadan önce). Derleme (build.mjs) ve sınama kullanır. */
export function paketMetni(liste, parca = PARCA) {
	const satir = [];
	for (let i = 0; i < liste.length; i += parca) satir.push(JSON.stringify(liste.slice(i, i + parca)));
	return satir.join('\n');
}

// ---------------------------------------------------------------- zamanlama

const simdi = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/**
 * Ana iş parçacığına bir an bırak: boşta geri çağırma (zaman aşımlı), yoksa sıradaki görev. ctl.uyan beklemeyi hemen
 * bitirir (bank.js acele açınca çağırır: maç bekliyorsa boşta anı beklenmez).
 */
function nefes(ctl) {
	if (ctl.acele) return Promise.resolve();
	return new Promise((r) => {
		const bit = () => {
			if (ctl.uyan === bit) ctl.uyan = null;
			r();
		};
		ctl.uyan = bit;
		if (typeof requestIdleCallback === 'function') requestIdleCallback(bit, { timeout: 120 });
		else setTimeout(bit, 0);
	});
}
/** Dilim bütçesi (ms): bu kadar iş yapınca nefes al. */
const BUTCE = 8;

// ---------------------------------------------------------------- base64 → bayt

const B64 = new Uint8Array(128);
for (let i = 0; i < 64; i++) B64['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charCodeAt(i)] = i;
/** base64 dilimi (uzunluğu 4'ün katı ya da dizinin sonu) → bayt. atob'a göre ara dize kurmaz. */
function bayt(s) {
	let n = (s.length / 4) * 3;
	if (s.endsWith('==')) n -= 2;
	else if (s.endsWith('=')) n -= 1;
	const out = new Uint8Array(n);
	let o = 0;
	for (let i = 0; i < s.length; i += 4) {
		const v = (B64[s.charCodeAt(i)] << 18) | (B64[s.charCodeAt(i + 1)] << 12) | (B64[s.charCodeAt(i + 2)] << 6) | B64[s.charCodeAt(i + 3)];
		out[o++] = v >> 16;
		if (o < n) out[o++] = (v >> 8) & 255;
		if (o < n) out[o++] = v & 255;
	}
	return out;
}

// ---------------------------------------------------------------- açma

/** gzip akışını tarayıcının yerleşik açıcısıyla aç; base64 dilim dilim yazılır (uzun tek görev yok). */
async function akisla(b64, ctl) {
	const ds = new DecompressionStream('gzip');
	const w = ds.writable.getWriter();
	const metin = new Response(ds.readable).text();
	metin.catch(() => {}); // hata aşağıda await ile yakalanır (işlenmemiş ret uyarısı olmasın)
	const D = 1 << 18; // 256 KB base64 (4'ün katı)
	let t0 = simdi();
	for (let i = 0; i < b64.length; i += D) {
		await w.ready;
		w.write(bayt(b64.slice(i, i + D))).catch(() => {}); // bozuk veri: hata close() ve metin üzerinden gelir
		if (simdi() - t0 > BUTCE) {
			await nefes(ctl);
			t0 = simdi();
		}
	}
	await w.close();
	return metin;
}

/** Yedek: gzip başlığını atla, deflate gövdesini JS açıcıyla aç (DecompressionStream olmayan tarayıcı). */
export function gunzip(u8) {
	if (u8[0] !== 0x1f || u8[1] !== 0x8b || u8[2] !== 8) throw new Error('soru paketi: gzip değil');
	const flg = u8[3];
	let p = 10;
	if (flg & 4) p += 2 + (u8[p] | (u8[p + 1] << 8)); // FEXTRA
	if (flg & 8) while (u8[p++]); // FNAME
	if (flg & 16) while (u8[p++]); // FCOMMENT
	if (flg & 2) p += 2; // FHCRC
	const n = u8.length;
	const boy = (u8[n - 4] | (u8[n - 3] << 8) | (u8[n - 2] << 16) | (u8[n - 1] << 24)) >>> 0; // ISIZE
	return inflate(u8.subarray(p, n - 8), boy);
}

/**
 * Paketi aç: soru listesi. ctl = { acele } (acele sonradan da açılabilir: maç başlarken). sayi verilirse açılan soru
 * sayısı denetlenir (bozuk ya da yarım paket sessizce eksik banka kurmasın).
 */
export async function paketAc(b64, ctl = {}, sayi = null) {
	let metin;
	if (typeof DecompressionStream === 'function' && typeof Response === 'function') {
		try {
			metin = await akisla(b64, ctl);
		} catch (e) {
			metin = null; // akış desteği yarım (eski tarayıcı): JS açıcıya düş
		}
	}
	if (metin == null) {
		await nefes(ctl);
		metin = new TextDecoder().decode(gunzip(bayt(b64)));
	}
	const out = [];
	let t0 = simdi();
	for (let i = 0; i < metin.length; ) {
		let j = metin.indexOf('\n', i);
		if (j < 0) j = metin.length;
		const dilim = JSON.parse(metin.slice(i, j));
		for (let k = 0; k < dilim.length; k++) out.push(dilim[k]);
		i = j + 1;
		if (simdi() - t0 > BUTCE) {
			await nefes(ctl);
			t0 = simdi();
		}
	}
	if (sayi != null && out.length !== sayi) throw new Error(`soru paketi: ${out.length} soru açıldı, ${sayi} bekleniyordu`);
	return out;
}

// ---------------------------------------------------------------- RFC 1951 açıcı (yedek)

const LBAS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEK = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBAS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEK = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const SIRA = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/** Kanonik Huffman tablosu: boy başına kod sayısı ve boy sırasına dizilmiş simgeler (puff.c yöntemi). */
function tablo(boylar, n) {
	const sayi = new Uint16Array(16);
	const sim = new Uint16Array(n);
	for (let i = 0; i < n; i++) sayi[boylar[i]]++;
	sayi[0] = 0;
	const ofs = new Uint16Array(16);
	for (let b = 1; b < 15; b++) ofs[b + 1] = ofs[b] + sayi[b];
	for (let i = 0; i < n; i++) if (boylar[i]) sim[ofs[boylar[i]]++] = i;
	return { sayi, sim };
}

/** Ham deflate akışı → bayt. boy: beklenen çıktı uzunluğu (gzip ISIZE; bilinmiyorsa büyüyen tampon). */
export function inflate(src, boy = 0) {
	let out = new Uint8Array(boy || src.length * 4 || 64);
	let op = 0;
	let p = 0;
	let tam = 0; // bit tamponu
	let nb = 0; // tampondaki bit sayısı (okumadan sonra hep < 8)
	const yer = (n) => {
		if (op + n <= out.length) return;
		const o = new Uint8Array(Math.max(out.length * 2, op + n));
		o.set(out);
		out = o;
	};
	const bit = (n) => {
		while (nb < n) {
			if (p >= src.length) throw new Error('inflate: akış erken bitti');
			tam |= src[p++] << nb;
			nb += 8;
		}
		const v = tam & ((1 << n) - 1);
		tam >>>= n;
		nb -= n;
		return v;
	};
	const coz = (t) => {
		let kod = 0;
		let ilk = 0;
		let ix = 0;
		for (let b = 1; b < 16; b++) {
			kod |= bit(1);
			const c = t.sayi[b];
			if (kod - ilk < c) return t.sim[ix + kod - ilk];
			ix += c;
			ilk = (ilk + c) << 1;
			kod <<= 1;
		}
		throw new Error('inflate: geçersiz kod');
	};
	// sabit tablolar (blok tipi 1)
	let sabitL = null;
	let sabitD = null;
	let son = 0;
	while (!son) {
		son = bit(1);
		const tip = bit(2);
		if (tip === 0) {
			// saklanmış blok: bayta hizala, LEN / NLEN, düz kopya
			tam = 0;
			nb = 0;
			if (p + 4 > src.length) throw new Error('inflate: akış erken bitti');
			const len = src[p] | (src[p + 1] << 8);
			if ((len ^ (src[p + 2] | (src[p + 3] << 8))) !== 0xffff) throw new Error('inflate: saklanmış blok boyu bozuk');
			p += 4;
			if (p + len > src.length) throw new Error('inflate: akış erken bitti');
			yer(len);
			out.set(src.subarray(p, p + len), op);
			op += len;
			p += len;
			continue;
		}
		let L;
		let D;
		if (tip === 1) {
			if (!sabitL) {
				const b = new Uint8Array(288);
				b.fill(8, 0, 144);
				b.fill(9, 144, 256);
				b.fill(7, 256, 280);
				b.fill(8, 280, 288);
				sabitL = tablo(b, 288);
				sabitD = tablo(new Uint8Array(30).fill(5), 30);
			}
			L = sabitL;
			D = sabitD;
		} else if (tip === 2) {
			const nl = bit(5) + 257;
			const nd = bit(5) + 1;
			const nc = bit(4) + 4;
			const cb = new Uint8Array(19);
			for (let i = 0; i < nc; i++) cb[SIRA[i]] = bit(3);
			const C = tablo(cb, 19);
			const b = new Uint8Array(nl + nd);
			for (let i = 0; i < nl + nd; ) {
				const s = coz(C);
				if (s < 16) b[i++] = s;
				else {
					let r = 0;
					let v = 0;
					if (s === 16) {
						if (!i) throw new Error('inflate: önceki boy yok');
						v = b[i - 1];
						r = 3 + bit(2);
					} else if (s === 17) r = 3 + bit(3);
					else r = 11 + bit(7);
					if (i + r > nl + nd) throw new Error('inflate: boy taşması');
					while (r--) b[i++] = v;
				}
			}
			L = tablo(b.subarray(0, nl), nl);
			D = tablo(b.subarray(nl), nd);
		} else throw new Error('inflate: geçersiz blok tipi');
		for (;;) {
			const s = coz(L);
			if (s < 256) {
				yer(1);
				out[op++] = s;
			} else if (s === 256) break;
			else {
				const k = s - 257;
				if (k >= 29) throw new Error('inflate: geçersiz boy');
				const n = LBAS[k] + bit(LEK[k]);
				const d = coz(D);
				if (d >= 30) throw new Error('inflate: geçersiz uzaklık');
				const u = DBAS[d] + bit(DEK[d]);
				if (u > op) throw new Error('inflate: uzaklık çok geri');
				yer(n);
				for (let i = 0; i < n; i++, op++) out[op] = out[op - u];
			}
		}
	}
	return op === out.length ? out : out.subarray(0, op);
}
