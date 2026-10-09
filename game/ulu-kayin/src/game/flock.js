// Sürü: gölgede yürüdükçe Zifir'in çevresine toplanan mürekkep kırlangıçları.
// Dört kuş toplanınca oyuncu Sürü'yü çağırır: kuşlar Zifir'den fışkıran eşlikçileriyle birlikte
// Zifir ile güneşin arasında dönen bir girdap kurar ve birkaç saniye onu gölgeler (kristal ışınları dahil).
//
// Çizim: tek örneklenmiş (instanced) ağ, ana sahnede 1 çizim; sürü uçarken gölge haritasına da
// 1 çizim (kuşların gölgesi Zifir'in üstünde gerçekten görünür). Konumlar işlemcide hesaplanır
// (en fazla 12 kuş); kare başına yeni nesne üretilmez.

import * as THREE from 'three';
import { COMMON, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { trunkRadius } from '../world/layout.js';
import { damp, clamp, TAU } from '../core/math.js';

const MAXB = 12; // 4 toplanan + 8 eşlikçi (yalnızca sürü uçarken)
export const GATHER = 4; // Sürü için gereken kuş
const SHIELD_D = 1.75; // girdabın Zifir'den güneşe doğru uzaklığı
const SHIELD_R = 1.05; // oyun için gölge küresinin yarıçapı

/** Kırlangıç silueti: sivri, geriye yatık kanatlar ve çatal kuyruk. aW: kanat ağırlığı, uç gecikmesi, kenar parıltısı. */
function swallowGeometry() {
	const pos = [];
	const w = [];
	const v = (x, y, z, a, b, c) => {
		pos.push(x, y, z);
		w.push(a, b, c);
	};
	const tri = (A, B, C) => {
		v(...A);
		v(...B);
		v(...C);
	};
	// [x, y, z, ağırlık, gecikme, parıltı]
	const H = [0, 0.02, 0.36, 0, 0, 0.15];
	const NL = [-0.06, 0, 0.13, 0, 0, 0];
	const NR = [0.06, 0, 0.13, 0, 0, 0];
	const TR = [0, 0, -0.12, 0, 0, 0];
	tri(H, NL, NR);
	tri(NL, TR, NR);
	// çatal kuyruk
	const TL = [-0.13, 0, -0.38, 0.15, 0.5, 0.6];
	const TRt = [0.13, 0, -0.38, 0.15, 0.5, 0.6];
	const TM = [0, 0, -0.26, 0, 0, 0.1];
	tri(TR, TL, TM);
	tri(TR, TM, TRt);
	for (const s of [-1, 1]) {
		const RF = [0.04 * s, 0, 0.15, 0, 0, 0];
		const RB = [0.05 * s, 0, -0.06, 0, 0, 0];
		const EF = [0.31 * s, 0, 0.11, 1, 0.25, 0.35];
		const EB = [0.29 * s, 0, -0.07, 1, 0.25, 0.25];
		const T = [0.68 * s, 0, -0.22, 1, 1, 1];
		tri(RF, EF, RB);
		tri(RB, EF, EB);
		tri(EF, T, EB);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('aW', new THREE.Float32BufferAttribute(w, 3));
	return g;
}

const BIRD_VS = /* glsl */ `
	attribute vec3 aW;
	attribute vec4 iP; // konum, ölçek
	attribute vec4 iF; // uçuş yönü, kanat evresi
	attribute vec2 iB; // yatış, parıltı
	varying vec3 vW; varying float vRim;
	void main() {
		vec3 p = position;
		float f = sin(iF.w - aW.y * 1.2);
		p.y += abs(p.x) * f * 0.8 * aW.x;
		p.x *= 1.0 - 0.16 * max(-f, 0.0) * aW.x;
		vec3 fwd = normalize(iF.xyz + vec3(1e-4, 0.0, 0.0));
		vec3 rt = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 0.0, 1e-4));
		vec3 up = cross(rt, fwd);
		float cb = cos(iB.x), sb = sin(iB.x);
		vec3 r2 = rt * cb + up * sb;
		vec3 u2 = up * cb - rt * sb;
		vec3 w = iP.xyz + (r2 * p.x + u2 * p.y + fwd * p.z) * iP.w;
		vW = w;
		vRim = aW.z * iB.y;
		gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
	}`;

export class Flock {
	constructor(G, scene, shadowScene) {
		const base = swallowGeometry();
		const geo = new THREE.InstancedBufferGeometry();
		geo.setAttribute('position', base.getAttribute('position'));
		geo.setAttribute('aW', base.getAttribute('aW'));
		this.aP = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aF = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aB = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 2), 2).setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute('iP', this.aP);
		geo.setAttribute('iF', this.aF);
		geo.setAttribute('iB', this.aB);
		geo.instanceCount = 0;
		this.geo = geo;
		const mat = new THREE.ShaderMaterial({
			vertexShader: BIRD_VS,
			fragmentShader: /* glsl */ `
				${COMMON}
				${LIGHT}
				${FINISH}
				varying vec3 vW; varying float vRim;
				void main() {
					// mürekkep siluet; kanat uçlarında Zifir'in mor kenar ışığı, güneş arkadaysa altın sızıntı
					vec3 c = vec3(0.03, 0.022, 0.06) + vec3(0.36, 0.27, 0.9) * vRim * 0.55;
					vec3 V = normalize(cameraPosition - vW);
					c += uSunCol * pow(max(dot(-V, uSunDir), 0.0), 6.0) * vRim * 0.25;
					gl_FragColor = finish(applyFog(c, vW), 1.0);
				}`,
			uniforms: { ...G },
			side: THREE.DoubleSide,
		});
		this.mesh = new THREE.Mesh(geo, mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 8;
		this.mesh.visible = false;
		scene.add(this.mesh);
		// gölge haritası: aynı geometri, yalnızca derinlik
		if (shadowScene) {
			const dmat = new THREE.ShaderMaterial({
				vertexShader: BIRD_VS,
				fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`,
				uniforms: { ...G },
				side: THREE.DoubleSide,
				colorWrite: false,
			});
			this.shadowMesh = new THREE.Mesh(geo, dmat);
			this.shadowMesh.frustumCulled = false;
			this.shadowMesh.matrixAutoUpdate = false;
			this.shadowMesh.visible = false;
			shadowScene.add(this.shadowMesh);
		}
		this.birds = [];
		for (let i = 0; i < MAXB; i++) this.birds.push({ i, st: 'off', x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, hx: 0, hy: 0, hz: 1, ph: Math.random() * TAU, sc: 0, tsc: 0, t: 0, bank: 0, ox: 0, oy: 0, oz: 0 });
		this.count = 0; // toplanmış kuş
		this.active = 0; // sürünün kalan süresi
		this.dur = 1;
		this.c = new THREE.Vector3(); // gölge girdabının merkezi
		this._e1 = new THREE.Vector3();
		this._e2 = new THREE.Vector3();
		this._L = new THREE.Vector3(0, 1, 0);
		this.glow = 0; // hazır olunca kuşlar parlar
	}

	/** Bölüm başı: n kuş hazır, yörüngede. */
	reset(n, zp) {
		this.count = 0;
		this.active = 0;
		for (const b of this.birds) {
			b.st = 'off';
			b.sc = 0;
		}
		for (let k = 0; k < n; k++) this.add(zp, true);
		this.mesh.visible = n > 0;
	}

	/** Yeni bir kuş katılır: uzaktan süzülerek gelir (instant: doğrudan yörüngede). */
	add(zp, instant = false) {
		if (this.count >= GATHER) return false;
		const b = this.birds[this.count++];
		b.st = 'orbit';
		b.t = 0;
		b.tsc = 0.5;
		if (instant) {
			const a = (b.i / GATHER) * TAU;
			b.x = zp.x + Math.cos(a) * 1.3;
			b.y = zp.y + 1.8;
			b.z = zp.z + Math.sin(a) * 1.3;
			b.vx = b.vy = b.vz = 0;
			b.sc = 0.5;
		} else {
			// gökten, rastgele bir yönden süzülerek
			const a = Math.random() * TAU;
			b.x = zp.x + Math.cos(a) * 13;
			b.y = zp.y + 7 + Math.random() * 3;
			b.z = zp.z + Math.sin(a) * 13;
			b.vx = -Math.cos(a) * 4;
			b.vy = -2;
			b.vz = -Math.sin(a) * 4;
			b.sc = 0.5;
		}
		this.mesh.visible = true;
		return true;
	}

	get ready() {
		return this.count >= GATHER && this.active <= 0;
	}

	/** Sürüyü çağır: toplananlar ve Zifir'den fışkıran eşlikçiler güneşin önünde döner. */
	activate(dur, zp) {
		if (!this.ready) return false;
		this.active = dur;
		this.dur = dur;
		for (const b of this.birds) {
			if (b.st === 'off') {
				// mürekkepten doğar: Zifir'in içinden dışa fışkırır
				const a = Math.random() * TAU;
				b.x = zp.x;
				b.y = zp.y + 0.5;
				b.z = zp.z;
				b.vx = Math.cos(a) * 5;
				b.vy = 3 + Math.random() * 3;
				b.vz = Math.sin(a) * 5;
				b.sc = 0.05;
			}
			b.st = 'shield';
			b.t = 0;
			b.tsc = b.i < GATHER ? 0.85 : 0.72;
		}
		this.mesh.visible = true;
		if (this.shadowMesh) this.shadowMesh.visible = true;
		return true;
	}

	/** Bütün kuşlar dağılır (sürü bitti ya da bölüm kazanıldı). */
	release(up = false) {
		for (const b of this.birds) {
			if (b.st === 'off') continue;
			b.st = 'leave';
			b.t = 0;
			const a = Math.random() * TAU;
			b.ox = Math.cos(a) * 9;
			b.oy = (up ? 9 : 5) + Math.random() * 4;
			b.oz = Math.sin(a) * 9;
		}
		this.count = 0;
		this.active = 0;
	}

	hide() {
		for (const b of this.birds) {
			b.st = 'off';
			b.sc = 0;
		}
		this.count = 0;
		this.active = 0;
		this.mesh.visible = false;
		if (this.shadowMesh) this.shadowMesh.visible = false;
		this.geo.instanceCount = 0;
	}

	/** Sürü bir noktayı (güneşe doğru ışınını) örtüyor mu? Yalnızca Zifir ve yakın damlalar için. */
	blocks(px, py, pz, L) {
		if (this.active <= 0) return false;
		const vx = this.c.x - px;
		const vy = this.c.y - py;
		const vz = this.c.z - pz;
		const t = vx * L.x + vy * L.y + vz * L.z;
		if (t < 0) return false;
		const d2 = vx * vx + vy * vy + vz * vz - t * t;
		return d2 < SHIELD_R * SHIELD_R;
	}

	/** Sürünün gücü 0..1 (son saniyede seyrelir). */
	get strength() {
		return this.active > 0 ? clamp(this.active / 0.6, 0, 1) : 0;
	}

	update(dt, time, zp, sunDir) {
		const L = this._L.copy(sunDir);
		if (L.y < 0.05) L.y = 0.05;
		L.normalize();
		// girdap merkezi: Zifir'in gövdesinden güneşe doğru; ağacın içine girmesin
		const c = this.c.set(zp.x + L.x * SHIELD_D, zp.y + 0.55 + L.y * SHIELD_D, zp.z + L.z * SHIELD_D);
		const rr = Math.hypot(c.x, c.z);
		const tr = trunkRadius(c.y) + 0.9;
		if (rr < tr) {
			c.x *= tr / rr;
			c.z *= tr / rr;
		}
		const e1 = this._e1.set(-L.z, 0, L.x);
		if (e1.lengthSq() < 1e-4) e1.set(1, 0, 0);
		e1.normalize();
		const e2 = this._e2.crossVectors(e1, L).normalize();

		const was = this.active;
		if (this.active > 0) {
			this.active -= dt;
			if (this.active <= 0) {
				this.active = 0;
				this.release(false);
			}
		}
		void was;
		this.glow = damp(this.glow, this.ready ? 1 : 0.25, 4, dt);

		const P = this.aP.array;
		const F = this.aF.array;
		const B = this.aB.array;
		let n = 0;
		let any = false;
		for (const b of this.birds) {
			if (b.st === 'off') continue;
			any = true;
			b.t += dt;
			let tx;
			let ty;
			let tz;
			let maxV = 6;
			let acc = 4;
			let flap = 9;
			let bank = 0;
			let fx = 0;
			let fz = 0;
			let tang = 0;
			if (b.st === 'orbit') {
				// Zifir'in tepesinde gevşek bir halka
				const a = time * 1.25 + (b.i / GATHER) * TAU;
				const r = 1.2 + 0.18 * Math.sin(time * 0.9 + b.i * 2.1);
				tx = zp.x + Math.cos(a) * r;
				ty = zp.y + 1.75 + 0.25 * Math.sin(time * 1.7 + b.i * 1.3);
				tz = zp.z + Math.sin(a) * r;
				fx = -Math.sin(a);
				fz = Math.cos(a);
				tang = 1;
				bank = -0.45;
				maxV = b.t < 2.5 ? 10 : 7;
				acc = b.t < 2.5 ? 3 : 7;
				flap = 8 + (b.t < 2.5 ? 6 : 0);
			} else if (b.st === 'shield') {
				// iki zıt yönlü halka: güneşin önünde dönen yoğun bir gölge
				const ring = b.i % 2;
				const k = b.i >> 1;
				const dir = ring ? -1 : 1;
				const a = time * (ring ? 3.4 : 2.7) * dir + (k / 6) * TAU;
				const r = (ring ? 0.95 : 0.5) * (0.75 + 0.25 * this.strength);
				const off = ring ? 0.18 : -0.12;
				const ca = Math.cos(a);
				const sa = Math.sin(a);
				tx = c.x + e1.x * ca * r + e2.x * sa * r + L.x * off;
				ty = c.y + e1.y * ca * r + e2.y * sa * r + L.y * off;
				tz = c.z + e1.z * ca * r + e2.z * sa * r + L.z * off;
				// halkanın teğeti yönünde uç
				fx = (-e1.x * sa + e2.x * ca) * dir;
				fz = (-e1.z * sa + e2.z * ca) * dir;
				tang = b.t > 0.35 ? 1 : 0;
				bank = 0.7 * dir;
				maxV = 16;
				acc = b.t < 0.4 ? 5 : 14;
				flap = 15;
			} else {
				// dağıl: yukarı ve dışarı süzül, küçülerek kaybol
				tx = b.x + b.ox;
				ty = b.y + b.oy;
				tz = b.z + b.oz;
				maxV = 9;
				acc = 2.5;
				flap = 13;
				b.tsc = Math.max(0, 0.6 - b.t * 0.45);
				if (b.t > 1.6) {
					b.st = 'off';
					b.sc = 0;
					continue;
				}
			}
			// arama davranışı: hedefe doğru hızlan, yaklaşınca yavaşla
			const dx = tx - b.x;
			const dy = ty - b.y;
			const dz = tz - b.z;
			const d = Math.hypot(dx, dy, dz) || 1e-4;
			const sp = Math.min(maxV, d * 3.2);
			b.vx = damp(b.vx, (dx / d) * sp, acc, dt);
			b.vy = damp(b.vy, (dy / d) * sp, acc, dt);
			b.vz = damp(b.vz, (dz / d) * sp, acc, dt);
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			b.z += b.vz * dt;
			// yön: hızlıyken hız yönü, halkadayken teğet
			const v = Math.hypot(b.vx, b.vy, b.vz);
			const w = tang ? clamp(1.5 - v / 4, 0, 1) : 0;
			const hx = b.vx / (v || 1) * (1 - w) + fx * w;
			const hy = (b.vy / (v || 1)) * (1 - w) * 0.6;
			const hz = b.vz / (v || 1) * (1 - w) + fz * w;
			b.hx = damp(b.hx, hx, 10, dt);
			b.hy = damp(b.hy, hy, 10, dt);
			b.hz = damp(b.hz, hz, 10, dt);
			b.bank = damp(b.bank, bank, 5, dt);
			b.sc = damp(b.sc, b.tsc, 6, dt);
			// tırmanırken hızlı, süzülürken seyrek kanat
			b.ph += dt * (flap + Math.max(0, b.vy) * 2) * (0.7 + 0.3 * Math.sin(time * 0.7 + b.i * 3.1) * (b.st === 'orbit' ? 1 : 0));
			P[n * 4] = b.x;
			P[n * 4 + 1] = b.y;
			P[n * 4 + 2] = b.z;
			P[n * 4 + 3] = b.sc;
			F[n * 4] = b.hx;
			F[n * 4 + 1] = b.hy;
			F[n * 4 + 2] = b.hz;
			F[n * 4 + 3] = b.ph;
			B[n * 2] = b.bank;
			B[n * 2 + 1] = b.st === 'shield' ? 0.9 : this.glow;
			n++;
		}
		this.geo.instanceCount = n;
		this.mesh.visible = any;
		if (this.shadowMesh) this.shadowMesh.visible = this.active > 0 && n > 0;
		if (n) {
			this.aP.needsUpdate = true;
			this.aF.needsUpdate = true;
			this.aB.needsUpdate = true;
		}
	}
}
