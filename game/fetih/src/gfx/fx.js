// Savaş ve kutlama efektleri: ordu yürüyüşü, mancınık, ateşli oklar, kule enkazı, toz, fetih patlaması,
// sancak, kalkan, kale çöküşü, havai fişek ve konfeti.
//
// Çizim çağrısı bütçesi (yalnızca o an kullanılan görünür; boşta hiç çağrı yok):
//   1 asker      : örneklenmiş (instanced) minik askerler, her dördüncüsü sancaktar; sahip renginde
//   2 makine     : mancınıklar ve fetih sancakları (aynı malzeme, ayrı geometri)
//   3 sancak     : fetihte yerden yükselen büyük sancak
//   4 taş        : örneklenmiş taş parçaları (mancınık taşı, kule enkazı, çöküş)
//   5 parçacık   : tek örneklenmiş dörtgen sistemi; ışıltı, kıvılcım, duman, alev, konfeti, iz
//                  (önçarpımlı karışım: aynı çağrıda toplamalı ve normal karışım birlikte)
//   6 dalga      : yere yayılan halka, kalkan kubbesi, ışık sütunu
// En çok 6 çağrı. Bütün malzemeler açılışta kurulur ve ilk derlemede sahnede görünürdür; havuzlar
// sabit boyutlu, kare başına nesne üretilmez (geçici vektörler önceden ayrılmış).

import * as THREE from 'three';
import { COMMON, LIGHT, FINISH } from './shaderlib.js';
import { Kit } from './kit.js';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);
const rnd = Math.random;
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ------------------------------------------------------------------ katı parçalar (asker, makine, sancak)

const UNIT_VS = /* glsl */ `
${COMMON}
attribute vec3 color;
attribute float tag;
attribute float anim;
attribute vec4 iVar; // x evre, y yürüyüş (0..1), z mancınık kolu açısı, w görünürlük (eriyerek kaybolur)
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec3 vOwn;
varying float vFade;
void main() {
	vec3 p = position;
	vec3 n = normal;
	float ph = iVar.x;
	float walk = iVar.y;
	float cyc = uTime * 12.0 + ph;
	if (tag > 0.5 && tag < 2.5) {
		// bacaklar: kalçadan salınır
		float sgn = tag < 1.5 ? 1.0 : -1.0;
		float k = clamp((0.13 - p.y) / 0.13, 0.0, 1.0);
		p.z += sin(cyc) * sgn * 0.055 * walk * k;
	}
	if (tag < 3.5) {
		// gövde hoplar; dururken hafif nefes
		p.y += abs(sin(cyc)) * 0.018 * walk + sin(uTime * 2.0 + ph) * 0.004 * (1.0 - walk) * step(0.13, p.y);
	}
	if (anim > 0.0) {
		// bez dalgalanır (direkten uzaklaştıkça), yürürken daha çok
		float a = anim * (0.6 + 0.4 * walk);
		p.x += sin(p.z * 9.0 - uTime * 9.0 + ph) * 0.06 * a * (tag > 5.5 ? 2.2 : 1.0);
		p.y += sin(p.z * 6.0 - uTime * 6.0 + ph) * 0.015 * a;
	}
	if (tag > 4.5 && tag < 5.5) {
		// mancınık kolu: mil çevresinde döner
		vec3 pv = vec3(0.0, 0.2, 0.02);
		vec3 l = p - pv;
		float c = cos(iVar.z);
		float s = sin(iVar.z);
		p = pv + vec3(l.x, c * l.y - s * l.z, s * l.y + c * l.z);
		n = vec3(n.x, c * n.y - s * n.z, s * n.y + c * n.z);
	}
	// sancak parçaları (tag 3) yalnızca sancaktarda: diğer askerlerde tek noktaya büzülür
	if (tag > 2.5 && tag < 3.5 && iVar.z < 0.5) p = vec3(0.0, 0.1, 0.0);
	vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
	vC = color;
	vOwn = instanceColor;
	vFade = iVar.w;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const UNIT_FS = /* glsl */ `
${COMMON}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec3 vOwn;
varying float vFade;
void main() {
	// eriyerek kaybol: ekran kapısı (opak kalır, sıralama gerekmez)
	if (hash12(gl_FragCoord.xy) > vFade) discard;
	vec3 N = normalize(vN);
	if (!gl_FrontFacing) N = -N;
	vec3 alb = vC;
	float gloss = 0.12;
	if (vC.r < -0.5) {
		alb = vOwn * vC.g;
		gloss = 0.3;
	}
	vec3 V = normalize(cameraPosition - vW);
	vec3 c = shade(alb, N, V, 1.0, 1.0, gloss, 0.9);
	c = applyFog(c, vW);
	gLit = 0.85; // ordu sahnenin odağı: gecede de seçilir
	gl_FragColor = finish(c, 1.0);
}`;

const OWN = (kit, k = 1) => kit.raw(-1, k, 0);

function cloth(kit, W, H, x0, y0, segs = 5) {
	// yüzü x=sabit düzleminde, -z yönüne uzanan bez (anim: direkten uzaklık)
	const pos = [];
	for (let i = 0; i < segs; i++) {
		const z0 = -(i / segs) * W;
		const z1 = -((i + 1) / segs) * W;
		pos.push(x0, y0 - H, z0, x0, y0 - H, z1, x0, y0, z1, x0, y0 - H, z0, x0, y0, z1, x0, y0, z0);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	const start = kit.count;
	kit.add(g);
	for (let i = start; i < kit.count; i++) kit.anim[i] = Math.max(0.001, -kit.pos[i * 3 + 2] / W);
}

function soldierGeo(lo) {
	const k = new Kit();
	k.seg = lo ? 0.75 : 1;
	// bacaklar
	k.setTag(1).color('#4a3424').box(0.034, 0.13, 0.04, -0.026, 0, 0);
	k.setTag(2).color('#4a3424').box(0.034, 0.13, 0.04, 0.026, 0, 0);
	// gövde: sahip renginde kaftan, altın kemer
	k.setTag(0);
	OWN(k, 1).cyl(0.045, 0.07, 0.14, 6, 0, 0.11, 0);
	k.color('#e8b64a').cyl(0.052, 0.054, 0.018, 6, 0, 0.17, 0);
	OWN(k, 0.8).cyl(0.03, 0.05, 0.05, 6, 0, 0.2, 0);
	// baş ve sivri miğfer
	k.color('#efc39a').sphere(0.038, 6, 0, 0.27, 0);
	k.color('#cfd6de').cone(0.044, 0.075, 6, 0, 0.285, 0);
	// kalkan (sol), mızrak (sağ)
	k.push().move(-0.07, 0.16, 0.01).rot(0, 0, Math.PI / 2);
	OWN(k, 0.75).cyl(0.055, 0.055, 0.016, 7);
	k.color('#f2c14e').cyl(0.018, 0.018, 0.02, 4, 0, -0.002, 0);
	k.pop();
	k.color('#7a5634').cyl(0.007, 0.007, 0.44, 4, 0.068, 0.04, 0.02);
	k.color('#dfe6ee').cone(0.016, 0.05, 4, 0.068, 0.48, 0.02);
	return k;
}

function bannerGeo(lo) {
	// asker + sancak direği ve bezi (tag 3): sancaksız askerde shader'da büzülür (iVar.z = 0)
	const k = soldierGeo(lo);
	k.setTag(3);
	k.color('#6b4a2e').cyl(0.008, 0.008, 0.62, 4, 0.068, 0.04, -0.03);
	k.color('#f2c14e').sphere(0.016, 4, 0.068, 0.67, -0.03);
	OWN(k, 1.05);
	cloth(k, 0.22, 0.14, 0.068, 0.64, 5);
	// beyaz hilal benzeri şerit (sade)
	k.color('#fff6e0');
	cloth(k, 0.22, 0.02, 0.0695, 0.52, 5);
	return k.build();
}

function catapultGeo(lo) {
	const k = new Kit();
	k.seg = lo ? 0.75 : 1;
	k.setTag(4);
	const wood = '#8a5a32';
	const dark = '#5e3c20';
	// kızaklar ve çerçeve
	k.color(dark).box(0.05, 0.05, 0.62, -0.13, 0.05, 0).box(0.05, 0.05, 0.62, 0.13, 0.05, 0);
	k.color(wood).box(0.31, 0.04, 0.05, 0, 0.07, 0.22).box(0.31, 0.04, 0.05, 0, 0.07, -0.22);
	// A ayakları
	k.color(wood).box(0.04, 0.2, 0.04, -0.13, 0.08, 0.02).box(0.04, 0.2, 0.04, 0.13, 0.08, 0.02);
	k.color(dark).box(0.3, 0.03, 0.03, 0, 0.19, 0.02);
	// tekerlekler
	for (const [x, z] of [[-0.17, 0.2], [0.17, 0.2], [-0.17, -0.2], [0.17, -0.2]]) {
		k.push().move(x, 0.07, z).rot(0, 0, Math.PI / 2);
		k.color(dark).cyl(0.07, 0.07, 0.03, 7, 0, -0.015, 0);
		k.pop();
	}
	// karşı ağırlık sandığı
	OWN(k, 0.6).box(0.12, 0.08, 0.1, 0, 0.1, -0.2);
	// kol (tag 5): mil (0, 0.2, 0.02) çevresinde döner; dururken geriye yatık
	k.setTag(5);
	k.color(wood).box(0.035, 0.035, 0.56, 0, 0.19, -0.1);
	k.color(dark).box(0.09, 0.03, 0.09, 0, 0.2, -0.38);
	k.color('#9e9e96').ico(0.04, 0, 0.24, -0.38);
	// sahip rengi flama
	k.setTag(4);
	k.color(dark).cyl(0.006, 0.006, 0.32, 3, -0.13, 0.2, 0.25);
	OWN(k, 1);
	cloth(k, 0.12, 0.07, -0.13, 0.5, 3);
	return k.build();
}

function standardGeo(lo) {
	const k = new Kit();
	k.seg = lo ? 0.75 : 1;
	k.setTag(6);
	k.color('#6b4a2e').cyl(0.03, 0.035, 2.1, 6, 0, -0.1, 0);
	k.color('#f2c14e').sphere(0.07, 6, 0, 2.05, 0).cone(0.04, 0.16, 5, 0, 2.08, 0);
	k.color('#f2c14e').box(0.04, 0.04, 0.95, 0, 1.92, -0.47);
	OWN(k, 1.1);
	cloth(k, 0.92, 0.6, 0.0, 1.9, 8);
	k.color('#fff6e0');
	cloth(k, 0.92, 0.05, 0.003, 1.42, 8);
	// taban: taş kaide
	k.color('#cdb893').cyl(0.16, 0.2, 0.1, 7, 0, -0.04, 0);
	return k.build();
}

// ------------------------------------------------------------------ taş parçaları

const ROCK_VS = /* glsl */ `
${COMMON}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
void main() {
	vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
	vC = instanceColor;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;
const ROCK_FS = /* glsl */ `
${COMMON}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
void main() {
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	vec3 alb = vC;
	vec3 c = shade(max(alb, 0.0), N, V, 1.0, 1.0, 0.05, 0.5);
	// kızgın taş (r > 1): akkor parlar
	c += max(vC - 1.0, 0.0) * 2.0;
	c = applyFog(c, vW);
	gLit = 0.85;
	gl_FragColor = finish(c, 1.0);
}`;

// ------------------------------------------------------------------ parçacıklar

const PART_VS = /* glsl */ `
attribute vec4 iP; // xyz, boyut
attribute vec4 iC; // doğrusal renk, opaklık
attribute vec4 iM; // dönüş, biçim, toplamalı (1) / normal (0), iz uzaması
attribute vec3 iV; // hız (iz yönü)
varying vec2 vUv;
varying vec4 vC;
varying vec4 vM;
void main() {
	vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
	vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
	vec2 c = position.xy;
	float sz = iP.w;
	vec2 q;
	if (iM.w > 0.0) {
		vec2 dv = vec2(dot(iV, R), dot(iV, U)) + vec2(0.0, 1e-4);
		float l = length(dv);
		vec2 d = dv / l;
		vec2 nn = vec2(d.y, -d.x); // sarım yönü korunsun (arka yüz ayıklanmasın)
		q = d * (c.y * sz * (1.0 + iM.w * l)) + nn * (c.x * sz);
	} else {
		float cs = cos(iM.x);
		float sn = sin(iM.x);
		vec2 cc = c;
		if (iM.y > 2.5 && iM.y < 3.5) cc.y *= abs(cos(iM.x * 1.7)) * 0.85 + 0.15; // konfeti takla atar
		q = vec2(cc.x * cs - cc.y * sn, cc.x * sn + cc.y * cs) * sz;
	}
	vec3 w = iP.xyz + R * q.x + U * q.y;
	vUv = c;
	vC = iC;
	vM = iM;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const PART_FS = /* glsl */ `
${COMMON}
${FINISH}
varying vec2 vUv;
varying vec4 vC;
varying vec4 vM;
void main() {
	float r2 = dot(vUv, vUv);
	float s = vM.y;
	float a;
	vec3 col = vC.rgb;
	if (s < 0.5) {
		a = exp(-r2 * 4.0) * step(r2, 1.0);
	} else if (s < 1.5) {
		// yıldız kıvılcımı: çekirdek + dört ışın
		vec2 u = abs(vUv);
		a = exp(-r2 * 14.0) + (max(0.0, 1.0 - u.x * 12.0) * max(0.0, 1.0 - u.y) + max(0.0, 1.0 - u.y * 12.0) * max(0.0, 1.0 - u.x)) * 0.7;
		col *= 1.0 + exp(-r2 * 30.0) * 2.0;
	} else if (s < 2.5) {
		// duman topağı: kenarı gürültülü yumuşak disk
		float n = vnoise(vUv * 2.3 + vM.x * 3.0);
		a = smoothstep(1.0, 0.25, sqrt(r2) + (n - 0.5) * 0.45);
		col *= 0.82 + 0.3 * (1.0 - vUv.y) * 0.5 + n * 0.12;
	} else if (s < 3.5) {
		// konfeti: kâğıt dikdörtgen, takla attıkça parlar/kararır
		vec2 u = abs(vUv);
		a = step(u.x, 0.55) * step(u.y, 0.95);
		col *= 0.65 + 0.55 * abs(sin(vM.x * 1.7));
	} else {
		// iz (ok, roket): uzun yumuşak çizgi, başı parlak
		a = exp(-vUv.x * vUv.x * 7.0) * (1.0 - smoothstep(0.6, 1.0, abs(vUv.y))) * (0.45 + 0.55 * smoothstep(-1.0, 0.8, vUv.y));
	}
	a *= vC.a;
	if (a < 0.004) discard;
	gLit = vM.z; // ışık (toplamalı) gece kararmaz; duman ve konfeti geceye uyar
	vec3 o = finish(col, 1.0).rgb;
	gl_FragColor = vec4(o * a, a * (1.0 - vM.z));
}`;

// ------------------------------------------------------------------ dalga, kalkan, ışık sütunu

const WAVE_VS = /* glsl */ `
attribute vec4 iA; // merkez xyz, yarıçap
attribute vec4 iB; // renk, opaklık
attribute vec4 iD; // kip (0 halka, 1 kalkan, 2 sütun), ilerleme, yükseklik oranı, kalınlık
varying vec3 vL;
varying vec3 vW;
varying vec3 vN;
varying vec4 vB;
varying vec4 vD;
void main() {
	vec3 l = position;
	if (iD.x < 0.5) l.y = 0.0;
	vec3 w = iA.xyz + l * vec3(iA.w, iA.w * iD.z, iA.w);
	vL = position;
	vW = w;
	vN = normalize(normal * vec3(1.0, 1.0 / max(iD.z, 0.05), 1.0));
	vB = iB;
	vD = iD;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const WAVE_FS = /* glsl */ `
${COMMON}
${FINISH}
varying vec3 vL;
varying vec3 vW;
varying vec3 vN;
varying vec4 vB;
varying vec4 vD;
float hexEdge(vec2 p) {
	// altıgen ızgara kenarına uzaklık (0 kenarda)
	vec2 r = vec2(1.0, 1.7320508);
	vec2 h = r * 0.5;
	vec2 a = mod(p, r) - h;
	vec2 b = mod(p - h, r) - h;
	vec2 g = dot(a, a) < dot(b, b) ? a : b;
	vec2 q = abs(g);
	return 0.5 - max(dot(q, normalize(vec2(1.0, 1.7320508))), q.x);
}
void main() {
	float m = vD.x;
	float u = vD.y;
	float a;
	vec3 col = vB.rgb;
	if (m < 0.5) {
		float d = length(vL.xz);
		float th = vD.w;
		float x = (d - (1.0 - th)) / th;
		a = exp(-x * x * 2.5) + smoothstep(1.0, 0.0, d) * 0.12;
		a *= step(d, 1.0);
	} else if (m < 1.5) {
		vec3 N = normalize(vN);
		vec3 V = normalize(cameraPosition - vW);
		float fres = pow(1.0 - abs(dot(N, V)), 2.2);
		float ang = atan(vL.z, vL.x);
		vec2 hp = vec2(ang * 3.0, vL.y * 5.0);
		float e = hexEdge(hp);
		float line = smoothstep(0.08, 0.0, e);
		float band = exp(-pow((vL.y - u * 1.3 + 0.15) * 7.0, 2.0));
		a = 0.06 + fres * 0.75 + line * (0.25 + band * 1.2) + band * 0.4;
		a *= smoothstep(0.0, 0.08, vL.y + 0.02);
		col *= 1.0 + band * 1.5;
	} else {
		vec3 N = normalize(vN);
		vec3 V = normalize(cameraPosition - vW);
		float f = abs(dot(N, V));
		a = pow(f, 1.5) * pow(1.0 - vL.y, 1.6);
		col = col * 2.2 + 0.25;
	}
	a *= vB.a;
	if (a < 0.003) discard;
	gLit = 1.0;
	vec3 o = finish(col, 1.0).rgb;
	gl_FragColor = vec4(o * a, 0.0);
}`;

const PREMUL = {
	transparent: true,
	depthWrite: false,
	blending: THREE.CustomBlending,
	blendSrc: THREE.OneFactor,
	blendDst: THREE.OneMinusSrcAlphaFactor,
	blendSrcAlpha: THREE.ZeroFactor,
	blendDstAlpha: THREE.OneFactor,
};

// parçacık biçimleri
export const GLOW = 0;
export const STAR = 1;
export const SMOKE = 2;
export const PAPER = 3;
export const STREAK = 4;

// parçacık kaydı (düz dizi): alan sırası
const PF = 24;
const [X, Y, Z, VX, VY, VZ, AGE, LIFE, S0, S1, CR, CG, CB, A0, DRAG, GRAV, SHAPE, ADD, ROT, SPIN, STR, FLUT, FIN] = Array.from({ length: 23 }, (_, i) => i);

export class FX {
	/**
	 * @param G ortak uniform'lar
	 * @param tier kalite kademesi
	 * @param app board (yükseklik), cam (sarsıntı) için
	 */
	constructor(G, tier, app) {
		this.G = G;
		this.app = app;
		this.tier = tier;
		const lo = tier.id === 0;
		this.group = new THREE.Group();
		this.group.name = 'fx';
		this.time = 0;
		// minyatür ölçekleri (dünya birimi)
		this._unitScale = 1.25;
		this._catScale = 1.6;
		this._stdScale = 1.55;

		// --- askerler
		this.maxSoldiers = lo ? 20 : 32;
		const umat = new THREE.ShaderMaterial({ vertexShader: UNIT_VS, fragmentShader: UNIT_FS, uniforms: { ...G }, side: THREE.DoubleSide });
		this.unitMat = umat;
		this.soldiers = this._units(bannerGeo(lo), this.maxSoldiers, umat);
		this.machines = this._units(catapultGeo(lo), 4, umat);
		this.standards = this._units(standardGeo(lo), 4, umat);

		// --- taşlar
		this.maxRocks = lo ? 40 : 64;
		const rgeo = new THREE.IcosahedronGeometry(1, 0);
		rgeo.computeVertexNormals();
		const rmat = new THREE.ShaderMaterial({ vertexShader: ROCK_VS, fragmentShader: ROCK_FS, uniforms: { ...G } });
		this.rockMesh = new THREE.InstancedMesh(rgeo, rmat, this.maxRocks);
		this.rockMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.rockMesh.setColorAt(0, _c.set(1, 1, 1));
		this.rockMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
		this.rockMesh.frustumCulled = false;
		this.rockMesh.count = 1;
		this.group.add(this.rockMesh);
		this.rocks = Array.from({ length: this.maxRocks }, () => ({
			on: false,
			p: new THREE.Vector3(),
			v: new THREE.Vector3(),
			q: new THREE.Quaternion(),
			w: new THREE.Vector3(),
			s: 0.1,
			c: new THREE.Color(),
			life: 0,
			age: 0,
			floor: 0,
			fly: null, // balistik uçuş: {a, b, T, h, onHit}
			trail: 0,
			bounce: 0,
		}));
		this.flights = Array.from({ length: 8 }, () => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), T: 1, h: 1, onHit: null }));
		this._fi = 0;

		// --- parçacıklar
		this.maxParts = Math.max(300, tier.particles || 600);
		const N = this.maxParts;
		const pg = new THREE.InstancedBufferGeometry();
		pg.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
		pg.setIndex([0, 1, 2, 0, 2, 3]);
		this.aP = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aC = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aM = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aV = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
		pg.setAttribute('iP', this.aP);
		pg.setAttribute('iC', this.aC);
		pg.setAttribute('iM', this.aM);
		pg.setAttribute('iV', this.aV);
		pg.instanceCount = 1;
		this.partMesh = new THREE.Mesh(pg, new THREE.ShaderMaterial({ vertexShader: PART_VS, fragmentShader: PART_FS, uniforms: { ...G }, ...PREMUL }));
		this.partMesh.frustumCulled = false;
		this.partMesh.renderOrder = 30;
		this.group.add(this.partMesh);
		this.P = new Float32Array(N * PF);
		this.np = 0;

		// --- dalgalar
		this.maxWaves = 12;
		const wbase = new THREE.SphereGeometry(1, lo ? 18 : 28, lo ? 6 : 9, 0, Math.PI * 2, 0, Math.PI / 2);
		const wg = new THREE.InstancedBufferGeometry();
		wg.index = wbase.index;
		wg.setAttribute('position', wbase.getAttribute('position'));
		wg.setAttribute('normal', wbase.getAttribute('normal'));
		this.wA = new THREE.InstancedBufferAttribute(new Float32Array(this.maxWaves * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.wB = new THREE.InstancedBufferAttribute(new Float32Array(this.maxWaves * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.wD = new THREE.InstancedBufferAttribute(new Float32Array(this.maxWaves * 4), 4).setUsage(THREE.DynamicDrawUsage);
		wg.setAttribute('iA', this.wA);
		wg.setAttribute('iB', this.wB);
		wg.setAttribute('iD', this.wD);
		wg.instanceCount = 1;
		this.waveMesh = new THREE.Mesh(wg, new THREE.ShaderMaterial({ vertexShader: WAVE_VS, fragmentShader: WAVE_FS, uniforms: { ...G }, side: THREE.DoubleSide, ...PREMUL }));
		this.waveMesh.frustumCulled = false;
		this.waveMesh.renderOrder = 29;
		this.group.add(this.waveMesh);
		this.waves = Array.from({ length: this.maxWaves }, () => ({ on: false, mode: 0, x: 0, y: 0, z: 0, r0: 1, r1: 2, age: 0, life: 1, c: new THREE.Color(), a: 1, h: 1, th: 0.2, hold: 0 }));

		// --- yayıcılar (roket, ok, duman sütunu, havai fişek gösterisi, konfeti)
		this.emitters = Array.from({ length: 40 }, () => ({
			on: false,
			kind: '',
			p: new THREE.Vector3(),
			v: new THREE.Vector3(),
			a: new THREE.Vector3(),
			b: new THREE.Vector3(),
			c: new THREE.Color(),
			c2: new THREE.Color(),
			age: 0,
			life: 1,
			acc: 0,
			rate: 0,
			h: 0,
			k: 0,
			colors: null,
		}));

		// --- ordu ve zaman çizelgesi
		this.army = {
			on: false,
			n: 0,
			state: 'off',
			t: 0,
			fade: 1,
			p0: new THREE.Vector3(),
			p1: new THREE.Vector3(),
			p2: new THREE.Vector3(),
			len: 1,
			head: 0,
			speed: 1,
			color: new THREE.Color(),
			goal: new THREE.Vector3(),
			cats: 0,
		};
		this.sold = Array.from({ length: this.maxSoldiers }, (_, i) => ({
			lat: 0,
			row: 0,
			p: new THREE.Vector3(),
			y: 0,
			yaw: 0,
			walk: 0,
			ph: rnd() * 6.28,
			banner: false,
			dir: new THREE.Vector3(),
			delay: 0,
			ox: 0,
			oz: 0,
		}));
		this.cats = Array.from({ length: 4 }, () => ({ on: false, p: new THREE.Vector3(), yaw: 0, arm: -0.9, fire: -1, fade: 0 }));
		this.stds = Array.from({ length: 4 }, () => ({ on: false, p: new THREE.Vector3(), yaw: 0, age: 0, life: 3, c: new THREE.Color(), rise: 0 }));
		this.timeline = Array.from({ length: 32 }, () => ({ on: false, t: 0, fn: null }));
		this.anims = Array.from({ length: 8 }, () => ({ on: false, t: 0, dur: 1, fn: null, done: null }));
		this.warm(true);
	}

	_units(geo, n, mat) {
		const iv = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute('iVar', iv);
		const m = new THREE.InstancedMesh(geo, mat, n);
		m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		m.setColorAt(0, _c.set(1, 1, 1));
		m.instanceColor.setUsage(THREE.DynamicDrawUsage);
		m.frustumCulled = false;
		m.count = 1;
		m.iVar = iv;
		this.group.add(m);
		return m;
	}

	/** Açılış derlemesi için bütün çizimler görünür (ilk karede kendiliğinden kapanır). */
	warm(on) {
		for (const m of [this.soldiers, this.machines, this.standards, this.rockMesh, this.partMesh, this.waveMesh]) m.visible = on;
		this._warm = on;
	}

	get calls() {
		let n = 0;
		for (const m of [this.soldiers, this.machines, this.standards, this.rockMesh, this.partMesh, this.waveMesh]) if (m.visible) n++;
		return n;
	}

	/** Her şeyi sil (maç sıfırlanırken). */
	clear() {
		this.np = 0;
		for (const r of this.rocks) r.on = false;
		for (const w of this.waves) w.on = false;
		for (const e of this.emitters) e.on = false;
		for (const c of this.cats) c.on = false;
		for (const s of this.stds) s.on = false;
		for (const t of this.timeline) {
			t.on = false;
			t.fn = null;
		}
		for (const a of this.anims) {
			if (!a.on) continue;
			a.on = false;
			a.fn?.(1);
			a.done?.();
			a.fn = a.done = null;
		}
		this.army.on = false;
		this.army.state = 'off';
		this.army.cats = 0;
	}

	/** t saniye sonra fn (dokunarak atlansa bile çalışır; sıfırlamada iptal). */
	after(t, fn) {
		const e = this.timeline.find((x) => !x.on) || this.timeline[0];
		if (e.on && e.fn) e.fn();
		e.on = true;
		e.t = t;
		e.fn = fn;
	}

	/** dur saniye boyunca her karede fn(u: 0..1); bitince done(). Kare zamanıyla ilerler. */
	anim(dur, fn, done = null) {
		const a = this.anims.find((x) => !x.on);
		if (!a) {
			fn(1);
			done?.();
			return;
		}
		a.on = true;
		a.t = 0;
		a.dur = dur;
		a.fn = fn;
		a.done = done;
		fn(0);
	}

	// ============================================================ yardımcılar

	ground(x, z) {
		const b = this.app.board;
		const i = b.pick(x, z);
		return b.heightAt(x, z) + (i >= 0 ? b.liftOf(i) : 0);
	}

	/** Parçacık bırak. col: THREE.Color (doğrusal). Dönen: kayıt indeksi (ek alanlar için) ya da -1. */
	emit(x, y, z, vx, vy, vz, life, s0, s1, col, a0, shape, add = 1, drag = 0, grav = 0) {
		if (this.np >= this.maxParts) return -1;
		if (add) {
			// ışık parçacıkları telefonda okunacak kadar iri (minyatür ölçeğinde birkaç piksel kalmasın)
			s0 *= 2.2;
			s1 *= 2.2;
		}
		const o = this.np++ * PF;
		const P = this.P;
		P[o + X] = x;
		P[o + Y] = y;
		P[o + Z] = z;
		P[o + VX] = vx;
		P[o + VY] = vy;
		P[o + VZ] = vz;
		P[o + AGE] = 0;
		P[o + LIFE] = life;
		P[o + S0] = s0;
		P[o + S1] = s1;
		P[o + CR] = col.r;
		P[o + CG] = col.g;
		P[o + CB] = col.b;
		P[o + A0] = a0;
		P[o + DRAG] = drag;
		P[o + GRAV] = grav;
		P[o + SHAPE] = shape;
		P[o + ADD] = add;
		P[o + ROT] = rnd() * 6.28;
		P[o + SPIN] = 0;
		P[o + STR] = 0;
		P[o + FLUT] = 0;
		P[o + FIN] = 0.08;
		return o;
	}

	_rock() {
		for (const r of this.rocks) if (!r.on) return r;
		return null;
	}

	_wave() {
		for (const w of this.waves) if (!w.on) return w;
		return null;
	}

	_emitter(kind) {
		for (const e of this.emitters) {
			if (!e.on) {
				e.on = true;
				e.kind = kind;
				e.age = 0;
				e.acc = 0;
				e.k = 0;
				e.colors = null;
				return e;
			}
		}
		return null;
	}

	// ============================================================ temel efektler

	/** Yere yayılan halka. */
	ring(x, y, z, r0, r1, color, life = 0.7, a = 1.2, th = 0.18) {
		const w = this._wave();
		if (!w) return null;
		Object.assign(w, { on: true, mode: 0, x, y, z, r0, r1, age: 0, life, a, h: 1, th, hold: 0 });
		w.c.set(color);
		return w;
	}

	/** Kalkan kubbesi (sahip renginde altıgen örgü, yukarı süpüren parıltı). */
	shield(x, y, z, r, color, life = 1.1) {
		const w = this._wave();
		if (!w) return;
		Object.assign(w, { on: true, mode: 1, x, y, z, r0: r * 0.85, r1: r, age: 0, life, a: 1, h: 0.75, th: 0, hold: 0 });
		w.c.set(color);
	}

	/** Işık sütunu. */
	pillar(x, y, z, r, h, color, life = 1) {
		const w = this._wave();
		if (!w) return;
		Object.assign(w, { on: true, mode: 2, x, y, z, r0: r * 0.6, r1: r, age: 0, life, a: 1.1, h, th: 0, hold: 0 });
		w.c.set(color);
	}

	/** Toz bulutu: yere yakın yayılan duman topakları. */
	dust(p, n = 16, rad = 0.8, color = 0xd9c7a4, up = 0.6) {
		_c.set(color);
		for (let i = 0; i < n; i++) {
			const a = rnd() * 6.28;
			const s = rr(0.6, 1.6) * rad;
			const o = this.emit(p.x + Math.cos(a) * rad * 0.3, p.y + rr(0, 0.2), p.z + Math.sin(a) * rad * 0.3, Math.cos(a) * s, rr(0.2, 1) * up, Math.sin(a) * s, rr(0.8, 1.4), rr(0.18, 0.3) * rad, rr(0.45, 0.8) * rad, _c, 0.6, SMOKE, 0, 2.4, -0.15);
			if (o >= 0) this.P[o + SPIN] = rr(-1, 1);
		}
	}

	/** Kıvılcım saçması. */
	sparks(p, n = 20, speed = 3, color = 0xffd27a, k = 2.5, size = 0.07, grav = 5) {
		_c.set(color).multiplyScalar(k);
		for (let i = 0; i < n; i++) {
			_v.set(rr(-1, 1), rr(0.2, 1.2), rr(-1, 1)).normalize().multiplyScalar(speed * rr(0.4, 1));
			const o = this.emit(p.x, p.y, p.z, _v.x, _v.y, _v.z, rr(0.35, 0.8), size, size * 0.3, _c, 1, STREAK, 1, 1.5, grav);
			if (o >= 0) this.P[o + STR] = 0.12;
		}
	}

	/** Işıltı (yıldız) yağmuru. */
	twinkle(p, n = 16, rad = 1, color = 0xfff1b0, k = 2.2) {
		_c.set(color).multiplyScalar(k);
		for (let i = 0; i < n; i++) {
			const a = rnd() * 6.28;
			const r = rnd() * rad;
			this.emit(p.x + Math.cos(a) * r, p.y + rr(0, 0.6), p.z + Math.sin(a) * r, Math.cos(a) * 0.4, rr(0.6, 2), Math.sin(a) * 0.4, rr(0.6, 1.2), rr(0.08, 0.15), 0.02, _c, 1, STAR, 1, 1.2, -0.3);
		}
	}

	/** Taş enkazı: parçalar fırlar, yere düşüp seker, küçülerek kaybolur. */
	debris(p, n = 10, speed = 3, size = 0.09, color = 0xd9c7a4, color2 = null) {
		for (let i = 0; i < n; i++) {
			const r = this._rock();
			if (!r) return;
			r.on = true;
			r.fly = null;
			r.p.copy(p);
			r.p.x += rr(-0.15, 0.15);
			r.p.z += rr(-0.15, 0.15);
			r.v.set(rr(-1, 1), rr(0.6, 1.6), rr(-1, 1)).normalize().multiplyScalar(speed * rr(0.5, 1.1));
			r.w.set(rr(-8, 8), rr(-8, 8), rr(-8, 8));
			r.q.setFromEuler(_e.set(rnd() * 6, rnd() * 6, rnd() * 6));
			r.s = size * rr(0.5, 1.4);
			r.c.set(color2 != null && rnd() < 0.3 ? color2 : color).multiplyScalar(rr(0.75, 1.05));
			r.life = rr(1.6, 2.4);
			r.age = 0;
			r.floor = this.ground(r.p.x, r.p.z);
			r.trail = 0;
			r.bounce = 0;
		}
	}

	/**
	 * Balistik taş (mancınık): a'dan b'ye T saniyede, h tepe yüksekliği; alev ve duman izi bırakır.
	 * Varınca onHit(b) çağrılır.
	 */
	stone(a, b, T = 0.7, h = 3, onHit = null, size = 0.13) {
		const r = this._rock();
		if (!r) {
			onHit?.(b);
			return;
		}
		const f = this.flights[this._fi++ % this.flights.length];
		f.a.copy(a);
		f.b.copy(b);
		f.T = T;
		f.h = h;
		f.onHit = onHit;
		r.on = true;
		r.fly = f;
		r.age = 0;
		r.life = T;
		r.p.copy(a);
		r.s = size;
		r.c.setRGB(1.25, 0.6, 0.25); // akkor taş
		r.w.set(rr(-6, 6), rr(-6, 6), rr(-6, 6));
		r.trail = 1;
	}

	/** Ateşli ok yağmuru: n ok, a çevresinden b çevresine. */
	arrows(a, b, n = 8, T = 0.6, spread = 0.7) {
		for (let i = 0; i < n; i++) {
			const e = this._emitter('arrow');
			if (!e) return;
			e.a.set(a.x + rr(-0.4, 0.4), a.y + 0.3, a.z + rr(-0.4, 0.4));
			e.b.set(b.x + rr(-spread, spread), b.y + rr(-0.1, 0.4), b.z + rr(-spread, spread));
			e.life = T * rr(0.85, 1.15);
			e.age = -i * 0.05;
			e.h = rr(1.2, 2.2);
			e.p.copy(e.a);
		}
	}

	/** Havai fişek gösterisi: süre boyunca merkez çevresinden roket fırlatır. */
	fireworks(center, colors, dur = 5, rad = 5, height = 7) {
		const e = this._emitter('show');
		if (!e) return;
		e.p.copy(center);
		e.life = dur;
		e.rate = 0;
		e.h = height;
		e.k = rad;
		e.colors = colors;
	}

	/** Konfeti: ekranın üstünden (dünyada merkezin üstünden) yağar. */
	confetti(center, colors, n = 120, rad = 6, height = 6) {
		for (let i = 0; i < n; i++) {
			_c.set(colors[i % colors.length]).multiplyScalar(1.4);
			const a = rnd() * 6.28;
			const r = Math.sqrt(rnd()) * rad;
			const o = this.emit(center.x + Math.cos(a) * r, center.y + height + rr(-1, 2), center.z + Math.sin(a) * r, rr(-0.6, 0.6), rr(-0.5, 1.5), rr(-0.6, 0.6), rr(2.6, 4), 0.07, 0.06, _c, 1, PAPER, 0, 1.6, 1.4);
			if (o >= 0) {
				this.P[o + SPIN] = rr(-9, 9);
				this.P[o + FLUT] = rr(0.6, 1.4);
				this.P[o + FIN] = 0.02;
			}
		}
	}

	/** Duman sütunu (yanan kule). */
	smokeColumn(p, dur = 2.5, rate = 14) {
		const e = this._emitter('smoke');
		if (!e) return;
		e.p.copy(p);
		e.life = dur;
		e.rate = rate;
	}

	/** Fetih patlaması: yere halka, ışık sütunu, ışıltılar, kıvılcımlar, yükselen sancak. */
	burst(p, color, { banner = true, big = 1 } = {}) {
		this.ring(p.x, p.y + 0.1, p.z, 0.3, 3.2 * big, color, 0.8, 1.4, 0.16);
		this.ring(p.x, p.y + 0.1, p.z, 0.2, 2.0 * big, 0xfff2c0, 0.55, 1.2, 0.3);
		this.pillar(p.x, p.y, p.z, 0.9 * big, 5.5 * big, color, 1.0);
		this.pillar(p.x, p.y, p.z, 0.4 * big, 6 * big, 0xfff6d8, 0.7);
		this.twinkle(_w.copy(p), 30, 1.6 * big, 0xfff1b0, 2.6);
		_c.set(color).multiplyScalar(3);
		this.emit(p.x, p.y + 0.4, p.z, 0, 0, 0, 0.4, 0.55 * big, 1.4 * big, _c, 0.8, GLOW, 1);
		_w.copy(p);
		_w.y += 0.3;
		this.sparks(_w, 26, 4.5 * big, color, 2.4, 0.08, 4);
		if (banner) this.standard(p, color);
	}

	/** Yerden yükselen büyük sancak (life saniye durur, sonra iner). */
	standard(p, color, life = 3.2) {
		const s = this.stds.find((x) => !x.on) || this.stds[0];
		s.on = true;
		s.p.copy(p);
		// bez kameraya dönük (3/4)
		s.yaw = -(this.app.cam?.yaw || 0) - Math.PI / 2 + 0.45;
		s.age = 0;
		s.life = life;
		s.c.set(color);
	}

	/** Sarsıntı. */
	shake(a) {
		this.app.cam?.impulse?.(a);
	}

	// ============================================================ ordu

	/**
	 * Ordu yürüyüşü: from (saldıranın ilinden) to (hedef) arasındaki yay boyunca, sahip renginde.
	 * opts: {count, dur (sn), siege (kale önünde durur, mancınık kurar), bend (yay eğriliği)}
	 */
	march(from, to, color, { count = null, dur = 1.25, siege = false, bend = 0.22, stopShort = 0 } = {}) {
		const A = this.army;
		A.on = true;
		A.state = 'march';
		A.t = 0;
		A.fade = 1;
		A.color.set(color);
		const dx = to.x - from.x;
		const dz = to.z - from.z;
		const L = Math.hypot(dx, dz) || 1;
		const ux = dx / L;
		const uz = dz / L;
		A.p0.copy(from);
		A.p2.set(to.x - ux * stopShort, to.y, to.z - uz * stopShort);
		// yay: ortadan yana kayan kontrol noktası
		const side = rnd() < 0.5 ? -1 : 1;
		A.p1.set((from.x + A.p2.x) / 2 - uz * L * bend * side, 0, (from.z + A.p2.z) / 2 + ux * L * bend * side);
		A.len = Math.max(0.5, L - stopShort);
		A.head = 0;
		A.speed = 1 / dur;
		const n = Math.min(this.maxSoldiers, count ?? this.maxSoldiers);
		A.n = n;
		const across = this.tier.id === 0 ? 3 : 4;
		for (let i = 0; i < n; i++) {
			const s = this.sold[i];
			const row = Math.floor(i / across);
			const col = i % across;
			s.row = row;
			s.lat = (col - (across - 1) / 2) * 0.17 + rr(-0.03, 0.03);
			s.banner = col === 1 && row % 2 === 0;
			s.walk = 1;
			s.y = this.ground(from.x, from.z);
			s.delay = row * 0.05;
			s.ox = 0;
			s.oz = 0;
		}
		A.rows = Math.ceil(n / across);
		// kuşatma: iki mancınık, ordunun gerisinde, kaleye dönük
		A.cats = 0;
		for (const c of this.cats) c.on = false;
		if (siege) {
			for (let k = 0; k < 2; k++) {
				const c = this.cats[k];
				const sd = k ? 1 : -1;
				const bx = A.p2.x - ux * 1.1 - uz * sd * 0.75;
				const bz = A.p2.z - uz * 1.1 + ux * sd * 0.75;
				c.on = true;
				c.p.set(bx, this.ground(bx, bz), bz);
				c.yaw = Math.atan2(ux, uz);
				c.arm = -0.95;
				c.fire = -1;
				c.fade = 0;
			}
			A.cats = 2;
		}
		return A;
	}

	/** Mancınık k ateş eder: taş hedefe uçar. Dönen: uçuş süresi. */
	catapult(k, target, onHit, T = 0.62) {
		const c = this.cats[k % 2];
		if (!c.on) {
			// mancınık yoksa taş ordunun gerisinden gelir
			_v.copy(this.army.p0);
			_v.y += 0.4;
			this.stone(_v, target, T, 3, onHit);
			return T;
		}
		c.fire = 0;
		// kolun ucu (kabaca): mancınığın önü, yukarıda
		const from = new THREE.Vector3(Math.sin(c.yaw) * 0.25, 0.62, Math.cos(c.yaw) * 0.25).multiplyScalar(this._catScale).add(c.p);
		const to = target.clone();
		this.after(0.09, () => {
			this.stone(from, to, T, 2.6 + rnd(), onHit, 0.12);
			_w.copy(c.p);
			this.dust(_w, 5, 0.35, 0xcab995, 0.3);
		});
		return T + 0.09;
	}

	/** Ordu hedefe hücum eder ve erir (fetih). */
	armyCharge(to) {
		const A = this.army;
		if (!A.on) return;
		A.state = 'charge';
		A.t = 0;
		A.goal.copy(to);
	}

	/** Ordu geri çekilir ve erir (savunma, kimse bilemedi). */
	armyRetreat() {
		const A = this.army;
		if (!A.on) return;
		A.state = 'retreat';
		A.t = 0;
	}

	/** Ordu sevinir (kule düştü), sonra erir. */
	armyCheer(fadeAfter = 1.4) {
		const A = this.army;
		if (!A.on) return;
		A.state = 'cheer';
		A.t = 0;
		A.cheerLife = fadeAfter;
	}

	armyFade() {
		const A = this.army;
		if (A.on && A.state !== 'fade') {
			A.state = 'fade';
			A.t = 0;
		}
	}

	_bez(t, out) {
		const A = this.army;
		const u = 1 - t;
		out.x = u * u * A.p0.x + 2 * u * t * A.p1.x + t * t * A.p2.x;
		out.z = u * u * A.p0.z + 2 * u * t * A.p1.z + t * t * A.p2.z;
		return out;
	}

	_bezD(t, out) {
		const A = this.army;
		out.x = 2 * (1 - t) * (A.p1.x - A.p0.x) + 2 * t * (A.p2.x - A.p1.x);
		out.z = 2 * (1 - t) * (A.p1.z - A.p0.z) + 2 * t * (A.p2.z - A.p1.z);
		out.y = 0;
		const l = Math.hypot(out.x, out.z) || 1;
		out.x /= l;
		out.z /= l;
		return out;
	}

	_army(dt) {
		const A = this.army;
		const M = this.soldiers;
		if (!A.on) {
			M.count = 0;
			return;
		}
		A.t += dt;
		const gap = 0.19 / A.len;
		let alive = 0;
		if (A.state === 'march') A.head = Math.min(1 + (A.rows - 1) * gap, A.head + dt * A.speed * (1 + (A.rows - 1) * gap));
		if (A.state === 'fade' || A.state === 'retreat' || (A.state === 'charge' && A.t > 0.45) || (A.state === 'cheer' && A.t > A.cheerLife)) A.fade = Math.max(0, A.fade - dt * 2.2);
		const k = 1 - Math.exp(-dt * 12);
		for (let i = 0; i < A.n; i++) {
			const s = this.sold[i];
			let moving = 0;
			if (A.state === 'march' || A.state === 'hold' || A.state === 'cheer') {
				const t = clamp(A.head - s.row * gap, 0, 1);
				this._bez(t, s.p);
				this._bezD(t, s.dir);
				s.p.x += -s.dir.z * s.lat;
				s.p.z += s.dir.x * s.lat;
				moving = t > 0 && t < 1 ? 1 : 0;
				s.yaw = Math.atan2(s.dir.x, s.dir.z);
			} else if (A.state === 'charge') {
				// hedefe koş, sıra sıra
				const dx = A.goal.x - s.p.x;
				const dz = A.goal.z - s.p.z;
				const d = Math.hypot(dx, dz);
				if (d > 0.3 && A.t > s.row * 0.03) {
					const sp = Math.min(d, dt * 4.5);
					s.p.x += (dx / d) * sp;
					s.p.z += (dz / d) * sp;
					s.yaw = Math.atan2(dx, dz);
					moving = 1;
				}
			} else if (A.state === 'retreat') {
				s.yaw = Math.atan2(-s.dir.x, -s.dir.z);
				s.p.x -= s.dir.x * dt * 1.6;
				s.p.z -= s.dir.z * dt * 1.6;
				moving = 1;
			}
			s.walk += ((moving ? 1 : 0) - s.walk) * k;
			const gy = this.ground(s.p.x, s.p.z);
			s.y += (gy - s.y) * Math.min(1, dt * 14);
			let hop = 0;
			if (A.state === 'cheer') hop = Math.max(0, Math.sin(A.t * 11 + s.ph)) * 0.07;
			_v.set(s.p.x, s.y + hop, s.p.z);
			_q.setFromAxisAngle(UP, s.yaw);
			const sc = this._unitScale;
			_s.set(sc, sc, sc);
			_m.compose(_v, _q, _s);
			M.setMatrixAt(alive, _m);
			M.setColorAt(alive, A.color);
			const o = alive * 4;
			M.iVar.array[o] = s.ph;
			M.iVar.array[o + 1] = s.walk;
			M.iVar.array[o + 2] = s.banner ? 1 : 0;
			M.iVar.array[o + 3] = A.fade;
			alive++;
		}
		M.count = A.fade > 0.001 ? alive : 0;
		if (A.state === 'march' && A.head >= 1 + (A.rows - 1) * gap - 1e-4) A.state = 'hold';
		if (A.fade <= 0.001 && A.state !== 'march' && A.state !== 'hold') {
			A.on = false;
			A.state = 'off';
		}
		M.instanceMatrix.needsUpdate = true;
		M.instanceColor.needsUpdate = true;
		M.iVar.needsUpdate = true;
	}

	_machines(dt) {
		const M = this.machines;
		const A = this.army;
		let n = 0;
		for (const c of this.cats) {
			if (!c.on) continue;
			c.fade = Math.min(1, c.fade + dt * 3);
			if (!A.on || A.fade < 1) c.fade = Math.min(c.fade, A.on ? A.fade : 0);
			if (c.fire >= 0) {
				c.fire += dt;
				// kol fırlar (0.12 sn), sonra yavaşça geri kurulur
				const f = c.fire;
				c.arm = f < 0.12 ? -0.95 + (f / 0.12) * 2.25 : Math.max(-0.95, 1.3 - (f - 0.12) * 2.6);
				if (f > 1.2) c.fire = -1;
			}
			if (!A.on && c.fade <= 0.001) {
				c.on = false;
				continue;
			}
			_v.copy(c.p);
			_q.setFromAxisAngle(UP, c.yaw);
			const sc = this._catScale;
			_s.set(sc, sc, sc);
			_m.compose(_v, _q, _s);
			M.setMatrixAt(n, _m);
			M.setColorAt(n, A.color);
			const o = n * 4;
			M.iVar.array[o] = 0;
			M.iVar.array[o + 1] = 0.5;
			M.iVar.array[o + 2] = c.arm;
			M.iVar.array[o + 3] = c.fade;
			n++;
		}
		// fetih sancakları
		const S = this.standards;
		let m = 0;
		for (const s of this.stds) {
			if (!s.on) continue;
			s.age += dt;
			const t = s.age;
			// yerden fırlar, hafif taşar, yerleşir; ömrünün sonunda iner
			let y;
			if (t < 0.6) {
				const u = t / 0.6;
				y = -2.2 + 2.2 * (1 - Math.pow(1 - u, 3)) + Math.sin(u * Math.PI) * 0.25;
			} else y = 0;
			const down = Math.max(0, t - s.life) / 0.6;
			y -= 2.4 * down * down;
			if (down >= 1) {
				s.on = false;
				continue;
			}
			_v.set(s.p.x, s.p.y + y, s.p.z);
			_q.setFromAxisAngle(UP, s.yaw + Math.sin(t * 0.7) * 0.15);
			const sc = this._stdScale;
			_s.set(sc, sc, sc);
			_m.compose(_v, _q, _s);
			S.setMatrixAt(m, _m);
			S.setColorAt(m, s.c);
			const o = m * 4;
			S.iVar.array[o] = 1.3;
			S.iVar.array[o + 1] = 1;
			S.iVar.array[o + 2] = 0;
			S.iVar.array[o + 3] = 1;
			m++;
		}
		M.count = n;
		S.count = m;
		if (n) {
			M.instanceMatrix.needsUpdate = true;
			M.instanceColor.needsUpdate = true;
			M.iVar.needsUpdate = true;
		}
		if (m) {
			S.instanceMatrix.needsUpdate = true;
			S.instanceColor.needsUpdate = true;
			S.iVar.needsUpdate = true;
		}
	}

	// ============================================================ kare

	update(dt) {
		this.time += dt;
		// zaman çizelgesi
		for (const e of this.timeline) {
			if (!e.on) continue;
			e.t -= dt;
			if (e.t <= 0) {
				e.on = false;
				const fn = e.fn;
				e.fn = null;
				fn?.();
			}
		}
		for (const a of this.anims) {
			if (!a.on) continue;
			a.t += dt;
			const u = Math.min(1, a.t / a.dur);
			a.fn(u);
			if (u >= 1) {
				a.on = false;
				const d = a.done;
				a.fn = a.done = null;
				d?.();
			}
		}
		this._army(dt);
		this._machines(dt);
		this._emitters(dt);
		this._rocks(dt);
		this._parts(dt);
		this._waves(dt);
		if (this._warm) this._warm = false;
		this.soldiers.visible = this.soldiers.count > 0;
		this.machines.visible = this.machines.count > 0;
		this.standards.visible = this.standards.count > 0;
		this.rockMesh.visible = this.rockMesh.count > 0;
		this.partMesh.visible = this.partMesh.geometry.instanceCount > 0;
		this.waveMesh.visible = this.waveMesh.geometry.instanceCount > 0;
	}

	get busy() {
		return this.np > 0 || this.army.on || this.rocks.some((r) => r.on) || this.waves.some((w) => w.on) || this.emitters.some((e) => e.on);
	}

	_emitters(dt) {
		for (const e of this.emitters) {
			if (!e.on) continue;
			e.age += dt;
			if (e.age < 0) continue;
			if (e.kind === 'arrow') {
				// balistik ok: alev izi; varınca kıvılcım
				const u = Math.min(1, e.age / e.life);
				const px = e.p.x;
				const py = e.p.y;
				const pz = e.p.z;
				e.p.lerpVectors(e.a, e.b, u);
				e.p.y += 4 * e.h * u * (1 - u);
				const vx = (e.p.x - px) / Math.max(dt, 1e-3);
				const vy = (e.p.y - py) / Math.max(dt, 1e-3);
				const vz = (e.p.z - pz) / Math.max(dt, 1e-3);
				_c.setRGB(3.2, 1.3, 0.35);
				let o = this.emit(e.p.x, e.p.y, e.p.z, vx, vy, vz, 0.06, 0.045, 0.045, _c, 1, STREAK, 1);
				if (o >= 0) this.P[o + STR] = 0.1;
				_c.setRGB(2.4, 0.8, 0.15);
				o = this.emit(e.p.x, e.p.y, e.p.z, rr(-0.2, 0.2), rr(0, 0.4), rr(-0.2, 0.2), rr(0.25, 0.4), 0.07, 0.01, _c, 0.8, GLOW, 1, 1, -0.5);
				if (u >= 1) {
					e.on = false;
					this.sparks(e.b, 5, 1.6, 0xffb050, 2.4, 0.05, 4);
					_c.setRGB(0.45, 0.42, 0.4);
					this.emit(e.b.x, e.b.y, e.b.z, 0, 0.5, 0, 0.8, 0.08, 0.3, _c, 0.6, SMOKE, 0, 1);
				}
			} else if (e.kind === 'smoke') {
				e.acc += dt * e.rate * (1 - e.age / e.life);
				while (e.acc >= 1) {
					e.acc -= 1;
					_c.setRGB(0.32, 0.3, 0.3);
					const o = this.emit(e.p.x + rr(-0.15, 0.15), e.p.y, e.p.z + rr(-0.15, 0.15), rr(-0.15, 0.15) + 0.25, rr(0.7, 1.2), rr(-0.15, 0.15), rr(1.4, 2.2), 0.18, 0.75, _c, 0.6, SMOKE, 0, 0.5, -0.1);
					if (o >= 0) this.P[o + SPIN] = rr(-0.6, 0.6);
					if (rnd() < 0.5) {
						_c.setRGB(3, 1.1, 0.2);
						this.emit(e.p.x + rr(-0.12, 0.12), e.p.y - 0.05, e.p.z + rr(-0.12, 0.12), 0, rr(0.5, 1), 0, rr(0.25, 0.45), 0.16, 0.04, _c, 0.9, GLOW, 1, 0.5, -0.4);
					}
				}
				if (e.age >= e.life) e.on = false;
			} else if (e.kind === 'show') {
				// havai fişek gösterisi: düzensiz aralıkla roket
				e.acc -= dt;
				if (e.acc <= 0 && e.age < e.life) {
					e.acc = rr(0.14, 0.32);
					const r = this._emitter('rocket');
					if (r) {
						const a = rnd() * 6.28;
						const d = Math.sqrt(rnd()) * e.k;
						r.a.set(e.p.x + Math.cos(a) * d, e.p.y, e.p.z + Math.sin(a) * d * 0.6);
						r.p.copy(r.a);
						// tepe yüksekliği ~h: v = √(2gh), süre v/g
						const vy = Math.sqrt(2 * 9 * e.h * rr(0.75, 1.05));
						r.v.set(rr(-0.8, 0.8), vy, rr(-0.8, 0.8));
						r.life = (vy / 9) * rr(0.85, 0.98);
						r.c.set(e.colors[(Math.random() * e.colors.length) | 0]);
						r.c2.set(e.colors[(Math.random() * e.colors.length) | 0]);
						r.h = rr(0.8, 1.2) * (e.h / 4.5);
					}
				}
				if (e.age >= e.life) e.on = false;
			} else if (e.kind === 'rocket') {
				e.v.y -= 9 * dt;
				e.p.addScaledVector(e.v, dt);
				_c.setRGB(3, 2, 1.2);
				let o = this.emit(e.p.x, e.p.y, e.p.z, e.v.x, e.v.y, e.v.z, 0.05, 0.06, 0.06, _c, 1, STREAK, 1);
				if (o >= 0) this.P[o + STR] = 0.06;
				_c.setRGB(2.2, 1.2, 0.4);
				o = this.emit(e.p.x, e.p.y, e.p.z, rr(-0.3, 0.3), rr(-0.6, 0), rr(-0.3, 0.3), rr(0.35, 0.7), 0.05, 0.01, _c, 0.8, STAR, 1, 1, 1.5);
				if (e.age >= e.life) {
					e.on = false;
					this._boom(e.p, e.c, e.c2, e.h);
				}
			}
		}
	}

	_boom(p, c1, c2, k) {
		const n = this.tier.id === 0 ? 46 : 80;
		const sp = 8.5 * k;
		for (let i = 0; i < n; i++) {
			// küresel dağılım + hafif halka
			const u = rr(-1, 1);
			const a = rnd() * 6.28;
			const s = Math.sqrt(1 - u * u);
			const m = sp * (0.85 + 0.15 * rnd());
			_c.copy(i & 1 ? c1 : c2).multiplyScalar(1.7);
			const o = this.emit(p.x, p.y, p.z, Math.cos(a) * s * m, u * m, Math.sin(a) * s * m, rr(1.1, 1.7), 0.075, 0.025, _c, 1, STREAK, 1, 1.7, 2.4);
			if (o >= 0) this.P[o + STR] = 0.11;
		}
		_c.copy(c1).multiplyScalar(2.5);
		this.emit(p.x, p.y, p.z, 0, 0, 0, 0.4, 0.4 * k, 1 * k, _c, 0.45, GLOW, 1);
		_c.setRGB(4, 3.6, 3);
		this.emit(p.x, p.y, p.z, 0, 0, 0, 0.15, 0.2 * k, 0.4 * k, _c, 0.8, STAR, 1);
	}

	_rocks(dt) {
		const M = this.rockMesh;
		let n = 0;
		for (const r of this.rocks) {
			if (!r.on) continue;
			r.age += dt;
			if (r.fly) {
				const f = r.fly;
				const u = Math.min(1, r.age / f.T);
				const px = r.p.x;
				const py = r.p.y;
				const pz = r.p.z;
				r.p.lerpVectors(f.a, f.b, u);
				r.p.y += 4 * f.h * u * (1 - u);
				// alevli iz
				_c.setRGB(3, 1.2, 0.25);
				this.emit(r.p.x, r.p.y, r.p.z, (r.p.x - px) * 4, (r.p.y - py) * 4, (r.p.z - pz) * 4, 0.22, r.s * 1.2, r.s * 0.3, _c, 0.9, GLOW, 1, 3, 0);
				_c.setRGB(0.4, 0.37, 0.35);
				const o = this.emit(r.p.x, r.p.y, r.p.z, rr(-0.2, 0.2), rr(0.1, 0.4), rr(-0.2, 0.2), rr(0.6, 1), r.s * 1.2, r.s * 3.2, _c, 0.5, SMOKE, 0, 1);
				if (o >= 0) this.P[o + SPIN] = rr(-1, 1);
				if (u >= 1) {
					r.on = false;
					r.fly = null;
					const cb = f.onHit;
					f.onHit = null;
					this.impact(f.b, 0.6);
					cb?.(f.b);
					continue;
				}
			} else {
				// enkaz: yerçekimi, sekme, sürtünme
				r.v.y -= 9.8 * dt;
				r.p.addScaledVector(r.v, dt);
				if (r.p.y < r.floor + r.s * 0.5) {
					r.p.y = r.floor + r.s * 0.5;
					if (r.v.y < -0.8 && r.bounce < 2) {
						r.v.y *= -0.35;
						r.v.x *= 0.55;
						r.v.z *= 0.55;
						r.w.multiplyScalar(0.5);
						r.bounce++;
						if (r.bounce === 1 && r.s > 0.07) {
							_c.setRGB(0.75, 0.68, 0.55);
							const o = this.emit(r.p.x, r.p.y, r.p.z, rr(-0.3, 0.3), 0.3, rr(-0.3, 0.3), 0.7, r.s * 1.5, r.s * 4, _c, 0.6, SMOKE, 0, 2);
							if (o >= 0) this.P[o + SPIN] = rr(-1, 1);
						}
					} else {
						r.v.set(0, 0, 0);
						r.w.multiplyScalar(0.9);
					}
				}
				if (r.age >= r.life) {
					r.on = false;
					continue;
				}
			}
			// dönüş
			const wl = r.w.length();
			if (wl > 1e-3) {
				_q2.setFromAxisAngle(_w.copy(r.w).divideScalar(wl), wl * dt);
				r.q.premultiply(_q2);
			}
			const shrink = r.fly ? 1 : clamp((r.life - r.age) / 0.4, 0, 1);
			_s.setScalar(r.s * shrink);
			_m.compose(r.p, r.q, _s);
			M.setMatrixAt(n, _m);
			M.setColorAt(n, r.c);
			n++;
		}
		M.count = n;
		if (n) {
			M.instanceMatrix.needsUpdate = true;
			M.instanceColor.needsUpdate = true;
		}
	}

	/** Çarpma: toz, kıvılcım, küçük enkaz, sarsıntı. */
	impact(p, k = 1) {
		this.dust(p, Math.round(8 * k + 4), 0.6 * k + 0.3, 0xcdbb98, 0.8);
		this.sparks(p, Math.round(10 * k + 4), 3.5 * k, 0xffb35a, 2.6, 0.06, 5);
		_c.setRGB(3, 1.8, 0.8);
		this.emit(p.x, p.y + 0.1, p.z, 0, 0, 0, 0.22, 0.2 * k, 0.65 * k, _c, 0.9, GLOW, 1);
		this.debris(p, Math.round(4 * k), 2.6 * k, 0.07, 0xd9c7a4, 0x8b7a66);
		this.shake(0.35 + 0.35 * k);
	}

	_parts(dt) {
		const P = this.P;
		const aP = this.aP.array;
		const aC = this.aC.array;
		const aM = this.aM.array;
		const aV = this.aV.array;
		let n = 0;
		const T = this.time;
		for (let i = 0; i < this.np; i++) {
			const o = i * PF;
			const age = P[o + AGE] + dt;
			const life = P[o + LIFE];
			if (age >= life) continue;
			// sıkıştır: canlıları başa taşı
			const d = n * PF;
			if (d !== o) for (let k = 0; k < PF; k++) P[d + k] = P[o + k];
			P[d + AGE] = age;
			const drag = Math.exp(-P[d + DRAG] * dt);
			P[d + VX] *= drag;
			P[d + VY] = P[d + VY] * drag - P[d + GRAV] * dt;
			P[d + VZ] *= drag;
			const fl = P[d + FLUT];
			let fx = 0;
			let fz = 0;
			if (fl > 0) {
				fx = Math.sin(T * 3 * fl + P[d + ROT]) * 0.6 * fl;
				fz = Math.cos(T * 2.3 * fl + P[d + ROT] * 1.3) * 0.6 * fl;
			}
			P[d + X] += (P[d + VX] + fx) * dt;
			P[d + Y] += P[d + VY] * dt;
			P[d + Z] += (P[d + VZ] + fz) * dt;
			P[d + ROT] += P[d + SPIN] * dt;
			const u = age / life;
			const fin = Math.min(1, u / P[d + FIN]);
			const fout = 1 - u * u;
			const e = 1 - (1 - u) * (1 - u);
			const q4 = n * 4;
			aP[q4] = P[d + X];
			aP[q4 + 1] = P[d + Y];
			aP[q4 + 2] = P[d + Z];
			aP[q4 + 3] = P[d + S0] + (P[d + S1] - P[d + S0]) * e;
			aC[q4] = P[d + CR];
			aC[q4 + 1] = P[d + CG];
			aC[q4 + 2] = P[d + CB];
			aC[q4 + 3] = P[d + A0] * fin * fout;
			aM[q4] = P[d + ROT];
			aM[q4 + 1] = P[d + SHAPE];
			aM[q4 + 2] = P[d + ADD];
			aM[q4 + 3] = P[d + STR];
			const q3 = n * 3;
			aV[q3] = P[d + VX];
			aV[q3 + 1] = P[d + VY];
			aV[q3 + 2] = P[d + VZ];
			n++;
		}
		this.np = n;
		this.partMesh.geometry.instanceCount = n;
		if (n) {
			for (const a of [this.aP, this.aC, this.aM]) {
				a.clearUpdateRanges();
				a.addUpdateRange(0, n * 4);
				a.needsUpdate = true;
			}
			this.aV.clearUpdateRanges();
			this.aV.addUpdateRange(0, n * 3);
			this.aV.needsUpdate = true;
		}
	}

	_waves(dt) {
		const A = this.wA.array;
		const B = this.wB.array;
		const D = this.wD.array;
		let n = 0;
		for (const w of this.waves) {
			if (!w.on) continue;
			w.age += dt;
			const u = w.age / w.life;
			if (u >= 1) {
				w.on = false;
				continue;
			}
			const e = 1 - Math.pow(1 - u, 3);
			const o = n * 4;
			A[o] = w.x;
			A[o + 1] = w.y;
			A[o + 2] = w.z;
			let a = w.a;
			if (w.mode === 0) {
				A[o + 3] = w.r0 + (w.r1 - w.r0) * e;
				a *= 1 - u * u;
			} else if (w.mode === 1) {
				// kalkan: hızla açılır, parlar, söner
				A[o + 3] = w.r0 + (w.r1 - w.r0) * Math.min(1, u * 5);
				a *= Math.min(1, u * 8) * (1 - Math.pow(u, 3));
			} else {
				A[o + 3] = w.r0 + (w.r1 - w.r0) * e;
				a *= Math.min(1, u * 6) * (1 - u);
			}
			B[o] = w.c.r;
			B[o + 1] = w.c.g;
			B[o + 2] = w.c.b;
			B[o + 3] = a;
			D[o] = w.mode;
			D[o + 1] = u;
			D[o + 2] = w.h;
			D[o + 3] = w.th;
			n++;
		}
		this.waveMesh.geometry.instanceCount = n;
		if (n) {
			this.wA.needsUpdate = true;
			this.wB.needsUpdate = true;
			this.wD.needsUpdate = true;
		}
	}
}
