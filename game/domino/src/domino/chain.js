// Zincir kurucu: bölüm tarifinden domino dizileri üretir.
//
//   line   : eğri boyunca eşit aralıklı taşlar (Catmull-Rom), renk deseni
//   stairs : her taş bir öncekinden büyük (küçük taş dev taşı devirir)
//   field  : ızgara; devrilince arka yüzlerden resim çıkar (domino sanatı)
//   link   : bir dizinin sonunu diğerinin başına bağlar (çatal: iki kez bağlanır)

import * as THREE from 'three';

const _c = new THREE.Color();

/** Catmull-Rom eğrisini yay uzunluğuna göre örnekler: [{x, z, yaw, s}] */
export function samplePath(pts, spacing, { closed = false } = {}) {
	const v = pts.map((p) => new THREE.Vector3(p[0], 0, p[1]));
	const curve = new THREE.CatmullRomCurve3(v, closed, 'centripetal', 0.5);
	const L = curve.getLength();
	const n = Math.max(2, Math.floor(L / spacing) + 1);
	const out = [];
	const p = new THREE.Vector3();
	const t = new THREE.Vector3();
	for (let i = 0; i < n; i++) {
		const u = curve.getUtoTmapping(Math.min(1, (i * spacing) / L));
		curve.getPoint(u, p);
		curve.getTangent(u, t);
		out.push({ x: p.x, z: p.z, yaw: Math.atan2(t.x, t.z), s: i * spacing });
	}
	return { pts: out, length: L, curve };
}

/** Renk deseni: tek renk, gökkuşağı akışı ya da tekrar eden palet. */
export function paint(spec, i, n) {
	if (typeof spec === 'function') return spec(i, n);
	if (spec && spec.rainbow) {
		const h = (spec.offset || 0) + (i / (spec.period || 40)) % 1;
		_c.setHSL(h % 1, spec.sat ?? 0.78, spec.light ?? 0.56);
		return _c.clone();
	}
	if (Array.isArray(spec)) return new THREE.Color(spec[Math.floor(i / (spec.run || 1)) % spec.length]);
	return new THREE.Color(spec ?? 0xffffff);
}

export class ChainBuilder {
	constructor(dominoes) {
		this.d = dominoes;
		this.seqAt = 0;
		this.roads = []; // yere çizilecek yol izleri: [{pts:[[x,z]...], w}]
	}

	/**
	 * Eğri boyunca dizi. opt: {spacing, size, colors, back, from, seq}
	 *   from: bu dizinin ilk taşını itecek taş (bağlanır)
	 */
	line(points, opt = {}) {
		const d = this.d;
		const size = opt.size ?? 1;
		const spacing = (opt.spacing ?? 0.6) * size;
		const { pts } = samplePath(points, spacing);
		const idx = [];
		const seq0 = opt.from != null ? d.seq[opt.from] + spacing : opt.seq ?? 0;
		for (let i = 0; i < pts.length; i++) {
			const p = pts[i];
			const cA = paint(opt.colors, i, pts.length);
			const cB = opt.back ? paint(opt.back, i, pts.length) : cA;
			const k = d.add(p.x, p.z, p.yaw, size, cA, cB);
			d.seq[k] = seq0 + p.s;
			if (i > 0) d.link(idx[i - 1], k);
			idx.push(k);
		}
		if (opt.from != null) d.link(opt.from, idx[0]);
		if (opt.road !== false) this.roads.push({ pts: points, w: opt.roadW ?? 2.6 });
		return { first: idx[0], last: idx[idx.length - 1], idx };
	}

	/** Büyüyen taşlar: başlangıç noktası, yön, adım sayısı, büyüme oranı. */
	stairs(x, z, yaw, steps, grow, opt = {}) {
		const d = this.d;
		const idx = [];
		let size = opt.size ?? 1;
		let px = x;
		let pz = z;
		const fx = Math.sin(yaw);
		const fz = Math.cos(yaw);
		let seq = opt.from != null ? d.seq[opt.from] + 0.6 : 0;
		for (let i = 0; i < steps; i++) {
			const c = paint(opt.colors, i, steps);
			const k = d.add(px, pz, yaw, size, c, opt.back ? paint(opt.back, i, steps) : c);
			d.seq[k] = seq;
			if (i > 0) d.link(idx[i - 1], k);
			idx.push(k);
			const next = size * grow;
			// aralık: önceki taşın boyunun ~%55'i (ucunun rahatça yetişeceği kadar)
			const step = size * 0.16 * 0.5 + size * 0.55 + next * 0.16 * 0.5;
			px += fx * step;
			pz += fz * step;
			seq += step;
			size = next;
		}
		if (opt.from != null) d.link(opt.from, idx[0]);
		return { first: idx[0], last: idx[idx.length - 1], idx };
	}

	/**
	 * Resim alanı: cols × rows taş, (x, z) sol ön köşe, yaw düşme yönü.
	 * img(c, r) → [önRengi, arkaRengi]. Giriş taşı ilk sıranın ortasını iter; ilk sıra iki yana
	 * yayılır, her sütun kendi içinde ileri devrilir: resim dalga gibi açılır.
	 */
	field(x, z, yaw, cols, rows, img, opt = {}) {
		const d = this.d;
		const size = opt.size ?? 0.8;
		const sx = opt.sx ?? 0.52 * size * 1.25;
		const sz = opt.sz ?? 0.6 * size;
		const fx = Math.sin(yaw);
		const fz = Math.cos(yaw);
		const rx = fz; // sağ yön
		const rz = -fx;
		const grid = [];
		const seq0 = opt.from != null ? d.seq[opt.from] + 0.6 : 0;
		for (let r = 0; r < rows; r++) {
			grid.push([]);
			for (let c = 0; c < cols; c++) {
				const [a, b] = img(c, r);
				const px = x + rx * (c - (cols - 1) / 2) * sx + fx * r * sz;
				const pz = z + rz * (c - (cols - 1) / 2) * sx + fz * r * sz;
				const k = d.add(px, pz, yaw, size, a, b);
				d.seq[k] = seq0 + r * sz + Math.abs(c - (cols - 1) / 2) * sx * 0.6;
				grid[r].push(k);
			}
		}
		const mid = Math.floor(cols / 2);
		for (let r = 0; r < rows; r++)
			for (let c = 0; c < cols; c++) {
				if (r + 1 < rows) d.link(grid[r][c], grid[r + 1][c]);
				if (r === 0 && c !== mid && c !== mid - 1) {
					// ilk sırada yana yayılma: komşu belli bir açıya gelince bu taş da devrilir
					const from = grid[0][c > mid ? c - 1 : c + 1];
					d.link(from, grid[0][c], { reach: 0.3, soft: true });
				}
			}
		// giriş taşı ortadaki iki taşı birden iter; ilk sıra oradan iki yana açılır
		if (opt.from != null) {
			d.link(opt.from, grid[0][mid]);
			if (cols > 1) d.link(opt.from, grid[0][mid - 1]);
		}
		return { first: grid[0][mid], grid, idx: grid.flat() };
	}
}
