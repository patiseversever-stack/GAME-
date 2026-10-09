// Malzeme fabrikaları. Hepsi aynı ortak uniform nesnelerini paylaşır; ortam değişince
// tek bir yerden bütün sahne güncellenir.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH } from './shaderlib.js';

let G = null;
let TAPS = 1;

/** Açılışta bir kez çağrılır: ortak uniform'lar ve gölge örnek sayısı (kademeye göre sabit). */
export function initMaterials(globals, shadowTaps) {
	G = globals;
	TAPS = shadowTaps;
}

const defs = (extra = {}) => ({ SHADOW_TAPS: TAPS, ...extra });

// ---------------------------------------------------------------------------------------------
// Genel opak yüzey: gövde, dallar, patika, ada. Albedo köşe renginden (a kanalı: ortam kapanması),
// isteğe bağlı doku ile çarpılır.
// ---------------------------------------------------------------------------------------------
// Kamera ile Zifir arasına giren dal ve yapraklar titreşimli desenle oyulur (görüş kapanmaz).
const CUTOUT = /* glsl */ `
uniform vec4 uFocus; // xyz odak (Zifir), w açıklık yarıçapı
void cutout(vec3 wp, float nearR) {
	vec3 ab = uFocus.xyz - cameraPosition;
	float L = length(ab);
	vec3 dir = ab / max(L, 1e-3);
	vec3 ap = wp - cameraPosition;
	float t = dot(ap, dir);
	float k = 0.0;
	if (t > 0.0 && t < L - 0.9) {
		float d = length(ap - dir * t);
		float rad = uFocus.w * (0.55 + 0.45 * smoothstep(0.0, 4.0, t));
		k = smoothstep(rad, rad * 0.55, d);
	}
	k = max(k, smoothstep(nearR, nearR * 0.45, length(ap))); // kameraya çok yakın dal ve yaprak
	float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
	if (k > ign) discard;
}
`;

const LIT_VS = /* glsl */ `
${COMMON}
attribute vec4 color;
#ifdef WIND
attribute vec4 aSway;
#endif
varying vec4 vCol;
varying vec3 vN;
varying vec3 vW;
#ifdef USE_MAP
varying vec2 vUv;
uniform vec2 uMapRepeat;
#endif
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
#ifdef WIND
	w.xyz += windSway(aSway.xyz, aSway.w);
#endif
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vCol = color;
#ifdef USE_MAP
	vUv = uv * uMapRepeat;
#endif
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const LIT_FS = /* glsl */ `
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
#ifdef CUTOUT
${CUTOUT}
#endif
varying vec4 vCol;
varying vec3 vN;
varying vec3 vW;
uniform float uWrap;
uniform float uRim;
uniform float uSnow;     // yukarı bakan yüzeylerde kar (kışın)
uniform float uSnowY;    // karın başladığı yükseklik
#ifdef USE_MAP
varying vec2 vUv;
uniform sampler2D uMap;
#endif
void main() {
#ifdef CUTOUT
	cutout(vW, 7.0);
#endif
	vec3 N = normalize(vN);
	if (!gl_FrontFacing) N = -N;
	vec3 V = normalize(cameraPosition - vW);
	vec3 alb = vCol.rgb;
	float ao = vCol.a;
#ifdef USE_MAP
	vec4 m = texture2D(uMap, vUv);
	alb *= m.rgb;
	ao *= m.a;
#endif
	// Kar: aşağıda (kış katında) yukarı bakan yüzeyleri örter.
	float snow = uSnow * smoothstep(uSnowY + 2.0, uSnowY - 2.0, vW.y) * smoothstep(0.35, 0.75, N.y);
	alb = mix(alb, vec3(0.92, 0.94, 1.0), snow);
	float sh = shadowAt(vW, N);
	vec3 c = shadeLit(alb, N, V, ao, sh, uWrap, uRim);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

export function litMaterial({ map = null, repeat = [1, 1], wrap = 0.3, rim = 0.35, snow = 0, snowY = 14, side = THREE.FrontSide, wind = false, cutout = false } = {}) {
	const d = {};
	if (map) d.USE_MAP = 1;
	if (wind) d.WIND = 1;
	if (cutout) d.CUTOUT = 1;
	return new THREE.ShaderMaterial({
		vertexShader: LIT_VS,
		fragmentShader: LIT_FS,
		defines: defs(d),
		uniforms: {
			...G,
			uMap: { value: map },
			uMapRepeat: { value: new THREE.Vector2(repeat[0], repeat[1]) },
			uWrap: { value: wrap },
			uRim: { value: rim },
			uSnow: { value: snow },
			uSnowY: { value: snowY },
		},
		side,
	});
}

// ---------------------------------------------------------------------------------------------
// Yaprak / çiçek kümeleri: kameraya dönük kartlar (her açıdan dolgun görünür), küme merkezine
// göre küresel normal (yumuşak, kabarık gölgelenme), arkadan ışıkta yarı saydam parlama.
// Rüzgârla bütün küme birlikte sallanır; oynanıştaki gölge testi aynı sallanmayı hesaplar.
// ---------------------------------------------------------------------------------------------
const LEAF_VS = /* glsl */ `
${COMMON}
attribute vec3 iPos;      // kartın merkezi
attribute vec4 iCluster;  // xyz küme merkezi, w küme yarıçapı
attribute vec4 iData;     // x boyut, y dönüş, z atlas hücresi, w renk sapması
attribute vec3 iTint;
attribute vec4 iSway;     // dalın sallanma çapası ve ağırlığı (dal ile küme birlikte sallanır)
uniform float uFacing;    // 1: kameraya dön (çizim), 0: güneşe dön (gölge haritası)
uniform vec3 uFaceDir;    // gölge geçişinde kartların döneceği yön
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;
varying float vDepthAO;
void main() {
	vec3 sway = windSway(iSway.xyz, iSway.w);
	vec3 c = iPos + sway;
	vec3 toCam = uFacing > 0.5 ? normalize(cameraPosition - c) : uFaceDir;
	vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + vec3(1e-4, 0.0, 0.0));
	vec3 up = cross(toCam, right);
	float s = iData.x;
	float r = iData.y + sin(uTime * 2.3 + iData.w * 40.0) * 0.06 * (uWind.z + uWind.w * 2.0);
	vec2 q = position.xy;
	vec2 rq = vec2(q.x * cos(r) - q.y * sin(r), q.x * sin(r) + q.y * cos(r));
	vec3 w = c + (right * rq.x + up * rq.y) * s;
	vW = w;
	vec3 rel = c - iCluster.xyz;
	vN = normalize(rel / max(iCluster.w, 0.01) + (right * rq.x + up * rq.y) * 0.6 + vec3(0.0, 0.25, 0.0));
	vDepthAO = clamp(length(rel) / max(iCluster.w, 0.01), 0.0, 1.0);
	float cell = iData.z;
	// atlas: tuvalin üst satırı v=1 tarafında (CanvasTexture flipY)
	vUv = (position.xy + 0.5) * 0.5 + vec2(mod(cell, 2.0), 1.0 - floor(cell / 2.0)) * 0.5;
	vTint = iTint;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const LEAF_FS = /* glsl */ `
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${CUTOUT}
uniform sampler2D uMap;
uniform float uAlphaCut;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;
varying float vDepthAO;
void main() {
	vec4 t = texture2D(uMap, vUv);
	if (t.a < uAlphaCut) discard;
	cutout(vW, 11.0);
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	vec3 alb = t.rgb * vTint;
	// İç kısım daha koyu: kümeye hacim hissi. Yapraklar ışığı saçar: gölgede bile
	// gök ışığını daha çok alır (gölgedeki çiçekler morarmasın).
	float ao = mix(0.55, 1.0, smoothstep(0.15, 0.95, vDepthAO));
	float sh = shadowAt(vW + uSunDir * 0.45, N);
	vec3 c = shadeLit(alb, N, V, ao * 1.35, sh, 0.65, 0.55);
	c += alb * uGround * 0.35 * (1.0 - sh);
	// Yarı saydamlık: güneş yaprağın arkasındayken ışık içinden geçer.
	float tr = pow(max(dot(-V, uSunDir), 0.0), 3.0);
	c += alb * uSunCol * tr * 0.9 * sh * (0.5 + 0.5 * ao);
	c = applyFog(c, vW);
#ifdef A2C
	gl_FragColor = finish(c, smoothstep(uAlphaCut, 0.75, t.a));
#else
	gl_FragColor = finish(c, 1.0);
#endif
}`;

export function leafMaterial(map, { a2c }) {
	return new THREE.ShaderMaterial({
		vertexShader: LEAF_VS,
		fragmentShader: LEAF_FS,
		defines: defs(a2c ? { A2C: 1 } : {}),
		uniforms: {
			...G,
			uMap: { value: map },
			uAlphaCut: { value: a2c ? 0.12 : 0.45 },
			uFacing: { value: 1 },
			uFaceDir: { value: new THREE.Vector3(0, 1, 0) },
		},
		alphaToCoverage: !!a2c,
		side: THREE.DoubleSide,
	});
}

/** Yaprakların gölge haritası malzemesi: kartlar güneşe döner, eşik düşük (daha dolu gölge). */
export function leafDepthMaterial(map) {
	return new THREE.ShaderMaterial({
		vertexShader: LEAF_VS,
		fragmentShader: /* glsl */ `
			uniform sampler2D uMap;
			varying vec2 vUv;
			void main() { if (texture2D(uMap, vUv).a < 0.22) discard; gl_FragColor = vec4(1.0); }`,
		uniforms: { ...G, uMap: { value: map }, uFacing: { value: 0 }, uFaceDir: G.uSunDir },
		side: THREE.DoubleSide,
		colorWrite: false,
	});
}

/** Opak nesnelerin gölge haritası malzemesi (wind: dallar rüzgârla birlikte sallanır). */
export function depthMaterial({ wind = false } = {}) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			${COMMON}
			#ifdef WIND
			attribute vec4 aSway;
			#endif
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
			#ifdef WIND
				w.xyz += windSway(aSway.xyz, aSway.w);
			#endif
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,
		fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`,
		defines: wind ? { WIND: 1 } : {},
		uniforms: { ...G },
		side: THREE.DoubleSide,
		colorWrite: false,
	});
}

/** Düz renk (Zifir'in gözleri, ayakları): ışıksız, ama aynı ton eşleme ve sisten geçer. */
export function flatMaterial(color, k = 1) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${LIGHT}
			${FINISH}
			uniform vec3 uColor; uniform float uK; uniform float uFade;
			varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(uColor * uK * uFade, vW), 1.0); }`,
		uniforms: { ...G, uColor: { value: new THREE.Color(color) }, uK: { value: k }, uFade: { value: 1 } },
	});
}

/** Kendi ışığıyla parlayan yüzey (fener camı, kapı): ışıktan bağımsız, sisle karışır. */
export function emissiveMaterial(color = 0xffffff, intensity = 1) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			attribute vec4 color; varying vec4 vCol; varying vec3 vW;
			void main() { vCol = color; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${LIGHT}
			${FINISH}
			uniform vec3 uColor; uniform float uK;
			varying vec4 vCol; varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(vCol.rgb * uColor * uK, vW), 1.0); }`,
		uniforms: { ...G, uColor: { value: new THREE.Color(color) }, uK: { value: intensity } },
	});
}

// ---------------------------------------------------------------------------------------------
// Gökyüzü: degrade, güneş halesi ve diski, ufuk pusu, gece yıldızları. Opak nesnelerden sonra
// en uzak derinlikte çizilir: yalnızca boş kalan pikseller hesaplanır.
// ---------------------------------------------------------------------------------------------
export function skyMaterial(starTex) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			varying vec3 vDir;
			void main() {
				vDir = position;
				vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
				gl_Position = p.xyww;
			}`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${FINISH}
			uniform vec3 uZenith, uHorizon, uSunGlow, uSunDisc;
			uniform float uNight;
			uniform sampler2D uStars;
			varying vec3 vDir;
			void main() {
				vec3 v = normalize(vDir);
				float h = v.y;
				vec3 c = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
				// ufkun altı: bulut denizinin sisine karışır
				c = mix(c, uFogCol * 0.95, smoothstep(0.02, -0.18, h));
				float sd = max(dot(v, uSunDir), 0.0);
				// güneş tarafında sıcak ufuk bandı
				float band = exp(-abs(h - 0.02) * 9.0);
				c += uSunGlow * band * pow(sd, 3.0) * 0.55;
				c += uSunGlow * (pow(sd, 10.0) * 0.55 + pow(sd, 90.0) * 1.6);
				c += uSunDisc * smoothstep(0.99935, 0.99965, sd) * 26.0;
				// yıldızlar (alacakaranlık ve gece)
				if (uNight > 0.01) {
					vec2 suv = vec2(atan(v.z, v.x) / 6.2831853 * 3.0, v.y * 1.5);
					vec3 st = texture2D(uStars, suv).rgb;
					float tw = 0.65 + 0.35 * sin(uTime * 2.0 + st.g * 40.0);
					c += st.r * tw * uNight * smoothstep(0.02, 0.35, h) * vec3(0.9, 0.95, 1.1) * 2.2;
				}
				gl_FragColor = finish(c, 1.0);
			}`,
		uniforms: { ...G, uStars: { value: starTex } },
		depthWrite: false,
		side: THREE.BackSide,
	});
}

// ---------------------------------------------------------------------------------------------
// Toplamalı parıltı kartları: güneş parlaması, fener ve damla haleleri, ışık sütunları.
// ---------------------------------------------------------------------------------------------
export function glowMaterial(map, { color = 0xffffff, intensity = 1, depthTest = true, fog = true } = {}) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			varying vec2 vUv; varying vec3 vW;
			void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
		fragmentShader: /* glsl */ `
			${COMMON}
			uniform sampler2D uMap; uniform vec3 uColor; uniform float uK; uniform float uFogK;
			varying vec2 vUv; varying vec3 vW;
			void main() {
				vec4 t = texture2D(uMap, vUv);
				float d = length(vW - cameraPosition);
				float f = mix(1.0, exp(-d * uFogP.x * 0.8), uFogK);
				vec3 c = t.rgb * uColor * uK * t.a * f;
				gl_FragColor = vec4(c / (1.0 + c * 0.25), 1.0);
			}`,
		uniforms: {
			...G,
			uMap: { value: map },
			uColor: { value: new THREE.Color(color) },
			uK: { value: intensity },
			uFogK: { value: fog ? 1 : 0 },
		},
		transparent: true,
		depthWrite: false,
		depthTest,
		blending: THREE.AdditiveBlending,
	});
}
