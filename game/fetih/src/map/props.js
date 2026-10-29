// Haritanın üstündeki süsler: ormanlar (çam ve yapraklı ağaç, örneklemeli) ve ünlü yapıların
// minyatürleri (landmarks.js). Her tür tek çizim. Süs, üstünde durduğu il yükselince onunla birlikte
// kalkar ve seçim kipinde ille birlikte söner (ortak il durumu dokusu).
//
// Ağaçlar gerçek orman kuşaklarına dikilir (kabartma ızgarasının orman kanalı): Karadeniz'in kuzey
// yamaçları, Istranca, Kaz Dağları, Menteşe ve Toros yamaçları, Sarıkamış… Yükseklerde çam, alçakta
// yapraklı ağaç. Yoğunluk kademeden gelir.
//
// v0.6 (savaş filmi): ağaçlar minyatür ölçeğinde kalır (en uzun çam ~0,8 birim: asker boyunun ~1,3 katı;
// eskiden 1,4 birimdi, il sınırlarını ve kaleleri örtüyordu). Ağaç tacı hiçbir il sınırına ve kıyıya
// taşmaz (taç yarıçapı + pay kadar uzak: sınır çizgisi ve kalkan ilin duvarı açık), il adının yeri ve ünlü
// yapı avluları açık. Kale kurulunca altındaki ağaçlar kale inerken toprağa gömülür (uCastle; kale yeri
// önceden bilinmez, 81 ilin ortasını boşaltmak ormanı yok ederdi). Ormanlar küçülen ağaçlar sıklaşarak gür
// kalır. Savaş sırasında sahnenin çevresindeki ağaçlar alçalır (shaderlib CLEAR; kare başına CPU işi yok).

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV, CLEAR } from '../gfx/shaderlib.js';
import { rng } from '../core/math.js';
import { BASE, VS as VSCALE } from './terrain.js';
import { Landmarks } from './landmarks.js';

const VS = /* glsl */ `
${COMMON}
${PROV}
${CLEAR}
attribute vec4 iP;    // x, z, ölçek, dönüş
attribute vec4 iQ;    // zemin y, en/boy oranı (yükseklik çarpanı), il, renk tonu
uniform float uPLift, uPSel;
uniform vec4 uCastle[4]; // kaleler: konum, w görünür (nightlights.js her karede yazar)
// kale tepesinin altında kalan ağaç: kale inerken (yere yaklaştıkça) toprağa gömülür
float castleK(vec2 q, float y) {
	float k = 0.0;
	for (int i = 0; i < 4; i++) {
		vec4 c = uCastle[i];
		if (c.w > 0.5) k = max(k, (1.0 - smoothstep(2.3, 2.75, distance(c.xz, q))) * (1.0 - smoothstep(0.3, 2.0, c.y - y)));
	}
	return k;
}
varying vec3 vW;
varying vec3 vN;
varying float vH;
varying float vTone;
varying vec2 vSel;
void main() {
	vec4 fx = provRow(iQ.z, 3);
	float lift = fx.x * uPLift + fx.z * uPSel;
	float c = cos(iP.w), s = sin(iP.w);
	// savaş alanında çalılık boyuna iner (sahne açık kalsın); kale tepesinin altında tamamen gömülür
	float ck = clearK(iP.xy, 0.0);
	vec3 p = position * vec3(iP.z, iP.z * iQ.y, iP.z) * (1.0 - 0.8 * ck) * (1.0 - castleK(iP.xy, iQ.x));
	// hafif rüzgâr salınımı (tepede)
	p.x += sin(uTime * 1.3 + iP.x * 0.7 + iP.y) * 0.012 * position.y;
	p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
	vec3 w = p + vec3(iP.x, iQ.x + lift - ck * 0.03, iP.y);
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
	gLit = vSel.x * uSelLit;
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), ao, sh, 0.05, 0.7);
	c = provDim(c, vSel.x, vSel.y);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_VS = /* glsl */ `
${PROV}
${CLEAR}
attribute vec4 iP;
attribute vec4 iQ;
uniform float uPLift, uPSel;
uniform vec4 uCastle[4];
float castleK(vec2 q, float y) {
	float k = 0.0;
	for (int i = 0; i < 4; i++) {
		vec4 c = uCastle[i];
		if (c.w > 0.5) k = max(k, (1.0 - smoothstep(2.3, 2.75, distance(c.xz, q))) * (1.0 - smoothstep(0.3, 2.0, c.y - y)));
	}
	return k;
}
void main() {
	vec4 fx = provRow(iQ.z, 3);
	float c = cos(iP.w), s = sin(iP.w);
	vec3 p = position * vec3(iP.z, iP.z * iQ.y, iP.z) * (1.0 - 0.8 * clearK(iP.xy, 0.0)) * (1.0 - castleK(iP.xy, iQ.x));
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

const TREES = [2250, 1850, 760]; // kademe 2, 1, 0 (ters sıra); küçük ağaç, sık orman (üçgen bütçesi: q0 ≤ 150k)
const CROWN = 0.21; // ağaç tacının yarıçapı (ölçek 1); sınırdan en az taç + BORDER_PAD uzakta
const BORDER_PAD = 0.07;
const CENTER_GAP = 1.15; // il ortası: il adı ve kalenin gövdesi (kale tepesinin geri kalanı uCastle ile)

export class Props {
	constructor(G, tier, board) {
		this.group = new THREE.Group();
		this.casters = [];
		const R = rng(99);
		const taps = String(tier.shadowTaps);
		const relief = board.relief;
		// önce ünlü yapılar: ağaçlar onların ve il merkezlerinin (kale yeri) çevresinde bitmesin
		this.landmarks = new Landmarks(G, tier, board);
		const clear = [
			...this.landmarks.sites.map((s) => [s.x, s.z, (s.r ?? 0.95) + 0.35]), // avlu (v0.5) içine ve kenarına orman taşmasın
			...board.provinces.map((p) => [p.x, p.z, CENTER_GAP]),
		];
		const blocked = (x, z) => {
			for (const [cx, cz, r] of clear) if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) return true;
			return false;
		};
		const lists = [[], []];
		const budget = TREES[2 - tier.id] ?? 1000;
		// orman kuşaklarında titreşimli ızgara: olasılık = orman yoğunluğu
		const step = 0.2;
		const cand = [];
		for (let y = -20; y < 20; y += step)
			for (let x = -45; x < 46; x += step) {
				const jx = x + (R() - 0.5) * step;
				const jy = y + (R() - 0.5) * step;
				const fo = relief.bil(relief.F, jx, jy);
				const la = relief.bil(relief.La, jx, jy);
				const gr = relief.bil(relief.Gr, jx, jy);
				// orman yoksa yeşil ovalarda seyrek tek tük ağaç
				const pr = fo > 0.08 ? Math.min(1, Math.pow(fo, 1.15) * 1.7) : gr > 0.6 ? 0.03 : 0;
				if (la > 0.05 || pr <= 0) continue;
				if (R() > pr) continue;
				if (blocked(jx, -jy)) continue;
				cand.push([jx, jy, fo, R()]);
			}
		// sınır ve kıyı denetiminden geçenler bütçeye indirilir (eşit seyreltme)
		const pass = [];
		for (const [x, y, fo, sr] of cand) {
			const idx = board.pick(x, -y);
			if (idx < 0) continue;
			const e = relief.elev(x, y);
			const p = board.provinces[idx];
			const conifer = e > 950 || (p.region === 'akdeniz' && e > 300) || (p.region === 'ege' && e > 500) || (p.region === 'dogu' && fo > 0.5) ? 1 : R() < 0.15 ? 1 : 0;
			// boy: çam en çok ~0,8, yapraklı ~0,55 birim (minyatür ölçek: asker 0,6; kale 3)
			const s = conifer ? 0.6 + sr * 0.28 : 0.66 + sr * 0.3;
			// taç sınıra ve kıyıya taşmasın (sınır çizgisi, kalkan ilin duvarı ve kıyı falezi açık kalır)
			const need = CROWN * s + BORDER_PAD;
			if (board.borderDist(x, -y, need) < need) continue;
			pass.push([conifer, { x, z: -y, y: relief.height(x, y) - 0.02, pid: idx, e, s }]);
		}
		const keep = Math.min(1, budget / Math.max(1, pass.length));
		for (const [conifer, o] of pass) if (R() <= keep) lists[conifer ? 0 : 1].push(o);
		for (let k = 0; k < 2; k++) {
			const list = lists[k];
			const base = makeGeo(k);
			const g = new THREE.InstancedBufferGeometry();
			g.setAttribute('position', base.getAttribute('position'));
			g.setAttribute('normal', base.getAttribute('normal'));
			const P = new Float32Array(list.length * 4);
			const Q = new Float32Array(list.length * 4);
			list.forEach((o, i) => {
				P.set([o.x, o.z, o.s, R() * 6.28], i * 4);
				Q.set([o.y, k === 0 ? 1 + R() * 0.2 : 0.9 + R() * 0.2, o.pid, R()], i * 4);
			});
			g.setAttribute('iP', new THREE.InstancedBufferAttribute(P, 4));
			g.setAttribute('iQ', new THREE.InstancedBufferAttribute(Q, 4));
			g.instanceCount = list.length;
			const uniforms = { ...G, uState: { value: board.stateTex }, uSelOn: board.uSelOn, uPLift: { value: board.liftUnit }, uPSel: { value: board.selLiftUnit }, uCastle: { value: this.landmarks.castleU } };
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
		this.group.add(this.landmarks.mesh);
		this.casters.push(this.landmarks.caster);
		this.counts.push(this.landmarks.count);
	}
}

export { BASE, VSCALE };
