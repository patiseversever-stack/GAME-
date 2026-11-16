// GÖZ KARARI · BÜYÜTMESİZ KİPLER. Kullanıcı 16 Kasım 2026: yakın çekim ve ayrıntı görseli 5–6,5 kat büyütüp pikselletiyordu;
// beş deneme kipinden ikisi seçildi, sinematik hale getirildi (anahtar deliği, yapboz, perde kaldırıldı):
//   karo    alt katmanda görselin bulanık, hafif karartılmış hali; 8×6 karo rastgele sırayla kart çevrilir gibi açılır,
//           açılırken kısa bir ışık parlar, karonun altındaki net görsel görünür
//   cizim   kâğıt dokusu üstünde kurşun kalem çizimi (tarayıcıda görselden: XDoG hat + renk soldurma gölgesi + kâğıt lifi);
//           çizim ressamın elinden çıkar gibi belirir (önce koyu hatlar), sonra renk odaktan dışa sulu boya gibi yayılır,
//           çizgiler rengin üstünde bir süre kalır ve en sonda fotoğraf tek başına kalır
// Siluet kipinin sinematik geçişi de burada (siluetGecis): siyah gölge önce bulanık renge, sonra net görsele dönüşür.
// Arayüz: kipSvg() kartın SVG'sine girecek parçaları verir, kipKur() kart kurulunca bir güncelleyici döner:
// guncelle(g), g = 0 (başlangıç) … 1 (tam açık). Kart g'yi puan aralığının KIP_SON payında 1'e götürür. Görsel hiçbir
// anda büyütülmez.

export const YENI_KIP = { karo: 'Karo karo', cizim: 'Çizimden fotoğrafa' };
/** Kipler puan aralığının bu payında tam açılır (bulanık kip 0,65; bunlar biraz daha uzun ipucu verir). */
export const KIP_SON = 0.8;

const W = 400;
const H = 300;
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const yuv = (x) => x * x * (3 - 2 * x); // smoothstep
const r1 = (n) => n.toFixed(1);
const r3 = (n) => n.toFixed(3);

/** Tohumlu sayı üreteci (mulberry32): aynı soru her açılışta aynı düzeni kurar. */
function rng(seed) {
	let a = seed >>> 0 || 1;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function karistir(n, R) {
	const a = Array.from({ length: n }, (_, i) => i);
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(R() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

const KR = { c: 8, r: 6 }; // karo ızgarası
const KR_SURE = 0.07; // bir karonun açılma süresi (g biriminde)
// çizim maskesi: alfa = K·(L − 1 + t·(1 + 1/K)); t = 0'da hiçbir şey, t = 1'de hepsi görünür, K kenar sertliği
const CZ = { k1: 5, k2: 2.6 };

/**
 * Kartın SVG'sine girecek parçalar.
 * @returns {{ defs: string, alt: string, zmAttr: string, imAttr: string, tas: string, ust: string }}
 */
export function kipSvg(kip, k, { src }) {
	const href = src ? ` href="${src}"` : '';
	const o = { defs: '', alt: '', zmAttr: '', imAttr: '', tas: '', ust: '' };
	if (kip === 'karo') {
		const cw = W / KR.c;
		const ch = H / KR.r;
		let km = '';
		let kg = '';
		let kf = '';
		for (let i = 0; i < KR.c * KR.r; i++) {
			const x = (i % KR.c) * cw;
			const y = Math.floor(i / KR.c) * ch;
			// dikeyde de yarım piksel bindirme (satırlar arası dikiş görünmesin); yatayı açılma sırasında ayarlanır
			km += `<rect class="km" x="${x}" y="${y - 0.6}" width="${cw}" height="${ch + 1.2}" fill="#fff" opacity="0"/>`;
			kg += `<rect class="kg" x="${x + 0.5}" y="${y + 0.5}" width="${cw - 1}" height="${ch - 1}" fill="none" stroke="#fff" stroke-opacity=".2"/>`;
			kf += `<rect class="kf" x="${x}" y="${y}" width="${cw}" height="${ch}" fill="#fff6dc" opacity="0"/>`;
		}
		// alt katman: bulanık ve hafif karartılmış (soğuk) görsel; karolar açıldıkça net görsel maskeyle görünür
		o.defs = `<filter id="kbf${k}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="12" edgeMode="duplicate"/><feColorMatrix type="matrix" values=".64 0 0 0 0  0 .66 0 0 0  0 0 .78 0 .02  0 0 0 1 0"/></filter>
			<mask id="km${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/>${km}</mask>`;
		o.imAttr = ` filter="url(#kbf${k})"`;
		o.tas = `<image class="gi"${href} width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" mask="url(#km${k})"/>`;
		o.ust = `<g class="kgs" pointer-events="none">${kg}</g><g class="kfs" pointer-events="none">${kf}</g>`;
	} else if (kip === 'cizim') {
		const fn = (n) => `<feComponentTransfer><feFuncR class="${n}" type="linear" slope="0" intercept="0"/><feFuncG class="${n}" type="linear" slope="0" intercept="0"/><feFuncB class="${n}" type="linear" slope="0" intercept="0"/></feComponentTransfer>`;
		o.defs = `<filter id="cf1${k}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">${fn('c1')}</filter>
			<filter id="cf2${k}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">${fn('c2')}</filter>
			<mask id="cm1${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><image class="co1" width="${W}" height="${H}" preserveAspectRatio="none" filter="url(#cf1${k})"/></mask>
			<mask id="cm2${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><image class="co2" width="${W}" height="${H}" preserveAspectRatio="none" filter="url(#cf2${k})"/></mask>`;
		// kâğıt + çizim (maskeyle belirir) görselin altında; fotoğraf ikinci maskeyle sulu boya gibi yayılır; çizginin kopyası
		// rengin üstünde çarpma kipinde bir süre kalır (renkli çizim görünümü)
		o.alt = `<rect width="${W}" height="${H}" fill="#f1e9d6"/><image class="ln" width="${W}" height="${H}" preserveAspectRatio="none" mask="url(#cm1${k})"/>`;
		o.imAttr = ` mask="url(#cm2${k})"`;
		o.ust = `<image class="ln2" width="${W}" height="${H}" preserveAspectRatio="none" opacity="0" style="mix-blend-mode:multiply" pointer-events="none"/>`;
	}
	return o;
}

// ---------------------------------------------------------------- çizim: kurşun kalem görseli ve açılış haritaları
const SW = 800; // çizim çözünürlüğü (telefonda kart ~380 css px × 2–3 yoğunluk: çizgi keskin kalsın)
const SH = 600;

/** Ayrılabilir Gauss bulanıklığı (kenarda kenar pikseli tekrar eder). */
function gauss(src, w, h, s) {
	const r = Math.max(1, Math.ceil(s * 3));
	const k = new Float32Array(2 * r + 1);
	let t = 0;
	for (let i = -r; i <= r; i++) t += k[i + r] = Math.exp(-(i * i) / (2 * s * s));
	for (let i = 0; i < k.length; i++) k[i] /= t;
	const a = new Float32Array(w * h);
	const b = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		const o = y * w;
		for (let x = 0; x < w; x++) {
			let v = 0;
			for (let j = -r; j <= r; j++) v += k[j + r] * src[o + (x + j < 0 ? 0 : x + j >= w ? w - 1 : x + j)];
			a[o + x] = v;
		}
	}
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			let v = 0;
			for (let j = -r; j <= r; j++) v += k[j + r] * a[(y + j < 0 ? 0 : y + j >= h ? h - 1 : y + j) * w + x];
			b[y * w + x] = v;
		}
	return b;
}

/** Yumuşak gürültü alanı (0..1): küçük rastgele ızgara, tuval büyütmesiyle pürüzsüzleşir. */
function gurultu(w, h, gx, gy, R) {
	const c = document.createElement('canvas');
	c.width = gx;
	c.height = gy;
	const x = c.getContext('2d');
	const d = x.createImageData(gx, gy);
	for (let i = 0; i < gx * gy; i++) {
		const v = Math.floor(R() * 255);
		d.data[4 * i] = d.data[4 * i + 1] = d.data[4 * i + 2] = v;
		d.data[4 * i + 3] = 255;
	}
	x.putImageData(d, 0, 0);
	const b = document.createElement('canvas');
	b.width = w;
	b.height = h;
	const y = b.getContext('2d', { willReadFrequently: true });
	y.imageSmoothingEnabled = true;
	y.imageSmoothingQuality = 'high';
	y.drawImage(c, 0, 0, w, h);
	const p = y.getImageData(0, 0, w, h).data;
	const o = new Float32Array(w * h);
	for (let i = 0; i < w * h; i++) o[i] = p[4 * i] / 255;
	return o;
}

const blobUrl = (c) => new Promise((ok) => c.toBlob((b) => ok(b ? URL.createObjectURL(b) : c.toDataURL('image/png')), 'image/png'));
function griTuval(w, h, f) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const x = c.getContext('2d');
	const d = x.createImageData(w, h);
	for (let i = 0; i < w * h; i++) {
		const v = Math.round(cl(f(i)) * 255);
		d.data[4 * i] = d.data[4 * i + 1] = d.data[4 * i + 2] = v;
		d.data[4 * i + 3] = 255;
	}
	x.putImageData(d, 0, 0);
	return c;
}

const CIZIM = new Map(); // görsel adresi → Promise<{ cizim, harita1, harita2 }>
/**
 * Görselden kurşun kalem çizimi ve iki açılış haritası üretir (görsel başına bir kez; önden indirmede de çağrılır).
 * harita1: çizimin belirme sırası (koyu hat önce), harita2: rengin yayılma sırası (odaktan dışa, düzensiz kenar).
 * @param {string} url görselin adresi (blob: ya da düz)
 * @param {number[]} f0 odak (0..1)
 * @param {number} seed
 */
export function cizimHazirla(url, f0 = [0.5, 0.5], seed = 1) {
	if (CIZIM.has(url)) return CIZIM.get(url);
	const p = (async () => {
		const im = new Image();
		im.src = url;
		await im.decode();
		const c = document.createElement('canvas');
		c.width = SW;
		c.height = SH;
		const x = c.getContext('2d', { willReadFrequently: true });
		x.imageSmoothingQuality = 'high';
		x.drawImage(im, 0, 0, SW, SH); // görsel 4:3
		const d = x.getImageData(0, 0, SW, SH);
		const px = d.data;
		const N = SW * SH;
		const L = new Float32Array(N);
		for (let i = 0; i < N; i++) L[i] = (0.299 * px[4 * i] + 0.587 * px[4 * i + 1] + 0.114 * px[4 * i + 2]) / 255;
		// XDoG (genişletilmiş Gauss farkı): kalemle çizilmiş gibi temiz, uçları incelen hatlar
		const g1 = gauss(L, SW, SH, 1.1);
		const g2 = gauss(L, SW, SH, 1.1 * 1.6);
		// kurşun kalem gölgesi: renk soldurma (color dodge) — gri ton, ters çevrilmiş bulanık haline bölünür; düz yüzeyler
		// kâğıt kalır, doku ve geçişler grafit gölgesi olur (prototipte XDoG + düz tondan belirgin daha "elle çizilmiş")
		const ters = new Float32Array(N);
		for (let i = 0; i < N; i++) ters[i] = 1 - L[i];
		const bi = gauss(ters, SW, SH, 7);
		const gt = gauss(L, SW, SH, 4);
		const R = rng(seed);
		const lif = gurultu(SW, SH, 220, 165, R); // kâğıt lifi
		const leke = gurultu(SW, SH, 9, 7, R); // kâğıdın geniş tonu
		const deger = new Float32Array(N); // 1 = kâğıt, 0 = koyu grafit
		const TAU = 0.982;
		const EPS = -0.006;
		const PHI = 95;
		for (let y = 0; y < SH; y++)
			for (let xx = 0; xx < SW; xx++) {
				const i = y * SW + xx;
				const D = g1[i] - TAU * g2[i];
				const e = D >= EPS ? 1 : 1 + Math.tanh(PHI * (D - EPS));
				const dodge = Math.pow(cl(L[i] / Math.max(1 - bi[i], 0.02)), 2.4);
				const ton = 1 - 0.28 * Math.pow(1 - gt[i], 1.5);
				deger[i] = cl(Math.min(dodge, Math.pow(e, 1.3)) * ton);
			}
		const kagit = [244, 236, 219];
		const grafit = [52, 46, 42];
		for (let y = 0; y < SH; y++)
			for (let xx = 0; xx < SW; xx++) {
				const i = y * SW + xx;
				// kâğıt: lif ve geniş ton, kenarlarda hafif kararma
				const kx = xx / SW - 0.5;
				const ky = y / SH - 0.5;
				const kenar = 1 - 0.1 * Math.pow(Math.hypot(kx * 1.15, ky * 1.3) * 1.6, 2.4);
				const pk = (0.965 + 0.05 * (lif[i] - 0.5) + 0.04 * (leke[i] - 0.5)) * kenar;
				const v = deger[i];
				for (let c2 = 0; c2 < 3; c2++) px[4 * i + c2] = Math.round((kagit[c2] * pk) * v + grafit[c2] * (1 - v));
				px[4 * i + 3] = 255;
			}
		x.putImageData(d, 0, 0);
		const cizim = await blobUrl(c);
		// açılış haritaları (400×300 yeterli; maske yumuşak): açık = erken
		const ince = gurultu(W, H, 80, 60, R);
		const kaba = gurultu(W, H, 7, 5, R);
		const a1 = new Float32Array(W * H);
		const a2 = new Float32Array(W * H);
		const fx = f0[0];
		const fy = f0[1];
		for (let y = 0; y < H; y++)
			for (let xx = 0; xx < W; xx++) {
				const i = y * W + xx;
				const v = deger[y * 2 * SW + xx * 2];
				a1[i] = 0.58 * v + 0.27 * ince[i] + 0.15 * ((xx / W) * 0.6 + (y / H) * 0.4);
				a2[i] = 0.5 * kaba[i] + 0.5 * Math.min(1, Math.hypot(xx / W - fx, (y / H - fy) * 0.75) * 1.5);
			}
		const nrm = (a) => {
			let lo = Infinity;
			let hi = -Infinity;
			for (const v of a) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
			const s = hi - lo || 1;
			return (i) => 1 - (a[i] - lo) / s;
		};
		const [harita1, harita2] = await Promise.all([blobUrl(griTuval(W, H, nrm(a1))), blobUrl(griTuval(W, H, nrm(a2)))]);
		return { cizim, harita1, harita2 };
	})();
	CIZIM.set(url, p);
	p.catch(() => CIZIM.delete(url));
	return p;
}

/**
 * Kip kurulumu (kart DOM'a girince). Döner: { guncelle(g), gorsel(url) }.
 * @param {string} kip
 * @param {Element} el kartın kökü
 * @param {{ f0: number[], seed: number }} o odak (0..1) ve tohum
 */
export function kipKur(kip, el, { f0, seed }) {
	const bos = { guncelle() {}, gorsel() {} };
	if (kip === 'karo') {
		const R = rng(seed);
		const cw = W / KR.c;
		const km = [...el.querySelectorAll('.km')];
		const kg = [...el.querySelectorAll('.kg')];
		const kf = [...el.querySelectorAll('.kf')];
		const n = km.length;
		const sira = karistir(n, R);
		const ac = new Array(n);
		const ILK = 3; // başta açık karo sayısı (bir şey görünsün)
		sira.forEach((i, j) => (ac[i] = j < ILK ? -1 : 0.02 + ((j - ILK) / (n - ILK - 1)) * 0.86));
		const son = new Array(n).fill(-1);
		return {
			...bos,
			guncelle(g) {
				for (let i = 0; i < n; i++) {
					const u = cl((g - ac[i]) / KR_SURE);
					const q = Math.round(u * 200);
					if (q === son[i]) continue;
					son[i] = q;
					const s = yuv(u);
					// kart çevrilir gibi: maske karosu ortasından iki yana açılır, kısa bir ışık parlar, ızgara çizgisi söner
					const x0 = (i % KR.c) * cw;
					// açık karo komşusuna yarım piksel biner: bitişik maske karoları arasında ince dikiş (bulanık zemin) görünmesin
					km[i].setAttribute('x', r1(x0 + (cw * (1 - s)) / 2 - 0.6 * s));
					km[i].setAttribute('width', r1(cw * s + 1.2 * s));
					km[i].setAttribute('opacity', r3(s));
					kg[i].setAttribute('stroke-opacity', r3(0.2 * (1 - s)));
					kf[i].setAttribute('opacity', r3(u > 0 && u < 1 ? 0.55 * Math.sin(Math.PI * u) : 0));
				}
			},
		};
	}
	if (kip === 'cizim') {
		const ln = el.querySelector('image.ln');
		const ln2 = el.querySelector('image.ln2');
		const co1 = el.querySelector('image.co1');
		const co2 = el.querySelector('image.co2');
		const c1 = [...el.querySelectorAll('.c1')];
		const c2 = [...el.querySelectorAll('.c2')];
		const im = el.querySelector('image.im');
		let durum = 'bekliyor'; // bekliyor | hazir | yok (çizim üretilemedi: fotoğraf düz açılır)
		let gSon = 0;
		const esik = (fs, K, t) => {
			const b = K * (t * (1 + 1 / K) - 1);
			for (const f of fs) {
				f.setAttribute('slope', String(K));
				f.setAttribute('intercept', r3(b));
			}
		};
		const ciz = (g) => {
			if (durum === 'yok') {
				im.setAttribute('opacity', r3(yuv(cl(g / 0.9))));
				return;
			}
			if (durum !== 'hazir') return;
			esik(c1, CZ.k1, cl(g / 0.4)); // çizim: ilk %40'ta belirir (önce koyu hatlar)
			const t2 = cl((g - 0.36) / 0.58); // renk: odaktan dışa yayılır
			esik(c2, CZ.k2, t2);
			// çizgi rengin üstünde kalır (renkli çizim), en sonda söner: fotoğraf tek başına
			ln2.setAttribute('opacity', r3(0.78 * yuv(cl(t2 * 4)) * (1 - yuv(cl((g - 0.84) / 0.16)))));
		};
		return {
			guncelle(g) {
				gSon = g;
				ciz(g);
			},
			gorsel(url) {
				cizimHazirla(url, f0, seed).then(
					(r) => {
						ln.setAttribute('href', r.cizim);
						ln2.setAttribute('href', r.cizim);
						co1.setAttribute('href', r.harita1);
						co2.setAttribute('href', r.harita2);
						durum = 'hazir';
						ciz(gSon);
					},
					() => {
						durum = 'yok';
						im.removeAttribute('mask');
						ciz(gSon);
					},
				);
			},
		};
	}
	return bos;
}

/**
 * Siluet kipinin sinematik geçişi (kullanıcı: "siluette yavaş yavaş resme dönüşse"). Kart: alt katmanda görsel (bulanıklık
 * filtresiyle), üstte .sl grubu: siluetin dışını örten sahne zemini (.sb) ve içini örten koyu gölge (.sd2).
 * g: 0–0,22 saf siluet · gölge açılır, içinden görselin bulanık rengi görünür · sahne zemini çekilir · bulanıklık
 * kalkar, net görsel.
 */
export function siluetGecis(el, blur) {
	const sb = el.querySelector('.sl .sb');
	const sd = el.querySelector('.sl .sd2');
	let son = '';
	return {
		gorsel() {},
		guncelle(g) {
			const golge = 1 - yuv(cl((g - 0.22) / 0.46));
			const zemin = 1 - yuv(cl((g - 0.5) / 0.42));
			const b = 14 * (1 - yuv(cl((g - 0.26) / 0.7)));
			const key = `${r3(golge)}|${r3(zemin)}|${r1(b)}`;
			if (key === son) return;
			son = key;
			sd?.setAttribute('opacity', r3(golge));
			sb?.setAttribute('opacity', r3(zemin));
			blur?.setAttribute('stdDeviation', r1(b));
		},
	};
}
