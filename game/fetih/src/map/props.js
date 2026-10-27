// Haritanın üstündeki süsler: ormanlar (çam ve yapraklı ağaç, örneklemeli) ve ünlü yapıların
// minyatürleri (landmarks.js). Her tür tek çizim. Süs, üstünde durduğu il yükselince onunla birlikte
// kalkar ve seçim kipinde ille birlikte söner (ortak il durumu dokusu).
//
// Ağaçlar gerçek orman kuşaklarına dikilir (kabartma ızgarasının orman kanalı): Karadeniz'in kuzey
// yamaçları, Istranca, Kaz Dağları, Menteşe ve Toros yamaçları, Sarıkamış… Yükseklerde çam, alçakta
// yapraklı ağaç. Yoğunluk kademeden gelir.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV } from '../gfx/shaderlib.js';
import { rng } from '../core/math.js';
import { BASE, VS as VSCALE } from './terrain.js';
import { Landmarks } from './landmarks.js';

const VS = /* glsl */ `
${COMMON}
${PROV}
attribute vec4 iP;    // x, z, ölçek, dönüş
attribute vec4 iQ;    // zemin y, en/boy oranı (yükseklik çarpanı), il, renk tonu
uniform float uPLift, uPSel;
varying vec3 vW;
varying vec3 vN;
varying float vH;
varying float vTone;
varying vec2 vSel;
void main() {
	vec4 fx = provRow(iQ.z, 3);
	float lift = fx.x * uPLift + fx.z * uPSel;
	float c = cos(iP.w), s = sin(iP.w);
	vec3 p = position * vec3(iP.z, iP.z * iQ.y, iP.z);
	// hafif rüzgâr salınımı (tepede)
	p.x += sin(uTime * 1.3 + iP.x * 0.7 + iP.y) * 0.012 * position.y;
	p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
	vec3 w = p + vec3(iP.x, iQ.x + lift, iP.y);
	vW = w;
	vN = vec3(normal.x * c + normal.z * s, normal.y / max(iQ.y, 0.3), -normal.x * s + normal.z * c);
	vH = position.y;
	vTone = iQ.w;
	vSel = vec2(fx.z, fx.w);
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
#define KIND __KIND__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${PROV}
varying vec3 vW;
varying vec3 vN;
varying float vH;
varying float vTone;
varying vec2 vSel;
void main() {
	vec3 N = normalize(vN);
	vec3 alb;
#if KIND == 0
	// çam: koyu zümrüt, uçlara doğru açık
	alb = mix(vec3(0.02, 0.13, 0.05), vec3(0.06, 0.26, 0.08), smoothstep(0.1, 0.9, vH) * 0.7 + vTone * 0.4);
#else
	// yapraklı: canlı yeşil, tonu ağaca göre (sonbahar dokunuşu)
	alb = mix(vec3(0.07, 0.3, 0.05), vec3(0.2, 0.42, 0.06), vTone);
	alb = mix(alb, vec3(0.42, 0.36, 0.06), step(0.93, vTone) * 0.6);
#endif
	alb = mix(vec3(0.16, 0.09, 0.05), alb, smoothstep(0.08, 0.16, vH)); // gövde
	float sh = shadowAt(vW, N);
	float ao = mix(0.55, 1.0, smoothstep(0.05, 0.7, vH));
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), ao, sh, 0.05, 0.7);
	c = provDim(c, vSel.x, vSel.y);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_VS = /* glsl */ `
${PROV}
attribute vec4 iP;
attribute vec4 iQ;
uniform float uPLift, uPSel;
void main() {
	vec4 fx = provRow(iQ.z, 3);
	float c = cos(iP.w), s = sin(iP.w);
	vec3 p = position * vec3(iP.z, iP.z * iQ.y, iP.z);
	p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
	vec3 w = p + vec3(iP.x, iQ.x + fx.x * uPLift + fx.z * uPSel, iP.y);
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;
const DEPTH_FS = /* glsl */ `void main(){ gl_FragColor = vec4(1.0); }`;

function strip(g) {
	const n = g.index ? g.toNonIndexed() : g;
	n.deleteAttribute('uv');
	return n;
}

function makeGeo(kind) {
	if (kind === 0) {
		// çam: üç kat koni, alt kapaksız
		const trunk = new THREE.CylinderGeometry(0.035, 0.05, 0.16, 4, 1, true).translate(0, 0.08, 0);
		const c1 = new THREE.ConeGeometry(0.21, 0.36, 7, 1, true).translate(0, 0.3, 0);
		const c2 = new THREE.ConeGeometry(0.16, 0.3, 7, 1, true).translate(0, 0.47, 0);
		const c3 = new THREE.ConeGeometry(0.1, 0.24, 6, 1, true).translate(0, 0.62, 0);
		return mergeSimple([trunk, c1, c2, c3]);
	}
	// yapraklı ağaç: gövde + yumru taç
	const trunk = new THREE.CylinderGeometry(0.035, 0.05, 0.2, 4, 1, true).translate(0, 0.1, 0);
	const top = new THREE.IcosahedronGeometry(0.21, 0);
	const p = top.getAttribute('position');
	for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * 0.92);
	top.translate(0, 0.34, 0);
	return mergeSimple([trunk, top]);
}

function proxyGeo(kind) {
	const g = kind === 0 ? new THREE.ConeGeometry(0.2, 0.62, 5, 1, true).translate(0, 0.38, 0) : new THREE.OctahedronGeometry(0.21, 0).translate(0, 0.34, 0);
	return g.index ? g.toNonIndexed() : g;
}

function mergeSimple(list) {
	const parts = list.map(strip);
	const pos = [];
	for (const g of parts) pos.push(...g.getAttribute('position').array);
	const out = new THREE.BufferGeometry();
	out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	out.computeVertexNormals(); // düz gölgeleme (alçak çokgen)
	return out;
}

const TREES = [1850, 1350, 700]; // kademe 2, 1, 0 (ters sıra)

export class Props {
	constructor(G, tier, board) {
		this.group = new THREE.Group();
		this.casters = [];
		const R = rng(99);
		const taps = String(tier.shadowTaps);
		const relief = board.relief;
		const lists = [[], []];
		const budget = TREES[2 - tier.id] ?? 1000;
		// orman kuşaklarında titreşimli ızgara: olasılık = orman yoğunluğu
		const step = 0.3;
		const cand = [];
		for (let y = -20; y < 20; y += step)
			for (let x = -45; x < 46; x += step) {
				const jx = x + (R() - 0.5) * step;
				const jy = y + (R() - 0.5) * step;
				const fo = relief.bil(relief.F, jx, jy);
				const la = relief.bil(relief.La, jx, jy);
				const gr = relief.bil(relief.Gr, jx, jy);
				// orman yoksa yeşil ovalarda seyrek tek tük ağaç
				const pr = fo > 0.08 ? Math.pow(fo, 1.15) : gr > 0.6 ? 0.025 : 0;
				if (la > 0.05 || pr <= 0) continue;
				if (R() > pr) continue;
				cand.push([jx, jy, fo]);
			}
		// bütçeye indir (eşit seyreltme)
		const keep = Math.min(1, budget / Math.max(1, cand.length));
		for (const [x, y, fo] of cand) {
			if (R() > keep) continue;
			const idx = board.pick(x, -y);
			if (idx < 0) continue;
			const e = relief.elev(x, y);
			const p = board.provinces[idx];
			const conifer = e > 950 || (p.region === 'akdeniz' && e > 300) || (p.region === 'ege' && e > 500) || (p.region === 'dogu' && fo > 0.5) ? 1 : R() < 0.15 ? 1 : 0;
			lists[conifer ? 0 : 1].push({ x, z: -y, y: relief.height(x, y) - 0.02, pid: idx, e });
		}
		for (let k = 0; k < 2; k++) {
			const list = lists[k];
			const base = makeGeo(k);
			const g = new THREE.InstancedBufferGeometry();
			g.setAttribute('position', base.getAttribute('position'));
			g.setAttribute('normal', base.getAttribute('normal'));
			const P = new Float32Array(list.length * 4);
			const Q = new Float32Array(list.length * 4);
			list.forEach((o, i) => {
				const s = (k === 0 ? 0.85 : 0.8) + R() * 0.55;
				P.set([o.x, o.z, s, R() * 6.28], i * 4);
				Q.set([o.y, k === 0 ? 1 + R() * 0.35 : 0.9 + R() * 0.25, o.pid, R()], i * 4);
			});
			g.setAttribute('iP', new THREE.InstancedBufferAttribute(P, 4));
			g.setAttribute('iQ', new THREE.InstancedBufferAttribute(Q, 4));
			g.instanceCount = list.length;
			const uniforms = { ...G, uState: { value: board.stateTex }, uSelOn: board.uSelOn, uPLift: { value: board.liftUnit }, uPSel: { value: board.selLiftUnit } };
			const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps).replace('__KIND__', String(k)), uniforms }));
			m.frustumCulled = false;
			this.group.add(m);
			// gölge için çok sade vekil (gölge haritasında ağaç zaten bir leke): 5–8 üçgen
			const sg = new THREE.InstancedBufferGeometry();
			sg.setAttribute('position', proxyGeo(k).getAttribute('position'));
			sg.setAttribute('iP', g.getAttribute('iP'));
			sg.setAttribute('iQ', g.getAttribute('iQ'));
			sg.instanceCount = list.length;
			const sm = new THREE.Mesh(sg, new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms, side: THREE.DoubleSide }));
			sm.frustumCulled = false;
			this.casters.push(sm);
		}
		this.counts = lists.map((l) => l.length);
		// ünlü yapılar
		this.landmarks = new Landmarks(G, tier, board);
		this.group.add(this.landmarks.mesh);
		this.casters.push(this.landmarks.caster);
		this.counts.push(this.landmarks.count);
	}
}

export { BASE, VSCALE };
