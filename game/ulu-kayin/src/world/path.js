// Gövdeye sarılan sarmal patika: eğri örnekleme, el yapımı tahta yürüyüş yolu, alçak korkuluk,
// halat, kısa kemer destekler, fenerler, çaputlar ve mevsimlik kenar süsleri. Hepsi üç çizim çağrısı.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { clamp, smoothstep, lerp, rng, TAU } from '../core/math.js';
import { trunkSurfaceR } from './tree.js';
import { pathY, pathR, trunkRadius, THETA_END, PATH_W, PATH_T } from './layout.js';

const DS = 0.2; // örnek aralığı (birim)

/** Patika eğrisi: yay uzunluğuna göre eşit aralıklı örnekler. */
export class PathCurve {
	constructor() {
		// 1) açıya göre ince örnekler
		const fine = [];
		let len = 0;
		let px = 0;
		let py = 0;
		let pz = 0;
		const dth = 0.002;
		for (let th = 0; th <= THETA_END + 1e-6; th += dth) {
			const r = pathR(th);
			const x = Math.cos(th) * r;
			const z = Math.sin(th) * r;
			const y = pathY(th);
			if (fine.length) len += Math.hypot(x - px, y - py, z - pz);
			fine.push(th, len);
			px = x;
			py = y;
			pz = z;
		}
		this.length = len;
		// 2) yay uzunluğuna göre eşit aralıklarla yeniden örnekle
		const n = Math.floor(len / DS) + 1;
		this.n = n;
		this.TH = new Float32Array(n);
		this.X = new Float32Array(n);
		this.Y = new Float32Array(n);
		this.Z = new Float32Array(n);
		this.R = new Float32Array(n);
		let j = 0;
		for (let i = 0; i < n; i++) {
			const s = i * DS;
			while (j < fine.length / 2 - 2 && fine[(j + 1) * 2 + 1] < s) j++;
			const s0 = fine[j * 2 + 1];
			const s1 = fine[(j + 1) * 2 + 1];
			const t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
			const th = fine[j * 2] + (fine[(j + 1) * 2] - fine[j * 2]) * clamp(t, 0, 1);
			const r = pathR(th);
			this.TH[i] = th;
			this.R[i] = r;
			this.X[i] = Math.cos(th) * r;
			this.Z[i] = Math.sin(th) * r;
			this.Y[i] = pathY(th);
		}
		// 3) teğet ve yan vektör (yatay, gövdeden dışarı doğru)
		this.TX = new Float32Array(n);
		this.TY = new Float32Array(n);
		this.TZ = new Float32Array(n);
		this.SX = new Float32Array(n);
		this.SZ = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const a = Math.max(0, i - 1);
			const b = Math.min(n - 1, i + 1);
			let tx = this.X[b] - this.X[a];
			let ty = this.Y[b] - this.Y[a];
			let tz = this.Z[b] - this.Z[a];
			const l = Math.hypot(tx, ty, tz) || 1;
			tx /= l;
			ty /= l;
			tz /= l;
			this.TX[i] = tx;
			this.TY[i] = ty;
			this.TZ[i] = tz;
			// yan = teğet × yukarı (yatay); gövde ekseninden dışarı bakacak şekilde işaret seç
			let sx = -tz;
			let sz = tx;
			const sl = Math.hypot(sx, sz) || 1;
			sx /= sl;
			sz /= sl;
			if (sx * this.X[i] + sz * this.Z[i] < 0) {
				sx = -sx;
				sz = -sz;
			}
			this.SX[i] = sx;
			this.SZ[i] = sz;
		}
	}

	/** s konumundaki örnek (doğrusal ara değer). out alanları: x y z tx ty tz sx sz th r */
	sample(s, out) {
		const f = clamp(s / DS, 0, this.n - 1.0001);
		const i = Math.floor(f);
		const t = f - i;
		const L = (A) => A[i] + (A[i + 1] - A[i]) * t;
		out.x = L(this.X);
		out.y = L(this.Y);
		out.z = L(this.Z);
		out.tx = L(this.TX);
		out.ty = L(this.TY);
		out.tz = L(this.TZ);
		out.sx = L(this.SX);
		out.sz = L(this.SZ);
		out.th = L(this.TH);
		out.r = L(this.R);
		return out;
	}

	/** Verilen patika açısına karşılık gelen yay uzunluğu. */
	sAtTheta(th) {
		let lo = 0;
		let hi = this.n - 1;
		while (hi - lo > 1) {
			const m = (lo + hi) >> 1;
			if (this.TH[m] < th) lo = m;
			else hi = m;
		}
		const t = (th - this.TH[lo]) / Math.max(1e-6, this.TH[hi] - this.TH[lo]);
		return (lo + clamp(t, 0, 1)) * DS;
	}

	/** Patika ekseninin gövde yüzeyinden uzaklığı (köprülerde büyür). */
	offTrunk(i) {
		return this.R[i] - trunkRadius(this.Y[i]);
	}
}

/**
 * Yürüyüş yolu geometrisi: tek tek el yapımı tahtalar (her biri kendi deseni, hafif eğik,
 * uçları kademeli), altlarında koyu bir taşıyıcı döşeme (aralıklardan görünür, gölgeyi
 * kesintisiz yapar). Gövdeye yaslanan kısımlarda tahtaların iç ucu kabuğun içine girer
 * (oluklarda bile aralık görünmesin); köprülerde iki uç serbest.
 */
export function buildWalkway(curve) {
	const R = rng(5150);
	const top = new Builder();
	const n = curve.n;
	const outerH = PATH_W / 2;
	const TH = 0.1; // tahta kalınlığı
	const tmp = {};
	const tmp2 = {};
	const hugAt = (off) => 1 - smoothstep(1.3, 2.2, off);
	/** s konumunda gövde tarafındaki iç uç uzaklığı (eksenden). */
	const innerAt = (smp) => {
		const off = smp.r - trunkRadius(smp.y);
		const hug = hugAt(off);
		const rs = trunkSurfaceR(smp.th, smp.y);
		const toBark = smp.r - rs + 0.16; // kabuğa 16 cm gömül
		return lerp(0.95, clamp(toBark, 0.62, 1.4), hug);
	};

	// ---- tahtalar ----
	const PITCH_P = 0.37;
	const GAP = 0.045;
	const P = [];
	for (let s = 0.12; s < curve.length - 0.3; s += PITCH_P) {
		const sa = s + GAP / 2;
		const sb = s + PITCH_P - GAP / 2;
		curve.sample(sa, tmp);
		curve.sample(sb, tmp2);
		const off = tmp.r - trunkRadius(tmp.y);
		const hug = hugAt(off);
		const inA = innerAt(tmp);
		const inB = innerAt(tmp2);
		const out = outerH + R.range(-0.03, 0.07);
		const dz = R.range(-0.008, 0.01);
		const tilt = R.range(-0.012, 0.012);
		const board = (R() * 4) | 0;
		const flip = R() < 0.5;
		const tint = R.range(0.92, 1.05);
		const grey = R() < 0.12 ? R.range(0.8, 0.9) : 1;
		// sıcak bal tonu (gölgede griye kaçmasın); arada bir eskimiş gümüşi tahta
		const cr = tint * grey * 1.02;
		const cg = tint * (grey < 1 ? grey * 0.99 : 0.96);
		const cb = tint * (grey < 1 ? grey * 1.02 : 0.88);
		// köşeler: a (s başı) / b (s sonu), i (iç) / o (dış)
		const corner = (smp, w, hgt) => [smp.x + smp.sx * w, smp.y + hgt, smp.z + smp.sz * w];
		const ai = corner(tmp, -inA, dz - tilt);
		const ao = corner(tmp, out, dz + tilt);
		const bi = corner(tmp2, -inB, dz - tilt);
		const bo = corner(tmp2, out, dz + tilt);
		const v0 = 1 - (board + 0.88) / 4;
		const v1 = 1 - (board + 0.12) / 4;
		const u0 = flip ? 1 : 0;
		const u1 = flip ? 0 : 1;
		const aoIn = lerp(1, 0.55, hug);
		// üst yüz
		{
			const nx = -tmp.sx * tilt * 3;
			const nz = -tmp.sz * tilt * 3;
			const q0 = top.vert(ai[0], ai[1], ai[2], nx, 1, nz, cr, cg, cb, aoIn, u0, v0);
			const q1 = top.vert(ao[0], ao[1], ao[2], nx, 1, nz, cr, cg, cb, 1, u1, v0);
			const q2 = top.vert(bo[0], bo[1], bo[2], nx, 1, nz, cr, cg, cb, 1, u1, v1);
			const q3 = top.vert(bi[0], bi[1], bi[2], nx, 1, nz, cr, cg, cb, aoIn, u0, v1);
			top.quad(q0, q1, q2, q3);
		}
		// ön ve arka yan yüzler (aralıklardan ve kenardan görünür)
		const side = (p0, p1, nx, ny, nz, vv) => {
			const k = 0.72;
			const q0 = top.vert(p0[0], p0[1], p0[2], nx, ny, nz, cr * k, cg * k, cb * k, 0.85, u0, vv);
			const q1 = top.vert(p1[0], p1[1], p1[2], nx, ny, nz, cr * k, cg * k, cb * k, 0.85, u1, vv);
			const q2 = top.vert(p1[0], p1[1] - TH, p1[2], nx, ny, nz, cr * k * 0.8, cg * k * 0.8, cb * k * 0.8, 0.6, u1, vv);
			const q3 = top.vert(p0[0], p0[1] - TH, p0[2], nx, ny, nz, cr * k * 0.8, cg * k * 0.8, cb * k * 0.8, 0.6, u0, vv);
			top.quad(q0, q1, q2, q3);
		};
		side(ai, ao, -tmp.tx, -tmp.ty, -tmp.tz, v0);
		side(bi, bo, tmp2.tx, tmp2.ty, tmp2.tz, v1);
		// dış uç
		side(ao, bo, tmp.sx, 0, tmp.sz, (v0 + v1) / 2);
		// iç uç: yalnızca köprülerde (gövdeye yaslananlarda kabuğun içinde kalır)
		if (hug < 0.5) side(ai, bi, -tmp.sx, 0, -tmp.sz, (v0 + v1) / 2);
		P.push({ s: s + PITCH_P / 2, hug, out, inA });
	}

	// ---- taşıyıcı döşeme: tahtaların altında, koyu ve kesintisiz ----
	const DSU = 0.4;
	const deck0 = top.count;
	const RING = 8;
	let nDeck = 0;
	const dark = [0.42, 0.3, 0.22];
	for (let s = 0; s <= curve.length + 1e-6; s += DSU) {
		curve.sample(Math.min(s, curve.length - 0.001), tmp);
		const inA = innerAt(tmp) - 0.04;
		const oW = outerH - 0.1;
		const yT = tmp.y - TH;
		const yB = tmp.y - PATH_T;
		const x = tmp.x;
		const z = tmp.z;
		const sx = tmp.sx;
		const sz = tmp.sz;
		const hug = hugAt(tmp.r - trunkRadius(tmp.y));
		const uu = s / 2.2;
		const [r, g, b] = dark;
		// üst (aralıklardan görünür)
		top.vert(x - sx * inA, yT, z - sz * inA, 0, 1, 0, r * 0.7, g * 0.7, b * 0.7, 0.45, 0.5, uu);
		top.vert(x + sx * oW, yT, z + sz * oW, 0, 1, 0, r * 0.7, g * 0.7, b * 0.7, 0.55, 0.5, uu);
		// dış yan (kenar kirişi)
		top.vert(x + sx * oW, yT, z + sz * oW, sx, 0, sz, r * 1.25, g * 1.25, b * 1.25, 0.8, 0.1, uu);
		top.vert(x + sx * oW, yB, z + sz * oW, sx, 0, sz, r * 1.05, g * 1.05, b * 1.05, 0.6, 0.9, uu);
		// alt
		top.vert(x + sx * oW, yB, z + sz * oW, 0, -1, 0, r, g, b, 0.6, 0.2, uu);
		top.vert(x - sx * inA, yB, z - sz * inA, 0, -1, 0, r, g, b, lerp(0.55, 0.35, hug), 0.8, uu);
		// iç yan (köprülerde görünür)
		top.vert(x - sx * inA, yB, z - sz * inA, -sx, 0, -sz, r * 1.2, g * 1.2, b * 1.2, 0.6, 0.9, uu);
		top.vert(x - sx * inA, yT, z - sz * inA, -sx, 0, -sz, r * 1.2, g * 1.2, b * 1.2, 0.8, 0.1, uu);
		nDeck++;
	}
	for (let i = 0; i < nDeck - 1; i++) {
		const a = deck0 + i * RING;
		const b = a + RING;
		const q = (p0, p1) => top.quad(a + p0, b + p0, b + p1, a + p1);
		q(0, 1);
		q(2, 3);
		q(4, 5);
		q(6, 7);
	}
	top.fixWinding();

	// ---- korkuluk, kemer destekler, fenerler, çaputlar ve kenar süsleri ----
	const rail = new Builder();
	const lanterns = [];
	const posts = [];
	const wood = (k) => () => [0.62 * k, 0.43 * k, 0.28 * k, 1];
	const V = (x, y, z) => new THREE.Vector3(x, y, z);
	const at = (s, w, h) => {
		curve.sample(s, tmp);
		return V(tmp.x + tmp.sx * w, tmp.y + h, tmp.z + tmp.sz * w);
	};

	// dikmeler: alçak (Zifir'in önünü kesmesin), tepede yuvarlak topuz
	for (let s = 0.5; s < curve.length - 0.4; s += 2.25) {
		curve.sample(s, tmp);
		const off = tmp.r - trunkRadius(tmp.y);
		const bridge = off > 2.0;
		const sides = bridge ? [1, -1] : [1];
		for (const side of sides) {
			const w = side > 0 ? outerH - 0.08 : innerAt(tmp) - 0.08;
			const h = bridge ? 0.62 : 0.5;
			const p0 = at(s, w * side, -PATH_T + 0.04);
			const p1 = at(s, w * side, h);
			const k = R.range(0.9, 1.05);
			rail.tube([p0, p1], [0.06, 0.052], 6, wood(k), { capEnd: false });
			// topuz
			rail.tube([p1.clone().add(V(0, -0.01, 0)), p1.clone().add(V(0, 0.08, 0))], [0.072, 0.03], 6, wood(k * 0.92), { capEnd: true });
			posts.push({ s, side, top: p1.clone(), bridge });
		}
	}
	// halat: ardışık dikme tepeleri arasında sarkan eğri (biraz alçakta: dikmenin boynundan)
	const ropes = [];
	for (const side of [1, -1]) {
		const PP = posts.filter((p) => p.side === side);
		for (let k = 0; k < PP.length - 1; k++) {
			const a = PP[k];
			const b = PP[k + 1];
			if (b.s - a.s > 2.25 * 1.6) continue;
			const pts = [];
			const A = a.top.clone().add(V(0, -0.04, 0));
			const B = b.top.clone().add(V(0, -0.04, 0));
			for (let t = 0; t <= 1.0001; t += 0.25) {
				const p = A.clone().lerp(B, t);
				p.y -= Math.sin(t * Math.PI) * 0.11;
				pts.push(p);
			}
			rail.tube(pts, pts.map(() => 0.026), 4, () => [0.86, 0.74, 0.55, 1], { capEnd: false });
			ropes.push({ a: A, b: B, s: (a.s + b.s) / 2, side, bridge: a.bridge && b.bridge });
		}
	}

	// Kemer destekler: gövdeye yaslanan kısımda tahtanın altından gövdeye kısa, oyma bir dirsek.
	// (Eski uzun çapraz payandalar yerine: alttan bakınca zarif, yukarıdan görünmez.)
	for (let s = 1.4; s < curve.length - 1; s += 3.1) {
		curve.sample(s, tmp);
		if (tmp.r - trunkRadius(tmp.y) > 1.5) continue;
		const yB = tmp.y - PATH_T;
		const a = V(tmp.x + tmp.sx * 0.15, yB + 0.03, tmp.z + tmp.sz * 0.15);
		const rs = trunkSurfaceR(tmp.th, yB - 0.95) - 0.12;
		const b = V(Math.cos(tmp.th) * rs, yB - 0.95, Math.sin(tmp.th) * rs);
		const m = a.clone().lerp(b, 0.5).add(V(tmp.sx * 0.12, -0.12, tmp.sz * 0.12));
		const pts = [a, a.clone().lerp(m, 0.55), m.clone().lerp(b, 0.45), b];
		rail.tube(pts, [0.085, 0.078, 0.08, 0.1], 6, wood(0.85), { capEnd: true, capStart: true });
	}

	// fenerler: dış dikmelerin bir kısmında, kıvrık bir askıdan sarkar (camı ayrı, kendi ışığıyla)
	const glass = new Builder();
	let nextL = 7;
	for (const p of posts) {
		if (p.side < 0 || p.s < nextL || p.bridge) continue;
		curve.sample(p.s, tmp);
		if (tmp.r - trunkRadius(tmp.y) > 1.6) continue;
		nextL = p.s + 12.5;
		const sx = tmp.sx;
		const sz = tmp.sz;
		const base = p.top.clone().add(V(0, 0.09, 0));
		const up = base.clone().add(V(sx * 0.06, 0.32, sz * 0.06));
		const hook = base.clone().add(V(sx * 0.36, 0.3, sz * 0.36));
		rail.tube([base, up, base.clone().add(V(sx * 0.2, 0.4, sz * 0.2)), hook], [0.03, 0.028, 0.025, 0.022], 5, wood(0.6), { capEnd: true });
		const body = hook.clone().add(V(0, -0.3, 0));
		rail.tube([hook, body.clone().add(V(0, 0.2, 0))], [0.008, 0.008], 3, () => [0.2, 0.15, 0.12, 1], { capEnd: false });
		// cam gövde + çatı + taban
		const ax = V(sx * 0.085, 0, sz * 0.085);
		const az = V(-sz * 0.085, 0, sx * 0.085);
		const ay = V(0, 0.12, 0);
		glass.box(body, ax, ay, az, (nn) => [1, 0.84 + 0.16 * nn.y, 0.7, 1]);
		// çatı: dört yüzlü küçük piramit (iki kutu: geniş ince saçak + sivri tepe)
		rail.box(body.clone().add(V(0, 0.15, 0)), ax.clone().multiplyScalar(1.45), V(0, 0.028, 0), az.clone().multiplyScalar(1.45), () => [0.32, 0.22, 0.15, 1]);
		rail.tube([body.clone().add(V(0, 0.17, 0)), body.clone().add(V(0, 0.3, 0))], [0.1, 0.012], 4, () => [0.32, 0.22, 0.15, 1], { capEnd: false, capStart: true });
		rail.box(body.clone().add(V(0, -0.14, 0)), ax.clone().multiplyScalar(1.15), V(0, 0.02, 0), az.clone().multiplyScalar(1.15), () => [0.32, 0.22, 0.15, 1]);
		lanterns.push(body);
	}

	// Çaput (dilek bezleri): halata bağlı, aşağı sarkan renkli şeritler. Rüzgâr yönüne hafif kıvrık.
	const CAPUT = [
		[0.93, 0.92, 0.88],
		[0.86, 0.22, 0.2],
		[0.24, 0.47, 0.8],
		[0.28, 0.62, 0.38],
		[0.95, 0.76, 0.26],
		[0.86, 0.22, 0.2],
		[0.93, 0.92, 0.88],
	];
	const ribbon = (p, tdir, len, wid, col, curl) => {
		// iki yüzlü şerit: aşağı sarkar, uca doğru incelir
		const segs = 4;
		const side = V(tdir.x, 0, tdir.z).normalize();
		const nrm = new THREE.Vector3().crossVectors(side, V(0, 1, 0)).normalize();
		const L = [];
		for (let i = 0; i <= segs; i++) {
			const t = i / segs;
			const c = p.clone().add(V(0, -len * t, 0)).addScaledVector(side, Math.sin(t * 2.2) * curl).addScaledVector(nrm, t * t * curl * 0.6);
			const w = wid * (1 - t * 0.35);
			L.push([c.clone().addScaledVector(side, -w / 2), c.clone().addScaledVector(side, w / 2)]);
		}
		for (const sg of [1, -1]) {
			const st = rail.count;
			for (let i = 0; i <= segs; i++) {
				for (const q of L[i]) rail.vert(q.x, q.y, q.z, nrm.x * sg, nrm.y * sg, nrm.z * sg, col[0], col[1], col[2], 1, 0, 0);
			}
			for (let i = 0; i < segs; i++) {
				const a = st + i * 2;
				rail.quad(a, a + 1, a + 3, a + 2);
			}
		}
	};
	let nextC = 3;
	for (const r of ropes) {
		if (r.s < nextC) continue;
		nextC = r.s + (r.bridge ? R.range(1.5, 2.5) : R.range(3.5, 6.5));
		const t = R.range(0.3, 0.7);
		const p = r.a.clone().lerp(r.b, t);
		p.y -= Math.sin(t * Math.PI) * 0.11 + 0.02;
		const tdir = r.b.clone().sub(r.a);
		const cnt = 2 + ((R() * 2) | 0);
		const c0 = (R() * CAPUT.length) | 0;
		for (let k = 0; k < cnt; k++) {
			const pp = p.clone().addScaledVector(tdir.clone().normalize(), (k - (cnt - 1) / 2) * 0.07);
			ribbon(pp, tdir, R.range(0.32, 0.56), R.range(0.075, 0.1), CAPUT[(c0 + k * 2) % CAPUT.length], R.range(0.04, 0.1));
		}
		// düğüm
		rail.box(p.clone().add(V(0, 0.01, 0)), V(0.035, 0, 0), V(0, 0.03, 0), V(0, 0, 0.035), () => [0.9, 0.85, 0.75, 1]);
	}

	// Kenar süsleri: tahtanın kabuğa değdiği iç kenarda mevsime göre küçük ayrıntılar.
	//   bahar/yaz: minik çiçek öbekleri ve yosun; güz: sinek mantarları ve kahverengi mantarlar,
	//   tahtalara düşmüş yapraklar; kış: kar sırtı ve dış kenardan sarkan buz sarkıtları.
	const flower = (c, r, col, nrmUp) => {
		const st = rail.count;
		rail.vert(c.x, c.y + 0.01, c.z, 0, 1, 0, 1, 0.9, 0.45, 1, 0, 0);
		const K = 5;
		for (let k = 0; k <= K * 2; k++) {
			const a = (k / (K * 2)) * TAU;
			const rr = k % 2 === 0 ? r : r * 0.45;
			rail.vert(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr, 0, 1, 0, col[0], col[1], col[2], 1, 0, 0);
		}
		for (let k = 0; k < K * 2; k++) rail.tri(st, st + 1 + k, st + 2 + k);
		void nrmUp;
	};
	const mushroom = (c, h, capR, capCol, dots) => {
		rail.tube([c.clone().add(V(0, -0.02, 0)), c.clone().add(V(0, h, 0))], [capR * 0.32, capR * 0.26], 5, () => [0.95, 0.92, 0.85, 1], { capEnd: false });
		// şapka: alçak kubbe
		const K = 8;
		const st = rail.count;
		const tp = c.clone().add(V(0, h + capR * 0.55, 0));
		rail.vert(tp.x, tp.y, tp.z, 0, 1, 0, capCol[0], capCol[1], capCol[2], 1, 0, 0);
		for (const [rf, yf] of [
			[0.7, 0.75],
			[1, 0.15],
		]) {
			for (let k = 0; k < K; k++) {
				const a = (k / K) * TAU;
				const nn = V(Math.cos(a) * rf, yf + 0.3, Math.sin(a) * rf).normalize();
				rail.vert(c.x + Math.cos(a) * capR * rf, c.y + h + capR * 0.55 * yf, c.z + Math.sin(a) * capR * rf, nn.x, nn.y, nn.z, capCol[0], capCol[1], capCol[2], 1, 0, 0);
			}
		}
		for (let k = 0; k < K; k++) {
			const k1 = (k + 1) % K;
			rail.tri(st, st + 1 + k, st + 1 + k1);
			rail.quad(st + 1 + k, st + 1 + K + k, st + 1 + K + k1, st + 1 + k1);
		}
		// beyaz benekler
		if (dots) {
			for (let k = 0; k < 3; k++) {
				const a = R() * TAU;
				const d = capR * R.range(0.2, 0.6);
				const q = c.clone().add(V(Math.cos(a) * d, h + capR * 0.55 * (0.95 - (d / capR) * 0.6) + 0.006, Math.sin(a) * d));
				rail.box(q, V(0.018, 0, 0), V(0, 0.008, 0), V(0, 0, 0.018), () => [1, 0.97, 0.9, 1]);
			}
		}
	};
	const leafOnDeck = (c, rot, col) => {
		const a = V(Math.cos(rot) * 0.09, 0, Math.sin(rot) * 0.09);
		const b = V(-Math.sin(rot) * 0.05, 0, Math.cos(rot) * 0.05);
		const st = rail.count;
		const pts = [c.clone().add(a), c.clone().add(b), c.clone().sub(a), c.clone().sub(b)];
		for (const p of pts) rail.vert(p.x, p.y + 0.012, p.z, 0, 1, 0, col[0], col[1], col[2], 1, 0, 0);
		rail.quad(st, st + 1, st + 2, st + 3);
	};
	const icicle = (p, len) => {
		rail.tube([p, p.clone().add(V(0, -len, 0))], [0.035, 0.004], 4, () => [0.82, 0.92, 1.05, 1], { capEnd: false });
	};

	for (let s = 1.5; s < curve.length - 0.5; s += R.range(1.4, 3.2)) {
		curve.sample(s, tmp);
		const off = tmp.r - trunkRadius(tmp.y);
		const y = tmp.y;
		const hug = off < 1.5;
		const inner = innerAt(tmp) - 0.22;
		const baseIn = V(tmp.x - tmp.sx * inner, y + 0.0, tmp.z - tmp.sz * inner);
		if (y > 37) {
			// bahar: pembe-beyaz minik çiçekler
			if (!hug) continue;
			const n2 = 2 + ((R() * 3) | 0);
			for (let k = 0; k < n2; k++) {
				const c = baseIn.clone().add(V(R.range(-0.18, 0.18), 0.012, R.range(-0.18, 0.18)));
				flower(c, R.range(0.045, 0.07), R() < 0.5 ? [1, 0.85, 0.9] : [1, 0.97, 0.95]);
			}
		} else if (y > 25) {
			// yaz: sarı-beyaz papatyalar
			if (!hug) continue;
			const n2 = 2 + ((R() * 3) | 0);
			for (let k = 0; k < n2; k++) {
				const c = baseIn.clone().add(V(R.range(-0.18, 0.18), 0.012, R.range(-0.18, 0.18)));
				flower(c, R.range(0.045, 0.07), R() < 0.6 ? [1, 1, 0.96] : [1, 0.85, 0.35]);
			}
		} else if (y > 12.5) {
			// güz: mantarlar (yer yer kırmızı benekli sinek mantarı) ve düşmüş yapraklar
			if (hug && R() < 0.55) {
				const n2 = 1 + ((R() * 3) | 0);
				const red = R() < 0.6;
				for (let k = 0; k < n2; k++) {
					const c = baseIn.clone().add(V(R.range(-0.15, 0.15), 0, R.range(-0.15, 0.15)));
					const sc = R.range(0.7, 1.15) * (k === 0 ? 1.2 : 0.8);
					mushroom(c, 0.11 * sc, 0.09 * sc, red ? [0.86, 0.2, 0.12] : [0.62, 0.4, 0.24], red);
				}
			}
			const nl = 2 + ((R() * 4) | 0);
			for (let k = 0; k < nl; k++) {
				const w = R.range(-0.8, 0.85);
				const c = V(tmp.x + tmp.sx * w + R.range(-0.25, 0.25), y, tmp.z + tmp.sz * w + R.range(-0.25, 0.25));
				leafOnDeck(c, R() * TAU, R.pick([
					[0.98, 0.7, 0.2],
					[0.95, 0.5, 0.15],
					[0.85, 0.32, 0.14],
					[1, 0.82, 0.32],
				]));
			}
		} else {
			// kış: dış kenardan buz sarkıtları
			const n2 = 2 + ((R() * 3) | 0);
			for (let k = 0; k < n2; k++) {
				const p = at(s + R.range(-0.6, 0.6), outerH + 0.02, -PATH_T + 0.02);
				icicle(p, R.range(0.12, 0.45));
			}
		}
	}

	// Kayın mantarı (raf mantarı): gövdede, patika katlarının arasında yarım daire raflar.
	for (let s = 6; s < curve.length - 3; s += R.range(6, 11)) {
		curve.sample(s, tmp);
		const y = tmp.y - R.range(1.6, 3.6);
		if (y < 3) continue;
		const th = tmp.th + R.range(-0.2, 0.2);
		const shelves = 1 + ((R() * 3) | 0);
		for (let k = 0; k < shelves; k++) {
			const yy = y + k * 0.32 + R.range(-0.05, 0.05);
			const tk = th + R.range(-0.1, 0.1);
			const rs = trunkSurfaceR(tk, yy) - 0.05;
			const cx = Math.cos(tk) * rs;
			const cz = Math.sin(tk) * rs;
			const outv = V(Math.cos(tk), 0, Math.sin(tk));
			const tan = V(-Math.sin(tk), 0, Math.cos(tk));
			const w = R.range(0.22, 0.4) * (1 - k * 0.2);
			const d = w * R.range(0.55, 0.75);
			const K = 8;
			const st = rail.count;
			const c0 = [0.8, 0.68, 0.52];
			const c1 = [0.52, 0.38, 0.28];
			// üst yüz: içten dışa açık kenarlı yarım disk
			rail.vert(cx, yy + 0.06, cz, 0, 1, 0, c1[0], c1[1], c1[2], 0.8, 0, 0);
			for (let i = 0; i <= K; i++) {
				const a = (i / K) * Math.PI;
				const p = V(cx, yy, cz).addScaledVector(tan, Math.cos(a) * w).addScaledVector(outv, Math.sin(a) * d);
				rail.vert(p.x, p.y, p.z, outv.x * 0.3, 0.95, outv.z * 0.3, c0[0], c0[1], c0[2], 1, 0, 0);
			}
			for (let i = 0; i < K; i++) rail.tri(st, st + 1 + i, st + 2 + i);
			// alt yüz
			const st2 = rail.count;
			rail.vert(cx, yy - 0.07, cz, 0, -1, 0, 0.45, 0.36, 0.3, 0.6, 0, 0);
			for (let i = 0; i <= K; i++) {
				const a = (i / K) * Math.PI;
				const p = V(cx, yy - 0.01, cz).addScaledVector(tan, Math.cos(a) * w).addScaledVector(outv, Math.sin(a) * d);
				rail.vert(p.x, p.y, p.z, 0, -1, 0, 0.92, 0.86, 0.74, 0.7, 0, 0);
			}
			for (let i = 0; i < K; i++) rail.tri(st2, st2 + 2 + i, st2 + 1 + i);
		}
	}
	rail.fixWinding();

	return { walkway: top.build(), rail: rail.build(), glass: glass.build(), lanterns };
}
