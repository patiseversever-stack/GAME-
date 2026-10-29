// Alçak çokgen maket kiti: kutu, silindir, koni, kubbe, torna, prizma… parçaları renk ve etiketle
// tek bir geometride birleştirir. Kaleler ve ünlü yapıların minyatürleri bununla kurulur; her biri
// tek çizim çağrısıdır.
//
//   const k = new Kit();
//   k.color('#e8d9b8').box(1, 0.4, 1, 0, 0, 0);
//   k.push().move(0, 0.4, 0).rot(0, 0.3, 0); k.color(0xff0000).cone(0.5, 0.8, 8); k.pop();
//   const geo = k.build(); // position, normal, color (doğrusal), tag
//
// Renkler sRGB onaltılık verilir, doğrusala çevrilerek saklanır. Varsayılan düz gölgeleme (yüzey
// normalleri): alçak çokgen maket görünümü. smooth(true) ile yumuşak normal.
//
// Ünlü yapılar için ek öznitelik `mat` (x malzeme kimliği, y yapı tabanından yükseklik, yerel birim):
//   k.base(y, 1 / ölçek) yapının zemin yüksekliğini bildirir; her köşenin tabandan yüksekliği pişirilir
//   (shader bununla ortam örtmesi ve gece projektör ışığı verir).
//   k.mat(id) malzeme kimliği (pencere, altın, kurşun, bayrak…; anlamı shader'da).
//   k.grad(renk0, renk1, y0, y1) taban yüksekliğine göre renk geçişi (kaya katmanı, güneş yanığı uç…).
//   k.drape(geo, yükseklik(x, z)) yere serilen parça: köşeler arazinin üstüne oturtulur.

import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Matrix3();
const _c = new THREE.Color();

export class Kit {
	constructor() {
		this.pos = [];
		this.nor = [];
		this.col = [];
		this.tag = [];
		this.anim = [];
		this.m = new THREE.Matrix4();
		this.stack = [];
		this._col = [1, 1, 1];
		this._tag = 0;
		this._anim = 0;
		this._smooth = false;
		this.mats = [];
		this._mat = 0;
		this._base = 0;
		this._hs = 0;
		this._grad = null;
		this.seg = 1; // segment çarpanı (düşük kademede azaltılır)
	}

	color(hex, k = 1) {
		_c.set(hex);
		this._col = [_c.r * k, _c.g * k, _c.b * k];
		this._grad = null;
		return this;
	}
	/** Malzeme kimliği (köşe özniteliği mat.x). */
	mat(id) {
		this._mat = id;
		return this;
	}
	/** Yapı tabanı: dünya y'si ve yükseklik ölçeği (1 / yapı ölçeği); 0 ölçek: yükseklik yazılmaz. */
	base(y, hs) {
		this._base = y;
		this._hs = hs;
		return this;
	}
	/** Tabandan yüksekliğe göre renk geçişi (yerel birim, y0 → y1). color() geçişi kapatır. */
	grad(a, b, y0, y1) {
		_c.set(a);
		const c0 = [_c.r, _c.g, _c.b];
		_c.set(b);
		this._col = c0;
		this._grad = [c0, [_c.r, _c.g, _c.b], y0, y1];
		return this;
	}
	/** Ham doğrusal renk (işaret değerleri için). */
	raw(r, g, b) {
		this._col = [r, g, b];
		return this;
	}
	setTag(t) {
		this._tag = t;
		return this;
	}
	setAnim(a) {
		this._anim = a;
		return this;
	}
	smooth(on) {
		this._smooth = on;
		return this;
	}

	push() {
		this.stack.push(this.m.clone());
		return this;
	}
	pop() {
		this.m.copy(this.stack.pop());
		return this;
	}
	move(x, y, z) {
		this.m.multiply(_m.makeTranslation(x, y, z));
		return this;
	}
	rot(x, y, z) {
		this.m.multiply(_m.makeRotationFromEuler(_e.set(x, y, z)));
		return this;
	}
	scale(x, y = x, z = x) {
		this.m.multiply(_m.makeScale(x, y, z));
		return this;
	}

	_n(n) {
		return Math.max(3, Math.round(n * this.seg));
	}

	/** THREE geometrisini geçerli dönüşüm, renk ve etiketle ekle. */
	add(geo, local = null) {
		let g = geo.index ? geo.toNonIndexed() : geo;
		if (local) g.applyMatrix4(local);
		g.applyMatrix4(this.m);
		if (!this._smooth || !g.getAttribute('normal')) {
			g.deleteAttribute('normal');
			g.computeVertexNormals();
		}
		this._push(g);
		geo.dispose();
		if (g !== geo) g.dispose();
		return this;
	}

	_push(g) {
		const p = g.getAttribute('position');
		const n = g.getAttribute('normal');
		const gr = this._grad;
		for (let i = 0; i < p.count; i++) {
			const y = p.getY(i);
			const h = (y - this._base) * this._hs;
			this.pos.push(p.getX(i), y, p.getZ(i));
			this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
			if (gr) {
				let t = Math.min(1, Math.max(0, (h - gr[2]) / (gr[3] - gr[2])));
				t = t * t * (3 - 2 * t);
				this.col.push(gr[0][0] + (gr[1][0] - gr[0][0]) * t, gr[0][1] + (gr[1][1] - gr[0][1]) * t, gr[0][2] + (gr[1][2] - gr[0][2]) * t);
			} else this.col.push(this._col[0], this._col[1], this._col[2]);
			this.tag.push(this._tag);
			this.anim.push(this._anim);
			this.mats.push(this._mat, h);
		}
	}

	/**
	 * Yere serilen parça: geometri geçerli dönüşümle yerleşir, sonra her köşe hf(x, z) arazi yüksekliğine
	 * oturtulur (yerel y, araziden yukarı uzaklık olarak korunur). Yalnızca y çevresinde dönmüş yığında.
	 */
	drape(geo, hf, lift = 0) {
		const g = geo.index ? geo.toNonIndexed() : geo;
		g.applyMatrix4(this.m);
		const y0 = this.m.elements[13];
		const p = g.getAttribute('position');
		for (let i = 0; i < p.count; i++) p.setY(i, hf(p.getX(i), p.getZ(i)) + (p.getY(i) - y0) + lift);
		g.deleteAttribute('normal');
		g.computeVertexNormals();
		const save = this._hs;
		this._hs = 0; // zemin: tabandan yükseklik 0 (örtme yok)
		this._push(g);
		this._hs = save;
		geo.dispose();
		if (g !== geo) g.dispose();
		return this;
	}

	_at(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
		return _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(sx, sy, sz)).clone();
	}

	/** Kutu: alt yüzü y'de. */
	box(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
		return this.add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), this._at(x, y, z, ry));
	}
	/** Silindir: alt yüzü y'de. */
	cyl(rt, rb, h, seg = 8, x = 0, y = 0, z = 0, open = false) {
		return this.add(new THREE.CylinderGeometry(rt, rb, h, this._n(seg), 1, open).translate(0, h / 2, 0), this._at(x, y, z));
	}
	cone(r, h, seg = 8, x = 0, y = 0, z = 0, ry = 0) {
		return this.add(new THREE.ConeGeometry(r, h, this._n(seg), 1, true).translate(0, h / 2, 0), this._at(x, y, z, ry));
	}
	/** Yarım küre kubbe (yassılık sy). */
	dome(r, seg = 10, x = 0, y = 0, z = 0, sy = 1) {
		const n = this._n(seg);
		return this.add(new THREE.SphereGeometry(r, n, Math.max(2, Math.round(n / 2)), 0, Math.PI * 2, 0, Math.PI / 2), this._at(x, y, z, 0, 1, sy, 1));
	}
	sphere(r, seg = 8, x = 0, y = 0, z = 0, sy = 1) {
		const n = this._n(seg);
		return this.add(new THREE.SphereGeometry(r, n, Math.max(3, Math.round(n * 0.6))), this._at(x, y, z, 0, 1, sy, 1));
	}
	ico(r, x = 0, y = 0, z = 0, sy = 1, detail = 0) {
		return this.add(new THREE.IcosahedronGeometry(r, detail), this._at(x, y, z, 0, 1, sy, 1));
	}
	/** Torna: [yarıçap, y] noktaları. */
	lathe(pts, seg = 10, x = 0, y = 0, z = 0) {
		return this.add(new THREE.LatheGeometry(pts.map(([r, yy]) => new THREE.Vector2(r, yy)), this._n(seg)), this._at(x, y, z));
	}
	/** Çokgen prizma: [[x, z], ...] tabanlı, h yüksekliğinde (alt y). */
	prism(pts, h, x = 0, y = 0, z = 0, ry = 0) {
		const s = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
		const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
		g.rotateX(-Math.PI / 2);
		g.deleteAttribute('uv');
		return this.add(g, this._at(x, y, z, ry));
	}
	/** Ön yüzü XY düzleminde çizilmiş şekli z boyunca d kalınlıkta çıkar (kemerli cephe, kapı…). */
	slab(shape, d, x = 0, y = 0, z = 0, ry = 0) {
		const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: Math.max(3, Math.round(6 * this.seg)) });
		g.translate(0, 0, -d / 2);
		g.deleteAttribute('uv');
		return this.add(g, this._at(x, y, z, ry));
	}
	/** Mazgallı duvar üstü: (x0,z0)→(x1,z1) boyunca dişler. */
	merlons(x0, z0, x1, z1, y, h = 0.07, w = 0.07, t = 0.08, gap = 0.06) {
		const L = Math.hypot(x1 - x0, z1 - z0);
		const n = Math.max(1, Math.floor(L / (w + gap)));
		const ry = -Math.atan2(z1 - z0, x1 - x0);
		for (let i = 0; i < n; i++) {
			const t0 = (i + 0.5) / n;
			this.box(w, h, t, x0 + (x1 - x0) * t0, y, z0 + (z1 - z0) * t0, ry);
		}
		return this;
	}
	/** Silindir başına mazgal halkası. */
	merlonRing(r, y, n = 10, h = 0.07, w = 0.07, t = 0.07) {
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			this.box(w, h, t, Math.cos(a) * r, y, Math.sin(a) * r, -a);
		}
		return this;
	}

	get count() {
		return this.pos.length / 3;
	}

	build() {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
		g.setAttribute('tag', new THREE.Float32BufferAttribute(this.tag, 1));
		g.setAttribute('anim', new THREE.Float32BufferAttribute(this.anim, 1));
		if (this.mats.some((v) => v !== 0)) g.setAttribute('mat', new THREE.Float32BufferAttribute(this.mats, 2));
		g.computeBoundingSphere();
		return g;
	}
}

/** Kemerli açıklık şekli (XY): genişlik w, yükseklik h (kemer dahil), taban y = 0. */
export function archShape(w, h) {
	const s = new THREE.Shape();
	const r = w / 2;
	s.moveTo(-r, 0);
	s.lineTo(-r, h - r);
	s.absarc(0, h - r, r, Math.PI, 0, true);
	s.lineTo(r, 0);
	s.lineTo(-r, 0);
	return s;
}

/** Dikdörtgen cephe içinde kemerli boşluklar (ön yüz). */
export function facadeShape(W, H, arches) {
	const s = new THREE.Shape();
	s.moveTo(-W / 2, 0);
	s.lineTo(W / 2, 0);
	s.lineTo(W / 2, H);
	s.lineTo(-W / 2, H);
	s.lineTo(-W / 2, 0);
	for (const [cx, w, h, y0 = 0] of arches) {
		const p = new THREE.Path();
		const r = w / 2;
		p.moveTo(cx - r, y0);
		p.lineTo(cx + r, y0);
		p.lineTo(cx + r, y0 + h - r);
		p.absarc(cx, y0 + h - r, r, 0, Math.PI, false);
		p.lineTo(cx - r, y0);
		s.holes.push(p);
	}
	return s;
}
