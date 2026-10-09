// Oynanış gölge testi: bir noktadan güneşe doğru ışın atar; gövde, dallar, yaprak kümeleri,
// üstteki patika ve adadaki nesnelerle kesişiyor mu bakar. Ekrandaki gölge haritasıyla aynı
// şekilleri kullanır, ama GPU'dan veri okumaz (okuma mobilde takılma yapar).
// Bir karede ~6 ışın; hepsi birlikte milisaniyenin çok altında.

import { trunkSurfaceR } from '../world/tree.js';
import { trunkRadius, TRUNK_TOP, PATH_T, PATH_W } from '../world/layout.js';
import { windSway } from '../world/wind.js';

const _sw = { x: 0, y: 0, z: 0 };
const _range = { min: 0, max: 1e9 };

export class ShadowTester {
	constructor(world) {
		const occ = world.occluders;
		this.caps = occ.caps.map((c) => ({
			ax: c.a.x, ay: c.a.y, az: c.a.z, bx: c.b.x, by: c.b.y, bz: c.b.z, r: c.r,
			anchor: c.anchor || null, wa: c.wa || 0, wb: c.wb || 0,
			// sınır küresi (kaba eleme için)
			cx: (c.a.x + c.b.x) / 2, cy: (c.a.y + c.b.y) / 2, cz: (c.a.z + c.b.z) / 2,
			br: c.a.distanceTo(c.b) / 2 + c.r + 1.8 * Math.max(c.wa || 0, c.wb || 0),
		}));
		this.ells = occ.ellipsoids.map((e) => ({
			cx: e.c.x, cy: e.c.y, cz: e.c.z, rx: e.rx, ry: e.ry, rz: e.rz,
			anchor: e.anchor, w: e.w, br: Math.max(e.rx, e.ry, e.rz) + 1.8 * e.w,
		}));
		this.sph = occ.spheres.map((s) => ({ cx: s.c.x, cy: s.c.y, cz: s.c.z, rx: s.r, ry: s.r * s.sy, rz: s.r, br: s.r }));
		// patika tahtaları: 0.8 birimlik yönlendirilmiş kutular
		const cv = world.curve;
		this.slabs = [];
		for (let i = 0; i < cv.n - 4; i += 4) {
			const j = i + 2;
			const tx = cv.X[i + 4] - cv.X[i];
			const ty = cv.Y[i + 4] - cv.Y[i];
			const tz = cv.Z[i + 4] - cv.Z[i];
			const tl = Math.hypot(tx, ty, tz);
			const sx = cv.SX[j];
			const sz = cv.SZ[j];
			const inner = cv.R[j] - trunkRadius(cv.Y[j]) < 1.6 ? 1.15 : 0.95;
			const half = (inner + PATH_W / 2) / 2;
			const shift = (PATH_W / 2 - inner) / 2; // kutunun merkezi dışa kayar
			this.slabs.push({
				cx: cv.X[j] + sx * shift, cy: cv.Y[j] - PATH_T / 2, cz: cv.Z[j] + sz * shift,
				// eksenler: T (ilerleme), S (yan), U (yukarı)
				Tx: tx / tl, Ty: ty / tl, Tz: tz / tl, hT: tl / 2 + 0.02,
				Sx: sx, Sz: sz, hS: half,
				hU: PATH_T / 2 + 0.04,
				br: Math.hypot(tl / 2, half, PATH_T),
			});
		}
		this.t = 0;
	}

	/** Bir kare için rüzgâr zamanı (shader'daki uTime ile aynı). */
	setTime(t) {
		this.t = t;
	}

	/**
	 * p noktasından L (güneşe doğru birim vektör) yönündeki ışın engelleniyor mu?
	 * skip: test dışı bırakılacak yükseklik (Zifir'in kendi bastığı tahta).
	 */
	blocked(px, py, pz, L) {
		const Lx = L.x;
		const Ly = L.y;
		const Lz = L.z;
		// 1) gövde
		if (this._trunk(px, py, pz, Lx, Ly, Lz)) return true;
		// 2) patika tahtaları (üstteki kat)
		for (const s of this.slabs) {
			if (s.cy < py + 0.25) continue;
			if (!rayNearSphere(px, py, pz, Lx, Ly, Lz, s.cx, s.cy, s.cz, s.br)) continue;
			if (rayOBB(px, py, pz, Lx, Ly, Lz, s)) return true;
		}
		// 3) yaprak kümeleri (rüzgârla sallanmış konumda)
		for (const e of this.ells) {
			if (e.cy + e.br < py) continue;
			if (!rayNearSphere(px, py, pz, Lx, Ly, Lz, e.cx, e.cy, e.cz, e.br)) continue;
			windSway(e.anchor.x, e.anchor.y, e.anchor.z, e.w, this.t, _sw);
			if (rayEllipsoid(px, py, pz, Lx, Ly, Lz, e.cx + _sw.x, e.cy + _sw.y, e.cz + _sw.z, e.rx, e.ry, e.rz)) return true;
		}
		// 4) dallar ve adadaki dikili nesneler
		for (const c of this.caps) {
			if (Math.max(c.ay, c.by) + c.r + 2 < py) continue;
			if (!rayNearSphere(px, py, pz, Lx, Ly, Lz, c.cx, c.cy, c.cz, c.br)) continue;
			let ax = c.ax;
			let ay = c.ay;
			let az = c.az;
			let bx = c.bx;
			let by = c.by;
			let bz = c.bz;
			if (c.anchor && (c.wa > 0 || c.wb > 0)) {
				windSway(c.anchor.x, c.anchor.y, c.anchor.z, 1, this.t, _sw);
				ax += _sw.x * c.wa;
				ay += _sw.y * c.wa;
				az += _sw.z * c.wa;
				bx += _sw.x * c.wb;
				by += _sw.y * c.wb;
				bz += _sw.z * c.wb;
			}
			if (rayCapsule(px, py, pz, Lx, Ly, Lz, ax, ay, az, bx, by, bz, c.r)) return true;
		}
		// 5) kayalar
		for (const s of this.sph) {
			if (!rayNearSphere(px, py, pz, Lx, Ly, Lz, s.cx, s.cy, s.cz, s.br)) continue;
			if (rayEllipsoid(px, py, pz, Lx, Ly, Lz, s.cx, s.cy, s.cz, s.rx, s.ry, s.rz)) return true;
		}
		return false;
	}

	_trunk(px, py, pz, Lx, Ly, Lz) {
		const l2 = Lx * Lx + Lz * Lz;
		if (l2 < 1e-6) return false;
		// en yakın yatay yaklaşma
		const tStar = -(px * Lx + pz * Lz) / l2;
		if (tStar <= 0) return false;
		const cx = px + Lx * tStar;
		const cz = pz + Lz * tStar;
		const yS = py + Ly * tStar;
		if (yS > TRUNK_TOP + 2) return false;
		const dmin = Math.hypot(cx, cz);
		if (dmin > trunkRadius(Math.max(0, yS)) + 2.2) return false;
		// yüzeyi adım adım tara (kabuk dalgaları ve kök kanatları dahil)
		const span = 9 / Math.sqrt(l2);
		const t0 = Math.max(0, tStar - span);
		const t1 = tStar + span;
		const steps = 36;
		for (let k = 0; k <= steps; k++) {
			const t = t0 + ((t1 - t0) * k) / steps;
			const x = px + Lx * t;
			const y = py + Ly * t;
			const z = pz + Lz * t;
			if (y > TRUNK_TOP + 1) continue;
			const r = Math.hypot(x, z);
			if (r < trunkSurfaceR(Math.atan2(z, x), y) * 0.985) return true;
		}
		return false;
	}
}

function rayNearSphere(px, py, pz, Lx, Ly, Lz, cx, cy, cz, r) {
	const vx = cx - px;
	const vy = cy - py;
	const vz = cz - pz;
	const t = vx * Lx + vy * Ly + vz * Lz;
	if (t < -r) return false;
	const d2 = vx * vx + vy * vy + vz * vz - t * t;
	return d2 <= r * r;
}

function rayEllipsoid(px, py, pz, Lx, Ly, Lz, cx, cy, cz, rx, ry, rz) {
	const ox = (px - cx) / rx;
	const oy = (py - cy) / ry;
	const oz = (pz - cz) / rz;
	const dx = Lx / rx;
	const dy = Ly / ry;
	const dz = Lz / rz;
	const a = dx * dx + dy * dy + dz * dz;
	const b = ox * dx + oy * dy + oz * dz;
	const c = ox * ox + oy * oy + oz * oz - 1;
	if (c < 0) return true; // nokta kümenin içinde
	const disc = b * b - a * c;
	if (disc < 0) return false;
	return -b - Math.sqrt(disc) > 0;
}

function rayCapsule(px, py, pz, Lx, Ly, Lz, ax, ay, az, bx, by, bz, r) {
	// ışın (p + tL, t>=0) ile AB doğru parçası arasındaki en kısa uzaklık ≤ r mi?
	const ux = bx - ax;
	const uy = by - ay;
	const uz = bz - az;
	const wx = px - ax;
	const wy = py - ay;
	const wz = pz - az;
	const a = Lx * Lx + Ly * Ly + Lz * Lz;
	const b = Lx * ux + Ly * uy + Lz * uz;
	const c = ux * ux + uy * uy + uz * uz;
	const d = Lx * wx + Ly * wy + Lz * wz;
	const e = ux * wx + uy * wy + uz * wz;
	const D = a * c - b * b;
	let sc;
	let tc;
	if (D < 1e-8) {
		sc = 0;
		tc = c > 1e-8 ? e / c : 0;
	} else {
		sc = (b * e - c * d) / D;
		tc = (a * e - b * d) / D;
	}
	if (sc < 0) {
		sc = 0;
		tc = c > 1e-8 ? e / c : 0;
	}
	if (tc < 0) {
		tc = 0;
		sc = Math.max(0, -d / a);
	} else if (tc > 1) {
		tc = 1;
		sc = Math.max(0, (b - d) / a);
	}
	const dx = wx + sc * Lx - tc * ux;
	const dy = wy + sc * Ly - tc * uy;
	const dz = wz + sc * Lz - tc * uz;
	return dx * dx + dy * dy + dz * dz <= r * r;
}

function rayOBB(px, py, pz, Lx, Ly, Lz, s) {
	// Eğimli tahta kutusu; eksenler T (ilerleme), S (yatay yan), dünya yukarısı (tahta neredeyse yatay).
	const ox = px - s.cx;
	const oy = py - s.cy;
	const oz = pz - s.cz;
	const r = _range;
	r.min = 0;
	r.max = 1e9;
	return (
		slab(s.Tx * ox + s.Ty * oy + s.Tz * oz, s.Tx * Lx + s.Ty * Ly + s.Tz * Lz, s.hT, r) &&
		slab(s.Sx * ox + s.Sz * oz, s.Sx * Lx + s.Sz * Lz, s.hS, r) &&
		slab(oy, Ly, s.hU, r) &&
		r.max > 0
	);
}

function slab(e, f, h, r) {
	if (Math.abs(f) < 1e-6) return Math.abs(e) <= h;
	let t1 = (-h - e) / f;
	let t2 = (h - e) / f;
	if (t1 > t2) {
		const t = t1;
		t1 = t2;
		t2 = t;
	}
	if (t1 > r.min) r.min = t1;
	if (t2 < r.max) r.max = t2;
	return r.min <= r.max;
}
