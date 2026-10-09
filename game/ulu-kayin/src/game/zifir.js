// Zifir: son mürekkep damlası. Ana oyundaki görünümle aynı: koyu gövde, mor kenar ışığı,
// büyük gözler, ışıkta kor gibi çatlayan yüzey, yenilince buharlaşma.

import * as THREE from 'three';
import { COMMON, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { flatMaterial } from '../gfx/materials.js';
import { damp, lerp, clamp } from '../core/math.js';

const SCALE = 1.55; // ana oyundaki ölçek

const BODY_VS = /* glsl */ `
uniform float uTime, uWob, uBurn, uMelt;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vL;
void main() {
	vec3 p = position, nn = normal;
	float n = sin(p.x * 11.0 + uTime * 5.3) * sin(p.y * 9.0 + uTime * 4.1) * sin(p.z * 10.0 + uTime * 6.2);
	p += normal * n * 0.035 * (uWob + uBurn * 1.8 + uMelt * 2.2);
	if (uMelt > 0.0) {
		// erime: gövde çöker, taban jel gibi yayılır
		float yb = clamp((p.y + 0.3) / 0.6, 0.0, 1.0), ang = atan(p.z, p.x);
		float lob = 0.5 + 0.5 * sin(ang * 5.0 + 1.3) * sin(ang * 3.0 - uTime * 0.6);
		p.y = -0.3 + (p.y + 0.3) * mix(1.0, 0.3 + 0.12 * lob, uMelt);
		p.xz *= 1.0 + uMelt * (1.0 - yb) * (0.3 + 0.35 * lob);
		nn = normalize(mix(normal, vec3(normal.x * 0.45, 1.0, normal.z * 0.45), uMelt * 0.55));
	}
	vec4 w = modelMatrix * vec4(p, 1.0);
	vN = normalize(mat3(modelMatrix) * nn); vV = normalize(cameraPosition - w.xyz); vP = w.xyz; vL = position;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const BODY_FS = /* glsl */ `
${COMMON}
${LIGHT}
${FINISH}
uniform vec3 uRim;
uniform float uBurn, uLit, uFade, uMelt, uDiss;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vL;
float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p) {
	vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
	           mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
	vec3 N = normalize(vN), V = normalize(vV);
	float fr = pow(1.0 - max(dot(N, V), 0.0), 2.4);
	vec3 col = vec3(0.012, 0.009, 0.022);
	col += uRim * fr * 1.6 * (1.0 - 0.78 * uMelt);
	col += uRim * 0.25 * pow(max(N.y, 0.0), 3.0) * (1.0 - 0.8 * uMelt);
	vec3 H = normalize(uSunDir + V);
	float sp = pow(max(dot(N, H), 0.0), mix(70.0, 260.0, uMelt));
	col += uSunCol * 0.33 * sp * (0.6 + uLit * 2.5 * (1.0 - 0.75 * uMelt));
	float cr = n3(vL * 9.0 + vec3(0.0, uTime * 0.8, 0.0)) * 0.65 + n3(vL * 21.0 - uTime) * 0.35;
	float crack = smoothstep(0.55, 0.62, cr) * (1.0 - smoothstep(0.62, 0.75, cr));
	col += vec3(4.0, 1.3, 0.25) * crack * uBurn * 2.2 * (1.0 - 0.45 * uMelt) + vec3(1.5, 0.45, 0.08) * uBurn * fr * 2.0 * (1.0 - 0.7 * uMelt);
	if (uDiss > 0.0) {
		float dn = n3(vL * 13.0 + vec3(0.0, uTime * 0.7, 0.0)) * 0.7 + n3(vL * 31.0) * 0.3, th = uDiss * 1.15 - 0.08;
		if (dn < th) discard;
		float e = 1.0 - smoothstep(th, th + 0.07, dn);
		col += vec3(3.4, 1.05, 0.25) * e * 2.2 + uRim * e * 1.2;
	}
	gl_FragColor = finish(col * uFade, 1.0);
}`;

// Bir şeyin arkasında kalınca görünen ince mor siluet (oyuncu Zifir'i hiç kaybetmez).
const SIL_VS = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying float vY;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vY = position.y; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const SIL_FS = /* glsl */ `
uniform vec3 uRim; uniform float uFade; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
	float f = 1.0 - abs(dot(normalize(vN), normalize(vV))), rim = pow(f, 2.2), pulse = 0.88 + 0.12 * sin(uTime * 4.0);
	vec3 c = mix(vec3(0.62, 0.55, 1.0), uRim, 0.45) * (0.45 + 1.7 * rim) * pulse * 0.8;
	gl_FragColor = vec4(c, (0.22 + 0.68 * rim) * uFade);
}`;

// Mürekkep halkası: ayakların altında, can azalınca görünür (ana oyundaki gibi).
const RING_FS = /* glsl */ `
uniform float uV, uA, uTime; varying vec2 vUv;
void main() {
	vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.x, -p.y) / 6.2831853 + 0.5;
	float band = smoothstep(0.78, 0.82, r) * (1.0 - smoothstep(0.94, 0.98, r));
	float fill = step(a, uV);
	vec3 c = mix(vec3(3.0, 0.7, 0.2), vec3(1.6, 1.4, 2.6), smoothstep(0.25, 0.7, uV));
	float pulse = uV < 0.3 ? 0.6 + 0.4 * sin(uTime * 18.0) : 1.0;
	vec3 o = c * pulse * band * (fill * 0.95 + 0.12) * uA;
	gl_FragColor = vec4(o / (1.0 + o * 0.4), 1.0);
}`;

export class Zifir {
	constructor(G, tex, { rim = 0x9d8cff, segs = 40 } = {}) {
		this.g = new THREE.Group();
		this.k = new THREE.Group();
		this.k.scale.setScalar(SCALE);
		this.g.add(this.k);
		this.body = new THREE.Group();
		this.k.add(this.body);

		this.u = {
			...G,
			uWob: { value: 0.5 },
			uBurn: { value: 0 },
			uRim: { value: new THREE.Color(rim) },
			uLit: { value: 0 },
			uFade: { value: 1 },
			uMelt: { value: 0 },
			uDiss: { value: 0 },
		};
		const geo = new THREE.SphereGeometry(0.3, segs, Math.round(segs * 0.7));
		this.blob = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: BODY_VS, fragmentShader: BODY_FS, uniforms: this.u }));
		this.blob.position.y = 0.3;
		this.body.add(this.blob);
		this.sil = new THREE.Mesh(
			geo,
			new THREE.ShaderMaterial({
				vertexShader: SIL_VS,
				fragmentShader: SIL_FS,
				uniforms: { uRim: this.u.uRim, uFade: this.u.uFade, uTime: G.uTime },
				transparent: true,
				depthWrite: false,
				depthFunc: THREE.GreaterDepth,
			})
		);
		this.sil.position.y = 0.3;
		this.sil.scale.setScalar(1.035);
		this.sil.renderOrder = 40;
		this.body.add(this.sil);

		const white = flatMaterial(0xffffff, 2.2);
		const dark = flatMaterial(0x050208, 1);
		this.eyeMat = white;
		this.eyes = [];
		this.pupils = [];
		const eyeGeo = new THREE.SphereGeometry(0.075, 16, 12);
		const pupGeo = new THREE.SphereGeometry(0.036, 10, 8);
		for (const s of [-1, 1]) {
			const e = new THREE.Mesh(eyeGeo, white);
			e.scale.set(0.95, 1.25, 0.55);
			e.position.set(s * 0.105, 0.38, 0.25);
			const p = new THREE.Mesh(pupGeo, dark);
			p.position.set(0, -0.005, 0.06);
			e.add(p);
			this.body.add(e);
			this.eyes.push(e);
			this.pupils.push(p);
		}
		const footGeo = new THREE.SphereGeometry(0.075, 10, 8);
		this.feet = [-1, 1].map((s) => {
			const f = new THREE.Mesh(footGeo, dark);
			f.scale.set(1, 0.6, 1.35);
			f.position.set(s * 0.12, 0.04, 0.02);
			this.k.add(f);
			return f;
		});

		this.aura = new THREE.Mesh(
			new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2),
			new THREE.ShaderMaterial({
				vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `uniform sampler2D uMap; uniform float uO; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a * uO; gl_FragColor = vec4(0.012, 0.008, 0.03, a); }`,
				uniforms: { uMap: { value: tex.ink }, uO: { value: 0.85 } },
				transparent: true,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: -4,
			})
		);
		this.aura.position.y = 0.014;
		this.aura.renderOrder = 3;
		this.k.add(this.aura);

		this.ringU = { uV: { value: 1 }, uA: { value: 0 }, uTime: G.uTime };
		this.ring = new THREE.Mesh(
			new THREE.PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2),
			new THREE.ShaderMaterial({
				vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: RING_FS,
				uniforms: this.ringU,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			})
		);
		this.ring.position.y = 0.03;
		this.ring.renderOrder = 4;
		this.k.add(this.ring);

		this.reset();
	}

	reset() {
		this.phase = 0;
		this.yaw = 0;
		this.blinkT = 2;
		this.squash = 0;
		this.sqV = 0;
		this.tapT = 0;
		this.idleT = 0;
		this.hopT = 0;
		this.melt = 0;
		this.diss = 0;
		this.u.uMelt.value = 0;
		this.u.uDiss.value = 0;
		this.u.uFade.value = 1;
		this.u.uBurn.value = 0;
		this.blob.visible = true;
		this.sil.visible = true;
		this.g.visible = true;
		this.g.scale.setScalar(1);
		this.body.scale.setScalar(1);
		this.body.position.set(0, 0, 0);
		for (const f of this.feet) f.visible = true;
		this.eyes.forEach((e, i) => {
			e.visible = true;
			e.position.set(i ? 0.105 : -0.105, 0.38, 0.25);
			e.scale.set(0.95, 1.25, 0.55);
		});
	}

	kick(v) {
		this.sqV += v;
	}

	hop() {
		this.hopT = 0.55;
	}

	/**
	 * s: { x, y, z, yaw, moving, speed, hold, burn (0..1), lit (0..1), meter (0..1) }
	 * onStep: adım atıldığında (ses ve iz için)
	 */
	update(dt, time, s, onStep) {
		this.g.position.set(s.x, s.y, s.z);
		let dy = s.yaw - this.yaw;
		while (dy > Math.PI) dy -= Math.PI * 2;
		while (dy < -Math.PI) dy += Math.PI * 2;
		this.yaw += dy * (1 - Math.exp(-10 * dt));
		this.g.rotation.y = this.yaw;

		this.sqV += (-this.squash * 220 - this.sqV * 16) * dt;
		this.squash += this.sqV * dt;
		let lift = 0;
		let sy = 1;
		let sxz = 1;
		if (s.moving) {
			const prev = this.phase;
			this.phase += dt * s.speed * 4.4;
			const p = this.phase % 1;
			lift = Math.sin(p * Math.PI) * 0.12;
			if (Math.floor(this.phase) !== Math.floor(prev)) {
				this.kick(-2.2);
				if (onStep) onStep();
			}
			sy = 1 + Math.sin(p * Math.PI) * 0.06;
			for (let m = 0; m < 2; m++) {
				const q = (this.phase + m * 0.5) % 1;
				this.feet[m].position.z = 0.02 + Math.sin(q * Math.PI * 2) * 0.09;
				this.feet[m].position.y = 0.04 + Math.max(0, Math.sin(q * Math.PI * 2)) * 0.05;
			}
		} else {
			const b = Math.sin(time * 2.2) * 0.025;
			sy = 1 + b;
			sxz = 1 - b * 0.6;
			for (const f of this.feet) {
				f.position.z = damp(f.position.z, 0.02, 8, dt);
				f.position.y = 0.04;
			}
			if (s.hold) {
				// beklerken ayağını sabırsızca vurur
				this.tapT += dt;
				const t = Math.max(0, Math.sin(this.tapT * 11));
				this.feet[1].position.y = 0.04 + t * 0.045;
				this.feet[1].position.z = 0.05;
			} else this.tapT = 0;
		}
		if (this.hopT > 0) {
			this.hopT = Math.max(0, this.hopT - dt);
			const k = Math.sin((1 - this.hopT / 0.55) * Math.PI);
			lift += k * 0.22;
			sy *= 1 + k * 0.08;
			if (this.hopT === 0) this.kick(-2.4);
		}
		sy *= 1 + this.squash;
		sxz *= 1 - this.squash * 0.55;
		// can azaldıkça küçülür (ana oyundaki gibi %62'ye kadar)
		const k = lerp(0.62, 1, s.meter);
		this.k.scale.setScalar(SCALE * k);
		const shiver = s.burn > 0 ? 0.018 * s.burn : 0;
		this.body.position.set((Math.random() - 0.5) * shiver, lift, (Math.random() - 0.5) * shiver);
		this.body.scale.set(sxz, sy, sxz);

		// göz kırpma ve bakış
		this.blinkT -= dt;
		let blink = 1;
		if (this.blinkT < 0.12) blink = Math.max(0.08, Math.abs(this.blinkT - 0.06) / 0.06);
		if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
		const wide = s.burn > 0.2 ? 1.25 : 1;
		this.eyes.forEach((e) => e.scale.set(0.95 * wide, 1.25 * blink * wide, 0.55));
		for (const p of this.pupils) p.scale.setScalar(s.burn > 0.2 ? 0.6 : 1);

		this.u.uBurn.value = damp(this.u.uBurn.value, s.burn, 8, dt);
		this.u.uLit.value = damp(this.u.uLit.value, s.lit, 8, dt);
		this.u.uWob.value = 0.4 + this.u.uBurn.value * 0.6;
		this.ringU.uV.value = damp(this.ringU.uV.value, s.meter, 10, dt);
		this.ringU.uA.value = damp(this.ringU.uA.value, s.meter < 0.995 ? 1 : 0, 4, dt);
	}

	/** Buharlaşma (kaybetme): t 0→1. */
	evaporate(t) {
		this.u.uMelt.value = clamp(t * 1.6, 0, 1);
		this.u.uDiss.value = clamp((t - 0.25) / 0.75, 0, 1);
		this.u.uBurn.value = 1;
		this.sil.visible = false;
		this.ringU.uA.value = 0;
		this.aura.material.uniforms.uO.value = 0.85 * (1 - t);
		for (const f of this.feet) f.visible = t < 0.4;
		this.eyes.forEach((e, i) => {
			const l = Math.max(0.001, 1 - clamp((t - 0.1) / 0.4, 0, 1));
			e.scale.set(0.95 * l, 1.4 * l, 0.55 * l);
			e.position.y = lerp(0.38, 0.18, clamp(t * 2, 0, 1));
			void i;
		});
	}

	setFade(f) {
		this.u.uFade.value = f;
		this.eyeMat.uniforms.uFade.value = f;
		this.aura.material.uniforms.uO.value = 0.85 * f;
	}
}
