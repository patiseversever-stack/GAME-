// Gövdeye sarılan sarmal patika: eğri örnekleme, tahta yürüyüş yolu, korkuluk, halat,
// destek payandaları ve fenerler. Hepsi iki çizim çağrısı.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { clamp, smoothstep } from '../core/math.js';
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
 * Yürüyüş yolu geometrisi. Gövdeye yaslanan kısımlarda iç kenar gövdenin içine biraz girer
 * (aralık görünmesin); köprülerde iki kenar eşit ve iki yanda korkuluk var.
 */
export function buildWalkway(curve) {
	const top = new Builder();
	const n = curve.n;
	const inner = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const off = curve.offTrunk(i);
		inner[i] = 0.95 + 0.2 * (1 - smoothstep(1.3, 2.2, off));
	}
	const outerH = PATH_W / 2;
	const uS = 1 / 2.8;
	// her örnekte 6 köşe: üst-iç, üst-dış, dış-yan üst, dış-yan alt, alt-dış, alt-iç (+ iç yan)
	for (let i = 0; i < n; i++) {
		const x = curve.X[i];
		const y = curve.Y[i];
		const z = curve.Z[i];
		const sx = curve.SX[i];
		const sz = curve.SZ[i];
		const s = i * 0.2;
		const ix = x - sx * inner[i];
		const iz = z - sz * inner[i];
		const ox = x + sx * outerH;
		const oz = z + sz * outerH;
		const off = curve.offTrunk(i);
		const hug = 1 - smoothstep(1.3, 2.2, off);
		// üst yüzey: hafif kubbeli (kenarlar 2 cm aşağıda) – ışık kenarda yumuşakça kırılır
		const aoIn = 0.62 + 0.38 * (1 - hug);
		top.vert(ix, y - 0.02, iz, 0, 1, 0, 1, 1, 1, aoIn, s * uS, 0);
		top.vert(x - sx * 0.3, y, z - sz * 0.3, 0, 1, 0, 1, 1, 1, 0.92 + 0.08 * (1 - hug), s * uS, 0.35);
		top.vert(x + sx * 0.3, y, z + sz * 0.3, 0, 1, 0, 1, 1, 1, 1, s * uS, 0.65);
		top.vert(ox, y - 0.02, oz, sx * 0.2, 0.98, sz * 0.2, 1, 1, 1, 1, s * uS, 1);
		// dış yan
		top.vert(ox, y - 0.02, oz, sx, 0, sz, 0.72, 0.68, 0.64, 0.9, s * uS, 0.0);
		top.vert(ox, y - PATH_T, oz, sx, 0, sz, 0.72, 0.68, 0.64, 0.7, s * uS, 0.12);
		// alt
		top.vert(ox, y - PATH_T, oz, 0, -1, 0, 0.5, 0.46, 0.44, 0.55, s * uS, 0.0);
		top.vert(ix, y - PATH_T, iz, 0, -1, 0, 0.5, 0.46, 0.44, 0.4, s * uS, 1.0);
		// iç yan (köprülerde görünür)
		top.vert(ix, y - PATH_T, iz, -sx, 0, -sz, 0.72, 0.68, 0.64, 0.7, s * uS, 0.12);
		top.vert(ix, y - 0.02, iz, -sx, 0, -sz, 0.72, 0.68, 0.64, 0.9, s * uS, 0.0);
	}
	const V = 10;
	for (let i = 0; i < n - 1; i++) {
		const a = i * V;
		const b = (i + 1) * V;
		// sıralama: ilerleme yönü + yukarı normal için saat yönü tutarlılığı aşağıda kontrol edilir
		const q = (p0, p1) => top.quad(a + p0, b + p0, b + p1, a + p1);
		q(0, 1);
		q(1, 2);
		q(2, 3);
		q(4, 5);
		q(6, 7);
		q(8, 9);
	}
	top.fixWinding();

	// Korkuluk dikmeleri, halat, payandalar ve fener askıları
	const rail = new Builder();
	const lanterns = [];
	const postEvery = 1.55;
	const posts = [];
	const wood = (k) => () => [0.42 * k, 0.27 * k, 0.17 * k, 1];
	for (let s = 0.6; s < curve.length - 0.4; s += postEvery) {
		const i = Math.round(s / 0.2);
		const off = curve.offTrunk(i);
		const sides = off > 2.0 ? [1, -1] : [1];
		for (const side of sides) {
			const h = side > 0 ? outerH - 0.1 : inner[i] - 0.1;
			const x = curve.X[i] + curve.SX[i] * h * side;
			const z = curve.Z[i] + curve.SZ[i] * h * side;
			const y = curve.Y[i];
			const p0 = new THREE.Vector3(x, y - 0.05, z);
			const p1 = new THREE.Vector3(x, y + 0.78, z);
			rail.tube([p0, p1], [0.06, 0.05], 6, wood(1), { capEnd: true });
			posts.push({ s, side, top: p1.clone() });
		}
	}
	// halat: aynı taraftaki ardışık dikme tepeleri arasında sarkan eğri
	for (const side of [1, -1]) {
		const P = posts.filter((p) => p.side === side);
		for (let k = 0; k < P.length - 1; k++) {
			const a = P[k];
			const b = P[k + 1];
			if (b.s - a.s > postEvery * 1.6) continue;
			const pts = [];
			for (let t = 0; t <= 1.0001; t += 0.25) {
				const p = a.top.clone().lerp(b.top, t);
				p.y -= 0.03 + Math.sin(t * Math.PI) * 0.14;
				pts.push(p);
			}
			rail.tube(pts, pts.map(() => 0.028), 4, () => [0.62, 0.5, 0.36, 1], { capEnd: false });
		}
	}
	// payandalar: gövdeye yaslanan kısımlarda, tahtanın dış altından gövdeye çapraz destek
	for (let s = 1.2; s < curve.length - 1; s += 2.6) {
		const i = Math.round(s / 0.2);
		if (curve.offTrunk(i) > 1.6) continue;
		const y = curve.Y[i];
		const th = curve.TH[i];
		const a = new THREE.Vector3(curve.X[i] + curve.SX[i] * 0.55, y - PATH_T + 0.02, curve.Z[i] + curve.SZ[i] * 0.55);
		const rr = trunkRadius(y - 1.5) - 0.1;
		const b = new THREE.Vector3(Math.cos(th) * rr, y - 1.55, Math.sin(th) * rr);
		rail.tube([a, b], [0.075, 0.09], 5, wood(0.85), { capEnd: true, capStart: true });
	}
	// fenerler: dış dikmelerin bir kısmına asılı (camı ayrı, kendi ışığıyla parlayan geometri)
	const glass = new Builder();
	let nextL = 7;
	for (const p of posts) {
		if (p.side < 0 || p.s < nextL) continue;
		const i = Math.round(p.s / 0.2);
		if (curve.offTrunk(i) > 1.6) continue;
		nextL = p.s + 12.5;
		const sx = curve.SX[i];
		const sz = curve.SZ[i];
		const hook = p.top.clone().add(new THREE.Vector3(sx * 0.32, 0.05, sz * 0.32));
		rail.tube([p.top.clone().add(new THREE.Vector3(0, -0.02, 0)), hook], [0.022, 0.022], 4, wood(0.6), { capEnd: false });
		const body = hook.clone().add(new THREE.Vector3(0, -0.28, 0));
		// fener gövdesi: küçük kutu + çatı
		const ax = new THREE.Vector3(0.09, 0, 0);
		const ay = new THREE.Vector3(0, 0.13, 0);
		const az = new THREE.Vector3(0, 0, 0.09);
		glass.box(body, ax, ay, az, (nn) => [1, 0.82 + 0.18 * nn.y, 0.7, 1]);
		rail.box(body.clone().add(new THREE.Vector3(0, 0.16, 0)), ax.clone().multiplyScalar(1.35), new THREE.Vector3(0, 0.035, 0), az.clone().multiplyScalar(1.35), () => [0.3, 0.2, 0.14, 1]);
		rail.box(body.clone().add(new THREE.Vector3(0, -0.15, 0)), ax.clone().multiplyScalar(1.15), new THREE.Vector3(0, 0.02, 0), az.clone().multiplyScalar(1.15), () => [0.3, 0.2, 0.14, 1]);
		lanterns.push(body);
	}

	return { walkway: top.build(), rail: rail.build(), glass: glass.build(), lanterns };
}
