// Arazi: yükselti ızgarası (relief.json) + ince ayrıntı gürültüsü → her il için kabartmalı yüzey ağı.
//
// Her il kendi ağına sahiptir (köşe başına il kimliği): il yükselince yalnızca o il kalkar ve kenarında
// toprak katmanlı "pasta dilimi" duvarı görünür. Komşu illerin ortak sınırı aynı noktalardan geçtiği için
// yüzeyde boşluk kalmaz. Yükseklik, normal ve doğa bilgisi (orman, yeşillik, dağlık) köşelere pişirilir;
// oyun sırasında hiçbir şey yeniden hesaplanmaz.
//
// Ağ, düzenli bir ızgaranın il çokgenine kırpılmasıyla kurulur (iç hücreler iki üçgen, kenar hücreleri
// kırpılıp üçgenlenir). Böylece üçgenler düzgün boyutlu kalır, kabartma her yerde aynı inceliktedir.

import * as THREE from 'three';
import RELIEF from '../data/relief.json';

export const BASE = 0.05; // deniz kıyısında kara yüksekliği (deniz y = 0)
export const VS = 0.00054; // metre → birim (minyatür için abartılmış)
export const BOTTOM = -0.7; // il duvarlarının alt kenarı (denizin altında)
export const LIFT = 1.2; // fx(lift = 1) ile ilin kalkacağı yükseklik

// ------------------------------------------------------------------ gürültü (oyun sırasında da aynı sonuç)

function hash2(x, y) {
	let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);
	const a = hash2(ix, iy);
	const b = hash2(ix + 1, iy);
	const c = hash2(ix, iy + 1);
	const d = hash2(ix + 1, iy + 1);
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const ridge = (x, y) => {
	const n = 1 - Math.abs(vnoise(x, y) * 2 - 1);
	return n * n;
};

// ------------------------------------------------------------------ kabartma

export class Relief {
	constructor() {
		const m = RELIEF.meta;
		this.m = m;
		const bin = atob(RELIEF.data);
		const n = m.w * m.h;
		this.E = new Float32Array(n);
		this.F = new Float32Array(n);
		this.Gr = new Float32Array(n);
		this.Ro = new Float32Array(n);
		this.La = new Float32Array(n);
		for (let k = 0; k < n; k++) {
			const v = bin.charCodeAt(k * 5) / 255;
			this.E[k] = v * v * m.emax;
			this.F[k] = bin.charCodeAt(k * 5 + 1) / 255;
			this.Gr[k] = bin.charCodeAt(k * 5 + 2) / 255;
			this.Ro[k] = bin.charCodeAt(k * 5 + 3) / 255;
			this.La[k] = bin.charCodeAt(k * 5 + 4) / 255;
		}
		this._b = { i: 0, j: 0, fx: 0, fy: 0 };
	}

	_cell(x, y) {
		const m = this.m;
		let gx = (x - m.x0) / m.step;
		let gy = (y - m.y0) / m.step;
		gx = Math.max(0, Math.min(m.w - 1.001, gx));
		gy = Math.max(0, Math.min(m.h - 1.001, gy));
		const b = this._b;
		b.i = Math.floor(gx);
		b.j = Math.floor(gy);
		b.fx = gx - b.i;
		b.fy = gy - b.j;
		return b;
	}

	/** Izgara kanalının çift doğrusal örneği (x doğu, y kuzey). */
	bil(A, x, y) {
		const b = this._cell(x, y);
		const w = this.m.w;
		const k = b.j * w + b.i;
		const a = A[k] + (A[k + 1] - A[k]) * b.fx;
		const c = A[k + w] + (A[k + w + 1] - A[k + w]) * b.fx;
		return a + (c - a) * b.fy;
	}

	elev(x, y) {
		return this.bil(this.E, x, y);
	}

	/** Kara yüzeyinin yüksekliği (birim). x doğu, y kuzey (dünyada z = -y). */
	height(x, y) {
		const e = this.bil(this.E, x, y);
		const ro = this.bil(this.Ro, x, y);
		const la = this.bil(this.La, x, y);
		const dry = 1 - Math.min(1, la * 2);
		// dağlıkta sivri sırtlar, her yerde hafif dalga
		const d = ro * (ridge(x * 0.85 + 3.1, y * 0.85) * 0.2 + ridge(x * 2.3, y * 2.3 - 7) * 0.07) + (vnoise(x * 2.7, y * 2.7) - 0.5) * 0.03;
		return BASE + e * VS + d * dry;
	}
}

// ------------------------------------------------------------------ çokgen kırpma

/** Sutherland–Hodgman tek yarı düzlem: axis 0 → x, 1 → y; greater true ise ≥ v tutulur. */
function clipHalf(poly, axis, v, greater) {
	const out = [];
	const n = poly.length >> 1;
	if (n < 3) return out;
	let px = poly[(n - 1) * 2];
	let py = poly[(n - 1) * 2 + 1];
	let pv = axis ? py : px;
	let pin = greater ? pv >= v : pv <= v;
	for (let i = 0; i < n; i++) {
		const cx = poly[i * 2];
		const cy = poly[i * 2 + 1];
		const cv = axis ? cy : cx;
		const cin = greater ? cv >= v : cv <= v;
		if (cin !== pin) {
			const t = (v - pv) / (cv - pv);
			if (axis) out.push(px + (cx - px) * t, v);
			else out.push(v, py + (cy - py) * t);
		}
		if (cin) out.push(cx, cy);
		px = cx;
		py = cy;
		pv = cv;
		pin = cin;
	}
	return out;
}

function bboxOf(f) {
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (let i = 0; i < f.length; i += 2) {
		if (f[i] < x0) x0 = f[i];
		if (f[i] > x1) x1 = f[i];
		if (f[i + 1] < y0) y0 = f[i + 1];
		if (f[i + 1] > y1) y1 = f[i + 1];
	}
	return [x0, y0, x1, y1];
}

/** Çokgeni ızgara sütunlarına/satırlarına ikiye bölerek dağıtır (n log n). */
function splitGrid(poly, axis, c0, c1, s, out) {
	if (poly.length < 6) return;
	if (c1 - c0 <= 1) {
		out.push([c0, poly]);
		return;
	}
	const mid = (c0 + c1) >> 1;
	splitGrid(clipHalf(poly, axis, mid * s, false), axis, c0, mid, s, out);
	splitGrid(clipHalf(poly, axis, mid * s, true), axis, mid, c1, s, out);
}

function cleanPoly(p) {
	// art arda yinelenen köşeleri at
	const out = [];
	const n = p.length >> 1;
	for (let i = 0; i < n; i++) {
		const x = p[i * 2];
		const y = p[i * 2 + 1];
		const l = out.length;
		if (l && Math.abs(out[l - 2] - x) < 1e-7 && Math.abs(out[l - 1] - y) < 1e-7) continue;
		out.push(x, y);
	}
	const l = out.length;
	if (l >= 4 && Math.abs(out[0] - out[l - 2]) < 1e-7 && Math.abs(out[1] - out[l - 1]) < 1e-7) out.length = l - 2;
	return out;
}

function polyArea(p) {
	let a = 0;
	const n = p.length >> 1;
	for (let i = 0, j = n - 1; i < n; j = i++) a += (p[j * 2] + p[i * 2]) * (p[j * 2 + 1] - p[i * 2 + 1]);
	return -a / 2;
}

// ------------------------------------------------------------------ il ağları

/**
 * Bütün illerin yüzey + duvar ağını tek geometride kurar.
 * Öznitelikler: position, normal, pid (il), bio (orman, yeşillik, dağlık, yan: 0 üst / 0.5 duvar üstü / 1 duvar altı), surf (yüzey yüksekliği).
 */
export function buildBoardGeometry(provinces, relief, s, { skirts = true } = {}) {
	const P = [];
	const Nn = [];
	const PID = [];
	const BIO = [];
	const SURF = [];
	const IDX = [];
	const v2 = [];
	const eps = 0.1;
	let vcount = 0;

	const normalAt = (x, y, out) => {
		const hx = relief.height(x + eps, y) - relief.height(x - eps, y);
		const hy = relief.height(x, y + eps) - relief.height(x, y - eps);
		// dünya: x doğu, z = -y → dh/dz = -dh/dy
		const nx = -hx / (2 * eps);
		const nz = hy / (2 * eps);
		const l = Math.hypot(nx, 1, nz);
		out[0] = nx / l;
		out[1] = 1 / l;
		out[2] = nz / l;
		return out;
	};
	const nrm = [0, 0, 0];

	const stats = [];
	for (const p of provinces) {
		const start = IDX.length;
		const map = new Map();
		const vert = (x, y) => {
			const key = Math.round(x * 2e4) * 4e6 + Math.round(y * 2e4);
			let i = map.get(key);
			if (i != null) return i;
			i = vcount++;
			map.set(key, i);
			const h = relief.height(x, y);
			P.push(x, h, -y);
			normalAt(x, y, nrm);
			Nn.push(nrm[0], nrm[1], nrm[2]);
			PID.push(p.index);
			BIO.push(
				Math.round(relief.bil(relief.F, x, y) * 255),
				Math.round(relief.bil(relief.Gr, x, y) * 255),
				Math.round(relief.bil(relief.Ro, x, y) * 255),
				0,
			);
			SURF.push(h);
			return i;
		};
		const tri = (a, b, c) => {
			// dünyada yukarı bakan yön: (x, -y) düzleminde saat yönü
			const ax = P[a * 3];
			const az = P[a * 3 + 2];
			const cr = (P[b * 3] - ax) * (P[c * 3 + 2] - az) - (P[b * 3 + 2] - az) * (P[c * 3] - ax);
			if (Math.abs(cr) < 1e-10) return;
			if (cr < 0) IDX.push(a, b, c);
			else IDX.push(a, c, b);
		};
		for (const ring of p.rings) {
			const [x0, y0, x1, y1] = bboxOf(ring);
			const c0 = Math.floor(x0 / s);
			const c1 = Math.floor(x1 / s) + 1;
			const strips = [];
			splitGrid(ring, 0, c0, c1, s, strips);
			for (const [, strip] of strips) {
				const [, sy0, , sy1] = bboxOf(strip);
				const r0 = Math.floor(sy0 / s);
				const r1 = Math.floor(sy1 / s) + 1;
				const cells = [];
				splitGrid(strip, 1, r0, r1, s, cells);
				for (const [, cellRaw] of cells) {
					const cell = cleanPoly(cellRaw);
					const n = cell.length >> 1;
					if (n < 3) continue;
					const A = polyArea(cell);
					if (Math.abs(A) < 1e-9) continue;
					if (n === 4 && Math.abs(Math.abs(A) - s * s) < 1e-6) {
						const a = vert(cell[0], cell[1]);
						const b = vert(cell[2], cell[3]);
						const c = vert(cell[4], cell[5]);
						const d = vert(cell[6], cell[7]);
						tri(a, b, c);
						tri(a, c, d);
						continue;
					}
					if (n === 3) {
						tri(vert(cell[0], cell[1]), vert(cell[2], cell[3]), vert(cell[4], cell[5]));
						continue;
					}
					v2.length = 0;
					for (let i = 0; i < n; i++) v2.push(new THREE.Vector2(cell[i * 2], cell[i * 2 + 1]));
					if (A < 0) v2.reverse();
					const faces = THREE.ShapeUtils.triangulateShape(v2, []);
					const ids = v2.map((v) => vert(v.x, v.y));
					for (const f of faces) tri(ids[f[0]], ids[f[1]], ids[f[2]]);
				}
			}
			if (!skirts) continue;
			// duvar: halka boyunca yüzeyden denizin altına
			const n = ring.length >> 1;
			const top = [];
			const bot = [];
			for (let i = 0; i < n; i++) {
				const x = ring[i * 2];
				const y = ring[i * 2 + 1];
				const xp = ring[((i + n - 1) % n) * 2];
				const yp = ring[((i + n - 1) % n) * 2 + 1];
				const xn = ring[((i + 1) % n) * 2];
				const yn = ring[((i + 1) % n) * 2 + 1];
				// dış normal (saat yönünün tersi halkada sağ taraf), komşu kenarların ortalaması
				let ox = yn - yp;
				let oy = -(xn - xp);
				const ol = Math.hypot(ox, oy) || 1;
				ox /= ol;
				oy /= ol;
				const h = relief.height(x, y);
				const fo = Math.round(relief.bil(relief.F, x, y) * 255);
				const gr = Math.round(relief.bil(relief.Gr, x, y) * 255);
				const ro = Math.round(relief.bil(relief.Ro, x, y) * 255);
				for (let k = 0; k < 2; k++) {
					P.push(x, k ? BOTTOM : h, -y);
					Nn.push(ox, 0, -oy);
					PID.push(p.index);
					BIO.push(fo, gr, ro, k ? 255 : 128);
					SURF.push(h);
					(k ? bot : top).push(vcount++);
				}
			}
			for (let i = 0; i < n; i++) {
				const j = (i + 1) % n;
				// dışa bakan yüz
				IDX.push(top[i], bot[i], bot[j], top[i], bot[j], top[j]);
			}
		}
		stats.push({ start, count: IDX.length - start });
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
	g.setAttribute('pid', new THREE.Float32BufferAttribute(PID, 1));
	g.setAttribute('bio', new THREE.Uint8BufferAttribute(BIO, 4, true));
	g.setAttribute('surf', new THREE.Float32BufferAttribute(SURF, 1));
	g.setIndex(vcount > 65535 ? new THREE.Uint32BufferAttribute(IDX, 1) : new THREE.Uint16BufferAttribute(IDX, 1));
	g.computeBoundingSphere();
	return { geometry: g, stats, vertices: vcount, triangles: IDX.length / 3 };
}
