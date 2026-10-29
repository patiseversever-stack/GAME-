// Ünlü yapıların minyatürleri: her ilin simgesi gerçek yerinde, oyuncak maket ölçeğinde (abartılı
// büyük). Hepsi tek geometride birleşir: tek çizim + tek gölge çizimi. Her köşe ilinin kimliğini
// taşır: il yükselince yapı da kalkar, seçim kipinde ille birlikte söner.
//
// v0.5 ("milyon dolarlık" maket): yapılar araziye serilen avlularda durur (kaide tablası yok; avlunun
// kenarı toprağa gömülür, iç kısmı düz teras), köşe başına malzeme kimliği (pencere, altın, kurşun
// kubbe, sırlı çini, bayrak bezi, ocak alevi, balon kumaşı) ve tabandan yükseklik pişirilir. Shader
// bununla ortam örtmesi (dipte koyulaşma), cilalı kurşun ve altın, gece yanan pencereler, yapıyı alttan
// yalayan sıcak projektör ışığı, dalgalanan Türk bayrağı ve ocağı yanan Kapadokya balonları verir.
// Yeniden modellenenler: Anıtkabir (Şeref Holü, kilim desenli Tören Meydanı, Aslanlı Yol, kuleler),
// peri bacaları (şapkalı bacalar, Uçhisar kayası, Güllüdere sırtları, balonlar), Ayasofya, Galata,
// Pamukkale travertenleri, Nemrut başları, Efes Celsus, Mevlana, Selimiye, Safranbolu, Sümela.
//
// Konumlar boylam/enlem (gerçek yerler). Bir yapı il merkezine (kale ve yazı yeri) çok yakınsa
// merkezden uzağa itilir; denize taşıyorsa karaya çekilir.
//
// fade(on): "X nerede?" harita sorularında yapılar ipucu vermesin diye ~0,45 sn'de toprağa gömülerek
// kaybolur (ve geri gelir). Zaman uTime'dan: kare başına CPU işi yok; tam kaybolunca çizilmez.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV, glslColor as C } from '../gfx/shaderlib.js';
import { Kit, archShape, facadeShape } from '../gfx/kit.js';

// malzeme kimlikleri (köşe özniteliği mat.x)
const M = { STONE: 0, WATER: 1, WIN: 2, GOLD: 3, LEAD: 4, FLAG: 5, FLAME: 6, LEAF: 7, GROUND: 8, TILE: 9, CLOTH: 10 };

const FADE = /* glsl */ `
uniform vec3 uFade; // x başlangıç zamanı, y yön (1 beliriyor, 0 kayboluyor), z süre
attribute vec4 site; // yapının merkezi x, taban y, merkez z, ölçek
// görünürlük (0..1): yapılar sırayla (konuma göre hafif gecikmeli) toprağa gömülür
float showK() {
	float t = clamp((uTime - uFade.x) / uFade.z * 1.35 - fract(site.x * 0.173 + site.z * 0.311) * 0.35, 0.0, 1.0);
	t = t * t * (3.0 - 2.0 * t);
	return mix(1.0 - t, t, uFade.y);
}
vec3 fadeP(vec3 p, float k) {
	if (k > 0.999) return p;
	// yapı tabanına doğru basılır (balonlar da), yanlara hafif küçülür ve toprağın altına iner
	vec3 c = vec3(site.x, site.y, site.z);
	vec3 q = c + (p - c) * vec3(mix(0.6, 1.0, k), k, mix(0.6, 1.0, k));
	q.y -= (1.0 - k) * site.w * 0.3;
	return q;
}
`;

const VS = /* glsl */ `
${COMMON}
${PROV}
${FADE}
attribute vec3 color;
attribute float tag;
attribute float anim;
attribute vec2 mat;
uniform float uPLift, uPSel;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec2 vSel;
varying vec2 vM;
void main() {
	vec4 fx = provRow(tag, 3);
	vec3 p = position;
	// balon: süzülme (anim = balon kimliği)
	if (anim > 0.5) {
		float ph = anim * 7.31;
		p.y += sin(uTime * 0.6 + ph) * 0.14;
		p.x += sin(uTime * 0.27 + ph * 1.7) * 0.08;
		p.z += cos(uTime * 0.21 + ph * 2.3) * 0.04;
	} else if (anim < -0.5) {
		// bayrak bezi: direkten uca büyüyen dalga (anim = -(1 + direkten uzaklık oranı))
		float u = -anim - 1.0;
		float ph = uTime * 5.2 - u * 5.5 + tag * 1.3;
		p.z += sin(ph) * 0.055 * u;
		p.y += sin(ph * 0.5 + 1.0) * 0.012 * u;
		p.x -= (1.0 - cos(sin(ph) * 0.6)) * 0.03 * u;
	}
	p = fadeP(p, showK());
	p.y += fx.x * uPLift + fx.z * uPSel;
	vW = p;
	vN = normal;
	vC = color;
	vSel = vec2(fx.z, fx.w);
	vM = mat;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${PROV}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec2 vSel;
varying vec2 vM;
void main() {
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	if (dot(N, V) < 0.0 && vM.x > 4.5 && vM.x < 5.5) N = -N; // bayrağın arka yüzü
	float id = floor(vM.x + 0.5);
	float hgt = vM.y;
	vec3 alb = vC * 0.9; // maket boyası: açık taşlar güneşte beyaza yanmasın
	float gloss = 0.1;
	float rimK = 0.55;
	// ortam örtmesi: yapının dibi koyulaşır (zemin, su, bez ve alevde yok)
	bool bare = id == ${M.GROUND}.0 || id == ${M.WATER}.0 || id == ${M.FLAG}.0 || id == ${M.FLAME}.0 || id == ${M.CLOTH}.0;
	float ao = bare ? 1.0 : mix(0.5, 1.0, smoothstep(0.0, 0.2, hgt));
	if (id == ${M.WATER}.0) gloss = 0.92;
	else if (id == ${M.WIN}.0) gloss = 0.4;
	else if (id == ${M.GOLD}.0) gloss = 0.9;
	else if (id == ${M.LEAD}.0) gloss = 0.5;
	else if (id == ${M.TILE}.0) gloss = 0.65;
	else if (id == ${M.GROUND}.0) { gloss = 0.03; rimK = 0.2; }
	else if (id == ${M.LEAF}.0) { gloss = 0.04; rimK = 0.8; }
	else if (id == ${M.CLOTH}.0) gloss = 0.2;
	float sh = shadowAt(vW, N);
	gLit = vSel.x;
	vec3 c = shade(alb, N, V, ao, sh, gloss, rimK);
	// altın: sıcak parıltı (kubbe alemi, yazı)
	if (id == ${M.GOLD}.0) c += uSunCol * alb * 0.25;
	float nk = nightK();
	if (id == ${M.FLAME}.0) {
		// ocak alevi: her zaman yanar, titrer
		c = vec3(1.0, 0.52, 0.16) * (2.2 + 0.8 * sin(uTime * 17.0 + vW.x * 30.0)) * (1.0 + nk);
	} else if (nk > 0.001) {
		// gece: pencere, kapı ve kemer boşlukları içeriden sıcak ışıkla yanar
		if (id == ${M.WIN}.0) c += N_WARM * nk * (2.2 + 0.4 * sin(uTime * 3.1 + vW.x * 9.0));
		// yapıyı alttan yalayan sıcak projektör ışığı (gece manzarasında yapılar mücevher gibi seçilir)
		else if (!bare) c += vec3(1.0, 0.66, 0.34) * alb * nk * 0.38 * exp(-hgt * 2.4) * (0.55 + 0.45 * max(N.y, 0.0) + 0.4 * max(dot(N, V), 0.0));
		// balon kumaşı: içindeki ocak kumaşı fener gibi aydınlatır
		if (id == ${M.CLOTH}.0) c += N_WARM * alb * nk * (0.3 + 0.5 * max(-N.y, 0.0)) * (0.85 + 0.15 * sin(uTime * 2.3 + vW.y * 5.0));
		// avlu: yapının çevresinde sıcak ışık havuzu
		if (id == ${M.GROUND}.0) c += N_WARM * alb * nk * 0.05;
	}
	c = provDim(c, vSel.x, vSel.y);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_VS = /* glsl */ `
uniform float uTime;
${PROV}
${FADE}
attribute float tag;
attribute float anim;
uniform float uPLift, uPSel;
void main() {
	vec4 fx = provRow(tag, 3);
	vec3 p = position;
	if (anim > 0.5) p.y += sin(uTime * 0.6 + anim * 7.31) * 0.14;
	else if (anim < -0.5) p.z += sin(uTime * 5.2 - (-anim - 1.0) * 5.5 + tag * 1.3) * 0.055 * (-anim - 1.0);
	p = fadeP(p, showK());
	p.y += fx.x * uPLift + fx.z * uPSel;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const DEPTH_FS = /* glsl */ `void main(){ gl_FragColor = vec4(1.0); }`;

// renkler
const MARBLE = '#ebe1cb';
const CREAM = '#ede2c8';
const LEAD = '#7e8da0';
const LEAD2 = '#68788d';
const GOLD = '#f2c14e';
const DARK = '#3a2c25';
const ROOF = '#c8553a';
const WOOD = '#8c5a34';
const GRASS = '#6fa64a';
const ROCK = '#8f806e';
const RED = '#e30a17';
const WHITE = '#f6f4ef';
const LEAF = ['#3f8a3a', '#4f9a3e', '#5c9f3c', '#6aa83f'];
const CYP = '#2a5a33';

// renk adına göre kendiliğinden malzeme: koyu boşluk → pencere, altın, kurşun
const AUTO = new Map([
	[DARK, M.WIN],
	[GOLD, M.GOLD],
	[LEAD, M.LEAD],
	[LEAD2, M.LEAD],
]);

/** Ünlü yapı kiti: renk malzemeyi seçer; yer yüksekliği, il yapısı ve yerleşim bilgisi taşır. */
class LKit extends Kit {
	color(hex, k = 1) {
		super.color(hex, k);
		this._mat = AUTO.get(hex) ?? 0;
		return this;
	}
	raw(r, g, b) {
		// eski su işareti (b > 1): parlak su
		if (b > 1) {
			super.raw(r, g, b - 1);
			this._mat = M.WATER;
		} else {
			super.raw(r, g, b);
			this._mat = 0;
		}
		return this;
	}
	grad(a, b, y0, y1) {
		super.grad(a, b, y0, y1);
		this._mat = 0;
		return this;
	}
}

const smooth01 = (a, b, x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------------ yardımcı parçalar

/** Halka (iç yarıçap r0 → dış r1) ya da disk; y0/y1 iç ve dış kenarın yerden yüksekliği. */
function ringGeo(r0, r1, rz, y0, y1, seg, jit = 0, seed = 1) {
	const pos = [];
	const rad = (a, r) => r * (1 + jit * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 7 + seed * 2.3) * 0.4));
	for (let i = 0; i < seg; i++) {
		const a0 = (i / seg) * Math.PI * 2;
		const a1 = ((i + 1) / seg) * Math.PI * 2;
		const P = (a, r, y) => [Math.cos(a) * rad(a, r), y, Math.sin(a) * rad(a, r) * rz];
		const o0 = P(a0, r1, y1);
		const o1 = P(a1, r1, y1);
		if (r0 <= 0) {
			pos.push(0, y0, 0, ...o1, ...o0);
			continue;
		}
		const i0 = P(a0, r0, y0);
		const i1 = P(a1, r0, y0);
		pos.push(...i0, ...o1, ...o0, ...i0, ...i1, ...o1);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	return g;
}

/**
 * Avlu: yapının çevresine serilen zemin. İç kısım (ring oranına dek) döşeme renginde ve düz teras
 * (yapı tabanında), dışa doğru araziye bağlanır, en dış halka arazi tonunda ve kenarı toprağa gömülür:
 * kesik kenar ya da havada tabla görünmez.
 */
function grounds(k, r, pave, { rz = 1, ring = 0.72, ox = 0, oz = 0, jit = 0.05, tone = null } = {}) {
	const S = k.site;
	const hf = (x, z) => {
		const d = Math.hypot((x - S.x - ox * S.s) / (r * S.s), (z - S.z - oz * S.s) / (r * rz * S.s));
		return S.y + (k.hf(x, z) - S.y) * smooth01(ring * 0.8, 1.0, d);
	};
	const seg = Math.max(14, Math.round(26 * k.seg));
	k.push().move(ox, 0, oz);
	k.color(pave).mat(M.GROUND);
	k.drape(ringGeo(0, r * ring * 0.55, rz, 0.004, 0.004, seg), hf);
	k.drape(ringGeo(r * ring * 0.55, r * ring, rz, 0.004, 0.003, seg, jit * 0.5, 3), hf);
	const t = tone || k.tone;
	k.raw(t.r, t.g, t.b).mat(M.GROUND);
	k.drape(ringGeo(r * ring, r * (ring + 1) / 2, rz, 0.003, 0.0, seg, jit, 3), hf);
	k.drape(ringGeo(r * (ring + 1) / 2, r, rz, 0.0, -0.035, seg, jit, 3), hf);
	k.pop();
	k.mat(0);
}

/** Eski kaide çağrıları: avluya çevrilir. */
function plinth(k, r, col = GRASS) {
	grounds(k, r * 1.15, col);
}

/** Pürüzlü kaya kütlesi (sarsılmış ikosahedron). */
function rock(rx, ry, rz, seed, detail = 1) {
	const g = new THREE.IcosahedronGeometry(1, detail);
	const p = g.getAttribute('position');
	let s = seed * 7919 + 13;
	const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	const seen = new Map();
	for (let i = 0; i < p.count; i++) {
		const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
		let j = seen.get(key);
		if (j == null) seen.set(key, (j = 0.82 + R() * 0.3));
		p.setXYZ(i, p.getX(i) * rx * j, p.getY(i) * ry * j, p.getZ(i) * rz * j);
	}
	return g;
}

/** Ortak köşeleri birlikte sarsar (dikişsiz pürüz): torna, kubbe… */
function jitter(g, amt, seed, keepY = false) {
	const p = g.getAttribute('position');
	let s = seed * 7919 + 17;
	const R = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
	const seen = new Map();
	for (let i = 0; i < p.count; i++) {
		const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
		let j = seen.get(key);
		if (!j) seen.set(key, (j = [R() * amt, keepY ? 0 : R() * amt, R() * amt]));
		p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + j[1], p.getZ(i) + j[2]);
	}
	return g;
}

function tri(w, h) {
	const t = new THREE.Shape();
	t.moveTo(-w / 2, 0);
	t.lineTo(w / 2, 0);
	t.lineTo(0, h);
	t.lineTo(-w / 2, 0);
	return t;
}

function star(ro, ri) {
	const s = new THREE.Shape();
	for (let i = 0; i < 10; i++) {
		const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
		const r = i % 2 ? ri : ro;
		if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	return s;
}

/** Yuvarlak taçlı ağaç (yapraklar biraz ton farkıyla). */
function tree(k, x, z, s = 1, R = Math.random, y = 0) {
	k.color('#6b4a30').cyl(0.008 * s, 0.012 * s, 0.05 * s, 5, x, y, z);
	k.color(LEAF[Math.floor(R() * LEAF.length)]).mat(M.LEAF).ico(0.045 * s, x, y + 0.075 * s, z, 0.95);
	k.mat(0);
}

/** Servi: ince uzun koyu yeşil (Osmanlı bahçesi, mezarlık, avlu). */
function cypress(k, x, z, s = 1, y = 0) {
	k.color('#5b4130').cyl(0.006 * s, 0.008 * s, 0.03 * s, 4, x, y, z);
	k.color(CYP).mat(M.LEAF).lathe([[0.0, 0], [0.026 * s, 0.03 * s], [0.03 * s, 0.09 * s], [0.02 * s, 0.17 * s], [0, 0.22 * s]], 6, x, y + 0.02 * s, z);
	k.mat(0);
}

/** Çam (Karadeniz, dağ). */
function pine(k, x, z, s = 1, y = 0) {
	k.color('#5b4130').cyl(0.008 * s, 0.01 * s, 0.05 * s, 4, x, y, z);
	k.color('#24582f').mat(M.LEAF).cone(0.07 * s, 0.17 * s, 6, x, y + 0.03 * s, z).cone(0.052 * s, 0.14 * s, 6, x, y + 0.12 * s, z).cone(0.034 * s, 0.1 * s, 6, x, y + 0.2 * s, z);
	k.mat(0);
}

/**
 * Minare: çokgen kaide, gövde, şerefeler (korkuluklu), petek, kurşun külah, altın alem.
 * h gövde boyu. Toplam boy ≈ h * 1.42.
 */
function minaret(k, x, z, h, r = 0.024, col = CREAM, balconies = 1, cap = LEAD) {
	k.color(col).cyl(r * 1.45, r * 1.6, h * 0.1, 8, x, 0, z);
	k.color(col).cyl(r * 1.2, r * 1.45, 0.012, 8, x, h * 0.1, z);
	k.color(col).cyl(r * 0.92, r * 1.05, h, 10, x, h * 0.1, z);
	for (let b = 0; b < balconies; b++) {
		const y = h * 0.1 + h * (0.6 + b * 0.15);
		k.color(col, 0.92).cyl(r * 1.85, r * 1.0, 0.03, 10, x, y - 0.03, z);
		k.color(col).cyl(r * 1.85, r * 1.85, 0.014, 10, x, y, z);
	}
	k.color(col).cyl(r * 0.78, r * 0.88, h * 0.12, 10, x, h * 1.1, z);
	k.color(cap).cone(r * 1.05, h * 0.26, 10, x, h * 1.22, z);
	k.color(GOLD).cyl(0.003, 0.003, 0.03, 3, x, h * 1.48, z).sphere(0.007, 4, x, h * 1.48 + 0.03, z);
}

/** Türk bayrağı: direk + dalgalanan bez (al zemin, ay yıldız iki yüzde). Bez dünya x yönünde uzanır. */
function flag(k, x, y, z, pole, w) {
	const h = w * 0.66;
	k.color('#d9dde2').cyl(0.004, 0.006, pole, 5, x, y, z);
	k.color(GOLD).sphere(0.008, 5, x, y + pole + 0.006, z);
	const top = y + pole - 0.004;
	k.push().move(x, top, z).rot(0, -(k.site?.ry || 0), 0);
	const cloth = (geo, col, dz) => {
		geo.translate(0, 0, dz);
		const g = geo.index ? geo.toNonIndexed() : geo;
		const p = g.getAttribute('position');
		const u = [];
		for (let i = 0; i < p.count; i++) u.push(Math.max(0, p.getX(i)) / w);
		const start = k.anim.length;
		k.color(col).mat(M.FLAG);
		k.add(g);
		for (let i = 0; i < u.length; i++) k.anim[start + i] = -(1 + u[i]);
	};
	cloth(new THREE.PlaneGeometry(w, h, 8, 1).translate(w / 2, -h / 2, 0), RED, 0);
	for (const s of [1, -1]) {
		// ay: beyaz daire, üstüne kaydırılmış al daire; yıldız
		const e = 0.0015 * s;
		const cx = 0.5 * h;
		const cy = -h / 2;
		const disc = (r, ox, col, dz) => {
			const g = new THREE.CircleGeometry(r, 14).translate(cx + ox, cy, 0);
			if (s < 0) g.rotateY(Math.PI).translate(2 * (cx + ox), 0, 0);
			cloth(g, col, dz);
		};
		disc(h * 0.25, 0, WHITE, e);
		disc(h * 0.2, h * 0.0625, RED, e * 2);
		const st = new THREE.ShapeGeometry(star(h * 0.125, h * 0.05)).rotateZ(Math.PI / 2).translate(cx + h * 0.35, cy, 0);
		if (s < 0) st.rotateY(Math.PI).translate(2 * (cx + h * 0.35), 0, 0);
		cloth(st, WHITE, e * 3);
	}
	k.pop();
	k.mat(0);
}

/** Arka arkaya pencere sırası (koyu boşluk: gece yanar). */
function windows(k, n, x0, x1, y, z, w, h, ry = 0, arch = false) {
	k.color(DARK);
	for (let i = 0; i < n; i++) {
		const x = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1);
		if (arch) k.slab(archShape(w, h), 0.008, x, y, z, ry);
		else k.box(w, h, 0.008, x, y, z, ry);
	}
}

/** Sıcak hava balonu: dilimli zarf (gores), alt etek, sepet, ip, yanan ocak. */
function balloon(k, x, y, z, r, a, b, id) {
	k.setAnim(id);
	const prof = [
		[0.24, -0.92],
		[0.5, -0.74],
		[0.78, -0.42],
		[0.95, -0.06],
		[0.98, 0.22],
		[0.88, 0.52],
		[0.66, 0.8],
		[0.36, 0.96],
		[0.0, 1.0],
	].map(([rr, yy]) => new THREE.Vector2(rr * r, yy * r * 1.12));
	const n = Math.max(8, Math.round(12 * k.seg));
	k.smooth(true);
	for (let i = 0; i < n; i++) {
		const g = new THREE.LatheGeometry(prof, 2, (i / n) * Math.PI * 2, (Math.PI * 2) / n);
		g.translate(x, y, z);
		k.color(i % 2 ? a : b).mat(M.CLOTH).add(g);
	}
	// tepe şeridi ve etek
	k.color(b).mat(M.CLOTH).add(new THREE.CylinderGeometry(0.24 * r, 0.2 * r, 0.16 * r, 10, 1, true).translate(x, y - 1.0 * r * 1.12, z));
	k.smooth(false);
	const by = y - r * 1.12 - 0.42 * r;
	k.color('#7a5230').box(0.2 * r, 0.16 * r, 0.2 * r, x, by, z);
	k.color('#5b4636');
	for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box(0.012, 0.3 * r, 0.012, x + dx * 0.09 * r, by + 0.14 * r, z + dz * 0.09 * r);
	k.color('#ffb347').mat(M.FLAME).cone(0.05 * r, 0.16 * r, 5, x, by + 0.2 * r, z);
	k.mat(0);
	k.setAnim(0);
}

// ------------------------------------------------------------------ yapılar (yerel: y = 0 zemin, ön yüz +z)

const B = {
	// ---------------------------------------------------------------- Anıtkabir
	anitkabir(k, R) {
		const T = '#ebe2cf';
		const T2 = '#d9ccb2';
		const T3 = '#b9aa8e';
		grounds(k, 0.62, '#d8cdb6', { rz: 1.42, oz: 0.2, ring: 0.8 });
		// Tören Meydanı: kilim desenli taş döşeme
		const KIL = ['#ddd2bb', '#a8473c', '#e9e0cd', '#5e4c43'];
		const nx = 9;
		const nz = 6;
		const x0 = -0.36;
		const z0 = -0.1;
		const cw = 0.72 / nx;
		const cd = 0.44 / nz;
		k.color(T2).box(0.76, 0.03, 0.48, 0, -0.024, z0 + 0.22);
		for (let i = 0; i < nx; i++)
			for (let j = 0; j < nz; j++) {
				const v = (Math.abs(i - 4) + Math.abs(j * 1.5 - 3.75)) | 0;
				const col = v % 4 === 0 ? KIL[1] : v % 4 === 2 ? KIL[3] : (i + j) % 2 ? KIL[0] : KIL[2];
				k.color(col).mat(M.GROUND).add(new THREE.PlaneGeometry(cw * 0.96, cd * 0.96).rotateX(-Math.PI / 2).translate(x0 + cw * (i + 0.5), 0.0075, z0 + cd * (j + 0.5)));
			}
		k.mat(0);
		// meydanın çevresindeki revaklar (yan ve ön), köşelerde kare kuleler
		for (const s of [-1, 1]) {
			k.color(T2).box(0.07, 0.07, 0.46, s * 0.415, 0, 0.12);
			k.color(T).box(0.08, 0.012, 0.47, s * 0.415, 0.07, 0.12);
			k.color(T);
			for (let i = 0; i < 7; i++) k.box(0.012, 0.06, 0.012, s * 0.375, 0.008, -0.08 + i * 0.066);
			k.color(T2).box(0.3, 0.06, 0.06, s * 0.23, 0, 0.39);
			k.color(T).box(0.31, 0.012, 0.07, s * 0.23, 0.06, 0.39);
		}
		const tower = (x, z, h) => {
			k.color(T2).box(0.085, h, 0.085, x, 0, z);
			k.color(T).box(0.095, 0.014, 0.095, x, h, z);
			windows(k, 1, x, x, h * 0.55, z + 0.043, 0.02, 0.04, 0, true);
			k.color(T3).cone(0.068, 0.06, 4, x, h + 0.014, z, Math.PI / 4);
		};
		tower(-0.42, -0.13, 0.15);
		tower(0.42, -0.13, 0.15);
		tower(-0.42, 0.39, 0.13);
		tower(0.42, 0.39, 0.13);
		// Aslanlı Yol: döşeli yol, iki yanda karşılıklı aslanlar, girişte Hürriyet ve İstiklal kuleleri
		k.color('#cfc3aa').mat(M.GROUND).add(new THREE.PlaneGeometry(0.1, 0.42).rotateX(-Math.PI / 2).translate(0, 0.006, 0.62));
		k.mat(0);
		for (let i = 0; i < 6; i++)
			for (const s of [-1, 1]) {
				const z = 0.46 + i * 0.062;
				const x = s * 0.075;
				k.color(T2).box(0.032, 0.012, 0.024, x, 0, z);
				k.color('#e0d5bd').box(0.03, 0.02, 0.018, x, 0.012, z);
				k.color('#e0d5bd').box(0.016, 0.022, 0.018, x - s * 0.012, 0.026, z);
			}
		tower(-0.13, 0.84, 0.16);
		tower(0.13, 0.84, 0.16);
		// Şeref Holü: yüksek kaide, geniş merdiven, çevresi kare sütunlu, düz çatı ve basamaklı çatı katı
		const zc = -0.3;
		k.color(T2).box(0.7, 0.16, 0.4, 0, -0.06, zc);
		k.color(T).box(0.72, 0.012, 0.42, 0, 0.098, zc);
		for (let i = 0; i < 7; i++) k.color(i % 2 ? T : '#e2d8c3').box(0.36, 0.015 + i * 0.0143, 0.022, 0, -0.01, zc + 0.2 + (7 - i) * 0.02);
		k.color(T3).box(0.54, 0.19, 0.27, 0, 0.1, zc);
		windows(k, 5, -0.2, 0.2, 0.16, zc + 0.136, 0.022, 0.07);
		k.color(T);
		const cols = [];
		for (let i = 0; i < 12; i++) cols.push([-0.31 + (i * 0.62) / 11, zc + 0.175], [-0.31 + (i * 0.62) / 11, zc - 0.175]);
		for (let i = 1; i < 5; i++) cols.push([-0.31, zc - 0.175 + i * 0.07], [0.31, zc - 0.175 + i * 0.07]);
		for (const [x, z] of cols) {
			k.color(T).box(0.026, 0.18, 0.026, x, 0.11, z);
			k.color(T2).box(0.032, 0.01, 0.032, x, 0.11, z);
		}
		k.color(T).box(0.68, 0.045, 0.39, 0, 0.29, zc);
		k.color('#f2ead9').box(0.7, 0.012, 0.41, 0, 0.335, zc);
		k.color(GOLD).box(0.2, 0.012, 0.004, 0, 0.305, zc + 0.197);
		k.color(T2).box(0.56, 0.035, 0.29, 0, 0.347, zc);
		k.color(T).box(0.46, 0.03, 0.21, 0, 0.382, zc);
		// büyük bayrak meydanın önünde
		flag(k, -0.3, 0, 0.3, 0.72, 0.26);
		// Barış Parkı: avlunun çevresinde ağaçlar ve serviler
		for (let i = 0; i < 26; i++) {
			const a = (i / 26) * Math.PI * 2 + R() * 0.15;
			const rr = 0.56 + R() * 0.06;
			const x = Math.cos(a) * rr;
			const z = 0.2 + Math.sin(a) * rr * 1.38;
			if (Math.abs(x) < 0.2 && z > 0.4) continue;
			if (Math.abs(x) < 0.5 && z > -0.55 && z < 0.5) continue;
			if (i % 3 === 0) cypress(k, x, z, 1.1);
			else tree(k, x, z, 1.1, R);
		}
	},

	// ---------------------------------------------------------------- Kapadokya
	peri(k, R) {
		grounds(k, 0.8, '#ddc49c', { ring: 0.86, jit: 0.08 });
		// Güllüdere sırtları: pembe-krem katmanlı, aşınmış tüf sırtlar (arkada)
		const ridges = [[-0.05, -0.55, 0.42, 0.22, 0.13, 0.15, 3], [0.42, -0.38, 0.26, 0.17, 0.12, -0.5, 7], [-0.5, -0.2, 0.22, 0.14, 0.1, 0.9, 11]];
		for (const [x, z, rx, ry, rz, a, s] of ridges) {
			const g = rock(rx, ry, rz, s);
			k.grad('#c98e74', '#efdcbc', 0, ry * 0.9).add(g, new THREE.Matrix4().makeRotationY(a).setPosition(x, ry * 0.25, z));
		}
		// Uçhisar kayası: içi oyulmuş kale (sol arkada), pencereleri gece yanar, tepede bayrak
		const ux = -0.34;
		const uz = -0.36;
		k.grad('#cfa483', '#f0e1c3', 0, 0.62).add(jitter(new THREE.CylinderGeometry(0.1, 0.2, 0.62, 9, 4), 0.025, 5), new THREE.Matrix4().setPosition(ux, 0.31, uz));
		k.grad('#d8b18e', '#efdfc0', 0.5, 0.7).add(rock(0.11, 0.09, 0.1, 6), new THREE.Matrix4().setPosition(ux, 0.64, uz));
		k.color(DARK);
		for (let i = 0; i < 16; i++) {
			const y = 0.08 + (i % 8) * 0.065 + R() * 0.02;
			const rr = 0.2 - (y / 0.62) * 0.1;
			const a = -0.9 + (i / 16) * 1.8 + (R() - 0.5) * 0.2;
			const x = ux + Math.sin(a) * rr;
			const z = uz + Math.cos(a) * rr;
			if (i % 3 === 2) k.slab(archShape(0.022, 0.034), 0.02, x, y, z, a);
			else k.box(0.018, 0.022, 0.02, x, y, z, a);
		}
		flag(k, ux, 0.7, uz, 0.16, 0.08);
		// peri bacaları: geniş taban, incelen boyun, koyu bazalt şapka (bazıları şapkasız sivri, Paşabağ üçlüsü)
		const chim = (x, z, h, r, cap = true) => {
			const pts = [[r * 1.4, -0.04], [r * 1.22, 0.0], [r * 1.0, h * 0.16], [r * 0.8, h * 0.4], [r * 0.62, h * 0.62], [r * 0.48, h * 0.8], [r * 0.4, h * 0.9]];
			if (cap) pts.push([r * 0.36, h * 0.92], [0, h * 0.93]);
			else pts.push([r * 0.22, h * 0.98], [0, h * 1.03]);
			k.smooth(true).grad('#cc9a79', '#f2e2c4', 0, h).lathe(pts, 9, x, 0, z).smooth(false);
			if (cap) {
				const c = [[0.0, -0.004], [r * 1.0, -0.004], [r * 1.28, 0.014], [r * 1.12, 0.036], [r * 0.62, 0.056], [0, 0.062]];
				k.smooth(true).color(R() < 0.5 ? '#7a6152' : '#685446').lathe(c, 9, x, h * 0.92, z).smooth(false);
			}
			// kayaya oyulmuş kapı ve pencere (ön yüz)
			k.color(DARK);
			const nw = h > 0.4 ? 2 : 1;
			for (let i = 0; i < nw; i++) {
				const yy = h * (0.18 + i * 0.3);
				const rr = r * (1.0 - (yy / h) * 0.75);
				const a = (R() - 0.5) * 1.2;
				if (i === 0) k.slab(archShape(0.024, 0.04), 0.02, x + Math.sin(a) * rr, yy, z + Math.cos(a) * rr, a);
				else k.box(0.016, 0.02, 0.02, x + Math.sin(a) * rr, yy, z + Math.cos(a) * rr, a);
			}
		};
		const list = [
			[0.02, 0.02, 0.62, 0.075],
			[0.2, 0.14, 0.46, 0.065],
			[-0.16, 0.12, 0.52, 0.07],
			[0.1, -0.2, 0.56, 0.07],
			[-0.08, 0.32, 0.36, 0.06],
			[0.34, -0.06, 0.42, 0.06],
			[0.38, 0.28, 0.32, 0.055],
			[-0.36, 0.18, 0.4, 0.06, false],
			[0.22, 0.4, 0.28, 0.05, false],
			[-0.22, -0.06, 0.34, 0.055, false],
			[0.52, 0.1, 0.3, 0.05],
			[-0.5, 0.36, 0.26, 0.05, false],
		];
		for (const [x, z, h, r, cap = true] of list) chim(x, z, h, r, cap);
		// Paşabağ: tek gövdede üç şapka
		const px = -0.02;
		const pz = 0.5;
		k.smooth(true).grad('#cc9a79', '#f2e2c4', 0, 0.3).lathe([[0.13, -0.04], [0.11, 0], [0.085, 0.12], [0.06, 0.2], [0, 0.21]], 9, px, 0, pz).smooth(false);
		for (const [dx, dz, hh] of [[-0.035, 0.0, 0.36], [0.035, 0.01, 0.32], [0.0, -0.03, 0.4]]) {
			k.smooth(true).grad('#d7aa88', '#f2e2c4', 0.15, hh).lathe([[0.034, 0.15], [0.026, hh * 0.8], [0.02, hh * 0.92], [0, hh * 0.93]], 7, px + dx, 0, pz + dz).smooth(false);
			k.color('#5f4c41').lathe([[0, -0.003], [0.03, -0.003], [0.038, 0.014], [0.026, 0.034], [0, 0.04]], 7, px + dx, hh * 0.92, pz + dz);
		}
		// kayısı bahçeleri ve üzüm bağları
		for (let i = 0; i < 9; i++) {
			const a = R() * Math.PI * 2;
			const rr = 0.48 + R() * 0.18;
			tree(k, Math.cos(a) * rr, Math.sin(a) * rr * 0.9 + 0.08, 0.8, R);
		}
		// balonlar: gün doğumu gibi renk renk, farklı yüksekliklerde, geniş bir alana dağılmış
		const cols = [
			['#e63946', '#f1c453'],
			['#2a9df4', '#ffffff'],
			['#ff7b00', '#7b2cbf'],
			['#06d6a0', '#ef476f'],
			['#ffd166', '#118ab2'],
			['#f72585', '#4cc9f0'],
			['#8ac926', '#ff595e'],
		];
		const pos = [
			[0.14, 1.45, 0.3, 0.15],
			[-0.62, 1.9, -0.05, 0.14],
			[0.66, 1.25, -0.4, 0.13],
			[-0.2, 2.35, -0.6, 0.14],
			[0.62, 2.05, 0.42, 0.12],
			[-0.66, 1.05, 0.55, 0.11],
			[0.05, 2.75, -0.15, 0.12],
		];
		const nb = k.seg < 1 ? 5 : pos.length;
		for (let i = 0; i < nb; i++) {
			const [x, y, z, r] = pos[i];
			balloon(k, x, y, z, r * 1.25, cols[i][0], cols[i][1], 1 + i * 0.37);
		}
	},

	// ---------------------------------------------------------------- Ayasofya
	ayasofya(k, R) {
		grounds(k, 0.62, '#cbbd9f', { ring: 0.78 });
		const P = '#dfa47c';
		const P2 = '#cc8e68';
		const PL = '#e8b58f';
		// gövde (ana kare + doğu-batı uzantıları)
		k.color(P).box(0.6, 0.2, 0.46, 0, -0.06);
		k.color(P2).box(0.62, 0.02, 0.48, 0, 0.14);
		windows(k, 6, -0.24, 0.24, 0.04, 0.232, 0.024, 0.05, 0, true);
		windows(k, 4, -0.16, 0.16, 0.1, 0.232, 0.02, 0.03, 0, true);
		// kuzey ve güney yanlarda dev payandalar (basamaklı)
		for (const x of [-0.2, 0.2])
			for (const z of [-0.25, 0.25]) {
				k.color(P2).box(0.08, 0.3, 0.09, x, -0.02, z);
				k.color(P).box(0.07, 0.04, 0.08, x, 0.28, z);
				k.color(P2).box(0.06, 0.02, 0.05, x, 0.0, z + Math.sign(z) * 0.06);
			}
		// kubbe kasnağı: pencere halkası (40 pencere → maket: 18) ve aralarında payanda kaburgalar
		const yD = 0.3;
		k.color(PL).cyl(0.185, 0.19, 0.05, 18, 0, yD - 0.05);
		k.color(P).cyl(0.17, 0.175, 0.045, 18, 0, yD);
		for (let i = 0; i < 18; i++) {
			const a = (i / 18) * Math.PI * 2;
			k.color(DARK).box(0.022, 0.03, 0.01, Math.cos(a) * 0.172, yD + 0.006, Math.sin(a) * 0.172, -a + Math.PI / 2);
			const b = a + Math.PI / 18;
			k.color(P2).box(0.012, 0.04, 0.025, Math.cos(b) * 0.18, yD, Math.sin(b) * 0.18, -b + Math.PI / 2);
		}
		k.color(LEAD).smooth(true).dome(0.18, 20, 0, yD + 0.045, 0, 0.52).smooth(false);
		k.color(GOLD).cyl(0.004, 0.004, 0.04, 3, 0, yD + 0.13).sphere(0.009, 4, 0, yD + 0.175);
		// doğu ve batı yarım kubbeleri, köşelerde küçük eksedra kubbeleri
		const semi = (r, x, y, z, phi, sy) => k.color(LEAD).smooth(true).add(new THREE.SphereGeometry(r, Math.round(14 * k.seg), 5, phi, Math.PI, 0, Math.PI / 2), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, sy, 1))).smooth(false);
		k.color(P).box(0.12, 0.08, 0.32, -0.21, 0.14, 0).box(0.12, 0.08, 0.32, 0.21, 0.14, 0);
		semi(0.16, -0.17, 0.22, 0, 0, 0.62);
		semi(0.16, 0.17, 0.22, 0, Math.PI, 0.62);
		for (const s of [-1, 1])
			for (const z of [-0.09, 0.09]) {
				k.color(P).cyl(0.065, 0.07, 0.04, 10, s * 0.29, 0.14, z);
				k.color(LEAD).smooth(true).dome(0.065, 10, s * 0.29, 0.18, z, 0.6).smooth(false);
			}
		// dört minare: biri kırmızı tuğla (Fatih), ötekiler beyaz taş
		minaret(k, 0.36, 0.3, 0.5, 0.026, '#b6644b', 1);
		minaret(k, -0.36, 0.3, 0.52, 0.024, '#efe6d6', 1);
		minaret(k, -0.36, -0.3, 0.55, 0.024, '#efe6d6', 2);
		minaret(k, 0.36, -0.3, 0.55, 0.024, '#efe6d6', 2);
		// avlu: türbe kubbeleri, şadırvan, ağaçlar
		k.color(PL).cyl(0.05, 0.05, 0.07, 8, 0.0, 0, 0.42);
		k.color(LEAD).smooth(true).dome(0.05, 8, 0.0, 0.07, 0.42, 0.7).smooth(false);
		for (const [x, z] of [[-0.5, 0.12], [0.5, 0.05], [-0.46, -0.32], [0.48, -0.28], [-0.2, 0.47], [0.24, 0.48]]) tree(k, x, z, 1, R);
		cypress(k, -0.52, 0.32, 1.1);
		cypress(k, 0.52, 0.3, 1.1);
	},

	// ---------------------------------------------------------------- Galata
	galata(k, R) {
		grounds(k, 0.42, '#b6a88f', { ring: 0.75 });
		// tepe mahallesi: renkli İstanbul evleri
		const H = [['#e9b47c', -0.24, 0.16, 0.3], ['#d8735a', 0.23, 0.18, -0.2], ['#f0d9a8', 0.24, -0.16, 0.4], ['#c99a6b', -0.22, -0.2, -0.3], ['#e8c290', 0.02, 0.29, 0.1]];
		for (const [c, x, z, ry] of H) {
			k.push().move(x, 0, z).rot(0, ry, 0);
			k.color(c).box(0.12, 0.12, 0.1);
			windows(k, 2, -0.03, 0.03, 0.05, 0.051, 0.018, 0.03);
			k.color(ROOF).cone(0.095, 0.06, 4, 0, 0.12, 0, Math.PI / 4);
			k.pop();
		}
		// kule gövdesi: yontma taş, tabana doğru koyu (yaşlı taş), halka kuşaklar
		k.grad('#a8957a', '#dccbaa', 0, 0.6).lathe([[0.15, -0.08], [0.15, 0.0], [0.145, 0.2], [0.138, 0.4], [0.134, 0.56], [0, 0.56]], 14, 0, 0, 0);
		for (const y of [0.16, 0.34]) k.color('#c7b391').cyl(0.15, 0.15, 0.014, 14, 0, y);
		// pencere sıraları (kemerli)
		for (const [y, n] of [[0.08, 5], [0.22, 7], [0.4, 7]])
			for (let i = 0; i < n; i++) {
				const a = -1.1 + (i / (n - 1)) * 2.2;
				const r = 0.141 - y * 0.012;
				k.color(DARK).slab(archShape(0.022, 0.05), 0.016, Math.sin(a) * r, y, Math.cos(a) * r, a);
			}
		// seyir terası: konsollu korniş, kemerli galeri, korkuluk
		k.color('#e3d6bb').cyl(0.17, 0.14, 0.04, 14, 0, 0.56);
		k.color('#d6c7a8').cyl(0.17, 0.17, 0.015, 14, 0, 0.6);
		k.color('#cbbb9b').cyl(0.115, 0.12, 0.12, 14, 0, 0.6);
		for (let i = 0; i < 10; i++) {
			const a = (i / 10) * Math.PI * 2;
			k.color(DARK).slab(archShape(0.024, 0.07), 0.012, Math.sin(a) * 0.116, 0.62, Math.cos(a) * 0.116, a);
			k.color('#e6dac1').box(0.006, 0.03, 0.006, Math.sin(a) * 0.165, 0.615, Math.cos(a) * 0.165);
		}
		k.color('#e6dac1').cyl(0.168, 0.168, 0.008, 14, 0, 0.642, 0, true);
		k.color('#d9cbaf').cyl(0.13, 0.12, 0.02, 14, 0, 0.72);
		// sivri kurşun külah ve alem
		k.color(LEAD2).smooth(true).lathe([[0.135, 0], [0.12, 0.08], [0.08, 0.2], [0.03, 0.31], [0, 0.34]], 14, 0, 0.74, 0).smooth(false);
		k.color(GOLD).cyl(0.004, 0.004, 0.06, 3, 0, 1.08).sphere(0.011, 5, 0, 1.15);
		tree(k, -0.32, -0.02, 1, R);
		cypress(k, 0.33, 0.02, 1);
	},

	// ---------------------------------------------------------------- Pamukkale
	pamukkale(k, R) {
		grounds(k, 0.72, '#e6edf0', { ring: 0.82 });
		const W = '#f2f8fc';
		const W2 = '#d9e4ec';
		const AQ = [0.08, 0.68, 0.86];
		// arkada Hierapolis düzlüğü: beyaz traverten yamaç
		const hill = jitter(new THREE.SphereGeometry(1, Math.round(16 * k.seg), 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.04, 4, true).scale(0.62, 0.36, 0.3);
		k.smooth(true).grad('#d6e0e8', '#f2f7fb', 0, 0.36).add(hill, new THREE.Matrix4().makeTranslation(0, 0.0, -0.42)).smooth(false);
		// basamak basamak traverten havuzları: her basamakta dilimli beyaz dudak, üstünde turkuaz su,
		// dudağın altında sarkıt saçağı. Aşağı indikçe basamaklar genişler (kaskad)
		const N = k.seg < 1 ? 5 : 6;
		for (let i = 0; i < N; i++) {
			const y = 0.34 - i * 0.062;
			const zf = -0.24 + i * 0.1;
			const Wd = 0.4 + i * 0.07;
			k.grad(W2, W, y - 0.12, y).box(Wd, y + 0.06, 0.12, 0, -0.06, zf - 0.06);
			const n = 3 + i;
			const lw = Wd / n;
			for (let j = 0; j < n; j++) {
				const cx = -Wd / 2 + lw * (j + 0.5) + (R() - 0.5) * lw * 0.15;
				const rr = lw * 0.55;
				// dudak dizisi ortada öne taşar, hafif düzensiz (doğal kaskad, merdiven değil)
				const zl = zf + 0.045 * Math.cos((cx / Wd) * Math.PI) - 0.02 + (R() - 0.5) * 0.025;
				const lip = new THREE.CylinderGeometry(rr, rr * 1.12, 0.07, Math.round(9 * k.seg) + 1, 1, false, -Math.PI / 2, Math.PI);
				lip.scale(1, 1, 0.42).translate(cx, y - 0.035, zl);
				k.grad(W2, W, y - 0.07, y).add(lip);
				const pool = new THREE.CylinderGeometry(rr * 0.92, rr * 0.92, 0.004, Math.round(9 * k.seg) + 1, 1, false, -Math.PI / 2, Math.PI);
				pool.scale(1, 1, 0.36).translate(cx, y + 0.002, zl - 0.004);
				k.raw(AQ[0], AQ[1], AQ[2]).mat(M.WATER).add(pool);
				// sarkıt saçağı
				k.color('#eef1ec');
				for (const d of [-0.3, 0.32]) {
					const a = d * Math.PI;
					k.add(new THREE.ConeGeometry(0.006, 0.025 + R() * 0.015, 4).rotateX(Math.PI).translate(cx + Math.sin(a) * rr * 0.9, y - 0.085, zl + Math.cos(a) * rr * 0.4));
				}
			}
			// basamağın gerisi: geniş havuz
			const back = new THREE.PlaneGeometry(Wd * 0.96, 0.1).rotateX(-Math.PI / 2).translate(0, y + 0.003, zf - 0.052);
			k.raw(AQ[0] * 0.8, AQ[1] * 0.95, AQ[2]).mat(M.WATER).add(back);
		}
		// tepede antik havuz ve Hierapolis sütunları, yamaçta yeşil
		k.raw(0.12, 0.62, 0.78).mat(M.WATER).cyl(0.1, 0.1, 0.006, 12, -0.26, 0.335, -0.5);
		k.color(MARBLE);
		for (let i = 0; i < 6; i++) k.cyl(0.013, 0.015, 0.1 + (i % 3) * 0.035, 6, 0.06 + i * 0.07, 0.38, -0.5);
		k.color('#e1d6bf').box(0.18, 0.02, 0.03, 0.12, 0.48, -0.5);
		for (const [x, z] of [[-0.56, 0.0], [0.58, -0.05], [-0.5, 0.3], [0.52, 0.32], [-0.4, -0.5]]) tree(k, x, z, 1.1, R);
	},

	// ---------------------------------------------------------------- Nemrut
	nemrut(k, R) {
		grounds(k, 0.72, '#b4a487', { ring: 0.85, jit: 0.08 });
		// zirvedeki yapay çakıl tepesi (tümülüs)
		const tum = new THREE.LatheGeometry([[0.56, -0.05], [0.5, 0.06], [0.38, 0.22], [0.24, 0.38], [0.1, 0.5], [0, 0.53]].map(([r, y]) => new THREE.Vector2(r, y)), Math.round(14 * k.seg));
		k.grad('#9a8b74', '#c9bca3', 0, 0.5).add(jitter(tum, 0.035, 9), new THREE.Matrix4().makeTranslation(0, 0, -0.26));
		// doğu terası: taş platform, arkada başsız tahtta oturan heykeller, önde yere düşmüş dev başlar
		k.color('#bba98a').box(1.04, 0.05, 0.4, 0, -0.03, 0.24);
		const S = '#d3bf98';
		const S2 = '#c3ad86';
		for (let i = 0; i < 5; i++) {
			const x = -0.36 + i * 0.18;
			k.color('#b29d7b').box(0.15, 0.09, 0.13, x, 0, 0.13);
			k.color(S2).box(0.12, 0.13, 0.09, x, 0.09, 0.12);
			k.color(S2).box(0.14, 0.03, 0.1, x, 0.2, 0.12);
			k.color(S2).box(0.03, 0.08, 0.06, x - 0.05, 0.09, 0.19).box(0.03, 0.08, 0.06, x + 0.05, 0.09, 0.19);
		}
		const head = (x, z, ry, s, col, kind) => {
			const d = '#9c8665';
			k.push().move(x, 0.02, z).rot(0, ry, (R() - 0.5) * 0.15).scale(s);
			if (kind === 'kartal') {
				k.color(col).box(0.09, 0.1, 0.09);
				k.color(d).cone(0.02, 0.06, 4, 0, 0.04, 0.06).rot(0, 0, 0);
				k.color(d).box(0.05, 0.02, 0.05, 0, 0.1, 0);
			} else if (kind === 'aslan') {
				k.color(col).ico(0.07, 0, 0.06, 0, 1.1);
				k.color(S2).box(0.07, 0.06, 0.06, 0, 0.03, 0.045);
				k.color(d).box(0.03, 0.015, 0.02, 0, 0.045, 0.078);
			} else {
				k.color(col).box(0.1, 0.11, 0.09);
				k.color(col).box(0.09, 0.03, 0.08, 0, -0.012, 0.006);
				k.color(S2).box(0.07, 0.05, 0.035, 0, -0.02, 0.04);
				k.color(col).box(0.018, 0.035, 0.022, 0, 0.03, 0.052);
				k.color(d).box(0.08, 0.01, 0.012, 0, 0.068, 0.046);
				k.color('#5d4c3a').box(0.018, 0.008, 0.004, -0.022, 0.054, 0.046).box(0.018, 0.008, 0.004, 0.022, 0.054, 0.046);
				// Kommagene külahı: bant + yukarı sivrilen, ucu öne kıvrık külah
				k.color(S).cyl(0.056, 0.058, 0.025, 8, 0, 0.105, -0.004);
				k.color(S).cone(0.054, 0.14, 8, 0, 0.13, -0.004);
				k.push().move(0, 0.255, 0.008).rot(0.7, 0, 0);
				k.color(S).cone(0.018, 0.05, 6);
				k.pop();
			}
			k.pop();
		};
		const kinds = ['aslan', 'tanri', 'tanri', 'tanri', 'tanri', 'tanri', 'kartal'];
		for (let i = 0; i < 7; i++) {
			const x = -0.45 + i * 0.15;
			head(x, 0.34 + (i % 2) * 0.04, (R() - 0.5) * 0.5, i === 0 || i === 6 ? 1.05 : 1.32, i % 2 ? S : '#cbb58f', kinds[i]);
		}
		// dağınık taş blokları
		k.color('#b5a283');
		for (let i = 0; i < 8; i++) k.box(0.04 + R() * 0.04, 0.025, 0.03 + R() * 0.03, (R() - 0.5) * 1.0, 0.0, 0.44 + R() * 0.12, R() * 3);
	},

	// ---------------------------------------------------------------- Sümela
	sumela(k, R) {
		grounds(k, 0.55, '#557a45', { ring: 0.7 });
		// sarp kaya yüzü (ormanlı vadinin dik yamacı)
		k.grad('#5f5c54', '#8b877a', 0, 1.4).add(rock(0.5, 1.2, 0.32, 3), new THREE.Matrix4().makeTranslation(0, 0.55, -0.22));
		k.grad('#5c594f', '#837f72', 0, 1.5).add(rock(0.32, 0.8, 0.25, 9), new THREE.Matrix4().makeTranslation(0.3, 0.9, -0.27));
		k.grad('#66625a', '#8d897c', 0, 1.2).add(rock(0.3, 0.6, 0.25, 5), new THREE.Matrix4().makeTranslation(-0.35, 0.8, -0.17));
		k.color('#2f6a33').mat(M.LEAF).add(rock(0.3, 0.12, 0.25, 2), new THREE.Matrix4().makeTranslation(0.05, 1.55, -0.22));
		// kayaya yapışık manastır: üç kat, sıra sıra pencere, kiremit çatılar, kemerli su kemeri
		const y0 = 0.45;
		const C2 = '#efe7d6';
		k.color('#cfc5b0').box(0.56, 0.1, 0.14, 0, y0 - 0.1, 0.07);
		k.color(C2).box(0.52, 0.18, 0.13, 0, y0, 0.08);
		k.color(C2).box(0.34, 0.13, 0.11, 0.06, y0 + 0.18, 0.07);
		k.color(C2).box(0.14, 0.1, 0.1, -0.16, y0 + 0.18, 0.06);
		k.color(ROOF).box(0.54, 0.025, 0.15, 0, y0 + 0.18, 0.08).box(0.36, 0.025, 0.13, 0.06, y0 + 0.31, 0.07).box(0.16, 0.025, 0.12, -0.16, y0 + 0.28, 0.06);
		windows(k, 7, -0.22, 0.22, y0 + 0.08, 0.146, 0.022, 0.05, 0, true);
		windows(k, 4, -0.04, 0.17, y0 + 0.22, 0.126, 0.02, 0.04, 0, true);
		windows(k, 5, -0.2, 0.2, y0 - 0.06, 0.141, 0.02, 0.03);
		// su kemeri (soldan kayaya)
		k.color('#d7cdb8').slab(facadeShape(0.3, 0.1, [[-0.09, 0.05, 0.07], [0, 0.05, 0.07], [0.09, 0.05, 0.07]]), 0.03, -0.36, y0 + 0.05, 0.1);
		// orman: çamlar
		for (const [x, z, s] of [[-0.38, 0.26, 1.1], [0.4, 0.22, 1.0], [0.22, 0.38, 0.9], [-0.12, 0.4, 0.8], [0.48, -0.05, 1.0], [-0.5, 0.05, 1.0], [0.02, 0.45, 0.85]]) pine(k, x, z, s);
	},

	// ---------------------------------------------------------------- Uzungöl
	uzungol(k, R) {
		grounds(k, 0.62, '#5d9447', { ring: 0.86 });
		k.raw(0.12, 0.55, 0.62 + 1.0).cyl(0.36, 0.36, 0.012, 16, 0.05, 0.004, -0.05);
		k.color('#f3efe6').box(0.16, 0.12, 0.14, -0.28, 0.0, 0.3);
		windows(k, 3, -0.33, -0.23, 0.04, 0.371, 0.018, 0.04, 0, true);
		k.color(LEAD).smooth(true).dome(0.07, 10, -0.28, 0.12, 0.3, 0.8).smooth(false);
		minaret(k, -0.16, 0.36, 0.26, 0.018, '#f3efe6', 1);
		for (const [x, z] of [[0.34, 0.3], [0.42, 0.06], [-0.4, -0.1]]) {
			k.color(WOOD).box(0.12, 0.1, 0.1, x, 0, z);
			windows(k, 2, x - 0.03, x + 0.03, 0.04, z + 0.051, 0.018, 0.028);
			k.color(ROOF).cone(0.1, 0.07, 4, x, 0.1, z, Math.PI / 4);
		}
		for (const [x, z] of [[0.1, -0.38], [-0.15, -0.4], [0.35, -0.3], [-0.38, 0.12], [0.45, 0.4], [-0.5, -0.32]]) pine(k, x, z, 1.05);
	},

	// ---------------------------------------------------------------- Efes, Celsus Kütüphanesi
	celsus(k, R) {
		grounds(k, 0.58, '#d6cab0', { ring: 0.8 });
		const Mb = '#ece3cf';
		const Mw = '#dfcfae';
		// geniş merdiven ve podyum
		k.color(Mw).box(0.62, 0.05, 0.3, 0, 0, -0.02);
		for (let i = 0; i < 4; i++) k.color(i % 2 ? Mb : '#e4d8c0').box(0.4, 0.0125 * (i + 1), 0.025, 0, 0, 0.21 - i * 0.025);
		// arka duvar: alt katta üç kapı, üst katta üç pencere
		k.color('#e2d3b6').slab(facadeShape(0.58, 0.5, [[-0.15, 0.07, 0.13, 0.05], [0, 0.09, 0.16, 0.05], [0.15, 0.07, 0.13, 0.05], [-0.15, 0.06, 0.09, 0.3], [0, 0.07, 0.1, 0.3], [0.15, 0.06, 0.09, 0.3]]), 0.05, 0, 0.0, -0.06);
		k.color(DARK).box(0.52, 0.42, 0.02, 0, 0.05, -0.095);
		// alt kat: çıkmalı kaideler üstünde dört çift sütun; aralarında nişlerde heykeller
		const pairs = [-0.21, -0.07, 0.07, 0.21];
		for (const x of pairs) {
			k.color(Mw).box(0.07, 0.04, 0.06, x, 0.05, 0.05);
			for (const d of [-0.02, 0.02]) {
				k.color(Mb).cyl(0.011, 0.013, 0.15, 7, x + d, 0.09, 0.055);
				k.color('#f3ead8').box(0.026, 0.012, 0.026, x + d, 0.235, 0.055);
			}
			k.color('#f1e8d6').box(0.075, 0.03, 0.065, x, 0.247, 0.05);
		}
		k.color('#efe6d2').box(0.56, 0.02, 0.03, 0, 0.255, 0.0);
		for (const x of [-0.14, 0, 0.14]) {
			k.color('#e9dfc8').cyl(0.012, 0.014, 0.05, 6, x, 0.09, -0.02);
			k.color('#e9dfc8').sphere(0.011, 5, x, 0.15, -0.02);
		}
		// üst kat: kaydırılmış üç çift + iki yanda yarım; ortada üçgen, yanlarda kemerli alınlık
		const up = [-0.245, -0.14, 0, 0.14, 0.245];
		for (let j = 0; j < up.length; j++) {
			const x = up[j];
			const edge = j === 0 || j === up.length - 1;
			k.color(Mw).box(edge ? 0.035 : 0.07, 0.025, 0.05, x, 0.277, 0.045);
			for (const d of edge ? [0] : [-0.02, 0.02]) {
				k.color(Mb).cyl(0.01, 0.012, 0.13, 7, x + d, 0.3, 0.05);
				k.color('#f3ead8').box(0.024, 0.01, 0.024, x + d, 0.43, 0.05);
			}
			if (!edge) {
				k.color('#f1e8d6').box(0.075, 0.025, 0.06, x, 0.44, 0.045);
				if (j === 2) k.color('#f1e8d6').slab(tri(0.085, 0.05), 0.05, x, 0.465, 0.045);
				else k.color('#f1e8d6').slab(archShape(0.08, 0.04), 0.05, x, 0.465, 0.045);
			}
		}
		k.color('#e6dbc4').box(0.6, 0.025, 0.08, 0, 0.465, -0.03);
		// Mermer Cadde: önden geçen döşeli yol, iki yanda devrik ve ayakta sütunlar
		k.color('#d9cfbb').mat(M.GROUND).add(new THREE.PlaneGeometry(1.0, 0.12).rotateX(-Math.PI / 2).translate(0, 0.006, 0.34));
		k.mat(0);
		for (const [x, h] of [[-0.44, 0.16], [-0.3, 0.1], [0.3, 0.2], [0.44, 0.12]]) {
			k.color(MARBLE).cyl(0.014, 0.016, h, 7, x, 0, 0.42);
			k.color('#f3ead8').box(0.03, 0.012, 0.03, x, h, 0.42);
		}
		k.push().move(0.12, 0.014, 0.44).rot(0, 0.3, Math.PI / 2);
		k.color(MARBLE).cyl(0.014, 0.014, 0.14, 7);
		k.pop();
		for (const [x, z] of [[-0.48, -0.1], [0.5, -0.14], [-0.4, -0.4], [0.42, -0.42]]) cypress(k, x, z, 1, 0);
	},

	// ---------------------------------------------------------------- Mevlana
	mevlana(k, R) {
		grounds(k, 0.55, '#cdbf9f', { ring: 0.78 });
		const Cr = '#e9ddc4';
		k.color(Cr).box(0.62, 0.16, 0.3, 0, 0, -0.06);
		k.color('#dccdb0').box(0.64, 0.015, 0.32, 0, 0.16, -0.06);
		windows(k, 6, -0.27, 0.12, 0.05, 0.091, 0.022, 0.05, 0, true);
		k.color(LEAD).smooth(true);
		for (const x of [-0.24, -0.11, 0.02]) {
			k.color(Cr).cyl(0.06, 0.065, 0.03, 10, x, 0.17, -0.07);
			k.color(LEAD).dome(0.058, 10, x, 0.2, -0.07, 0.85);
		}
		k.smooth(false);
		// Yeşil Kubbe (Kubbe-i Hadra): sırlı çini kasnak + yivli külah
		const G = '#23a587';
		const kx = 0.22;
		const kz = -0.05;
		k.color(Cr).cyl(0.13, 0.135, 0.06, 12, kx, 0.15, kz);
		k.color(G).mat(M.TILE).cyl(0.108, 0.115, 0.22, 16, kx, 0.2, kz);
		k.color('#1d8c72').mat(M.TILE).cyl(0.125, 0.125, 0.025, 16, kx, 0.42, kz);
		k.color(DARK);
		for (let i = 0; i < 6; i++) {
			const a = -1.2 + i * 0.48;
			k.slab(archShape(0.018, 0.05), 0.012, kx + Math.sin(a) * 0.113, 0.3, kz + Math.cos(a) * 0.113, a);
		}
		const fl = new THREE.ConeGeometry(0.118, 0.36, 32, 3, true);
		const p = fl.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const a = Math.atan2(p.getZ(i), p.getX(i));
			const f = 1 + 0.07 * Math.cos(a * 16);
			p.setX(i, p.getX(i) * f);
			p.setZ(i, p.getZ(i) * f);
		}
		fl.translate(kx, 0.445 + 0.18, kz);
		k.color('#2fb495').mat(M.TILE).add(fl);
		k.color(GOLD).cyl(0.004, 0.004, 0.07, 3, kx, 0.8, kz).sphere(0.012, 5, kx, 0.875, kz);
		minaret(k, -0.33, 0.13, 0.3, 0.02, Cr, 1, '#2a9d8f');
		// avlu: şadırvan, serviler ve gül bahçesi
		k.color('#e2d6bd').cyl(0.06, 0.065, 0.06, 8, 0.0, 0, 0.25);
		k.color(LEAD).smooth(true).dome(0.065, 8, 0.0, 0.06, 0.25, 0.7).smooth(false);
		k.raw(0.15, 0.6, 0.72).mat(M.WATER).cyl(0.045, 0.045, 0.004, 8, 0.0, 0.008, 0.25);
		for (const [x, z] of [[-0.42, 0.3], [0.42, 0.28], [-0.2, 0.36], [0.24, 0.36]]) cypress(k, x, z, 1.15);
		for (const [x, z] of [[-0.45, -0.3], [0.48, -0.3]]) tree(k, x, z, 1, R);
	},

	// ---------------------------------------------------------------- Selimiye
	selimiye(k, R) {
		grounds(k, 0.66, '#cfc3a8', { ring: 0.8 });
		const W = '#efe5cf';
		const W2 = '#e0d3b6';
		k.color(W).box(0.6, 0.22, 0.6, 0, -0.04, -0.06);
		windows(k, 5, -0.22, 0.22, 0.03, 0.241, 0.024, 0.05, 0, true);
		windows(k, 5, -0.22, 0.22, 0.11, 0.241, 0.02, 0.04, 0, true);
		// avlu: revaklı dikdörtgen, sıra sıra küçük kubbeler, ortada şadırvan
		k.color(W2).box(0.56, 0.08, 0.04, 0, 0, 0.5);
		for (const x of [-0.27, 0.27]) k.color(W2).box(0.04, 0.08, 0.26, x, 0, 0.37);
		k.color(LEAD).smooth(true);
		for (let i = 0; i < 7; i++) k.dome(0.026, 8, -0.24 + i * 0.08, 0.08, 0.5, 0.8);
		for (let i = 0; i < 3; i++) for (const x of [-0.27, 0.27]) k.dome(0.026, 8, x, 0.08, 0.3 + i * 0.08, 0.8);
		k.smooth(false);
		k.color(W).cyl(0.04, 0.045, 0.04, 8, 0, 0, 0.38);
		k.color(LEAD).smooth(true).dome(0.045, 8, 0, 0.04, 0.38, 0.6).smooth(false);
		// sekizgen kasnak, sekiz payanda kulesi (küçük kubbeli), köşe yarım kubbeleri, dev kubbe
		const zc = -0.06;
		k.color(W).cyl(0.3, 0.32, 0.1, 8, 0, 0.18, zc);
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
			const x = Math.cos(a) * 0.31;
			const z = zc + Math.sin(a) * 0.31;
			k.color(W).cyl(0.03, 0.034, 0.18, 8, x, 0.18, z);
			k.color(LEAD).smooth(true).dome(0.032, 8, x, 0.36, z, 1.2).smooth(false);
			k.color(GOLD).cyl(0.003, 0.003, 0.03, 3, x, 0.395, z);
		}
		for (let i = 0; i < 16; i++) {
			const a = (i / 16) * Math.PI * 2;
			k.color(DARK).box(0.022, 0.05, 0.02, Math.cos(a) * 0.305, 0.205, zc + Math.sin(a) * 0.305, -a + Math.PI / 2);
		}
		for (const [x, z] of [[-0.24, zc - 0.24], [0.24, zc - 0.24], [-0.24, zc + 0.24], [0.24, zc + 0.24]]) k.color(LEAD).smooth(true).dome(0.08, 10, x, 0.18, z, 0.7).smooth(false);
		k.color(W).cyl(0.27, 0.28, 0.04, 20, 0, 0.28, zc);
		k.color(LEAD).smooth(true).dome(0.285, 22, 0, 0.32, zc, 0.6).smooth(false);
		k.color(GOLD).cyl(0.006, 0.006, 0.07, 3, 0, 0.49, zc).sphere(0.015, 5, 0, 0.57, zc);
		// dört ince uzun minare, üçer şerefe (dünyanın en ince minareleri)
		for (const [x, z] of [[-0.35, -0.4], [0.35, -0.4], [-0.35, 0.28], [0.35, 0.28]]) minaret(k, x, z, 0.82, 0.02, W, 3);
		for (const [x, z] of [[-0.56, 0.1], [0.56, 0.05], [-0.5, -0.4], [0.52, -0.38]]) tree(k, x, z, 1, R);
	},

	// ---------------------------------------------------------------- İshak Paşa
	ishakpasa(k, R) {
		grounds(k, 0.62, '#9b8a73', { ring: 0.72, jit: 0.1 });
		// kayalık yamaç üstünde saray
		k.grad('#7d6e5d', '#a69580', -0.3, 0.05).add(jitter(new THREE.CylinderGeometry(0.58, 0.68, 0.36, 10, 2), 0.03, 4), new THREE.Matrix4().makeTranslation(0, -0.18, -0.02));
		const S = '#d9ab80';
		const S2 = '#c99a70';
		k.color(S).box(0.8, 0.2, 0.5, 0, 0.0, -0.02);
		k.merlons(-0.4, 0.23, 0.4, 0.23, 0.2, 0.05, 0.05, 0.04, 0.04);
		windows(k, 6, -0.34, 0.34, 0.08, 0.231, 0.022, 0.05, 0, true);
		// yüksek taç kapı (mukarnaslı niş)
		k.color('#e3b98e').box(0.2, 0.36, 0.08, -0.12, 0.0, 0.25);
		k.color(S2).slab(archShape(0.15, 0.3), 0.02, -0.12, 0.02, 0.295);
		k.color('#6b4630').slab(archShape(0.09, 0.2), 0.02, -0.12, 0.02, 0.3);
		k.color('#f0d6b0').box(0.22, 0.02, 0.09, -0.12, 0.36, 0.25);
		// köşe kuleleri
		for (const [x, z] of [[-0.4, 0.23], [0.4, 0.23], [0.4, -0.27], [-0.4, -0.27]]) {
			k.color(S).cyl(0.06, 0.07, 0.3, 10, x, 0.0, z);
			k.color(S2).cone(0.07, 0.08, 10, x, 0.3, z);
		}
		// kubbe ve çizgili minare
		k.color(S).cyl(0.1, 0.11, 0.08, 12, 0.18, 0.2, -0.05);
		k.color('#c7956b').smooth(true).dome(0.1, 12, 0.18, 0.28, -0.05, 0.9).smooth(false);
		k.color(GOLD).cyl(0.004, 0.004, 0.04, 3, 0.18, 0.37, -0.05);
		for (let i = 0; i < 6; i++) k.color(i % 2 ? '#b8553e' : '#f0dcc0').cyl(0.03, 0.032, 0.07, 8, 0.36, 0.2 + i * 0.07, 0.08);
		k.color('#f0dcc0').cyl(0.05, 0.035, 0.03, 8, 0.36, 0.62, 0.08);
		k.color(LEAD).cone(0.035, 0.1, 8, 0.36, 0.65, 0.08);
		flag(k, 0.36, 0.75, 0.08, 0.12, 0.08);
	},

	// ---------------------------------------------------------------- Safranbolu
	safranbolu(k, R) {
		grounds(k, 0.62, '#a59b84', { ring: 0.78 });
		// arnavut kaldırımlı yokuş üstünde konaklar: taş zemin kat, çıkmalı beyaz üst kat, ahşap dikmeler,
		// pencere sıraları, kiremit kırma çatı ve bacalar
		const houses = [[-0.24, 0.14, 0.2, 1], [0.18, 0.2, -0.3, 1.1], [0.05, -0.2, 0.5, 1], [-0.32, -0.24, -0.1, 0.9], [0.38, -0.06, 0.2, 0.95], [-0.02, 0.38, 0.05, 0.85]];
		for (const [x, z, ry, s] of houses) {
			k.push().move(x, 0, z).rot(0, ry, 0).scale(s);
			k.color('#c7b89c').box(0.18, 0.09, 0.16);
			k.color(DARK).box(0.03, 0.05, 0.008, -0.05, 0, 0.081);
			k.color('#f7f2e6').box(0.23, 0.15, 0.2, 0, 0.09, 0.012);
			k.color('#5a3a24');
			for (const dx of [-0.11, -0.037, 0.037, 0.11]) k.box(0.01, 0.15, 0.01, dx, 0.09, 0.113);
			k.box(0.23, 0.01, 0.01, 0, 0.09, 0.113).box(0.23, 0.01, 0.01, 0, 0.235, 0.113);
			windows(k, 3, -0.074, 0.074, 0.14, 0.116, 0.035, 0.05);
			k.color(R() < 0.5 ? '#c4573b' : '#b84a33').cone(0.2, 0.11, 4, 0, 0.24, 0.012, Math.PI / 4);
			k.color('#cfc3ab').box(0.02, 0.06, 0.02, 0.06, 0.28, -0.03);
			k.pop();
		}
		// Köprülü Mehmet Paşa Camii
		k.color('#efe6d2').box(0.16, 0.1, 0.14, 0.4, 0, 0.3);
		k.color(LEAD).smooth(true).dome(0.07, 10, 0.4, 0.1, 0.3, 0.8).smooth(false);
		minaret(k, 0.5, 0.38, 0.24, 0.016, '#efe6d2', 1);
		for (const [x, z] of [[-0.46, 0.08], [0.0, 0.08], [-0.42, 0.4], [0.5, -0.35]]) tree(k, x, z, 1.1, R);
	},

	// ---------------------------------------------------------------- Göbeklitepe
	gobekli(k) {
		grounds(k, 0.62, '#c3a57f', { ring: 0.85 });
		k.color('#b39472').cyl(0.5, 0.52, 0.03, 14, 0, -0.01);
		for (const [cx, cz, r] of [[-0.18, 0.05, 0.22], [0.22, -0.08, 0.2], [0.05, 0.3, 0.15]]) {
			k.color('#a88b68').cyl(r + 0.03, r + 0.03, 0.05, 12, cx, 0.0, cz, true);
			const n = Math.round(r * 40);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2;
				const x = cx + Math.cos(a) * r;
				const z = cz + Math.sin(a) * r;
				k.color('#d9c4a0').box(0.03, 0.14, 0.018, x, 0.02, z, -a).box(0.06, 0.03, 0.03, x, 0.16, z, -a);
			}
			for (const dx of [-0.04, 0.04]) k.color('#e2cfac').box(0.04, 0.22, 0.022, cx + dx, 0.02, cz).box(0.085, 0.045, 0.04, cx + dx, 0.24, cz);
		}
		// koruma çatısı (zarif membran): yalnızca dikmeleri
		k.color('#d6d8db');
		for (const [x, z] of [[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.42], [0.45, 0.42]]) k.box(0.012, 0.42, 0.012, x, 0, z);
	},

	// ---------------------------------------------------------------- Truva atı
	truva(k) {
		grounds(k, 0.5, '#b9a986', { ring: 0.8 });
		const W = '#a2703f';
		const W2 = '#8a5c33';
		k.color(W2).box(0.5, 0.05, 0.24, 0, 0.06);
		for (const x of [-0.18, 0.18]) for (const z of [-0.13, 0.13]) k.color('#5e3d22').add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10).rotateX(Math.PI / 2).translate(x, 0.06, z));
		for (const x of [-0.15, 0.15]) for (const z of [-0.07, 0.07]) k.color(W).box(0.05, 0.24, 0.05, x, 0.11, z);
		k.color(W).box(0.44, 0.17, 0.2, 0, 0.33);
		for (let i = 0; i < 5; i++) k.color(W2).box(0.44, 0.008, 0.202, 0, 0.35 + i * 0.03);
		k.push().move(0.2, 0.45, 0).rot(0, 0, -0.55);
		k.color(W).box(0.1, 0.26, 0.11);
		k.pop();
		k.push().move(0.31, 0.64, 0).rot(0, 0, 0.25);
		k.color(W).box(0.2, 0.09, 0.1);
		k.color('#e8d7b3').box(0.02, 0.03, 0.11, 0.06, 0.03, 0);
		k.color(W2).box(0.04, 0.06, 0.03, -0.04, 0.09, 0.03).box(0.04, 0.06, 0.03, -0.04, 0.09, -0.03);
		k.pop();
		k.color('#6b4a2c').box(0.03, 0.18, 0.04, -0.24, 0.3, 0);
		k.color(DARK).box(0.1, 0.06, 0.01, -0.05, 0.36, 0.101);
	},

	// ---------------------------------------------------------------- Aspendos
	aspendos(k) {
		grounds(k, 0.66, '#c7ad86', { ring: 0.82 });
		const S = '#dcbf92';
		for (let i = 0; i < 6; i++) {
			const r = 0.5 - i * 0.065;
			const h = 0.32 - i * 0.05;
			const g = new THREE.CylinderGeometry(r, r, h, 16, 1, false, Math.PI / 2, Math.PI);
			g.translate(0, h / 2, 0);
			k.color(i % 2 ? S : '#d1b386').add(g);
		}
		k.color('#cdb084').cyl(0.17, 0.17, 0.01, 12, 0, 0.0);
		k.color('#d6b98c').slab(facadeShape(1.0, 0.42, [[-0.3, 0.06, 0.12, 0.08], [-0.15, 0.06, 0.12, 0.08], [0, 0.1, 0.16, 0.0], [0.15, 0.06, 0.12, 0.08], [0.3, 0.06, 0.12, 0.08], [-0.3, 0.05, 0.08, 0.26], [0.3, 0.05, 0.08, 0.26], [0, 0.05, 0.08, 0.28]]), 0.07, 0, 0, 0.02);
		k.color(DARK).box(0.96, 0.4, 0.01, 0, 0.0, -0.02);
		k.color('#c4a77a').box(1.04, 0.03, 0.09, 0, 0.42, 0.02);
	},

	// ---------------------------------------------------------------- Van Kalesi
	vankalesi(k) {
		const g = new THREE.BoxGeometry(1.2, 0.36, 0.34, 6, 2, 2);
		const p = g.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i);
			const y = p.getY(i);
			const t = 1 - Math.abs(x) / 0.6;
			p.setY(i, y > 0 ? y * (0.5 + 0.9 * t) + Math.sin(x * 9) * 0.03 : y);
			p.setZ(i, p.getZ(i) * (0.7 + 0.4 * t));
		}
		g.translate(0, 0.08, 0);
		k.grad('#8a7b65', '#a99880', -0.1, 0.35).add(g);
		grounds(k, 0.64, '#9a8a72', { rz: 0.5, ring: 0.86, jit: 0.06 });
		const S = '#c9b48f';
		const top = (x) => 0.08 + 0.18 * (0.5 + 0.9 * (1 - Math.abs(x) / 0.6));
		for (let i = 0; i < 7; i++) {
			const x = -0.48 + i * 0.16;
			k.color(S).box(0.15, 0.07, 0.06, x, top(x) - 0.01, 0.05);
			k.merlons(x - 0.07, 0.08, x + 0.07, 0.08, top(x) + 0.06, 0.03, 0.025, 0.02, 0.02);
		}
		for (const x of [-0.38, 0.0, 0.32]) k.color(S).cyl(0.05, 0.055, 0.14, 8, x, top(x) - 0.02, 0.05).merlonRing(0.05, top(x) + 0.12, 6, 0.03, 0.025, 0.02);
		flag(k, 0.0, top(0) + 0.12, 0.05, 0.16, 0.09);
	},

	// --- ek yapılar
	kizkulesi(k) {
		k.grad('#6f685c', '#9a9282', -0.1, 0.1).ico(0.17, 0, -0.06, 0, 0.45, 1);
		k.color('#f4efe4').box(0.16, 0.12, 0.12, -0.02, 0.0, 0);
		windows(k, 2, -0.06, 0.02, 0.04, 0.061, 0.018, 0.04, 0, true);
		k.color('#f4efe4').cyl(0.05, 0.055, 0.26, 10, 0.05, 0.0, 0);
		windows(k, 2, 0.05, 0.05, 0.12, 0.053, 0.016, 0.035, 0, true);
		k.color('#e6dfd0').cyl(0.062, 0.062, 0.018, 10, 0.05, 0.2, 0);
		k.color(LEAD2).cone(0.06, 0.12, 10, 0.05, 0.26, 0);
		k.color(LEAD).smooth(true).dome(0.045, 8, -0.05, 0.12, 0, 0.8).smooth(false);
		k.color(GOLD).cyl(0.004, 0.004, 0.04, 3, 0.05, 0.38, 0);
		flag(k, -0.08, 0.12, -0.03, 0.12, 0.07);
	},
	kopru(k) {
		const L = 0.95;
		k.color('#d7dadf');
		for (const x of [-L / 2, L / 2]) {
			k.box(0.035, 0.5, 0.025, x, -0.05, -0.05).box(0.035, 0.5, 0.025, x, -0.05, 0.05).box(0.04, 0.03, 0.13, x, 0.38, 0).box(0.04, 0.02, 0.13, x, 0.22, 0);
		}
		k.color('#c9473a').box(L + 0.3, 0.025, 0.1, 0, 0.12, 0);
		k.color('#9aa3ad');
		const n = 12;
		for (const z of [-0.05, 0.05])
			for (let i = 0; i < n; i++) {
				const x0 = -L / 2 + (i / n) * L;
				const x1 = -L / 2 + ((i + 1) / n) * L;
				const f = (x) => 0.43 - 0.28 * (1 - ((2 * x) / L) ** 2);
				const y0 = f(x0);
				const y1 = f(x1);
				k.push().move((x0 + x1) / 2, (y0 + y1) / 2, z).rot(0, 0, Math.atan2(y1 - y0, x1 - x0));
				k.box(Math.hypot(x1 - x0, y1 - y0) + 0.004, 0.008, 0.008, 0, -0.004, 0);
				k.pop();
				// askı halatları
				const xm = (x0 + x1) / 2;
				const ym = (y0 + y1) / 2;
				if (i % 2 === 0) k.box(0.003, ym - 0.145, 0.003, xm, 0.145, z);
			}
	},
	kizkalesi(k) {
		k.grad('#6e675b', '#958c7c', -0.15, 0.08).ico(0.32, 0, -0.1, 0, 0.35, 1);
		const S = '#d8c7a3';
		k.color(S).box(0.34, 0.16, 0.24, 0, 0.0, 0);
		k.merlons(-0.17, 0.12, 0.17, 0.12, 0.16, 0.03, 0.03, 0.02, 0.025).merlons(-0.17, -0.12, 0.17, -0.12, 0.16, 0.03, 0.03, 0.02, 0.025);
		windows(k, 3, -0.1, 0.1, 0.06, 0.121, 0.016, 0.03, 0, true);
		for (const [x, z] of [[-0.17, 0.12], [0.17, 0.12], [0.17, -0.12], [-0.17, -0.12]]) k.color(S).cyl(0.04, 0.045, 0.22, 8, x, 0, z).merlonRing(0.04, 0.22, 5, 0.03, 0.025, 0.02);
		k.color(S).box(0.1, 0.28, 0.1, 0.05, 0, -0.03);
	},
	bodrum(k) {
		grounds(k, 0.52, '#9b9381', { ring: 0.8 });
		const S = '#cdb894';
		k.color(S).box(0.5, 0.14, 0.4, 0, 0.0, 0);
		k.merlons(-0.25, 0.2, 0.25, 0.2, 0.14, 0.03, 0.035, 0.025, 0.03);
		windows(k, 4, -0.18, 0.18, 0.05, 0.201, 0.016, 0.03, 0, true);
		for (const [x, z, h] of [[-0.12, -0.05, 0.36], [0.12, 0.02, 0.3], [0.2, -0.15, 0.26]]) {
			k.color(S).box(0.1, h, 0.1, x, 0.0, z);
			k.merlons(x - 0.05, z + 0.05, x + 0.05, z + 0.05, h, 0.03, 0.025, 0.02, 0.02);
			windows(k, 1, x, x, h * 0.6, z + 0.051, 0.014, 0.03, 0, true);
		}
		flag(k, -0.12, 0.39, -0.05, 0.1, 0.07);
		for (const [x, z] of [[-0.4, 0.2], [0.42, 0.18]]) cypress(k, x, z, 1);
	},
	ciftemin(k) {
		grounds(k, 0.48, '#a99f8b', { ring: 0.8 });
		const S = '#c7a27b';
		k.color('#d4b48d').box(0.56, 0.2, 0.36, 0, 0, -0.06);
		k.color('#dcbf98').box(0.24, 0.3, 0.06, 0, 0, 0.14);
		k.color('#5a3a26').slab(archShape(0.1, 0.18), 0.02, 0, 0.0, 0.175);
		k.color('#2a9d8f').mat(M.TILE).box(0.25, 0.02, 0.065, 0, 0.26, 0.14);
		for (const x of [-0.1, 0.1]) {
			k.color(S).cyl(0.035, 0.04, 0.3, 10, x, 0.3, 0.14);
			k.color('#2a9d8f').mat(M.TILE).cyl(0.036, 0.036, 0.03, 10, x, 0.45, 0.14);
			k.color(S).cyl(0.03, 0.035, 0.12, 10, x, 0.48, 0.14);
		}
		k.color(LEAD).smooth(true).dome(0.09, 10, 0, 0.2, -0.18, 1.1).smooth(false);
	},
	saatkulesi(k) {
		grounds(k, 0.36, '#c9bfa9', { ring: 0.75 });
		const S = '#efe0c4';
		k.color('#d7c7a9').cyl(0.12, 0.14, 0.04, 8);
		k.color(S).cyl(0.07, 0.08, 0.22, 8, 0, 0.04);
		windows(k, 1, 0, 0, 0.1, 0.075, 0.02, 0.05, 0, true);
		k.color('#d9b98e').cyl(0.085, 0.085, 0.025, 8, 0, 0.26);
		k.color(S).cyl(0.055, 0.065, 0.14, 8, 0, 0.285);
		k.color('#ffffff').cyl(0.058, 0.058, 0.05, 8, 0, 0.34);
		k.color(S).cyl(0.035, 0.05, 0.1, 8, 0, 0.425);
		k.color(LEAD).cone(0.04, 0.08, 8, 0, 0.525);
		k.color(GOLD).sphere(0.012, 4, 0, 0.61);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			k.color(S).box(0.035, 0.06, 0.035, Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12, -a);
		}
		for (const [x, z] of [[-0.24, 0.1], [0.25, 0.08]]) cypress(k, x, z, 0.9);
	},
};

// [yapı, boylam, enlem, ölçek, dönüş, il kimliği (plaka), merkezden en az uzaklık]
const SITES = [
	['galata', 28.93, 41.12, 2.0, 0, 34],
	['ayasofya', 28.78, 41.03, 2.0, 0.1, 34],
	['kizkulesi', 29.004, 41.021, 1.05, 0, 34, 0, 'sea'],
	['kopru', 29.036, 41.052, 1.4, 0.15, 34, 0, 'sea'],
	['anitkabir', 32.84, 39.93, 2.45, 0, 6],
	['peri', 34.83, 38.64, 2.25, 0, 50],
	['nemrut', 38.74, 37.98, 2.3, 0, 2],
	['pamukkale', 29.12, 37.92, 2.25, 0, 20],
	['sumela', 39.66, 40.69, 2.0, 0, 61],
	['uzungol', 40.29, 40.62, 1.6, 0, 61],
	['celsus', 27.34, 37.94, 2.2, 0, 35],
	['saatkulesi', 27.13, 38.42, 1.54, 0, 35],
	['mevlana', 32.5, 37.87, 2.2, 0, 42],
	['selimiye', 26.56, 41.68, 2.1, 0, 22],
	['ishakpasa', 44.13, 39.52, 2.05, 0, 4],
	['safranbolu', 32.69, 41.25, 2.0, 0, 78],
	['gobekli', 38.92, 37.22, 1.89, 0, 63],
	['truva', 26.24, 39.96, 1.89, -0.3, 17],
	['aspendos', 31.17, 36.94, 1.82, 0, 7],
	['vankalesi', 43.34, 38.5, 1.82, 0.2, 65, 0, 'shore'],
	['kizkalesi', 34.15, 36.43, 1.54, 0, 33, 0, 'sea'],
	['bodrum', 27.43, 37.04, 1.61, 0, 48],
	['ciftemin', 41.28, 39.9, 1.82, 0, 25],
];

const lonlat = (board, lon, lat) => {
	const m = board.data.meta;
	const c = Math.cos((m.lat0 * Math.PI) / 180);
	return [(lon - m.lon0) * c * m.K, -(lat - m.lat0) * m.K];
};

/** Arazinin aşağı yukarı rengi (doğrusal): avlunun dış halkası buna karışır (harita shader'ının paleti). */
function groundTone(rel, x, z) {
	const y = -z;
	const gr = rel.bil(rel.Gr, x, y);
	const fo = rel.bil(rel.F, x, y);
	const e = rel.elev(x, y);
	const dry = new THREE.Color('#c9b089');
	const mid = new THREE.Color('#84a956');
	const lush = new THREE.Color('#4b973f');
	const c = gr < 0.5 ? dry.lerp(mid, smooth01(0.18, 0.5, gr)) : mid.lerp(lush, smooth01(0.5, 0.85, gr));
	c.lerp(new THREE.Color('#858c62'), smooth01(1500, 2500, e) * 0.6);
	c.lerp(new THREE.Color('#2e6232'), smooth01(0.2, 0.65, fo) * 0.85);
	return c;
}

export class Landmarks {
	constructor(G, tier, board) {
		const kit = new LKit();
		kit.seg = tier.id === 0 ? 0.7 : 1;
		const rel = board.relief;
		// harita ağıyla aynı ızgarada çift doğrusal yükseklik: serilen avlu ağın içine gömülmez, üstünde süzülmez
		const st = tier.id === 0 ? 0.5 : tier.id === 1 ? 0.4 : 0.33;
		kit.hf = (x, z) => {
			const y = -z;
			const gx = Math.floor(x / st);
			const gy = Math.floor(y / st);
			const fx = x / st - gx;
			const fy = y / st - gy;
			const h = (i, j) => rel.height((gx + i) * st, (gy + j) * st);
			const a = h(0, 0) + (h(1, 0) - h(0, 0)) * fx;
			const b = h(0, 1) + (h(1, 1) - h(0, 1)) * fx;
			return a + (b - a) * fy;
		};
		const water = (x, z) => board.pick(x, z) < 0 || rel.bil(rel.La, x, -z) > 0.05;
		let s = 7;
		const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		this.sites = [];
		const ranges = [];
		for (const [kind, lon, lat, sc, ry, plate, , where] of SITES) {
			const p = board.byId.get(plate);
			if (!p) continue;
			let [x, z] = lonlat(board, lon, lat);
			if (where !== 'sea') {
				// il merkezine (kale + yazı) çok yakınsa uzaklaştır
				const minD = Math.max(1.9, sc * 0.95);
				const dx = x - p.x;
				const dz = z - p.z;
				const d = Math.hypot(dx, dz);
				if (d < minD) {
					const a = d > 1e-3 ? Math.atan2(dz, dx) : 0;
					let ok = false;
					for (let t = 0; t < 12 && !ok; t++) {
						const aa = a + (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.5;
						const nx = p.x + Math.cos(aa) * minD;
						const nz = p.z + Math.sin(aa) * minD;
						if (board.pick(nx, nz) === p.index) {
							x = nx;
							z = nz;
							ok = true;
						}
					}
				}
				// avlu denize ya da göle taşıyorsa karaya doğru çek (Ayasofya kıyıda havada kalıyordu)
				// ve başka bir yapının avlusuna binerse (İstanbul: Galata ile Ayasofya üst üsteydi) ondan uzaklaş
				const rad = sc * 0.6;
				for (let it = 0; it < 24; it++) {
					let wx = 0;
					let wz = 0;
					for (let i = 0; i < 12; i++) {
						const a = (i / 12) * Math.PI * 2;
						if (where !== 'shore' && water(x + Math.cos(a) * rad, z + Math.sin(a) * rad)) {
							wx += Math.cos(a);
							wz += Math.sin(a);
						}
					}
					for (const o of this.sites) {
						if (o.sea) continue;
						const dx = x - o.x;
						const dz = z - o.z;
						const d = Math.hypot(dx, dz);
						if (d < (o.r + sc * 0.72) * 0.92) {
							wx -= (dx / (d || 1)) * 3;
							wz -= (dz / (d || 1)) * 3;
						}
					}
					if (!wx && !wz) break;
					const l = Math.hypot(wx, wz) || 1;
					const nx = x - (wx / l) * 0.12;
					const nz = z - (wz / l) * 0.12;
					if (board.pick(nx, nz) !== p.index) break;
					x = nx;
					z = nz;
				}
			}
			const y = where === 'sea' ? 0.0 : kit.hf(x, z);
			kit.site = { x, y, z, s: sc, ry };
			kit.tone = groundTone(rel, x, z);
			kit.setTag(p.index);
			kit.base(y, 1 / sc);
			const v0 = kit.count;
			kit.push().move(x, y, z).rot(0, ry, 0).scale(sc);
			B[kind](kit, R);
			kit.pop();
			ranges.push([v0, kit.count, x, y, z, sc]);
			this.sites.push({ kind, index: p.index, x, y, z, r: where === 'sea' ? 0.6 : sc * 0.72, sea: where === 'sea' });
		}
		kit.setTag(0);
		const geo = kit.build();
		if (!geo.getAttribute('mat')) geo.setAttribute('mat', new THREE.Float32BufferAttribute(new Float32Array(kit.count * 2), 2));
		// yapı başına merkez ve ölçek (kaybolma animasyonu)
		const site = new Float32Array(kit.count * 4);
		for (const [a, b, x, y, z, sc] of ranges) for (let i = a; i < b; i++) site.set([x, y, z, sc], i * 4);
		geo.setAttribute('site', new THREE.BufferAttribute(site, 4));
		this.count = this.sites.length;
		this.triangles = kit.count / 3;
		const taps = String(tier.shadowTaps);
		this.uFade = { value: new THREE.Vector3(-10, 1, 0.45) };
		this.G = G;
		const uniforms = { ...G, uState: { value: board.stateTex }, uSelOn: board.uSelOn, uPLift: { value: board.liftUnit }, uPSel: { value: board.selLiftUnit }, uFade: this.uFade };
		this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps), uniforms, side: THREE.DoubleSide }));
		this.mesh.frustumCulled = false;
		this.mesh.matrixAutoUpdate = false;
		this.caster = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms, side: THREE.DoubleSide }));
		this.caster.frustumCulled = false;
		this.caster.matrixAutoUpdate = false;
		// kaybolma bitince çizim yok (kare başına iş yok: yalnızca çizilirken bakılır)
		this.mesh.onBeforeRender = () => {
			const f = this.uFade.value;
			if (f.y < 0.5 && this.G.uTime.value - f.x > f.z * 1.1) this.mesh.visible = this.caster.visible = false;
		};
	}

	/**
	 * Harita sorularında (X nerede?) yapılar ipucu vermesin: false → ~0,45 sn'de toprağa gömülür ve
	 * çizilmez; true → aynı yoldan geri çıkar.
	 */
	fade(on) {
		const f = this.uFade.value;
		const now = this.G.uTime.value;
		const want = on ? 1 : 0;
		if (f.y === want) {
			if (on) this.mesh.visible = this.caster.visible = true;
			return;
		}
		// yarıda tersine dönerse kaldığı yerden sürsün
		const p = Math.min(1, Math.max(0, (now - f.x) / f.z));
		f.x = now - (1 - p) * f.z;
		f.y = want;
		this.mesh.visible = this.caster.visible = true;
	}
}
