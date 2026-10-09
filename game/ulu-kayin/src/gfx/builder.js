// Geometri kurucusu: bir dünya parçasını (gövde, dallar, patika...) tek bir BufferGeometry'de
// toplar. Böylece her parça tek çizim çağrısı olur.
//   renk özniteliği vec4: rgb albedo çarpanı (doğrusal), a ortam kapanması (AO).

import * as THREE from 'three';

export class Builder {
	constructor() {
		this.p = [];
		this.n = [];
		this.c = [];
		this.uv = [];
		this.sw = [];
		this.idx = [];
		this.hasSway = false;
		// Rüzgâr sallanması: sonraki köşeler bu çapa noktasına göre sallanır (w: ağırlık).
		this.sway = [0, 0, 0, 0];
	}

	get count() {
		return this.p.length / 3;
	}

	setSway(x, y, z, w) {
		this.sway[0] = x;
		this.sway[1] = y;
		this.sway[2] = z;
		this.sway[3] = w;
		if (w > 0) this.hasSway = true;
	}

	vert(x, y, z, nx, ny, nz, r, g, b, a, u = 0, v = 0) {
		this.p.push(x, y, z);
		this.n.push(nx, ny, nz);
		this.c.push(r, g, b, a);
		this.uv.push(u, v);
		this.sw.push(this.sway[0], this.sway[1], this.sway[2], this.sway[3]);
		return this.count - 1;
	}

	tri(a, b, c) {
		this.idx.push(a, b, c);
	}

	quad(a, b, c, d) {
		this.idx.push(a, b, c, a, c, d);
	}

	/**
	 * Bir eğri boyunca boru (dal, kök, halat). Çerçeve paralel taşımayla ilerler, burulma olmaz.
	 * pts: Vector3 dizisi, rad: her noktadaki yarıçap, col(i, t, angle) → [r,g,b,a].
	 */
	tube(pts, rad, segs, col, { uvScale = 1, capEnd = true, capStart = false, sway = null } = {}) {
		const n = pts.length;
		const T = new THREE.Vector3();
		const N = new THREE.Vector3();
		const B = new THREE.Vector3();
		const tmp = new THREE.Vector3();
		const start = this.count;
		let v = 0;
		for (let i = 0; i < n; i++) {
			const a = pts[Math.max(0, i - 1)];
			const b = pts[Math.min(n - 1, i + 1)];
			T.subVectors(b, a).normalize();
			if (i === 0) {
				tmp.set(0, 1, 0);
				if (Math.abs(T.dot(tmp)) > 0.9) tmp.set(1, 0, 0);
				N.crossVectors(T, tmp).normalize();
			} else {
				// paralel taşıma: önceki normalı yeni teğete dik hale getir
				N.sub(tmp.copy(T).multiplyScalar(N.dot(T))).normalize();
			}
			B.crossVectors(T, N).normalize();
			if (i > 0) v += pts[i].distanceTo(pts[i - 1]) / (Math.PI * 2 * Math.max(rad[i], 0.05)) * uvScale;
			if (sway) sway(i, i / (n - 1));
			for (let s = 0; s <= segs; s++) {
				const ang = (s / segs) * Math.PI * 2;
				const cx = Math.cos(ang);
				const sy = Math.sin(ang);
				const nx = N.x * cx + B.x * sy;
				const ny = N.y * cx + B.y * sy;
				const nz = N.z * cx + B.z * sy;
				const r = rad[i];
				const cc = col(i, i / (n - 1), ang, nx, ny, nz);
				this.vert(pts[i].x + nx * r, pts[i].y + ny * r, pts[i].z + nz * r, nx, ny, nz, cc[0], cc[1], cc[2], cc[3], s / segs, v);
			}
		}
		const ring = segs + 1;
		for (let i = 0; i < n - 1; i++) {
			for (let s = 0; s < segs; s++) {
				const a = start + i * ring + s;
				const b = a + ring;
				this.quad(a, b, b + 1, a + 1);
			}
		}
		const cap = (i, flip) => {
			const p = pts[i];
			const d = new THREE.Vector3().subVectors(pts[flip ? 1 : n - 1], pts[flip ? 0 : n - 2]).normalize();
			if (flip) d.negate();
			const cc = col(i, flip ? 0 : 1, 0, d.x, d.y, d.z);
			const c = this.vert(p.x, p.y, p.z, d.x, d.y, d.z, cc[0], cc[1], cc[2], cc[3], 0.5, v);
			const base = start + i * ring;
			for (let s = 0; s < segs; s++) {
				if (flip) this.tri(c, base + s + 1, base + s);
				else this.tri(c, base + s, base + s + 1);
			}
		};
		if (capEnd) cap(n - 1, false);
		if (capStart) cap(0, true);
	}

	/** Eksene hizalı olmayan kutu (merkez, üç yarı-eksen vektörü). */
	box(c, ax, ay, az, col) {
		const faces = [
			[ax, ay, az],
			[ax.clone().negate(), ay, az.clone().negate()],
			[az, ay, ax.clone().negate()],
			[az.clone().negate(), ay, ax],
			[ay, az, ax],
			[ay.clone().negate(), az.clone().negate(), ax],
		];
		for (const [nrm, u, w] of faces) {
			const n = nrm.clone().normalize();
			const cc = col(n);
			const corners = [
				[-1, -1],
				[1, -1],
				[1, 1],
				[-1, 1],
			].map(([a, b]) => {
				const p = c.clone().add(nrm).addScaledVector(w, a).addScaledVector(u, b);
				return this.vert(p.x, p.y, p.z, n.x, n.y, n.z, cc[0], cc[1], cc[2], cc[3], (a + 1) / 2, (b + 1) / 2);
			});
			// yönü normalle tutarlı yap
			const e1 = new THREE.Vector3().subVectors(this.at(corners[1]), this.at(corners[0]));
			const e2 = new THREE.Vector3().subVectors(this.at(corners[2]), this.at(corners[0]));
			if (e1.cross(e2).dot(n) >= 0) this.quad(corners[0], corners[1], corners[2], corners[3]);
			else this.quad(corners[0], corners[3], corners[2], corners[1]);
		}
	}

	/** Üçgen yönlerini köşe normaline göre düzeltir (arka yüz ayıklaması doğru çalışsın). */
	fixWinding() {
		const P = this.p;
		const N = this.n;
		const I = this.idx;
		for (let k = 0; k < I.length; k += 3) {
			const a = I[k] * 3;
			const b = I[k + 1] * 3;
			const c = I[k + 2] * 3;
			const e1x = P[b] - P[a];
			const e1y = P[b + 1] - P[a + 1];
			const e1z = P[b + 2] - P[a + 2];
			const e2x = P[c] - P[a];
			const e2y = P[c + 1] - P[a + 1];
			const e2z = P[c + 2] - P[a + 2];
			const cx = e1y * e2z - e1z * e2y;
			const cy = e1z * e2x - e1x * e2z;
			const cz = e1x * e2y - e1y * e2x;
			if (cx * N[a] + cy * N[a + 1] + cz * N[a + 2] < 0) {
				const t = I[k + 1];
				I[k + 1] = I[k + 2];
				I[k + 2] = t;
			}
		}
		return this;
	}

	at(i) {
		return new THREE.Vector3(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]);
	}

	build() {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 4));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
		if (this.hasSway) g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sw, 4));
		g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
		g.computeBoundingSphere();
		g.computeBoundingBox();
		return g;
	}
}
