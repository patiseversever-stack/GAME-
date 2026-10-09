// Ağacın üstünde durduğu uçan ada: karla örtülü üst yüzey, katmanlı kaya karın, sarkan kökler,
// buz sarkıtları, kayalar, küçük kayınlar, balbal taşları, donmuş gölet ve Kök Kapısı.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { rng, TAU, clamp, smoothstep, lerp, noise1 } from '../core/math.js';
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

export function buildIsland(gateTheta) {
	const R = rng(77);
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
			// kar: hafif mavi-beyaz dalgalanma; gövde dibinde ve kayaların çevresinde hafif kirli
			const v = 0.93 + noise1(th * 9 + r * 0.7) * 0.04;
			const nearTrunk = 1 - smoothstep(0, 2.6, r - trunkSurfaceR(th, 0));
			const ao = 1 - 0.45 * nearTrunk;
			top.vert(x, y, z, n.x, n.y, n.z, v, v * 1.0, v * 1.04, ao, x * 0.08, z * 0.08);
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

	// ---- kaya karın: kenardan aşağı sivrilen, katmanlı ----
	const DEPTH = 27;
	const RR = 30;
	const prof = (t, th) => {
		const k = Math.pow(1 - t, 1.25);
		const lobes = 1 + 0.13 * noise1(th * 4.2 + t * 3) + 0.07 * noise1(th * 11 + t * 9);
		return (ISLAND_R + 0.3) * k * lobes * (t < 0.04 ? 1 + (0.04 - t) * 2 : 1);
	};
	for (let j = 0; j <= RR; j++) {
		const t = j / RR;
		const y = -0.75 - t * DEPTH + (t < 0.05 ? t * 6 : 0);
		for (let i = 0; i <= SEG; i++) {
			const th = (i / SEG) * TAU;
			const r = Math.max(0.15, prof(t, th));
			const e = 0.02;
			const dr = (prof(Math.min(1, t + e), th) - prof(Math.max(0, t - e), th)) / (2 * e * DEPTH);
			const n = V3(Math.cos(th), -dr, Math.sin(th)).normalize();
			// katman renkleri: üstte toprak kahvesi, aşağı doğru mor-gri kaya
			const band = 0.5 + 0.5 * Math.sin(y * 1.7 + noise1(th * 3) * 2);
			const cr = lerp(0.82, 0.62, t) * lerp(0.9, 1.05, band);
			const cg = lerp(0.7, 0.58, t) * lerp(0.9, 1.04, band);
			const cb = lerp(0.62, 0.68, t) * lerp(0.92, 1.03, band);
			rock.vert(Math.cos(th) * r, y, Math.sin(th) * r, n.x, n.y, n.z, cr, cg, cb, lerp(0.85, 0.5, t), (i / SEG) * 8, y * 0.12);
		}
	}
	for (let j = 0; j < RR; j++) {
		for (let i = 0; i < SEG; i++) {
			const a = j * ring + i;
			rock.quad(a, a + 1, a + ring + 1, a + ring);
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
	rock.fixWinding();

	// ---- sarkan kökler (adanın altından bulutlara) ----
	for (let k = 0; k < 16; k++) {
		const th = R() * TAU;
		const t = R.range(0.2, 0.7);
		const r = prof(t, th) * 0.96;
		const y = -0.75 - t * DEPTH;
		const L = R.range(6, 16);
		const pts = [];
		let x = Math.cos(th) * r;
		let z = Math.sin(th) * r;
		for (let s = 0; s <= 6; s++) {
			const f = s / 6;
			pts.push(V3(x, y - f * L, z));
			x += Math.cos(th) * R.range(-0.2, 0.6) + R.range(-0.4, 0.4);
			z += Math.sin(th) * R.range(-0.2, 0.6) + R.range(-0.4, 0.4);
		}
		rock.tube(pts, pts.map((_, i) => lerp(0.42, 0.05, i / 6)), 5, () => [0.5, 0.38, 0.32, 0.8]);
	}
	// buz sarkıtları: kenarın altında
	for (let k = 0; k < 70; k++) {
		const th = R() * TAU;
		const r = ISLAND_R + 0.15;
		const L = R.range(0.5, 2.2);
		const p0 = V3(Math.cos(th) * r, -0.9, Math.sin(th) * r);
		const p1 = p0.clone().add(V3(0, -L, 0));
		rock.tube([p0, p1], [R.range(0.08, 0.16), 0.01], 5, () => [0.78, 0.9, 1.05, 1]);
	}

	// ---- kayalar (kar şapkalı) ----
	const boulder = (c, s, sq = 0.65) => {
		const g = new THREE.IcosahedronGeometry(1, 2);
		const P = g.getAttribute('position');
		const base = props.count;
		const seed = R() * 100;
		for (let v = 0; v < P.count; v++) {
			const p = V3(P.getX(v), P.getY(v), P.getZ(v));
			const d = 1 + 0.18 * noise1(p.x * 3 + seed) + 0.12 * noise1(p.z * 4 + p.y * 2 + seed);
			p.multiplyScalar(d);
			p.y *= sq;
			const n = p.clone().normalize();
			const snow = smoothstep(0.35, 0.7, n.y);
			const w = p.multiplyScalar(s).add(c);
			props.vert(w.x, w.y, w.z, n.x, n.y, n.z, lerp(0.58, 0.95, snow), lerp(0.55, 0.96, snow), lerp(0.62, 1.02, snow), lerp(0.75, 1, n.y * 0.5 + 0.5), 0, 0);
		}
		const I = g.index ? g.index.array : null;
		if (I) for (let t = 0; t < I.length; t += 3) props.tri(base + I[t], base + I[t + 1], base + I[t + 2]);
		else for (let t = 0; t < P.count; t += 3) props.tri(base + t, base + t + 1, base + t + 2);
		occ.spheres.push({ c: c.clone().add(V3(0, s * sq * 0.1, 0)), r: s * 0.85, sy: sq });
	};

	// küçük çam: koyu yeşil koniler, karlı uçlar
	const pine = (c, h) => {
		props.tube([c.clone().add(V3(0, -0.3, 0)), c.clone().add(V3(0, h * 0.35, 0))], [0.16 * h * 0.3, 0.1 * h * 0.3], 6, () => [0.4, 0.3, 0.24, 0.8]);
		for (let k = 0; k < 4; k++) {
			const y0 = c.y + h * (0.2 + k * 0.2);
			const rr = h * (0.42 - k * 0.085);
			const cone = new THREE.ConeGeometry(rr, h * 0.36, 9, 1, true);
			const P = cone.getAttribute('position');
			const base = props.count;
			for (let v = 0; v < P.count; v++) {
				const p = V3(P.getX(v), P.getY(v) + y0 + h * 0.18, P.getZ(v)).add(V3(c.x, 0, c.z));
				const ny = 0.55;
				const n = V3(P.getX(v), ny * rr, P.getZ(v)).normalize();
				const snow = P.getY(v) > 0 ? 0.6 : 0.15;
				props.vert(p.x, p.y, p.z, n.x, n.y, n.z, lerp(0.16, 0.9, snow), lerp(0.32, 0.92, snow), lerp(0.24, 0.98, snow), 0.9, 0, 0);
			}
			const I = cone.index.array;
			for (let t = 0; t < I.length; t += 3) props.tri(base + I[t], base + I[t + 1], base + I[t + 2]);
		}
		occ.caps.push({ a: c.clone(), b: c.clone().add(V3(0, h, 0)), r: h * 0.22 });
	};

	// balbal taşı: dikili, üstü kar
	const stone = (c, h, rot) => {
		const ax = V3(Math.cos(rot) * 0.32, 0, Math.sin(rot) * 0.32);
		const az = V3(-Math.sin(rot) * 0.22, 0, Math.cos(rot) * 0.22);
		props.box(c.clone().add(V3(0, h * 0.5 - 0.2, 0)), ax, V3(0, h * 0.5, 0), az, (n) => (n.y > 0.5 ? [0.95, 0.96, 1.0, 1] : [0.62, 0.6, 0.66, 0.9]));
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
	// donmuş gölet
	const pond = new Builder();
	{
		const c = place(0.2, 13.2);
		const PS = 40;
		const cIdx = pond.vert(c.x, c.y + 0.03, c.z, 0, 1, 0, 0.55, 0.72, 0.9, 1, 0.5, 0.5);
		for (let i = 0; i <= PS; i++) {
			const a = (i / PS) * TAU;
			const rr = 2.6 + 0.4 * noise1(a * 3 + 2);
			pond.vert(c.x + Math.cos(a) * rr * 1.3, c.y + 0.03, c.z + Math.sin(a) * rr, 0, 1, 0, 0.66, 0.82, 0.98, 1, 0, 0);
		}
		for (let i = 0; i < PS; i++) pond.tri(cIdx, cIdx + 1 + i, cIdx + 2 + i);
		pond.fixWinding();
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
		// çerçeve: kemeri saran iki kök
		for (const sgn of [-1, 1]) {
			const ctrl = [];
			for (let k = 0; k <= 8; k++) {
				const t = k / 8;
				const a = Math.PI * (sgn < 0 ? 1 - t * 0.55 : t * 0.55);
				const lx = Math.cos(a) * (GW + 0.18);
				const ly = t < 0.01 ? -0.3 : GH - GW + Math.sin(a) * (GW + 0.2) * Math.min(1, t * 3);
				const th = gth + lx / gr;
				const rr = trunkSurfaceR(th, Math.max(ly, 0)) + 0.18;
				ctrl.push(V3(Math.cos(th) * rr, Math.max(ly, -0.3) + (k === 0 ? 0 : 0), Math.sin(th) * rr));
			}
			gateFrame.tube(ctrl, ctrl.map((_, i) => lerp(0.32, 0.14, i / 8)), 7, () => [0.55, 0.42, 0.34, 0.85]);
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
