// Haritanın üstündeki süsler: dağlar, ağaçlar, çam ormanları, tarlalar. Her tür tek çizim
// (örneklemeli). Süs, üstünde durduğu il yükselince onunla birlikte kalkar (aynı durum dokusu).
// Yoğunluk kademeden gelir (tier.props).

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { rng } from '../core/math.js';

const VS = /* glsl */ `
${COMMON}
attribute vec4 iP;    // x, z, ölçek, dönüş
attribute vec3 iCol;
attribute float iPid;
uniform sampler2D uState2;
uniform float uCount;
uniform float uTop;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying float vH;
void main() {
	float lift = texture2D(uState2, vec2((iPid + 0.5) / uCount, 0.5)).r * 1.4;
	float c = cos(iP.w), s = sin(iP.w);
	vec3 p = position * iP.z;
	p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
	vec3 w = p + vec3(iP.x, uTop + lift, iP.y);
	vW = w;
	vN = vec3(normal.x * c + normal.z * s, normal.y, -normal.x * s + normal.z * c);
	vC = iCol;
	vH = position.y;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
#define KIND __KIND__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying float vH;
void main() {
	vec3 N = normalize(vN);
	vec3 alb = vC;
#if KIND == 0
	// dağ: yükseldikçe kayalık, tepesi karlı (rengin parlaklığı kar miktarı)
	float snow = smoothstep(0.55, 0.75, vH + vnoise(vW.xz * 3.0) * 0.15) * step(0.5, vC.b);
	alb = mix(vec3(0.3, 0.25, 0.2), vec3(0.22, 0.19, 0.16), vH);
	alb = mix(alb, vec3(vC.r, vC.g, min(vC.b, 0.4)) * 0.8, 0.35);
	alb = mix(alb, vec3(0.96, 0.97, 1.0), snow);
#endif
	float sh = shadowAt(vW, N);
	float ao = mix(0.6, 1.0, smoothstep(0.0, 0.6, vH));
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), ao, sh, 0.05, KIND == 1 ? 0.8 : 0.3);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_FS = /* glsl */ `void main(){ gl_FragColor = vec4(1.0); }`;

function makeGeo(kind) {
	if (kind === 0) {
		// alçak çokgen dağ: tepesi hafif yamuk koni
		const g = new THREE.ConeGeometry(0.7, 1, 6, 2);
		const p = g.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const y = p.getY(i);
			const k = 1 + 0.18 * Math.sin(i * 12.9898);
			if (y > -0.45) p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k);
		}
		g.translate(0, 0.5, 0);
		g.computeVertexNormals();
		return g;
	}
	if (kind === 1) {
		// yapraklı ağaç: gövde + top
		const trunk = new THREE.CylinderGeometry(0.05, 0.07, 0.3, 5).translate(0, 0.15, 0);
		const top = new THREE.IcosahedronGeometry(0.26, 0).translate(0, 0.45, 0);
		const g = mergeSimple([trunk, top]);
		return g;
	}
	// çam
	const trunk = new THREE.CylinderGeometry(0.04, 0.06, 0.22, 5).translate(0, 0.11, 0);
	const c1 = new THREE.ConeGeometry(0.24, 0.42, 6).translate(0, 0.38, 0);
	const c2 = new THREE.ConeGeometry(0.17, 0.32, 6).translate(0, 0.6, 0);
	return mergeSimple([trunk, c1, c2]);
}

function mergeSimple(list) {
	const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
	for (const g of parts) g.deleteAttribute('uv');
	const pos = [];
	const nor = [];
	for (const g of parts) {
		pos.push(...g.getAttribute('position').array);
		nor.push(...g.getAttribute('normal').array);
	}
	const out = new THREE.BufferGeometry();
	out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	return out;
}

// bölge başına süs yoğunluğu: [dağ, ağaç, çam] (birim alan başına)
const DENSITY = {
	marmara: [0.02, 0.22, 0.05],
	karadeniz: [0.06, 0.12, 0.32],
	ege: [0.05, 0.18, 0.04],
	akdeniz: [0.07, 0.1, 0.12],
	icanadolu: [0.03, 0.03, 0.0],
	dogu: [0.16, 0.02, 0.03],
	guneydogu: [0.04, 0.05, 0.0],
};

export class Props {
	constructor(G, tier, board) {
		this.group = new THREE.Group();
		this.casters = [];
		const R = rng(99);
		const taps = String(tier.shadowTaps);
		const lists = [[], [], []];
		for (const p of board.provinces) {
			const d = DENSITY[p.region];
			for (let k = 0; k < 3; k++) {
				const n = Math.round(p.area * d[k] * tier.props);
				for (let j = 0; j < n; j++) {
					const pt = board.sample(p.index, R, k === 0 ? 0.6 : 0.3);
					if (!pt) continue;
					lists[k].push({ x: pt[0], z: pt[1], pid: p.index, region: p.region });
				}
			}
		}
		const tint = {
			// dağ rengi: b kanalı > 0.5 ise tepesi karlı (Doğu ve Karadeniz yüksekleri)
			0: (r) => (r === 'dogu' || r === 'karadeniz' ? [0.3, 0.26, 0.9] : [0.38, 0.28, 0.17]),
			1: () => [0.12 + R() * 0.06, 0.4 + R() * 0.1, 0.08],
			2: () => [0.04, 0.2 + R() * 0.06, 0.08],
		};
		for (let k = 0; k < 3; k++) {
			const list = lists[k];
			const base = makeGeo(k);
			const g = new THREE.InstancedBufferGeometry();
			g.setAttribute('position', base.getAttribute('position'));
			g.setAttribute('normal', base.getAttribute('normal'));
			if (base.index) g.index = base.index;
			const P = new Float32Array(list.length * 4);
			const C = new Float32Array(list.length * 3);
			const I = new Float32Array(list.length);
			list.forEach((o, i) => {
				const s = k === 0 ? 0.5 + R() * 0.7 : 0.8 + R() * 0.6;
				P.set([o.x, o.z, s, R() * 6.28], i * 4);
				C.set(tint[k](o.region), i * 3);
				I[i] = o.pid;
			});
			g.setAttribute('iP', new THREE.InstancedBufferAttribute(P, 4));
			g.setAttribute('iCol', new THREE.InstancedBufferAttribute(C, 3));
			g.setAttribute('iPid', new THREE.InstancedBufferAttribute(I, 1));
			g.instanceCount = list.length;
			const uniforms = { ...G, uState2: { value: board.state2Tex }, uCount: { value: board.count }, uTop: { value: board.top } };
			const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps).replace('__KIND__', String(k)), uniforms }));
			m.frustumCulled = false;
			this.group.add(m);
			const sm = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: DEPTH_FS, uniforms }));
			sm.frustumCulled = false;
			this.casters.push(sm);
		}
		this.counts = lists.map((l) => l.length);
	}
}
