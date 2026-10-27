// Suyun üstündeki nesneler: kandil kayığı, liman (altın nilüfer), altın varaklar.
// Hepsi tekne koordinatında yaşar (x: 0..1 soldan sağa, y: 0..A aşağıdan yukarıya);
// dünyaya çevirme: X = x - 0.5, Z = A/2 - y.

import * as THREE from 'three';

const FLAME_VS = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	// kameraya dönük kart
	vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
	vec2 s = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
	mv.xy += position.xy * s;
	gl_Position = projectionMatrix * mv;
}`;

const FLAME_FS = /* glsl */ `
precision highp float;
uniform float uTime, uLife, uSeed;
varying vec2 vUv;
float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise(float x) { float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float t = uTime * 7.0 + uSeed;
	float sway = (noise(t) - 0.5) * 0.35 * (p.y + 1.0) * 0.5;
	p.x -= sway;
	// alev: alttan yuvarlak, üste sivri damla
	float y = p.y * 0.5 + 0.5;
	float w = mix(0.42, 0.02, pow(clamp(y, 0.0, 1.0), 1.3)) * (0.9 + 0.2 * noise(t * 1.7));
	float d = abs(p.x) / max(w, 1e-3);
	float body = (1.0 - smoothstep(0.55, 1.0, d)) * smoothstep(-1.0, -0.55, p.y) * (1.0 - smoothstep(0.75, 1.0, p.y));
	float core = (1.0 - smoothstep(0.0, 0.6, d)) * smoothstep(-0.9, -0.4, p.y) * (1.0 - smoothstep(-0.1, 0.4, p.y));
	vec3 c = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.86, 0.45), core);
	c = mix(c, vec3(0.45, 0.55, 1.0), (1.0 - smoothstep(-0.95, -0.7, p.y)) * 0.6 * body);
	float glow = exp(-dot(p * vec2(1.0, 0.7), p * vec2(1.0, 0.7)) * 2.2) * 0.35;
	float a = clamp(body + glow, 0.0, 1.0) * uLife;
	gl_FragColor = vec4(c * (body * 1.4 + glow * 0.9) * uLife, a);
}`;

const GLOW_FS = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uK;
varying vec2 vUv;
void main() {
	float r = length(vUv - 0.5) * 2.0;
	float g = exp(-r * r * 5.0) * (1.0 - smoothstep(0.8, 1.0, r));
	gl_FragColor = vec4(uColor * g * uK, 0.0);
}`;

const HULL_FS = /* glsl */ `
precision highp float;
uniform vec3 uLamp, uFlame;
uniform float uLife;
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
void main() {
	vec3 n = normalize(vN);
	// ceviz kabuğu: oluklar, koyu kahve
	float ribs = 0.75 + 0.25 * sin(atan(vL.z, vL.x) * 14.0 + vL.y * 30.0);
	vec3 base = vec3(0.32, 0.18, 0.09) * ribs;
	float d = max(dot(n, normalize(uLamp - vW)), 0.0);
	vec3 fl = uFlame - vW;
	float fd = max(dot(n, normalize(fl)), 0.0) / (1.0 + dot(fl, fl) * 900.0);
	vec3 c = base * (0.25 + d * 0.9) + vec3(1.0, 0.6, 0.25) * fd * 2.5 * uLife;
	gl_FragColor = vec4(c, 1.0);
}`;
const HULL_VS = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
void main() {
	vL = position;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const RING_FS = /* glsl */ `
precision highp float;
uniform float uTime, uK, uPulse;
varying vec2 vUv;
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float r = length(p);
	float a = atan(p.y, p.x);
	// nilüfer: sekiz yapraklı altın taç, ortası ışık
	float petals = 0.78 + 0.14 * pow(abs(cos(a * 4.0 + uTime * 0.3)), 3.0);
	float rim = 1.0 - smoothstep(0.0, 0.05, abs(r - petals));
	float inner = 1.0 - smoothstep(0.0, 0.03, abs(r - 0.55));
	float fill = (1.0 - smoothstep(0.0, petals, r)) * 0.22;
	float wave = (1.0 - smoothstep(0.0, 0.06, abs(r - fract(uTime * 0.5) * 1.1))) * (1.0 - fract(uTime * 0.5));
	vec3 gold = vec3(1.0, 0.78, 0.35);
	float k = rim * 0.9 + inner * 0.5 + fill + wave * 0.35 + uPulse * 0.6 * (1.0 - r);
	// koyu dış hat: açık zeminde de okunsun
	float out1 = (1.0 - smoothstep(0.0, 0.09, abs(r - petals - 0.06))) * 0.75;
	vec3 c = mix(vec3(0.12, 0.07, 0.04), gold * 1.15, clamp(k, 0.0, 1.0));
	float al = clamp(max(k, out1), 0.0, 1.0) * uK;
	gl_FragColor = vec4(c * al, al);
}`;

const LEAF_FS = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float tw = pow(max(0.0, sin(uTime * 3.0 + vSeed * 30.0)), 16.0);
	vec3 c = vec3(0.95, 0.72, 0.3) * (0.75 + 0.3 * p.x - 0.2 * p.y) + vec3(1.0, 0.95, 0.8) * tw;
	gl_FragColor = vec4(c, 1.0);
}`;
const LEAF_VS = /* glsl */ `
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
void main() {
	vUv = uv;
	vSeed = aSeed;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export class Boat {
	constructor(G, A) {
		this.A = A;
		this.x = 0.5;
		this.y = 0.2;
		this.vx = 0;
		this.vy = 0;
		this.r = 0.042;
		this.life = 1; // alev: 1 yanıyor, 0 söndü
		this.heading = 0;
		this.group = new THREE.Group();
		const u = (v) => ({ value: v });
		this.flamePos = new THREE.Vector3();
		this.hullMat = new THREE.ShaderMaterial({
			vertexShader: HULL_VS,
			fragmentShader: HULL_FS,
			uniforms: { uLamp: u(new THREE.Vector3(-1.1, 1.5, -0.9)), uFlame: u(this.flamePos), uLife: u(1) },
		});
		const hull = new THREE.Mesh(new THREE.SphereGeometry(this.r, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.hullMat);
		hull.scale.set(1, 0.55, 1.3);
		hull.rotation.x = Math.PI; // kabuk aşağı bakar, ağzı yukarı
		hull.position.y = 0.006;
		this.hull = hull;
		// küçük toprak kandil
		const clay = new THREE.Mesh(
			new THREE.CylinderGeometry(this.r * 0.32, this.r * 0.42, this.r * 0.35, 18),
			new THREE.ShaderMaterial({
				vertexShader: HULL_VS,
				fragmentShader: /* glsl */ `precision highp float; uniform vec3 uFlame; uniform float uLife; varying vec3 vW; varying vec3 vN; varying vec3 vL;
				void main(){ vec3 n=normalize(vN); vec3 fl=uFlame-vW; float fd=max(dot(n,normalize(fl)),0.0)/(1.0+dot(fl,fl)*1500.0);
				vec3 c=vec3(0.55,0.27,0.16)*(0.35+0.4*n.y)+vec3(1.0,0.55,0.2)*fd*2.0*uLife; gl_FragColor=vec4(c,1.0);}`,
				uniforms: { uFlame: u(this.flamePos), uLife: this.hullMat.uniforms.uLife },
			}),
		);
		clay.position.y = this.r * 0.32;
		this.flameMat = new THREE.ShaderMaterial({
			vertexShader: FLAME_VS,
			fragmentShader: FLAME_FS,
			uniforms: { uTime: G.uTime, uLife: u(1), uSeed: u(3.7) },
			transparent: true,
			depthWrite: false,
			blending: THREE.CustomBlending,
			blendSrc: THREE.OneFactor,
			blendDst: THREE.OneMinusSrcAlphaFactor,
		});
		const flame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.flameMat);
		flame.scale.set(this.r * 0.75, this.r * 1.5, 1);
		flame.position.y = this.r * 1.05;
		flame.renderOrder = 3;
		this.flame = flame;
		this.glowMat = new THREE.ShaderMaterial({
			vertexShader: FLAME_VS,
			fragmentShader: GLOW_FS,
			uniforms: { uColor: u(new THREE.Color(1.0, 0.6, 0.25)), uK: u(0.55) },
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.AdditiveBlending,
		});
		const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.glowMat);
		glow.scale.set(this.r * 6, this.r * 6, 1);
		glow.position.y = this.r * 1.1;
		glow.renderOrder = 4;
		this.group.add(hull, clay, flame, glow);
	}

	place(x, y) {
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = 0;
		this.life = 1;
		this.sync(0);
	}

	sync(t) {
		const bob = Math.sin(t * 2.1) * 0.0012;
		this.group.position.set(this.x - 0.5, bob, this.A / 2 - this.y);
		const sp = Math.hypot(this.vx, this.vy);
		if (sp > 0.02) this.heading += (Math.atan2(this.vx, this.vy) - this.heading) * 0.08;
		this.group.rotation.y = this.heading;
		this.group.rotation.z = Math.sin(t * 1.7) * 0.05;
		this.group.rotation.x = Math.sin(t * 1.3 + 1) * 0.04;
		this.flameMat.uniforms.uLife.value = this.life;
		this.hullMat.uniforms.uLife.value = this.life;
		this.glowMat.uniforms.uK.value = 0.55 * this.life;
		this.flame.getWorldPosition(this.flamePos);
	}
}

export class Harbor {
	constructor(G, A) {
		this.A = A;
		this.x = 0.5;
		this.y = 1.4;
		this.r = 0.075;
		this.mat = new THREE.ShaderMaterial({
			vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
			fragmentShader: RING_FS,
			uniforms: { uTime: G.uTime, uK: { value: 1 }, uPulse: { value: 0 } },
			transparent: true,
			depthWrite: false,
			blending: THREE.CustomBlending,
			blendSrc: THREE.OneFactor,
			blendDst: THREE.OneMinusSrcAlphaFactor,
		});
		this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.mat);
		this.mesh.renderOrder = 2;
	}
	place(x, y, r) {
		this.x = x;
		this.y = y;
		this.r = r;
		this.mesh.position.set(x - 0.5, 0.002, this.A / 2 - y);
		this.mesh.scale.set(r * 2.6, 1, r * 2.6);
	}
}

/** Altın varaklar: tek çizimde (instanced) yüzen küçük altın yapraklar. */
export class Leaves {
	constructor(G, A, max = 24) {
		this.A = A;
		this.list = [];
		const geo = new THREE.PlaneGeometry(0.036, 0.036).rotateX(-Math.PI / 2);
		const seeds = new Float32Array(max);
		for (let i = 0; i < max; i++) seeds[i] = Math.random();
		geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
		this.mesh = new THREE.InstancedMesh(
			geo,
			new THREE.ShaderMaterial({ vertexShader: LEAF_VS.replace('modelViewMatrix * vec4(position, 1.0)', 'modelViewMatrix * instanceMatrix * vec4(position, 1.0)'), fragmentShader: LEAF_FS, uniforms: { uTime: G.uTime } }),
			max,
		);
		this.mesh.count = 0;
		this.mesh.frustumCulled = false;
		this._m = new THREE.Matrix4();
		this._q = new THREE.Quaternion();
		this._e = new THREE.Euler();
		this._p = new THREE.Vector3();
		this._s = new THREE.Vector3(1, 1, 1);
	}
	set(points) {
		this.list = points.map((p, i) => ({ x: p.x, y: p.y, vx: 0, vy: 0, rot: i * 1.7, got: false, t: 0 }));
	}
	sync(t) {
		let n = 0;
		for (const l of this.list) {
			if (l.got && l.t > 0.5) continue;
			const k = l.got ? 1 + l.t * 3 : 1;
			this._e.set(Math.sin(t * 1.3 + l.rot) * 0.15, l.rot + t * 0.1, Math.cos(t * 1.1 + l.rot) * 0.15);
			this._q.setFromEuler(this._e);
			this._p.set(l.x - 0.5, 0.003 + (l.got ? l.t * 0.08 : 0), this.A / 2 - l.y);
			this._s.setScalar(l.got ? Math.max(0, 1 - l.t * 2) * k : 1);
			this._m.compose(this._p, this._q, this._s);
			this.mesh.setMatrixAt(n++, this._m);
		}
		this.mesh.count = n;
		this.mesh.instanceMatrix.needsUpdate = true;
	}
}
