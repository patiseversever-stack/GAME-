// Kahraman maket kurulum çekirdeği (shader'sız): HKit, ortam örtmesi, malzeme kimlikleri. Hem ana iş parçacığı
// (heroes.js) hem yapı işçisi (heroworker.js) kullanır: işçi paketine shader metinleri girmesin diye ayrı modül.
import * as THREE from 'three';
import { Kit } from '../gfx/kit.js';

/** Kahraman malzemeleri (köşe bilgisi x). Haritadaki M ile ilk 11'i aynı anlamda. */
export const H = {
	STONE: 0, WATER: 1, WIN: 2, GOLD: 3, LEAD: 4, FLAG: 5, FLAME: 6, LEAF: 7, GROUND: 8, TILE: 9, CLOTH: 10,
	ASHLAR: 11, BRICK: 12, RTILE: 13, ROCK: 14, PLASTER: 15, WOOD: 16, MARBLE: 17, PAVE: 18, GRASS: 19,
	TRAV: 20, MOSAIC: 21, CARVE: 22, BAND: 23, DIRT: 24, METAL: 25, GLAZE: 26,
};

// ------------------------------------------------------------------ shader


const S_LUT = (() => {
	const t = new Uint8Array(4097);
	for (let i = 0; i <= 4096; i++) {
		const c = i / 4096;
		t[i] = Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
	}
	return t;
})();
const toS8 = (c) => S_LUT[Math.max(0, Math.min(4096, Math.round(c * 4096)))];
const _mm = new THREE.Matrix4();
const _ta = new THREE.Matrix4();
const _nm = new THREE.Matrix3();
const _v3 = new THREE.Vector3();
const _s3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const PRIM = new Map(); // parça önbelleği (bütün kahramanlar ortak)

/** Büyüyen Float32 tampon (kurulum sırasında dizi push'u yerine). */
class FBuf {
	constructor(n = 1 << 15) {
		this.a = new Float32Array(n);
		this.n = 0;
	}
	need(k) {
		if (this.n + k <= this.a.length) return;
		let m = this.a.length * 2;
		while (m < this.n + k) m *= 2;
		const b = new Float32Array(m);
		b.set(this.a.subarray(0, this.n));
		this.a = b;
	}
}

/**
 * Kahraman kiti: Kit'in bütün parçaları + malzeme kimliği, desen koordinatı ve hareket grubu. Varsayılan yumuşak
 * normal (geometrinin kendi normali); flat() düz gölgeleme (yontulmuş taş, çokgen gövde). Köşeler doğrudan
 * Float32 tamponlara yazılır (geometri başına dönüşüm ve normal hesabı tek döngüde).
 *   k.mc(H.ASHLAR, '#d9c7a4')   malzeme + renk
 *   k.uvGeo(su, sv)             sonraki parçalar geometrinin açısal koordinatıyla (kubbe kaburgası, külah)
 *   k.uvBox()                   yüz düzleminde (vars.)
 *   k.uvS(s)                    desen ölçeği (büyük taş için < 1)
 */
export class HKit extends Kit {
	constructor() {
		super();
		this.P = new FBuf(1 << 17);
		this.N = new FBuf(1 << 17);
		this.Cl = new FBuf(1 << 17);
		this.U = new FBuf(1 << 16);
		this.I = new FBuf(1 << 17);
		this._smooth = true;
		this._uvm = 0;
		this._su = 1;
		this._sv = 1;
		this._us = 1;
		this.inv = 1; // 1 / yapı ölçeği (dünya → yerel)
		this._grp = 0;
	}
	get count() {
		return this.P.n / 3;
	}
	get uvs() {
		return this.U.a;
	}
	mc(id, hex, k = 1) {
		this.color(hex, k);
		this._mat = id;
		return this;
	}
	flat() {
		this._smooth = false;
		return this;
	}
	soft() {
		this._smooth = true;
		return this;
	}
	uvGeo(su = 1, sv = 1) {
		this._uvm = 1;
		this._su = su;
		this._sv = sv;
		return this;
	}
	uvBox() {
		this._uvm = 0;
		return this;
	}
	uvS(s = 1) {
		this._us = s;
		return this;
	}
	group(g) {
		this._grp = g;
		return this;
	}

	add(geo, local = null) {
		const M = local ? _mm.multiplyMatrices(this.m, local) : this.m;
		this._geo(geo, M);
		geo.dispose();
		return this;
	}

	/** Geometriyi (dizinli ya da değil) geçerli malzeme ve desen kipiyle yaz; kopya üretmeden. */
	_geo(g, M) {
		const pa = g.getAttribute('position');
		const na = this._smooth ? g.getAttribute('normal') : null;
		const ua = this._uvm === 1 ? g.getAttribute('uv') : null;
		const ca = g.getAttribute('color');
		this._write(pa.array, pa.itemSize, na ? na.array : null, ua ? ua.array : null, M, this._hs, null, g.index ? g.index.array : null, ca ? ca.array : null);
	}

	drape(geo, hf, lift = 0, tf = null) {
		const pa = geo.getAttribute('position');
		this._write(pa.array, pa.itemSize, null, null, this.m, 0, { hf, lift, y0: this.m.elements[13], tf }, geo.index ? geo.index.array : null);
		geo.dispose();
		return this;
	}

	// --- sık parçalar: geometri bir kez kurulur ve önbellekten yazılır (kurulumda bellek çöpü az)
	_prim(key, make, M) {
		let g = PRIM.get(key);
		if (!g) {
			if (PRIM.size > 900) PRIM.clear();
			g = make();
			PRIM.set(key, g);
		}
		this._geo(g, M);
		return this;
	}
	_atM(x, y, z, ry = 0, sy = 1) {
		_ta.compose(_v3.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s3.set(1, sy, 1));
		return _mm.multiplyMatrices(this.m, _ta);
	}
	box(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
		return this._prim(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), this._atM(x, y, z, ry));
	}
	cyl(rt, rb, h, seg = 8, x = 0, y = 0, z = 0, open = false) {
		const n = this._n(seg);
		return this._prim(`c${rt},${rb},${h},${n},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, n, 1, open).translate(0, h / 2, 0), this._atM(x, y, z));
	}
	cone(r, h, seg = 8, x = 0, y = 0, z = 0, ry = 0) {
		const n = this._n(seg);
		return this._prim(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n, 1, true).translate(0, h / 2, 0), this._atM(x, y, z, ry));
	}
	dome(r, seg = 10, x = 0, y = 0, z = 0, sy = 1) {
		const n = this._n(seg);
		return this._prim(`d${r},${n}`, () => new THREE.SphereGeometry(r, n, Math.max(2, Math.round(n / 2)), 0, Math.PI * 2, 0, Math.PI / 2), this._atM(x, y, z, 0, sy));
	}
	sphere(r, seg = 8, x = 0, y = 0, z = 0, sy = 1) {
		const n = this._n(seg);
		return this._prim(`s${r},${n}`, () => new THREE.SphereGeometry(r, n, Math.max(3, Math.round(n * 0.6))), this._atM(x, y, z, 0, sy));
	}
	/** Önbellekli serbest geometri (ağaç tacı, kaya): make() bir kez çağrılır. */
	cached(key, make, local) {
		return this._prim(key, make, _mm.multiplyMatrices(this.m, local));
	}

	/** csrc: köşe başına doğrusal renk (geometrinin `color` özniteliği; arazi parçası, kaya yüzü): k.color yerine. */
	_write(src, isz, nsrc, uvsrc, M, hs, dr, idx = null, csrc = null) {
		const cnt = idx ? idx.length : (src.length / isz) | 0;
		const tri = cnt - (cnt % 3);
		if (!tri) return;
		const e = M.elements;
		const P = this.P, N = this.N, Cl = this.Cl, U = this.U, I = this.I;
		P.need(tri * 3);
		N.need(tri * 3);
		Cl.need(tri * 3);
		U.need(tri * 2);
		I.need(tri * 4);
		const p0 = P.n;
		const pa = P.a;
		for (let i = 0; i < tri; i++) {
			const v = idx ? idx[i] : i;
			const x = src[v * isz], y = src[v * isz + 1], z = src[v * isz + 2];
			let wx = e[0] * x + e[4] * y + e[8] * z + e[12];
			let wy = e[1] * x + e[5] * y + e[9] * z + e[13];
			const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
			if (dr) wy = dr.hf(wx, wz) + (wy - dr.y0) + dr.lift;
			pa[p0 + i * 3] = wx;
			pa[p0 + i * 3 + 1] = wy;
			pa[p0 + i * 3 + 2] = wz;
		}
		// uzak sürüm (aynı tasarım, az yoğunluk): uzaktan piksel altı kalan küçük parça (pencere, korkuluk, insan) yazılmaz
		// (pencere, alem, bayrak, alev ve keep ile işaretli desen: küçük ama yapının kimliği, kalır)
		const keep = this.keep || this._mat === H.WIN || this._mat === H.GOLD || this._mat === H.FLAG || this._mat === H.FLAME;
		if (keep && this.minPart > 0) (this._keeps ||= []).push(p0 / 3, p0 / 3 + tri);
		if (this.minPart > 0 && !dr && !keep) {
			let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
			for (let i = 0; i < tri; i++) {
				const o = p0 + i * 3;
				const x = pa[o], y = pa[o + 1], z = pa[o + 2];
				if (x < x0) x0 = x;
				if (x > x1) x1 = x;
				if (y < y0) y0 = y;
				if (y > y1) y1 = y;
				if (z < z0) z0 = z;
				if (z > z1) z1 = z;
			}
			if (Math.max(x1 - x0, y1 - y0, z1 - z0) < this.minPart) return;
		}
		// normaller: yumuşakta geometrinin normali (normal matrisiyle), düzde yüz normali
		const na = N.a;
		const n0 = N.n;
		if (nsrc) {
			const m = _nm.getNormalMatrix(M).elements;
			for (let i = 0; i < tri; i++) {
				const v = idx ? idx[i] : i;
				const x = nsrc[v * 3], y = nsrc[v * 3 + 1], z = nsrc[v * 3 + 2];
				const nx = m[0] * x + m[3] * y + m[6] * z;
				const ny = m[1] * x + m[4] * y + m[7] * z;
				const nz = m[2] * x + m[5] * y + m[8] * z;
				const l = Math.hypot(nx, ny, nz) || 1;
				na[n0 + i * 3] = nx / l;
				na[n0 + i * 3 + 1] = ny / l;
				na[n0 + i * 3 + 2] = nz / l;
			}
		} else {
			for (let t = 0; t < tri; t += 3) {
				const a = p0 + t * 3;
				const ux = pa[a + 3] - pa[a], uy = pa[a + 4] - pa[a + 1], uz = pa[a + 5] - pa[a + 2];
				const vx = pa[a + 6] - pa[a], vy = pa[a + 7] - pa[a + 1], vz = pa[a + 8] - pa[a + 2];
				let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
				const l = Math.hypot(nx, ny, nz) || 1;
				nx /= l;
				ny /= l;
				nz /= l;
				for (let j = 0; j < 3; j++) {
					na[n0 + (t + j) * 3] = nx;
					na[n0 + (t + j) * 3 + 1] = ny;
					na[n0 + (t + j) * 3 + 2] = nz;
				}
			}
		}
		// renk (yüksekliğe göre geçiş), bilgi (malzeme, il, yükseklik, grup)
		const ca = Cl.a, ia = I.a;
		const c0 = Cl.n, i0 = I.n;
		const gr = this._grad;
		const col = this._col;
		for (let i = 0; i < tri; i++) {
			const y = pa[p0 + i * 3 + 1];
			const h = (y - this._base) * hs;
			if (csrc) {
				const v = (idx ? idx[i] : i) * 3;
				ca[c0 + i * 3] = csrc[v];
				ca[c0 + i * 3 + 1] = csrc[v + 1];
				ca[c0 + i * 3 + 2] = csrc[v + 2];
			} else if (gr) {
				let t = Math.min(1, Math.max(0, (h - gr[2]) / (gr[3] - gr[2])));
				t = t * t * (3 - 2 * t);
				ca[c0 + i * 3] = gr[0][0] + (gr[1][0] - gr[0][0]) * t;
				ca[c0 + i * 3 + 1] = gr[0][1] + (gr[1][1] - gr[0][1]) * t;
				ca[c0 + i * 3 + 2] = gr[0][2] + (gr[1][2] - gr[0][2]) * t;
			} else {
				ca[c0 + i * 3] = col[0];
				ca[c0 + i * 3 + 1] = col[1];
				ca[c0 + i * 3 + 2] = col[2];
			}
			ia[i0 + i * 4] = this._mat;
			ia[i0 + i * 4 + 1] = dr && dr.tf ? dr.tf(pa[p0 + i * 3], pa[p0 + i * 3 + 2]) : this._tag;
			ia[i0 + i * 4 + 2] = h;
			ia[i0 + i * 4 + 3] = this._grp;
		}
		// desen koordinatı (yerel birim)
		const ua = U.a;
		const u0 = U.n;
		if (uvsrc) {
			for (let i = 0; i < tri; i++) {
				const v = idx ? idx[i] : i;
				ua[u0 + i * 2] = uvsrc[v * 2] * this._su;
				ua[u0 + i * 2 + 1] = uvsrc[v * 2 + 1] * this._sv;
			}
		} else {
			const s = this.inv * this._us;
			for (let t = 0; t < tri; t += 3) {
				const a = p0 + t * 3;
				const ux = pa[a + 3] - pa[a], uy = pa[a + 4] - pa[a + 1], uz = pa[a + 5] - pa[a + 2];
				const vx = pa[a + 6] - pa[a], vy = pa[a + 7] - pa[a + 1], vz = pa[a + 8] - pa[a + 2];
				const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
				const l = Math.hypot(nx, ny, nz) || 1;
				if (Math.abs(ny / l) > 0.72) {
					for (let j = 0; j < 3; j++) {
						ua[u0 + (t + j) * 2] = pa[a + j * 3] * s;
						ua[u0 + (t + j) * 2 + 1] = pa[a + j * 3 + 2] * s;
					}
				} else {
					const hl = Math.hypot(nx, nz) || 1;
					const tx = -nz / hl;
					const tz = nx / hl;
					for (let j = 0; j < 3; j++) {
						ua[u0 + (t + j) * 2] = (pa[a + j * 3] * tx + pa[a + j * 3 + 2] * tz) * s;
						ua[u0 + (t + j) * 2 + 1] = pa[a + j * 3 + 1] * s;
					}
				}
			}
		}
		P.n += tri * 3;
		N.n += tri * 3;
		Cl.n += tri * 3;
		U.n += tri * 2;
		I.n += tri * 4;
	}

	/**
	 * Derlenmiş, sıkıştırılmış geometri. Ortam örtmesi: aoOn 'sync' ise hemen pişirilir; true ise iş
	 * g.userData.ao üreteci olarak döner (Heroes kare kare dilimler, bitince yumuşakça belirir).
	 */
	/**
	 * Uzak sürüm sadeleştirmesi (köşe kümeleme): c boyunda ızgara hücresine düşen köşeler hücrenin ortalamasında birleşir;
	 * iki köşesi aynı hücreye düşen (piksel altı) üçgen ve aynı üç hücreyi paylaşan kopya üçgen atılır. Renk, malzeme,
	 * normal üçgenin kendisinde kalır (aynı tasarım, aynı boya). Örtme pişirmeden önce.
	 */
	cluster(c) {
		const n = this.count;
		if (!(c > 0) || n < 3) return;
		const P = this.P.a, N = this.N.a, Cl = this.Cl.a, I = this.I.a, U = this.U.a;
		// kimlik parçaları (pencere, alem, bayrak, desen; _write'ta işaretlenir) üç kat ince ızgarada: biçimi kalır
		const fixed = new Uint8Array(n);
		const K = this._keeps || [];
		for (let i = 0; i < K.length; i += 2) fixed.fill(1, K[i], K[i + 1]);
		const cell = new Map();
		const cid = new Int32Array(n);
		let sx = new Float64Array(1024), sy = new Float64Array(1024), sz = new Float64Array(1024), sc = new Float64Array(1024);
		let m = 0;
		const inv = 1 / Math.max(c, 0.008);
		for (let i = 0; i < n; i++) {
			const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
			// malzeme ayrı kümelenir: havuz suyu travertene, kurşun kubbe taşa karışıp kaybolmaz
			const f = fixed[i] ? inv * 3 : inv;
			const key = (((Math.floor(x * f) + 8192) * 16384 + (Math.floor(y * f) + 8192)) * 16384 + (Math.floor(z * f) + 8192)) * 64 + (I[i * 4] & 31) + fixed[i] * 32;
			let k = cell.get(key);
			if (k === undefined) {
				k = m++;
				cell.set(key, k);
				if (m > sx.length) {
					const grow = (a) => {
						const b = new Float64Array(a.length * 2);
						b.set(a);
						return b;
					};
					sx = grow(sx);
					sy = grow(sy);
					sz = grow(sz);
					sc = grow(sc);
				}
			}
			cid[i] = k;
			sx[k] += x;
			sy[k] += y;
			sz[k] += z;
			sc[k]++;
		}
		const seen = new Set();
		let o = 0;
		for (let t = 0; t < n; t += 3) {
			const a = cid[t], b = cid[t + 1], d = cid[t + 2];
			if (a === b || b === d || a === d) continue;
			// kopya: aynı üç hücre (çift yüzlü malzemede arka yüz de aynı üçgen)
			const lo = Math.min(a, b, d), hi = Math.max(a, b, d), mid = a + b + d - lo - hi;
			const key = lo + ',' + mid + ',' + hi;
			if (seen.has(key)) continue;
			seen.add(key);
			for (let j = 0; j < 3; j++) {
				const v = t + j, w = o + j, k = cid[v];
				P[w * 3] = sx[k] / sc[k];
				// yere serili kimlik deseni (kilim) birleşen zeminin altında kalmasın: biraz kalkar
				P[w * 3 + 1] = sy[k] / sc[k] + (fixed[v] && N[v * 3 + 1] > 0.9 ? c * 0.12 : 0);
				P[w * 3 + 2] = sz[k] / sc[k];
				for (let q = 0; q < 3; q++) {
					N[w * 3 + q] = N[v * 3 + q];
					Cl[w * 3 + q] = Cl[v * 3 + q];
				}
				for (let q = 0; q < 4; q++) I[w * 4 + q] = I[v * 4 + q];
				U[w * 2] = U[v * 2];
				U[w * 2 + 1] = U[v * 2 + 1];
			}
			o += 3;
		}
		this.P.n = o * 3;
		this.N.n = o * 3;
		this.Cl.n = o * 3;
		this.I.n = o * 4;
		this.U.n = o * 2;
	}

	buildHero(aoOn = true) {
		const n = this.count;
		const pos = this.P.a.slice(0, n * 3);
		const nor = new Int8Array(n * 4);
		const col = new Uint8Array(n * 4);
		const info = new Uint8Array(n * 4);
		const pat = this.U.a.slice(0, n * 2);
		const na = this.N.a, ca = this.Cl.a, ia = this.I.a;
		// sRGB tablosu (doğrusal → 8 bit)
		for (let i = 0; i < n; i++) {
			nor[i * 4] = Math.round(na[i * 3] * 127);
			nor[i * 4 + 1] = Math.round(na[i * 3 + 1] * 127);
			nor[i * 4 + 2] = Math.round(na[i * 3 + 2] * 127);
			col[i * 4] = toS8(ca[i * 3]);
			col[i * 4 + 1] = toS8(ca[i * 3 + 1]);
			col[i * 4 + 2] = toS8(ca[i * 3 + 2]);
			col[i * 4 + 3] = ia[i * 4 + 3];
			info[i * 4] = ia[i * 4];
			info[i * 4 + 1] = ia[i * 4 + 1];
			info[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(ia[i * 4 + 2] * 100)));
			info[i * 4 + 3] = 255;
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.BufferAttribute(nor, 4, true));
		g.setAttribute('col', new THREE.BufferAttribute(col, 4, true));
		g.setAttribute('info', new THREE.BufferAttribute(info, 4));
		g.setAttribute('pat', new THREE.BufferAttribute(pat, 2));
		g.computeBoundingSphere();
		if (aoOn) {
			const job = bakeAO(pos, nor, info, n);
			if (aoOn === 'sync') while (!job.next().done);
			else g.userData.ao = job;
		}
		return g;
	}
}

// ------------------------------------------------------------------ ortam örtmesi (CPU, bir kez)

// yarım küre yönleri (+z çevresinde, kosinüs ağırlıklı): 12 ışın
const DIRS = (() => {
	const d = [];
	const n = 10;
	for (let i = 0; i < n; i++) {
		const u = (i + 0.5) / n;
		const r = Math.sqrt(u);
		const a = i * 2.39996;
		d.push([Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(1 - u)]);
	}
	return d;
})();

/**
 * Hacim ızgarası ortam örtmesi: model ~96 hücrelik ızgaraya örneklenir (yüzey hücreleri dolu), her köşeden normal
 * yarı küresinde 12 ışın birkaç hücre yürür; yakın engel çok, uzak az karartır. Aynı konum ve normaldeki köşeler
 * bir kez hesaplanır.
 */
export function* bakeAO(pos, nor, info, n) {
	let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
	for (let i = 0; i < n; i++) {
		const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
		if (x < x0) x0 = x;
		if (y < y0) y0 = y;
		if (z < z0) z0 = z;
		if (x > x1) x1 = x;
		if (y > y1) y1 = y;
		if (z > z1) z1 = z;
	}
	const ext = Math.max(x1 - x0, z1 - z0, (y1 - y0) * 0.6);
	const vs = ext / 100;
	const nx = Math.ceil((x1 - x0) / vs) + 3;
	const ny = Math.ceil((y1 - y0) / vs) + 3;
	const nz = Math.ceil((z1 - z0) / vs) + 3;
	if (nx * ny * nz > 4e6) return;
	const grid = new Uint8Array(nx * ny * nz);
	const ox = x0 - vs, oy = y0 - vs, oz = z0 - vs;
	const iv = 1 / vs;
	const mark = (x, y, z) => {
		const i = ((x - ox) * iv) | 0;
		const j = ((y - oy) * iv) | 0;
		const k = ((z - oz) * iv) | 0;
		grid[(j * nz + k) * nx + i] = 1;
	};
	// yüzeyleri örnekle (su, alev, bayrak, balon kumaşı engel değil)
	for (let t = 0; t + 2 < n; t += 3) {
		if (t % 6000 === 0) yield;
		const id = info[t * 4];
		if (id === H.WATER || id === H.FLAME || id === H.FLAG || id === H.CLOTH) continue;
		const a = t * 3;
		const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
		const ux = pos[a + 3] - ax, uy = pos[a + 4] - ay, uz = pos[a + 5] - az;
		const wx = pos[a + 6] - ax, wy = pos[a + 7] - ay, wz = pos[a + 8] - az;
		const L = Math.max(Math.hypot(ux, uy, uz), Math.hypot(wx, wy, wz), Math.hypot(wx - ux, wy - uy, wz - uz));
		const m = Math.min(400, Math.max(1, Math.ceil(L * iv * 1.6)));
		for (let i = 0; i <= m; i++)
			for (let j = 0; i + j <= m; j++) {
				const s = i / m;
				const r = j / m;
				mark(ax + ux * s + wx * r, ay + uy * s + wy * r, az + uz * s + wz * r);
			}
	}
	const STEPS = 8;
	const cache = new Map();
	for (let i = 0; i < n; i++) {
		if (i % 3000 === 0) yield;
		const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
		const qx = nor[i * 4] / 127, qy = nor[i * 4 + 1] / 127, qz = nor[i * 4 + 2] / 127;
		const key = ((Math.round((px - ox) * iv * 2) * 512 + Math.round((py - oy) * iv * 2)) * 512 + Math.round((pz - oz) * iv * 2)) * 16777216 + (nor[i * 4] + 128) * 65536 + (nor[i * 4 + 1] + 128) * 256 + (nor[i * 4 + 2] + 128);
		let ao = cache.get(key);
		if (ao == null) {
			// normal çevresinde dik taban
			let tx, ty, tz;
			if (Math.abs(qy) < 0.9) {
				tx = qz;
				ty = 0;
				tz = -qx;
			} else {
				tx = 0;
				ty = -qz;
				tz = qy;
			}
			let l = Math.hypot(tx, ty, tz) || 1;
			tx /= l;
			ty /= l;
			tz /= l;
			const bx = qy * tz - qz * ty;
			const by = qz * tx - qx * tz;
			const bz = qx * ty - qy * tx;
			const sx = px + qx * vs * 1.6;
			const sy = py + qy * vs * 1.6;
			const sz = pz + qz * vs * 1.6;
			let occ = 0;
			for (const [dx0, dy0, dz0] of DIRS) {
				const dx = tx * dx0 + bx * dy0 + qx * dz0;
				const dy = ty * dx0 + by * dy0 + qy * dz0;
				const dz = tz * dx0 + bz * dy0 + qz * dz0;
				for (let s = 0; s < STEPS; s++) {
					const d = vs * (0.6 + s * 1.05);
					const ii = ((sx + dx * d - ox) * iv) | 0;
					const jj = ((sy + dy * d - oy) * iv) | 0;
					const kk = ((sz + dz * d - oz) * iv) | 0;
					if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) {
						// ızgara dışı: aşağısı toprak (yarım engel), yukarısı açık gök
						if (jj < 0) occ += 0.5 * (1 - s / STEPS);
						break;
					}
					if (grid[(jj * nz + kk) * nx + ii]) {
						occ += 1 - (s / STEPS) * 0.7;
						break;
					}
				}
			}
			ao = Math.max(0, 1 - (occ / DIRS.length) * 1.15);
			ao = 0.18 + 0.82 * ao;
			cache.set(key, ao);
		}
		info[i * 4 + 3] = Math.round(ao * 255);
	}
}


