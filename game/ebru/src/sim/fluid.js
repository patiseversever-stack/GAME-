// Ebru teknesindeki su: ekran kartında çalışan akışkan benzetimi.
//
// İki katman var:
// 1) Hız alanı (düşük çözünürlük): parmağın sürüklediği su. Kararlı akışkan yöntemi
//    (Stam): kuvvet → girdap → ıraksama → basınç (Jacobi) → basınç düzeltmesi → taşınım.
//    Ebru suyu (kitre) koyudur; hız çabuk söner, desen bıraktığın yerde kalır.
// 2) Boya alanı (yüksek çözünürlük, iki RGBA8 doku): her kanal bir boyanın yoğunluğu.
//    d0 = 4 boya, d1 = 2 boya + kara mürekkep (b) + altın varak (a).
//    Boyalar karışmaz (gerçek ebruda olduğu gibi); çizim sırasında yoğunluk 0.5 eşiğinden
//    kesilir, bu yüzden düşük çözünürlüklü doku bile ekranda jilet gibi keskin görünür.
//
// Damla: ebrudaki gibi açılan damla çevresindeki her şeyi alanı koruyarak iter
//   (Jaffer–Lu marbling dönüşümü). Bu bir benzetim değil, kesin bir dönüşüm: halkalar
//   bulanıklaşmaz. Aynı dönüşüm yüzen nesnelere de işlemci tarafında uygulanır.
//
// Pil: su durulunca (enerji eşiğin altına inince) benzetim tamamen uyur; hiçbir geçiş çizilmez.

import * as THREE from 'three';

const VS = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const HEAD = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
`;

const OUT1 = 'layout(location = 0) out vec4 o0;\n';
const OUT2 = 'layout(location = 0) out vec4 o0;\nlayout(location = 1) out vec4 o1;\n';

// Parmak darbesi: parmağın geçtiği çizgi boyunca su parmağın hızına yaklaşır.
const SPLAT = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uVel;
uniform vec2 uSize, uA, uB, uV;
uniform float uR, uK;
void main() {
	vec2 p = vUv * uSize;
	vec2 ab = uB - uA;
	float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
	vec2 d = p - (uA + ab * t);
	float g = exp(-dot(d, d) / (uR * uR)) * uK;
	vec2 v = texture(uVel, vUv).xy;
	o0 = vec4(mix(v, uV, g), 0.0, 1.0);
}`;

const CURL = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
	float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
	float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
	float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
	o0 = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORT = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uVel, uCurl;
uniform vec2 uTexel;
uniform float uK, uDt;
void main() {
	float L = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
	float C = texture(uCurl, vUv).x;
	vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
	f /= length(f) + 1e-4;
	f *= uK * C;
	f.y *= -1.0;
	vec2 v = texture(uVel, vUv).xy + f * uDt;
	o0 = vec4(clamp(v, -4.0, 4.0), 0.0, 1.0);
}`;

// Iraksama. Duvarlarda dik hız yansıtılır (su tekneden dışarı akamaz).
const DIV = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
	vec2 C = texture(uVel, vUv).xy;
	float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
	float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
	if (vUv.x - uTexel.x < 0.0) L = -C.x;
	if (vUv.x + uTexel.x > 1.0) R = -C.x;
	if (vUv.y - uTexel.y < 0.0) B = -C.y;
	if (vUv.y + uTexel.y > 1.0) T = -C.y;
	o0 = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const JACOBI = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uP, uDiv;
uniform vec2 uTexel;
uniform float uDecay;
void main() {
	float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
	float d = texture(uDiv, vUv).x;
	o0 = vec4((L + R + B + T) * 0.25 * uDecay - d * 0.25, 0.0, 0.0, 1.0);
}`;

const GRAD = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uP, uVel;
uniform vec2 uTexel;
void main() {
	float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
	vec2 v = texture(uVel, vUv).xy - 0.5 * vec2(R - L, T - B);
	// duvara dik bileşen sıfır, kenara teğet akış serbest
	vec2 e = step(uTexel * 0.75, vUv) * step(vUv, 1.0 - uTexel * 0.75);
	v *= vec2(e.x, e.y);
	o0 = vec4(v, 0.0, 1.0);
}`;

const ADV_VEL = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uVel;
uniform vec2 uInvSize;
uniform float uDt, uDiss;
void main() {
	vec2 v = texture(uVel, vUv).xy;
	vec2 q = vUv - uDt * v * uInvSize;
	o0 = vec4(texture(uVel, q).xy * uDiss, 0.0, 1.0);
}`;

// Boya taşınımı (RK2 geri izleme) + arayüz keskinleştirme: boyalar karışmayan sıvılar gibi
// sınırlarını korur (faz alanı terimi), ince iplikler çok incelince söner.
const ADV_DYE = HEAD + OUT2 + /* glsl */ `
uniform sampler2D uVel, uD0, uD1;
uniform vec2 uInvSize;
uniform float uDt, uSharp;
vec4 sharpen(vec4 c) { return c + uSharp * c * (1.0 - c) * (2.0 * c - 1.0); }
void main() {
	vec2 v1 = texture(uVel, vUv).xy;
	vec2 v2 = texture(uVel, vUv - 0.5 * uDt * v1 * uInvSize).xy;
	vec2 q = clamp(vUv - uDt * v2 * uInvSize, vec2(0.0), vec2(1.0));
	vec4 a = sharpen(texture(uD0, q));
	vec4 b = sharpen(texture(uD1, q));
	a = clamp(a, 0.0, 1.0);
	b = clamp(b, 0.0, 1.0);
	float s = dot(a, vec4(1.0)) + dot(b, vec4(1.0));
	if (s > 1.0) { a /= s; b /= s; }
	o0 = a;
	o1 = b;
}`;

// Damla: yarıçap r0'dan r1'e büyürken dışarıdaki her nokta alanı koruyarak itilir.
// Geri dönüşüm: q = c + (p - c) * sqrt(1 - (r1² - r0²) / |p - c|²)
const DROP = HEAD + OUT2 + /* glsl */ `
uniform sampler2D uD0, uD1;
uniform vec2 uSize, uC;
uniform float uR0, uR1;
uniform vec4 uC0, uC1;
void main() {
	vec2 p = vUv * uSize;
	vec2 d = p - uC;
	float d2 = dot(d, d);
	float r1s = uR1 * uR1;
	if (d2 <= r1s) {
		o0 = uC0;
		o1 = uC1;
		return;
	}
	float k = sqrt(max(1.0 - (r1s - uR0 * uR0) / d2, 0.0));
	vec2 q = (uC + d * k) / uSize;
	o0 = texture(uD0, q);
	o1 = texture(uD1, q);
}`;

// Tarak (taraklı ebru): çizgiye paralel kaydırma, çizgiden uzaklaştıkça azalır.
// Kaydırma çizgiye paralel olduğu için geri dönüşüm kesindir.
const COMB = HEAD + OUT2 + /* glsl */ `
uniform sampler2D uD0, uD1;
uniform vec2 uSize, uO, uDir;
uniform float uZ, uL, uSpace;
void main() {
	vec2 p = vUv * uSize;
	vec2 n = vec2(-uDir.y, uDir.x);
	float s = dot(p - uO, n);
	float d = uSpace > 0.0 ? abs(s - uSpace * floor(s / uSpace + 0.5)) : abs(s);
	vec2 q = (p - uDir * uZ * uL / (d + uL)) / uSize;
	o0 = texture(uD0, q);
	o1 = texture(uD1, q);
}`;

const CLEAR = HEAD + OUT2 + /* glsl */ `
void main() { o0 = vec4(0.0); o1 = vec4(0.0); }`;

const FILL = HEAD + OUT1 + /* glsl */ `
uniform vec4 uV;
void main() { o0 = uV; }`;

// Yoklama: yüzen nesnelerin altındaki suyun hızı ve boyası, 8 bitlik dokuya kodlanıp
// eşzamansız okunur (ekran kartını bekletmez).
const PROBE = HEAD + OUT1 + /* glsl */ `
uniform sampler2D uVel, uD0, uD1;
uniform vec2 uSize;
uniform vec3 uP[32];
uniform float uVMax;
vec2 enc(float x) {
	float v = clamp(x / uVMax * 0.5 + 0.5, 0.0, 1.0) * 255.0;
	float hi = floor(v);
	return vec2(hi / 255.0, fract(v));
}
void main() {
	int i = int(gl_FragCoord.x);
	vec3 P = uP[i];
	vec2 uv = P.xy / uSize;
	if (gl_FragCoord.y < 1.0) {
		vec2 v = texture(uVel, uv).xy;
		o0 = vec4(enc(v.x), enc(v.y));
		return;
	}
	vec2 o = vec2(P.z) / uSize;
	vec2 offs[5] = vec2[5](vec2(0.0), vec2(o.x, 0.0), vec2(-o.x, 0.0), vec2(0.0, o.y), vec2(0.0, -o.y));
	float ink = 0.0, inkMax = 0.0, gold = 0.0, paint = 0.0;
	for (int k = 0; k < 5; k++) {
		vec4 a = texture(uD0, uv + offs[k]);
		vec4 b = texture(uD1, uv + offs[k]);
		ink += b.b;
		inkMax = max(inkMax, b.b);
		gold += b.a;
		paint += dot(a, vec4(1.0)) + b.r + b.g;
	}
	o0 = vec4(ink / 5.0, inkMax, gold / 5.0, paint / 5.0);
}`;

const TRI = (() => {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
	return g;
})();

function target(w, h, type, count = 1, filter = THREE.LinearFilter) {
	const t = new THREE.WebGLRenderTarget(w, h, {
		type,
		format: THREE.RGBAFormat,
		minFilter: filter,
		magFilter: filter,
		wrapS: THREE.ClampToEdgeWrapping,
		wrapT: THREE.ClampToEdgeWrapping,
		depthBuffer: false,
		stencilBuffer: false,
		generateMipmaps: false,
		count,
	});
	for (const tex of t.textures) tex.colorSpace = THREE.NoColorSpace;
	return t;
}

class PingPong {
	constructor(w, h, type, count = 1) {
		this.a = target(w, h, type, count);
		this.b = target(w, h, type, count);
	}
	get read() {
		return this.a;
	}
	get write() {
		return this.b;
	}
	swap() {
		const t = this.a;
		this.a = this.b;
		this.b = t;
	}
	dispose() {
		this.a.dispose();
		this.b.dispose();
	}
}

const PROBES = 32;
const VMAX = 3;

export class Fluid {
	/**
	 * @param {THREE.WebGLRenderer} renderer
	 * @param {{aspect:number, simW:number, dyeW:number, iters:number, vorticity:number}} o
	 *   aspect: tekne yüksekliği / genişliği (genişlik her zaman 1 birim)
	 */
	constructor(renderer, o) {
		this.r = renderer;
		this.W = 1;
		this.H = o.aspect;
		this.size = new THREE.Vector2(1, o.aspect);
		this.simW = o.simW;
		this.simH = Math.round(o.simW * o.aspect);
		this.dyeW = o.dyeW;
		this.dyeH = Math.round(o.dyeW * o.aspect);
		this.iters = o.iters;
		this.vorticity = o.vorticity ? 6 : 0;
		this.viscosity = 1.7; // hızın sönme oranı (1/sn): ebru suyu koyudur
		this.sharp = 0.22;

		const HF = THREE.HalfFloatType;
		this.vel = new PingPong(this.simW, this.simH, HF);
		this.prs = new PingPong(this.simW, this.simH, HF);
		this.div = target(this.simW, this.simH, HF, 1, THREE.NearestFilter);
		this.curl = target(this.simW, this.simH, HF, 1, THREE.NearestFilter);
		this.dye = new PingPong(this.dyeW, this.dyeH, THREE.UnsignedByteType, 2);
		this.probeRT = target(PROBES, 2, THREE.UnsignedByteType, 1, THREE.NearestFilter);

		const simTexel = new THREE.Vector2(1 / this.simW, 1 / this.simH);
		const invSize = new THREE.Vector2(1, 1 / o.aspect);
		const mk = (fs, uniforms) =>
			new THREE.RawShaderMaterial({
				vertexShader: VS,
				fragmentShader: fs,
				uniforms,
				glslVersion: THREE.GLSL3,
				depthTest: false,
				depthWrite: false,
			});
		const u = (v) => ({ value: v });
		this.m = {
			splat: mk(SPLAT, { uVel: u(null), uSize: u(this.size), uA: u(new THREE.Vector2()), uB: u(new THREE.Vector2()), uV: u(new THREE.Vector2()), uR: u(0.05), uK: u(0.8) }),
			curl: mk(CURL, { uVel: u(null), uTexel: u(simTexel) }),
			vort: mk(VORT, { uVel: u(null), uCurl: u(null), uTexel: u(simTexel), uK: u(0), uDt: u(0) }),
			div: mk(DIV, { uVel: u(null), uTexel: u(simTexel) }),
			jacobi: mk(JACOBI, { uP: u(null), uDiv: u(null), uTexel: u(simTexel), uDecay: u(1) }),
			grad: mk(GRAD, { uP: u(null), uVel: u(null), uTexel: u(simTexel) }),
			advVel: mk(ADV_VEL, { uVel: u(null), uInvSize: u(invSize), uDt: u(0), uDiss: u(1) }),
			advDye: mk(ADV_DYE, { uVel: u(null), uD0: u(null), uD1: u(null), uInvSize: u(invSize), uDt: u(0), uSharp: u(0) }),
			drop: mk(DROP, { uD0: u(null), uD1: u(null), uSize: u(this.size), uC: u(new THREE.Vector2()), uR0: u(0), uR1: u(0), uC0: u(new THREE.Vector4()), uC1: u(new THREE.Vector4()) }),
			comb: mk(COMB, { uD0: u(null), uD1: u(null), uSize: u(this.size), uO: u(new THREE.Vector2()), uDir: u(new THREE.Vector2(1, 0)), uZ: u(0), uL: u(0.02), uSpace: u(0) }),
			clear: mk(CLEAR, {}),
			fill: mk(FILL, { uV: u(new THREE.Vector4()) }),
			probe: mk(PROBE, { uVel: u(null), uD0: u(null), uD1: u(null), uSize: u(this.size), uP: u(Array.from({ length: PROBES }, () => new THREE.Vector3())), uVMax: u(VMAX) }),
		};

		this.scene = new THREE.Scene();
		this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this.quad = new THREE.Mesh(TRI, this.m.clear);
		this.quad.frustumCulled = false;
		this.scene.add(this.quad);

		this.strokes = [];
		this.drops = [];
		this.frameDrops = []; // bu karede uygulanan damla adımları: yüzen nesneler aynı dönüşümle itilir
		this.frameCombs = [];
		this.energy = 0;
		this.awake = false;
		this.time = 0;

		// yoklama sonuçları (bir iki kare gecikmeli)
		this.probeN = 0;
		this.probePts = this.m.probe.uniforms.uP.value;
		this._probeBuf = new Uint8Array(PROBES * 2 * 4);
		this._probeBusy = false;
		this.sample = {
			vx: new Float32Array(PROBES),
			vy: new Float32Array(PROBES),
			ink: new Float32Array(PROBES),
			inkMax: new Float32Array(PROBES),
			gold: new Float32Array(PROBES),
			paint: new Float32Array(PROBES),
			stamp: 0,
		};

		this.reset();
	}

	_pass(mat, rt) {
		this.quad.material = mat;
		this.r.setRenderTarget(rt);
		this.r.render(this.scene, this.cam);
	}

	/** Tekneyi boşalt: boya yok, su durgun. */
	reset() {
		this.m.fill.uniforms.uV.value.set(0, 0, 0, 1);
		for (const t of [this.vel.a, this.vel.b, this.prs.a, this.prs.b]) this._pass(this.m.fill, t);
		this._pass(this.m.clear, this.dye.a);
		this._pass(this.m.clear, this.dye.b);
		this.strokes.length = 0;
		this.drops.length = 0;
		this.energy = 0;
		this.awake = false;
		// eski bölümden kalan yoklama sonuçları yeni bölüme sızmasın
		this.gen = (this.gen || 0) + 1;
		if (this.sample) for (const k of ['vx', 'vy', 'ink', 'inkMax', 'gold', 'paint']) this.sample[k].fill(0);
		this.r.setRenderTarget(null);
	}

	/** Parmak darbesi: a → b çizgisi boyunca su (vx, vy) hızına çekilir. Tekne birimi. */
	stroke(ax, ay, bx, by, vx, vy, radius = 0.06, k = 0.85) {
		const sp = Math.hypot(vx, vy);
		if (sp > VMAX * 0.95) {
			vx *= (VMAX * 0.95) / sp;
			vy *= (VMAX * 0.95) / sp;
		}
		this.strokes.push({ ax, ay, bx, by, vx, vy, radius, k });
		this.energy += Math.min(4, (vx * vx + vy * vy) * 4 + 0.05);
		this.awake = true;
	}

	/**
	 * Boya damlası. pigment: 0-5 boya, 6 kara mürekkep, 7 altın.
	 * dur 0 ise anında açılır (seviye hazırlığı için).
	 */
	drop(x, y, R, pigment, dur = 0.5) {
		const d = { x, y, R, pigment, t: 0, dur, r: 0 };
		if (dur <= 0) this._applyDrop(d, R);
		else this.drops.push(d);
		return d;
	}

	/** Tarak çekişi: (ox, oy) noktasından dir yönüne z kadar; space > 0 ise paralel dişler. */
	comb(ox, oy, dx, dy, z, lambda = 0.02, space = 0) {
		const l = Math.hypot(dx, dy) || 1;
		const m = this.m.comb.uniforms;
		m.uO.value.set(ox, oy);
		m.uDir.value.set(dx / l, dy / l);
		m.uZ.value = z;
		m.uL.value = lambda;
		m.uSpace.value = space;
		m.uD0.value = this.dye.read.textures[0];
		m.uD1.value = this.dye.read.textures[1];
		this._pass(this.m.comb, this.dye.write);
		this.dye.swap();
		this.frameCombs.push({ ox, oy, dx: dx / l, dy: dy / l, z, lambda, space });
		this.r.setRenderTarget(null);
	}

	_applyDrop(d, r1) {
		const m = this.m.drop.uniforms;
		const r0 = d.r;
		m.uC.value.set(d.x, d.y);
		m.uR0.value = r0;
		m.uR1.value = r1;
		const p = d.pigment;
		m.uC0.value.set(p === 0 ? 1 : 0, p === 1 ? 1 : 0, p === 2 ? 1 : 0, p === 3 ? 1 : 0);
		m.uC1.value.set(p === 4 ? 1 : 0, p === 5 ? 1 : 0, p === 6 ? 1 : 0, p === 7 ? 1 : 0);
		m.uD0.value = this.dye.read.textures[0];
		m.uD1.value = this.dye.read.textures[1];
		this._pass(this.m.drop, this.dye.write);
		this.dye.swap();
		this.frameDrops.push({ x: d.x, y: d.y, dA: r1 * r1 - r0 * r0, r: r1 });
		d.r = r1;
	}

	/**
	 * Noktayı bu karenin damla ve tarak dönüşümleriyle iter (yüzen nesneler için).
	 * out: {x, y}. Damlanın içine düşen nokta damlanın kenarına itilir.
	 */
	displace(x, y, out) {
		for (const f of this.frameDrops) {
			const dx = x - f.x;
			const dy = y - f.y;
			const d2 = dx * dx + dy * dy;
			if (d2 < 1e-10) {
				x = f.x + f.r;
				continue;
			}
			const k = Math.sqrt(1 + f.dA / d2);
			x = f.x + dx * k;
			y = f.y + dy * k;
		}
		for (const c of this.frameCombs) {
			const s = (x - c.ox) * -c.dy + (y - c.oy) * c.dx;
			const d = c.space > 0 ? Math.abs(s - c.space * Math.floor(s / c.space + 0.5)) : Math.abs(s);
			const z = (c.z * c.lambda) / (d + c.lambda);
			x += c.dx * z;
			y += c.dy * z;
		}
		out.x = x;
		out.y = y;
		return out;
	}

	/** Yüzen nesnelerin altını yokla. pts: [{x, y, r}] (en çok 32). Sonuç bir iki kare sonra sample'da. */
	probe(pts) {
		const n = Math.min(PROBES, pts.length);
		for (let i = 0; i < n; i++) this.probePts[i].set(pts[i].x, pts[i].y, pts[i].r || 0.02);
		this.probeN = n;
	}

	_runProbe() {
		if (this._probeBusy || !this.probeN) return;
		const m = this.m.probe.uniforms;
		m.uVel.value = this.vel.read.texture;
		m.uD0.value = this.dye.read.textures[0];
		m.uD1.value = this.dye.read.textures[1];
		this._pass(this.m.probe, this.probeRT);
		this._probeBusy = true;
		const n = this.probeN;
		const stamp = this.time;
		const awake = this.awake;
		const gen = this.gen;
		this._probeP = this.r
			.readRenderTargetPixelsAsync(this.probeRT, 0, 0, PROBES, 2, this._probeBuf)
			.then((b) => {
				if (gen !== this.gen) return;
				const s = this.sample;
				const dec = (hi, lo) => (((hi + lo / 255) / 255) * 2 - 1) * VMAX;
				for (let i = 0; i < n; i++) {
					const o = i * 4;
					s.vx[i] = awake ? dec(b[o], b[o + 1]) : 0;
					s.vy[i] = awake ? dec(b[o + 2], b[o + 3]) : 0;
					const q = (PROBES + i) * 4;
					s.ink[i] = b[q] / 255;
					s.inkMax[i] = b[q + 1] / 255;
					s.gold[i] = b[q + 2] / 255;
					s.paint[i] = b[q + 3] / 255;
				}
				s.stamp = stamp;
			})
			.catch(() => {})
			.finally(() => {
				this._probeBusy = false;
			});
	}

	/** Bir benzetim adımı. dt saniye. */
	step(dt) {
		dt = Math.min(dt, 1 / 24);
		this.time += dt;
		this.frameDrops.length = 0;
		this.frameCombs.length = 0;
		const m = this.m;

		// damlalar: r = R·sqrt(1 - e^(-t/τ)) (önce hızlı açılır, sonra yavaşlar)
		for (let i = this.drops.length - 1; i >= 0; i--) {
			const d = this.drops[i];
			d.t += dt;
			const tau = d.dur / 5;
			const done = d.t >= d.dur;
			const r1 = done ? d.R : d.R * Math.sqrt(1 - Math.exp(-d.t / tau));
			if (r1 > d.r + 1e-5) this._applyDrop(d, r1);
			if (done) this.drops.splice(i, 1);
		}

		if (this.awake) {
			for (const s of this.strokes) {
				const u = m.splat.uniforms;
				u.uVel.value = this.vel.read.texture;
				u.uA.value.set(s.ax, s.ay);
				u.uB.value.set(s.bx, s.by);
				u.uV.value.set(s.vx, s.vy);
				u.uR.value = s.radius;
				u.uK.value = s.k;
				this._pass(m.splat, this.vel.write);
				this.vel.swap();
			}
			this.strokes.length = 0;

			if (this.vorticity > 0) {
				m.curl.uniforms.uVel.value = this.vel.read.texture;
				this._pass(m.curl, this.curl);
				const v = m.vort.uniforms;
				v.uVel.value = this.vel.read.texture;
				v.uCurl.value = this.curl.texture;
				v.uK.value = this.vorticity;
				v.uDt.value = dt;
				this._pass(m.vort, this.vel.write);
				this.vel.swap();
			}

			m.div.uniforms.uVel.value = this.vel.read.texture;
			this._pass(m.div, this.div);
			const j = m.jacobi.uniforms;
			j.uDiv.value = this.div.texture;
			for (let i = 0; i < this.iters; i++) {
				j.uP.value = this.prs.read.texture;
				j.uDecay.value = i === 0 ? 0.8 : 1;
				this._pass(m.jacobi, this.prs.write);
				this.prs.swap();
			}
			const g = m.grad.uniforms;
			g.uP.value = this.prs.read.texture;
			g.uVel.value = this.vel.read.texture;
			this._pass(m.grad, this.vel.write);
			this.vel.swap();

			const a = m.advVel.uniforms;
			a.uVel.value = this.vel.read.texture;
			a.uDt.value = dt;
			a.uDiss.value = Math.exp(-this.viscosity * dt);
			this._pass(m.advVel, this.vel.write);
			this.vel.swap();

			const ad = m.advDye.uniforms;
			ad.uVel.value = this.vel.read.texture;
			ad.uD0.value = this.dye.read.textures[0];
			ad.uD1.value = this.dye.read.textures[1];
			ad.uDt.value = dt;
			ad.uSharp.value = this.sharp;
			this._pass(m.advDye, this.dye.write);
			this.dye.swap();

			this.energy *= Math.exp(-2 * this.viscosity * dt);
			if (this.energy < 0.004) {
				// su duruldu: hızı sıfırla ve uyu
				m.fill.uniforms.uV.value.set(0, 0, 0, 1);
				this._pass(m.fill, this.vel.read);
				this.awake = false;
			}
		}

		this._runProbe();
		this.r.setRenderTarget(null);
	}

	get busy() {
		return this.awake || this.drops.length > 0;
	}

	dispose() {
		this.vel.dispose();
		this.prs.dispose();
		this.div.dispose();
		this.curl.dispose();
		this.dye.dispose();
		this.probeRT.dispose();
		for (const k in this.m) this.m[k].dispose();
	}
}
