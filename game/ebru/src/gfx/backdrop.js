// Ebru atölyesi: ceviz masa, tekne, boya kâseleri, fırçalar.
//
// Masa ve aksesuarlar hareket etmez; ekran çözünürlüğünde bir kez bir dokuya çizilir ve her
// karede tek bir tam ekran üçgenle basılır (kamera ya da çözünürlük değişince yeniden çizilir).
// Tekne çerçevesi suyun önünde durduğu için canlı sahnede, derinlik testiyle çizilir; ucuzdur.

import * as THREE from 'three';

export const LIGHT = {
	lamp: new THREE.Vector3(-1.1, 1.5, -0.9), // sol üstte gaz lambası
	lampCol: new THREE.Color(1.0, 0.86, 0.66),
	sky: new THREE.Color(0.42, 0.46, 0.62), // pencereden gelen serin ışık
	amb: new THREE.Color(0.2, 0.17, 0.16),
};

const LIT_VS = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	vUv = uv;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Ortak ışık: sıcak lamba (yakınlıkla azalan), serin pencere ışığı, sıcak ortam, ekran köşesi kararması
const LIGHTING = /* glsl */ `
uniform vec3 uLamp, uLampCol, uSky, uAmb;
uniform vec2 uRes;
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
float fbm(vec2 p) {
	float s = 0.0, a = 0.5;
	for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
	return s;
}
vec3 light(vec3 base, vec3 w, vec3 n, float gloss) {
	vec3 L = uLamp - w;
	float dist = length(L);
	L /= dist;
	float fall = 1.6 / (1.0 + dist * dist * 0.35);
	float d = max(dot(n, L), 0.0);
	float sky = 0.5 + 0.5 * n.y;
	vec3 V = normalize(cameraPosition - w);
	vec3 H = normalize(L + V);
	float sp = pow(max(dot(n, H), 0.0), 40.0) * gloss;
	return base * (uAmb + uSky * sky * 0.35 + uLampCol * d * fall) + uLampCol * sp * fall;
}
vec3 finish(vec3 c) {
	vec2 q = gl_FragCoord.xy / uRes - 0.5;
	c *= 1.0 - dot(q, q) * 0.9;
	c = c / (1.0 + max(c - 1.0, 0.0));
	return c + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
}`;

// Ceviz: uzun damarlar, halka izleri, cila parıltısı
const WOOD_FS = /* glsl */ `
precision highp float;
${LIGHTING}
uniform vec3 uC1, uC2;
uniform float uScale, uGloss;
uniform vec4 uTray; // masa için teknenin gölgesi: xy yarı boyut, z yumuşaklık, w güç
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	vec3 n = normalize(vN);
	vec2 p = abs(n.y) > 0.5 ? vW.xz : (abs(n.x) > 0.5 ? vW.zy : vW.xy);
	p *= uScale;
	float warp = fbm(p * vec2(0.6, 3.0)) * 2.4;
	float g = sin((p.y * 9.0 + warp * 3.0) ) * 0.5 + 0.5;
	float fine = vnoise(p * vec2(1.5, 60.0)) * 0.5 + vnoise(p * vec2(3.0, 140.0)) * 0.5;
	float t = clamp(g * 0.55 + fine * 0.45, 0.0, 1.0);
	vec3 base = mix(uC1, uC2, t);
	base *= 0.85 + 0.3 * fbm(p * 0.7);
	vec3 c = light(base, vW, n, uGloss * (0.6 + 0.4 * fine));
	if (uTray.w > 0.0) {
		// teknenin masaya düşen yumuşak gölgesi (lamba sol üstte: gölge sağ alta kayar)
		vec2 q = abs(vW.xz - vec2(0.07, 0.09)) - uTray.xy;
		float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
		c *= 1.0 - uTray.w * (1.0 - smoothstep(-0.02, uTray.z, sd));
	}
	gl_FragColor = vec4(finish(c), 1.0);
}`;

// Pirinç/bakır: köşe kapakları ve kâseler
const METAL_FS = /* glsl */ `
precision highp float;
${LIGHTING}
uniform vec3 uC1;
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	vec3 n = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	vec3 R = reflect(-V, n);
	float env = 0.35 + 0.65 * smoothstep(-0.2, 0.9, R.y) + 0.3 * pow(max(dot(R, normalize(uLamp - vW)), 0.0), 18.0);
	float pat = 0.9 + 0.1 * vnoise(vW.xz * 300.0);
	vec3 c = light(uC1 * 0.35, vW, n, 2.2) + uC1 * env * 0.55 * pat;
	gl_FragColor = vec4(finish(c), 1.0);
}`;

// Boya kâsesindeki boya: yarı mat, kenara doğru koyulaşan
const PAINT_FS = /* glsl */ `
precision highp float;
${LIGHTING}
uniform vec3 uC1;
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	float r = length(vUv - 0.5) * 2.0;
	vec3 base = uC1 * (1.0 - 0.25 * r * r) * (0.92 + 0.12 * vnoise(vUv * 30.0));
	vec3 c = light(base, vW, normalize(vN), 1.4);
	gl_FragColor = vec4(finish(c), 1.0);
}`;

const FULL_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FULL_FS = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uFlicker;
uniform vec2 uLampScr;
varying vec2 vUv;
void main() {
	vec3 c = texture2D(uMap, vUv).rgb;
	float d = length(vUv - uLampScr);
	c *= 1.0 + uFlicker * 0.08 * (1.0 - smoothstep(0.0, 1.1, d));
	gl_FragColor = vec4(c, 1.0);
}`;

function litMat(fs, G, extra) {
	const u = (v) => ({ value: v });
	return new THREE.ShaderMaterial({
		vertexShader: LIT_VS,
		fragmentShader: fs,
		uniforms: {
			uLamp: u(LIGHT.lamp),
			uLampCol: u(LIGHT.lampCol),
			uSky: u(LIGHT.sky),
			uAmb: u(LIGHT.amb),
			uRes: G.uRes,
			...extra,
		},
	});
}

const col = (h) => new THREE.Color().setHex(h, THREE.LinearSRGBColorSpace);

export class Backdrop {
	constructor(G, aspect, tier) {
		this.G = G;
		this.A = aspect;
		this.samples = tier.bgSamples;
		this.dirty = true;
		this.rt = null;
		const u = (v) => ({ value: v });

		// --- önbelleğe çizilen sahne: masa ve aksesuarlar
		this.cached = new THREE.Scene();
		const table = new THREE.Mesh(
			new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2),
			litMat(WOOD_FS, G, {
				uC1: u(col(0x2a160d)),
				uC2: u(col(0x5b3220)),
				uScale: u(1.4),
				uGloss: u(0.5),
				uTray: u(new THREE.Vector4(0.5 + 0.05, aspect / 2 + 0.05, 0.16, 0.55)),
			}),
		);
		table.position.y = -0.045;
		this.cached.add(table);

		// boya kâseleri (alt kenarda), içlerinde bölümün boyaları
		this.bowls = [];
		const bowlGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.05, 40, 1, true);
		const paintGeo = new THREE.CircleGeometry(0.068, 40).rotateX(-Math.PI / 2);
		const lipGeo = new THREE.TorusGeometry(0.073, 0.006, 8, 48).rotateX(Math.PI / 2);
		const brass = litMat(METAL_FS, G, { uC1: u(col(0xc8954a)) });
		const bowlZ = aspect / 2 + 0.17;
		for (let i = 0; i < 4; i++) {
			const g = new THREE.Group();
			const x = -0.36 + i * 0.24;
			g.position.set(x, -0.02, bowlZ + (i % 2) * 0.03);
			const b = new THREE.Mesh(bowlGeo, brass);
			const lip = new THREE.Mesh(lipGeo, brass);
			lip.position.y = 0.025;
			const pm = litMat(PAINT_FS, G, { uC1: u(new THREE.Color()) });
			const pt = new THREE.Mesh(paintGeo, pm);
			pt.position.y = 0.012;
			g.add(b, lip, pt);
			this.cached.add(g);
			this.bowls.push(pm);
		}

		// fırçalar: gül dalı sapı ve at kılı (üst kenarda)
		const stick = litMat(WOOD_FS, G, { uC1: u(col(0x3b2a1c)), uC2: u(col(0x6e5136)), uScale: u(9), uGloss: u(0.3), uTray: u(new THREE.Vector4()) });
		const hair = litMat(PAINT_FS, G, { uC1: u(col(0xcdbb98)) });
		for (let i = 0; i < 3; i++) {
			const g = new THREE.Group();
			const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.42, 10), stick);
			s.rotation.z = Math.PI / 2;
			const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.009, 0.07, 14), hair);
			h.rotation.z = Math.PI / 2;
			h.position.x = 0.24;
			g.add(s, h);
			g.position.set(-0.05 + i * 0.05, -0.034, -aspect / 2 - 0.13 - i * 0.035);
			g.rotation.y = 0.12 - i * 0.1;
			this.cached.add(g);
		}

		// --- canlı sahne: tekne çerçevesi (suyun önünde durur)
		this.live = new THREE.Group();
		const frame = litMat(WOOD_FS, G, { uC1: u(col(0x241109)), uC2: u(col(0x4a2615)), uScale: u(4), uGloss: u(1.2), uTray: u(new THREE.Vector4()) });
		const T = 0.05; // çerçeve kalınlığı
		const top = 0.028;
		const bot = -0.045;
		const hgt = top - bot;
		const W = 1 + T * 2;
		const D = aspect + T * 2;
		const bar = (w, d, x, z) => {
			const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), frame);
			m.position.set(x, (top + bot) / 2, z);
			this.live.add(m);
		};
		bar(W, T, 0, -aspect / 2 - T / 2);
		bar(W, T, 0, aspect / 2 + T / 2);
		bar(T, aspect, -0.5 - T / 2, 0);
		bar(T, aspect, 0.5 + T / 2, 0);
		const cap = new THREE.BoxGeometry(T * 1.5, 0.008, T * 1.5);
		for (const sx of [-1, 1])
			for (const sz of [-1, 1]) {
				const m = new THREE.Mesh(cap, brass);
				m.position.set(sx * (0.5 + T / 2), top + 0.004, sz * (aspect / 2 + T / 2));
				this.live.add(m);
			}

		// önbellek basma üçgeni
		this.flat = new THREE.Scene();
		this.flatCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		const tri = new THREE.BufferGeometry();
		tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
		this.flatMat = new THREE.ShaderMaterial({
			vertexShader: FULL_VS,
			fragmentShader: FULL_FS,
			uniforms: { uMap: u(null), uFlicker: u(0), uLampScr: u(new THREE.Vector2(0.1, 0.95)) },
			depthTest: false,
			depthWrite: false,
		});
		const q = new THREE.Mesh(tri, this.flatMat);
		q.frustumCulled = false;
		this.flat.add(q);
	}

	setPalette(pal) {
		for (let i = 0; i < this.bowls.length; i++) this.bowls[i].uniforms.uC1.value.setHex(pal[i], THREE.LinearSRGBColorSpace);
		this.dirty = true;
	}

	/** Önbelleği gerekiyorsa yenile, sonra ekrana bas. */
	draw(renderer, camera, w, h) {
		if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
			if (this.rt) this.rt.dispose();
			this.rt = new THREE.WebGLRenderTarget(w, h, { samples: this.samples, depthBuffer: true, type: THREE.UnsignedByteType });
			this.rt.texture.colorSpace = THREE.NoColorSpace;
			this.dirty = true;
		}
		if (this.dirty) {
			renderer.setRenderTarget(this.rt);
			renderer.clear();
			renderer.render(this.cached, camera);
			this.dirty = false;
		}
		renderer.setRenderTarget(null);
		this.flatMat.uniforms.uMap.value = this.rt.texture;
		renderer.render(this.flat, this.flatCam);
	}

	dispose() {
		if (this.rt) this.rt.dispose();
	}
}
