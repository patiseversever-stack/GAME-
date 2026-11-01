// TASLAK (doku-taslak): yakın çekimde haritanın "canlı minyatür" hayatı. Köyler (evler, cami, kavak), traktör
// (römorklu; tarlada sıra boyunca gidip U dönüşüyle döner), biçerdöver, sürü (koyun, keçi, inek; çoban ve köpek),
// yel değirmeni (Bodrum: yelkenleri döner), rüzgâr türbini (Ege sırtları: kanatlar döner), işçiler (çay toplayıcı,
// bahçe işçisi: eğilip kalkar), tınaz, arı kovanı.
//
// Maliyet:
//   - Tek örneklemeli çizim (+ gölge geçişinde tek çizim). Bütün modeller bir kayan nokta doku atlasında (her tür bir
//     satır, köşe başına 3 piksel: konum + parça, renk + boya yuvası, mil/eksen + alt kimlik); köşe gölgelendiricisi
//     gl_VertexID ile okur. Her tür aynı köşe yuvasında (SLOT): boş köşeler kırpılır (piksel işi yok).
//   - Akış: bütün örnekler açılışta yerleşir (ızgara hücrelerine dizili). Kamera bir hücre kayınca ya da yakınlık
//     basamağı değişince yalnızca yakındaki örnekler önceden ayrılmış tampona kopyalanır (kare başına nesne yok,
//     çoğu karede hiç iş yok). Uzak görünümde çizim kapalı (0 çağrı, 0 üçgen).
//   - Canlandırma yalnızca köşe gölgelendiricisinde (uTime): kare başına CPU işi yok.
//   - Uzaklıkla söner: küçük türler (koyun, işçi) yalnız çok yakında, büyükler (türbin) daha uzaktan; sönen örnek
//     yerden büyüyerek belirir.
//   - Tarla düzeni shader'daki ile aynı (tarla.js fieldAt): traktör sürülen tarlada, biçerdöver buğdayda, sürü merada,
//     köy shader'ın harman yeri çizdiği bölge köşesinde.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV, CLEAR } from '../gfx/shaderlib.js';
import { rng } from '../core/math.js';
import { profileOf, fieldAt, VIL } from './tarla.js';
import DATA from '../data/turkiye.json';

const SLOT = 480; // köşe yuvası (160 üçgen)
const CAP = 320; // aynı anda çizilen en çok örnek
const CELL = 4; // akış ızgarası (birim)
const K = { KOY: 0, TRAKTOR: 1, BICER: 2, SURU: 3, DEGIRMEN: 4, TURBIN: 5, ISCI: 6, TINAZ: 7, KOVAN: 8 };
const NK = 9;
// tür başına sönme uzaklığı (kameraya): [tam görünür, kayıp]
const FADE = [
	[13, 18], // köy
	[11, 15], // traktör
	[11, 15], // biçerdöver
	[9, 12.5], // sürü
	[18, 26], // yel değirmeni
	[20, 28], // türbin
	[8, 11.5], // işçi
	[9.5, 13.5], // tınaz
	[8, 11.5], // kovan
];
const MAXD = 28;

// parça kimlikleri (köşe gölgelendiricisinde canlandırma)
const PART = { STATIC: 0, ROTOR: 1, BODY: 2, HEAD: 3, BEND: 4, RIDGE: 5, LAMP: 7 };
// boya yuvaları: örneğin türüne göre değişen renkler (uPal)
const SL = { NONE: 0, WALL: 1, ROOF: 2, VEH: 3, ANIM: 4, AHEAD: 5 };

// ------------------------------------------------------------------ model kurucu

const _v = new THREE.Vector3();
class MB {
	constructor() {
		this.out = [];
		this.m = new THREE.Matrix4();
		this.stack = [];
		this.col = [1, 1, 1];
		this.part = 0;
		this.sub = 0;
		this.slot = 0;
		this.piv = [0, 0, 0];
	}
	color(hex) {
		const c = new THREE.Color(hex);
		this.col = [c.r, c.g, c.b];
		this.slot = 0;
		return this;
	}
	tint(slot) {
		this.slot = slot;
		this.col = [1, 1, 1];
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
		this.m.multiply(new THREE.Matrix4().makeTranslation(x, y, z));
		return this;
	}
	rotY(a) {
		this.m.multiply(new THREE.Matrix4().makeRotationY(a));
		return this;
	}
	scale(k) {
		this.m.multiply(new THREE.Matrix4().makeScale(k, k, k));
		return this;
	}
	rotX(a) {
		this.m.multiply(new THREE.Matrix4().makeRotationX(a));
		return this;
	}
	rotZ(a) {
		this.m.multiply(new THREE.Matrix4().makeRotationZ(a));
		return this;
	}
	/** Mil / eksen noktası (geçerli dönüşümde): döner kanat, hayvan gövdesi, eğilen bel. */
	pivot(x, y, z) {
		_v.set(x, y, z).applyMatrix4(this.m);
		this.piv = [_v.x, _v.y, _v.z];
		return this;
	}
	set(part, sub = this.sub) {
		this.part = part;
		this.sub = sub;
		return this;
	}
	_p(p) {
		_v.set(p[0], p[1], p[2]).applyMatrix4(this.m);
		return [_v.x, _v.y, _v.z];
	}
	/** Dışa bakan yüz (ref: cismin içinde bir nokta, yerel): üçgen yelpazesi, yön kendiliğinden düzelir. */
	face(pts, ref, part = this.part, aux = null) {
		const P = pts.map((p) => this._p(p));
		const R = this._p(ref);
		const a = P[0];
		const b = P[1];
		const c = P[2];
		const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
		let cx = 0;
		let cy = 0;
		let cz = 0;
		for (const p of P) {
			cx += p[0] / P.length;
			cy += p[1] / P.length;
			cz += p[2] / P.length;
		}
		const flip = n[0] * (cx - R[0]) + n[1] * (cy - R[1]) + n[2] * (cz - R[2]) < 0;
		const idx = P.map((_, i) => i);
		if (flip) idx.reverse();
		for (let i = 1; i + 1 < idx.length; i++) for (const j of [idx[0], idx[i], idx[i + 1]]) this._emit(P[j], aux ? aux[j] : part);
		return this;
	}
	/** Çift yüzlü ince yüzey (kanat, yelken). */
	sheet(pts) {
		const P = pts.map((p) => this._p(p));
		for (let i = 1; i + 1 < P.length; i++) {
			for (const j of [0, i, i + 1]) this._emit(P[j], this.part);
			for (const j of [0, i + 1, i]) this._emit(P[j], this.part);
		}
		return this;
	}
	_emit(p, part) {
		const isRidge = typeof part === 'object';
		this.out.push([p[0], p[1], p[2], isRidge ? PART.RIDGE : part, this.col[0], this.col[1], this.col[2], this.slot, ...(isRidge ? [0, part.drop, 0] : this.piv), this.sub]);
	}
	/** Kutu (alt yüzsüz), taban y = 0, x/z ortalı. */
	box(w, h, d) {
		const x = w / 2;
		const z = d / 2;
		const ref = [0, h / 2, 0];
		this.face([[-x, h, -z], [-x, h, z], [x, h, z], [x, h, -z]], ref);
		this.face([[-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z]], ref);
		this.face([[x, 0, -z], [-x, 0, -z], [-x, h, -z], [x, h, -z]], ref);
		this.face([[x, 0, z], [x, 0, -z], [x, h, -z], [x, h, z]], ref);
		this.face([[-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z]], ref);
		return this;
	}
	/** Üstü ayrı renkli kutu (römork yükü, kovan kapağı). */
	boxT(w, h, d, top) {
		const x = w / 2;
		const z = d / 2;
		const ref = [0, h / 2, 0];
		const keep = this.col;
		this.face([[-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z]], ref);
		this.face([[x, 0, -z], [-x, 0, -z], [-x, h, -z], [x, h, -z]], ref);
		this.face([[x, 0, z], [x, 0, -z], [x, h, -z], [x, h, z]], ref);
		this.face([[-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z]], ref);
		this.color(top).face([[-x, h, -z], [-x, h, z], [x, h, z], [x, h, -z]], ref);
		this.col = keep;
		return this;
	}
	/** Tek yüz (yerel düzlemde çokgen, dışa bakışı ref'ten). */
	poly(pts, ref) {
		return this.face(pts, ref);
	}
	/** Beşik çatı: taban y = 0 (w × d), mahya x boyunca h yükseklikte. Mahya köşeleri düz damda iner (RIDGE). */
	roof(w, d, h) {
		const x = w / 2;
		const z = d / 2;
		const ref = [0, h * 0.3, 0];
		const R = { drop: h };
		const n = this.part;
		this.face([[-x, 0, z], [x, 0, z], [x, h, 0], [-x, h, 0]], ref, n, [n, n, R, R]);
		this.face([[x, 0, -z], [-x, 0, -z], [-x, h, 0], [x, h, 0]], ref, n, [n, n, R, R]);
		this.face([[x, 0, z], [x, 0, -z], [x, h, 0]], ref, n, [n, n, R]);
		this.face([[-x, 0, -z], [-x, 0, z], [-x, h, 0]], ref, n, [n, n, R]);
		return this;
	}
	/** Silindir / kesik koni (alt kapaksız, üst kapaklı), eksen y. */
	cyl(r0, r1, h, n, cap = true) {
		const ref = [0, h / 2, 0];
		for (let i = 0; i < n; i++) {
			const a0 = (i / n) * Math.PI * 2;
			const a1 = ((i + 1) / n) * Math.PI * 2;
			this.face([[Math.cos(a0) * r0, 0, Math.sin(a0) * r0], [Math.cos(a1) * r0, 0, Math.sin(a1) * r0], [Math.cos(a1) * r1, h, Math.sin(a1) * r1], [Math.cos(a0) * r1, h, Math.sin(a0) * r1]], ref);
		}
		if (cap && r1 > 1e-5) {
			const pts = [];
			for (let i = 0; i < n; i++) pts.push([Math.cos((i / n) * Math.PI * 2) * r1, h, Math.sin((i / n) * Math.PI * 2) * r1]);
			this.face(pts, ref);
		}
		return this;
	}
	cone(r, h, n) {
		const ref = [0, h * 0.25, 0];
		for (let i = 0; i < n; i++) {
			const a0 = (i / n) * Math.PI * 2;
			const a1 = ((i + 1) / n) * Math.PI * 2;
			this.face([[Math.cos(a0) * r, 0, Math.sin(a0) * r], [Math.cos(a1) * r, 0, Math.sin(a1) * r], [0, h, 0]], ref);
		}
		return this;
	}
	/** Sekizyüzlü (baş, taç). */
	octa(r, sy = 1) {
		const ref = [0, 0, 0];
		const t = [0, r * sy, 0];
		const b = [0, -r * sy, 0];
		const e = [[r, 0, 0], [0, 0, r], [-r, 0, 0], [0, 0, -r]];
		for (let i = 0; i < 4; i++) {
			this.face([e[i], e[(i + 1) % 4], t], ref);
			this.face([e[(i + 1) % 4], e[i], b], ref);
		}
		return this;
	}
	/** Kare piramit (tabansız): +x yönüne bakan baş (hayvan). */
	snout(l, w, h) {
		const ref = [l * 0.25, 0, 0];
		const tip = [l, 0, 0];
		const q = [[0, h, w], [0, h, -w], [0, -h, -w], [0, -h, w]];
		for (let i = 0; i < 4; i++) this.face([q[i], q[(i + 1) % 4], tip], ref);
		return this;
	}
	get tris() {
		return this.out.length / 3;
	}
}

// ------------------------------------------------------------------ modeller (yerel birim; +x ileri, y yukarı)

function house(b, w, d, h, rh) {
	// temel toprağın altına iner: eğimli yerde ev havada kalmaz
	b.pivot(0, 0, 0);
	b.push().move(0, -0.05, 0).tint(SL.WALL).box(w, h + 0.05, d).pop();
	b.push().move(0, h, 0).tint(SL.ROOF).roof(w * 1.12, d * 1.16, rh).pop();
}

function makeVillage() {
	const b = new MB();
	// evler (alt kimlik: ev sırası; küçük mezrada bazıları yok), meydanın çevresinde
	const H = [
		[-0.14, 0.06, 0.3, 0.13, 0.095, 0.075],
		[0.07, -0.13, -0.2, 0.12, 0.085, 0.07],
		[0.17, 0.09, 1.4, 0.11, 0.08, 0.065],
		[-0.03, 0.18, 0.1, 0.125, 0.09, 0.07],
		[-0.21, -0.14, 1.2, 0.1, 0.08, 0.065],
		[0.24, -0.06, 0.7, 0.1, 0.075, 0.06],
		[-0.08, -0.24, 2.0, 0.11, 0.08, 0.065],
	];
	H.forEach(([x, z, ry, w, d, h], i) => {
		b.set(PART.STATIC, i + 1);
		b.push().move(x, 0, z).rotY(ry);
		house(b, w, d, h, 0.045);
		b.pop();
	});
	// cami: harim, kurşun kubbe, minare (alt kimlik 10: küçük köyde yok)
	b.set(PART.STATIC, 10);
	b.push().move(0.05, 0, 0.02).rotY(0.4).pivot(0, 0, 0);
	b.push().move(0, -0.05, 0).color('#efebe2').box(0.1, 0.105, 0.085).pop();
	b.push().move(0, 0.055, 0).color('#8d98a3').cone(0.042, 0.03, 6).pop();
	b.push().move(0.065, 0, -0.035).color('#f2efe8').cyl(0.011, 0.009, 0.2, 6, false);
	b.move(0, 0.2, 0).color('#7f8b97').cone(0.014, 0.05, 6).pop();
	b.pop();
	// kavaklar (alt kimlik 11: hep var)
	b.set(PART.STATIC, 11);
	b.push().move(-0.27, 0, 0.13).pivot(0, 0, 0).color('#3c7432').cone(0.022, 0.24, 5).pop();
	b.push().move(0.28, 0, 0.16).pivot(0, 0, 0).color('#447a36').cone(0.02, 0.21, 5).pop();
	return b;
}

function makeTractor() {
	const b = new MB();
	// traktör (gövde boyası örneğe göre: kırmızı, mavi, yeşil, turuncu), saman yüklü römork: 144 üçgen
	b.set(PART.STATIC, 0);
	b.push().move(0.058, 0.026, 0).tint(SL.VEH).box(0.07, 0.04, 0.04).pop(); // motor kaputu
	b.push().move(0.0, 0.03, 0).tint(SL.VEH).box(0.055, 0.025, 0.056).pop(); // çamurluk gövdesi
	b.push().move(-0.004, 0.055, 0).color('#9cc6db').box(0.045, 0.04, 0.042).pop(); // kabin camı
	b.push().move(-0.004, 0.095, 0).tint(SL.VEH).box(0.056, 0.008, 0.054).pop(); // kabin tavanı
	for (const s of [-1, 1]) {
		// arka büyük teker (altıgen, dış kapaklı) ve sarı jant; ön küçük teker
		b.push().move(-0.004, 0.03, s * 0.034).rotX((s * Math.PI) / 2).color('#232220').move(0, -0.009, 0).cyl(0.03, 0.03, 0.018, 6, true).pop();
		const hx = [];
		for (let i = 0; i < 6; i++) hx.push([Math.cos((i / 6) * Math.PI * 2) * 0.014, 0, Math.sin((i / 6) * Math.PI * 2) * 0.014]);
		b.push().move(-0.004, 0.03, s * 0.0435).rotX((s * Math.PI) / 2).color('#e2b43a').poly(hx, [0, -1, 0]).pop();
		b.push().move(0.075, 0.017, s * 0.03).rotX((s * Math.PI) / 2).color('#232220').move(0, -0.007, 0).cyl(0.017, 0.017, 0.014, 5, true).pop();
	}
	// farlar (gecede yanar)
	b.set(PART.LAMP, 0).color('#fff2c0').poly([[0.0935, 0.034, -0.016], [0.0935, 0.034, 0.016], [0.0935, 0.044, 0.016], [0.0935, 0.044, -0.016]], [0, 0.04, 0]);
	// römork: tahta kasa, üstü saman
	b.set(PART.STATIC, 0);
	b.push().move(-0.1, 0.02, 0).color('#8a5a34').boxT(0.09, 0.05, 0.062, '#dcbc66').pop();
	for (const s of [-1, 1]) b.push().move(-0.1, 0.018, s * 0.034).rotX((s * Math.PI) / 2).color('#232220').move(0, -0.006, 0).cyl(0.018, 0.018, 0.012, 5, true).pop();
	return b;
}

function makeCombine() {
	const b = new MB();
	b.set(PART.STATIC, 0);
	b.push().move(0, 0.03, 0).tint(SL.VEH).box(0.13, 0.065, 0.08).pop(); // gövde
	b.push().move(0.035, 0.095, 0.0).color('#a9d0e2').box(0.04, 0.035, 0.05).pop(); // kabin
	b.push().move(0.035, 0.13, 0).tint(SL.VEH).box(0.05, 0.007, 0.058).pop();
	b.push().move(-0.03, 0.095, 0).tint(SL.VEH).box(0.06, 0.03, 0.06).pop(); // tahıl deposu
	b.push().move(-0.02, 0.11, 0.045).rotX(-0.3).color('#d8d4c8').box(0.012, 0.012, 0.09).pop(); // boşaltma borusu
	b.push().move(0.095, 0.012, 0).color('#c9c4b6').box(0.035, 0.022, 0.2).pop(); // tabla
	b.push().move(0.1, 0.032, 0).rotX(Math.PI / 2).color('#d0402c').move(0, -0.095, 0).cyl(0.012, 0.012, 0.19, 5, false).pop(); // döner tırmık
	for (const s of [-1, 1]) {
		b.push().move(0.03, 0.026, s * 0.046).rotX((s * Math.PI) / 2).color('#232220').move(0, -0.008, 0).cyl(0.026, 0.026, 0.016, 6, true).pop();
		b.push().move(-0.045, 0.016, s * 0.044).rotX((s * Math.PI) / 2).color('#232220').move(0, -0.006, 0).cyl(0.016, 0.016, 0.012, 6, true).pop();
	}
	b.set(PART.LAMP, 0);
	b.push().move(0.056, 0.115, 0).color('#fff2c0').box(0.003, 0.006, 0.04).pop();
	return b;
}

function animal(b, x, z, ry, i) {
	b.push().move(x, 0, z).rotY(ry);
	b.pivot(0, 0, 0);
	b.set(PART.BODY, i).tint(SL.ANIM);
	b.push().move(0, 0.012, 0).box(0.042, 0.024, 0.026).pop();
	b.set(PART.HEAD, i).tint(SL.AHEAD);
	b.push().move(0.019, 0.03, 0).snout(0.022, 0.007, 0.008).pop();
	b.pop();
}

function person(b, x, z, ry, i, cloth, part = PART.BEND, basket = null) {
	b.push().move(x, 0, z).rotY(ry).scale(1.35);
	b.pivot(0, 0.035, 0);
	b.set(part, i);
	b.color(cloth).push().cyl(0.012, 0.008, 0.05, 4, true).pop();
	b.color('#e8c49a').push().move(0, 0.06, 0).octa(0.009, 1.1).pop();
	if (basket) b.color(basket).push().move(-0.013, 0.025, 0).cyl(0.009, 0.011, 0.018, 4, true).pop();
	b.pop();
}

function makeHerd() {
	const b = new MB();
	const R = rng(17);
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2 + R() * 0.5;
		const r = 0.05 + R() * 0.07;
		animal(b, Math.cos(a) * r, Math.sin(a) * r * 0.8, R() * 6.28, i + 1);
	}
	person(b, 0.16, 0.04, Math.PI, 20, '#5a4a7a', PART.STATIC);
	b.push().move(0.165, 0, 0.052).color('#6a4a2a').cyl(0.002, 0.002, 0.075, 3, false).pop(); // değnek
	// köpek
	b.push().move(0.12, 0, -0.07).rotY(0.6).pivot(0, 0, 0).set(PART.BODY, 21).color('#7a5a3a');
	b.push().move(0, 0.01, 0).box(0.028, 0.016, 0.012).pop();
	b.set(PART.HEAD, 21).push().move(0.013, 0.022, 0).snout(0.014, 0.005, 0.006).pop();
	b.pop();
	return b;
}

function windmill(b, x, z, i) {
	b.push().move(x, 0, z);
	b.set(PART.STATIC, i);
	b.color('#f3f0e8').cyl(0.045, 0.038, 0.16, 6, false);
	b.push().move(0, 0.16, 0).color('#7a5a3c').cone(0.048, 0.055, 6).pop();
	// yelkenler: göbek tepenin önünde (+x), x ekseninde döner
	b.set(PART.ROTOR, i).pivot(0.05, 0.165, 0);
	for (let k = 0; k < 6; k++) {
		const a = (k / 6) * Math.PI * 2;
		b.push().move(0.05, 0.165, 0).rotX(a).color(k % 2 ? '#f6f1e4' : '#efe7d4');
		b.sheet([[0, 0.012, 0], [0, 0.13, 0], [0, 0.12, 0.035], [0, 0.02, 0.03]]);
		b.pop();
	}
	b.pop();
}

function makeWindmills() {
	const b = new MB();
	windmill(b, -0.22, 0.05, 1);
	windmill(b, 0, -0.04, 2);
	windmill(b, 0.22, 0.03, 3);
	return b;
}

function turbine(b, x, z, i, h) {
	b.push().move(x, 0, z);
	b.set(PART.STATIC, i);
	b.color('#f4f6f8').cyl(0.011, 0.007, h, 5, false);
	b.push().move(0.006, h, 0).color('#e6eaee').box(0.045, 0.02, 0.02).pop();
	b.set(PART.ROTOR, i).pivot(0.03, h + 0.01, 0);
	b.push().move(0.03, h + 0.01, 0).color('#dfe4e8').rotZ(-Math.PI / 2).cone(0.008, 0.012, 4).pop();
	for (let k = 0; k < 3; k++) {
		const a = (k / 3) * Math.PI * 2;
		b.push().move(0.032, h + 0.01, 0).rotX(a).color('#f6f8fa');
		b.sheet([[0, 0.006, -0.006], [0, 0.006, 0.006], [0, 0.26, 0.001], [0, 0.26, -0.003]]);
		b.pop();
	}
	b.pop();
}

function makeTurbines() {
	const b = new MB();
	turbine(b, -0.45, 0.1, 1, 0.5);
	turbine(b, 0, 0, 2, 0.55);
	turbine(b, 0.45, -0.08, 3, 0.52);
	return b;
}

function makeWorkers() {
	const b = new MB();
	const C = ['#d6493f', '#f0c03c', '#4a86d6', '#9a4ac0'];
	const P = [[-0.07, 0.02, 0.4], [0.0, -0.05, 2.0], [0.06, 0.04, -0.6], [0.13, -0.02, 2.8]];
	P.forEach(([x, z, ry], i) => person(b, x, z, ry, i + 1, C[i], PART.BEND, '#9a6a3a'));
	return b;
}

function makeStacks() {
	const b = new MB();
	const P = [[-0.12, 0.03, 1], [0.0, -0.06, 1.15], [0.11, 0.05, 0.9], [-0.03, 0.1, 0.8], [0.15, -0.09, 1.05], [-0.16, -0.08, 0.85]];
	P.forEach(([x, z, s], i) => {
		b.set(PART.STATIC, i + 1);
		b.push().move(x, 0, z).pivot(0, 0, 0);
		b.color('#cfa752').cyl(0.034 * s, 0.03 * s, 0.035 * s, 6, false);
		b.push().move(0, 0.035 * s, 0).color('#c19643').cone(0.031 * s, 0.05 * s, 6).pop();
		b.pop();
	});
	return b;
}

function makeHives() {
	const b = new MB();
	const C = ['#3f7fd0', '#f2c84a', '#f4f2ea', '#5aa04a', '#e0603a', '#3f7fd0', '#f2c84a', '#f4f2ea'];
	for (let i = 0; i < 8; i++) {
		const x = -0.14 + (i % 4) * 0.075;
		const z = i < 4 ? -0.035 : 0.04;
		b.set(PART.STATIC, i + 1);
		b.push().move(x, 0, z).rotY((i * 0.37) % 0.3).pivot(0, 0, 0).color(C[i]).boxT(0.034, 0.032, 0.028, '#e9e6dc').pop();
	}
	person(b, 0.17, 0.0, Math.PI, 20, '#f2f2ee', PART.BEND);
	return b;
}

const MAKERS = [makeVillage, makeTractor, makeCombine, makeHerd, makeWindmills, makeTurbines, makeWorkers, makeStacks, makeHives];

/** Model atlası: her tür bir satır, köşe başına 3 piksel (RGBA32F). Boş köşe: parça −1. */
function buildAtlas() {
	const W = SLOT * 3;
	const data = new Float32Array(W * NK * 4);
	const tris = [];
	MAKERS.forEach((mk, k) => {
		const b = mk();
		const n = Math.min(b.out.length, SLOT);
		if (b.out.length > SLOT) console.warn('FL: hayat modeli yuvaya sığmadı', k, b.out.length);
		tris.push(n / 3);
		for (let i = 0; i < SLOT; i++) {
			const o = (k * W + i * 3) * 4;
			if (i >= n) {
				data[o + 3] = -1;
				continue;
			}
			const v = b.out[i];
			data.set([v[0], v[1], v[2], v[3]], o);
			data.set([v[4], v[5], v[6], v[7]], o + 4);
			data.set([v[8], v[9], v[10], v[11]], o + 8);
		}
	});
	const tex = new THREE.DataTexture(data, W, NK, THREE.RGBAFormat, THREE.FloatType);
	tex.magFilter = tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	return { tex, tris };
}

// örnek türü renk paleti: 4 tür × 5 yuva (duvar, dam, araç, hayvan gövdesi, hayvan başı)
const PAL = [
	['#efe3c8', '#a4855e', '#c8322a', '#efe9db', '#3a3431'], // 0 kerpiç düz dam · kırmızı · koyun
	['#f4efe4', '#c4553a', '#2f5fb8', '#3a312b', '#2a2420'], // 1 beyaz badana kiremit · mavi · keçi
	['#8c5f3e', '#6f6a66', '#3e8f3c', '#7b4a2a', '#5a3620'], // 2 ahşap (Karadeniz) · yeşil · kahve inek
	['#dcc3a5', '#c9b08e', '#e07a2a', '#f0efe9', '#2a2a2a'], // 3 tüf taşı düz dam (Kapadokya) · turuncu · alaca inek
];

// ------------------------------------------------------------------ gölgelendiriciler

const VS = /* glsl */ `
${COMMON}
${PROV}
${CLEAR}
uniform sampler2D uM;
uniform vec3 uPal[20];
uniform vec2 uFade[${NK}];
uniform float uPLift, uPSel;
uniform vec4 uCastle[4];
uniform vec3 uEye; // ana kameranın konumu (gölge geçişinde de sönme aynı olsun)
attribute vec4 iA; // x, zemin y (başlangıç), z, yön
attribute vec4 iB; // tür, ölçek, il, evre
attribute vec4 iC; // yol boyu (0: duran), hız, boya türü, bitiş zemin y
varying vec3 vW;
varying vec3 vC;
varying float vY;
varying float vSlot;
varying float vEm;
varying vec2 vSel;
float castleK(vec2 q, float y) {
	float k = 0.0;
	for (int i = 0; i < 4; i++) {
		vec4 c = uCastle[i];
		if (c.w > 0.5) k = max(k, (1.0 - smoothstep(2.3, 2.75, distance(c.xz, q))) * (1.0 - smoothstep(0.3, 2.0, c.y - y)));
	}
	return k;
}
vec2 rot2(vec2 v, float a) {
	float c = cos(a), s = sin(a);
	return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}
float hh(float n) {
	return fract(sin(n * 12.9898) * 43758.5453);
}
void main() {
	int kind = int(iB.x + 0.5);
	int vid = gl_VertexID;
	vec4 T0 = texelFetch(uM, ivec2(vid * 3, kind), 0);
	vec3 base = vec3(iA.x, iA.y, iA.z);
	// uzaklıkla sönme (yerden büyüyerek belirir), savaş açıklığı, kale altı
	vec2 fd = uFade[kind];
	float fade = 1.0 - smoothstep(fd.x, fd.y, distance(uEye, base));
	fade *= (1.0 - clearK(base.xz, 0.25)) * (1.0 - castleK(base.xz, base.y));
	float part = T0.w;
	vec4 T2 = texelFetch(uM, ivec2(vid * 3 + 2, kind), 0);
	float sub = T2.w;
	float ph = iB.w;
	// alt nesne seçimi: her köyde bazı evler ve cami yok (aynı köy kopyası görünmesin)
	float gone = 0.0;
	// (iC.w köyün boyu: küçük mezrada 2–3 ev, büyük köyde hepsi ve cami)
	if (kind == ${K.KOY} && sub > 0.5) {
		float hv = hh(ph * 31.7 + sub * 7.13);
		gone = sub > 10.5 ? 0.0 : sub > 9.5 ? step(iC.w, 0.45) : step(mix(0.5, 1.02, iC.w), hv);
	}
	if (part < -0.5 || fade < 0.01 || gone > 0.5) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		return;
	}
	vec4 T1 = texelFetch(uM, ivec2(vid * 3 + 1, kind), 0);
	vec3 p = T0.xyz;
	vec3 piv = T2.xyz;
	float t = uTime;
	int variant = int(iC.z + 0.5);
	// --- parça canlandırmaları
	if (part > 0.5 && part < 1.5) {
		// döner kanat: x ekseninde, göbek çevresinde
		float a = t * (kind == ${K.TURBIN} ? 1.6 : 1.1) + ph * 6.28 + sub * 1.3;
		vec3 d = p - piv;
		d.yz = rot2(d.yz, a);
		p = piv + d;
	} else if (part > 1.5 && part < 3.5) {
		// hayvan: yuvasının çevresinde ağır ağır dolaşır, yön değiştirir; baş otlarken iner
		float s1 = ph * 9.1 + sub * 2.37;
		vec2 off = vec2(sin(t * 0.21 + s1), cos(t * 0.17 + s1 * 1.3)) * 0.022;
		float turn = sin(t * 0.13 + s1) * 0.9;
		vec3 d = p - piv;
		d.xz = rot2(d.xz, turn);
		if (part > 2.5) d.y -= 0.007 * smoothstep(0.2, 0.8, sin(t * 0.9 + s1 * 3.0));
		p = piv + d + vec3(off.x, 0.0, off.y);
	} else if (part > 3.5 && part < 4.5) {
		// işçi: belden öne eğilip kalkar (çay toplama, çapa)
		float a = -0.65 * smoothstep(0.1, 0.9, 0.5 + 0.5 * sin(t * 1.4 + sub * 1.9 + ph * 6.0));
		vec3 d = p - piv;
		if (d.y > 0.0) d.xy = rot2(d.xy, a);
		p = piv + d;
	} else if (part > 4.5 && part < 5.5) {
		// mahya: düz damlı köyde (kerpiç, tüf) çatı düzleşir
		if (variant == 0 || variant == 3) p.y -= T2.y;
	}
	// --- araç yolu: tarlada sıra boyunca gidiş, U dönüşü, dönüş (yarış pisti biçimi)
	float yb = iA.y;
	bool mover = kind == ${K.TRAKTOR} || kind == ${K.BICER};
	if (!mover) {
		// eğim: alt nesne (ev, hayvan, işçi, tınaz) tabanının yerel zemin düzlemindeki yüksekliği (iC.xy = dh/dx, dh/dz)
		vec2 pw = rot2(piv.xz * iB.y, iA.w);
		p.y += dot(iC.xy, pw) / max(iB.y, 1e-3);
	}
	if (mover && iC.x > 0.01) {
		float L = iC.x;
		float r = 0.07;
		float P = 2.0 * L + 6.2832 * r;
		float s = fract(t * iC.y / P + ph) * P;
		vec2 pos;
		float hd;
		if (s < L) {
			pos = vec2(-L * 0.5 + s, -r);
			hd = 0.0;
		} else if (s < L + 3.1416 * r) {
			float a = (s - L) / r;
			pos = vec2(L * 0.5 + r * sin(a), -r * cos(a));
			hd = a;
		} else if (s < 2.0 * L + 3.1416 * r) {
			pos = vec2(L * 0.5 - (s - L - 3.1416 * r), r);
			hd = 3.1416;
		} else {
			float a = (s - 2.0 * L - 3.1416 * r) / r;
			pos = vec2(-L * 0.5 - r * sin(a), r * cos(a));
			hd = 3.1416 + a;
		}
		p.xz = rot2(p.xz, hd) + pos;
		yb = mix(iA.y, iC.w, clamp(pos.x / L + 0.5, 0.0, 1.0));
	} else if (kind == ${K.SURU}) {
		// sürü ağır ağır otlağa kayar
		vec2 drift = vec2(sin(t * 0.021 + ph * 6.0), cos(t * 0.017 + ph * 4.0)) * 0.08;
		p.xz += drift;
		p.y += dot(iC.xy, rot2(drift * iB.y, iA.w)) / max(iB.y, 1e-3);
	}
	// --- örnek dönüşümü
	p *= iB.y * fade;
	p.xz = rot2(p.xz, iA.w);
	vec4 fx = provRow(iB.z, 3);
	vec3 w = vec3(iA.x, yb + fx.x * uPLift + fx.z * uPSel - 0.004, iA.z) + p;
	vW = w;
	vY = T0.y;
	float slot = T1.w;
	vec3 col = T1.rgb;
	if (slot > 0.5) col = uPal[variant * 5 + int(slot + 0.5) - 1];
	vC = col;
	vSlot = slot;
	vEm = part > 6.5 ? 1.0 : 0.0;
	vSel = vec2(fx.z, fx.w);
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${PROV}
varying vec3 vW;
varying vec3 vC;
varying float vY;
varying float vSlot;
varying float vEm;
varying vec2 vSel;
void main() {
	vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
	vec3 V = normalize(cameraPosition - vW);
	if (dot(N, V) < 0.0) N = -N;
	vec3 alb = vC * 0.92;
	float ao = mix(0.62, 1.0, smoothstep(0.0, 0.05, vY));
	// pencereler: duvarda tek sıra küçük pencere (gündüz koyu cam, gece sıcak ışık)
	float win = 0.0;
	if (vSlot > 0.5 && vSlot < 1.5 && abs(N.y) < 0.4) {
		vec2 tn = normalize(vec2(-N.z, N.x) + 1e-5);
		float u = dot(vW.xz, tn) / 0.032;
		float fu = fwidth(u);
		float wy = (vY - 0.026) / 0.026;
		win = (1.0 - smoothstep(0.17 - fu, 0.17 + fu, abs(fract(u) - 0.5))) * step(0.0, wy) * step(wy, 1.0);
		win *= 1.0 - smoothstep(0.35, 0.7, fu);
		alb = mix(alb, vec3(0.08, 0.1, 0.13), win * 0.85);
	}
	// gölge geçişinde nesne ışığa doğru kaydırıldı: kendi gölgesine düşmesin diye aynı kaydırmayla okunur
	float sh = shadowAt(vW + uSunDir * 0.3 + N * 0.01, N);
	gPool = poolK(vW.xz);
	gLit = max(vSel.x * uSelLit, gPool);
	vec3 c = shade(alb, N, V, ao, sh, 0.12, 0.6);
	c = structInk(c, N, N, vW);
	float nk = nightK();
	if (nk > 0.001) {
		// gece: köy pencereleri ve araç farları yanar
		c += N_WARM * nk * (win * 2.4 + vEm * 3.0);
		gRelit = 1.0;
	}
	c = provDim(c, vSel.x, vSel.y);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

// gölge geçişi: aynı dönüşüm; ışığa doğru kaydırılır (gölge haritasının geniş derinlik payını aşsın: küçük nesne de
// gölge düşürsün; ışık yönünde kaydırma gölgenin yerini değiştirmez)
const DEPTH_VS = VS.replace(
	'gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);\n}',
	'gl_Position = projectionMatrix * viewMatrix * vec4(w + uSunDir * 0.3, 1.0);\n}',
);
const DEPTH_FS = /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`;

// ------------------------------------------------------------------ yerleşim

export class Hayat {
	/**
	 * @param G ortak uniform'lar (uNoise CPU verisi yerleşimde de okunur)
	 * @param tier kalite kademesi (q0: daha seyrek)
	 * @param board harita
	 * @param landmarks ünlü yapılar (avlularından kaçınılır)
	 */
	constructor(G, tier, board, landmarks) {
		this.G = G;
		this.board = board;
		const atlas = buildAtlas();
		this.atlas = atlas;
		this.modelTris = atlas.tris;
		const noise = G.uNoise.value.image.data;
		const t0 = performance.now();
		this.list = this._place(board, noise, landmarks, tier);
		this.placeMs = performance.now() - t0;
		// ızgara: hücre başına örnek aralığı
		const nx = Math.ceil(100 / CELL);
		const nz = Math.ceil(50 / CELL);
		this.nx = nx;
		this.nz = nz;
		const cellOf = (o) => Math.max(0, Math.min(nz - 1, Math.floor((o.z + 25) / CELL))) * nx + Math.max(0, Math.min(nx - 1, Math.floor((o.x + 50) / CELL)));
		this.list.sort((a, b) => cellOf(a) - cellOf(b));
		this.cellStart = new Int32Array(nx * nz + 1);
		for (const o of this.list) this.cellStart[cellOf(o) + 1]++;
		for (let i = 0; i < nx * nz; i++) this.cellStart[i + 1] += this.cellStart[i];
		const n = this.list.length;
		this.all = new Float32Array(n * 12);
		this.list.forEach((o, i) => this.all.set([o.x, o.y, o.z, o.yaw, o.k, o.s, o.pid, o.ph, o.L || 0, o.spd || 0, o.v || 0, o.k === K.KOY ? o.size : o.y1 ?? o.y], i * 12));
		this.counts = new Array(NK).fill(0);
		for (const o of this.list) this.counts[o.k]++;

		// örnek tamponu (önceden ayrılmış; akışta yalnız kopyalanır)
		const geo = new THREE.InstancedBufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SLOT * 3), 3));
		this.buf = new THREE.InstancedInterleavedBuffer(new Float32Array(CAP * 12), 12);
		this.buf.setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute('iA', new THREE.InterleavedBufferAttribute(this.buf, 4, 0));
		geo.setAttribute('iB', new THREE.InterleavedBufferAttribute(this.buf, 4, 4));
		geo.setAttribute('iC', new THREE.InterleavedBufferAttribute(this.buf, 4, 8));
		geo.instanceCount = 0;
		geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
		this.geo = geo;
		const pal = [];
		for (const row of PAL) for (const h of row) pal.push(new THREE.Color(h));
		this.uniforms = {
			...G,
			uState: { value: board.stateTex },
			uSelOn: board.uSelOn,
			uPLift: { value: board.liftUnit },
			uPSel: { value: board.selLiftUnit },
			uCastle: { value: landmarks.castleU },
			uM: { value: atlas.tex },
			uPal: { value: pal },
			uFade: { value: FADE.map(([a, b]) => new THREE.Vector2(a, b)) },
			uEye: { value: new THREE.Vector3(0, 100, 0) },
		};
		const taps = String(tier.shadowTaps);
		this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps), uniforms: this.uniforms }));
		this.mesh.frustumCulled = false;
		this.mesh.matrixAutoUpdate = false;
		this.caster = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms: this.uniforms }));
		this.caster.frustumCulled = false;
		this.caster.matrixAutoUpdate = false;
		this._key = -1;
		this.n = 0;
		this.mesh.visible = this.caster.visible = false;
	}

	/** Kare başına: kamera bir hücre kayınca (ya da yakınlık basamağı değişince) yakın örnekler tampona kopyalanır. */
	update(cam) {
		const eye = cam.cam.position;
		this.uniforms.uEye.value.copy(eye);
		const d = cam.dist;
		const on = d < MAXD;
		this.mesh.visible = this.caster.visible = on && this.n > 0;
		if (!on) return;
		const tx = cam.target.x;
		const tz = cam.target.z;
		const R = Math.min(30, d * 1.25 + 3);
		// tampon kamera odağı 1 birim kayınca, yakınlık yarım basamak ya da yön ~10° değişince tazelenir (ucuz: birkaç yüz
		// örnek denetimi, birkaç KB yükleme; durgun karede hiç iş yok). Pay küçük kalır: ekran dışı örnek az.
		const step = Math.round(d * 0.5);
		const yawStep = Math.round(cam.yaw / 0.17) & 63;
		const key = ((Math.floor(tx + 50) * 64 + Math.floor(tz + 25)) * 128 + step) * 64 + yawStep;
		if (key === this._key) return;
		this._key = key;
		const A = this.all;
		const B = this.buf.array;
		let n = 0;
		const c0 = Math.max(0, Math.floor((tx - R + 50) / CELL));
		const c1 = Math.min(this.nx - 1, Math.floor((tx + R + 50) / CELL));
		const r0 = Math.max(0, Math.floor((tz - R + 25) / CELL));
		const r1 = Math.min(this.nz - 1, Math.floor((tz + R + 25) / CELL));
		// göz 1 birim kayana dek örnekler tamponda kalır: sönme uzaklığına küçük pay
		const pad = 1.6;
		// görüş kaması (yatay): kameranın önü ve yan açısı (+ pay); ekranın dışındaki örnekler tampona girmez
		let fx = tx - eye.x;
		let fz = tz - eye.z;
		const fl = Math.hypot(fx, fz) || 1;
		fx /= fl;
		fz /= fl;
		const C = cam.cam;
		const tanH = Math.tan(((C.fov * Math.PI) / 180) * 0.5) * C.aspect * 1.3;
		for (let j = r0; j <= r1 && n < CAP; j++)
			for (let i = c0; i <= c1 && n < CAP; i++) {
				const c = j * this.nx + i;
				for (let k = this.cellStart[c]; k < this.cellStart[c + 1] && n < CAP; k++) {
					const o = k * 12;
					const fd = FADE[A[o + 4]][1] + pad;
					const dx = A[o] - eye.x;
					const dy = A[o + 1] - eye.y;
					const dz = A[o + 2] - eye.z;
					if (dx * dx + dy * dy + dz * dz > fd * fd) continue;
					const tx2 = A[o] - tx;
					const tz2 = A[o + 2] - tz;
					if (tx2 * tx2 + tz2 * tz2 > R * R) continue;
					const al = dx * fx + dz * fz;
					if (al < -1 || Math.abs(dx * fz - dz * fx) > al * tanH + 1.4) continue;
					for (let q = 0; q < 12; q++) B[n * 12 + q] = A[o + q];
					n++;
				}
			}
		this.n = n;
		this.dirty = true; // örnek kümesi değişti: gölge önbelleği tazelensin (app.render)
		this.geo.instanceCount = n;
		this.buf.clearUpdateRanges();
		this.buf.addUpdateRange(0, n * 12);
		this.buf.needsUpdate = true;
		this.mesh.visible = this.caster.visible = n > 0;
	}

	/** Görünür üçgen (en çok): örnek × türünün üçgeni. */
	get triangles() {
		let t = 0;
		const B = this.buf.array;
		for (let i = 0; i < this.n; i++) t += this.modelTris[B[i * 12 + 4]];
		return t;
	}

	_place(board, noise, landmarks, tier) {
		const R = rng(2024);
		const rel = board.relief;
		const out = [];
		const dens = tier.id === 0 ? 0.6 : tier.id === 1 ? 0.85 : 1;
		const ss = (a, b, x) => {
			const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
			return t * t * (3 - 2 * t);
		};
		const sites = landmarks.sites || [];
		const near = (x, z, r) => {
			for (const s of sites) if (Math.hypot(s.x - x, s.z - z) < (s.r ?? 0.95) + r) return true;
			for (const p of board.provinces) if (Math.hypot(p.x - x, p.z - z) < 0.6 + r) return true;
			return false;
		};
		const terr = (x, z) => {
			const y = -z;
			const eps = 0.1;
			const hx = rel.height(x + eps, y) - rel.height(x - eps, y);
			const hy = rel.height(x, y + eps) - rel.height(x, y - eps);
			const ny = 1 / Math.hypot(-hx / (2 * eps), 1, hy / (2 * eps));
			return { ny, F: rel.bil(rel.F, x, y), Ro: rel.bil(rel.Ro, x, y), La: rel.bil(rel.La, x, y), e: rel.elev(x, y) };
		};
		const farmK = (x, z, top) => {
			const T = terr(x, z);
			if (T.La > 0.02) return 0;
			return (1 - ss(0.1, 0.4, T.F)) * (1 - ss(0.15, 0.45, T.Ro)) * ss(0.985, 0.998, T.ny) * (1 - ss(top - 250, top + 250, T.e));
		};
		const roadK = (x, z, top) => {
			const T = terr(x, z);
			if (T.La > 0.02) return 0;
			return (1 - ss(0.2, 0.5, T.F)) * (1 - ss(0.25, 0.5, T.Ro)) * ss(0.95, 0.985, T.ny) * (1 - ss(top, top + 400, T.e));
		};
		const ground = (x, z) => board.groundAt(x, z);
		const add = (o) => {
			o.y = o.y ?? ground(o.x, o.z);
			o.ph = o.ph ?? R();
			o.s = o.s ?? 1;
			if (!o.L) {
				// yerel zemin eğimi (alt nesneler kendi tabanlarına oturur)
				const e = 0.2;
				o.L = (ground(o.x + e, o.z) - ground(o.x - e, o.z)) / (2 * e);
				o.spd = (ground(o.x, o.z + e) - ground(o.x, o.z - e)) / (2 * e);
			}
			out.push(o);
		};
		const styleOf = (p) => (p.region === 'karadeniz' ? 2 : p.id === 50 ? 3 : p.region === 'dogu' || p.region === 'guneydogu' ? 0 : p.region === 'icanadolu' ? (R() < 0.5 ? 0 : 1) : 1);
		const animOf = (p) => (p.region === 'dogu' ? (R() < 0.6 ? 2 : 3) : p.region === 'karadeniz' ? 2 : p.region === 'guneydogu' ? (R() < 0.5 ? 1 : 0) : R() < 0.8 ? 0 : 1);

		// --- nehir yakınlığı (köy ve araç nehre oturmasın): 0,25 birimlik kaba ızgara
		const RG = 0.25;
		const rnx = Math.ceil(100 / RG);
		const rnz = Math.ceil(50 / RG);
		const wet = new Uint8Array(rnx * rnz);
		for (const r of DATA.rivers) {
			const P = r.pts;
			for (let i = 0; i + 3 < P.length; i += 2) {
				const ax = P[i];
				const az = -P[i + 1];
				const bx = P[i + 2];
				const bz = -P[i + 3];
				const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (RG * 0.5)) + 1;
				for (let k = 0; k <= n; k++) {
					const x = ax + ((bx - ax) * k) / n;
					const z = az + ((bz - az) * k) / n;
					const gi = Math.floor((x + 50) / RG);
					const gj = Math.floor((z + 25) / RG);
					if (gi >= 0 && gj >= 0 && gi < rnx && gj < rnz) wet[gj * rnx + gi] = 1;
				}
			}
		}
		this.wet = (x, z) => {
			const gi = Math.floor((x + 50) / RG);
			const gj = Math.floor((z + 25) / RG);
			return gi >= 0 && gj >= 0 && gi < rnx && gj < rnz && wet[gj * rnx + gi] === 1;
		};
		// --- köyler: 2 birimlik ızgarada hücre başına en çok bir köy; CPU geçerli yeri seçer ve köy dokusuna yazar,
		// harita shader'ı aynı dokudan harman yerini, bostanları ve çiğnenmiş toprağı çizer
		const vil = new Uint8Array(VIL.nx * VIL.nz * 4);
		for (let j = 0; j < VIL.nz; j++)
			for (let i = 0; i < VIL.nx; i++) {
				const roll = R();
				for (let t = 0; t < 6; t++) {
					const ox = R() - 0.5;
					const oz = R() - 0.5;
					const x = VIL.x0 + (i + 0.5 + ox * VIL.jit) * VIL.cell;
					const z = VIL.z0 + (j + 0.5 + oz * VIL.jit) * VIL.cell;
					const pid = board.pick(x, z);
					if (pid < 0) continue;
					const p = board.provinces[pid];
					const prof = profileOf(p);
					if (roll > Math.min(0.8, (prof.vil ?? 0.35) * 1.7)) break;
					// ovada düz yer; Karadeniz'de yamaç köyü (dağınık ahşap evler)
					const T = terr(x, z);
					const hill = p.region === 'karadeniz' && T.ny > 0.8 && T.e < 1300 && T.La < 0.02 && T.Ro < 0.5;
					if ((roadK(x, z, prof.top ?? 1600) < 0.42 && !hill) || near(x, z, 0.3) || board.borderDist(x, z, 0.5) < 0.36 || this.wet(x, z)) continue;
					const size = R();
					const o = (j * VIL.nx + i) * 4;
					vil[o] = 255;
					vil[o + 1] = Math.round((ox + 0.5) * 255);
					vil[o + 2] = Math.round((oz + 0.5) * 255);
					vil[o + 3] = Math.round(size * 255);
					// shader ile aynı merkez (8 bit kayma)
					const cx = VIL.x0 + (i + 0.5 + (vil[o + 1] / 255 - 0.5) * VIL.jit) * VIL.cell;
					const cz = VIL.z0 + (j + 0.5 + (vil[o + 2] / 255 - 0.5) * VIL.jit) * VIL.cell;
					add({ k: K.KOY, x: cx, z: cz, yaw: R() * 6.28, pid, v: styleOf(p), s: 1.25 * (0.75 + 0.25 * (vil[o + 3] / 255)), size: vil[o + 3] / 255 });
					// köyün otlağında sürü
					if (R() < 0.45 * dens) {
						const a = R() * 6.28;
						const hx = cx + Math.cos(a) * 0.75;
						const hz = cz + Math.sin(a) * 0.75;
						if (board.pick(hx, hz) === pid && roadK(hx, hz, prof.top ?? 1600) > 0.5 && !near(hx, hz, 0.15) && !this.wet(hx, hz)) add({ k: K.SURU, x: hx, z: hz, yaw: R() * 6.28, pid, v: animOf(p), s: p.region === 'dogu' || p.region === 'karadeniz' ? 1.25 : 1 });
					}
					// köyün yanında tınaz (Doğu, İç Anadolu) ya da kovan
					if ((p.region === 'dogu' || p.region === 'icanadolu') && R() < 0.5) {
						const a = R() * 6.28;
						const sx = cx + Math.cos(a) * 0.4;
						const sz = cz + Math.sin(a) * 0.4;
						if (board.pick(sx, sz) === pid && !near(sx, sz, 0.15) && !this.wet(sx, sz)) add({ k: K.TINAZ, x: sx, z: sz, yaw: R() * 6.28, pid });
					}
					break;
				}
			}
		this.vilTex = new THREE.DataTexture(vil, VIL.nx, VIL.nz, THREE.RGBAFormat, THREE.UnsignedByteType);
		this.vilTex.magFilter = this.vilTex.minFilter = THREE.NearestFilter;
		this.vilTex.generateMipmaps = false;
		this.vilTex.needsUpdate = true;
		const vilAt = (x, z) => {
			const i = Math.floor((x - VIL.x0) / VIL.cell);
			const j = Math.floor((z - VIL.z0) / VIL.cell);
			if (i < 0 || j < 0 || i >= VIL.nx || j >= VIL.nz || !vil[(j * VIL.nx + i) * 4]) return false;
			const o = (j * VIL.nx + i) * 4;
			const cx = VIL.x0 + (i + 0.5 + (vil[o + 1] / 255 - 0.5) * VIL.jit) * VIL.cell;
			const cz = VIL.z0 + (j + 0.5 + (vil[o + 2] / 255 - 0.5) * VIL.jit) * VIL.cell;
			return Math.hypot(x - cx, z - cz) < 0.55;
		};

		// --- tarlalar: şerit başına bir kez karar (traktör, biçerdöver, sürü, işçi, tınaz, kovan)
		const seen = new Set();
		const step = 0.3;
		for (let z = -21; z < 21; z += step)
			for (let x = -46; x < 46; x += step) {
				const jx = x + (R() - 0.5) * step;
				const jz = z + (R() - 0.5) * step;
				const pid = board.pick(jx, jz);
				if (pid < 0) continue;
				const p = board.provinces[pid];
				const prof = profileOf(p);
				const f = fieldAt(jx, jz, prof, noise);
				const key = `${f.zone[0]},${f.zone[1]},${f.strip[0].toFixed(3)},${f.strip[1].toFixed(3)}`;
				if (seen.has(key)) continue;
				seen.add(key);
				const [sx, sz] = f.strip;
				if (board.pick(sx, sz) !== pid) continue;
				const top = prof.top ?? 1600;
				const fk = farmK(sx, sz, top);
				const T = terr(sx, sz);
				// yamaç ekini (çay, fındık, zeytin…): eğimli yerde
				const slopeK = (prof.sa ?? 0) * ss(0.42, 0.66, T.ny) * (1 - ss(0.985, 0.996, T.ny)) * (1 - ss((prof.se ?? 900) - 150, (prof.se ?? 900) + 150, T.e)) * (T.La > 0.02 ? 0 : 1);
				const slopeOn = slopeK > fk;
				const crop = slopeOn ? prof.s : f.crop;
				const k = Math.max(fk, slopeK);
				if (k < 0.5 || f.zoneEdge < 0.12 || near(sx, sz, 0.2) || board.borderDist(sx, sz, 0.5) < 0.25 || vilAt(sx, sz) || this.wet(sx, sz)) continue;
				const roll = R();
				const yawRow = Math.atan2(f.dir[1], f.dir[0]);
				if (f.piv) continue;
				// 1) araç şeridi: traktör (sürme, balya toplama, ilaçlama) ya da biçerdöver (buğday, ayçiçeği, çeltik)
				const tractorP = crop === 'saban' || crop === 'hasat' || crop === 'pancar' ? 0.26 : ['pamuk', 'misir', 'aycicegi', 'biber', 'celtik'].includes(crop) ? 0.16 : 0;
				const combineP = crop === 'bugday' ? 0.22 : crop === 'aycicegi' || crop === 'celtik' ? 0.12 : 0;
				let vehicle = false;
				if (roll < (tractorP + combineP) * dens && f.len > 0.35 && !slopeOn) {
					const kind = roll < tractorP * dens ? K.TRAKTOR : K.BICER;
					const L = Math.max(0.15, f.len - (kind === K.BICER ? 0.36 : 0.32));
					const ex = sx + f.dir[0] * L * 0.5;
					const ez = sz + f.dir[1] * L * 0.5;
					const bx = sx - f.dir[0] * L * 0.5;
					const bz = sz - f.dir[1] * L * 0.5;
					if (farmK(ex, ez, top) > 0.4 && farmK(bx, bz, top) > 0.4) {
						if (kind === K.TRAKTOR) add({ k: K.TRAKTOR, x: sx, z: sz, y: ground(bx, bz), y1: ground(ex, ez), yaw: -yawRow, pid, L, spd: 0.045 + R() * 0.02, v: Math.floor(R() * 4) });
						else add({ k: K.BICER, x: sx, z: sz, y: ground(bx, bz), y1: ground(ex, ez), yaw: -yawRow, pid, L, spd: 0.03 + R() * 0.012, v: R() < 0.6 ? 2 : 3 });
						vehicle = true;
					}
				}
				// 2) canlılar: sürü, işçiler, tınaz, kovan (araç varsa şeridin kenarına kayar; dar şeritte ikisi birden yok)
				if (vehicle && f.wid < 0.3) continue;
				const side = vehicle ? 0.3 * f.wid : 0;
				const lx = sx + f.across[0] * side;
				const lz = sz + f.across[1] * side;
				const roll2 = R();
				const herdP = crop === 'mera' ? 0.6 : crop === 'hasat' ? 0.38 : crop === 'cayir' || crop === 'nadas' ? 0.3 : crop === 'zeytin' || crop === 'fistik' ? 0.18 : 0;
				const workP = crop === 'cay' ? 0.85 : ['pamuk', 'biber', 'zeytin', 'narenciye', 'kayisi', 'bag', 'fistik', 'gul', 'lavanta', 'findik', 'pancar', 'aycicegi'].includes(crop) ? 0.3 : 0;
				const stackP = crop === 'cayir' ? 0.45 : crop === 'hasat' && (p.region === 'dogu' || p.region === 'icanadolu') ? 0.12 : 0;
				const hiveP = p.id === 48 || p.id === 52 || p.id === 28 || p.region === 'dogu' ? 0.04 : 0;
				let acc = herdP * dens;
				if (roll2 < acc) add({ k: K.SURU, x: lx, z: lz, yaw: R() * 6.28, pid, v: animOf(p), s: p.region === 'dogu' || p.region === 'karadeniz' ? 1.25 : 1 });
				else if (roll2 < (acc += workP * dens)) add({ k: K.ISCI, x: lx, z: lz, yaw: crop === 'cay' ? R() * 6.28 : yawRow, pid });
				else if (roll2 < (acc += stackP * dens)) add({ k: K.TINAZ, x: lx, z: lz, yaw: R() * 6.28, pid });
				else if (roll2 < (acc += hiveP)) add({ k: K.KOVAN, x: lx, z: lz, yaw: R() * 6.28, pid });
			}

		// --- yel değirmenleri: Bodrum, Datça, Çeşme-Alaçatı (gerçek yerler)
		const ll = (lon, lat) => [(lon - 35.2) * 0.777146 * 6, -(lat - 39) * 6];
		for (const [lon, lat] of [[27.43, 37.05], [27.31, 37.03], [27.55, 37.08], [27.69, 36.73], [27.78, 36.72], [26.37, 38.28], [26.3, 38.3], [26.45, 38.25], [26.06, 39.83]]) {
			let [x, z] = ll(lon, lat);
			// karaya çek: en yakın kara noktası
			let best = null;
			for (let a = 0; a < 24 && !best; a++)
				for (let r = 0; r <= 1.2; r += 0.15) {
					const q = [x + Math.cos(a * 0.26) * r, z + Math.sin(a * 0.26) * r];
					const pid = board.pick(q[0], q[1]);
					if (pid >= 0 && board.borderDist(q[0], q[1], 0.5) > 0.22 && !near(q[0], q[1], 0.1) && !out.some((o) => o.k === K.DEGIRMEN && Math.hypot(o.x - q[0], o.z - q[1]) < 0.7)) {
						best = [q[0], q[1], pid];
						break;
					}
				}
			if (!best) continue;
			add({ k: K.DEGIRMEN, x: best[0], z: best[1], yaw: -0.4 + R() * 0.3, pid: best[2], s: 1.1 });
		}
		// --- rüzgâr türbinleri: Ege ve Marmara sırtları, Hatay (yerel tepeler, orta yükselti)
		const windy = { 17: 6, 35: 8, 45: 6, 10: 7, 31: 3, 59: 3, 39: 3, 9: 2, 48: 2 };
		for (const [id, n] of Object.entries(windy)) {
			const p = board.byId.get(+id);
			let made = 0;
			for (let tries = 0; tries < 400 && made < Math.round(n * dens); tries++) {
				const s = board.sample(p.index, R, 0.4);
				if (!s) continue;
				const [x, z] = s;
				const T = terr(x, z);
				if (T.e < 250 || T.e > 1300 || T.Ro > 0.5 || T.La > 0.02 || near(x, z, 0.4)) continue;
				// sırt: çevresindeki 8 noktadan en çok ikisi daha yüksek
				let hi = 0;
				const h0 = rel.height(x, -z);
				for (let a = 0; a < 8; a++) if (rel.height(x + Math.cos(a * 0.785) * 0.7, -z - Math.sin(a * 0.785) * 0.7) > h0 + 0.005) hi++;
				if (hi > 2 || out.some((o) => o.k === K.TURBIN && Math.hypot(o.x - x, o.z - z) < 1.4)) continue;
				add({ k: K.TURBIN, x, z, yaw: -0.35 + R() * 0.2, pid: p.index, s: 1 });
				made++;
			}
		}
		return out;
	}
}
