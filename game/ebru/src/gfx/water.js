// Teknedeki suyun ve boyanın çizimi.
//
// Boya dokusundaki her kanal 0.5 eşiğinden kesilir; kenar ekran pikseli cinsinden işaretli
// uzaklıkla yumuşatılır. Böylece 384 piksellik boya dokusu bile 1080p ekranda keskin çizilir.
// Üstüne: ince ebru damarları, eşiğin altında kalan hayalet iplikler, boyanın kalınlığından
// gelen kabartma ve ıslak parıltı, karıştırırken suyun hızından doğan kırışıklar,
// altın varak pırıltısı, kara mürekkebin yağ hâresi ve kandilin sıcak ışığı.
// Tek geçiş, ek render hedefi yok.

import * as THREE from 'three';

export const WATER_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main() {
	vUv = uv;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const WATER_FS = /* glsl */ `
precision highp float;
uniform sampler2D uD0, uD1, uVel;
uniform vec3 uPal[8];
uniform float uThick[8];
uniform vec3 uBase;
uniform vec3 uVeinCol;
uniform float uVein, uVeinW, uGhost;
uniform vec2 uDyeRes;
uniform vec2 uRes;
uniform float uPxPerUnit;
uniform float uTime;
uniform vec3 uLampDir;   // ekran uzayında ışık yönü (sol üst)
uniform vec3 uLampCol;
uniform vec4 uGlow;      // xy: tekne uv'si, z: şiddet, w: yarıçap (tekne birimi)
uniform vec3 uGlowCol;
uniform float uAspect;
varying vec2 vUv;
varying vec3 vW;

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}

void main() {
	vec4 a = texture2D(uD0, vUv);
	vec4 b = texture2D(uD1, vUv);
	float P[8];
	P[0] = a.r; P[1] = a.g; P[2] = a.b; P[3] = a.a;
	P[4] = b.r; P[5] = b.g; P[6] = b.b; P[7] = b.a;

	vec3 col = uBase;
	// zeminin kendi dokusu: kitreli suyun hafif bulutlanması
	float zn = vnoise(vUv * vec2(9.0, 9.0 * uAspect)) * 0.6 + vnoise(vUv * vec2(31.0, 31.0 * uAspect)) * 0.4;
	col *= 0.965 + 0.06 * zn;

	float h = 0.0;
	float vein = 0.0;
	float inkCov = 0.0, inkSd = 0.0;
	float goldCov = 0.0;
	for (int i = 0; i < 8; i++) {
		float c = P[i];
		float gl = length(vec2(dFdx(c), dFdy(c))) + 1e-4;
		float sd = (c - 0.5) / gl; // işaretli uzaklık, ekran pikseli (içeride pozitif)
		float cov = clamp(sd + 0.5, 0.0, 1.0);
		// eşiğin altındaki ince iplikler: soluk bir iz olarak kalır
		float ghost = smoothstep(0.1, 0.5, c) * (1.0 - cov) * uGhost;
		col = mix(col, uPal[i], max(cov, ghost));
		// damar: renklerin birleştiği yerde ince açık çizgi
		float vw = uVeinW * uPxPerUnit;
		vein = max(vein, (1.0 - smoothstep(vw * 0.5 - 0.6, vw * 0.5 + 0.6, abs(sd))) * step(0.02, c));
		h += smoothstep(0.25, 0.75, c) * uThick[i];
		if (i == 6) { inkCov = cov; inkSd = sd; }
		if (i == 7) goldCov = cov;
	}
	col = mix(col, uVeinCol, vein * uVein);

	// kabartma: boya filmi sudan biraz yüksektir, ışığa bakan kenar parlar
	vec2 gh = vec2(dFdx(h), dFdy(h));
	vec2 slope = -gh * 1.6;
	float lit = dot(slope, normalize(uLampDir.xy));
	col *= 1.0 + clamp(lit, -0.35, 0.5) * 0.55;

	// suyun hızından kırışık ve parıltı
	vec2 vel = texture2D(uVel, vUv).xy;
	float sp = length(vel);
	vec2 rp = vUv * vec2(70.0, 70.0 * uAspect) - vel * uTime * 0.0;
	float rn = vnoise(rp + uTime * 1.7) - vnoise(rp * 1.7 - uTime * 2.3);
	float ripple = rn * smoothstep(0.02, 0.6, sp);

	// ıslak parıltı: pencerenin geniş yansıması + kenar ve kırışık pırıltıları
	vec2 sc = gl_FragCoord.xy / uRes;
	float sheen = smoothstep(1.25, 0.1, length((sc - vec2(0.18, 0.92)) * vec2(1.0, 0.75)));
	float glint = pow(clamp(lit * 1.4 + ripple * 0.9, 0.0, 1.0), 3.0);
	col += uLampCol * (sheen * 0.07 + glint * 0.35);

	// altın varak: metal ve pırıltı
	if (goldCov > 0.0) {
		vec2 cell = floor(vUv * uDyeRes * 1.5);
		float hs = hash12(cell);
		float tw = pow(max(0.0, sin(uTime * (2.0 + hs * 3.0) + hs * 40.0)), 12.0) * step(0.86, hs);
		vec3 gold = uPal[7] * (0.78 + 0.5 * vnoise(vUv * 160.0) + lit * 0.9) + vec3(1.0, 0.92, 0.7) * tw * 1.2;
		col = mix(col, gold, goldCov);
	}

	// kara mürekkep: derin, kenarında yağ hâresi
	if (inkCov > 0.0) {
		float rim = (1.0 - smoothstep(0.0, 7.0, inkSd)) * inkCov;
		vec3 film = 0.5 + 0.5 * cos(6.2831 * (inkSd * 0.06 + uTime * 0.05 + vec3(0.0, 0.33, 0.67)));
		col = mix(col, col + film * 0.22, rim * 0.8);
		col += uLampCol * glint * 0.25 * inkCov;
	}

	// kandilin sıcak ışığı ve sudaki yansıması
	vec2 dg = (vUv - uGlow.xy) * vec2(1.0, uAspect);
	float g1 = exp(-dot(dg, dg) / (uGlow.w * uGlow.w));
	vec2 dr = dg - vec2(0.0, -uGlow.w * 0.55);
	float g2 = exp(-(dr.x * dr.x * 18.0 + dr.y * dr.y * 4.0) / (uGlow.w * uGlow.w)) * (0.7 + 0.3 * rn);
	col += uGlowCol * uGlow.z * (g1 * 0.32 + g2 * 0.22);
	col *= 1.0 + uGlow.z * g1 * 0.18;

	// ekran köşeleri: hafif kararma
	vec2 vq = sc - 0.5;
	col *= 1.0 - dot(vq, vq) * 0.42;
	// hafif renk eğrisi (sinema tonu) ve titreşim (bantlaşma olmasın)
	col = clamp(col, 0.0, 1.4);
	col = col / (1.0 + max(col - 1.0, 0.0));
	col += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
	gl_FragColor = vec4(col, 1.0);
}`;

const hex = (h) => new THREE.Color().setHex(h, THREE.LinearSRGBColorSpace);

export function waterMaterial(fluid, G) {
	const u = (v) => ({ value: v });
	const m = new THREE.ShaderMaterial({
		vertexShader: WATER_VS,
		fragmentShader: WATER_FS,
		uniforms: {
			uD0: u(fluid.dye.read.textures[0]),
			uD1: u(fluid.dye.read.textures[1]),
			uVel: u(fluid.vel.read.texture),
			uPal: u(Array.from({ length: 8 }, () => new THREE.Color())),
			uThick: u([1, 1, 1, 1, 1, 1, 1.6, 1.2]),
			uBase: u(hex(0xf1e6cf)),
			uVeinCol: u(hex(0xfff8ea)),
			uVein: u(0.85),
			uVeinW: u(0.0035),
			uGhost: u(0.4),
			uDyeRes: u(new THREE.Vector2(fluid.dyeW, fluid.dyeH)),
			uRes: G.uRes,
			uPxPerUnit: G.uPxPerUnit,
			uTime: G.uTime,
			uLampDir: u(new THREE.Vector3(-0.55, 0.75, 0.6)),
			uLampCol: u(hex(0xfff1d6)),
			uGlow: u(new THREE.Vector4(0.5, 0.2, 0, 0.12)),
			uGlowCol: u(hex(0xffb35c)),
			uAspect: u(fluid.H),
		},
		depthWrite: true,
	});
	// her karede güncel boya dokusunu bağla (ping-pong değişir)
	m.onBeforeRender = () => {
		m.uniforms.uD0.value = fluid.dye.read.textures[0];
		m.uniforms.uD1.value = fluid.dye.read.textures[1];
		m.uniforms.uVel.value = fluid.vel.read.texture;
	};
	return m;
}

/** Bölüm paletini suya uygular. pal: 8 renk (hex), base: zemin rengi. */
export function applyPalette(mat, { pal, base, vein = 0.85, veinCol = 0xfff8ea, ghost = 0.4 }) {
	const U = mat.uniforms;
	for (let i = 0; i < 8; i++) U.uPal.value[i].setHex(pal[i], THREE.LinearSRGBColorSpace);
	U.uBase.value.setHex(base, THREE.LinearSRGBColorSpace);
	U.uVein.value = vein;
	U.uVeinCol.value.setHex(veinCol, THREE.LinearSRGBColorSpace);
	U.uGhost.value = ghost;
}
