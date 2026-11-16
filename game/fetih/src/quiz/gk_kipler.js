// GÖZ KARARI · BÜYÜTMESİZ KİPLER (deneme; kullanıcı 16 Kasım 2026: "yakından uzaklaştırma pikselleri gösteriyor, büyütmeden
// açılan kipler yapalım"). Hepsinde görsel kendi boyunda kalır, hiçbir anda büyütülmez:
//   spot    anahtar deliği: karanlıkta bir ışık halkası ayrıntının üstünde (q.f odağı) açılır, genişleyip ortaya kayar
//   yapboz  4×3 parça karışık yerlerde başlar, sırayla yerine kayar; hepsi oturunca dikişsiz görsel
//   karo    8×6 karo rastgele sırayla açılır (Kazı Kazan'ın kendiliğinden açılan hali)
//   perde   10 dikey şerit; her şeridin ortasındaki aralık genişleyerek açılır
//   cizim   önce yalnız kontur çizgileri (tarayıcıda görselden Sobel ile çıkarılır), sonra renk ve doku dolar
// Arayüz: kipSvg() kartın SVG'sine girecek parçaları verir, kipKur() kart kurulunca çağrılır ve bir güncelleyici döner:
// guncelle(g), g = 0 (başlangıç) … 1 (tam açık). Kart g'yi puan aralığının KIP_SON payında 1'e götürür.

export const YENI_KIP = { spot: 'Anahtar deliği', yapboz: 'Yapboz', karo: 'Karo karo', perde: 'Perde', cizim: 'Çizimden fotoğrafa' };
/** Yeni kipler puan aralığının bu payında tam açılır (bulanık kip 0,65; bunlar biraz daha uzun ipucu verir). */
export const KIP_SON = 0.8;

const W = 400;
const H = 300;
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const yuv = (x) => x * x * (3 - 2 * x); // smoothstep
const r1 = (n) => n.toFixed(1);

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
/** Hiçbir parça kendi yerinde başlamasın (yapboz): karıştırılmış dizi bir kaydırılır. */
function bozuk(n, R) {
	const s = karistir(n, R);
	const p = new Array(n);
	for (let i = 0; i < n; i++) p[s[i]] = s[(i + 1) % n];
	return p;
}

const YB = { c: 4, r: 3 }; // yapboz ızgarası
const KR = { c: 8, r: 6 }; // karo ızgarası
const PD = 10; // perde şerit sayısı

/**
 * Kartın SVG'sine girecek parçalar.
 * @returns {{ defs: string, alt: string, zmAttr: string, imAttr: string, tas: string, ust: string }}
 */
export function kipSvg(kip, k, { src }) {
	const href = src ? ` href="${src}"` : '';
	const o = { defs: '', alt: '', zmAttr: '', imAttr: '', tas: '', ust: '' };
	if (kip === 'spot') {
		o.defs = `<radialGradient id="spg${k}"><stop offset="0" stop-color="#fff"/><stop offset=".62" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
			<mask id="sp${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><circle class="spc" r="0" fill="url(#spg${k})"/></mask>`;
		o.zmAttr = ` mask="url(#sp${k})"`;
		// halkanın ışığı: ince sıcak bir kenar (görselin üstünde, maske dışında)
		o.ust = `<circle class="spr" r="0" fill="none" stroke="#ffe7a8" stroke-width="1.6" pointer-events="none"/>`;
	} else if (kip === 'yapboz') {
		const tw = W / YB.c;
		const th = H / YB.r;
		let defs = '';
		let tas = '';
		for (let i = 0; i < YB.c * YB.r; i++) {
			const x = (i % YB.c) * tw;
			const y = Math.floor(i / YB.c) * th;
			defs += `<clipPath id="tc${k}-${i}"><rect x="${x + 1}" y="${y + 1}" width="${tw - 2}" height="${th - 2}" rx="3"/></clipPath>`;
			tas += `<g class="tp" data-i="${i}"><image class="gi"${href} width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#tc${k}-${i})"/><rect x="${x + 1}" y="${y + 1}" width="${tw - 2}" height="${th - 2}" rx="3" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/></g>`;
		}
		o.defs = defs;
		o.tas = `<g class="yb">${tas}</g>`;
		o.imAttr = ' opacity="0"'; // parçalar oturunca dikişsiz görsel üstten belirir
	} else if (kip === 'karo') {
		const cw = W / KR.c;
		const ch = H / KR.r;
		let s = '';
		for (let i = 0; i < KR.c * KR.r; i++) {
			const x = (i % KR.c) * cw;
			const y = Math.floor(i / KR.c) * ch;
			s += `<rect class="kr" x="${x}" y="${y}" width="${cw}" height="${ch}" fill="url(#krg${k})" stroke="#0b1128" stroke-width="1.5"/>`;
		}
		o.defs = `<linearGradient id="krg${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3870"/><stop offset="1" stop-color="#18224a"/></linearGradient>`;
		o.ust = `<g class="krs">${s}</g>`;
	} else if (kip === 'perde') {
		let s = '';
		for (let i = 0; i < PD; i++) s += `<rect class="pdl" y="0" height="${H}" fill="url(#pdg${k})"/><rect class="pdr" y="0" height="${H}" fill="url(#pdg${k})"/>`;
		o.defs = `<linearGradient id="pdg${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#121a3c"/><stop offset=".55" stop-color="#2b3a74"/><stop offset="1" stop-color="#151e44"/></linearGradient>`;
		o.ust = `<g class="pds">${s}</g>`;
	} else if (kip === 'cizim') {
		// kâğıt + kontur görseli görselin altında; asıl görsel üstte, saydamlığı zamanla açılır
		o.alt = `<rect width="${W}" height="${H}" fill="#efe6cf"/><image class="ln" width="${W}" height="${H}" preserveAspectRatio="none" opacity="0"/>`;
		o.imAttr = ' opacity="0"';
	}
	return o;
}

// çizim kipinin kontur görseli: görsel başına bir kez (blob: adresi)
const CIZGI = new Map();
async function cizgiUrl(url) {
	if (CIZGI.has(url)) return CIZGI.get(url);
	const p = (async () => {
		const im = new Image();
		im.src = url;
		await im.decode();
		const c = document.createElement('canvas');
		c.width = W;
		c.height = H;
		const x = c.getContext('2d', { willReadFrequently: true });
		// görsel 4:3: dolgu kırpması yok
		x.drawImage(im, 0, 0, W, H);
		const d = x.getImageData(0, 0, W, H);
		const p = d.data;
		const g = new Float32Array(W * H);
		for (let i = 0; i < W * H; i++) g[i] = 0.299 * p[4 * i] + 0.587 * p[4 * i + 1] + 0.114 * p[4 * i + 2];
		// 3×3 kutu bulanıklığı: doku gürültüsü çizgi olmasın
		const b = new Float32Array(W * H);
		for (let y = 1; y < H - 1; y++)
			for (let xx = 1; xx < W - 1; xx++) {
				let s = 0;
				for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += g[(y + dy) * W + xx + dx];
				b[y * W + xx] = s / 9;
			}
		const m = new Float32Array(W * H);
		for (let y = 2; y < H - 2; y++)
			for (let xx = 2; xx < W - 2; xx++) {
				const i = y * W + xx;
				const gx = b[i - W + 1] + 2 * b[i + 1] + b[i + W + 1] - b[i - W - 1] - 2 * b[i - 1] - b[i + W - 1];
				const gy = b[i + W - 1] + 2 * b[i + W] + b[i + W + 1] - b[i - W - 1] - 2 * b[i - W] - b[i - W + 1];
				m[i] = Math.hypot(gx, gy);
			}
		// ölçek: kenar gücünün %94'lük değeri (görselden görsele aynı çizgi koyuluğu)
		const ornek = [];
		for (let i = 0; i < m.length; i += 7) ornek.push(m[i]);
		ornek.sort((a, z) => a - z);
		const ust = Math.max(ornek[Math.floor(ornek.length * 0.94)], 1);
		const kagit = [239, 230, 207];
		const murekkep = [46, 36, 28];
		for (let i = 0; i < W * H; i++) {
			const t = Math.pow(cl((m[i] / ust - 0.18) / 0.82), 0.85);
			for (let c2 = 0; c2 < 3; c2++) p[4 * i + c2] = kagit[c2] + (murekkep[c2] - kagit[c2]) * t;
			p[4 * i + 3] = 255;
		}
		x.putImageData(d, 0, 0);
		const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
		return blob ? URL.createObjectURL(blob) : c.toDataURL('image/png');
	})();
	CIZGI.set(url, p);
	p.catch(() => CIZGI.delete(url));
	return p;
}

/**
 * Kip kurulumu (kart DOM'a girince). Döner: { guncelle(g), gorsel(url) }.
 * @param {string} kip
 * @param {Element} el kartın kökü
 * @param {{ f0: number[], seed: number }} o odak (0..1) ve tohum
 */
export function kipKur(kip, el, { f0, seed }) {
	const R = rng(seed);
	const bos = { guncelle() {}, gorsel() {} };
	const im = el.querySelector('image.im');
	if (kip === 'spot') {
		const c = el.querySelector('.spc');
		const ring = el.querySelector('.spr');
		const fx = f0[0] * W;
		const fy = f0[1] * H;
		// yarıçap: başta küçük bir delik, sonda en uzak köşeyi yumuşak kenarıyla birlikte aşar
		const r0 = 30;
		let son = '';
		return {
			...bos,
			guncelle(g) {
				// başa yüklü yumuşatma (ease) yok: delik ilk yarıda küçük kalır, ikinci yarıda hızlanır (ilk denemede 0,3 sn'de
				// portrenin yarısı görünüyordu)
				const e = Math.pow(g, 2.2);
				const cx = fx + (W / 2 - fx) * Math.pow(g, 1.5) * 0.7;
				const cy = fy + (H / 2 - fy) * Math.pow(g, 1.5) * 0.7;
				const rMax = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) / 0.62 + 4;
				const r = r0 + (rMax - r0) * e;
				const key = `${r1(cx)}|${r1(cy)}|${r1(r)}`;
				if (key === son) return;
				son = key;
				for (const n of [c, ring]) {
					n.setAttribute('cx', r1(cx));
					n.setAttribute('cy', r1(cy));
				}
				c.setAttribute('r', r1(r));
				ring.setAttribute('r', r1(r * 0.66));
				ring.setAttribute('stroke-opacity', (0.55 * (1 - e)).toFixed(3));
			},
		};
	}
	if (kip === 'yapboz') {
		const n = YB.c * YB.r;
		const tw = W / YB.c;
		const th = H / YB.r;
		const yer = bozuk(n, R); // parça i başta yer[i] yuvasında
		const sira = karistir(n, R); // yerine oturma sırası
		const bas = new Array(n);
		sira.forEach((i, j) => (bas[i] = 0.06 + (0.64 * j) / (n - 1)));
		const SURE = 0.16;
		const grup = el.querySelector('.yb');
		const tp = [...el.querySelectorAll('.yb .tp')];
		const ust = new Set(); // hareket eden parça öne alınır (öteki parçaların altından geçmesin)
		let son = '';
		return {
			...bos,
			guncelle(g) {
				let key = '';
				const tr = tp.map((t, i) => {
					const u = cl((g - bas[i]) / SURE);
					const e = u <= 0 ? 0 : u >= 1 ? 1 : yuv(u);
					const dx = ((yer[i] % YB.c) - (i % YB.c)) * tw * (1 - e);
					const dy = (Math.floor(yer[i] / YB.c) - Math.floor(i / YB.c)) * th * (1 - e);
					if (u > 0 && u < 1 && !ust.has(i)) {
						ust.add(i);
						grup.appendChild(t);
					}
					const s = `translate(${r1(dx)} ${r1(dy)})`;
					key += s;
					return s;
				});
				const op = cl((g - 0.9) / 0.1);
				key += op.toFixed(2);
				if (key === son) return;
				son = key;
				tp.forEach((t, i) => t.setAttribute('transform', tr[i]));
				im.setAttribute('opacity', op.toFixed(2));
				grup.setAttribute('opacity', (1 - op * 0.999).toFixed(3));
			},
		};
	}
	if (kip === 'karo') {
		const kr = [...el.querySelectorAll('.krs .kr')];
		const n = kr.length;
		const sira = karistir(n, R);
		const ac = new Array(n);
		const ILK = 3; // başta açık karo sayısı (bir şey görünsün)
		sira.forEach((i, j) => (ac[i] = j < ILK ? -1 : 0.02 + ((j - ILK) / (n - ILK - 1)) * 0.9));
		let son = '';
		return {
			...bos,
			guncelle(g) {
				let key = '';
				const op = kr.map((_, i) => {
					const v = 1 - cl((g - ac[i]) / 0.05);
					key += v > 0.99 ? '1' : v < 0.01 ? '0' : v.toFixed(2);
					return v;
				});
				if (key === son) return;
				son = key;
				kr.forEach((r, i) => r.setAttribute('opacity', op[i].toFixed(2)));
			},
		};
	}
	if (kip === 'perde') {
		const sw = W / PD;
		const sol = [...el.querySelectorAll('.pds .pdl')];
		const sag = [...el.querySelectorAll('.pds .pdr')];
		let son = '';
		return {
			...bos,
			guncelle(g) {
				// aralık başta dar kalır, sona doğru hızlanır (başa yüklü yumuşatmayla ilk saniyede görsel fazla açıktı)
				const w = sw * (0.06 + 0.94 * Math.pow(g, 1.8));
				const kalan = Math.max(0, (sw - w) / 2);
				const key = r1(kalan);
				if (key === son) return;
				son = key;
				for (let i = 0; i < PD; i++) {
					sol[i].setAttribute('x', r1(i * sw));
					sol[i].setAttribute('width', r1(kalan));
					sag[i].setAttribute('x', r1(i * sw + sw - kalan));
					sag[i].setAttribute('width', r1(kalan));
				}
			},
		};
	}
	if (kip === 'cizim') {
		const ln = el.querySelector('image.ln');
		let hazir = false;
		let gSon = 0;
		const ciz = (g) => {
			// çizgiler önce belirir, renk ikinci yarıda dolar
			ln.setAttribute('opacity', hazir ? (0.45 + 0.55 * cl(g / 0.22)).toFixed(3) : '0');
			im.setAttribute('opacity', yuv(cl((g - 0.38) / 0.6)).toFixed(3));
		};
		return {
			guncelle(g) {
				gSon = g;
				ciz(g);
			},
			gorsel(url) {
				cizgiUrl(url).then(
					(u) => {
						ln.setAttribute('href', u);
						hazir = true;
						ciz(gSon);
					},
					() => {
						// kontur çıkarılamadı (eski tarayıcı): görsel düz açılır
						hazir = false;
					},
				);
			},
		};
	}
	return bos;
}
