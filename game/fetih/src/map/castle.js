// Oyuncunun başkent kalesi: sur, ana burç, üç kule (her biri bir "can"), dalgalanan sancak.
// Kule düşünce çöker (alçalıp söner). Renkler sahibin renginden gelir.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COMMON, SHADOW, LIGHT, FINISH } from '../gfx/shaderlib.js';

const VS = /* glsl */ `
${COMMON}
attribute vec3 color;
uniform float uWave;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
void main() {
	vec3 p = position;
	// sancak bezi dalgalanır (rengi tam kırmızı kanal 2 ile işaretli köşeler)
	if (color.r > 1.5) {
		float k = max(p.x, 0.0);
		p.z += sin(p.x * 6.0 - uTime * 7.0) * 0.06 * k * uWave;
		p.y += sin(p.x * 4.0 - uTime * 5.0) * 0.02 * k * uWave;
	}
	vec4 w = modelMatrix * vec4(p, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vC = color;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
uniform vec3 uOwner;
uniform float uFade;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
void main() {
	vec3 N = normalize(vN);
	// renk kodu: g kanalı > 1.5 → sahip rengi, aksi halde taş rengi
	vec3 alb = vC.g > 1.5 ? uOwner : (vC.r > 1.5 ? uOwner * 1.1 : vC);
	// taş dokusu
	float b = step(0.5, fract(vW.y * 9.0)) * 0.05 + vnoise(vW.xz * 14.0 + vW.y * 6.0) * 0.08;
	if (vC.g <= 1.5 && vC.r <= 1.5) alb *= 0.93 + b;
	float sh = shadowAt(vW, N);
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), 1.0, sh, 0.15, 0.5);
	c = applyFog(c, vW);
	gl_FragColor = finish(c * uFade, 1.0);
}`;

const STONE = [0.62, 0.55, 0.45];
const OWN = [0.5, 2, 0.5]; // işaret: sahip rengi
const FLAG = [2, 0.5, 0.5]; // işaret: dalgalanan sancak

function part(geo, col, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) {
	const g = geo.index ? geo.toNonIndexed() : geo.clone();
	g.deleteAttribute('uv');
	g.scale(sx, sy, sz);
	g.rotateY(ry);
	g.translate(x, y, z);
	const n = g.getAttribute('position').count;
	const c = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) c.set(col, i * 3);
	g.setAttribute('color', new THREE.BufferAttribute(c, 3));
	return g;
}

const CYL8 = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0);
const CONE = new THREE.ConeGeometry(0.5, 1, 10).translate(0, 0.5, 0);
const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

function towerGeo() {
	const parts = [
		part(CYL8, STONE, 0, 0, 0, 0.42, 1.25, 0.42),
		part(CYL8, STONE, 0, 1.2, 0, 0.5, 0.12, 0.5),
		part(CONE, OWN, 0, 1.32, 0, 0.56, 0.62, 0.56),
	];
	return mergeGeometries(parts);
}

function keepGeo() {
	const parts = [];
	// sur halkası: dişli duvar
	const R = 0.95;
	for (let i = 0; i < 12; i++) {
		const a = (i / 12) * Math.PI * 2;
		parts.push(part(BOX, STONE, Math.cos(a) * R, 0, Math.sin(a) * R, 0.55, 0.42, 0.18, -a + Math.PI / 2));
		parts.push(part(BOX, STONE, Math.cos(a + 0.13) * R, 0.42, Math.sin(a + 0.13) * R, 0.16, 0.12, 0.18, -a + Math.PI / 2));
	}
	// ana burç ve kubbe
	parts.push(part(BOX, STONE, 0, 0, 0, 0.75, 0.95, 0.75));
	parts.push(part(BOX, STONE, 0, 0.95, 0, 0.85, 0.1, 0.85));
	parts.push(part(CONE, OWN, 0, 1.05, 0, 0.82, 0.55, 0.82, Math.PI / 4));
	// sancak direği ve bezi
	parts.push(part(CYL8, [0.35, 0.28, 0.22], 0, 1.4, 0, 0.04, 0.9, 0.04));
	const flag = new THREE.PlaneGeometry(0.55, 0.34, 8, 2).translate(0.29, 2.1, 0);
	parts.push(part(flag, FLAG, 0, 0, 0));
	return mergeGeometries(parts);
}

export class Castle {
	constructor(G, tier, owner, color) {
		this.owner = owner;
		this.group = new THREE.Group();
		const taps = String(tier.shadowTaps);
		this.uniforms = { ...G, uOwner: { value: new THREE.Color(color) }, uWave: { value: 1 }, uFade: { value: 1 } };
		const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps), uniforms: this.uniforms, side: THREE.DoubleSide });
		this.keep = new THREE.Mesh(keepGeo(), mat);
		this.group.add(this.keep);
		this.towers = [];
		const tg = towerGeo();
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
			const t = new THREE.Mesh(tg, mat);
			t.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95);
			t.userData.alive = 1;
			t.userData.fall = 0;
			this.towers.push(t);
			this.group.add(t);
		}
		// gölge kopyaları: aynı geometri, yalnızca derinlik; dünya matrisi her karede eşitlenir
		const dm = new THREE.MeshBasicMaterial();
		this.casters = [this.keep, ...this.towers].map((m) => {
			const c = new THREE.Mesh(m.geometry, dm);
			c.matrixAutoUpdate = false;
			c.userData.src = m;
			return c;
		});
		this.hp = 3;
		this.group.scale.setScalar(1.45);
	}

	place(pos) {
		this.group.position.copy(pos);
	}

	/** Bir kule düşer. Kalan can döner. */
	hit() {
		const t = this.towers.find((x) => x.userData.alive);
		if (!t) return 0;
		t.userData.alive = 0;
		this.hp--;
		return this.hp;
	}

	repair() {
		for (const t of this.towers) {
			t.userData.alive = 1;
			t.userData.fall = 0;
			t.scale.set(1, 1, 1);
			t.rotation.set(0, 0, 0);
		}
		this.hp = 3;
	}

	update(dt) {
		for (const c of this.casters) c.matrix.copy(c.userData.src.matrixWorld);
		for (const t of this.towers) {
			if (t.userData.alive) continue;
			const f = Math.min(1, t.userData.fall + dt * 1.6);
			t.userData.fall = f;
			t.scale.y = Math.max(0.08, 1 - f * f);
			t.rotation.z = f * 0.35;
		}
	}
}
