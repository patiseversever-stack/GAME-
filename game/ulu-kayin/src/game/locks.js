// Işık kilitleri: patikayı kapatan dev tomurcuklar (kışın buz duvarı). Yalnızca güneş ışığı
// değince açılırlar. Zifir önlerinde bekler; oyuncu gölgenin kenarını ikisinin arasına düşürmeli:
// ışık tomurcuğa değsin, Zifir'e değmesin. Bir kez açılan kilit açık kalır.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { glowSprites } from '../world/world.js';
import { burstSparkle } from './fx.js';
import { damp, clamp, easeOut } from '../core/math.js';

const MAXL = 3;
const PETALS = 7;
const STOP = 1.55; // Zifir kilitten bu kadar önce durur
// ışık testi noktaları: [yana kayma, yükseklik]
const PROBES = [
	[0, 1.0],
	[0, 1.7],
	[0.45, 0.8],
	[-0.45, 0.8],
];

/** Kepçe biçimli taçyaprağı: tabanı yerelde (0,0,0), boyu +y, içe kıvrık. */
function petalGeometry() {
	const W = 6;
	const H = 8;
	const pos = [];
	const nor = [];
	const col = [];
	const idx = [];
	for (let j = 0; j <= H; j++) {
		const v = j / H;
		const width = Math.sin(Math.min(1, v * 1.15) * Math.PI) * 0.36 + 0.06 * (1 - v);
		for (let i = 0; i <= W; i++) {
			const u = i / W - 0.5;
			const x = u * width * 2;
			// içe kıvrık: kenarlar ve uç merkeze doğru
			const z = -Math.pow(Math.abs(u) * 2, 2) * 0.1 - Math.pow(v, 2) * 0.22;
			pos.push(x, v * 1.05, z);
			const n = new THREE.Vector3(-x * 0.6, 0.15 - v * 0.2, 1).normalize();
			nor.push(n.x, n.y, n.z);
			col.push(0.75 + v * 0.25, v, 1, 1);
		}
	}
	for (let j = 0; j < H; j++) {
		for (let i = 0; i < W; i++) {
			const a = j * (W + 1) + i;
			idx.push(a, a + 1, a + W + 2, a, a + W + 2, a + W + 1);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
	g.setIndex(idx);
	return g;
}

function petalMaterial(G, colA, colB) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			attribute vec4 color;
			varying vec3 vN; varying vec3 vW; varying vec4 vC;
			void main() {
				vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
				vW = w.xyz; vC = color;
				vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${SHADOW}
			${LIGHT}
			${FINISH}
			uniform vec3 uA, uB; uniform float uCharge, uOpen;
			varying vec3 vN; varying vec3 vW; varying vec4 vC;
			void main() {
				vec3 N = normalize(vN);
				if (!gl_FrontFacing) N = -N;
				vec3 V = normalize(cameraPosition - vW);
				vec3 alb = mix(uA, uB, vC.g);
				float sh = shadowAt(vW, N);
				vec3 c = shadeLit(alb, N, V, 0.6 + 0.4 * vC.g, sh, 0.7, 0.6);
				c += alb * uSunCol * pow(max(dot(-V, uSunDir), 0.0), 3.0) * 0.7 * sh;
				// dolarken içten ışır (ilerleme göstergesi)
				float pulse = 0.75 + 0.25 * sin(uTime * 7.0);
				c += mix(uB, vec3(1.6, 1.3, 0.7), 0.5) * uCharge * (1.0 - uOpen) * 1.6 * pulse * (0.4 + 0.6 * vC.g);
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,
		uniforms: { ...G, uA: { value: new THREE.Color(colA) }, uB: { value: new THREE.Color(colB) }, uCharge: { value: 0 }, uOpen: { value: 0 } },
		side: THREE.DoubleSide,
	});
}

function iceMaterial(G) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			varying vec3 vN; varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${LIGHT}
			${FINISH}
			uniform float uCharge;
			varying vec3 vN; varying vec3 vW;
			void main() {
				vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
				float fr = pow(1.0 - abs(dot(N, V)), 2.2);
				// buz: derin mavi çekirdek, açık turkuaz kenar, keskin parlama
				vec3 c = vec3(0.12, 0.26, 0.46) * (skyAmbient(N) * 1.1 + 0.08) + vec3(0.5, 0.78, 1.0) * fr * 0.8;
				float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 80.0);
				c += uSunCol * sp * 0.7;
				// erirken içinden altın ışık sızar
				c += vec3(0.9, 0.6, 0.3) * uCharge * (0.16 + 0.08 * sin(uTime * 8.0)) * (1.0 - fr * 0.6);
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,
		uniforms: { ...G, uCharge: { value: 0 } },
	});
}

/** Buz duvarı: patikanın enine dizilmiş, uçları sivri altıgen buz sarkıtları (düz yüzeyli, ışıltılı). */
function iceShards() {
	const pos = [];
	const shard = (x, z, h, r, tilt, rot) => {
		const ring = [];
		const top = new THREE.Vector3(Math.sin(tilt) * h * 0.3, h, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
		for (let k = 0; k < 6; k++) {
			const a = (k / 6) * Math.PI * 2;
			ring.push([Math.cos(a) * r, Math.sin(a) * r * 0.8]);
		}
		const mid = h * 0.72;
		for (let k = 0; k < 6; k++) {
			const [ax, az] = ring[k];
			const [bx, bz] = ring[(k + 1) % 6];
			const b0 = [x + ax, 0, z + az];
			const b1 = [x + bx, 0, z + bz];
			const m0 = [x + ax * 0.9 + top.x * 0.7, mid, z + az * 0.9 + top.z * 0.7];
			const m1 = [x + bx * 0.9 + top.x * 0.7, mid, z + bz * 0.9 + top.z * 0.7];
			const t = [x + top.x, h, z + top.z];
			pos.push(...b0, ...b1, ...m1, ...b0, ...m1, ...m0, ...m0, ...m1, ...t);
		}
	};
	const R = [0.31, 0.77, 0.13, 0.55, 0.92, 0.4, 0.66];
	for (let i = 0; i < 7; i++) {
		const x = -0.95 + (i / 6) * 1.9;
		const h = 0.9 + R[i] * 1.1 + (i === 3 ? 0.4 : 0);
		shard(x, (R[(i + 2) % 7] - 0.5) * 0.35, h, 0.17 + R[(i + 4) % 7] * 0.1, (R[i] - 0.5) * 0.7, R[(i + 1) % 7] * 6);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.computeVertexNormals();
	return g;
}

export class Locks {
	constructor(G, tex, scene) {
		this.G = G;
		this.petalGeo = petalGeometry();
		this.items = [];
		const palettes = {
			spring: [0xd86a98, 0xffd6e6],
			summer: [0xe08a1a, 0xffe07a],
			autumn: [0xa83a1c, 0xffa040],
		};
		// her kilidin kendi malzemesi (dolma miktarı ayrı); aynı shader programını paylaşırlar
		const makeMats = () => {
			const m = {};
			for (const [k, [a, b]] of Object.entries(palettes)) m[k] = petalMaterial(G, a, b);
			return m;
		};
		this.iceGeo = iceShards();
		for (let i = 0; i < MAXL; i++) {
			const mats = makeMats();
			const petals = new THREE.InstancedMesh(this.petalGeo, mats.spring, PETALS);
			petals.frustumCulled = false;
			petals.visible = false;
			const ice = new THREE.Mesh(this.iceGeo, iceMaterial(G));
			ice.visible = false;
			scene.add(petals, ice);
			this.items.push({ petals, ice, mats, s: 0, charge: 0, open: 0, state: 'off', x: 0, y: 0, z: 0, tx: 0, tz: 0, sx: 0, sz: 0, kind: 'bud' });
		}
		const pts = Array.from({ length: MAXL }, () => new THREE.Vector3(0, -999, 0));
		this.glow = glowSprites(pts, tex.glow, G, 1.0, 0xffe2a0);
		this.glow.mesh.geometry.instanceCount = 0;
		scene.add(this.glow.mesh);
		this._m = new THREE.Matrix4();
		this._q = new THREE.Quaternion();
		this._e = new THREE.Euler();
		this._v = new THREE.Vector3();
		this._s = new THREE.Vector3();
		this.list = [];
	}

	setup(curve, s0, s1, specs = [], season = 'spring') {
		this.list = [];
		this.items.forEach((it, i) => {
			const sp = specs[i];
			it.petals.visible = false;
			it.ice.visible = false;
			if (!sp) {
				it.state = 'off';
				return;
			}
			const s = s0 + (s1 - s0) * sp;
			const p = curve.sample(s, {});
			Object.assign(it, { s, x: p.x, y: p.y, z: p.z, tx: p.tx, tz: p.tz, sx: p.sx, sz: p.sz, charge: 0, open: 0, state: 'closed' });
			it.kind = season === 'winter' ? 'ice' : 'bud';
			if (it.kind === 'ice') {
				it.ice.visible = true;
				it.ice.position.set(p.x, p.y - 0.02, p.z);
				it.ice.rotation.set(0, Math.atan2(p.tx, p.tz), 0);
				it.ice.scale.setScalar(1);
			} else {
				it.petals.visible = true;
				it.petals.material = it.mats[season] || it.mats.spring;
			}
			this.list.push(it);
			this._pose(it, 0);
		});
		this.glow.mesh.geometry.instanceCount = this.list.length;
	}

	/** Taçyapraklarını açıklığa göre yerleştir (0 kapalı tomurcuk, 1 açılmış çiçek). */
	_pose(it, open) {
		if (it.kind === 'ice') {
			const k = 1 - easeOut(open);
			it.ice.scale.set(Math.max(0.01, k) * 1.05, Math.max(0.01, k) * 1.0, Math.max(0.01, k) * 1.0);
			it.ice.visible = k > 0.02;
			return;
		}
		const base = this._v.set(it.x, it.y + 0.05, it.z);
		const yaw = Math.atan2(it.tx, it.tz);
		for (let k = 0; k < PETALS; k++) {
			const a = (k / PETALS) * Math.PI * 2;
			// kapalıyken dik ve iç içe; açılınca dışa yatar ve patikanın kenarına çekilir
			const tilt = 0.18 + easeOut(open) * 1.45;
			this._e.set(-tilt, yaw + a, 0, 'YXZ');
			this._q.setFromEuler(this._e);
			const sc = 1.55 * (1 - open * 0.35);
			this._s.set(sc, sc * (1.05 - open * 0.2), sc);
			const off = 0.12 + open * 0.55;
			const px = base.x + Math.sin(yaw + a) * off;
			const pz = base.z + Math.cos(yaw + a) * off;
			this._m.compose(this._v.set(px, base.y - open * 0.05, pz), this._q, this._s);
			it.petals.setMatrixAt(k, this._m);
			this._v.copy(base);
		}
		it.petals.instanceMatrix.needsUpdate = true;
	}

	/** Zifir'in ilerleyebileceği en uzak nokta (kapalı ilk kilidin STOP kadar önü). */
	limit(s) {
		let lim = Infinity;
		for (const it of this.list) if (it.state !== 'open' && it.s > s - 0.2) lim = Math.min(lim, it.s - STOP);
		return lim;
	}

	/** zs: Zifir'in konumu. Tomurcuk ancak Zifir önüne gelince uyanır (ışığı o zaman toplar). */
	update(dt, zs, sunDir, tester, beams, fx, onOpen) {
		const A = this.glow.attr.array;
		let i = 0;
		for (const it of this.list) {
			const awake = it.s - zs < STOP + 0.5 && it.s - zs > -0.5;
			if (it.state === 'closed' && !awake) it.charge = Math.max(0, it.charge - dt * 0.1);
			else if (it.state === 'closed') {
				// ışık testi: tomurcuğun dört noktası
				let lit = 0;
				const pts = PROBES;
				for (const [sx, h] of pts) {
					const x = it.x + it.sx * sx;
					const z = it.z + it.sz * sx;
					if (!tester.blocked(x, it.y + h, z, sunDir) || (beams && beams.litAt(x, it.y + h, z, 0.5))) lit++;
				}
				lit /= pts.length;
				it.charge = clamp(it.charge + (lit > 0 ? lit * 0.6 : -0.1) * dt, 0, 1);
				if (lit > 0 && Math.random() < dt * 10) burstSparkle(fx, it.x + (Math.random() - 0.5), it.y + 1 + Math.random(), it.z + (Math.random() - 0.5), 1, [2.2, 1.7, 0.8]);
				if (it.charge >= 1) {
					it.state = 'opening';
					onOpen(it);
					burstSparkle(fx, it.x, it.y + 1.2, it.z, 26, [2.4, 2.0, 1.0]);
				}
			} else if (it.state === 'opening') {
				it.open = Math.min(1, it.open + dt / 0.9);
				this._pose(it, it.open);
				if (it.open >= 1) it.state = 'open';
			}
			const mat = it.kind === 'ice' ? it.ice.material : it.petals.material;
			mat.uniforms.uCharge.value = it.charge;
			if (mat.uniforms.uOpen) mat.uniforms.uOpen.value = it.open;
			A[i * 4] = it.x;
			A[i * 4 + 1] = it.y + 1.1;
			A[i * 4 + 2] = it.z;
			A[i * 4 + 3] = it.state === 'open' ? 0 : 0.25 + it.charge * 1.3;
			i++;
		}
		this.glow.attr.needsUpdate = true;
	}

	/** Kilit ne kadar dolu (bot ve arayüz için). */
	pending(s) {
		for (const it of this.list) if (it.state === 'closed' && it.s > s - 0.2 && it.s - s < STOP + 0.3) return it;
		return null;
	}

	hide() {
		for (const it of this.items) {
			it.petals.visible = false;
			it.ice.visible = false;
			it.state = 'off';
		}
		this.list = [];
		this.glow.mesh.geometry.instanceCount = 0;
	}
}
