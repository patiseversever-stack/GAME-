// Savaş filmi: iki ordu (saldıran ve savunan) saf düzeninde, kuşatma makineleri (mancınık ve karşı
// ağırlıklı mancınık) ve gölgeleri. Sinema (cinema.js) sahne planını (stage.js) verir: ordular planlanan
// yerde belirir, saldıran sınıra yürür, savunan safını kurar, okçular atar, ön saflar çarpışır; sonuca
// göre hücum ve bozgun, geri çekilme, sevinç.
//
// Çizim: 3 örneklenmiş çağrı (yaya, atlı, makine) + aynı tamponları kullanan 3 gölge çağrısı; yalnızca
// savaş sürerken görünür (boşta hiç çağrı yok). Yayanın türleri (mızraklı, sancaktar, okçu) ve atlının
// türleri (sancaklı komutan, süvari) tek geometride; köşe shader'ı türe göre parça gizler. Yürüyüş ve
// dörtnal, mızrak indirip dürtme, yay germe, sevinç, devrilme ve mancınık kolu köşe shader'ında: CPU
// örnek başına yalnızca konum, yön ve 8 sayı yazar.
//
// Birimler çizilen arazi yüzeyine oturur (board.groundAt + ilin yükselmesi): dağlık ilde gömülmez,
// havada kalmaz. Havuzlar sabit boyutlu; kare başına nesne üretilmez (geçici değerler önceden ayrılmış).

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH } from './shaderlib.js';
import { Kit } from './kit.js';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const rnd = Math.random;
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrapPi = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

// türler (iVar.z)
export const SPEAR = 0;
export const BANNER = 1;
export const ARCHER = 2;
export const LORD = 3; // atlı, sancaklı komutan
export const RIDER = 4; // atlı süvari
export const CATAPULT = 0;
export const TREBUCHET = 1;

// birim kipleri
const SLOT = 0; // ordunun çapasını saf yerinden izler
const FREE = 1; // kendi hızıyla koşar (hücum, bozgun, geri çekilme)
const STILL = 2; // yerinde (düşen)

const FOOT_SCALE = 1.25;
const MACH_SCALE = [1.5, 1.55];

// ------------------------------------------------------------------ shader

const UNIT_VS = /* glsl */ `
${COMMON}
attribute vec3 color;
attribute float tag;
attribute float anim;
attribute vec4 iVar; // x evre, y yürüyüş (0..1), z tür, w görünürlük
attribute vec4 iAct; // x mızrak indirme ve dürtme, y devrilme, z sevinç, w yay germe ya da makine kolu açısı
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec3 vOwn;
varying float vFade;
varying float vH;
vec3 rotX(vec3 p, vec3 o, float a) {
	vec3 l = p - o;
	float c = cos(a);
	float s = sin(a);
	return o + vec3(l.x, c * l.y - s * l.z, s * l.y + c * l.z);
}
vec3 nrmX(vec3 n, float a) {
	float c = cos(a);
	float s = sin(a);
	return vec3(n.x, c * n.y - s * n.z, s * n.y + c * n.z);
}
bool is(float x, float v) { return abs(x - v) < 0.5; }
void main() {
	vec3 p = position;
	vec3 n = normal;
	float ph = iVar.x;
	float walk = iVar.y;
	float kind = iVar.z;
	float t = uTime;
	bool hide = false;
	vH = position.y;
	if (tag < 19.5) {
		// ---- asker ve atlı
		bool cav = kind > 2.5;
		bool archer = is(kind, 2.0);
		float cyc = t * 11.0 + ph;
		if (tag > 0.5 && tag < 2.5) {
			// bacaklar: kalçadan salınır
			float a = sin(cyc) * (tag < 1.5 ? 1.0 : -1.0) * 0.55 * walk;
			p = rotX(p, vec3(0.0, 0.13, 0.0), a);
			n = nrmX(n, a);
		} else if (is(tag, 3.0)) {
			// sancak: yalnızca sancaktar ve komutan
			if (!(is(kind, 1.0) || is(kind, 3.0))) hide = true;
		} else if (is(tag, 4.0)) {
			if (archer) hide = true;
			// mızrak kolu: savaşta öne indirilir ve dürtülür; sevinçte havaya kalkar
			float a = iAct.x * 1.25 - iAct.z * 0.3;
			p = rotX(p, vec3(0.06, 0.2, 0.0), a);
			n = nrmX(n, a);
			p.z += max(0.0, sin(t * 7.0 + ph * 3.0)) * 0.05 * iAct.x;
			p.y += iAct.z * (0.05 + 0.03 * sin(t * 13.0 + ph));
		} else if (is(tag, 5.0)) {
			if (archer) hide = true;
		} else if (is(tag, 6.0) || is(tag, 7.0)) {
			if (!archer) hide = true;
			// yay kolu: atışta yukarı kalkar (yüksek açılı yaylım)
			if (is(tag, 6.0)) {
				float a = -iAct.w * 0.8;
				p = rotX(p, vec3(-0.06, 0.235, 0.0), a);
				n = nrmX(n, a);
			}
		} else if (tag > 8.5 && tag < 10.5) {
			// at bacakları: dörtnal (ön ve arka çift ayrı evrede)
			float a = sin(t * 13.0 + ph + (tag < 9.5 ? 0.0 : 2.4)) * 0.62 * walk;
			p = rotX(p, vec3(0.0, 0.17, tag < 9.5 ? 0.1 : -0.11), a);
			n = nrmX(n, a);
		} else if (is(tag, 12.0)) {
			// boyun ve baş: dörtnalda sallanır
			float a = sin(t * 13.0 + ph + 1.2) * 0.14 * walk;
			p = rotX(p, vec3(0.0, 0.21, 0.14), a);
			n = nrmX(n, a);
		}
		// binici eyerde
		if (cav && tag < 7.5) p += vec3(0.0, 0.135, -0.012);
		if (kind > 3.5 && is(tag, 3.0)) hide = true; // süvaride sancak yok
		// yürürken gövde hoplar, at dörtnalda iner kalkar
		p.y += abs(sin(cav ? t * 6.5 + ph : cyc)) * (cav ? 0.024 : 0.016) * walk;
		// devrilme: ayak çizgisinde arkaya
		if (iAct.y > 0.0) {
			float a = -iAct.y * 1.42;
			p = rotX(p, vec3(0.0), a);
			n = nrmX(n, a);
		}
	} else if (tag < 29.5) {
		// ---- makine: 20 mancınık gövdesi, 21 mancınık kolu, 22 karşı ağırlıklı gövde, 23 kolu, 24 ağırlık sandığı
		bool treb = kind > 0.5;
		if ((tag < 21.5) == treb) hide = true;
		if (is(tag, 21.0)) {
			p = rotX(p, vec3(0.0, 0.12, -0.04), iAct.w);
			n = nrmX(n, iAct.w);
		} else if (is(tag, 23.0)) {
			p = rotX(p, vec3(0.0, 0.62, 0.0), iAct.w);
			n = nrmX(n, iAct.w);
		} else if (is(tag, 24.0)) {
			// sandık kolun kısa ucundan sarkar: dönmez, asılma noktasıyla taşınır
			vec3 h = vec3(0.0, 0.62, 0.21);
			p += rotX(h, vec3(0.0, 0.62, 0.0), iAct.w) - h;
		}
	}
	if (anim > 0.0) {
		// bez dalgalanır (direkten uzaklaştıkça), yürürken daha çok
		float a = anim * (0.6 + 0.4 * walk);
		p.x += sin(p.z * 9.0 - t * 9.0 + ph) * 0.05 * a;
		p.y += sin(p.z * 6.0 - t * 6.0 + ph) * 0.012 * a;
	}
	if (hide) p = vec3(0.0, -0.5, 0.0);
	vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
	vC = color;
	vOwn = instanceColor;
	vFade = iVar.w;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const UNIT_FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec3 vOwn;
varying float vFade;
varying float vH;
void main() {
	// eriyerek belir ve kaybol: ekran kapısı (opak kalır, sıralama gerekmez)
	if (hash12(gl_FragCoord.xy) > vFade) discard;
	vec3 N = normalize(vN);
	if (!gl_FrontFacing) N = -N;
	vec3 alb = vC;
	float gloss = 0.14;
	if (vC.r < -0.5) {
		// sahip rengi (g: parlaklık): kaftan, kalkan, örtü, flama
		alb = vOwn * vC.g;
		gloss = 0.32;
		gOwn = 1.0;
	}
	vec3 V = normalize(cameraPosition - vW);
	// gölge: yakın çekimde kendi gölgesi kirlenmesin (hafifletilmiş)
	float sh = mix(1.0, shadowAt(vW, N), 0.85);
	float ao = mix(0.62, 1.0, smoothstep(0.0, 0.14, vH));
	gLit = 0.88; // savaş sahnenin odağı: gecede de gündüz ışığında okunur
	vec3 c = shade(alb, N, V, ao, sh, gloss, 0.6);
	// siluet kenarı koyulaşır: minyatür asker parlak il zemininden ayrışır (çizgi film kontur hissi)
	c *= mix(1.0, 0.58, pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2));
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_FS = /* glsl */ `
${COMMON}
varying float vFade;
void main() {
	if (hash12(gl_FragCoord.xy) > vFade) discard;
	gl_FragColor = vec4(1.0);
}`;

// ------------------------------------------------------------------ geometri

const OWN = (k, m = 1) => k.raw(-1, m, 0);
const SKIN = '#e8b48c';
const WOOD = '#8a5a32';
const DWOOD = '#5e3c20';
const ROPE = '#b89a6a';
const IRON = '#55565c';
const GOLD = '#e8b64a';

/** Bez: x = x0 düzleminde, z0'dan -z yönüne W uzunluğunda (anim = direkten uzaklık oranı). */
function cloth(k, W, H, x0, y0, z0, segs) {
	const pos = [];
	for (let i = 0; i < segs; i++) {
		const za = z0 - (i / segs) * W;
		const zb = z0 - ((i + 1) / segs) * W;
		pos.push(x0, y0 - H, za, x0, y0 - H, zb, x0, y0, zb, x0, y0 - H, za, x0, y0, zb, x0, y0, za);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	const start = k.count;
	k.add(g);
	for (let i = 0; i < pos.length / 3; i++) k.anim[start + i] = Math.max(0.001, (z0 - pos[i * 3 + 2]) / W);
}

/** Üst gövde (0), mızrak kolu (4), kalkan (5), sancak (3): yaya ve binici ortak. */
function upperBody(k) {
	// gövde: sahip renginin koyu tonunda kaftan (kendi renginde ilin üstünde de seçilsin), altın kuşak,
	// omuzlar, baş, sarıklı sivri miğfer; kalkan ve sancak parlak sahip renginde (kim kimdir uzaktan okunur)
	k.setTag(0);
	OWN(k, 0.58).cyl(0.046, 0.07, 0.165, 6, 0, 0.09, 0, true); // kapakları omuz ve kuşakla örtülü: açık silindir
	k.color(GOLD).cyl(0.054, 0.056, 0.022, 6, 0, 0.165, 0, true);
	OWN(k, 0.46).cyl(0.03, 0.052, 0.045, 6, 0, 0.245, 0);
	k.color(SKIN).ico(0.036, 0, 0.312, 0);
	k.color('#f3eee2').cyl(0.04, 0.041, 0.024, 6, 0, 0.31, 0, true);
	k.color('#cfd6de').cone(0.031, 0.075, 6, 0, 0.332, 0);
	// mızrak kolu: omuzdan iner ve dürter
	k.setTag(4);
	OWN(k, 0.5).box(0.028, 0.1, 0.032, 0.062, 0.16, 0.012);
	k.color(SKIN).box(0.026, 0.026, 0.028, 0.066, 0.135, 0.022);
	k.color('#7a5634').cyl(0.0068, 0.0068, 0.52, 3, 0.068, -0.03, 0.025, true);
	k.color('#e8eef4').cone(0.016, 0.06, 4, 0.068, 0.49, 0.025);
	// kalkan: sol önde, hafif dışa dönük; sahip renginde, altın kenar ve umbo
	k.setTag(5);
	OWN(k, 0.5).box(0.026, 0.1, 0.03, -0.062, 0.16, 0.0);
	k.push().move(-0.058, 0.175, 0.052).rot(0, -0.55, 0).rot(Math.PI / 2, 0, 0);
	k.color('#f4e3b0').cyl(0.067, 0.067, 0.008, 8, 0, -0.012, 0, true);
	OWN(k, 1.1).cyl(0.059, 0.059, 0.014, 8, 0, -0.006, 0);
	k.color('#f2c14e').cone(0.018, 0.02, 4, 0, 0.008, 0);
	k.pop();
	// sancak: sırttan yükselen direk ve bez (yalnızca sancaktar ve komutan)
	k.setTag(3);
	k.color('#6b4a2e').cyl(0.0075, 0.0075, 0.68, 3, -0.02, 0.04, -0.05, true);
	k.color('#f2c14e').cone(0.018, 0.05, 4, -0.02, 0.72, -0.05);
	OWN(k, 1.05);
	cloth(k, 0.22, 0.14, -0.02, 0.7, -0.05, 5);
	k.color('#fff6e0');
	cloth(k, 0.22, 0.022, -0.018, 0.59, -0.05, 5);
}

function infantryGeo(lo) {
	const k = new Kit();
	k.seg = lo ? 0.75 : 1;
	// bacaklar (1 sol, 2 sağ): şalvar ve çizme
	for (const [t, x] of [[1, -0.026], [2, 0.026]]) {
		k.setTag(t);
		k.color('#3a2a1f').box(0.034, 0.11, 0.04, x, 0.025, 0);
		k.color('#1e140d').box(0.038, 0.03, 0.054, x, 0, 0.006);
	}
	upperBody(k);
	// okçu (6 yay kolu, 7 sadak)
	k.setTag(6);
	OWN(k, 0.5).box(0.026, 0.028, 0.11, -0.06, 0.222, 0.05);
	const r = 0.1;
	const arc = 2.3;
	const bow = new THREE.TorusGeometry(r, 0.0065, 3, 5, arc).rotateZ(-arc / 2).rotateY(-Math.PI / 2);
	k.push().move(-0.062, 0.236, 0.125 - r);
	k.color('#5b3a1f').add(bow);
	k.pop();
	k.color('#f4efe2').box(0.003, 0.18, 0.003, -0.062, 0.236 - 0.09, 0.125 - r + r * Math.cos(arc / 2));
	k.setTag(7);
	k.push().move(0.035, 0.12, -0.06).rot(-0.32, 0, 0.2);
	k.color('#6b4a2e').cyl(0.018, 0.015, 0.13, 5, 0, 0, 0, true);
	k.color('#f4efe2').box(0.03, 0.03, 0.022, 0, 0.13, 0);
	k.pop();
	return k.build();
}

function cavalryGeo(lo) {
	const k = new Kit();
	k.seg = lo ? 0.75 : 1;
	const coat = '#6e4a2f';
	const dark = '#2e2017';
	// at gövdesi (8): fıçı gövde, göğüs ve sağrı, sahip renginde örtü, eyer, kuyruk
	k.setTag(8);
	k.color(coat).box(0.1, 0.1, 0.27, 0, 0.165, -0.005);
	k.color(coat).sphere(0.062, 6, 0, 0.215, 0.12, 0.95);
	k.color(coat).sphere(0.064, 6, 0, 0.215, -0.13, 0.95);
	OWN(k, 1).box(0.114, 0.072, 0.2, 0, 0.19, -0.01);
	k.color(GOLD).box(0.116, 0.014, 0.202, 0, 0.19, -0.01);
	k.color('#3a2416').box(0.08, 0.022, 0.085, 0, 0.262, -0.015);
	k.push().move(0, 0.25, -0.18).rot(-0.55, 0, 0);
	k.color(dark).box(0.026, 0.14, 0.03, 0, -0.14, 0);
	k.pop();
	// boyun, yele ve baş (12)
	k.setTag(12);
	k.push().move(0, 0.2, 0.14).rot(0.55, 0, 0);
	k.color(coat).box(0.055, 0.17, 0.07, 0, 0, 0);
	k.color(dark).box(0.02, 0.15, 0.03, 0, 0.03, -0.035);
	k.pop();
	k.push().move(0, 0.345, 0.232).rot(1.45, 0, 0);
	k.color(coat).box(0.05, 0.13, 0.06, 0, -0.03, 0);
	k.pop();
	k.color(dark).box(0.012, 0.03, 0.012, -0.015, 0.375, 0.2).box(0.012, 0.03, 0.012, 0.015, 0.375, 0.2);
	// bacaklar (9 ön, 10 arka)
	for (const [t, z] of [[9, 0.1], [10, -0.11]]) {
		k.setTag(t);
		for (const x of [-0.034, 0.034]) {
			k.color('#5b3c26').box(0.026, 0.15, 0.03, x, 0.02, z);
			k.color(dark).box(0.03, 0.024, 0.034, x, 0, z);
		}
	}
	// binici bacakları (11): eyerin iki yanında
	k.setTag(11);
	for (const s of [-1, 1]) {
		k.push().move(s * 0.058, 0.26, 0.0).rot(0.35, 0, s * 0.3);
		k.color('#3a2a1f').box(0.03, 0.12, 0.036, 0, -0.12, 0);
		k.color('#1e140d').box(0.034, 0.03, 0.048, 0, -0.13, 0.006);
		k.pop();
	}
	// binici (shader eyere kaldırır)
	upperBody(k);
	return k.build();
}

function machineGeo(lo) {
	const k = new Kit();
	k.seg = lo ? 0.75 : 1;
	// ---- mancınık (20 gövde, 21 kol): kızaklı, dört tekerli, burulmalı; kol mil çevresinde fırlar
	k.setTag(20);
	k.color(DWOOD).box(0.05, 0.05, 0.66, -0.14, 0.05, 0).box(0.05, 0.05, 0.66, 0.14, 0.05, 0);
	k.color(WOOD).box(0.33, 0.04, 0.05, 0, 0.07, 0.27).box(0.33, 0.04, 0.05, 0, 0.07, -0.27).box(0.33, 0.04, 0.05, 0, 0.07, 0.02);
	for (const [x, z] of [[-0.185, 0.21], [0.185, 0.21], [-0.185, -0.21], [0.185, -0.21]]) {
		k.push().move(x, 0.076, z).rot(0, 0, Math.PI / 2);
		k.color(DWOOD).cyl(0.076, 0.076, 0.028, 8, 0, -0.014, 0);
		k.color(IRON).cyl(0.022, 0.022, 0.036, 5, 0, -0.018, 0);
		k.pop();
	}
	k.color(WOOD).box(0.045, 0.27, 0.045, -0.12, 0.08, 0.1).box(0.045, 0.27, 0.045, 0.12, 0.08, 0.1);
	k.color(DWOOD).box(0.3, 0.045, 0.055, 0, 0.33, 0.1);
	k.color(ROPE).box(0.2, 0.035, 0.07, 0, 0.36, 0.1);
	k.push().move(0, 0.12, -0.04).rot(0, 0, Math.PI / 2);
	k.color(ROPE).cyl(0.036, 0.036, 0.27, 6, 0, -0.135, 0);
	k.pop();
	k.color(DWOOD).cyl(0.006, 0.006, 0.38, 3, 0.15, 0.08, 0.3);
	OWN(k, 1);
	cloth(k, 0.14, 0.085, 0.15, 0.45, 0.3, 3);
	k.setTag(21);
	k.color(WOOD).box(0.042, 0.042, 0.5, 0, 0.1, -0.29);
	k.color(DWOOD).box(0.1, 0.035, 0.1, 0, 0.11, -0.52);
	k.color('#9e9e96').ico(0.044, 0, 0.165, -0.52);
	// ---- karşı ağırlıklı mancınık (22 gövde, 23 kol, 24 sandık): iki A çatkı, 0,62 yükseklikte mil
	k.setTag(22);
	k.color(DWOOD).box(0.05, 0.05, 0.86, -0.17, 0.0, 0).box(0.05, 0.05, 0.86, 0.17, 0.0, 0);
	k.color(WOOD).box(0.39, 0.045, 0.05, 0, 0.02, 0.37).box(0.39, 0.045, 0.05, 0, 0.02, -0.37).box(0.39, 0.045, 0.05, 0, 0.02, 0.0);
	for (const x of [-0.17, 0.17]) {
		for (const s of [-1, 1]) {
			k.push().move(x, 0.035, s * 0.27).rot(-s * 0.43, 0, 0);
			k.color(WOOD).box(0.042, 0.64, 0.042, 0, 0, 0);
			k.pop();
		}
		k.color(DWOOD).box(0.04, 0.04, 0.34, x, 0.3, 0);
	}
	k.push().move(0, 0.62, 0).rot(0, 0, Math.PI / 2);
	k.color(IRON).cyl(0.024, 0.024, 0.44, 6, 0, -0.22, 0);
	k.pop();
	k.color(DWOOD).cyl(0.006, 0.006, 0.34, 3, 0.19, 0.6, 0.0);
	OWN(k, 1);
	cloth(k, 0.15, 0.09, 0.19, 0.93, 0.0, 3);
	k.setTag(23);
	k.color(WOOD).box(0.046, 0.046, 0.86, 0, 0.597, -0.2);
	k.color(IRON).box(0.054, 0.054, 0.034, 0, 0.594, 0.21);
	k.color(ROPE).box(0.065, 0.032, 0.07, 0, 0.565, -0.62);
	k.color('#9e9e96').ico(0.045, 0, 0.6, -0.62);
	k.setTag(24);
	k.color(IRON).box(0.012, 0.13, 0.012, 0, 0.49, 0.21);
	OWN(k, 0.7).box(0.17, 0.15, 0.13, 0, 0.35, 0.21);
	k.color(GOLD).box(0.176, 0.02, 0.136, 0, 0.46, 0.21).box(0.176, 0.02, 0.136, 0, 0.38, 0.21);
	return k.build();
}

// ------------------------------------------------------------------ kayıtlar

function unitRec(cav) {
	return {
		on: false,
		cav,
		side: 0,
		kind: SPEAR,
		lat: 0,
		dep: 0,
		rank: 0,
		front: false,
		x: 0,
		z: 0,
		y: 0,
		yaw: 0,
		mode: SLOT,
		vx: 0,
		vz: 0,
		run: 0,
		wait: 0,
		delay: 0,
		adv: 0,
		advTo: 0,
		walk: 0,
		thrust: 0,
		thrustTo: 0,
		fall: 0,
		fallTo: 0,
		cheer: 0,
		cheerTo: 0,
		draw: 0,
		drawTo: 0,
		fade: 0,
		fadeTo: 1, // -1: henüz belirmedi (silinmez), 0: eriyip kaybolur
		fadeK: 2.5,
		late: 0, // > 0: bu kadar sn sonra erimeye başlar
		ph: rnd() * 6.28,
		// zemin önbelleği (yalnızca yer değişince yeniden ölçülür)
		gx: 1e9,
		gz: 0,
		gy: 0,
		pi: -1,
		px: 1e9,
		pz: 0,
		yFix: NaN,
		// surdaki okçu: sabit yer, yükseklik kaleden (kale ille birlikte kalkar)
		fix: false,
		fx: 0,
		fz: 0,
		cas: null,
		rel: 0,
	};
}

function armyRec(side) {
	return {
		side,
		on: false,
		color: new THREE.Color(),
		ux: 0,
		uz: 1,
		vx: 1,
		vz: 0,
		yaw: 0,
		sx: 0,
		sz: 0,
		ex: 0,
		ez: 0,
		t: 0,
		dur: 0,
		go: false, // yürüyüş başladı mı (başlamadıysa çapa başta)
		maxDelay: 0,
		dc: 0, // ön saftan ordunun ortasına (derinlik yarısı)
	};
}

/** Yamuk hız profili: hızlanır, düz yürür, yavaşlar (orta yerde fırlamaz). */
function trap(t, a = 0.22) {
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	const v = 1 / (1 - a);
	if (t < a) return (v * t * t) / (2 * a);
	if (t > 1 - a) return 1 - (v * (1 - t) * (1 - t)) / (2 * a);
	return v * (t - a / 2);
}

// ------------------------------------------------------------------ savaş

export class Battle {
	/**
	 * @param G ortak uniform'lar
	 * @param tier kalite kademesi
	 * @param app board (zemin), sfx
	 * @param fx parçacık, ok, taş efektleri (FX)
	 */
	constructor(G, tier, app, fx) {
		this.G = G;
		this.app = app;
		this.fx = fx;
		this.tier = tier;
		const lo = tier.id === 0;
		this.lo = lo;
		this.group = new THREE.Group();
		this.group.name = 'battle';
		const taps = String(tier.shadowTaps);
		this.mat = new THREE.ShaderMaterial({ vertexShader: UNIT_VS, fragmentShader: UNIT_FS.replace('__TAPS__', taps), uniforms: { ...G }, side: THREE.DoubleSide });
		this.dmat = new THREE.ShaderMaterial({ vertexShader: UNIT_VS, fragmentShader: DEPTH_FS, uniforms: { ...G }, side: THREE.DoubleSide });
		this.maxFoot = lo ? 40 : 72;
		this.maxCav = lo ? 2 : 6;
		this.foot = this._mesh(infantryGeo(lo), this.maxFoot);
		this.horse = this._mesh(cavalryGeo(lo), this.maxCav);
		this.mach = this._mesh(machineGeo(lo), 4);
		this.meshes = [this.foot, this.horse, this.mach];
		this.casters = this.meshes.map((m) => m.caster);
		this.units = [...Array.from({ length: this.maxFoot }, () => unitRec(false)), ...Array.from({ length: this.maxCav }, () => unitRec(true))];
		this.machines = Array.from({ length: 4 }, () => ({ on: false, kind: CATAPULT, lat: 0, dep: 0, x: 0, z: 0, y: 0, yaw: 0, arm: 0, fire: -1, fade: 0, fadeTo: 1, target: new THREE.Vector3(), onHit: null, shot: false, T: 1, pi: -1, px: 1e9, pz: 0 }));
		this.armies = [armyRec(0), armyRec(1)];
		this.tl = Array.from({ length: 32 }, () => ({ on: false, t: 0, fn: null }));
		this.time = 0;
		this.clash = 0; // çarpışma süresi (sn, > 0 iken kıvılcım ve toz)
		this.clashLine = { x: 0, z: 0, w: 1, y: 0 };
		this._acc = 0;
		this._dust = 0;
		this.clearTo = 0; // savaş alanı açıklığı (ağaçlar alçalır)
		// ordu ortaları (kamera izler; her karede güncellenir)
		this.focus = [new THREE.Vector3(), new THREE.Vector3()];
		this.lineY = 0;
		this.warm(true);
	}

	_mesh(geo, n) {
		const iv = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
		const ia = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
		iv.array[3] = 1; // ısınma çiziminde görünür
		geo.setAttribute('iVar', iv);
		geo.setAttribute('iAct', ia);
		const m = new THREE.InstancedMesh(geo, this.mat, n);
		m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		m.setColorAt(0, new THREE.Color(1, 1, 1));
		m.instanceColor.setUsage(THREE.DynamicDrawUsage);
		m.frustumCulled = false;
		m.count = 1;
		m.iVar = iv;
		m.iAct = ia;
		this.group.add(m);
		// gölge kopyası: aynı geometri ve örnek tamponları, yalnızca derinlik; görünürlük ve sayı ana örneği izler
		const c = new THREE.InstancedMesh(geo, this.dmat, n);
		c.instanceMatrix = m.instanceMatrix;
		c.instanceColor = m.instanceColor;
		c.frustumCulled = false;
		c.matrixAutoUpdate = false;
		c.count = 1;
		Object.defineProperty(c, 'visible', { get: () => m.visible, set: () => {} });
		m.caster = c;
		return m;
	}

	/** Açılış derlemesi için çizimler görünür (ilk karede kendiliğinden kapanır). */
	warm(on) {
		for (const m of this.meshes) {
			m.visible = on;
			if (on) m.count = m.caster.count = 1;
		}
		this._warm = on;
	}

	get calls() {
		let n = 0;
		for (const m of this.meshes) if (m.visible) n++;
		return n;
	}

	get on() {
		return this.armies[0].on || this.armies[1].on;
	}

	/** Her şeyi sil. */
	clear() {
		for (const u of this.units) u.on = false;
		for (const m of this.machines) m.on = false;
		for (const a of this.armies) a.on = false;
		for (const e of this.tl) {
			e.on = false;
			e.fn = null;
		}
		this.clash = 0;
		this.clearTo = 0;
		this.G.uClearR.value.y = 0;
	}

	// ============================================================ zaman çizelgesi

	/** t sn sonra fn (dokunarak atlansa da çalışır: skip() bekleyenleri sırayla hemen çalıştırır). */
	cue(t, fn) {
		const e = this.tl.find((x) => !x.on);
		if (!e) return fn();
		e.on = true;
		e.t = t;
		e.fn = fn;
	}

	/** Bekleyen bütün adımları sırayla hemen çalıştır, birimleri hedeflerine yerleştir (dokunarak atlama). */
	skip() {
		for (;;) {
			let best = null;
			for (const e of this.tl) if (e.on && (!best || e.t < best.t)) best = e;
			if (!best) break;
			best.on = false;
			const fn = best.fn;
			best.fn = null;
			fn?.();
		}
		this.settle();
	}

	/** Yürüyüşleri bitir, geçişleri tamamla: birimler hedef yerinde ve hedef görünürlükte. */
	settle() {
		for (const A of this.armies) {
			if (!A.on || !A.go) continue;
			A.t = Math.max(A.t, A.dur + A.maxDelay + 0.01);
		}
		for (const u of this.units) {
			if (!u.on) continue;
			if (u.mode === SLOT) {
				const A = this.armies[u.side];
				u.adv = u.advTo;
				this._slot(u, A, A.t, _v);
				u.x = _v.x;
				u.z = _v.z;
				u.yaw = A.yaw;
				u.walk = 0;
			} else if (u.mode === FREE) {
				u.x += u.vx * u.run;
				u.z += u.vz * u.run;
				u.run = 0;
				u.wait = 0;
				u.walk = 0;
			}
			if (u.late > 0) {
				u.late = 0;
				u.fadeTo = 0;
			}
			u.fall = u.fallTo;
			u.thrust = u.thrustTo;
			u.draw = u.drawTo;
			u.cheer = u.cheerTo;
			u.fade = Math.max(0, u.fadeTo);
			if (u.fadeTo === 0) u.on = false;
		}
		for (const m of this.machines) {
			if (!m.on) continue;
			const A = this.armies[0];
			m.x = A.ex + A.vx * m.lat - A.ux * m.dep;
			m.z = A.ez + A.vz * m.lat - A.uz * m.dep;
			m.fade = Math.max(0, m.fadeTo);
			if (m.fadeTo === 0) m.on = false;
		}
		this.clash = 0;
		for (const A of this.armies) if (A.on && !this.units.some((u) => u.on && u.side === A.side)) A.on = false;
	}

	// ============================================================ kurulum

	/**
	 * Sahne planından ordular (stage.js planStage). Saldıran yürüyüş başında, savunan safının biraz
	 * gerisinde, ikisi de görünmez başlar; march() ve form() ile belirip yürürler.
	 */
	setup(plan, attColor, defColor) {
		this.clear();
		const [A, D] = this.armies;
		this._army(A, plan.att, attColor);
		this._army(D, plan.def, defColor);
		let fi = 0;
		let ci = this.maxFoot;
		for (const [army, spec] of [[A, plan.att], [D, plan.def]]) {
			for (const s of spec.slots) {
				const cav = s.kind === LORD || s.kind === RIDER;
				const idx = cav ? (ci < this.units.length ? ci++ : -1) : fi < this.maxFoot ? fi++ : -1;
				if (idx < 0) continue;
				const u = this.units[idx];
				u.on = true;
				u.side = army.side;
				u.kind = s.kind;
				u.lat = s.lat;
				u.dep = s.dep;
				u.rank = s.rank;
				u.front = s.rank === 0 && !cav && s.kind !== ARCHER;
				u.mode = SLOT;
				u.delay = s.rank * 0.07 + rnd() * 0.06;
				u.adv = u.advTo = 0;
				u.walk = 0;
				u.thrust = u.thrustTo = 0;
				u.fall = u.fallTo = 0;
				u.cheer = u.cheerTo = 0;
				u.draw = u.drawTo = 0;
				u.fade = 0;
				u.fadeTo = -1;
				u.fadeK = 2.6;
				u.late = 0;
				u.yFix = s.yFix ?? NaN;
				u.fix = !!s.fix;
				if (s.fix) {
					u.fx = s.fix.x;
					u.fz = s.fix.z;
					u.cas = s.fix.castle;
					u.rel = s.fix.rel;
				} else u.cas = null;
				u.gx = 1e9;
				u.px = 1e9;
				army.maxDelay = Math.max(army.maxDelay, u.delay);
				this._slot(u, army, 0, _v);
				u.x = _v.x;
				u.z = _v.z;
				u.yaw = army.yaw;
				u.y = this._ground(u);
			}
		}
		for (let k = 0; k < this.machines.length; k++) {
			const m = this.machines[k];
			const s = plan.machines[k];
			m.on = !!s;
			if (!s) continue;
			m.kind = s.kind;
			m.lat = s.lat;
			m.dep = s.dep;
			m.x = A.sx + A.vx * s.lat - A.ux * s.dep;
			m.z = A.sz + A.vz * s.lat - A.uz * s.dep;
			m.yaw = A.yaw;
			m.arm = m.kind === TREBUCHET ? -1 : 0;
			m.fire = -1;
			m.fade = 0;
			m.fadeTo = -1;
			m.onHit = null;
			m.px = 1e9;
		}
		// savaş alanı açıklığı (ağaçlar ve yapılar alçalır)
		const c = plan.clear;
		this.G.uClear.value.set(c[0], c[1], c[2], c[3]);
		this.G.uClearR.value.x = c[4];
		this.G.uClearR.value.z = 0.9;
		this.clearTo = 1;
		const L = this.clashLine;
		L.x = plan.line.x;
		L.z = plan.line.z;
		L.w = plan.line.w;
		L.y = plan.line.y;
		this.lineY = plan.line.y;
		this._focus(0);
	}

	/** Ordu ortalarını güncelle (kamera izleme noktası): çapa + derinlik yarısı, zemin yüksekliği. */
	_focus() {
		const b = this.app.board;
		for (const A of this.armies) {
			const f = this.focus[A.side];
			const e = !A.go ? 0 : A.dur > 0 ? trap(clamp(A.t / A.dur, 0, 1)) : 1;
			const x = A.sx + (A.ex - A.sx) * e - A.ux * A.dc;
			const z = A.sz + (A.ez - A.sz) * e - A.uz * A.dc;
			f.set(x, b.groundAt(x, z) + this.lineY, z);
		}
	}

	_army(A, spec, color) {
		A.on = true;
		A.color.set(color);
		A.ux = spec.ux;
		A.uz = spec.uz;
		A.vx = -spec.uz; // sağ yan (yüze göre)
		A.vz = spec.ux;
		A.yaw = Math.atan2(spec.ux, spec.uz);
		A.sx = spec.sx;
		A.sz = spec.sz;
		A.ex = spec.ex;
		A.ez = spec.ez;
		A.t = 0;
		A.dur = 0;
		A.go = false;
		A.maxDelay = 0;
		A.dc = (spec.D || 0) * 0.5;
	}

	/** Ordunun zaman tau'daki saf yeri (çapa + yan + derinlik + ileri adım). */
	_slot(u, A, tau, out) {
		if (u.fix) return out.set(u.fx, 0, u.fz);
		const e = !A.go ? 0 : A.dur > 0 ? trap(clamp((tau - u.delay) / A.dur, 0, 1)) : 1;
		const ax = A.sx + (A.ex - A.sx) * e;
		const az = A.sz + (A.ez - A.sz) * e;
		const f = u.adv - u.dep;
		out.x = ax + A.vx * u.lat + A.ux * f;
		out.z = az + A.vz * u.lat + A.uz * f;
		return out;
	}

	/** Birimin zemin yüksekliği: çizilen yüzey + üstünde durduğu ilin yükselmesi (önbellekli). */
	_ground(u) {
		if (u.cas) return u.cas.group.position.y + u.rel;
		if (u.yFix === u.yFix) return u.yFix;
		const b = this.app.board;
		if (Math.abs(u.x - u.gx) + Math.abs(u.z - u.gz) > 0.004) {
			u.gx = u.x;
			u.gz = u.z;
			u.gy = b.groundAt(u.x, u.z);
		}
		if (Math.abs(u.x - u.px) + Math.abs(u.z - u.pz) > 0.25) {
			u.px = u.x;
			u.pz = u.z;
			u.pi = b.pick(u.x, u.z);
		}
		return u.gy + (u.pi >= 0 ? b.liftOf(u.pi) : 0);
	}

	// ============================================================ komutlar

	/** Ordu görünür olur (eriyerek belirir); dur sn sonra yürüyüş başlar ya da yerinde durur. */
	appear(side, k = 2.4) {
		for (const u of this.units) {
			if (!u.on || u.side !== side) continue;
			u.fadeTo = 1;
			u.fadeK = k * rr(0.8, 1.25);
		}
		if (side === 0)
			for (const m of this.machines) {
				if (m.on) m.fadeTo = 1;
			}
	}

	/** Yürüyüş: çapa başından sonuna dur saniyede (yamuk hız; arka saflar biraz gecikir). */
	march(side, dur) {
		const A = this.armies[side];
		A.t = 0;
		A.dur = dur;
		A.go = true;
	}

	/** Ön saflar çarpışır: ileri adım, mızraklar iner ve dürter; dur sn kıvılcım ve toz. */
	engage(dur = 1.4, step = 0.2) {
		for (const u of this.units) {
			if (!u.on || u.mode !== SLOT) continue;
			if (u.front) {
				u.advTo = step;
				u.thrustTo = 1;
			} else if (u.kind === SPEAR || u.kind === BANNER) u.thrustTo = u.rank === 1 ? 0.75 : 0.15;
		}
		this.clash = dur;
		this.app.sfx?.play?.('attack');
	}

	/** Çarpışmadan sonra karşılıklı bekleyiş: ön saf biraz geri, mızraklar inik (soru boyunca). */
	standoff() {
		for (const u of this.units) {
			if (!u.on || u.mode !== SLOT) continue;
			if (u.front) {
				u.advTo = 0.08;
				u.thrustTo = 0.85;
			} else if (u.kind === SPEAR || u.kind === BANNER) u.thrustTo = u.rank === 1 ? 0.5 : 0;
		}
		this.clash = 0;
	}

	/** Okçular yayları gerer, sonra hedef ordunun üstüne ateşli ok yağdırır. */
	volley(side, n = 10) {
		let cnt = 0;
		for (const u of this.units) {
			if (!u.on || u.side !== side || u.kind !== ARCHER || u.mode !== SLOT) continue;
			u.drawTo = 1;
			cnt++;
		}
		if (!cnt) return;
		this.cue(0.42, () => {
			const from = this.centroid(side, _v, ARCHER);
			const to = this.centroid(1 - side, _w, -1);
			if (from && to) {
				from.y += 0.35;
				to.y += 0.1;
				this.fx.arrows(from, to, n, 0.85, 0.55);
				this.app.sfx?.play?.('arrows');
			}
			for (const u of this.units) if (u.on && u.side === side && u.kind === ARCHER) u.drawTo = 0;
		});
	}

	/** Ordunun (tür: -1 hepsi) ağırlık merkezi; yoksa null. */
	centroid(side, out, kind = -1) {
		let n = 0;
		let x = 0;
		let y = 0;
		let z = 0;
		for (const u of this.units) {
			if (!u.on || u.side !== side || u.fadeTo < 0.5) continue;
			if (kind >= 0 && u.kind !== kind) continue;
			x += u.x;
			y += u.y;
			z += u.z;
			n++;
		}
		if (!n) return null;
		return out.set(x / n, y / n, z / n);
	}

	/**
	 * Zafer hücumu: saldıranlar ileri atılır (dist birim), savunanlar bozguna uğrar: kaçar, bir kısmı
	 * devrilir, hepsi erir. Saldıranlar varınca sevinir.
	 */
	charge(dist = 1.6) {
		const [A, D] = this.armies;
		for (const u of this.units) {
			if (!u.on) continue;
			if (u.side === 0) {
				const sp = u.cav ? rr(2.2, 2.6) : rr(1.5, 1.8);
				u.mode = FREE;
				u.wait = u.rank * 0.06 + rnd() * 0.12;
				u.vx = A.ux * sp + A.vx * rr(-0.12, 0.12);
				u.vz = A.uz * sp + A.vz * rr(-0.12, 0.12);
				u.run = (dist + (u.cav ? 0.6 : 0)) / sp;
				u.thrustTo = u.kind === ARCHER ? 0 : 0.9;
			} else if (u.fix) {
				u.late = rr(0.2, 0.6);
				u.fadeK = 1.6;
			} else {
				// bozgun: dönüp kaçar; ön saftan bazıları devrilir
				const fallen = (u.rank <= 1 && rnd() < 0.42) || rnd() < 0.12;
				if (fallen) {
					u.mode = STILL;
					u.wait = rr(0.18, 0.45);
					u.fallTo = 1;
					u.thrustTo = 0;
					u.late = u.wait + rr(0.9, 1.3);
					u.fadeK = 1.4;
				} else {
					const sp = rr(1.2, 1.6);
					u.mode = FREE;
					u.wait = rr(0.15, 0.5);
					u.vx = -D.ux * sp + D.vx * rr(-0.35, 0.35);
					u.vz = -D.uz * sp + D.vz * rr(-0.35, 0.35);
					u.run = 2.2;
					u.thrustTo = 0;
					u.fadeTo = 0;
					u.fadeK = rr(0.7, 1.0);
				}
			}
		}
		this.clash = 0.6;
		this.cue(dist / 1.6 + 0.5, () => this.cheer(0));
	}

	/**
	 * Savunma kazandı: saldıranların ön safı sendeler, sonra ordu döner ve geri çekilerek erir; bir kısmı
	 * devrilir. Savunanlar sevinir.
	 */
	repel() {
		const A = this.armies[0];
		for (const u of this.units) {
			if (!u.on || u.side !== 0) continue;
			if (u.front && rnd() < 0.3) {
				u.mode = STILL;
				u.wait = rr(0.1, 0.35);
				u.fallTo = 1;
				u.thrustTo = 0;
				u.late = u.wait + 1.1;
				u.fadeK = 1.4;
			} else {
				// sendeleyip döner, geri çekilerek erir
				const sp = u.cav ? rr(1.3, 1.6) : rr(0.8, 1.05);
				u.mode = FREE;
				u.wait = rr(0.4, 0.75);
				u.vx = -A.ux * sp + A.vx * rr(-0.15, 0.15);
				u.vz = -A.uz * sp + A.vz * rr(-0.15, 0.15);
				u.run = 3;
				u.thrustTo = 0;
				u.late = u.wait + 0.3;
				u.fadeK = rr(0.6, 0.8);
			}
		}
		for (const m of this.machines) if (m.on) m.fadeTo = 0;
		this.clash = 0.5;
		this.cue(0.5, () => this.cheer(1));
	}

	/** Kimse bilemedi: iki ordu da çekilir. */
	withdraw() {
		for (const side of [0, 1]) {
			const A = this.armies[side];
			for (const u of this.units) {
				if (!u.on || u.side !== side) continue;
				if (u.fix) {
					u.late = rr(0.3, 0.8);
					u.fadeK = 1.2;
					continue;
				}
				const sp = rr(0.7, 0.95);
				u.mode = FREE;
				u.wait = rr(0.05, 0.4);
				u.vx = -A.ux * sp;
				u.vz = -A.uz * sp;
				u.run = 3;
				u.thrustTo = 0;
				u.cheerTo = 0;
				u.late = u.wait + 0.2;
				u.fadeK = rr(0.7, 0.9);
			}
		}
		for (const m of this.machines) if (m.on) m.fadeTo = 0;
	}

	/** Ordu sevinir: mızraklar havaya, zıplar. */
	cheer(side, on = true) {
		for (const u of this.units) {
			if (!u.on || u.side !== side || u.fall > 0.1 || u.fallTo > 0) continue;
			u.cheerTo = on ? 1 : 0;
			u.thrustTo = 0;
		}
		if (on && side >= 0) this.app.sfx?.play?.('cheer');
	}

	/** Ordu (side: -1 hepsi) yavaşça erir; makineler de. */
	fade(side = -1, k = 1.6) {
		for (const u of this.units) {
			if (!u.on || (side >= 0 && u.side !== side)) continue;
			if (u.fadeTo < 0) u.fadeTo = 0; // hiç belirmemiş: hemen silinir
			u.late = rr(0, 0.25);
			u.fadeK = k * rr(0.8, 1.2);
		}
		if (side <= 0) for (const m of this.machines) if (m.on) m.fadeTo = 0;
	}

	/**
	 * Makine k ateş eder: taş hedefe uçar (T sn), varınca onHit(nokta). Dönen: taşın varış süresi
	 * (kol fırlayıp bırakana kadarki gecikme dahil) ya da makine yoksa -1.
	 */
	fire(k, target, onHit = null, T = 1.05) {
		const m = this.machines[k];
		if (!m || !m.on) return -1;
		m.fire = 0;
		m.shot = false;
		m.target.copy(target);
		m.onHit = onHit;
		m.T = T;
		this.app.sfx?.play?.('catapult');
		return (m.kind === TREBUCHET ? 0.3 : 0.1) + T;
	}

	/** Makinenin kol ucu (taşın bırakıldığı yer), dünya. */
	_tip(m, out) {
		// yerel: mancınık kepçesi mil çevresinde ~1,6 rad; karşı ağırlıklının sapanı ~1,15 rad
		const treb = m.kind === TREBUCHET;
		const s = MACH_SCALE[m.kind];
		const ly = treb ? 0.62 + 0.62 * Math.sin(1.15) : 0.12 + 0.5 * Math.sin(1.6);
		const lz = treb ? -0.62 * Math.cos(1.15) : -0.04 - 0.5 * Math.cos(1.6);
		const c = Math.cos(m.yaw);
		const sn = Math.sin(m.yaw);
		return out.set(m.x + sn * lz * s, m.y + ly * s, m.z + c * lz * s);
	}

	// ============================================================ kare

	update(dt) {
		this.time += dt;
		for (const e of this.tl) {
			if (!e.on) continue;
			e.t -= dt;
			if (e.t <= 0) {
				e.on = false;
				const fn = e.fn;
				e.fn = null;
				fn?.();
			}
		}
		// savaş alanı açıklığı: ağaçlar yumuşakça alçalır ve geri kalkar; ikinci kapsül kameranın görüş çizgisi
		const cr = this.G.uClearR.value;
		if (cr.y !== this.clearTo) {
			cr.y += clamp(this.clearTo - cr.y, -dt * 1.6, dt * 2.2);
			if (Math.abs(cr.y - this.clearTo) < 1e-3) cr.y = this.clearTo;
		}
		if (cr.y > 0) {
			const cp = this.app.camera?.position;
			const ct = this.app.cam?.target;
			if (cp && ct) this.G.uClear2.value.set(cp.x, cp.z, ct.x, ct.z);
			// yalnızca alçak çekimde (yüksek bakışta ormanda kayan bir koridor görünmesin)
			cr.w = clamp((0.62 - (this.app.cam?.pitch ?? 1)) / 0.18, 0, 1) * 0.9;
		}
		let nf = 0;
		let nc = 0;
		let live = 0;
		const F = this.foot;
		const H = this.horse;
		for (const A of this.armies) if (A.on) A.t += dt;
		for (const u of this.units) {
			if (!u.on) continue;
			this._unit(u, dt);
			if (!u.on) continue;
			live++;
			const M = u.cav ? H : F;
			const i = u.cav ? nc++ : nf++;
			this._write(M, i, u);
		}
		F.count = F.caster.count = nf;
		H.count = H.caster.count = nc;
		if (nf) this._flag(F);
		if (nc) this._flag(H);
		const nm = this._machines(dt);
		if (!live) for (const A of this.armies) A.on = false;
		if (!live && !nm && this.clearTo > 0) this.clearTo = 0; // savaş bitti: ağaçlar geri kalkar
		this._battleFx(dt);
		if (live) this._focus();
		if (this._warm) this._warm = false;
		for (const m of this.meshes) m.visible = m.count > 0;
	}

	_unit(u, dt) {
		const A = this.armies[u.side];
		const k = 1 - Math.exp(-dt * 9);
		let speed = 0;
		let yawTo = A.yaw;
		const ox = u.x;
		const oz = u.z;
		u.adv += (u.advTo - u.adv) * Math.min(1, dt * 5);
		if (u.mode === SLOT) {
			this._slot(u, A, A.t, _v);
			u.x += (_v.x - u.x) * k;
			u.z += (_v.z - u.z) * k;
		} else if (u.mode === FREE) {
			if (u.wait > 0) u.wait -= dt;
			else if (u.run > 0) {
				const s = Math.min(1, u.run / 0.35); // varırken yavaşlar
				u.x += u.vx * dt * s;
				u.z += u.vz * dt * s;
				u.run -= dt;
			}
		} else if (u.wait > 0) u.wait -= dt;
		const dx = u.x - ox;
		const dz = u.z - oz;
		if (dt > 0) speed = Math.hypot(dx, dz) / dt;
		if (speed > 0.12) yawTo = Math.atan2(dx, dz);
		else if (u.mode === FREE && u.run > 0) yawTo = Math.atan2(u.vx, u.vz);
		u.yaw += wrapPi(yawTo - u.yaw) * Math.min(1, dt * 7);
		const walkTo = clamp(speed / (u.cav ? 1.2 : 0.75), 0, 1);
		u.walk += (walkTo - u.walk) * Math.min(1, dt * 8);
		const kk = Math.min(1, dt * 6);
		u.thrust += (u.thrustTo - u.thrust) * kk;
		u.cheer += (u.cheerTo - u.cheer) * kk;
		u.draw += (u.drawTo - u.draw) * Math.min(1, dt * 7);
		if (u.mode !== STILL || u.wait <= 0) u.fall += clamp(u.fallTo - u.fall, -dt * 3, dt * 3.2);
		if (u.late > 0) {
			u.late -= dt;
			if (u.late <= 0) u.fadeTo = 0;
		}
		u.fade += clamp(Math.max(0, u.fadeTo) - u.fade, -dt * u.fadeK, dt * u.fadeK);
		if (u.fade <= 0.001 && u.fadeTo === 0) {
			u.on = false;
			return;
		}
		const gy = this._ground(u);
		u.y += (gy - u.y) * Math.min(1, dt * 16);
	}

	_write(M, i, u) {
		const A = this.armies[u.side];
		const hop = u.cheer > 0.01 ? Math.max(0, Math.sin(this.time * 9 + u.ph)) * 0.06 * u.cheer : 0;
		_v.set(u.x, u.y + hop, u.z);
		_q.setFromAxisAngle(UP, u.yaw);
		_s.setScalar(FOOT_SCALE);
		_m.compose(_v, _q, _s);
		M.setMatrixAt(i, _m);
		M.setColorAt(i, A.color);
		const o = i * 4;
		const V = M.iVar.array;
		V[o] = u.ph;
		V[o + 1] = u.walk;
		V[o + 2] = u.kind;
		V[o + 3] = u.fade;
		const T = M.iAct.array;
		T[o] = u.thrust;
		T[o + 1] = u.fall;
		T[o + 2] = u.cheer;
		T[o + 3] = u.draw;
	}

	_flag(M) {
		const n = M.count;
		M.instanceMatrix.clearUpdateRanges();
		M.instanceMatrix.addUpdateRange(0, n * 16);
		M.instanceMatrix.needsUpdate = true;
		M.instanceColor.clearUpdateRanges();
		M.instanceColor.addUpdateRange(0, n * 3);
		M.instanceColor.needsUpdate = true;
		M.iVar.clearUpdateRanges();
		M.iVar.addUpdateRange(0, n * 4);
		M.iVar.needsUpdate = true;
		M.iAct.clearUpdateRanges();
		M.iAct.addUpdateRange(0, n * 4);
		M.iAct.needsUpdate = true;
	}

	_machines(dt) {
		const M = this.mach;
		const A = this.armies[0];
		const b = this.app.board;
		let n = 0;
		for (const m of this.machines) {
			if (!m.on) continue;
			// saldıran ordunun çapasını izler (mürettebat iter)
			const e = !A.go ? 0 : A.dur > 0 ? trap(clamp((A.t - 0.12) / A.dur, 0, 1)) : 1;
			const ax = A.sx + (A.ex - A.sx) * e;
			const az = A.sz + (A.ez - A.sz) * e;
			m.x = ax + A.vx * m.lat - A.ux * m.dep;
			m.z = az + A.vz * m.lat - A.uz * m.dep;
			if (Math.abs(m.x - m.px) + Math.abs(m.z - m.pz) > 0.25) {
				m.px = m.x;
				m.pz = m.z;
				m.pi = b.pick(m.x, m.z);
			}
			const gy = b.groundAt(m.x, m.z) + (m.pi >= 0 ? b.liftOf(m.pi) : 0);
			m.y = m.fade < 0.01 ? gy : m.y + (gy - m.y) * Math.min(1, dt * 12);
			m.yaw = A.yaw;
			m.fade += clamp(Math.max(0, m.fadeTo) - m.fade, -dt * 1.5, dt * 2.2);
			if (m.fade <= 0.001 && m.fadeTo === 0) {
				m.on = false;
				continue;
			}
			const treb = m.kind === TREBUCHET;
			const rest = treb ? -1 : 0;
			if (m.fire >= 0) {
				m.fire += dt;
				const f = m.fire;
				if (treb) m.arm = f < 0.42 ? -1 + 2.45 * (1 - Math.pow(1 - f / 0.42, 2)) : Math.max(rest, 1.45 - (f - 0.6) * 1.4);
				else m.arm = f < 0.14 ? 1.75 * Math.pow(f / 0.14, 1.4) : f < 0.3 ? 1.75 : Math.max(rest, 1.75 - (f - 0.3) * 1.6);
				const rel = treb ? 0.3 : 0.1;
				if (!m.shot && f >= rel) {
					m.shot = true;
					const from = this._tip(m, _w);
					const cb = m.onHit;
					m.onHit = null;
					this.fx.stone(from, m.target, m.T, treb ? 3.6 : 2.6 + rnd() * 0.6, cb, treb ? 0.15 : 0.12);
					_v.set(m.x, m.y + 0.05, m.z);
					this.fx.dust(_v, 5, 0.4, 0xcab995, 0.35);
					this.fx.shake(treb ? 0.25 : 0.15);
				}
				if (f > 2.6) m.fire = -1;
			} else m.arm += (rest - m.arm) * Math.min(1, dt * 4);
			_v.set(m.x, m.y, m.z);
			_q.setFromAxisAngle(UP, m.yaw);
			_s.setScalar(MACH_SCALE[m.kind]);
			_m.compose(_v, _q, _s);
			M.setMatrixAt(n, _m);
			M.setColorAt(n, A.color);
			const o = n * 4;
			M.iVar.array[o] = 0;
			M.iVar.array[o + 1] = 0.4;
			M.iVar.array[o + 2] = m.kind;
			M.iVar.array[o + 3] = m.fade;
			M.iAct.array[o + 3] = m.arm;
			n++;
		}
		M.count = M.caster.count = n;
		if (n) this._flag(M);
		return n;
	}

	/** Çarpışma hattında kıvılcım, toz; yürüyüşte ayak tozu. */
	_battleFx(dt) {
		const fx = this.fx;
		if (this.clash > 0) {
			this.clash -= dt;
			this._acc -= dt;
			if (this._acc <= 0) {
				this._acc = rr(0.06, 0.13);
				const L = this.clashLine;
				const A = this.armies[0];
				const s = rr(-0.5, 0.5) * L.w;
				_v.set(L.x + A.vx * s, 0, L.z + A.vz * s);
				_v.y = this.app.board.groundAt(_v.x, _v.z) + L.y + rr(0.18, 0.32);
				fx.sparks(_v, 5, 1.5, rnd() < 0.5 ? 0xffe2a8 : 0xfff6e0, 2.4, 0.035, 5);
				if (rnd() < 0.35) {
					_v.y -= 0.2;
					fx.dust(_v, 2, 0.35, 0xcdb894, 0.3);
				}
				if (rnd() < 0.2) fx.shake(0.12);
			}
		}
		// yürüyüş tozu: hareket eden birimlerin ayağından seyrek toz
		this._dust -= dt;
		if (this._dust <= 0) {
			this._dust = this.lo ? 0.16 : 0.09;
			let pick = null;
			let cnt = 0;
			for (const u of this.units) {
				if (!u.on || u.walk < 0.5 || u.fade < 0.6) continue;
				cnt++;
				if (rnd() * cnt < 1) pick = u;
			}
			if (pick) {
				_v.set(pick.x, pick.y + 0.04, pick.z);
				fx.dust(_v, 1, pick.cav ? 0.4 : 0.26, 0xcdb894, 0.25);
			}
		}
	}
}
