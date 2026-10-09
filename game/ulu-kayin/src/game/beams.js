// Kristal ışınları: güneş kristale değiyorsa ışık aynadan yansır ve patikaya bir ışın düşer.
// Işın Zifir'e ya da önündeki damlalara değerse güneş gibi yakar.
// Yalnızca Zifir'e yakın kristaller hesaplanır (en fazla birkaç tane).

import * as THREE from 'three';
import { COMMON } from '../gfx/shaderlib.js';
import { glowSprites } from '../world/world.js';
import { trunkSurfaceR } from '../world/tree.js';
import { groundY, ISLAND_R } from '../world/island.js';
import { windSway } from '../world/wind.js';
import { damp } from '../core/math.js';

const MAXB = 6;
const _sw = { x: 0, y: 0, z: 0 };

export class Beams {
	constructor(G, tex, scene, world) {
		this.list = world.crystals.list.map((c) => ({ ...c, lit: 0, on: false, hx: 0, hy: 0, hz: 0, cx: 0, cy: 0, cz: 0, hitT: 0 }));
		this.gemMat = world.crystalMat;
		const geo = new THREE.InstancedBufferGeometry();
		const q = new THREE.PlaneGeometry(1, 1);
		geo.setIndex(q.index);
		geo.setAttribute('position', q.getAttribute('position'));
		this.aA = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 4), 4).setUsage(THREE.DynamicDrawUsage);
		this.aB = new THREE.InstancedBufferAttribute(new Float32Array(MAXB * 4), 4).setUsage(THREE.DynamicDrawUsage);
		geo.setAttribute('iA', this.aA);
		geo.setAttribute('iB', this.aB);
		geo.instanceCount = 0;
		this.geo = geo;
		const mat = new THREE.ShaderMaterial({
			vertexShader: /* glsl */ `
				attribute vec4 iA; attribute vec4 iB;
				varying vec2 vUv; varying float vA;
				void main() {
					vec3 a = iA.xyz, b = iB.xyz;
					vec3 ax = b - a;
					vec3 mid = a + ax * (position.y + 0.5);
					vec3 side = normalize(cross(ax, cameraPosition - mid));
					vec3 w = mid + side * position.x * iA.w;
					vUv = position.xy + 0.5;
					vA = iB.w;
					gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
				}`,
			fragmentShader: /* glsl */ `
				${COMMON}
				varying vec2 vUv; varying float vA;
				void main() {
					float x = abs(vUv.x - 0.5) * 2.0;
					float core = exp(-x * x * 18.0) + exp(-x * x * 3.0) * 0.35;
					float ends = smoothstep(0.0, 0.06, vUv.y) * (0.55 + 0.45 * smoothstep(1.0, 0.85, vUv.y));
					float shimmer = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 9.0);
					vec3 c = (uSunCol * 0.45 + vec3(0.6, 0.5, 0.35)) * core * ends * shimmer * vA;
					gl_FragColor = vec4(c / (1.0 + c * 0.25), 1.0);
				}`,
			uniforms: { ...G },
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		});
		this.mesh = new THREE.Mesh(geo, mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 26;
		scene.add(this.mesh);
		const pts = Array.from({ length: MAXB }, () => new THREE.Vector3(0, -999, 0));
		this.spots = glowSprites(pts, tex.glow, G, 1.2, 0xfff0c0);
		this.glints = glowSprites(pts, tex.glow, G, 1.0, 0xfff4dc);
		this.spots.mesh.geometry.instanceCount = 0;
		this.glints.mesh.geometry.instanceCount = 0;
		scene.add(this.spots.mesh, this.glints.mesh);
		this.active = [];
		this._cand = [];
	}

	/**
	 * Işınları günceller. Döndürür: Zifir ışına değiyor mu (0..1).
	 * zp: Zifir'in ayak konumu, focusY: odak yüksekliği (yalnızca yakındaki kristaller)
	 */
	update(dt, time, focusY, sunDir, tester, zp) {
		const A = this.aA.array;
		const B = this.aB.array;
		const S = this.spots.attr.array;
		const Gl = this.glints.attr.array;
		const litArr = this.gemMat.uniforms.uLit.value;
		this.active.length = 0;
		let n = 0;
		let hit = 0;
		const Lx = sunDir.x;
		const Ly = sunDir.y;
		const Lz = sunDir.z;
		for (let i = 0; i < this.list.length; i++) {
			const c = this.list[i];
			const near = Math.abs(c.c.y - focusY) < 15;
			let on = false;
			if (near) {
				windSway(c.anchor.x, c.anchor.y, c.anchor.z, c.w, time, _sw);
				c.cx = c.c.x + _sw.x;
				c.cy = c.c.y + _sw.y;
				c.cz = c.c.z + _sw.z;
				const nl = c.n.x * Lx + c.n.y * Ly + c.n.z * Lz;
				// güneş aynanın ön yüzüne düşüyor ve kristal gölgede değil
				if (nl > 0.05 && !tester.blocked(c.cx + Lx * 0.5, c.cy + Ly * 0.5, c.cz + Lz * 0.5, sunDir)) {
					// yansıma: r = I - 2(I·n)n, I = -L
					const rx = -Lx + 2 * nl * c.n.x;
					const ry = -Ly + 2 * nl * c.n.y;
					const rz = -Lz + 2 * nl * c.n.z;
					const t = this._cast(c.cx, c.cy, c.cz, rx, ry, rz, tester);
					c.hx = c.cx + rx * t;
					c.hy = c.cy + ry * t;
					c.hz = c.cz + rz * t;
					c.hitT = t;
					on = true;
				}
			}
			c.lit = damp(c.lit, on ? 1 : 0, 14, dt);
			litArr[i] = c.lit;
			c.on = on;
			if (c.lit > 0.02 && n < MAXB) {
				A[n * 4] = c.cx;
				A[n * 4 + 1] = c.cy;
				A[n * 4 + 2] = c.cz;
				A[n * 4 + 3] = 0.55;
				B[n * 4] = c.hx;
				B[n * 4 + 1] = c.hy;
				B[n * 4 + 2] = c.hz;
				B[n * 4 + 3] = c.lit;
				S[n * 4] = c.hx;
				S[n * 4 + 1] = c.hy + 0.05;
				S[n * 4 + 2] = c.hz;
				S[n * 4 + 3] = c.hitT < 39 ? 1.0 * c.lit : 0;
				Gl[n * 4] = c.cx;
				Gl[n * 4 + 1] = c.cy;
				Gl[n * 4 + 2] = c.cz;
				Gl[n * 4 + 3] = 0.9 * c.lit;
				n++;
			}
			if (on) {
				this.active.push(c);
				// Zifir ışının içinde mi? (gövde merkezinden ışın parçasına uzaklık)
				const d = segDist(zp.x, zp.y + 0.45, zp.z, c.cx, c.cy, c.cz, c.hx, c.hy, c.hz);
				if (d < 0.55) hit = Math.max(hit, 1 - Math.max(0, d - 0.35) / 0.2);
			}
		}
		this.geo.instanceCount = n;
		this.spots.mesh.geometry.instanceCount = n;
		this.glints.mesh.geometry.instanceCount = n;
		this.aA.needsUpdate = true;
		this.aB.needsUpdate = true;
		this.spots.attr.needsUpdate = true;
		this.glints.attr.needsUpdate = true;
		return hit;
	}

	/** Verilen güneş yönünde bir nokta herhangi bir kristal ışınına düşer mi? (bot testi için) */
	testPoint(L, x, y, z, tester, r = 0.55) {
		for (const c of this.list) {
			if (Math.abs(c.c.y - y) > 15) continue;
			const nl = c.n.x * L.x + c.n.y * L.y + c.n.z * L.z;
			if (nl <= 0.05) continue;
			const cx = c.cx || c.c.x;
			const cy = c.cy || c.c.y;
			const cz = c.cz || c.c.z;
			if (tester.blocked(cx + L.x * 0.5, cy + L.y * 0.5, cz + L.z * 0.5, L)) continue;
			const rx = -L.x + 2 * nl * c.n.x;
			const ry = -L.y + 2 * nl * c.n.y;
			const rz = -L.z + 2 * nl * c.n.z;
			const t = this._cast(cx, cy, cz, rx, ry, rz, tester);
			if (segDist(x, y, z, cx, cy, cz, cx + rx * t, cy + ry * t, cz + rz * t) < r) return true;
		}
		return false;
	}

	/** Bir noktanın etkin ışınlardan birinin içinde olup olmadığı (damlalar için). */
	litAt(x, y, z, r = 0.35) {
		for (const c of this.active) if (segDist(x, y, z, c.cx, c.cy, c.cz, c.hx, c.hy, c.hz) < r) return true;
		return false;
	}

	/** Işının ilk çarptığı yer: gövde, patika tahtası ya da ada zemini. */
	_cast(px, py, pz, dx, dy, dz, tester) {
		const cand = this._cand;
		cand.length = 0;
		for (const s of tester.slabs) {
			const vx = s.cx - px;
			const vy = s.cy - py;
			const vz = s.cz - pz;
			const t = vx * dx + vy * dy + vz * dz;
			if (t < -s.br || t > 41) continue;
			const d2 = vx * vx + vy * vy + vz * vz - t * t;
			if (d2 <= s.br * s.br) cand.push(s);
		}
		const step = 0.16;
		for (let t = 0.35; t < 40; t += step) {
			const x = px + dx * t;
			const y = py + dy * t;
			const z = pz + dz * t;
			const r = Math.hypot(x, z);
			if (y < 56 && r < 7 && r < trunkSurfaceR(Math.atan2(z, x), y)) return t;
			if (r < ISLAND_R && y < groundY(x, z) + 0.02) return t;
			for (const s of cand) {
				const ox = x - s.cx;
				const oy = y - s.cy;
				const oz = z - s.cz;
				if (Math.abs(ox * s.Tx + oy * s.Ty + oz * s.Tz) > s.hT) continue;
				if (Math.abs(ox * s.Sx + oz * s.Sz) > s.hS) continue;
				if (Math.abs(oy) > s.hU + 0.02) continue;
				return t;
			}
		}
		return 40;
	}

	hide() {
		this.geo.instanceCount = 0;
		this.spots.mesh.geometry.instanceCount = 0;
		this.glints.mesh.geometry.instanceCount = 0;
		for (const c of this.list) c.lit = 0;
	}
}

function segDist(px, py, pz, ax, ay, az, bx, by, bz) {
	const ux = bx - ax;
	const uy = by - ay;
	const uz = bz - az;
	const l2 = ux * ux + uy * uy + uz * uz;
	let t = l2 > 0 ? ((px - ax) * ux + (py - ay) * uy + (pz - az) * uz) / l2 : 0;
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	const dx = ax + ux * t - px;
	const dy = ay + uy * t - py;
	const dz = az + uz * t - pz;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
