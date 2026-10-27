// Efektler: boşluklardaki hayalet taşlar ve zamanlama halkası, toz bulutları, parıltılar.
// Hepsi örneklemeli tek çizim; kare başına yalnızca küçük tamponlar güncellenir.

import * as THREE from 'three';
import { COMMON, FINISH } from '../gfx/shaderlib.js';

const GHOST_VS = /* glsl */ `
attribute vec3 iPos;
attribute float iYaw;
attribute vec3 iDim;
attribute vec4 iState; // x görünürlük, y parlama, z yaklaşma (0 uzak, 1 geldi), w tehlike
varying vec3 vL;
varying vec3 vN;
varying vec3 vW;
varying vec4 vS;
void main() {
	vec3 p = position * iDim * (1.0 + iState.y * 0.08);
	float cy = cos(iYaw), sy = sin(iYaw);
	vec3 w = vec3(p.x * cy + p.z * sy, p.y + 0.02, -p.x * sy + p.z * cy) + iPos;
	vW = w;
	vL = position;
	vN = vec3(normal.x * cy + normal.z * sy, normal.y, -normal.x * sy + normal.z * cy);
	vS = iState;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0) * step(0.01, iState.x);
}`;

const GHOST_FS = /* glsl */ `
${COMMON}
varying vec3 vL;
varying vec3 vN;
varying vec3 vW;
varying vec4 vS;
void main() {
	vec3 V = normalize(cameraPosition - vW);
	float fres = pow(1.0 - abs(dot(normalize(vN), V)), 1.6);
	// kenar çizgileri: kutunun kenarına yakın yerler parlak
	vec3 e = 0.5 - abs(vec3(vL.x, vL.y - 0.5, vL.z));
	// yüzün kendi ekseni sıfırdır; ikinci en küçük değer en yakın kenara uzaklık
	float e2 = e.x + e.y + e.z - min(min(e.x, e.y), e.z) - max(max(e.x, e.y), e.z);
	float edge = 1.0 - smoothstep(0.0, 0.07, e2);
	float scan = 0.5 + 0.5 * sin(vL.y * 18.0 - uTime * 6.0);
	vec3 calm = vec3(0.35, 0.9, 1.0);
	vec3 hot = vec3(1.0, 0.55, 0.2);
	vec3 col = mix(calm, hot, vS.w);
	float pulse = 0.65 + 0.35 * sin(uTime * (5.0 + vS.z * 10.0));
	float a = (0.18 + fres * 0.55 + scan * 0.12 + edge * 0.5) * pulse * vS.x;
	gl_FragColor = vec4(col * a * 1.4, a * 0.6);
}`;

const RING_VS = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iState;
attribute float iR;
varying vec2 vUv;
varying vec4 vS;
void main() {
	vUv = uv * 2.0 - 1.0;
	vS = iState;
	vec3 w = vec3(position.x * iR, 0.0, position.y * iR) + iPos + vec3(0.0, 0.03, 0.0);
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0) * step(0.01, iState.x);
}`;

const RING_FS = /* glsl */ `
${COMMON}
varying vec2 vUv;
varying vec4 vS;
void main() {
	float r = length(vUv);
	float a = atan(vUv.x, -vUv.y) / 6.28318 + 0.5;
	// dış halka: zincirin yaklaşması (dolan yay), iç dolgu: dokunma hedefi
	float ring = (1.0 - smoothstep(0.0, 0.06, abs(r - 0.82)));
	float prog = step(a, vS.z);
	float base = ring * 0.35;
	float arc = ring * prog;
	float fill = (1.0 - smoothstep(0.55, 0.7, r)) * 0.16 * (0.7 + 0.3 * sin(uTime * 6.0));
	vec3 calm = vec3(0.35, 0.9, 1.0);
	vec3 hot = vec3(1.0, 0.5, 0.18);
	vec3 col = mix(calm, hot, vS.w);
	float al = (base + arc + fill) * vS.x;
	gl_FragColor = vec4(col * al * 1.3, al * 0.8);
}`;

const PUFF_VS = /* glsl */ `
attribute vec4 iP;   // xyz konum, w yaş (0..1)
attribute vec4 iC;   // rgb renk, a boyut
varying vec2 vUv;
varying float vA;
varying vec3 vC;
void main() {
	vUv = uv * 2.0 - 1.0;
	float age = iP.w;
	vA = (1.0 - age) * step(0.0, age) * step(age, 1.0);
	vC = iC.rgb;
	vec4 mv = viewMatrix * vec4(iP.xyz + vec3(0.0, age * 0.6, 0.0), 1.0);
	mv.xy += position.xy * iC.a * (0.4 + age * 1.1);
	gl_Position = projectionMatrix * mv;
}`;
const PUFF_FS = /* glsl */ `
varying vec2 vUv;
varying float vA;
varying vec3 vC;
void main() {
	float r = length(vUv);
	float a = (1.0 - smoothstep(0.2, 1.0, r)) * vA;
	if (a < 0.01) discard;
	gl_FragColor = vec4(vC * a, a);
}`;

export class Ghosts {
	constructor(G, max = 24) {
		this.max = max;
		this.list = [];
		const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
		const g = new THREE.InstancedBufferGeometry();
		g.index = box.index;
		g.setAttribute('position', box.getAttribute('position'));
		g.setAttribute('normal', box.getAttribute('normal'));
		this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
		this.aYaw = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
		this.aDim = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
		this.aState = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
		this.aState.setUsage(THREE.DynamicDrawUsage);
		g.setAttribute('iPos', this.aPos);
		g.setAttribute('iYaw', this.aYaw);
		g.setAttribute('iDim', this.aDim);
		g.setAttribute('iState', this.aState);
		g.instanceCount = 0;
		const blend = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
		this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: GHOST_VS, fragmentShader: GHOST_FS, uniforms: { ...G }, ...blend }));
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 5;

		const plane = new THREE.PlaneGeometry(2, 2);
		const rg = new THREE.InstancedBufferGeometry();
		rg.index = plane.index;
		rg.setAttribute('position', plane.getAttribute('position'));
		rg.setAttribute('uv', plane.getAttribute('uv'));
		rg.setAttribute('iPos', this.aPos);
		rg.setAttribute('iState', this.aState);
		this.aR = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
		rg.setAttribute('iR', this.aR);
		rg.instanceCount = 0;
		this.ring = new THREE.Mesh(rg, new THREE.ShaderMaterial({ vertexShader: RING_VS, fragmentShader: RING_FS, uniforms: { ...G }, ...blend }));
		this.ring.frustumCulled = false;
		this.ring.renderOrder = 4;
	}

	/** slots: [{x, z, yaw, w, h, t}] */
	set(slots) {
		this.list = slots;
		const n = Math.min(this.max, slots.length);
		for (let i = 0; i < n; i++) {
			const s = slots[i];
			this.aPos.array.set([s.x, 0, s.z], i * 3);
			this.aYaw.array[i] = s.yaw;
			this.aDim.array.set([s.w * 1.02, s.h * 1.02, s.t * 1.15], i * 3);
			this.aR.array[i] = s.h * 0.85;
			this.aState.array.set([1, 0, 0, 0], i * 4);
		}
		for (const a of [this.aPos, this.aYaw, this.aDim, this.aR, this.aState]) a.needsUpdate = true;
		this.mesh.geometry.instanceCount = n;
		this.ring.geometry.instanceCount = n;
	}

	/** Her kare: görünürlük, yaklaşma oranı, tehlike rengi. */
	state(i, vis, glow, near, danger) {
		const a = this.aState.array;
		a[i * 4] = vis;
		a[i * 4 + 1] = glow;
		a[i * 4 + 2] = near;
		a[i * 4 + 3] = danger;
	}

	flush() {
		this.aState.needsUpdate = true;
	}
}

/** Toz bulutları: devrilen taş yere vurunca, büyük taşlarda daha büyük. */
export class Puffs {
	constructor(G, max = 400) {
		this.max = max;
		this.n = 0;
		this.head = 0;
		const plane = new THREE.PlaneGeometry(1, 1);
		const g = new THREE.InstancedBufferGeometry();
		g.index = plane.index;
		g.setAttribute('position', plane.getAttribute('position'));
		g.setAttribute('uv', plane.getAttribute('uv'));
		this.aP = new THREE.InstancedBufferAttribute(new Float32Array(max * 4).fill(2), 4);
		this.aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
		this.aP.setUsage(THREE.DynamicDrawUsage);
		this.aC.setUsage(THREE.DynamicDrawUsage);
		g.setAttribute('iP', this.aP);
		g.setAttribute('iC', this.aC);
		g.instanceCount = max;
		this.vel = new Float32Array(max * 3);
		this.life = new Float32Array(max);
		this.mesh = new THREE.Mesh(
			g,
			new THREE.ShaderMaterial({
				vertexShader: PUFF_VS,
				fragmentShader: PUFF_FS,
				transparent: true,
				depthWrite: false,
				blending: THREE.CustomBlending,
				blendSrc: THREE.OneFactor,
				blendDst: THREE.OneMinusSrcAlphaFactor,
			}),
		);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 6;
		this.active = 0;
	}

	emit(x, y, z, size, r, g, b, count = 3, spread = 0.6, life = 0.7) {
		for (let k = 0; k < count; k++) {
			const i = this.head;
			this.head = (this.head + 1) % this.max;
			const a = Math.random() * Math.PI * 2;
			const sp = spread * (0.4 + Math.random() * 0.6);
			this.aP.array.set([x, y, z, 0], i * 4);
			this.aC.array.set([r, g, b, size * (0.7 + Math.random() * 0.6)], i * 4);
			this.vel[i * 3] = Math.cos(a) * sp;
			this.vel[i * 3 + 1] = 0.3 + Math.random() * 0.5;
			this.vel[i * 3 + 2] = Math.sin(a) * sp;
			this.life[i] = life * (0.7 + Math.random() * 0.6);
		}
		this.active = 1.5;
	}

	update(dt) {
		if (this.active <= 0) return;
		this.active -= dt;
		const P = this.aP.array;
		for (let i = 0; i < this.max; i++) {
			const age = P[i * 4 + 3];
			if (age >= 1) continue;
			P[i * 4] += this.vel[i * 3] * dt;
			P[i * 4 + 1] += this.vel[i * 3 + 1] * dt;
			P[i * 4 + 2] += this.vel[i * 3 + 2] * dt;
			this.vel[i * 3] *= 1 - dt * 2.5;
			this.vel[i * 3 + 2] *= 1 - dt * 2.5;
			P[i * 4 + 3] = Math.min(1, age + dt / this.life[i]);
		}
		this.aP.needsUpdate = true;
		this.aC.needsUpdate = true;
	}
}
