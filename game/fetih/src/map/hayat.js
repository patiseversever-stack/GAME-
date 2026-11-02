// TASLAK v2 (doku-taslak): yakın çekimde haritanın "canlı minyatür" hayatı — sakin sürüm.
//
// Kullanıcı (v1'e): "Çok yoğun; çok küçük, gereksiz hareketler; radar gibi dönen kollar ve hızlı traktörler kötü;
// hareket kare kare. Asıl yenilik: yaklaşınca çalışan insanlar görülsün, küçük olmasınlar, güzel çizilsinler. Oyunu
// kastırmasın; hiçbir yerle çakışmasın." v2 ilkeleri:
//   - Az nesne: q0'da hiç yok (kurulmaz bile). Yakın zumda (9) ekranda ortalama q1 0,9, q2 1,6 nesne, en çok q1 5,
//     q2 9 (sayim.cjs: 81 ilde 235 görünüm); tampon tavanı q1 10, q2 20 örnek. Bütün haritada q1 236, q2 418 nesne.
//   - İnsanlar asıl yenilik (oyuncak oranı: boy ~0,22, traktör kadar, ev mahyası kadar): baş, gövde, kollar, bacaklar,
//     başörtüsü ya da şapka, elinde alet (çapa, sepet, tırpan; çay toplayanın sırtında küfe). Yavaş, doğal iş hareketi:
//     çapalama, çay/fındık toplama, sepet taşıma (yürüyerek), tırpan biçme. Yalnız yakın çekimde ve ekranın odağında
//     görünürler; titreşimli (piksel piksel) belirirler. Her ilde alanına göre iş yeri (köyün tarlaları yeğlenir).
//   - Hareketler yavaş ve sürekli (köşe gölgelendiricisinde uTime ile; adım yok): yel değirmeni ve türbin ağır döner,
//     traktör ya park hâlinde ya çok yavaş sürer, hayvanlar çok yavaş otlar. Titreyen, koşturan, dönen kol yok.
//   - Çakışma yok: yapı terası ve avlusu (uzak sürümün gerçek ayak izi), il adı, nehir, göl, deniz, kıyı, il sınırı,
//     tarla yolu, ağaç ve birbirleri; köy, değirmen ve türbin başkent kalesi yerinin çekirdeğine girmez. Kale yerinin
//     eteğindeki her nesne kale inerken gömülür (castleK), savaş açıklığında da (clearK). audit() bütün haritayı
//     sayısal olarak denetler.
// Maliyet: tek örneklemeli çizim (+ gölge geçişinde tek çizim), yalnız ekranın en yakın zemin noktası NEAR'dan yakınken;
// oyun zumunda ve uzakta çizim kapalı, zemin de yakın çekim kodu derlenmemiş programla (board.setNear). Bütün modeller bir kayan nokta atlasında (köşe başına 3 piksel), gl_VertexID ile okunur. Tampon yalnız
// seçilen küme değişince ve yalnız kullanılan kısım güncellenir; kare başına nesne üretimi yok. Yerleşim açılışta
// küçük dilimler hâlinde (uzun iş yok) yapılır.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV, CLEAR } from '../gfx/shaderlib.js';
import { rng } from '../core/math.js';
import { profileOf, fieldAt, VIL } from './tarla.js';
import { padR } from './siteplan.js';
import DATA from '../data/turkiye.json';

const SLOT = 480; // köşe yuvası (160 üçgen)
const K = { KOY: 0, TRAKTOR: 1, DEGIRMEN: 2, TURBIN: 3, HAYVAN: 4, ISCI: 5 };
const NK = 6;
// sönme (kameraya uzaklık): [tam görünür, kayıp]. En yakın zum 9: odak 9 birimde, ekranın üstüne doğru söner.
const FADE = [
	[9.8, 12.4], // köy
	[9.5, 12.2], // traktör
	[10, 12.4], // yel değirmeni
	[10.5, 12.4], // türbin
	[9, 11.8], // hayvan
	[9.6, 12.2], // insan (ayrıca ekran odağında)
];
// katman (ve zeminin yakın zum programı) yalnız ekranın en yakın zemin noktası bu uzaklığın altındayken: üstünde bütün
// nesneler zaten sönmüş (FADE ≤ 12,4), çizim ve geçiş yok. Serbest bakışta (eğim 0,9–0,95) kamera uzaklığı ~15'in
// üstü, yani oyun zumu (18–24) ve uzak: 0 çağrı, zemin ana dalın programıyla.
const NEAR = 12.6;
// ayak izi yarıçapı (ölçek 1): çakışma denetimi
const FOOT = [0.48, 0.1, 0.22, 0.3, 0.1, 0.11];

// parça kimlikleri
const PART = { STATIC: 0, ROTOR: 1, BODY: 2, HEAD: 3, RIDGE: 5, LAMP: 7, LEG_L: 10, LEG_R: 11, TORSO: 12, ARM_L: 13, ARM_R: 14 };
// boya yuvaları: 1 duvar, 2 dam, 3 araç, 4 hayvan gövdesi, 5 hayvan başı (uPal), 6 gömlek, 7 pantolon/şalvar, 8 başlık (uWPal)
const SL = { WALL: 1, ROOF: 2, VEH: 3, ANIM: 4, AHEAD: 5, SHIRT: 6, PANTS: 7, HEADW: 8 };
// insanın alt nesneleri: 1 çapa, 2 el sepeti, 3 tırpan, 4 sırt küfesi, 5 başörtüsü, 6 şapka
const SUB = { CAPA: 1, SEPET: 2, TIRPAN: 3, KUFE: 4, ORTU: 5, SAPKA: 6 };
const HIP = 0.05;
const SHO = 0.093;

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
	rotX(a) {
		this.m.multiply(new THREE.Matrix4().makeRotationX(a));
		return this;
	}
	rotY(a) {
		this.m.multiply(new THREE.Matrix4().makeRotationY(a));
		return this;
	}
	rotZ(a) {
		this.m.multiply(new THREE.Matrix4().makeRotationZ(a));
		return this;
	}
	scale(x, y = x, z = x) {
		this.m.multiply(new THREE.Matrix4().makeScale(x, y, z));
		return this;
	}
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
	/** Dışa bakan yüz (ref: cismin içinde bir nokta, yerel): yelpaze, yön kendiliğinden düzelir. */
	face(pts, ref, aux = null) {
		const P = pts.map((p) => this._p(p));
		const R = this._p(ref);
		const [a, b, c] = P;
		const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
		let cx = 0;
		let cy = 0;
		let cz = 0;
		for (const p of P) {
			cx += p[0] / P.length;
			cy += p[1] / P.length;
			cz += p[2] / P.length;
		}
		const idx = P.map((_, i) => i);
		if (n[0] * (cx - R[0]) + n[1] * (cy - R[1]) + n[2] * (cz - R[2]) < 0) idx.reverse();
		for (let i = 1; i + 1 < idx.length; i++) for (const j of [idx[0], idx[i], idx[i + 1]]) this._emit(P[j], aux ? aux[j] : null);
		return this;
	}
	sheet(pts) {
		const P = pts.map((p) => this._p(p));
		for (let i = 1; i + 1 < P.length; i++) {
			for (const j of [0, i, i + 1]) this._emit(P[j], null);
			for (const j of [0, i + 1, i]) this._emit(P[j], null);
		}
		return this;
	}
	_emit(p, ridge) {
		this.out.push([p[0], p[1], p[2], ridge ? PART.RIDGE : this.part, this.col[0], this.col[1], this.col[2], this.slot, ...(ridge ? [0, ridge.drop, 0] : this.piv), this.sub]);
	}
	/** Kutu (alt yüzsüz), taban y = 0, x/z ortalı. top false: üst yüz de yok (gövdeye giren uzuv). */
	box(w, h, d, top = true) {
		const x = w / 2;
		const z = d / 2;
		const ref = [0, h / 2, 0];
		if (top) this.face([[-x, h, -z], [-x, h, z], [x, h, z], [x, h, -z]], ref);
		this.face([[-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z]], ref);
		this.face([[x, 0, -z], [-x, 0, -z], [-x, h, -z], [x, h, -z]], ref);
		this.face([[x, 0, z], [x, 0, -z], [x, h, -z], [x, h, z]], ref);
		this.face([[-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z]], ref);
		return this;
	}
	/** Üstü ayrı renkli kutu. */
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
	/** Beşik çatı: taban y = 0 (w × d), mahya x boyunca h yükseklikte; düz damlı köyde mahya iner. */
	roof(w, d, h) {
		const x = w / 2;
		const z = d / 2;
		const ref = [0, h * 0.3, 0];
		const R = { drop: h };
		this.face([[-x, 0, z], [x, 0, z], [x, h, 0], [-x, h, 0]], ref, [null, null, R, R]);
		this.face([[x, 0, -z], [-x, 0, -z], [-x, h, 0], [x, h, 0]], ref, [null, null, R, R]);
		this.face([[x, 0, z], [x, 0, -z], [x, h, 0]], ref, [null, null, R]);
		this.face([[-x, 0, -z], [-x, 0, z], [-x, h, 0]], ref, [null, null, R]);
		return this;
	}
	/** Silindir / kesik koni (alt kapaksız), eksen y. */
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
	/** Yuvarlak baş: beş kenarlı, üç katlı küre (20 üçgen). */
	head(r) {
		const ref = [0, 0, 0];
		const n = 5;
		const ring = (y, rr) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2 + 0.26) * rr, y, Math.sin((i / n) * Math.PI * 2 + 0.26) * rr]);
		const a = ring(-r * 0.55, r * 0.83);
		const b = ring(r * 0.35, r * 0.94);
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			this.face([a[i], a[j], [0, -r, 0]], ref);
			this.face([a[i], a[j], b[j], b[i]], ref);
			this.face([b[i], b[j], [0, r, 0]], ref);
		}
		return this;
	}
	snout(l, w, h) {
		const ref = [l * 0.25, 0, 0];
		const tip = [l, 0, 0];
		const q = [[0, h, w], [0, h, -w], [0, -h, -w], [0, -h, w]];
		for (let i = 0; i < 4; i++) this.face([q[i], q[(i + 1) % 4], tip], ref);
		return this;
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
	// beş ev küçük bir meydanın çevresinde (alt kimlik: ev; küçük mezrada bazıları yok), cami, kavak
	const H = [
		[-0.16, 0.07, 0.3, 0.16, 0.12, 0.095],
		[0.08, -0.16, -0.2, 0.15, 0.11, 0.09],
		[0.21, 0.1, 1.4, 0.14, 0.1, 0.085],
		[-0.03, 0.21, 0.1, 0.155, 0.115, 0.09],
		[-0.22, -0.15, 1.2, 0.13, 0.1, 0.085],
	];
	H.forEach(([x, z, ry, w, d, h], i) => {
		b.set(PART.STATIC, i + 1);
		b.push().move(x, 0, z).rotY(ry);
		house(b, w, d, h, 0.06);
		b.pop();
	});
	b.set(PART.STATIC, 10);
	b.push().move(0.05, 0, 0.02).rotY(0.4).pivot(0, 0, 0);
	b.push().move(0, -0.05, 0).color('#efebe2').box(0.13, 0.125, 0.11).pop();
	b.push().move(0, 0.075, 0).color('#8d98a3').cone(0.055, 0.04, 6).pop();
	b.push().move(0.085, 0, -0.045).color('#f2efe8').cyl(0.014, 0.011, 0.27, 6, false);
	b.move(0, 0.27, 0).color('#7f8b97').cone(0.018, 0.065, 6).pop();
	b.pop();
	b.set(PART.STATIC, 11);
	b.push().move(0.3, 0, 0.18).pivot(0, 0, 0).color('#3c7432').cone(0.026, 0.3, 5).pop();
	return b;
}

function makeTractor() {
	const b = new MB();
	b.set(PART.STATIC, 0);
	b.push().move(0.058, 0.026, 0).tint(SL.VEH).box(0.07, 0.04, 0.04).pop();
	b.push().move(0.0, 0.03, 0).tint(SL.VEH).box(0.055, 0.025, 0.056).pop();
	b.push().move(-0.004, 0.055, 0).color('#9cc6db').box(0.045, 0.04, 0.042).pop();
	b.push().move(-0.004, 0.095, 0).tint(SL.VEH).box(0.056, 0.008, 0.054).pop();
	for (const s of [-1, 1]) {
		b.push().move(-0.004, 0.03, s * 0.034).rotX((s * Math.PI) / 2).color('#232220').move(0, -0.009, 0).cyl(0.03, 0.03, 0.018, 6, true).pop();
		const hx = [];
		for (let i = 0; i < 6; i++) hx.push([Math.cos((i / 6) * Math.PI * 2) * 0.014, 0, Math.sin((i / 6) * Math.PI * 2) * 0.014]);
		b.push().move(-0.004, 0.03, s * 0.0435).rotX((s * Math.PI) / 2).color('#e2b43a').face(hx, [0, -1, 0]).pop();
		b.push().move(0.075, 0.017, s * 0.03).rotX((s * Math.PI) / 2).color('#232220').move(0, -0.007, 0).cyl(0.017, 0.017, 0.014, 5, true).pop();
	}
	// pulluk
	b.push().move(-0.06, 0.006, 0).color('#5d6268').box(0.036, 0.016, 0.07).pop();
	b.set(PART.LAMP, 0).color('#fff2c0').face([[0.0935, 0.034, -0.016], [0.0935, 0.034, 0.016], [0.0935, 0.044, 0.016], [0.0935, 0.044, -0.016]], [0, 0.04, 0]);
	return b;
}

function windmill(b, x, z, i) {
	b.push().move(x, 0, z);
	b.set(PART.STATIC, i).pivot(0, 0, 0);
	b.color('#f3f0e8').cyl(0.045, 0.038, 0.16, 6, false);
	b.push().move(0, 0.16, 0).color('#7a5a3c').cone(0.048, 0.055, 6).pop();
	b.set(PART.ROTOR, i).pivot(0.05, 0.165, 0);
	for (let k = 0; k < 6; k++) {
		b.push().move(0.05, 0.165, 0).rotX((k / 6) * Math.PI * 2).color(k % 2 ? '#f6f1e4' : '#efe7d4');
		b.sheet([[0, 0.012, 0], [0, 0.13, 0], [0, 0.12, 0.035], [0, 0.02, 0.03]]);
		b.pop();
	}
	b.pop();
}

function makeWindmills() {
	const b = new MB();
	windmill(b, -0.11, 0.03, 1);
	windmill(b, 0.11, -0.03, 2);
	return b;
}

function makeTurbine() {
	const b = new MB();
	const h = 0.6;
	b.set(PART.STATIC, 1).pivot(0, 0, 0);
	b.color('#f4f6f8').cyl(0.013, 0.008, h, 5, false);
	b.push().move(0.006, h, 0).color('#e6eaee').box(0.05, 0.022, 0.022).pop();
	b.set(PART.ROTOR, 1).pivot(0.034, h + 0.011, 0);
	b.push().move(0.034, h + 0.011, 0).color('#dfe4e8').rotZ(-Math.PI / 2).cone(0.009, 0.014, 4).pop();
	for (let k = 0; k < 3; k++) {
		b.push().move(0.036, h + 0.011, 0).rotX((k / 3) * Math.PI * 2).color('#f6f8fa');
		b.sheet([[0, 0.006, -0.007], [0, 0.006, 0.007], [0, 0.29, 0.001], [0, 0.29, -0.003]]);
		b.pop();
	}
	return b;
}

function makeAnimals() {
	const b = new MB();
	const P = [[-0.045, 0.02, 0.4], [0.03, -0.042, 2.4], [0.055, 0.04, -0.8], [-0.012, -0.075, 1.6]]; // sıkı sürü (ölçek 2,6: insanla orantılı)
	P.forEach(([x, z, ry], i) => {
		b.push().move(x, 0, z).rotY(ry).pivot(0, 0, 0);
		b.set(PART.BODY, i + 1).tint(SL.ANIM);
		b.push().move(0, 0.012, 0).box(0.046, 0.026, 0.028).pop();
		// bacaklar: ön ve arka çift (ince levha; gövdenin altında koyu)
		for (const lx of [-0.015, 0.015]) b.push().move(lx, 0, 0).tint(SL.AHEAD).box(0.007, 0.013, 0.02, false).pop();
		b.tint(SL.ANIM);
		b.set(PART.HEAD, i + 1).tint(SL.AHEAD);
		b.push().move(0.021, 0.032, 0).snout(0.024, 0.008, 0.009).pop();
		b.pop();
	});
	return b;
}

/** İşçi (+x yönüne bakar): bacaklar, gövde, baş, başörtüsü ya da şapka, kollar, aletler (etkinliğe göre biri görünür). */
function makeWorker() {
	const b = new MB();
	const SK = '#d9a77c';
	// bacaklar (kalça ekleminden sallanır)
	for (const s of [-1, 1]) {
		b.set(s < 0 ? PART.LEG_L : PART.LEG_R, 0).pivot(0, HIP, s * 0.0095);
		b.push().move(0, 0, s * 0.0095).tint(SL.PANTS).box(0.015, HIP, 0.014, false).pop();
	}
	// gövde (belden eğilir, döner): gövde, baş, başlık, sırt küfesi
	b.set(PART.TORSO, 0).pivot(0, HIP, 0);
	b.push().move(0, HIP - 0.004, 0).tint(SL.SHIRT).rotY(Math.PI / 4).cyl(0.02, 0.015, 0.05, 4, true).pop();
	// baş oyuncak oranında biraz büyük (küçük boyda okunurluk: yüz, başörtüsü, şapka seçilsin)
	b.push().move(0, 0.1145, 0).color(SK).head(0.0156).pop();
	// başörtüsü (yazma): başı ve enseyi örter
	b.set(PART.TORSO, SUB.ORTU);
	b.push().move(0, 0.111, 0).tint(SL.HEADW).rotY(Math.PI / 4).cyl(0.018, 0.0095, 0.016, 4, true).pop();
	b.push().move(-0.011, 0.114, 0).tint(SL.HEADW).sheet([[0, 0, -0.012], [0, 0, 0.012], [-0.005, -0.026, 0.011], [-0.005, -0.026, -0.011]]).pop();
	// şapka: siperlik ve tepe
	b.set(PART.TORSO, SUB.SAPKA);
	const brim = [];
	for (let i = 0; i < 6; i++) brim.push([Math.cos((i / 6) * Math.PI * 2) * 0.0255, 0, Math.sin((i / 6) * Math.PI * 2) * 0.0255]);
	b.push().move(0, 0.1245, 0).tint(SL.HEADW).sheet(brim).pop();
	b.push().move(0, 0.1245, 0).tint(SL.HEADW).rotY(Math.PI / 4).cyl(0.0146, 0.0134, 0.012, 4, true).pop();
	// sırt küfesi (çay toplayıcı)
	b.set(PART.TORSO, SUB.KUFE);
	b.push().move(-0.025, 0.062, 0).color('#9b6b34').cyl(0.011, 0.014, 0.034, 5, false).pop();
	// kollar (omuzdan döner): gömlek kolu, elde ten rengi uç
	for (const s of [-1, 1]) {
		b.set(s < 0 ? PART.ARM_L : PART.ARM_R, 0).pivot(0, SHO, s * 0.023);
		b.push().move(0, SHO - 0.04, s * 0.023).tint(SL.SHIRT).box(0.009, 0.04, 0.009, false).pop();
		// el: küçük ters piramit
		b.push().move(0, SHO - 0.041, s * 0.023).color(SK).rotX(Math.PI).cone(0.0055, 0.012, 4).pop();
	}
	// çapa: sap kolun devamı, ağız ucunda (iki el tutar: kollar birlikte döner)
	b.set(PART.ARM_R, SUB.CAPA).pivot(0, SHO, 0.023);
	b.push().move(0, SHO - 0.12, 0.012).color('#7a5a3a').cyl(0.0028, 0.0028, 0.075, 3, false).pop();
	b.push().move(0.009, SHO - 0.121, 0.012).color('#8a8f96').sheet([[-0.01, 0, -0.008], [-0.01, 0, 0.008], [0.01, 0.003, 0.008], [0.01, 0.003, -0.008]]).pop();
	// el sepeti (taşıyıcı: kol kalkınca omuzda)
	b.set(PART.ARM_L, SUB.SEPET).pivot(0, SHO, -0.023);
	b.push().move(0, SHO - 0.076, -0.027).color('#b0803c').cyl(0.016, 0.02, 0.022, 5, false).pop();
	// tırpan: uzun sap, ucunda yatay ağız
	b.set(PART.ARM_R, SUB.TIRPAN).pivot(0, SHO, 0.023);
	b.push().move(0, SHO - 0.135, 0.01).color('#7a5a3a').cyl(0.0026, 0.0026, 0.09, 3, false).pop();
	b.push().move(0.004, SHO - 0.134, 0.01).color('#c8ccd2').sheet([[0, 0, 0], [0.004, 0, -0.052], [0, 0.002, -0.052], [-0.004, 0.002, 0]]).pop();
	return b;
}

const MAKERS = [makeVillage, makeTractor, makeWindmills, makeTurbine, makeAnimals, makeWorker];

function buildAtlas() {
	const W = SLOT * 3;
	const data = new Float32Array(W * NK * 4);
	const tris = [];
	MAKERS.forEach((mk, k) => {
		const b = mk();
		if (b.out.length > SLOT) console.warn('FL: hayat modeli yuvaya sığmadı', k, b.out.length);
		const n = Math.min(b.out.length, SLOT);
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

// köy / araç / hayvan paleti: 4 tür × 5 yuva (duvar, dam, araç, hayvan gövdesi, hayvan başı)
const PAL = [
	['#efe3c8', '#a4855e', '#c8322a', '#efe9db', '#3a3431'], // 0 kerpiç düz dam · kırmızı · koyun
	['#f4efe4', '#c4553a', '#2f5fb8', '#3a312b', '#2a2420'], // 1 badana + kiremit · mavi · keçi
	['#8c5f3e', '#6f6a66', '#3e8f3c', '#7b4a2a', '#5a3620'], // 2 ahşap (Karadeniz) · yeşil · kahve inek
	['#dcc3a5', '#c9b08e', '#e07a2a', '#f0efe9', '#2a2a2a'], // 3 tüf taşı düz dam (Kapadokya) · turuncu · alaca inek
];
// işçi görünüşleri: gömlek, pantolon/şalvar, başlık (0–2 başörtülü kadın, 3–5 şapkalı erkek)
const WPAL = [
	['#c8455a', '#3d4a86', '#efd65a'], // 0 kırmızı yelek, lacivert şalvar, sarı yazma (Rize)
	['#d97a3c', '#6a4a8a', '#f4f0e4'], // 1 turuncu, mor şalvar, beyaz yazma
	['#5aa06a', '#4a3a5a', '#e47a9a'], // 2 yeşil, koyu şalvar, pembe yazma
	['#5a7ab8', '#4a4038', '#3a3a3a'], // 3 mavi gömlek, kahve pantolon, kasket
	['#ece6d4', '#3a3a44', '#d8c08a'], // 4 beyaz gömlek, koyu pantolon, hasır şapka
	['#9a5a3a', '#3e4a3a', '#2e2e30'], // 5 kiremit gömlek, haki pantolon, kasket
];

// ------------------------------------------------------------------ gölgelendiriciler

const VS = /* glsl */ `
${COMMON}
${PROV}
${CLEAR}
uniform sampler2D uM;
uniform vec3 uPal[20];
uniform vec3 uWPal[18];
uniform vec2 uFade[${NK}];
uniform float uPLift, uPSel;
uniform vec4 uCastle[4];
uniform vec3 uEye; // ana kameranın konumu (gölge geçişinde de sönme aynı olsun)
uniform mat4 uVP; // ana kameranın izdüşüm × bakış dönüşümü (insanın ekran odağı; gölge geçişinde de aynı)
uniform float uBorn; // yerleşimin bittiği an: o an ekrandakiler 0,8 sn'de titreşimle belirir (birden çıkmasın)
attribute vec4 iA; // x, zemin y, z, yön
attribute vec4 iB; // tür, ölçek, il, evre
attribute vec4 iC; // eğim dh/dx, dh/dz (araçta: yol boyu, hız), tür/etkinlik, ek (araçta bitiş zemini, köyde boy, yürüyende yol)
varying vec3 vW;
varying vec3 vC;
varying float vY;
varying float vSlot;
varying float vEm;
varying vec2 vSel;
varying float vFade;
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
vec3 rotZ(vec3 d, float a) {
	float c = cos(a), s = sin(a);
	return vec3(d.x * c - d.y * s, d.x * s + d.y * c, d.z);
}
float hh(float n) {
	return fract(sin(n * 12.9898) * 43758.5453);
}
// yarış pisti biçimli yol: L boyunca git, r yarıçaplı yarım daireyle dön, geri gel (sürekli, adımsız)
vec3 stadium(float L, float r, float v, float t) {
	float P = 2.0 * L + 6.2832 * r;
	float s = fract(t * v / P) * P;
	if (s < L) return vec3(-L * 0.5 + s, -r, 0.0);
	if (s < L + 3.1416 * r) {
		float a = (s - L) / r;
		return vec3(L * 0.5 + r * sin(a), -r * cos(a), a);
	}
	if (s < 2.0 * L + 3.1416 * r) return vec3(L * 0.5 - (s - L - 3.1416 * r), r, 3.1416);
	float a = (s - 2.0 * L - 3.1416 * r) / r;
	return vec3(-L * 0.5 - r * sin(a), r * cos(a), 3.1416 + a);
}
void main() {
	int kind = int(iB.x + 0.5);
	int vid = gl_VertexID;
	vec4 T0 = texelFetch(uM, ivec2(vid * 3, kind), 0);
	vec3 base = iA.xyz;
	vec2 fd = uFade[kind];
	float fade = 1.0 - smoothstep(fd.x, fd.y, distance(uEye, base));
	// savaş açıklığında ve kale inerken gömülür
	fade *= (1.0 - clearK(base.xz, 0.3)) * (1.0 - castleK(base.xz, base.y)) * clamp((uTime - uBorn) * 1.25, 0.0, 1.0);
	if (kind == ${K.ISCI}) {
		// insan yalnız ekranın odağında (yaklaşılan noktada) görünür
		vec4 cp = uVP * vec4(base, 1.0);
		vec2 nd = cp.xy / max(cp.w, 1e-3);
		fade *= 1.0 - smoothstep(0.66, 0.86, length(nd * vec2(1.0, 0.8)));
	}
	vec4 T2 = texelFetch(uM, ivec2(vid * 3 + 2, kind), 0);
	float part = T0.w;
	float sub = T2.w;
	float ph = iB.w;
	float variant = iC.z;
	int act = int(variant / 8.0);
	int look = int(mod(variant, 8.0) + 0.5);
	float gone = 0.0;
	if (kind == ${K.KOY} && sub > 0.5) {
		// küçük mezrada bazı evler ve cami yok (aynı köy kopyası görünmesin)
		float hv = hh(ph * 31.7 + sub * 7.13);
		gone = sub > 10.5 ? 0.0 : sub > 9.5 ? step(iC.w, 0.45) : step(mix(0.55, 1.02, iC.w), hv);
	} else if (kind == ${K.ISCI} && sub > 0.5) {
		// etkinliğin aleti ve görünüşün başlığı
		bool woman = look < 3;
		bool keep = (sub < 1.5 && act == 0) || (sub > 1.5 && sub < 2.5 && act == 2) || (sub > 2.5 && sub < 3.5 && act == 3) || (sub > 3.5 && sub < 4.5 && act == 1) || (sub > 4.5 && sub < 5.5 && woman) || (sub > 5.5 && !woman);
		gone = keep ? 0.0 : 1.0;
	}
	if (part < -0.5 || fade < 0.004 || gone > 0.5) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		return;
	}
	vec4 T1 = texelFetch(uM, ivec2(vid * 3 + 1, kind), 0);
	vec3 p = T0.xyz;
	vec3 piv = T2.xyz;
	float t = uTime;
	// --- yavaş, sürekli canlandırmalar
	if (part > 0.5 && part < 1.5) {
		// kanat: yel değirmeni ağır ağır, türbin daha da ağır
		float a = t * (kind == ${K.TURBIN} ? 0.45 : 0.32) + ph * 6.2832 + sub * 1.3;
		vec3 d = p - piv;
		d.yz = rot2(d.yz, a);
		p = piv + d;
	} else if (part > 1.5 && part < 3.5) {
		// hayvan: çok yavaş yön değiştirir; baş ara sıra yavaşça otlamaya iner
		float s1 = ph * 9.1 + sub * 2.37;
		vec3 d = p - piv;
		d.xz = rot2(d.xz, 0.7 * sin(t * 0.045 + s1));
		if (part > 2.5) d.y -= 0.007 * smoothstep(0.25, 0.75, 0.5 + 0.5 * sin(t * 0.55 + s1 * 3.0));
		p = piv + d;
	} else if (part > 4.5 && part < 5.5) {
		if (variant < 0.5 || (variant > 2.5 && variant < 3.5)) p.y -= T2.y; // düz damlı köy (kerpiç, tüf)
	} else if (part > 9.5) {
		// insan: etkinliğe göre (0 çapa, 1 toplama, 2 sepet taşıma, 3 tırpan)
		float torso = 0.0;
		float twist = 0.0;
		float armL = 0.12;
		float armR = 0.12;
		float leg = 0.0;
		float w = t + ph * 13.0;
		if (act == 0) {
			float c = fract(w / 2.9);
			float up = smoothstep(0.0, 0.55, c) * (1.0 - smoothstep(0.6, 0.76, c)); // ağır kaldır, indir
			armL = mix(0.5, 2.35, up);
			armR = armL;
			torso = -mix(0.5, 0.12, up);
		} else if (act == 1) {
			torso = -0.9 + 0.05 * sin(w * 1.3);
			armL = 0.6 + 0.4 * (0.5 + 0.5 * sin(w * 2.6));
			armR = 0.6 + 0.4 * (0.5 + 0.5 * sin(w * 2.6 + 3.1416));
		} else if (act == 2) {
			float g = sin(w * 5.0);
			leg = 0.3 * g;
			armR = 0.08 - 0.25 * g;
			armL = 2.75;
			torso = -0.04;
		} else {
			float g = sin(w * 2.35);
			twist = 0.55 * g;
			armL = 0.95 + 0.1 * sin(w * 2.35 + 1.2);
			armR = armL;
			torso = -0.25;
		}
		vec3 d = p - piv;
		if (part < 10.5) p = piv + rotZ(d, leg);
		else if (part < 11.5) p = piv + rotZ(d, -leg);
		else if (part > 12.5 && part < 13.5) p = piv + rotZ(d, armL);
		else if (part > 13.5) p = piv + rotZ(d, armR);
		if (part > 11.5) {
			vec3 e = p - vec3(0.0, ${HIP.toFixed(3)}, 0.0);
			e = rotZ(e, torso);
			e.xz = rot2(e.xz, twist);
			p = vec3(0.0, ${HIP.toFixed(3)}, 0.0) + e;
		}
	}
	// --- yol: traktör çok yavaş sürer (yoksa park hâlinde), taşıyıcı tarla kenarında ağır ağır yürür
	float yb = iA.y;
	bool mover = kind == ${K.TRAKTOR};
	vec2 grad = mover ? vec2(0.0) : iC.xy;
	if (mover && iC.x > 0.01) {
		vec3 st = stadium(iC.x, 0.06, iC.y, t + ph * 400.0);
		p.xz = rot2(p.xz, st.z) + st.xy;
		yb = mix(iA.y, iC.w, clamp(st.x / iC.x + 0.5, 0.0, 1.0));
	} else if (kind == ${K.ISCI} && act == 2 && iC.w > 0.01) {
		vec3 st = stadium(iC.w, 0.03, 0.02, t + ph * 300.0);
		p.xz = rot2(p.xz, st.z) + st.xy;
		piv.xz = st.xy;
	}
	if (!mover) {
		// eğim: alt nesne tabanı yerel zemin düzleminde (ev, hayvan, insan kendi yerine oturur)
		vec2 pw = rot2(piv.xz * iB.y, iA.w);
		p.y += dot(grad, pw) / max(iB.y, 1e-3);
	}
	p *= iB.y;
	p.xz = rot2(p.xz, iA.w);
	vec4 fx = provRow(iB.z, 3);
	vec3 wp = vec3(iA.x, yb + fx.x * uPLift + fx.z * uPSel - 0.003, iA.z) + p;
	vW = wp;
	vY = T0.y;
	float slot = T1.w;
	vec3 col = T1.rgb;
	if (slot > 5.5) col = uWPal[look * 3 + int(slot + 0.5) - 6];
	else if (slot > 0.5) col = uPal[int(mod(variant, 4.0) + 0.5) * 5 + int(slot + 0.5) - 1];
	vC = col;
	vSlot = slot;
	vEm = part > 6.5 && part < 7.5 ? 1.0 : 0.0;
	vSel = vec2(fx.z, fx.w);
	vFade = fade;
	gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
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
varying float vFade;
// 4×4 Bayer eşiği: titreşimli (piksel piksel) beliriş, yerden büyüme yok
const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
float bayer(vec2 f) {
	ivec2 p = ivec2(mod(floor(f), 4.0));
	return (BAYER[p.y * 4 + p.x] + 0.5) / 16.0;
}
void main() {
	// türevler (düz gölgeleme normali) atmadan önce
	vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
	if (vFade < 0.999 && vFade <= bayer(gl_FragCoord.xy)) discard;
	vec3 V = normalize(cameraPosition - vW);
	if (dot(N, V) < 0.0) N = -N;
	vec3 alb = vC * 0.92;
	float ao = mix(0.62, 1.0, smoothstep(0.0, 0.05, vY));
	// pencereler: duvarda tek sıra (gündüz koyu cam, gece sıcak ışık)
	float win = 0.0;
	if (vSlot > 0.5 && vSlot < 1.5 && abs(N.y) < 0.4) {
		vec2 tn = normalize(vec2(-N.z, N.x) + 1e-5);
		float u = dot(vW.xz, tn) / 0.04;
		float fu = fwidth(u);
		float wy = (vY - 0.032) / 0.03;
		win = (1.0 - smoothstep(0.16 - fu, 0.16 + fu, abs(fract(u) - 0.5))) * step(0.0, wy) * step(wy, 1.0);
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
		c += N_WARM * nk * (win * 2.4 + vEm * 3.0);
		gRelit = 1.0;
	}
	c = provDim(c, vSel.x, vSel.y);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

// gölge geçişi: nesne ışığa doğru kaydırılır; sönmenin yarısında gölgesi de kalkar (titreşimle silinen nesnenin
// "hayalet gölgesi" kalmasın)
const DEPTH_VS = VS.replace('gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);\n}', 'gl_Position = projectionMatrix * viewMatrix * vec4(wp + uSunDir * 0.3, 1.0);\n}').replace('fade < 0.004 ||', 'fade < 0.5 ||');
const DEPTH_FS = /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`;

// ------------------------------------------------------------------ hayat katmanı

export class Hayat {
	/**
	 * @param G ortak uniform'lar (uNoise CPU verisi yerleşimde de okunur)
	 * @param tier kalite kademesi (q0'da kurulmaz: app.js)
	 * @param board harita
	 * @param props ağaçlar ve ünlü yapılar (çakışma denetimi)
	 */
	constructor(G, tier, board, props) {
		this.G = G;
		this.board = board;
		this.props = props;
		this.tier = tier;
		this.cap = tier.id >= 2 ? 20 : 10; // tamponda en çok (ekranda bunun ~%70'i)
		const atlas = buildAtlas();
		this.modelTris = atlas.tris;
		this.list = [];
		this.ready = false;
		this._stat = {}; // yerleşim reddi sayıları (ölçüm)
		this.n = 0;
		this.dirty = false;
		// örnek tamponu (önceden ayrılmış)
		const geo = new THREE.InstancedBufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SLOT * 3), 3));
		this.buf = new THREE.InstancedInterleavedBuffer(new Float32Array(this.cap * 12), 12);
		this.buf.setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute('iA', new THREE.InterleavedBufferAttribute(this.buf, 4, 0));
		geo.setAttribute('iB', new THREE.InterleavedBufferAttribute(this.buf, 4, 4));
		geo.setAttribute('iC', new THREE.InterleavedBufferAttribute(this.buf, 4, 8));
		geo.instanceCount = 0;
		geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
		this.geo = geo;
		const pal = [];
		for (const row of PAL) for (const h of row) pal.push(new THREE.Color(h));
		const wpal = [];
		for (const row of WPAL) for (const h of row) wpal.push(new THREE.Color(h));
		this.uniforms = {
			...G,
			uState: { value: board.stateTex },
			uSelOn: board.uSelOn,
			uPLift: { value: board.liftUnit },
			uPSel: { value: board.selLiftUnit },
			uCastle: { value: props.landmarks.castleU },
			uM: { value: atlas.tex },
			uPal: { value: pal },
			uWPal: { value: wpal },
			uFade: { value: FADE.map(([a, b]) => new THREE.Vector2(a, b)) },
			uEye: { value: new THREE.Vector3(0, 100, 0) },
			uVP: { value: new THREE.Matrix4() },
			uBorn: { value: 0 },
		};
		const taps = String(tier.shadowTaps);
		this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps), uniforms: this.uniforms }));
		this.mesh.frustumCulled = false;
		this.mesh.matrixAutoUpdate = false;
		this.caster = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms: this.uniforms }));
		this.caster.frustumCulled = false;
		this.caster.matrixAutoUpdate = false;
		this.mesh.visible = this.caster.visible = false;
		this._key = -1;
		// akış seçimi için önceden ayrılmış diziler (kare başına nesne yok)
		this._cand = new Int32Array(512);
		this._candD = new Float32Array(512);
		this._ids = new Int32Array(this.cap);
		this._idsPrev = new Int32Array(this.cap);
		// köy ızgarası dokusu (harita aynı köylerin toprağını çizer)
		this.vil = new Uint8Array(VIL.nx * VIL.nz * 4);
		this.vilTex = new THREE.DataTexture(this.vil, VIL.nx, VIL.nz, THREE.RGBAFormat, THREE.UnsignedByteType);
		this.vilTex.magFilter = this.vilTex.minFilter = THREE.NearestFilter;
		this.vilTex.generateMipmaps = false;
		this.vilTex.needsUpdate = true;
	}

	/**
	 * Yerleşimi küçük dilimler hâlinde yap (her dilim ≤ ~4 ms, araya kareler girer: uzun iş yok). Bitince ready.
	 * Dönen söz yerleşim bitince çözülür.
	 */
	start(store = null) {
		if (this._done) return this._done;
		const t0 = performance.now();
		// yerleşim sabit tohumla (rng 2025) ve sabit haritayla: aynı sürüm ve kademede sonuç hep aynı. Sonuç (~30 KB) cihazda
		// saklanır; ilk açılıştan sonra yerleşim hesabı hiç yapılmaz (zayıf telefonda ~11 sn arka plan işi ve takılmalar)
		const key = `hayat:${typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'yerel'}:${this.tier.id}`;
		const hit = this._restore(store, key);
		if (hit) {
			this._finish();
			this.placeMs = Math.round(performance.now() - t0);
			this.cached = true;
			return (this._done = Promise.resolve());
		}
		this._done = Promise.resolve(this.props.landmarks.farReady).catch(() => null).then(() => new Promise((resolve) => {
			const gen = this._place();
			// boşta kalan zamanda (requestIdleCallback: kare çizimine dokunmaz, karenin kalan süresi kadar); yoksa (Safari)
			// 4 ms'lik dilimler. Adımlar zaten kısa (ağaç ızgarası dahil dilimli)
			const idle = typeof requestIdleCallback === 'function';
			const step = (dl) => {
				const s = performance.now();
				const budget = idle && dl ? Math.max(1, Math.min(8, dl.timeRemaining() - 1)) : 4;
				let r;
				do r = gen.next();
				while (!r.done && performance.now() - s < budget);
				if (!r.done) {
					if (idle) requestIdleCallback(step, { timeout: 120 });
					else setTimeout(step, 0);
					return;
				}
				this._finish();
				this._save(store, key);
				this.placeMs = Math.round(performance.now() - t0);
				resolve();
			};
			if (idle) requestIdleCallback(step, { timeout: 120 });
			else setTimeout(step, 0);
		}));
		return this._done;
	}

	/**
	 * Yerleşim önbelleği tek yuvada: tarayıcıda ayrı localStorage anahtarı (ana kaydı her yazımda 30 KB şişirmesin; yeni
	 * sürüm eskisinin üstüne yazar, birikme yok), yoksa ana oyunun kayıt yuvası.
	 */
	_slot(store) {
		try {
			if (typeof localStorage !== 'undefined') {
				return { get: () => JSON.parse(localStorage.getItem('fetih.hayat') || 'null'), set: (v) => localStorage.setItem('fetih.hayat', JSON.stringify(v)) };
			}
		} catch (e) {
			/* depolama kapalı */
		}
		return { get: () => store?.get?.('hayat'), set: (v) => store?.set?.('hayat', v) };
	}

	/** Saklanan yerleşimi geri yükle (yoksa false). */
	_restore(store, key) {
		try {
			const c = this._slot(store).get();
			if (!c || c.key !== key) return false;
			if (!c || !Array.isArray(c.l) || !Array.isArray(c.c)) return false;
			const F = 12;
			const list = [];
			for (let i = 0; i + F <= c.l.length; i += F) {
				const [x, y, z, yaw, k, s, pid, ph, c0, c1, v, w] = c.l.slice(i, i + F);
				list.push({ x, y, z, yaw, k, s, pid, ph, c0, c1, v, w, r: FOOT[k] * s });
			}
			this.list = list;
			this.castles = c.c.map(([x, z, r, core]) => ({ x, z, r, core }));
			// haritanın kale yerleri de aynı aramanın sonucu (il sırasıyla): oyun içinde başkent kurulurken yeniden aranmaz
			const B = this.board;
			B._castle = B._castle || [];
			this.castles.forEach((k, i) => {
				if (!B._castle[i]) B._castle[i] = { x: k.x, z: k.z, s: k.core / 1.1 };
			});
			return true;
		} catch (e) {
			return false;
		}
	}

	/** Yerleşimi sakla (sığmazsa sessizce geç: bir sonraki açılış yeniden hesaplar). */
	_save(store, key) {
		try {
			const r4 = (x) => Math.round(x * 1e4) / 1e4;
			const l = [];
			for (const o of this.list) l.push(r4(o.x), r4(o.y), r4(o.z), r4(o.yaw), o.k, r4(o.s), o.pid, r4(o.ph), r4(o.c0), r4(o.c1), o.v, r4(o.w));
			this._slot(store).set({ key, l, c: this.castles.map((c) => [r4(c.x), r4(c.z), r4(c.r), r4(c.core)]) });
		} catch (e) {
			/* depolama dolu ya da yok */
		}
	}

	_finish() {
		const CELL = 4;
		const nx = Math.ceil(100 / CELL);
		const nz = Math.ceil(50 / CELL);
		this.nx = nx;
		this.nz = nz;
		this.CELL = CELL;
		const cellOf = (o) => Math.max(0, Math.min(nz - 1, Math.floor((o.z + 25) / CELL))) * nx + Math.max(0, Math.min(nx - 1, Math.floor((o.x + 50) / CELL)));
		this.list.sort((a, b) => cellOf(a) - cellOf(b));
		this.cellStart = new Int32Array(nx * nz + 1);
		for (const o of this.list) this.cellStart[cellOf(o) + 1]++;
		for (let i = 0; i < nx * nz; i++) this.cellStart[i + 1] += this.cellStart[i];
		const n = this.list.length;
		this.all = new Float32Array(n * 12);
		this.list.forEach((o, i) => this.all.set([o.x, o.y, o.z, o.yaw, o.k, o.s, o.pid, o.ph, o.c0, o.c1, o.v, o.w], i * 12));
		this.counts = new Array(NK).fill(0);
		for (const o of this.list) this.counts[o.k]++;
		this.vilTex.needsUpdate = true;
		this.uniforms.uBorn.value = this.G.uTime.value;
		this.ready = true;
	}

	/** Kare başına (yalnız birkaç işlem): kamera bir adım kayınca yakın örnekler tampona seçilir. */
	update(cam) {
		const eye = cam.cam.position;
		this.uniforms.uEye.value.copy(eye);
		const C = cam.cam;
		C.updateMatrixWorld();
		this.uniforms.uVP.value.multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse);
		const d = cam.dist;
		// ekranın en yakın zemin noktasına uzaklık (alt kenar ışını): eğim ve zum ne olursa olsun nesneler oradan söner
		const gy = this.board.groundAt(cam.target.x, cam.target.z);
		const dn = (eye.y - gy) / Math.sin(Math.min(1.55, cam.pitch + (C.fov * Math.PI) / 360));
		const near = dn < NEAR;
		this.board.setNear(near); // zemin: yakın zum programı (ekin ayrıntısı, köy toprağı) ya da ana dalın maliyeti
		if (!this.ready || !near) {
			this.mesh.visible = this.caster.visible = false;
			return;
		}
		const tx = cam.target.x;
		const tz = cam.target.z;
		const key = ((Math.floor((tx + 50) * 2) * 256 + Math.floor((tz + 25) * 2)) * 64 + Math.round(d)) * 64 + (Math.round(cam.yaw / 0.17) & 63);
		if (key !== this._key) {
			this._key = key;
			this._refill(cam, eye, tx, tz, d);
		}
		this.mesh.visible = this.caster.visible = this.n > 0;
	}

	_refill(cam, eye, tx, tz, d) {
		const A = this.all;
		const R = d * 1.1 + 2;
		let fx = tx - eye.x;
		let fz = tz - eye.z;
		const fl = Math.hypot(fx, fz) || 1;
		fx /= fl;
		fz /= fl;
		const C = cam.cam;
		const tanH = Math.tan(((C.fov * Math.PI) / 180) * 0.5) * C.aspect * 1.25;
		const c0 = Math.max(0, Math.floor((tx - R + 50) / this.CELL));
		const c1 = Math.min(this.nx - 1, Math.floor((tx + R + 50) / this.CELL));
		const r0 = Math.max(0, Math.floor((tz - R + 25) / this.CELL));
		const r1 = Math.min(this.nz - 1, Math.floor((tz + R + 25) / this.CELL));
		const cand = this._cand;
		const cd = this._candD;
		let m = 0;
		for (let j = r0; j <= r1; j++)
			for (let i = c0; i <= c1; i++) {
				const c = j * this.nx + i;
				for (let k = this.cellStart[c]; k < this.cellStart[c + 1] && m < cand.length; k++) {
					const o = k * 12;
					const kind = A[o + 4];
					const dx = A[o] - eye.x;
					const dy = A[o + 1] - eye.y;
					const dz = A[o + 2] - eye.z;
					const lim = FADE[kind][1] + 0.6;
					if (dx * dx + dy * dy + dz * dz > lim * lim) continue;
					const al = dx * fx + dz * fz;
					if (al < -0.5 || Math.abs(dx * fz - dz * fx) > al * tanH + 0.8) continue;
					// öncelik: odağa (kameranın baktığı nokta) yakınlık; insanlar odağın çevresinde
					const gx = A[o] - tx;
					const gz = A[o + 2] - tz;
					const g = Math.hypot(gx, gz);
					if (kind === K.ISCI && g > 2.2) continue;
					cand[m] = k;
					cd[m] = g;
					m++;
				}
			}
		// en yakın cap kadarı (seçme sıralaması: yerinde, ayırma yok)
		const n = Math.min(this.cap, m);
		for (let a = 0; a < n; a++) {
			let best = a;
			for (let b = a + 1; b < m; b++) if (cd[b] < cd[best]) best = b;
			const ti = cand[a];
			const td = cd[a];
			cand[a] = cand[best];
			cd[a] = cd[best];
			cand[best] = ti;
			cd[best] = td;
		}
		// küme değişmediyse tampon ve gölge olduğu gibi kalır (yalnız sıra değişmiş olabilir)
		const ids = this._ids;
		for (let a = 0; a < n; a++) {
			let v = cand[a];
			let b = a;
			for (; b > 0 && ids[b - 1] > v; b--) ids[b] = ids[b - 1];
			ids[b] = v;
		}
		let same = n === this.n;
		for (let a = 0; same && a < n; a++) same = ids[a] === this._idsPrev[a];
		if (same) return;
		this._idsPrev.set(ids.subarray(0, n));
		const B = this.buf.array;
		for (let a = 0; a < n; a++) {
			const o = cand[a] * 12;
			for (let q = 0; q < 12; q++) B[a * 12 + q] = A[o + q];
		}
		this.n = n;
		this.dirty = true;
		this.geo.instanceCount = n;
		this.buf.clearUpdateRanges();
		this.buf.addUpdateRange(0, n * 12);
		this.buf.needsUpdate = true;
	}

	/** Tampondaki örneklerin model üçgeni (en çok). */
	get triangles() {
		let t = 0;
		const B = this.buf.array;
		for (let i = 0; i < this.n; i++) t += this.modelTris[B[i * 12 + 4]];
		return t;
	}

	// ---------------------------------------------------------------- çakışma kuralları (yerleşim ve denetim aynı)

	_rules() {
		if (this._R) return this._R;
		const it = this._rulesGen();
		while (!it.next().done);
		return this._R;
	}

	/** Çakışma kuralları, dilim dilim (yerleşimde: ağaç ızgarası binlerce örnek; tek adımda yavaş telefonda uzun kare). */
	*_rulesGen() {
		if (this._R) return;
		const board = this.board;
		const rel = board.relief;
		// yapılar: uzak sürüm hazırsa gerçek ayak izi (avlu dahil; köşelerin yapı merkezine en büyük yatay uzaklığı) + pay,
		// yoksa teras dış yarıçapı
		const farR = this._farExtents();
		const sites = (this.props.landmarks.sites || []).map((s) => {
			const fr = farR.get(s.x.toFixed(3) + ',' + s.z.toFixed(3));
			return { x: s.x, z: s.z, r: (fr != null ? Math.max(fr, (s.s ?? 1.5) * 0.72) : Math.max(padR(s.s ?? 1.5)[1], (s.s ?? 1.5) * 1.05)) + 0.15 };
		});
		// her ilin olası başkent kalesi (her il başkent olabilir): kale tepesinin düz zemindeki izi ≈ 1,66 × ölçek (pay
		// ile 2 × ölçek). Köy, değirmen ve türbin buradan uzak durur; küçük nesneler (insan, hayvan, traktör) kale inerken
		// ağaçlar gibi gömülür (castleK: 2,3 birim; iz en çok 2,1). Yerleşimde dilim dilim hesaplanır.
		const castles = this.castles;
		// il adları: yazının dünya genişliği (yükseklik × en/boy) yarısı
		const L = board.labelLayer;
		const labels = board.provinces.map((p) => {
			const a = L.pos ? [L.pos[p.index * 3], L.pos[p.index * 3 + 2]] : [p.x, p.z];
			const h = L.size ? L.size[p.index * 3 + 1] : 0.6;
			const asp = L.size ? L.size[p.index * 3] || 3 : 3;
			return { x: a[0], z: a[1], r: 0.5 * h * asp + 0.25 };
		});
		// nehirler: çizgi parçaları (kaba ızgara dizini)
		const RG = 1;
		const segs = [];
		const rgrid = new Map();
		for (const r of DATA.rivers) {
			const P = r.pts;
			for (let i = 0; i + 3 < P.length; i += 2) {
				const s = [P[i], -P[i + 1], P[i + 2], -P[i + 3]];
				const id = segs.length;
				segs.push(s);
				for (let gx = Math.floor(Math.min(s[0], s[2]) / RG); gx <= Math.floor(Math.max(s[0], s[2]) / RG); gx++)
					for (let gz = Math.floor(Math.min(s[1], s[3]) / RG); gz <= Math.floor(Math.max(s[1], s[3]) / RG); gz++) {
						const k = gx * 4096 + gz;
						if (!rgrid.has(k)) rgrid.set(k, []);
						rgrid.get(k).push(id);
					}
			}
		}
		const riverD = (x, z) => {
			let best = 9;
			for (let gx = Math.floor(x / RG) - 1; gx <= Math.floor(x / RG) + 1; gx++)
				for (let gz = Math.floor(z / RG) - 1; gz <= Math.floor(z / RG) + 1; gz++) {
					const l = rgrid.get(gx * 4096 + gz);
					if (!l) continue;
					for (const id of l) {
						const [ax, az, bx, bz] = segs[id];
						const dx = bx - ax;
						const dz = bz - az;
						const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1e-9)));
						best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
					}
				}
			return best;
		};
		// ağaçlar (props.js örnekleri): kaba ızgara
		const trees = new Map();
		const TG = 1;
		for (const m of this.props.group.children) {
			const a = m.geometry?.getAttribute?.('iP');
			if (!a || !m.geometry.isInstancedBufferGeometry) continue;
			for (let i = 0; i < m.geometry.instanceCount; i++) {
				const x = a.getX(i);
				const z = a.getY(i);
				const s = a.getZ(i);
				const k = Math.floor(x / TG) * 4096 + Math.floor(z / TG);
				if (!trees.has(k)) trees.set(k, []);
				trees.get(k).push([x, z, 0.21 * s]);
				if ((i & 511) === 511) yield;
			}
			yield;
		}
		const treeHit = (x, z, r) => {
			for (let gx = Math.floor(x / TG) - 1; gx <= Math.floor(x / TG) + 1; gx++)
				for (let gz = Math.floor(z / TG) - 1; gz <= Math.floor(z / TG) + 1; gz++) {
					const l = trees.get(gx * 4096 + gz);
					if (l) for (const [tx, tz, tr] of l) if (Math.hypot(x - tx, z - tz) < r + tr + 0.02) return true;
				}
			return false;
		};
		const noise = this.G.uNoise.value.image.data;
		this._R = { sites, castles, labels, riverD, treeHit, noise, rel };
	}

	/**
	 * Bir ayak izinin (merkez x, z, yarıçap r) çakıştığı ilk kural ya da null. ilk: yerleşimde kullanılan sıra.
	 * Kurallar: deniz ve kıyı, il sınırı, göl, nehir, yapı terası/avlusu, başkent kalesi yeri, il adı, tarla yolu (bölge
	 * sınırı), ağaç, öteki nesneler.
	 */
	_hit(x, z, r, pid, skipSelf = -1, small = false, coastR = null) {
		const h = this._hit0(x, z, r, pid, skipSelf, small, coastR);
		if (this._stat) this._stat[h || 'ok'] = (this._stat[h || 'ok'] || 0) + 1;
		return h;
	}

	_hit0(x, z, r, pid, skipSelf, small, coastR = null) {
		const R = this._rules();
		const board = this.board;
		if (board.pick(x, z) !== pid) return 'il';
		const cr = coastR ?? r + 0.12;
		if (board.borderDist(x, z, cr + 0.2) < cr) return 'kiyi-sinir';
		for (let i = 0; i < 9; i++) {
			const a = (i / 8) * Math.PI * 2;
			const sx = i === 8 ? x : x + Math.cos(a) * r;
			const sz = i === 8 ? z : z + Math.sin(a) * r;
			if (R.rel.bil(R.rel.La, sx, -sz) > 0.02 || board.lakeAt(sx, sz)) return 'gol';
		}
		if (R.riverD(x, z) < r + 0.12) return 'nehir';
		for (const s of R.sites) if (Math.hypot(x - s.x, z - s.z) < s.r + r) return 'yapi';
		if (!small) for (const c of R.castles) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return 'kale';
		for (const l of R.labels) if (Math.hypot(x - l.x, z - l.z) < l.r + r) return 'etiket';
		// tarla yolu: ayak izi tek bir bölgenin içinde kalmalı (yol bölge sınırında)
		const prof = this._prof(pid);
		const f0 = fieldAt(x, z, prof, R.noise);
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			const f = fieldAt(x + Math.cos(a) * (r + 0.07), z + Math.sin(a) * (r + 0.07), prof, R.noise);
			if (f.zone[0] !== f0.zone[0] || f.zone[1] !== f0.zone[1]) return 'yol';
		}
		if (R.treeHit(x, z, r)) return 'agac';
		for (let i = 0; i < this.list.length; i++) {
			if (i === skipSelf) continue;
			const o = this.list[i];
			if (Math.hypot(x - o.x, z - o.z) < r + o.r + 0.04) return 'nesne';
		}
		return null;
	}

	/** Kale yerinin çekirdeğinde mi (köy, değirmen, türbin buraya girmez; eteğindeyse kale inince castleK ile gömülür). */
	_inCastle(x, z, r) {
		return this.castles.some((c) => Math.hypot(x - c.x, z - c.z) < c.core + r);
	}

	_prof(pid) {
		this._pc ||= new Map();
		let p = this._pc.get(pid);
		if (!p) this._pc.set(pid, (p = profileOf(this.board.provinces[pid])));
		return p;
	}

	*_place() {
		const board = this.board;
		const rel = board.relief;
		const R = rng(2025);
		const q2 = this.tier.id >= 2;
		const dens = q2 ? 1 : 0.55;
		const ss = (a, b, x) => {
			const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
			return t * t * (3 - 2 * t);
		};
		const terr = (x, z) => {
			const y = -z;
			const eps = 0.1;
			const hx = rel.height(x + eps, y) - rel.height(x - eps, y);
			const hy = rel.height(x, y + eps) - rel.height(x, y - eps);
			const ny = 1 / Math.hypot(-hx / (2 * eps), 1, hy / (2 * eps));
			return { ny, F: rel.bil(rel.F, x, y), Ro: rel.bil(rel.Ro, x, y), e: rel.elev(x, y) };
		};
		const farmK = (x, z, top) => {
			const T = terr(x, z);
			return (1 - ss(0.1, 0.4, T.F)) * (1 - ss(0.15, 0.45, T.Ro)) * ss(0.985, 0.998, T.ny) * (1 - ss(top - 250, top + 250, T.e));
		};
		const roadK = (x, z, top) => {
			const T = terr(x, z);
			return (1 - ss(0.2, 0.5, T.F)) * (1 - ss(0.25, 0.5, T.Ro)) * ss(0.95, 0.985, T.ny) * (1 - ss(top, top + 400, T.e));
		};
		const slopeK = (x, z, prof) => {
			if (!prof.sa) return 0;
			const T = terr(x, z);
			const top = { cay: 1100, findik: 1000, zeytin: 900, bag: 1500, kayisi: 1500, fistik: 1200, mera: 2600 }[prof.s] ?? 1000;
			const fOK = prof.s === 'cay' || prof.s === 'findik' ? 1 : 1 - ss(0.25, 0.6, T.F);
			return prof.sa * ss(0.42, 0.66, T.ny) * (1 - ss(0.985, 0.996, T.ny)) * (1 - ss(top - 150, top + 150, T.e)) * fOK * (1 - ss(0.35, 0.65, T.Ro));
		};
		const ground = (x, z) => board.groundAt(x, z);
		const add = (o) => {
			o.y ??= ground(o.x, o.z);
			o.ph ??= R();
			o.s ??= 1;
			o.r = FOOT[o.k] * o.s;
			if (o.c0 == null) {
				const e = 0.2;
				o.c0 = (ground(o.x + e, o.z) - ground(o.x - e, o.z)) / (2 * e);
				o.c1 = (ground(o.x, o.z + e) - ground(o.x, o.z - e)) / (2 * e);
			}
			o.v ??= 0;
			o.w ??= 0;
			this.list.push(o);
			return o;
		};
		// kale yerleri (il başına ağır bir arama: her biri ayrı dilimde)
		this.castles = [];
		for (const p of board.provinces) {
			const c = board.castleSpotSteps ? yield* board.castleSpotSteps(p.index) : board._castleSpot(p.index);
			this.castles.push({ x: c.x, z: c.z, r: 2.0 * c.s + 0.1, core: 1.1 * c.s });
			yield;
		}
		yield* this._farGen(); // uzak sürüm ayak izleri (dilim dilim)
		yield* this._rulesGen(); // çakışma kuralları (dilim dilim)
		yield;
		const styleOf = (p) => (p.region === 'karadeniz' ? 2 : p.id === 50 ? 3 : p.region === 'dogu' || p.region === 'guneydogu' ? 0 : p.region === 'icanadolu' ? (R() < 0.5 ? 0 : 1) : 1);
		const animOf = (p) => (p.region === 'dogu' ? (R() < 0.6 ? 2 : 3) : p.region === 'karadeniz' ? 2 : p.region === 'guneydogu' ? (R() < 0.5 ? 1 : 0) : R() < 0.8 ? 0 : 1);

		// --- köyler: köy ızgarasında hücre başına en çok bir köy (harita aynı dokudan köy toprağını çizer)
		const villages = [];
		for (let j = 0; j < VIL.nz; j++) {
			for (let i = 0; i < VIL.nx; i++) {
				const roll = R();
				for (let t = 0; t < 10; t++) {
					const ox = R() - 0.5;
					const oz = R() - 0.5;
					const x = VIL.x0 + (i + 0.5 + ox * VIL.jit) * VIL.cell;
					const z = VIL.z0 + (j + 0.5 + oz * VIL.jit) * VIL.cell;
					const pid = board.pick(x, z);
					if (pid < 0) continue;
					const p = board.provinces[pid];
					const prof = this._prof(pid);
					if (roll > (q2 ? 0.75 : 0.45)) break;
					const T = terr(x, z);
					const hill = p.region === 'karadeniz' && T.ny > 0.82 && T.e < 1200 && T.Ro < 0.5;
					if ((roadK(x, z, prof.top ?? 1600) < 0.4 && !hill) || T.ny < 0.8) continue;
					const size = R();
					const s = 1.5 * (0.85 + 0.15 * size); // ev mahyası ~insan boyu (oyuncak oranı)
					// köy: kale yerinin çekirdeğinden uzak; kale inerse köy de gömülür (castleK), toprağı kale eteğinde kalır
					if (this._inCastle(x, z, FOOT[K.KOY] * s) || this._hit(x, z, FOOT[K.KOY] * s, pid, -1, true)) continue;
					const o = (j * VIL.nx + i) * 4;
					this.vil[o] = 255;
					this.vil[o + 1] = Math.round((ox + 0.5) * 255);
					this.vil[o + 2] = Math.round((oz + 0.5) * 255);
					this.vil[o + 3] = Math.round(size * 255);
					// shader ile aynı merkez (8 bit kayma); yeniden denetle (yuvarlama)
					const cx = VIL.x0 + (i + 0.5 + (this.vil[o + 1] / 255 - 0.5) * VIL.jit) * VIL.cell;
					const cz = VIL.z0 + (j + 0.5 + (this.vil[o + 2] / 255 - 0.5) * VIL.jit) * VIL.cell;
					if (this._inCastle(cx, cz, FOOT[K.KOY] * s) || this._hit(cx, cz, FOOT[K.KOY] * s, pid, -1, true)) {
						this.vil.fill(0, o, o + 4);
						continue;
					}
					villages.push(add({ k: K.KOY, x: cx, z: cz, yaw: R() * 6.28, pid, v: styleOf(p), s, w: this.vil[o + 3] / 255 }));
					break;
				}
				yield;
			}
		}

		// --- yel değirmenleri: Bodrum, Datça, Çeşme-Alaçatı, Bozcaada (gerçek yerler)
		const ll = (lon, lat) => [(lon - 35.2) * 0.777146 * 6, -(lat - 39) * 6];
		for (const [lon, lat] of [[27.43, 37.05], [27.31, 37.03], [27.55, 37.08], [27.69, 36.73], [27.78, 36.72], [26.37, 38.28], [26.3, 38.3], [26.45, 38.25], [26.06, 39.83]]) {
			const [x0, z0] = ll(lon, lat);
			let done = false;
			for (let a = 0; a < 24 && !done; a++) {
				yield;
				for (let r = 0; r <= 1.2 && !done; r += 0.15) {
					const x = x0 + Math.cos(a * 0.26) * r;
					const z = z0 + Math.sin(a * 0.26) * r;
					const pid = board.pick(x, z);
					// kıyı sırtında: kıyıya ve sınıra en az 0,22 (değirmenler suya ya da sınıra taşmaz; üçlü 0,5 genişlikte)
					if (pid < 0 || this._inCastle(x, z, FOOT[K.DEGIRMEN] * 1.1) || this._hit(x, z, FOOT[K.DEGIRMEN] * 1.1, pid, -1, true, 0.3)) continue;
					add({ k: K.DEGIRMEN, x, z, yaw: -0.4 + R() * 0.3, pid, s: 1.1 });
					done = true;
				}
			}
		}
		// --- rüzgâr türbinleri: Ege ve Marmara sırtları, Hatay (tek tek)
		const windy = { 17: 6, 35: 8, 45: 6, 10: 7, 31: 3, 59: 3, 39: 3, 9: 2, 48: 2 };
		for (const [id, n] of Object.entries(windy)) {
			const p = board.byId.get(+id);
			let made = 0;
			for (let tries = 0; tries < 300 && made < Math.round(n * dens); tries++) {
				if ((tries & 15) === 15) yield;
				const smp = board.sample(p.index, R, 0.4);
				if (!smp) continue;
				const [x, z] = smp;
				const T = terr(x, z);
				if (T.e < 250 || T.e > 1300 || T.Ro > 0.5) continue;
				let hi = 0;
				const h0 = rel.height(x, -z);
				for (let a = 0; a < 8; a++) if (rel.height(x + Math.cos(a * 0.785) * 0.7, -z - Math.sin(a * 0.785) * 0.7) > h0 + 0.005) hi++;
				if (hi > 2 || this._inCastle(x, z, FOOT[K.TURBIN]) || this._hit(x, z, FOOT[K.TURBIN], p.index, -1, true)) continue;
				add({ k: K.TURBIN, x, z, yaw: -0.35 + R() * 0.2, pid: p.index, s: 1 });
				made++;
			}
			yield;
		}

		// --- tarlalar: il başına iş yerleri (oyuncu hangi ile yaklaşırsa yaklaşsın çalışan insan görsün). İl alanına
		// göre sayı (q2: ~her 1,6 birim²'ye bir hedef, q1: ~her 5 birim²'ye); köyün çevresi yeğlenir. Parsel başına bir iş.
		const seen = new Set();
		const JOB = { cay: 'pick', findik: 'pick', aycicegi: 'hoe', celtik: 'pick', hashas: 'pick', pamuk: 'pick', zeytin: 'pick', narenciye: 'pick', kayisi: 'pick', fistik: 'pick', bag: 'pick', gul: 'pick', lavanta: 'pick', pancar: 'hoe', misir: 'hoe', biber: 'hoe', yesil: 'hoe', saban: 'tractor', hasat: 'scythe', cayir: 'scythe', bugday: 'scythe', mera: 'herd', nadas: 'herd' };
		const SW = 1.8; // insan ölçeği (boy ~0,22): oyuncak oranı, insan öne çıkar; traktör boyu insan kadar, ev mahyası biraz üstünde
		const ST = 2.0; // traktör
		for (const p of board.provinces) {
			const pid = p.index;
			const prof = this._prof(pid);
			const ring = p.rings[0];
			let area = 0;
			for (let i = 0; i < ring.length; i += 2) {
				const j = (i + 2) % ring.length;
				area += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
			}
			area = Math.abs(area) * 0.5;
			const want = Math.max(q2 ? 3 : 1, Math.min(q2 ? 18 : 6, Math.round(area / (q2 ? 1.6 : 5))));
			const myV = villages.filter((v) => v.pid === pid);
			let made = 0;
			// il başına en çok bir-iki traktör ve sürü; birbirlerinden uzak (kümelenmesin)
			let nT = 0;
			let nH = 0;
			const maxT = want >= 6 ? 2 : 1;
			const maxH = want >= 5 ? 2 : 1;
			const far = (kind, x, z, d) => !this.list.some((o) => o.k === kind && Math.hypot(o.x - x, o.z - z) < d);
			for (let t = 0; t < want * 30 && made < want; t++) {
				if ((t & 3) === 3) yield; // dilim: birkaç denemede bir (uzun iş yok)
				const smp = board.sample(pid, R, 0.3);
				if (!smp) continue;
				let [jx, jz] = smp;
				let nearV = 9;
				for (const v of myV) nearV = Math.min(nearV, Math.hypot(v.x - jx, v.z - jz));
				if (myV.length && nearV > 2.8 && R() < 0.65) continue; // köyün tarlaları yeğlenir
				const sk = slopeK(jx, jz, prof);
				const fk = farmK(jx, jz, prof.top ?? 1600);
				const slope = sk > fk;
				if (Math.max(sk, fk) < 0.6) continue;
				let f = fieldAt(jx, jz, prof, this._rules().noise, slope);
				if (seen.has(f.key) || f.piv || f.natural) continue;
				const crop = f.crop;
				const job = JOB[crop];
				if (!job) continue;
				// parselin ortasına doğru kaydır (kenar ve yol dışında; parsel ekseninde, biraz sapmayla); çay yamacı
				// kesintisiz (parsel kenarı çizilmez)
				if (crop !== 'cay' && f.edge < 0.22) {
					const ux = (0.5 + (R() - 0.5) * 0.3 - f.fr[0]) / 1.7;
					const uy = (0.5 + (R() - 0.5) * 0.3 - f.fr[1]) / 0.95;
					jx += f.across[0] * ux + f.along[0] * uy;
					jz += f.across[1] * ux + f.along[1] * uy;
					const g = fieldAt(jx, jz, prof, this._rules().noise, slope);
					if (g.key !== f.key || g.edge < 0.22 || board.pick(jx, jz) !== pid) continue;
					f = g;
				}
				let ok = false;
				const herd = job === 'herd' || (job === 'scythe' && crop === 'cayir' && R() < 0.4);
				const trac = !slope && (job === 'tractor' || (job === 'hoe' && R() < 0.2) || (crop === 'hasat' && R() < 0.3));
				if (herd && (nH >= maxH || !far(K.HAYVAN, jx, jz, 2.0))) continue; // otlakta sürü yoksa iş de yok
				if (herd) {
					const s = p.region === 'dogu' || p.region === 'karadeniz' ? 2.8 : 2.6;
					if (!this._hit(jx, jz, FOOT[K.HAYVAN] * s, pid, -1, true)) {
						nH++;
						add({ k: K.HAYVAN, x: jx, z: jz, yaw: R() * 6.28, pid, v: animOf(p), s });
						ok = true;
					}
				} else if (trac && nT < maxT && far(K.TRAKTOR, jx, jz, 2.5)) {
					// traktör: çoğu park hâlinde; bazısı parsel boyunca çok yavaş sürer
					const moving = R() < 0.5;
					const L = moving ? 0.3 : 0;
					const r0 = FOOT[K.TRAKTOR] * ST + L * 0.5 + 0.04;
					if (!this._hit(jx, jz, r0, pid, -1, true)) {
						nT++;
						const yaw = -Math.atan2(f.along[1], f.along[0]);
						const ex = jx + f.along[0] * L * 0.5;
						const ez = jz + f.along[1] * L * 0.5;
						const bx = jx - f.along[0] * L * 0.5;
						const bz = jz - f.along[1] * L * 0.5;
						const o = add({ k: K.TRAKTOR, x: jx, z: jz, y: ground(bx, bz), yaw, pid, s: ST, c0: L / ST, c1: 0.012, v: Math.floor(R() * 4), w: ground(ex, ez) });
						o.r = r0;
						ok = true;
					}
				} else {
					// 1–3 işçi (toplamada küçük grup), her biri ayrı örnek: kendi yeri ve zemini
					const act = job === 'pick' ? 1 : job === 'scythe' ? 3 : R() < 0.75 ? 0 : 2;
					const n = act === 1 ? 1 + Math.floor(R() * 2.6) : act === 0 && R() < 0.4 ? 2 : 1;
					const ax = f.along[0];
					const az = f.along[1];
					for (let k = 0; k < n; k++) {
						const off = (k - (n - 1) / 2) * 0.3;
						const wx = jx + f.across[0] * off + ax * (R() - 0.5) * 0.12;
						const wz = jz + f.across[1] * off + az * (R() - 0.5) * 0.12;
						const a2 = k > 0 && act === 0 && R() < 0.35 ? 2 : act;
						const look = crop === 'cay' || a2 === 1 || a2 === 2 ? Math.floor(R() * 3) : 3 + Math.floor(R() * 3);
						const Lw = a2 === 2 ? 0.2 : 0;
						const r0 = FOOT[K.ISCI] * SW + Lw * 0.5;
						if (this._hit(wx, wz, r0, pid, -1, true)) continue;
						// yön: sıra boyunca (çapa ve tırpan ilerler), toplayıcılar sıraya yan durur
						const yaw = -Math.atan2(az, ax) + (a2 === 1 ? Math.PI / 2 + (R() - 0.5) * 0.8 : (R() - 0.5) * 0.4);
						const o = add({ k: K.ISCI, x: wx, z: wz, yaw, pid, s: SW, v: a2 * 8 + look, w: Lw / SW });
						o.r = r0;
						ok = true;
					}
				}
				if (ok) {
					seen.add(f.key);
					made++;
				}
			}
			yield;
		}
	}

	/** Uzak sürüm yapıların gerçek ayak izi yarıçapı (yapı merkezi anahtarıyla); hazır değilse boş. */
	_farExtents() {
		if (this._farR) return this._farR;
		const it = this._farGen();
		while (!it.next().done);
		return this._farR || new Map();
	}

	/**
	 * Uzak sürüm ayak izleri, dilim dilim (yerleşimde: ~400 bin köşe tek seferde uzun iş olurdu). Aynı yapının köşeleri
	 * ardışık: anahtar yalnız yapı değişince kurulur.
	 */
	*_farGen() {
		const farR = new Map();
		const far = this.props.landmarks.far;
		if (!far) return;
		for (const m of far.meshes) {
			const pos = m.geometry.getAttribute('position');
			const site = m.geometry.getAttribute('site');
			let sx = NaN;
			let sz = NaN;
			let best = -1;
			const flush = () => {
				if (best < 0) return;
				const key = sx.toFixed(3) + ',' + sz.toFixed(3);
				if (!(farR.get(key) >= best)) farR.set(key, best);
			};
			for (let i = 0; i < pos.count; i++) {
				const x = site.getX(i);
				const z = site.getZ(i);
				if (x !== sx || z !== sz) {
					flush();
					sx = x;
					sz = z;
					best = -1;
				}
				const d = Math.hypot(pos.getX(i) - x, pos.getZ(i) - z);
				if (d > best) best = d;
				if ((i & 16383) === 16383) yield;
			}
			flush();
			yield;
		}
		this._farR = farR;
	}

	/**
	 * Çakışma denetimi: bütün nesneler, bütün kurallar (yerleşimden bağımsız, gerçek veriyle). Uzak sürüm yapıların
	 * gerçek ayak izi hazırsa onunla da denetler. Dönen: { toplam, kural: sayı, ... }.
	 */
	audit() {
		const out = { nesne: this.list.length };
		const add = (k) => (out[k] = (out[k] || 0) + 1);
		// uzak sürüm yapıların gerçek yarıçapı (avlu dahil): köşelerin yapı merkezine en büyük yatay uzaklığı
		const farR = this._farExtents();
		if (farR.size) out.uzakSurumYapi = farR.size;
		this.list.forEach((o, i) => {
			// her nesne kale yerinin eteğinde olabilir (kale inerse castleK ile gömülür); köy, değirmen, türbin çekirdeğe giremez
			const small = true;
			const h = this._hit(o.x, o.z, o.r, o.pid, i, small, o.k === K.DEGIRMEN ? 0.3 : null);
			if (h) add(h);
			if ((o.k === K.KOY || o.k === K.DEGIRMEN || o.k === K.TURBIN) && this._inCastle(o.x, o.z, o.r)) add('kale');
			if (this.castles.some((c) => Math.hypot(o.x - c.x, o.z - c.z) < 2.75)) out.kaleIneceGizlenir = (out.kaleIneceGizlenir || 0) + 1;
			for (const [key, r] of farR) {
				const [sx, sz] = key.split(',').map(Number);
				if (Math.hypot(o.x - sx, o.z - sz) < r + o.r) {
					add('uzakYapi');
					break;
				}
			}
		});
		out.toplam = Object.entries(out).filter(([k]) => !['nesne', 'uzakSurumYapi', 'toplam', 'kaleIneceGizlenir'].includes(k)).reduce((a, [, v]) => a + v, 0);
		return out;
	}
}
