// Ağacın üstünde durduğu uçan ada: karla örtülü üst yüzey, basamak basamak katmanlı kaya karın,
// sarkan kökler ve mor kristaller, buz sarkıtları, karlı çamlar, balbal taşları, dilek bezli
// oba (taş yığını), donmuş gölet ve Kök Kapısı.
//
// İki tohumlu dizi: R yerleşim (kayalar, çamlar, taşlar = son bölümün gölgeleri) — sırası
// korunur; VR yalnızca görsel ayrıntılar içindir.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { rng, TAU, smoothstep, lerp, noise1 } from '../core/math.js';
import { trunkSurfaceR } from './tree.js';

export const ISLAND_R = 19.5;

/** Ada üst yüzeyinin yüksekliği. */
export function groundY(x, z) {
	const r = Math.hypot(x, z);
	const th = Math.atan2(z, x);
	const und = noise1(th * 3.1 + 11) * 0.22 + noise1(r * 0.35 + th * 2) * 0.18;
	const dome = -0.0016 * r * r;
	const edge = -Math.pow(smoothstep(ISLAND_R - 3.2, ISLAND_R, r), 2) * 1.1;
	return dome + und * smoothstep(5, 9, r) + edge;
}

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** θ'da periyodik, yumuşak gürültü (dikişsiz). */
function ringNoise(th, seed) {
	return (
		0.5 * Math.sin(3 * th + seed * 1.7) +
		0.3 * Math.sin(5 * th + seed * 2.9 + 1.1) +
		0.2 * Math.sin(8 * th + seed * 4.3 + 2.3) +
		0.12 * Math.sin(13 * th + seed * 5.1)
	);
}

export function buildIsland(gateTheta) {
	const R = rng(77);
	const VR = rng(78);
	const top = new Builder();
	const rock = new Builder();
	const props = new Builder();
	const occ = { spheres: [], caps: [] };

	// ---- üst yüzey (kar) ----
	const SEG = 120;
	const RINGS = 34;
	const r0 = 2.6;
	for (let j = 0; j <= RINGS; j++) {
		const r = lerp(r0, ISLAND_R, Math.pow(j / RINGS, 0.9));
		for (let i = 0; i <= SEG; i++) {
			const th = (i / SEG) * TAU;
			const x = Math.cos(th) * r;
			const z = Math.sin(th) * r;
			const y = groundY(x, z);
			// normal: sonlu farklarla
			const e = 0.15;
			const hx = (groundY(x + e, z) - groundY(x - e, z)) / (2 * e);
			const hz = (groundY(x, z + e) - groundY(x, z - e)) / (2 * e);
			const n = V3(-hx, 1, -hz).normalize();
			// kar: tümsek tepeleri sıcak beyaz, çukurlar serin mavi (rüzgâr dalgaları)
			const lap = (groundY(x + 0.8, z) + groundY(x - 0.8, z) + groundY(x, z + 0.8) + groundY(x, z - 0.8)) * 0.25 - y;
			const hollow = smoothstep(-0.01, 0.05, lap);
			const rip = 0.5 + 0.5 * Math.sin(r * 2.1 + ringNoise(th, 3) * 2.5);
			const v = 0.95 + 0.03 * rip;
			let cr = v * lerp(1, 0.86, hollow);
			let cg = v * lerp(1, 0.9, hollow);
			let cb = v * lerp(1.02, 1.03, hollow);
			// gövde dibinde toprak ve kök izi
			const nearTrunk = 1 - smoothstep(0, 2.6, r - trunkSurfaceR(th, 0));
			cr = lerp(cr, 0.72, nearTrunk * 0.6);
			cg = lerp(cg, 0.66, nearTrunk * 0.6);
			cb = lerp(cb, 0.66, nearTrunk * 0.6);
			const ao = 1 - 0.45 * nearTrunk;
			top.vert(x, y, z, n.x, n.y, n.z, cr, cg, cb, ao, x * 0.08, z * 0.08);
		}
	}
	const ring = SEG + 1;
	for (let j = 0; j < RINGS; j++) {
		for (let i = 0; i < SEG; i++) {
			const a = j * ring + i;
			top.quad(a, a + ring, a + ring + 1, a + 1);
		}
	}
	top.fixWinding();

	// ---- kaya karın: basamak basamak tabakalar (her tabakanın üstü ışık alan bir sekı,
	// yüzü içe çekilen gölgeli bir duvar), aşağı doğru sivrilir ----
	const DEPTH = 27;
	const SEGU = 96;
	const LAYERS = [0, 0.09, 0.19, 0.3, 0.42, 0.55, 0.69, 0.84, 1];
	const LAYER_COL = [
		[0.86, 0.74, 0.64],
		[0.7, 0.64, 0.72],
		[0.8, 0.7, 0.66],
		[0.6, 0.56, 0.66],
		[0.74, 0.66, 0.66],
		[0.56, 0.52, 0.62],
		[0.66, 0.6, 0.66],
		[0.5, 0.47, 0.57],
	];
	const tList = [];
	for (let k = 0; k < LAYERS.length - 1; k++) {
		for (const u of [0, 0.06, 0.3, 0.6, 0.9]) tList.push({ t: lerp(LAYERS[k], LAYERS[k + 1], u), k, u });
	}
	tList.push({ t: 1, k: LAYERS.length - 2, u: 1 });
	const baseR = (t) => (ISLAND_R + 0.3) * Math.pow(1 - t, 1.25) * (t < 0.04 ? 1 + (0.04 - t) * 2 : 1);
	const prof = (t, k, u, th) => {
		const A = 0.07 + 0.03 * Math.sin(k * 2.3);
		const saw = 0.55 - u * (1 + 0.15 * ringNoise(th, k + 7)); // tabaka üstü dışa taşar, altı içe
		const lobes = 1 + 0.08 * ringNoise(th, k * 0.37 + t * 2) + 0.035 * Math.sin(17 * th + k * 3.1);
		return Math.max(0.15, baseR(t) * lobes * (1 + A * saw * (t > 0.02 ? 1 : 0)));
	};
	const rock0 = rock.count;
	const P = [];
	for (let j = 0; j < tList.length; j++) {
		const { t, k, u } = tList[j];
		const y = -0.75 - t * DEPTH + (t < 0.05 ? t * 6 : 0);
		const row = [];
		for (let i = 0; i <= SEGU; i++) {
			const th = (i / SEGU) * TAU;
			const r = j === tList.length - 1 ? 0.15 : prof(t, k, u, th);
			row.push(V3(Math.cos(th) * r, y, Math.sin(th) * r));
		}
		P.push(row);
	}
	const nrm = V3(0, 0, 0);
	const ea = V3(0, 0, 0);
	const eb = V3(0, 0, 0);
	for (let j = 0; j < P.length; j++) {
		const { t, k, u } = tList[j];
		for (let i = 0; i <= SEGU; i++) {
			const p = P[j][i];
			const iL = i === 0 ? SEGU - 1 : i - 1;
			const iR = i === SEGU ? 1 : i + 1;
			ea.subVectors(P[j][iR], P[j][iL]);
			eb.subVectors(P[Math.min(P.length - 1, j + 1)][i], P[Math.max(0, j - 1)][i]);
			nrm.crossVectors(ea, eb).normalize();
			if (nrm.x * p.x + nrm.z * p.z < 0) nrm.negate();
			const th = (i / SEGU) * TAU;
			const c = LAYER_COL[k];
			// tabaka içinde: üst kenar açık, alt kısım koyu; yukarı bakan sekilerde kar
			const shade = lerp(1.06, 0.84, u);
			const snow = smoothstep(0.15, 0.55, nrm.y) * (1 - smoothstep(0.35, 0.7, t)) * (0.75 + 0.25 * ringNoise(th, 11));
			const cr = lerp(c[0] * shade, 0.93, snow);
			const cg = lerp(c[1] * shade, 0.95, snow);
			const cb = lerp(c[2] * shade, 1.0, snow);
			const ao = lerp(0.95, 0.5, t) * lerp(1, 0.75, smoothstep(0.6, 0.95, u));
			rock.vert(p.x, p.y, p.z, nrm.x, nrm.y, nrm.z, cr, cg, cb, ao, (i / SEGU) * 8, p.y * 0.12);
		}
	}
	const ringU = SEGU + 1;
	for (let j = 0; j < P.length - 1; j++) {
		for (let i = 0; i < SEGU; i++) {
			const a = rock0 + j * ringU + i;
			rock.quad(a, a + 1, a + ringU + 1, a + ringU);
		}
	}
	// kenar: karın kayaya taştığı yuvarlak dudak
	const lip0 = rock.count;
	for (let k = 0; k <= 3; k++) {
		const a = (k / 3) * Math.PI * 0.5;
		for (let i = 0; i <= SEG; i++) {
			const th = (i / SEG) * TAU;
			const rTop = ISLAND_R;
			const x = Math.cos(th) * rTop;
			const z = Math.sin(th) * rTop;
			const yTop = groundY(x * 0.999, z * 0.999);
			const rr = rTop + Math.sin(a) * 0.45;
			const yy = lerp(yTop, -0.8, 1 - Math.cos(a));
			const n = V3(Math.cos(th) * Math.sin(a), Math.cos(a), Math.sin(th) * Math.sin(a)).normalize();
			rock.vert(Math.cos(th) * rr, yy, Math.sin(th) * rr, n.x, n.y, n.z, 0.95, 0.96, 1.0, 0.95, 0, 0);
		}
	}
	for (let k = 0; k < 3; k++) {
		for (let i = 0; i < SEG; i++) {
			const a = lip0 + k * ring + i;
			rock.quad(a, a + 1, a + ring + 1, a + ring);
		}
	}

	// Yerleşim dizisini eski sürümle aynı yerde tut (kökler ve sarkıtlar artık VR kullanıyor).
	for (let i = 0; i < 706; i++) R();

	// ---- sarkan kökler: sekilerin altından bulutlara, yerçekimiyle kıvrılarak ----
	const rootCol = () => [0.52, 0.42, 0.36, 0.85];
	for (let k = 0; k < 18; k++) {
		const th = VR() * TAU;
		const li = 1 + ((VR() * 5) | 0);
		const t = LAYERS[li] + 0.005;
		const r = prof(t, li, 0.9, th) * 0.94;
		const y0 = -0.75 - t * DEPTH;
		const L = VR.range(5, 15);
		const pts = [];
		let x = Math.cos(th) * r;
		let z = Math.sin(th) * r;
		const drift = VR.range(-0.5, 0.5);
		for (let s = 0; s <= 8; s++) {
			const f = s / 8;
			pts.push(V3(x, y0 - f * L - Math.sin(f * 3) * 0.3, z));
			const a = th + drift * f + Math.sin(f * 5 + k) * 0.4;
			x += Math.cos(a) * VR.range(0.05, 0.4);
			z += Math.sin(a) * VR.range(0.05, 0.4);
		}
		const r0k = VR.range(0.22, 0.42);
		rock.tube(pts, pts.map((_, i) => lerp(r0k, 0.03, Math.pow(i / 8, 0.8))), 5, rootCol);
		// yan kökçük
		if (VR() < 0.6) {
			const p0 = pts[3];
			const q = [p0, p0.clone().add(V3(VR.range(-0.6, 0.6), -1.4, VR.range(-0.6, 0.6))), p0.clone().add(V3(VR.range(-1, 1), -L * 0.4, VR.range(-1, 1)))];
			rock.tube(q, [r0k * 0.4, r0k * 0.25, 0.02], 4, rootCol);
		}
	}
	// mor kristal kümeleri: Tün Ana'nın mürekkebi kayanın içinde donmuş
	for (let k = 0; k < 9; k++) {
		const th = VR() * TAU;
		const li = 1 + ((VR() * 5) | 0);
		const t = lerp(LAYERS[li], LAYERS[li + 1], 0.5);
		const r = prof(t, li, 0.5, th) * 0.97;
		const c = V3(Math.cos(th) * r, -0.75 - t * DEPTH, Math.sin(th) * r);
		const outv = V3(Math.cos(th), -0.25, Math.sin(th)).normalize();
		for (let q = 0; q < 4; q++) {
			const d = outv.clone().add(V3(VR.range(-0.5, 0.5), VR.range(-0.4, 0.3), VR.range(-0.5, 0.5))).normalize();
			const len = VR.range(0.5, 1.3);
			const b = c.clone().addScaledVector(d, len);
			const glow = VR.range(0.85, 1.15);
			rock.tube([c.clone().addScaledVector(d, -0.2), c.clone().addScaledVector(d, len * 0.75), b], [0.13, 0.12, 0.0], 6, () => [0.62 * glow, 0.45 * glow, 1.1 * glow, 1], { capEnd: false });
		}
	}
	// buz sarkıtları: kenarın altında, öbek öbek
	for (let k = 0; k < 26; k++) {
		const th0 = VR() * TAU;
		const nI = 2 + ((VR() * 4) | 0);
		for (let q = 0; q < nI; q++) {
			const th = th0 + VR.range(-0.04, 0.04);
			const r = ISLAND_R + 0.15;
			const L = VR.range(0.4, 2.4) * (q === 0 ? 1.3 : 0.7);
			const p0 = V3(Math.cos(th) * r, -0.9, Math.sin(th) * r);
			const p1 = p0.clone().add(V3(0, -L, 0));
			rock.tube([p0, p0.clone().lerp(p1, 0.4), p1], [VR.range(0.09, 0.17), 0.07, 0.006], 5, () => [0.8, 0.92, 1.06, 1]);
		}
	}
	rock.fixWinding();

	// ---- kayalar (kar şapkalı) ----
	const boulder = (c, s, sq = 0.65) => {
		const g = new THREE.IcosahedronGeometry(1, 2);
		const Pp = g.getAttribute('position');
		const base = props.count;
		const seed = R() * 100;
		for (let v = 0; v < Pp.count; v++) {
			const p = V3(Pp.getX(v), Pp.getY(v), Pp.getZ(v));
			const d = 1 + 0.18 * noise1(p.x * 3 + seed) + 0.12 * noise1(p.z * 4 + p.y * 2 + seed);
			p.multiplyScalar(d);
			p.y *= sq;
			const n = p.clone().normalize();
			const snow = smoothstep(0.25, 0.55, n.y + 0.12 * noise1(p.x * 5 + seed));
			const w = p.multiplyScalar(s).add(c);
			props.vert(w.x, w.y, w.z, n.x, n.y, n.z, lerp(0.56, 0.95, snow), lerp(0.53, 0.96, snow), lerp(0.62, 1.02, snow), lerp(0.7, 1, n.y * 0.5 + 0.5), 0, 0);
		}
		const I = g.index ? g.index.array : null;
		if (I) for (let t = 0; t < I.length; t += 3) props.tri(base + I[t], base + I[t + 1], base + I[t + 2]);
		else for (let t = 0; t < Pp.count; t += 3) props.tri(base + t, base + t + 1, base + t + 2);
		occ.spheres.push({ c: c.clone().add(V3(0, s * sq * 0.1, 0)), r: s * 0.85, sy: sq });
	};

	// çam: koyu mavi-yeşil, kat kat sarkık etekler; her katın üstünde kar, altı gölgeli
	const pine = (c, h) => {
		props.tube([c.clone().add(V3(0, -0.3, 0)), c.clone().add(V3(0, h * 0.4, 0))], [0.055 * h, 0.03 * h], 6, () => [0.38, 0.28, 0.22, 0.8]);
		const tiers = 5;
		const K = 12;
		for (let k = 0; k < tiers; k++) {
			const f = k / (tiers - 1);
			const yb = c.y + h * (0.16 + f * 0.6);
			const ht = h * lerp(0.34, 0.26, f);
			const rr = h * lerp(0.4, 0.14, f);
			const ph = VR() * TAU;
			const base = props.count;
			// tepe
			props.vert(c.x, yb + ht, c.z, 0, 1, 0, 0.93, 0.95, 1.0, 1, 0, 0);
			// orta halka (kar sınırı, düzensiz) ve sarkık tırtıklı etek
			for (let q = 0; q < K; q++) {
				const a = (q / K) * TAU;
				const snowy = (q + k) % 3 !== 0;
				const rm = rr * 0.55;
				const nn = V3(Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8).normalize();
				props.vert(c.x + Math.cos(a) * rm, yb + ht * 0.48, c.z + Math.sin(a) * rm, nn.x, nn.y, nn.z, snowy ? 0.9 : 0.16, snowy ? 0.93 : 0.3, snowy ? 0.99 : 0.27, 0.95, 0, 0);
			}
			for (let q = 0; q < K; q++) {
				const a = (q / K) * TAU;
				const tip = q % 2 === 0;
				const re = rr * (tip ? 1.08 : 0.86) * (1 + 0.08 * Math.sin(a * 3 + ph));
				const nn = V3(Math.cos(a) * 0.85, 0.45, Math.sin(a) * 0.85).normalize();
				props.vert(c.x + Math.cos(a) * re, yb - (tip ? 0.1 * h * 0.3 : 0), c.z + Math.sin(a) * re, nn.x, nn.y, nn.z, 0.12, 0.25, 0.22, 0.75, 0, 0);
			}
			// alt kapak (aşağıdan bakınca boş görünmesin)
			const bc = props.vert(c.x, yb + ht * 0.1, c.z, 0, -1, 0, 0.08, 0.15, 0.14, 0.5, 0, 0);
			for (let q = 0; q < K; q++) {
				const q1 = (q + 1) % K;
				props.tri(base, base + 1 + q, base + 1 + q1);
				props.quad(base + 1 + q, base + 1 + K + q, base + 1 + K + q1, base + 1 + q1);
				props.tri(bc, base + 1 + K + q1, base + 1 + K + q);
			}
		}
		occ.caps.push({ a: c.clone(), b: c.clone().add(V3(0, h, 0)), r: h * 0.22 });
	};

	// balbal: kadehini göğsünde tutan taş ata heykeli; yuvarlak baş, oyma yüz, kemer, kar şapka
	const stone = (c, h, rot) => {
		const fwd = V3(-Math.cos(rot), 0, -Math.sin(rot)); // gövdeye bakar
		const sideV = V3(-fwd.z, 0, fwd.x);
		const stoneC = (y) => [0.64 + y * 0.04, 0.61 + y * 0.03, 0.68, 0.9];
		const bodyH = h * 0.72;
		const K = 8;
		// gövde: hafif daralan sekizgen prizma (omuzlar yuvarlak)
		const rings = [
			[0, 0.34],
			[bodyH * 0.55, 0.33],
			[bodyH * 0.92, 0.3],
			[bodyH, 0.22],
		];
		const st = props.count;
		for (const [yy, rr] of rings) {
			for (let q = 0; q < K; q++) {
				const a = (q / K) * TAU + Math.PI / 8;
				const d = sideV.clone().multiplyScalar(Math.cos(a) * rr).addScaledVector(fwd, Math.sin(a) * rr * 0.7);
				const nn = d.clone().normalize();
				const cl = stoneC(yy / h);
				props.vert(c.x + d.x, c.y - 0.25 + yy, c.z + d.z, nn.x, nn.y * 0 + 0.1, nn.z, cl[0], cl[1], cl[2], yy < 0.3 ? 0.6 : 0.9, 0, 0);
			}
		}
		for (let j = 0; j < rings.length - 1; j++) {
			for (let q = 0; q < K; q++) {
				const q1 = (q + 1) % K;
				props.quad(st + j * K + q, st + j * K + q1, st + (j + 1) * K + q1, st + (j + 1) * K + q);
			}
		}
		// baş
		const headC = c.clone().add(V3(0, bodyH - 0.25 + h * 0.13, 0));
		const hg = new THREE.SphereGeometry(h * 0.16, 8, 6);
		const HP = hg.getAttribute('position');
		const hb = props.count;
		for (let v = 0; v < HP.count; v++) {
			const p = V3(HP.getX(v), HP.getY(v) * 1.15, HP.getZ(v));
			const n = p.clone().normalize();
			const sn = n.y > 0.45 ? 1 : 0;
			props.vert(headC.x + p.x, headC.y + p.y, headC.z + p.z, n.x, n.y, n.z, lerp(0.66, 0.95, sn), lerp(0.63, 0.96, sn), lerp(0.7, 1.0, sn), 0.95, 0, 0);
		}
		const HI = hg.index.array;
		for (let t = 0; t < HI.length; t += 3) props.tri(hb + HI[t], hb + HI[t + 1], hb + HI[t + 2]);
		// oyma yüz: iki göz yarığı ve bıyık
		const face = headC.clone().addScaledVector(fwd, h * 0.155);
		const dk = () => [0.3, 0.28, 0.34, 0.7];
		for (const sg of [-1, 1]) props.box(face.clone().addScaledVector(sideV, sg * h * 0.055).add(V3(0, h * 0.03, 0)), sideV.clone().multiplyScalar(h * 0.035), V3(0, h * 0.008, 0), fwd.clone().multiplyScalar(0.02), dk);
		props.box(face.clone().add(V3(0, -h * 0.045, 0)), sideV.clone().multiplyScalar(h * 0.075), V3(0, h * 0.01, 0), fwd.clone().multiplyScalar(0.02), dk);
		// göğüste kadeh tutan eller (kabartma) ve kemer
		const chest = c.clone().add(V3(0, bodyH * 0.62 - 0.25, 0)).addScaledVector(fwd, 0.25);
		props.box(chest, sideV.clone().multiplyScalar(0.17), V3(0, 0.05, 0), fwd.clone().multiplyScalar(0.05), () => [0.58, 0.55, 0.62, 0.85]);
		props.box(chest.clone().add(V3(0, 0.1, 0)).addScaledVector(fwd, 0.03), sideV.clone().multiplyScalar(0.05), V3(0, 0.07, 0), fwd.clone().multiplyScalar(0.04), () => [0.6, 0.57, 0.64, 0.85]);
		props.box(c.clone().add(V3(0, bodyH * 0.35 - 0.25, 0)), sideV.clone().multiplyScalar(0.345), V3(0, 0.035, 0), fwd.clone().multiplyScalar(0.245), () => [0.42, 0.4, 0.48, 0.8]);
		occ.caps.push({ a: c.clone(), b: c.clone().add(V3(0, h, 0)), r: 0.3 });
	};

	// Yerleşim: son bölümün patikası (gövde dibinde 2-4 radyan) yakınına gölge veren nesneler
	const place = (th, r) => {
		const x = Math.cos(th) * r;
		const z = Math.sin(th) * r;
		return V3(x, groundY(x, z), z);
	};
	const around = [
		[2.3, 8.5, 'rock', 1.1],
		[3.0, 9.6, 'pine', 2.6],
		[3.7, 8.2, 'stone', 1.7],
		[4.6, 9.5, 'rock', 0.9],
		[1.5, 9.9, 'pine', 3.1],
		[0.6, 11.5, 'rock', 1.6],
		[5.5, 11, 'pine', 3.4],
		[6.0, 13.5, 'rock', 1.3],
		[2.6, 14.5, 'pine', 3.8],
		[4.0, 15.5, 'pine', 2.9],
		[1.0, 16, 'stone', 2.0],
		[5.1, 16.4, 'rock', 2.2],
		[3.3, 12.4, 'stone', 1.4],
	];
	for (const [th, r, kind, s] of around) {
		const p = place(th, r);
		if (kind === 'rock') boulder(p, s);
		else if (kind === 'pine') pine(p, s);
		else stone(p, s, th);
	}
	// kenarlara serpiştirilmiş küçük kayalar
	for (let k = 0; k < 16; k++) {
		const th = R() * TAU;
		const r = R.range(12, ISLAND_R - 1.5);
		boulder(place(th, r), R.range(0.35, 0.9));
	}
	// uzak kenarda birkaç küçük çam daha (siluet; patikadan uzak, gölgesi yetişmez ama kayıtlı)
	for (const [th, r, h] of [
		[0.15, 17.6, 2.2],
		[0.32, 18.2, 1.6],
		[5.85, 17.8, 2.5],
		[2.0, 17.9, 1.8],
	]) {
		pine(place(th, r), h);
	}

	// Oba: dilek bezleri bağlanmış direkli taş yığını (Kök Kapısı'na giden yolun yanında)
	{
		const th = gateTheta + 0.75;
		const c = place(th, 15.8);
		for (let k = 0; k < 9; k++) {
			const lvl = k < 5 ? 0 : k < 8 ? 1 : 2;
			const a = VR() * TAU;
			const d = [0.75, 0.42, 0][lvl] * VR.range(0.8, 1.1);
			const g = new THREE.IcosahedronGeometry(1, 1);
			const Pp = g.getAttribute('position');
			const base = props.count;
			const s = [0.45, 0.36, 0.3][lvl];
			const pc = c.clone().add(V3(Math.cos(a) * d, 0.1 + lvl * 0.42, Math.sin(a) * d));
			for (let v = 0; v < Pp.count; v++) {
				const p = V3(Pp.getX(v), Pp.getY(v) * 0.7, Pp.getZ(v));
				const n = p.clone().normalize();
				const sn = smoothstep(0.4, 0.7, n.y);
				props.vert(pc.x + p.x * s, pc.y + p.y * s, pc.z + p.z * s, n.x, n.y, n.z, lerp(0.6, 0.95, sn), lerp(0.57, 0.96, sn), lerp(0.66, 1.0, sn), 0.85, 0, 0);
			}
			for (let t = 0; t < Pp.count; t += 3) props.tri(base + t, base + t + 1, base + t + 2);
		}
		const p0 = c.clone().add(V3(0, 0.6, 0));
		const p1 = c.clone().add(V3(0, 3.1, 0));
		props.tube([p0, p1], [0.07, 0.05], 6, () => [0.45, 0.32, 0.22, 1]);
		const cols = [
			[0.24, 0.47, 0.8],
			[0.93, 0.92, 0.88],
			[0.86, 0.22, 0.2],
			[0.28, 0.62, 0.38],
			[0.95, 0.76, 0.26],
		];
		// tepeden aşağı sarkan bez şeritleri (iki yüzlü)
		for (let k = 0; k < 10; k++) {
			const a = (k / 10) * TAU;
			const top0 = p1.clone().add(V3(0, -0.05 - (k % 2) * 0.12, 0));
			const end = c.clone().add(V3(Math.cos(a) * 1.6, 0.35, Math.sin(a) * 1.6));
			const dir = end.clone().sub(top0);
			const side = V3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.06);
			const n0 = new THREE.Vector3().crossVectors(dir, side).normalize();
			const col = cols[k % cols.length];
			for (const sg of [1, -1]) {
				const st = props.count;
				for (let q = 0; q <= 4; q++) {
					const f = q / 4;
					const p = top0.clone().lerp(end, f).add(V3(0, -Math.sin(f * Math.PI) * 0.25, 0));
					props.vert(p.x - side.x, p.y, p.z - side.z, n0.x * sg, n0.y * sg, n0.z * sg, col[0], col[1], col[2], 1, 0, 0);
					props.vert(p.x + side.x, p.y, p.z + side.z, n0.x * sg, n0.y * sg, n0.z * sg, col[0], col[1], col[2], 1, 0, 0);
				}
				for (let q = 0; q < 4; q++) props.quad(st + q * 2, st + q * 2 + 1, st + q * 2 + 3, st + q * 2 + 2);
			}
		}
		occ.caps.push({ a: c.clone(), b: p1.clone(), r: 0.55 });
	}

	// donmuş gölet: ortası derin mavi, kenara doğru açık; çevresinde kar seddi
	const pond = new Builder();
	{
		const c = place(0.2, 13.2);
		const PS = 40;
		const shape = (a) => 2.6 + 0.4 * noise1(a * 3 + 2) * 0 + 0.35 * Math.sin(3 * a + 0.7) + 0.2 * Math.sin(5 * a + 2.1);
		const cIdx = pond.vert(c.x, c.y + 0.03, c.z, 0, 1, 0, 0.36, 0.56, 0.82, 1, 0.5, 0.5);
		for (const f of [0.55, 1]) {
			for (let i = 0; i < PS; i++) {
				const a = (i / PS) * TAU;
				const rr = shape(a) * f;
				const k = f < 1 ? [0.5, 0.7, 0.92] : [0.74, 0.88, 1.0];
				pond.vert(c.x + Math.cos(a) * rr * 1.3, c.y + 0.03, c.z + Math.sin(a) * rr, 0, 1, 0, k[0], k[1], k[2], 1, 0, 0);
			}
		}
		for (let i = 0; i < PS; i++) {
			const i1 = (i + 1) % PS;
			pond.tri(cIdx, cIdx + 1 + i, cIdx + 1 + i1);
			pond.quad(cIdx + 1 + i, cIdx + 1 + PS + i, cIdx + 1 + PS + i1, cIdx + 1 + i1);
		}
		pond.fixWinding();
		// kar seddi (kenar halkası): ada üst yüzeyi malzemesiyle değil, kayalarla birlikte
		const sedP = [];
		for (let i = 0; i <= PS; i++) {
			const a = (i / PS) * TAU;
			const rr = shape(a) + 0.12;
			sedP.push(V3(c.x + Math.cos(a) * rr * 1.3, c.y + 0.02, c.z + Math.sin(a) * rr));
		}
		props.tube(sedP, sedP.map((_, i) => 0.16 + 0.06 * Math.sin(i * 1.7)), 5, () => [0.95, 0.97, 1.02, 1], { capEnd: false });
	}

	props.fixWinding();

	// ---- Kök Kapısı: gövdenin dibinde, patikanın bittiği yerde kemerli mürekkep geçidi ----
	const gate = new Builder();
	const gateFrame = new Builder();
	const gth = gateTheta;
	const gr = trunkSurfaceR(gth, 1.2);
	const gc = V3(Math.cos(gth) * (gr + 0.04), 0.0, Math.sin(gth) * (gr + 0.04));
	const outN = V3(Math.cos(gth), 0, Math.sin(gth));
	const side = V3(-Math.sin(gth), 0, Math.cos(gth));
	const GW = 1.25;
	const GH = 2.5;
	{
		// kemer biçimli düz yüzey (uv: 0..1)
		const steps = 24;
		const c0 = gate.vert(gc.x + outN.x * 0.02, gc.y + GH * 0.45, gc.z + outN.z * 0.02, outN.x, 0, outN.z, 1, 1, 1, 1, 0.5, 0.45);
		const pts = [];
		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			// alt sol → üst kemer → alt sağ
			let lx;
			let ly;
			if (t < 0.25) {
				lx = -GW;
				ly = (t / 0.25) * (GH - GW);
			} else if (t < 0.75) {
				const a = Math.PI - ((t - 0.25) / 0.5) * Math.PI;
				lx = Math.cos(a) * GW;
				ly = GH - GW + Math.sin(a) * GW;
			} else {
				lx = GW;
				ly = (1 - (t - 0.75) / 0.25) * (GH - GW);
			}
			pts.push([lx, ly]);
		}
		for (const [lx, ly] of pts) {
			const th = gth + lx / gr;
			const rr = trunkSurfaceR(th, ly) + 0.03;
			gate.vert(Math.cos(th) * rr, ly, Math.sin(th) * rr, outN.x, 0, outN.z, 1, 1, 1, 1, lx / (2 * GW) + 0.5, ly / GH);
		}
		for (let i = 0; i < steps; i++) gate.tri(c0, c0 + 1 + i, c0 + 2 + i);
		gate.fixWinding();
		// çerçeve: kemeri saran, birbirine dolanan kökler
		for (const sgn of [-1, 1]) {
			for (let layer = 0; layer < 2; layer++) {
				const ctrl = [];
				const off = layer * 0.22;
				for (let k = 0; k <= 10; k++) {
					const t = k / 10;
					const a = Math.PI * (sgn < 0 ? 1 - t * 0.56 : t * 0.56);
					const wob = Math.sin(t * 9 + layer * 2 + sgn) * 0.07 * layer;
					const lx = Math.cos(a) * (GW + 0.18 + off * 0.6 + wob);
					const ly = t < 0.01 ? -0.3 : GH - GW + Math.sin(a) * (GW + 0.2 + off + wob) * Math.min(1, t * 3);
					const th = gth + lx / gr;
					const rr = trunkSurfaceR(th, Math.max(ly, 0)) + 0.18 + layer * 0.08;
					ctrl.push(V3(Math.cos(th) * rr, Math.max(ly, -0.3), Math.sin(th) * rr));
				}
				const r0g = layer ? 0.18 : 0.34;
				gateFrame.tube(ctrl, ctrl.map((_, i) => lerp(r0g, r0g * 0.4, i / 10) * (1 + 0.12 * Math.sin(i * 1.9))), 7, () => (layer ? [0.62, 0.5, 0.42, 0.85] : [0.55, 0.42, 0.34, 0.85]));
			}
		}
		gateFrame.fixWinding();
	}

	return {
		top: top.build(),
		rock: rock.build(),
		props: props.build(),
		pond: pond.build(),
		gate: gate.build(),
		gateFrame: gateFrame.build(),
		gatePos: gc.clone().add(V3(0, GH * 0.45, 0)),
		gateOut: outN,
		gateSide: side,
		occ,
	};
}
