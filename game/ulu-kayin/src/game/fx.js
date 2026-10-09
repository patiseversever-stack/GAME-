// Kısa ömürlü efekt parçacıkları: damla toplama pırıltısı, yanma buharı, kazanma çiçek yağmuru.
// Sabit boyutlu havuz, tek çizim çağrısı; ölü parçacık çizilmez, yeni nesne üretilmez.

import * as THREE from 'three';

const MAX = 320;

export class FxPool {
	constructor(G, atlas, { additive = false } = {}) {
		this.n = 0;
		this.p = new Float32Array(MAX * 3); // konum
		this.v = new Float32Array(MAX * 3); // hız
		this.life = new Float32Array(MAX * 2); // kalan, toplam
		this.par = new Float32Array(MAX * 4); // boyut0, boyut1, yerçekimi, sürüklenme
		this.col = new Float32Array(MAX * 4);
		this.cell = new Float32Array(MAX);
		this.spin = new Float32Array(MAX * 2);

		const geo = new THREE.InstancedBufferGeometry();
		const q = new THREE.PlaneGeometry(1, 1);
		geo.setIndex(q.index);
		geo.setAttribute('position', q.getAttribute('position'));
		this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2).setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute('iPos', this.aPos);
		geo.setAttribute('iCol', this.aCol);
		geo.setAttribute('iRot', this.aRot);
		geo.instanceCount = 0;
		this.geo = geo;
		const mat = new THREE.ShaderMaterial({
			vertexShader: /* glsl */ `
				attribute vec4 iPos; attribute vec4 iCol; attribute vec2 iRot;
				varying vec2 vUv; varying vec4 vCol;
				void main() {
					vec3 toCam = normalize(cameraPosition - iPos.xyz);
					vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
					vec3 up = cross(toCam, right);
					float c = cos(iRot.y), s = sin(iRot.y);
					vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
					vec3 w = iPos.xyz + (right * q.x + up * q.y) * iPos.w;
					vUv = (position.xy + 0.5) * 0.5 + vec2(mod(iRot.x, 2.0), 1.0 - floor(iRot.x / 2.0)) * 0.5;
					vCol = iCol;
					gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
				}`,
			fragmentShader: additive
				? /* glsl */ `
				uniform sampler2D uMap; varying vec2 vUv; varying vec4 vCol;
				void main() { vec4 t = texture2D(uMap, vUv); vec3 c = vCol.rgb * t.a * vCol.a; gl_FragColor = vec4(c / (1.0 + c * 0.3), 1.0); }`
				: /* glsl */ `
				uniform sampler2D uMap; varying vec2 vUv; varying vec4 vCol;
				void main() { vec4 t = texture2D(uMap, vUv); float a = t.a * vCol.a; if (a < 0.02) discard;
					vec3 c = pow(clamp(t.rgb * vCol.rgb, 0.0, 1.0), vec3(1.0 / 2.2)); gl_FragColor = vec4(c * a, a); }`,
			uniforms: { uMap: { value: atlas } },
			transparent: true,
			depthWrite: false,
			blending: additive ? THREE.AdditiveBlending : THREE.CustomBlending,
			blendSrc: THREE.OneFactor,
			blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
		});
		this.mesh = new THREE.Mesh(geo, mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 35;
	}

	/** Bir parçacık ekler: konum, hız, ömür, başlangıç/bitiş boyutu, yerçekimi, sürüklenme, renk, atlas hücresi. */
	emit(x, y, z, vx, vy, vz, life, s0, s1, grav, drag, r, g, b, a, cell, spin = 0) {
		if (this.n >= MAX) return;
		const i = this.n++;
		this.p[i * 3] = x;
		this.p[i * 3 + 1] = y;
		this.p[i * 3 + 2] = z;
		this.v[i * 3] = vx;
		this.v[i * 3 + 1] = vy;
		this.v[i * 3 + 2] = vz;
		this.life[i * 2] = life;
		this.life[i * 2 + 1] = life;
		this.par[i * 4] = s0;
		this.par[i * 4 + 1] = s1;
		this.par[i * 4 + 2] = grav;
		this.par[i * 4 + 3] = drag;
		this.col[i * 4] = r;
		this.col[i * 4 + 1] = g;
		this.col[i * 4 + 2] = b;
		this.col[i * 4 + 3] = a;
		this.cell[i] = cell;
		this.spin[i * 2] = Math.random() * 6.28;
		this.spin[i * 2 + 1] = spin;
	}

	update(dt) {
		let w = 0;
		const P = this.aPos.array;
		const C = this.aCol.array;
		const Rr = this.aRot.array;
		for (let i = 0; i < this.n; i++) {
			const l = this.life[i * 2] - dt;
			if (l <= 0) continue;
			// sıkıştır: canlı parçacıkları dizinin başına taşı
			if (w !== i) {
				this.p.copyWithin(w * 3, i * 3, i * 3 + 3);
				this.v.copyWithin(w * 3, i * 3, i * 3 + 3);
				this.life[w * 2 + 1] = this.life[i * 2 + 1];
				this.par.copyWithin(w * 4, i * 4, i * 4 + 4);
				this.col.copyWithin(w * 4, i * 4, i * 4 + 4);
				this.cell[w] = this.cell[i];
				this.spin.copyWithin(w * 2, i * 2, i * 2 + 2);
			}
			this.life[w * 2] = l;
			const drag = Math.exp(-this.par[w * 4 + 3] * dt);
			this.v[w * 3] *= drag;
			this.v[w * 3 + 1] = this.v[w * 3 + 1] * drag - this.par[w * 4 + 2] * dt;
			this.v[w * 3 + 2] *= drag;
			this.p[w * 3] += this.v[w * 3] * dt;
			this.p[w * 3 + 1] += this.v[w * 3 + 1] * dt;
			this.p[w * 3 + 2] += this.v[w * 3 + 2] * dt;
			this.spin[w * 2] += this.spin[w * 2 + 1] * dt;
			const t = 1 - l / this.life[w * 2 + 1];
			const fade = Math.min(1, t * 6) * (1 - t * t);
			P[w * 4] = this.p[w * 3];
			P[w * 4 + 1] = this.p[w * 3 + 1];
			P[w * 4 + 2] = this.p[w * 3 + 2];
			P[w * 4 + 3] = this.par[w * 4] + (this.par[w * 4 + 1] - this.par[w * 4]) * t;
			C[w * 4] = this.col[w * 4];
			C[w * 4 + 1] = this.col[w * 4 + 1];
			C[w * 4 + 2] = this.col[w * 4 + 2];
			C[w * 4 + 3] = this.col[w * 4 + 3] * fade;
			Rr[w * 2] = this.cell[w];
			Rr[w * 2 + 1] = this.spin[w * 2];
			w++;
		}
		this.n = w;
		this.geo.instanceCount = w;
		if (w > 0) {
			this.aPos.clearUpdateRanges();
			this.aCol.clearUpdateRanges();
			this.aRot.clearUpdateRanges();
			this.aPos.addUpdateRange(0, w * 4);
			this.aCol.addUpdateRange(0, w * 4);
			this.aRot.addUpdateRange(0, w * 2);
			this.aPos.needsUpdate = true;
			this.aCol.needsUpdate = true;
			this.aRot.needsUpdate = true;
		}
	}

	clear() {
		this.n = 0;
		this.geo.instanceCount = 0;
	}
}

/** Hazır efektler */
export function burstSparkle(fx, x, y, z, n = 18, col = [1.6, 1.3, 2.6]) {
	for (let i = 0; i < n; i++) {
		const a = Math.random() * Math.PI * 2;
		const e = (Math.random() - 0.2) * 1.2;
		const sp = 1.2 + Math.random() * 2.2;
		fx.emit(x, y, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 1.2, Math.sin(a) * Math.cos(e) * sp, 0.7 + Math.random() * 0.5, 0.28, 0.05, 1.6, 2.2, col[0], col[1], col[2], 1, 3);
	}
}

export function puffSteam(fx, x, y, z, k = 1) {
	fx.emit(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3, 0.9, 0.18 * k, 0.6 * k, -0.4, 1.4, 1.9, 0.8, 0.3, 0.55, 3);
}
