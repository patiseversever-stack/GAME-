// Gece damlaları: patika üstünde süzülen mürekkep damlaları. Işıkta erirler; gölgede tutup
// Zifir'e toplatmak gerekir. Hepsi aynı geometri ve malzemeyi paylaşır.

import * as THREE from 'three';
import { COMMON, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { glowSprites } from '../world/world.js';
import { puffSteam, burstSparkle } from './fx.js';
import { damp } from '../core/math.js';

const MAXD = 8;

function dropGeometry() {
	const g = new THREE.SphereGeometry(0.16, 20, 14);
	const P = g.getAttribute('position');
	for (let i = 0; i < P.count; i++) {
		let x = P.getX(i);
		let y = P.getY(i);
		let z = P.getZ(i);
		if (y > 0) {
			// gözyaşı biçimi: üst sivrilir
			const t = y / 0.16;
			y *= 1 + t * 0.9;
			x *= 1 - t * 0.75;
			z *= 1 - t * 0.75;
		}
		P.setXYZ(i, x, y, z);
	}
	g.computeVertexNormals();
	return g;
}

export class DropSet {
	constructor(G, tex, scene) {
		this.G = G;
		this.geo = dropGeometry();
		this.mat = new THREE.ShaderMaterial({
			vertexShader: /* glsl */ `
				varying vec3 vN; varying vec3 vW; varying vec3 vL;
				void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
			fragmentShader: /* glsl */ `
				${COMMON}
				${LIGHT}
				${FINISH}
				varying vec3 vN; varying vec3 vW; varying vec3 vL;
				void main() {
					vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
					float fr = pow(1.0 - max(dot(N, V), 0.0), 2.2);
					vec3 c = vec3(0.015, 0.01, 0.035) + vec3(0.62, 0.52, 1.25) * fr * 1.8;
					float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 90.0);
					c += uSunCol * 0.35 * sp;
					// içinde kıpırdayan yıldız tozu
					float tw = sin(vL.x * 60.0 + uTime * 3.0) * sin(vL.y * 50.0 - uTime * 2.3) * sin(vL.z * 55.0 + uTime * 1.7);
					c += vec3(1.2, 1.1, 2.0) * smoothstep(0.82, 0.98, tw) * (1.0 - fr);
					gl_FragColor = finish(c, 1.0);
				}`,
			uniforms: { ...G },
		});
		this.meshes = [];
		for (let i = 0; i < MAXD; i++) {
			const m = new THREE.Mesh(this.geo, this.mat);
			m.visible = false;
			m.renderOrder = 6;
			scene.add(m);
			this.meshes.push(m);
		}
		const pts = Array.from({ length: MAXD }, () => new THREE.Vector3(0, -999, 0));
		this.glow = glowSprites(pts, tex.glow, G, 0.55, 0x8f7cff);
		this.glow.mat.uniforms.uK.value = 0.7;
		scene.add(this.glow.mesh);
		this.list = [];
		this._p = {};
		this._L = new THREE.Vector3();
	}

	/** Bölümün damlalarını patikaya yerleştirir. */
	setup(curve, s0, s1, specs) {
		this.list = specs.map(([u, side], i) => {
			const s = s0 + (s1 - s0) * u;
			const p = curve.sample(s, {});
			const lat = side * 0.62;
			return {
				i,
				s,
				x: p.x + p.sx * lat,
				y: p.y + 0.55,
				z: p.z + p.sz * lat,
				melt: 0,
				state: 'idle', // idle | fly | got | lost
				t: 0,
				lit: 0,
			};
		});
		for (let i = 0; i < MAXD; i++) this.meshes[i].visible = i < this.list.length;
		this.glow.mesh.geometry.instanceCount = this.list.length;
	}

	get total() {
		return this.list.length;
	}

	get got() {
		return this.list.filter((d) => d.state === 'got' || d.state === 'fly').length;
	}

	get lost() {
		return this.list.filter((d) => d.state === 'lost').length;
	}

	/**
	 * zs: Zifir'in patika konumu, zp: dünya konumu, tester: gölge testi, sunDir: güneş yönü
	 * onCollect(d), onLost(d)
	 */
	update(dt, time, zs, zp, tester, sunDir, fx, onCollect, onLost, active) {
		const A = this.glow.attr.array;
		for (const d of this.list) {
			const m = this.meshes[d.i];
			d.t += dt;
			if (d.state === 'idle') {
				// ışıkta erime: yalnızca Zifir'e yakın olanlar test edilir
				// yalnızca Zifir'in hemen önündeki damlalar erir (uzaktakiler henüz oyuncunun derdi değil)
				if (active && d.s - zs < 9 && d.s - zs > -1) {
					const lit = !tester.blocked(d.x, d.y + 0.1, d.z, sunDir) || (this.beams && this.beams.litAt(d.x, d.y, d.z));
					d.lit = damp(d.lit, lit ? 1 : 0, 12, dt);
					if (lit) {
						d.melt = Math.min(1, d.melt + dt * 0.3);
						if (Math.random() < dt * 14) puffSteam(fx, d.x, d.y + 0.15, d.z, 0.6);
						if (d.melt >= 1) {
							d.state = 'lost';
							burstSparkle(fx, d.x, d.y, d.z, 12, [2.4, 0.9, 0.3]);
							onLost(d);
						}
					} else d.melt = Math.max(0, d.melt - dt * 0.12);
				}
				// toplama
				if (active && Math.abs(d.s - zs) < 0.55) {
					d.state = 'fly';
					d.t = 0;
				}
				const k = 1 - d.melt * 0.65;
				const shiver = d.lit * 0.02;
				m.position.set(d.x + (Math.random() - 0.5) * shiver, d.y + Math.sin(time * 2.2 + d.i) * 0.07, d.z + (Math.random() - 0.5) * shiver);
				m.rotation.y = time * 0.8 + d.i;
				m.scale.setScalar(k);
				A[d.i * 4] = m.position.x;
				A[d.i * 4 + 1] = m.position.y;
				A[d.i * 4 + 2] = m.position.z;
				A[d.i * 4 + 3] = 0.55 * k * (1 - d.lit * 0.5);
			} else if (d.state === 'fly') {
				// Zifir'e doğru küçülerek uçar
				const t = Math.min(1, d.t / 0.28);
				m.position.set(d.x + (zp.x - d.x) * t, d.y + (zp.y + 0.5 - d.y) * t + Math.sin(t * Math.PI) * 0.4, d.z + (zp.z - d.z) * t);
				m.scale.setScalar(1 - t * 0.8);
				A[d.i * 4] = m.position.x;
				A[d.i * 4 + 1] = m.position.y;
				A[d.i * 4 + 2] = m.position.z;
				A[d.i * 4 + 3] = 0.55 * (1 - t);
				if (t >= 1) {
					d.state = 'got';
					m.visible = false;
					A[d.i * 4 + 3] = 0;
					burstSparkle(fx, zp.x, zp.y + 0.6, zp.z, 20);
					onCollect(d);
				}
			} else {
				m.visible = false;
				A[d.i * 4 + 3] = 0;
			}
		}
		this.glow.attr.needsUpdate = true;
	}

	hideAll() {
		for (const m of this.meshes) m.visible = false;
		this.glow.mesh.geometry.instanceCount = 0;
		this.list = [];
	}
}
