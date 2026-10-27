// Minyatür sahil kasabası: ada zemini (kaldırım, meydan, çimen, kumsal), deniz, gök, oyuncak evler,
// ağaçlar, fenerler. Bütün sabit yapılar tek bir geometride birleşir (tek çizim), köşe
// renginde ortam örtmesi (AO) taşır. Zemin, yolların ve gölgelerin boyandığı bir haritadan çizilir.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COMMON, SHADOW, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { rng } from '../core/math.js';

export const ISLAND = { half: 34, corner: 11, size: 92 };

/** Adanın yuvarlatılmış dikdörtgen sınırına işaretli uzaklık (içeride negatif). */
export function islandSD(x, z) {
	const h = ISLAND.half - ISLAND.corner;
	const qx = Math.abs(x) - h;
	const qz = Math.abs(z) - h;
	const ox = Math.max(qx, 0);
	const oz = Math.max(qz, 0);
	return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - ISLAND.corner;
}

// ------------------------------------------------------------------ malzemeler

const CITY_VS = /* glsl */ `
attribute vec4 color;
attribute float mat;
varying vec3 vW;
varying vec3 vN;
varying vec4 vC;
varying float vM;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vC = color;
	vM = mat;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const CITY_FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
varying vec4 vC;
varying float vM;
void main() {
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	float sh = shadowAt(vW, N);
	vec3 alb = vC.rgb;
	float gloss = 0.12;
	float rim = 0.35;
	if (vM > 0.5 && vM < 1.5) {
		// cam: koyu mavi, gökyüzünü yansıtır
		gloss = 1.0;
		rim = 0.0;
	} else if (vM > 1.5 && vM < 2.5) {
		// yaprak: hafif yumuşak ışık geçirgenliği
		alb *= 0.9 + 0.2 * vnoise(vW.xz * 1.7 + vW.y);
		rim = 0.9;
	} else if (vM > 2.5) {
		// boyalı ahşap / kiremit: hafif desen
		alb *= 0.92 + 0.12 * vnoise(vec2(vW.x + vW.z, vW.y) * vec2(2.0, 7.0));
		gloss = 0.25;
	}
	vec3 c = shade(alb, N, V, vC.a, sh, gloss, rim);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const GROUND_VS = /* glsl */ `
varying vec3 vW;
varying vec2 vUv;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vUv = uv;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const GROUND_FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
uniform sampler2D uMap; // r kaldırım, g meydan taşı, b kumsal
uniform sampler2D uAO;
uniform float uWorld;
varying vec3 vW;
varying vec2 vUv;
// arnavut kaldırımı: sıra sıra kaydırılmış, köşeleri yuvarlak taşlar
vec3 cobble(vec2 p, out float mortar) {
	p *= 1.9;
	float row = floor(p.y);
	p.x += hash12(vec2(row, 3.1)) * 0.9 + row * 0.5;
	vec2 cell = floor(p);
	vec2 f = fract(p) - 0.5;
	float h = hash12(cell);
	vec2 e = abs(f) * vec2(1.0, 1.15);
	float d = max(e.x, e.y);
	mortar = smoothstep(0.36, 0.48, d + 0.04 * vnoise(p * 7.0));
	vec3 col = mix(vec3(0.74, 0.66, 0.56), vec3(0.86, 0.79, 0.68), h);
	col = mix(col, vec3(0.68, 0.62, 0.6), step(0.82, h) * 0.6);
	return col * (0.94 + 0.12 * (0.5 - d));
}
vec3 tiles(vec2 p, out float grout) {
	p *= 0.62;
	vec2 cell = floor(p);
	vec2 f = abs(fract(p) - 0.5);
	grout = smoothstep(0.44, 0.49, max(f.x, f.y));
	float chk = mod(cell.x + cell.y, 2.0);
	vec3 a = vec3(0.93, 0.88, 0.8);
	vec3 b = vec3(0.86, 0.62, 0.48);
	return mix(a, b, chk * 0.55) * (0.95 + 0.08 * hash12(cell));
}
void main() {
	vec2 uv = vW.xz / uWorld + 0.5;
	vec4 m = texture2D(uMap, uv);
	float ao = texture2D(uAO, uv).r;
	vec3 N = vec3(0.0, 1.0, 0.0);
	// çimen: biçilmiş çim şeritleri ve renk dalgası
	float stripe = step(0.5, fract(dot(vW.xz, vec2(0.7071, 0.7071)) * 0.22));
	vec3 grass = mix(vec3(0.34, 0.72, 0.26), vec3(0.42, 0.8, 0.3), stripe * 0.6 + 0.4 * vnoise(vW.xz * 0.35));
	grass *= 0.9 + 0.15 * vnoise(vW.xz * 3.1);
	float mortar, grout;
	vec3 road = cobble(vW.xz, mortar);
	road = mix(road, road * 0.55, mortar);
	vec3 plaza = tiles(vW.xz, grout);
	plaza = mix(plaza, plaza * 0.7, grout);
	vec3 sand = vec3(0.98, 0.86, 0.6) * (0.94 + 0.08 * vnoise(vW.xz * 2.3));
	vec3 alb = grass;
	// yol kenarı: çimenden kaldırıma yumuşak geçiş, kenarda bordür
	float r = smoothstep(0.35, 0.6, m.r);
	float curb = (1.0 - smoothstep(0.0, 0.12, abs(m.r - 0.45))) * 0.8;
	alb = mix(alb, road, r);
	alb = mix(alb, vec3(0.95, 0.93, 0.88), curb);
	alb = mix(alb, plaza, smoothstep(0.4, 0.6, m.g));
	alb = mix(alb, sand, smoothstep(0.3, 0.7, m.b));
	// kumsal suya yaklaştıkça ıslak ve koyu
	float wet = smoothstep(-0.55, -0.95, vW.y);
	alb = mix(alb, alb * vec3(0.72, 0.68, 0.62), wet);
	float sh = shadowAt(vW, N);
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), mix(0.42, 1.0, ao), sh, 0.06 + wet * 0.4, 0.0);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const SEA_VS = /* glsl */ `
varying vec3 vW;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SEA_FS = /* glsl */ `
${COMMON}
${LIGHT}
${FINISH}
uniform vec3 uSea, uSeaDeep;
uniform vec4 uIsland; // x yarı boy - köşe, y köşe yarıçapı
varying vec3 vW;
float islandSD(vec2 p) {
	vec2 q = abs(p) - uIsland.x;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uIsland.y;
}
void main() {
	vec2 p = vW.xz;
	float d = islandSD(p);
	float t = uTime;
	// dalgalar: birkaç yönlü sinüs + gürültü (yalnızca normal)
	vec2 g = vec2(0.0);
	g += vec2(0.6, 0.8) * cos(dot(p, vec2(0.6, 0.8)) * 0.9 + t * 1.3) * 0.08;
	g += vec2(-0.8, 0.5) * cos(dot(p, vec2(-0.8, 0.5)) * 1.7 + t * 1.9) * 0.05;
	g += vec2(0.2, -1.0) * cos(dot(p, vec2(0.2, -1.0)) * 3.1 + t * 2.6) * 0.03;
	g += (vec2(vnoise(p * 1.3 + t * 0.4), vnoise(p * 1.3 - t * 0.37)) - 0.5) * 0.12;
	vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
	vec3 V = normalize(cameraPosition - vW);
	// sığdan derine: kıyıda turkuaz, açıkta koyu mavi
	float shallow = 1.0 - smoothstep(0.0, 14.0, d);
	vec3 base = mix(uSeaDeep, uSea, shallow * 0.85 + 0.15);
	base = mix(base, vec3(0.55, 0.95, 0.9), (1.0 - smoothstep(0.0, 3.5, d)) * 0.5);
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
	vec3 R = reflect(-V, N);
	vec3 c = base * (uSkyTop * 0.9 + uSunCol * 0.32 * max(dot(N, uSunDir), 0.0));
	c = mix(c, skyReflect(R), fres * 0.8);
	vec3 H = normalize(uSunDir + V);
	c += uSunCol * pow(max(dot(N, H), 0.0), 220.0) * 2.5;
	// kıyı köpüğü: kıyıya paralel kayan bantlar
	float foamBand = 1.0 - smoothstep(0.0, 2.6, d);
	float wave = sin(d * 3.2 - t * 2.2 + vnoise(p * 0.8) * 3.0) * 0.5 + 0.5;
	float foam = foamBand * smoothstep(0.55, 0.9, wave) * (0.6 + 0.4 * vnoise(p * 4.0 + t));
	foam += (1.0 - smoothstep(-0.2, 0.6, d)) * 0.8;
	c = mix(c, vec3(1.0) * (uSkyTop + uSunCol * 0.35), clamp(foam, 0.0, 1.0));
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const SKY_VS = /* glsl */ `
varying vec3 vD;
void main() {
	vD = position;
	vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
	gl_Position = p.xyww;
}`;

const SKY_FS = /* glsl */ `
${COMMON}
${FINISH}
uniform vec3 uZenith, uHorizon, uSunGlow;
varying vec3 vD;
void main() {
	vec3 d = normalize(vD);
	float h = max(d.y, 0.0);
	vec3 c = mix(uHorizon, uZenith, pow(h, 0.55));
	float s = max(dot(d, uSunDir), 0.0);
	c += uSunGlow * (pow(s, 8.0) * 0.35 + pow(s, 64.0) * 0.6);
	c += vec3(1.0, 0.98, 0.92) * smoothstep(0.9985, 0.9993, s) * 4.0;
	// yumuşak bulut kuşağı
	vec2 q = d.xz / max(d.y + 0.15, 0.05);
	float cl = vnoise(q * 0.9 + uTime * 0.01) * 0.6 + vnoise(q * 2.3 - uTime * 0.015) * 0.4;
	cl = smoothstep(0.55, 0.85, cl) * smoothstep(0.02, 0.25, d.y) * (1.0 - smoothstep(0.35, 0.8, d.y));
	c = mix(c, vec3(1.0, 1.0, 1.0) * 1.15, cl * 0.75);
	gl_FragColor = finish(c, 1.0);
}`;

// ------------------------------------------------------------------ geometri yardımcıları

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

class Kit {
	constructor() {
		this.parts = [];
	}
	/** geometriyi yerleştir ve renk/malzeme ver. ao(y) yüksekliğe göre örtme */
	put(geo, x, y, z, yaw, col, mat = 0, { sx = 1, sy = 1, sz = 1, rx = 0, rz = 0, aoBase = 0.62, aoH = 1.2 } = {}) {
		const g = geo.index ? geo.toNonIndexed() : geo.clone();
		_e.set(rx, yaw, rz, 'YXZ');
		_q.setFromEuler(_e);
		_m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
		g.applyMatrix4(_m);
		const pos = g.getAttribute('position');
		const n = pos.count;
		const c = new Float32Array(n * 4);
		const m = new Float32Array(n).fill(mat);
		const cc = col instanceof THREE.Color ? col : new THREE.Color(col);
		for (let i = 0; i < n; i++) {
			const py = pos.getY(i);
			const ao = aoBase + (1 - aoBase) * Math.min(1, Math.max(0, py / aoH));
			c[i * 4] = cc.r;
			c[i * 4 + 1] = cc.g;
			c[i * 4 + 2] = cc.b;
			c[i * 4 + 3] = ao;
		}
		g.setAttribute('color', new THREE.BufferAttribute(c, 4));
		g.setAttribute('mat', new THREE.BufferAttribute(m, 1));
		g.deleteAttribute('uv');
		this.parts.push(g);
	}
	build() {
		const g = mergeGeometries(this.parts, false);
		g.computeBoundingSphere();
		return g;
	}
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const BOX_B = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
// üçgen çatı prizması: genişlik x, yükseklik y, derinlik z (taban y=0)
const ROOF = (() => {
	const s = new THREE.Shape();
	s.moveTo(-0.5, 0);
	s.lineTo(0.5, 0);
	s.lineTo(0, 1);
	s.lineTo(-0.5, 0);
	const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
	g.translate(0, 0, -0.5);
	return g;
})();
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0);
const CYL16 = new THREE.CylinderGeometry(0.5, 0.5, 1, 20).translate(0, 0.5, 0);
const BLOB = new THREE.IcosahedronGeometry(1, 1);
const BALL = new THREE.IcosahedronGeometry(0.5, 1);

const WALLS = [0xfff1dc, 0xffd9c2, 0xcfe8ff, 0xfff4b8, 0xd9f2d0, 0xffc9d6, 0xf4e1ff, 0xffe3a8];
const ROOFS = [0xe0623e, 0xd8513a, 0xc94a36, 0x3f7fd0, 0x4a9a6a, 0xe58a3a];
const DOORS = [0x7a4a2a, 0x2f6aa8, 0x3f8a5a, 0xa83a3a];

// Oyuncak ev. S: ölçek (taşlar şehrin yıldızı: evler domino boyunun 2-3 katı).
function house(kit, R, x, z, yaw, w, d, floors, S = 0.62) {
	const FH = 1.7 * S;
	const H = floors * FH + 0.4 * S;
	const wall = R.pick(WALLS);
	const roof = R.pick(ROOFS);
	kit.put(BOX_B, x, 0, z, yaw, wall, 3, { sx: w, sy: H, sz: d, aoH: 1.2 * S });
	// saçak ve çatı
	kit.put(BOX_B, x, H - 0.05 * S, z, yaw, 0xf7f2ea, 0, { sx: w + 0.3 * S, sy: 0.18 * S, sz: d + 0.3 * S, aoBase: 1 });
	kit.put(ROOF, x, H + 0.1 * S, z, yaw, roof, 3, { sx: w + 0.5 * S, sy: Math.min(2.4 * S, w * 0.55), sz: d + 0.5 * S, aoBase: 1 });
	const c = Math.cos(yaw);
	const s = Math.sin(yaw);
	// pencereler ve kapı: yol tarafında (yerel +z)
	const perRow = Math.max(1, Math.floor(w / (1.4 * S)));
	for (let f = 0; f < floors; f++) {
		for (let k = 0; k < perRow; k++) {
			const lx = (k - (perRow - 1) / 2) * (w / perRow);
			const ly = 0.95 * S + f * FH;
			if (f === 0 && k === Math.floor(perRow / 2)) {
				const px = x + lx * c + (d / 2 + 0.03) * s;
				const pz = z - lx * s + (d / 2 + 0.03) * c;
				kit.put(BOX_B, px, 0, pz, yaw, R.pick(DOORS), 3, { sx: 0.7 * S, sy: 1.25 * S, sz: 0.1 * S });
				kit.put(BOX_B, px, 1.25 * S, pz, yaw, 0xffffff, 0, { sx: 0.9 * S, sy: 0.12 * S, sz: 0.14 * S, aoBase: 1 });
				continue;
			}
			const px = x + lx * c + (d / 2 + 0.04 * S) * s;
			const pz = z - lx * s + (d / 2 + 0.04 * S) * c;
			kit.put(BOX, px, ly, pz, yaw, 0xffffff, 0, { sx: 0.78 * S, sy: 0.92 * S, sz: 0.08 * S, aoBase: 1 });
			kit.put(BOX, px + 0.02 * S * s, ly, pz + 0.02 * S * c, yaw, 0x2c5a9a, 1, { sx: 0.6 * S, sy: 0.74 * S, sz: 0.06 * S, aoBase: 1 });
			kit.put(BOX, px + 0.06 * S * s, ly - 0.5 * S, pz + 0.06 * S * c, yaw, 0xffffff, 0, { sx: 0.86 * S, sy: 0.08 * S, sz: 0.2 * S, aoBase: 1 });
			if (R() < 0.35) kit.put(BALL, px + 0.12 * S * s, ly - 0.38 * S, pz + 0.12 * S * c, yaw, R.pick([0xff5a7a, 0xffd23a, 0xff8a3a]), 2, { sx: 0.7 * S, sy: 0.35 * S, sz: 0.3 * S, aoBase: 1 });
		}
	}
	if (R() < 0.6) kit.put(BOX_B, x + w * 0.25 * c, H + 0.4 * S, z - w * 0.25 * s, yaw, 0xd8c8b8, 0, { sx: 0.45 * S, sy: 1.5 * S, sz: 0.45 * S, aoBase: 0.8 });
}

function tree(kit, R, x, z, s = 1) {
	const h = 1.4 * s;
	kit.put(CYL, x, 0, z, 0, 0x8a5a3a, 0, { sx: 0.32 * s, sy: h, sz: 0.32 * s, aoBase: 0.5 });
	const greens = [0x4fb84a, 0x5cc85a, 0x3fa84a, 0x6ad06a];
	const base = R.pick(greens);
	kit.put(BLOB, x, h + 0.9 * s, z, R() * 6, base, 2, { sx: 1.35 * s, sy: 1.25 * s, sz: 1.35 * s, aoBase: 0.75, aoH: h + 2 * s });
	kit.put(BLOB, x + 0.6 * s, h + 0.55 * s, z + 0.3 * s, R() * 6, base, 2, { sx: 0.9 * s, sy: 0.85 * s, sz: 0.9 * s, aoBase: 0.72, aoH: h + 2 * s });
	kit.put(BLOB, x - 0.5 * s, h + 1.5 * s, z - 0.2 * s, R() * 6, base, 2, { sx: 0.85 * s, sy: 0.8 * s, sz: 0.85 * s, aoBase: 0.8, aoH: h + 2 * s });
}

function lamp(kit, x, z) {
	kit.put(CYL, x, 0, z, 0, 0x2f3a4a, 0, { sx: 0.1, sy: 1.7, sz: 0.1, aoBase: 0.6 });
	kit.put(BALL, x, 1.82, z, 0, 0xfff1b0, 1, { sx: 0.36, sy: 0.36, sz: 0.36, aoBase: 1 });
	kit.put(BOX_B, x, 2.02, z, 0, 0x2f3a4a, 0, { sx: 0.3, sy: 0.09, sz: 0.3, aoBase: 1 });
}

function fountain(kit, x, z) {
	kit.put(CYL16, x, 0, z, 0, 0xf2ead8, 0, { sx: 3.6, sy: 0.55, sz: 3.6, aoBase: 0.7, aoH: 0.55 });
	kit.put(CYL16, x, 0.47, z, 0, 0x3cc0e0, 1, { sx: 3.1, sy: 0.08, sz: 3.1, aoBase: 1 });
	kit.put(CYL16, x, 0, z, 0, 0xf2ead8, 0, { sx: 0.7, sy: 1.4, sz: 0.7, aoBase: 0.7 });
	kit.put(CYL16, x, 1.4, z, 0, 0xf2ead8, 0, { sx: 1.6, sy: 0.24, sz: 1.6, aoBase: 1 });
	kit.put(BALL, x, 1.85, z, 0, 0x7fe0ff, 1, { sx: 0.7, sy: 0.7, sz: 0.7, aoBase: 1 });
}

// ------------------------------------------------------------------ zemin haritası

function paintGround(level, roads, R) {
	const W = ISLAND.size;
	const N = 1024;
	const toPx = (v) => ((v + W / 2) / W) * N;
	const k = N / W;
	const cv = document.createElement('canvas');
	cv.width = cv.height = N;
	const g = cv.getContext('2d');
	g.fillStyle = '#000';
	g.fillRect(0, 0, N, N);
	// kumsal: ada kenarı
	g.fillStyle = 'rgb(0,0,255)';
	g.fillRect(0, 0, N, N);
	g.globalCompositeOperation = 'source-over';
	const isl = (inset, style) => {
		const h = ISLAND.half - inset;
		const r = Math.max(0.5, ISLAND.corner - inset * 0.6);
		g.fillStyle = style;
		g.beginPath();
		g.roundRect(toPx(-h), toPx(-h), h * 2 * k, h * 2 * k, r * k);
		g.fill();
	};
	isl(2.6, '#000');
	// meydanlar
	for (const p of level.plazas || []) {
		g.fillStyle = 'rgb(0,255,0)';
		g.beginPath();
		g.arc(toPx(p[0]), toPx(p[1]), p[2] * k, 0, Math.PI * 2);
		g.fill();
	}
	// yollar
	g.lineCap = 'round';
	g.lineJoin = 'round';
	g.strokeStyle = 'rgb(255,0,0)';
	const strokePath = (pts, w) => {
		const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
		const sp = curve.getSpacedPoints(Math.max(8, Math.ceil(curve.getLength() * 2)));
		g.lineWidth = w * k;
		g.beginPath();
		sp.forEach((p, i) => (i ? g.lineTo(toPx(p.x), toPx(p.z)) : g.moveTo(toPx(p.x), toPx(p.z))));
		g.stroke();
	};
	g.filter = 'blur(1.5px)'; // yol kenarı yumuşak: bordür çizgisi için geçiş payı
	for (const r of roads) strokePath(r.pts, r.w);
	for (const r of level.streets || []) strokePath(r, 3.2);
	g.filter = 'none';

	const tex = new THREE.CanvasTexture(cv);
	tex.colorSpace = THREE.NoColorSpace;
	tex.flipY = false;
	tex.anisotropy = 4;
	tex.minFilter = THREE.LinearMipmapLinearFilter;
	tex.generateMipmaps = true;
	return { tex, canvas: cv, toPx, k, N };
}

/** Ortam örtmesi haritası: evlerin, ağaçların ve domino dizilerinin altı yumuşak koyu. */
function paintAO(houses, trees, roads, toPx, k) {
	const N = 512;
	const s = N / 1024;
	const cv = document.createElement('canvas');
	cv.width = cv.height = N;
	const g = cv.getContext('2d');
	g.fillStyle = '#fff';
	g.fillRect(0, 0, N, N);
	g.filter = 'blur(6px)';
	g.fillStyle = 'rgba(0,0,0,0.75)';
	for (const h of houses) {
		g.save();
		g.translate(toPx(h.x) * s, toPx(h.z) * s);
		g.rotate(-h.yaw);
		g.fillRect((-h.w / 2 - 0.4) * k * s, (-h.d / 2 - 0.4) * k * s, (h.w + 0.8) * k * s, (h.d + 0.8) * k * s);
		g.restore();
	}
	g.filter = 'blur(5px)';
	g.fillStyle = 'rgba(0,0,0,0.45)';
	for (const t of trees) {
		g.beginPath();
		g.arc(toPx(t.x) * s, toPx(t.z) * s, 1.6 * t.s * k * s, 0, Math.PI * 2);
		g.fill();
	}
	g.filter = 'blur(2px)';
	g.strokeStyle = 'rgba(0,0,0,0.28)';
	g.lineCap = 'round';
	for (const r of roads) {
		const curve = new THREE.CatmullRomCurve3(r.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
		const sp = curve.getSpacedPoints(Math.max(8, Math.ceil(curve.getLength() * 2)));
		g.lineWidth = 0.9 * k * s;
		g.beginPath();
		sp.forEach((p, i) => (i ? g.lineTo(toPx(p.x) * s, toPx(p.z) * s) : g.moveTo(toPx(p.x) * s, toPx(p.z) * s)));
		g.stroke();
	}
	const tex = new THREE.CanvasTexture(cv);
	tex.colorSpace = THREE.NoColorSpace;
	tex.flipY = false;
	return tex;
}

// ------------------------------------------------------------------ kasaba

/**
 * level: {seed, plazas:[[x,z,r]], streets:[[[x,z]...]], fountain:[x,z], keepOut:[[x,z,r]]}
 * roads: zincir kurucunun bıraktığı yol izleri
 */
export function buildCity(G, tier, level, roads) {
	const R = rng(level.seed || 1);
	const taps = String(tier.shadowTaps);
	const group = new THREE.Group();
	const casters = [];

	// yol yakınlığı testi için örnek noktalar
	const samples = [];
	const addSamples = (pts) => {
		const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
		for (const p of curve.getSpacedPoints(Math.max(4, Math.ceil(curve.getLength() / 1.5)))) samples.push([p.x, p.z]);
	};
	for (const r of roads) addSamples(r.pts);
	for (const s of level.streets || []) addSamples(s);
	const nearRoad = (x, z, r) => samples.some((p) => (p[0] - x) ** 2 + (p[1] - z) ** 2 < r * r);
	const nearPlaza = (x, z, pad) => (level.plazas || []).some((p) => Math.hypot(p[0] - x, p[1] - z) < p[2] + pad);
	const keep = (x, z, r) => (level.keepOut || []).some((p) => Math.hypot(p[0] - x, p[1] - z) < p[2] + r);

	const kit = new Kit();
	const houses = [];
	const trees = [];
	// evler: yolların iki yanına, yola bakacak şekilde
	const occupied = [];
	const free = (x, z, r) => !occupied.some((o) => (o[0] - x) ** 2 + (o[1] - z) ** 2 < (o[2] + r) ** 2);
	for (const rd of [...roads.map((r) => r.pts), ...(level.streets || [])]) {
		const curve = new THREE.CatmullRomCurve3(rd.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
		const L = curve.getLength();
		const p = new THREE.Vector3();
		const t = new THREE.Vector3();
		for (let s = 1.5; s < L - 1.5; s += 2.8 + R() * 1.2) {
			curve.getPointAt(s / L, p);
			curve.getTangentAt(s / L, t);
			for (const side of [-1, 1]) {
				if (R() < 0.2) continue;
				const w = 1.7 + R() * 1.1;
				const d = 1.7 + R() * 0.7;
				const off = 1.3 + 0.8 + d / 2 + R() * 0.4;
				const nx = -t.z * side;
				const nz = t.x * side;
				const x = p.x + nx * off;
				const z = p.z + nz * off;
				const r = Math.max(w, d) * 0.62;
				if (islandSD(x, z) > -4.5 || nearRoad(x, z, r + 0.9) || nearPlaza(x, z, r) || keep(x, z, r) || !free(x, z, r)) continue;
				const yaw = Math.atan2(-nx, -nz); // ön yüz (+z yerel) yola baksın
				house(kit, R, x, z, yaw, w, d, 1 + (R() < 0.55 ? 1 : 0) + (R() < 0.15 ? 1 : 0));
				houses.push({ x, z, yaw, w, d });
				occupied.push([x, z, r]);
			}
		}
	}
	// ağaçlar: boş çimenlere
	for (let i = 0; i < 420; i++) {
		const x = (R() - 0.5) * (ISLAND.half * 2 - 6);
		const z = (R() - 0.5) * (ISLAND.half * 2 - 6);
		const s = 0.55 + R() * 0.45;
		if (islandSD(x, z) > -3.5 || nearRoad(x, z, 2.2) || nearPlaza(x, z, 1.6) || keep(x, z, 1.5) || !free(x, z, 1.4 * s)) continue;
		tree(kit, R, x, z, s);
		trees.push({ x, z, s });
		occupied.push([x, z, 1.3 * s]);
	}
	// fenerler: yol kenarında aralıklı
	for (const rd of roads) {
		const curve = new THREE.CatmullRomCurve3(rd.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
		const L = curve.getLength();
		const p = new THREE.Vector3();
		const t = new THREE.Vector3();
		for (let s = 6; s < L - 3; s += 11) {
			curve.getPointAt(s / L, p);
			curve.getTangentAt(s / L, t);
			const x = p.x - t.z * 1.65;
			const z = p.z + t.x * 1.65;
			if (!free(x, z, 0.4) || keep(x, z, 0.4)) continue;
			lamp(kit, x, z);
			occupied.push([x, z, 0.5]);
		}
	}
	if (level.fountain) fountain(kit, level.fountain[0], level.fountain[1]);

	const cityGeo = kit.build();
	const cityMat = new THREE.ShaderMaterial({ vertexShader: CITY_VS, fragmentShader: CITY_FS.replace('__TAPS__', taps), uniforms: { ...G } });
	const city = new THREE.Mesh(cityGeo, cityMat);
	city.matrixAutoUpdate = false;
	group.add(city);
	casters.push(new THREE.Mesh(cityGeo, new THREE.ShaderMaterial({ vertexShader: CITY_VS, fragmentShader: 'void main(){gl_FragColor=vec4(1.0);}' })));

	// zemin: ada düz, kenarda kumsal denize iner
	const gm = paintGround(level, roads, R);
	const ao = paintAO(houses, trees, roads, gm.toPx, gm.k);
	const segs = tier.id === 0 ? 120 : 160;
	const gg = new THREE.PlaneGeometry(ISLAND.size, ISLAND.size, segs, segs).rotateX(-Math.PI / 2);
	const pos = gg.getAttribute('position');
	for (let i = 0; i < pos.count; i++) {
		const d = islandSD(pos.getX(i), pos.getZ(i));
		const y = -(Math.min(1, Math.max(0, (d + 2.8) / 4.6)) ** 1.6) * 2.2;
		pos.setY(i, y);
	}
	gg.computeVertexNormals();
	const groundMat = new THREE.ShaderMaterial({
		vertexShader: GROUND_VS,
		fragmentShader: GROUND_FS.replace('__TAPS__', taps),
		uniforms: { ...G, uMap: { value: gm.tex }, uAO: { value: ao }, uWorld: { value: ISLAND.size } },
	});
	const ground = new THREE.Mesh(gg, groundMat);
	ground.matrixAutoUpdate = false;
	group.add(ground);

	// deniz
	const sea = new THREE.Mesh(
		new THREE.PlaneGeometry(900, 900, 1, 1).rotateX(-Math.PI / 2),
		new THREE.ShaderMaterial({
			vertexShader: SEA_VS,
			fragmentShader: SEA_FS,
			uniforms: { ...G, uIsland: { value: new THREE.Vector4(ISLAND.half - ISLAND.corner + 0.6, ISLAND.corner, 0, 0) } },
		}),
	);
	sea.position.y = -1.0;
	sea.updateMatrix();
	sea.matrixAutoUpdate = false;
	group.add(sea);

	// gök
	const sky = new THREE.Mesh(
		new THREE.SphereGeometry(500, 32, 16),
		new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: { ...G }, side: THREE.BackSide, depthWrite: false }),
	);
	sky.renderOrder = -10;
	sky.frustumCulled = false;
	group.add(sky);

	return { group, casters, houses, trees, ground, sea, sky, groundCanvas: gm.canvas };
}
