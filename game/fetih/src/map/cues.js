// Seçim işaretleri (gece odağı): "nereye saldırabilirim / nereyi alabilirim" tek bakışta okunsun.
//
// - Ok: oyuncunun toprağından (ortak sınırın en uzun parçasından) her seçilebilir ile kavisli, parlak altın
//   bir ok. Üstünde hedefe doğru akan ışık şeritleri, koyu ince kontur (aydınlık ilin üstünde de seçilir).
//   Ok genişliği ekran pikseli olarak sabittir: uzaktan da yakından da aynı okunur.
// - Rozet: komşusu olmayan seçenekte (ilk yayılma) ilin üstünde süzülen yuvarlak altın işaret.
//
// Tek çizim çağrısı (oklar ve rozetler aynı tamponda). Tamponlar açılışta kurulur; show() yalnızca
// seçim değişince köşeleri yeniden yazar, kare başına yalnızca uniform değişir. Derinlik testi yok:
// kabartmaya gömülmez; il adlarından önce çizilir (adlar her zaman üstte okunur).

import * as THREE from 'three';
import { PROV } from '../gfx/shaderlib.js';

const MAXA = 28; // en çok ok
const SEG = 22; // gövde kesit sayısı
const SECT = SEG + 1 + 2; // gövde + baş tabanı + uç
const UH = 0.72; // okun başının başladığı u

const VS = /* glsl */ `
${PROV}
attribute vec3 aTan;
attribute vec2 aUv;   // u boyuna (0 kuyruk, 1 uç), v enine (-1..1)
attribute vec4 aInfo; // tür (0 ok, 1 rozet), ok uzunluğu (dünya), saldırı, sıra
uniform float uTime;
uniform vec3 uRes;
uniform float uDpr;
uniform float uGrow; // görünme (0..1)
uniform float uPSel;
varying vec2 vUv;
varying vec4 vInfo;
varying float vHw;
void main() {
	vUv = aUv;
	vInfo = aInfo;
	float order = aInfo.w;
	// sırayla belirir (yelpaze gibi)
	float g = clamp(uGrow * 1.6 - order * 0.06, 0.0, 1.0);
	vec3 p = position;
	if (aInfo.x > 1.5) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // boş yuva
		return;
	}
	if (aInfo.x > 0.5) {
		// rozet: ilin kalkışıyla yükselir, hafifçe süzülür
		vec4 fx = provRow(aInfo.z, 3);
		p.y += fx.z * uPSel + 0.55 + sin(uTime * 2.2 + order) * 0.06;
		vec4 c = projectionMatrix * viewMatrix * vec4(p, 1.0);
		float s = 15.0 * uDpr * (0.6 + 0.4 * g);
		c.xy += aUv * vec2(s, s * 1.25) / uRes.xy * 2.0 * c.w;
		c.y += 18.0 * uDpr / uRes.y * 2.0 * c.w; // adın üstünde
		gl_Position = g < 0.01 ? vec4(2.0, 2.0, 2.0, 1.0) : c;
		vHw = g;
		return;
	}
	vec4 c = projectionMatrix * viewMatrix * vec4(p, 1.0);
	vec4 c2 = projectionMatrix * viewMatrix * vec4(p + aTan * 0.05, 1.0);
	vec2 s0 = c.xy / c.w * uRes.xy;
	vec2 s1 = c2.xy / c2.w * uRes.xy;
	vec2 dir = normalize(s1 - s0 + vec2(1e-5, 0.0));
	vec2 perp = vec2(-dir.y, dir.x);
	float ppu = uRes.y * projectionMatrix[1][1] * 0.5 / max(c.w, 1e-3);
	float body = clamp(ppu * 0.2, 6.5 * uDpr, 10.0 * uDpr);
	float head = aUv.x > ${UH.toFixed(3)} - 1e-4 ? (1.0 - aUv.x) / ${(1 - UH).toFixed(3)} : 0.0;
	float hw = aUv.x > ${UH.toFixed(3)} - 1e-4 && aInfo.y > 0.0 ? body * 2.3 * min(1.0, head * 1.02) : body;
	// başın tabanı (kesitler iki kez: gövde sonu dar, baş tabanı geniş)
	hw = aInfo.y < 0.0 ? body : hw;
	vHw = hw;
	c.xy += perp * aUv.y * hw / uRes.xy * 2.0 * c.w;
	gl_Position = c;
}`;

const FS = /* glsl */ `
uniform float uTime;
uniform float uGrow;
uniform float uAlpha;
varying vec2 vUv;
varying vec4 vInfo;
varying float vHw;
void main() {
	vec3 goldHi = vec3(1.0, 0.93, 0.62);
	vec3 gold = vec3(1.0, 0.72, 0.16);
	vec3 goldLo = vec3(0.86, 0.46, 0.04);
	vec3 ink = vec3(0.025, 0.03, 0.06);
	if (vInfo.x > 0.5) {
		// rozet: koyu yuvarlak, altın halka, içinde bayrak (yayılma) ya da kılıç (saldırı); altında sivri uç
		vec2 q = vUv * vec2(1.0, 1.25);
		vec2 cc = vec2(0.0, 0.25);
		float r = length(q - cc);
		float aa = fwidth(r) * 1.2;
		float shape = min(r - 0.75, max(abs(q.x) * 0.9 - (q.y + 1.2) * 0.43, q.y + 0.1));
		float a = 1.0 - smoothstep(-aa, aa, shape);
		if (a < 0.01) discard;
		vec3 c = ink;
		// altın halka
		float ring = 1.0 - smoothstep(0.0, aa * 1.5, abs(r - 0.6) - 0.08);
		c = mix(c, mix(goldLo, goldHi, 0.5 + 0.5 * q.y), ring);
		// iç simge: küçük üçgen bayrak + direk
		vec2 f = (q - cc) / 0.45;
		float pole = step(abs(f.x + 0.35), 0.08) * step(-0.75, f.y) * step(f.y, 0.75);
		float flag = step(-0.27, f.x) * step(f.x, 0.55) * step(abs(f.y - 0.38), 0.37 - (f.x + 0.27) * 0.42);
		c = mix(c, goldHi, max(pole, flag) * step(r, 0.5));
		// pin ucu altın
		c = mix(c, gold, step(0.7, length(q - cc) ) * step(q.y, -0.1));
		float pulse = 0.85 + 0.15 * sin(uTime * 4.0 + vInfo.w);
		gl_FragColor = vec4(c * pulse, a * uAlpha * vHw);
		return;
	}
	float u = vUv.x;
	float order = vInfo.w;
	float g = clamp(uGrow * 1.6 - order * 0.06, 0.0, 1.0);
	// kuyruktan uca doğru belirir
	float reveal = smoothstep(g * 1.08 - 0.06, g * 1.08 - 0.12, u);
	if (reveal < 0.01) discard;
	float t = abs(vUv.y);
	float px = 1.2 / max(vHw, 1.0); // 1 piksel (v biriminde)
	float L = abs(vInfo.y);
	// kontur: kenarda koyu çizgi
	float edge = smoothstep(1.0 - px * 2.2, 1.0 - px * 1.2, t);
	float outA = 1.0 - smoothstep(1.0 - px * 0.8, 1.0, t);
	// dolgu: ortası açık, kenarı koyu altın
	vec3 c = mix(goldHi, gold, smoothstep(0.0, 0.55, t));
	c = mix(c, goldLo, smoothstep(0.5, 0.95, t));
	// akan ışık şeritleri (hedefe doğru)
	float s = u * L * 2.2 - uTime * 1.6 - t * 0.45;
	float band = smoothstep(0.62, 0.8, fract(s)) * (1.0 - smoothstep(0.86, 0.98, fract(s)));
	c = mix(c, vec3(1.0, 0.98, 0.86), band * 0.75 * (1.0 - smoothstep(${UH.toFixed(3)} - 0.04, ${UH.toFixed(3)}, u)));
	c = mix(c, ink, edge);
	// kuyruk yumuşak başlar
	float tail = smoothstep(0.0, 0.16, u);
	float pulse = 0.9 + 0.1 * sin(uTime * 3.2 + order * 1.3);
	gl_FragColor = vec4(c * pulse, outA * tail * reveal * uAlpha * 0.97);
}`;

export class Cues {
	constructor(G, board) {
		this.board = board;
		const vA = MAXA * SECT * 2;
		const vB = MAXA * 4;
		const V = vA + vB;
		this.vA = vA;
		this.pos = new Float32Array(V * 3);
		this.tan = new Float32Array(V * 3);
		this.uv = new Float32Array(V * 2);
		this.info = new Float32Array(V * 4);
		const idx = [];
		for (let a = 0; a < MAXA; a++) {
			const o = a * SECT * 2;
			for (let k = 0; k < SECT - 1; k++) {
				const i0 = o + k * 2;
				idx.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2);
			}
		}
		this.idxA = idx.length;
		for (let b = 0; b < MAXA; b++) {
			const o = vA + b * 4;
			idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
		}
		const g = new THREE.BufferGeometry();
		this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
		this.aTan = new THREE.BufferAttribute(this.tan, 3).setUsage(THREE.DynamicDrawUsage);
		this.aUv = new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage);
		this.aInfo = new THREE.BufferAttribute(this.info, 4).setUsage(THREE.DynamicDrawUsage);
		g.setAttribute('position', this.aPos);
		g.setAttribute('aTan', this.aTan);
		g.setAttribute('aUv', this.aUv);
		g.setAttribute('aInfo', this.aInfo);
		g.setIndex(idx);
		this.geo = g;
		this.uniforms = {
			uTime: G.uTime,
			uRes: G.uRes,
			uState: { value: board.stateTex },
			uSelOn: board.uSelOn,
			uDpr: { value: 1 },
			uGrow: { value: 1 },
			uAlpha: { value: 1 },
			uPSel: { value: board.selLiftUnit },
		};
		this.mat = new THREE.ShaderMaterial({
			vertexShader: VS,
			fragmentShader: FS,
			uniforms: this.uniforms,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		this.mesh = new THREE.Mesh(g, this.mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 45;
		this.mesh.userData.overlay = true; // tilt-shift bulanıklığı almaz
		this.mesh.onBeforeRender = (renderer) => {
			this.uniforms.uDpr.value = renderer.getPixelRatio();
		};
		// açılışta bir kez görünür kalır (derleme); ilk update'te gizlenir
		g.setDrawRange(0, 6);
		this.on = false;
		this.k = 0;
		this.grow = 0;
		this.nA = 0;
		this.nB = 0;
		this._a = new THREE.Vector3();
		this._b = new THREE.Vector3();
		this._key = '';
	}

	/**
	 * targets: seçilebilir il indeksleri; me: işaretlerin çıktığı oyuncu (sahip kimliği).
	 * Komşu toprağı olan her hedefe ok; olmayana rozet.
	 */
	show(targets, me, { attack = false } = {}) {
		const B = this.board;
		const key = targets.join(',') + '|' + me + '|' + attack;
		if (this.on && key === this._key) return;
		this._key = key;
		this.on = true;
		this.grow = 0;
		let nA = 0;
		let nB = 0;
		const P = B.provinces;
		let ord = 0;
		// oklar ekranda soldan sağa sırayla belirsin
		const list = targets.slice().sort((a, b) => P[a].x - P[b].x);
		for (const t of list) {
			const pt = P[t];
			let src = -1;
			let best = -1;
			if (me != null && me >= 0) {
				for (const id of pt.nb || []) {
					const q = B.byId.get(id);
					if (!q || q.owner !== me) continue;
					// en uzun ortak sınır (yaklaşık: sınır noktası sayısı yerine merkez yakınlığı + alan)
					const d = Math.hypot(q.x - pt.x, q.z - pt.z);
					const sc = 1 / (d + 0.5) + (q.inner || 1) * 0.02;
					if (sc > best) {
						best = sc;
						src = q.index;
					}
				}
			}
			if (src >= 0 && nA < MAXA) this._arrow(nA++, src, t, attack, ord++);
			else if (nB < MAXA) this._badge(nB++, t, attack, ord++);
		}
		// kullanılmayan ok yuvaları boş (eski seçimden kalan oklar çizilmesin)
		for (let k = nA * SECT * 2; k < this.vA; k++) this.info[k * 4] = 2;
		this.nA = nA;
		this.nB = nB;
		this.aPos.needsUpdate = this.aTan.needsUpdate = this.aUv.needsUpdate = this.aInfo.needsUpdate = true;
	}

	hide() {
		this.on = false;
		this._key = '';
	}

	_arrow(a, src, t, attack, ord) {
		const B = this.board;
		const ps = B.provinces[src];
		const pt = B.provinces[t];
		const bp = B.borderPoint(src, t, this._a);
		const bx = bp.x;
		const bz = bp.z;
		// kuyruk: kaynak ilin içinde (sınırdan merkeze doğru), uç: hedefin ortasına yakın (adın biraz üstü)
		const sdx = ps.x - bx;
		const sdz = ps.z - bz;
		const sl = Math.hypot(sdx, sdz) || 1;
		const tail = Math.min(sl * 0.55, 1.6);
		const sx = bx + (sdx / sl) * tail;
		const sz = bz + (sdz / sl) * tail;
		const tdx = pt.x - bx;
		const tdz = pt.z - 0.45 - bz; // adın (merkezin biraz güneyi) üstünde biter
		const tl = Math.hypot(tdx, tdz) || 1;
		const reach = Math.min(Math.max(tl * 0.62, 0.9), tl);
		const ex = bx + (tdx / tl) * reach;
		const ez = bz + (tdz / tl) * reach;
		const sy = B.heightAt(sx, sz) + 0.12;
		const ey = B.heightAt(ex, ez) + B.selLiftUnit + 0.18;
		const len = Math.hypot(ex - sx, ez - sz);
		const arc = 0.35 + len * 0.2;
		const o = a * SECT * 2;
		const pos = this.pos;
		const tan = this.tan;
		const uv = this.uv;
		const info = this.info;
		const P = (u, out) => {
			const h = 4 * u * (1 - u);
			return out.set(sx + (ex - sx) * u, sy + (ey - sy) * u + arc * h, sz + (ez - sz) * u);
		};
		for (let k = 0; k < SECT; k++) {
			// kesitler: gövde (0..UH), baş tabanı (UH, geniş), uç (1)
			const u = k <= SEG ? (k / SEG) * UH : k === SEG + 1 ? UH : 1;
			const kind = k <= SEG ? -1 : 1; // -1: gövde genişliği, 1: baş
			const p = P(u, this._a);
			const q = P(Math.min(1, u + 0.01), this._b);
			if (u >= 0.999) P(0.99, this._b).sub(p).negate();
			else q.sub(p);
			const tx = q.x;
			const ty = q.y;
			const tz = q.z;
			const tlen = Math.hypot(tx, ty, tz) || 1;
			for (let side = 0; side < 2; side++) {
				const i = o + k * 2 + side;
				pos[i * 3] = p.x;
				pos[i * 3 + 1] = p.y;
				pos[i * 3 + 2] = p.z;
				tan[i * 3] = tx / tlen;
				tan[i * 3 + 1] = ty / tlen;
				tan[i * 3 + 2] = tz / tlen;
				uv[i * 2] = u;
				uv[i * 2 + 1] = side ? 1 : -1;
				info[i * 4] = 0;
				info[i * 4 + 1] = kind < 0 ? -len : len; // işaret: gövde/baş; FS mutlak değeri alır
				info[i * 4 + 2] = attack ? 1 : 0;
				info[i * 4 + 3] = ord;
			}
		}
	}

	_badge(b, t, attack, ord) {
		const B = this.board;
		const v = B.labelAt(t, this._a, true);
		const o = this.vA + b * 4;
		const C = [-1, -1, 1, -1, 1, 1, -1, 1];
		for (let k = 0; k < 4; k++) {
			const i = o + k;
			this.pos[i * 3] = v.x;
			this.pos[i * 3 + 1] = v.y;
			this.pos[i * 3 + 2] = v.z;
			this.uv[i * 2] = C[k * 2];
			this.uv[i * 2 + 1] = C[k * 2 + 1];
			this.info[i * 4] = 1;
			this.info[i * 4 + 1] = 0;
			this.info[i * 4 + 2] = t;
			this.info[i * 4 + 3] = ord;
		}
	}

	update(dt) {
		const want = this.on ? 1 : 0;
		this.k += (want - this.k) * Math.min(1, dt * (this.on ? 6 : 9));
		if (Math.abs(want - this.k) < 0.003) this.k = want;
		if (this.on) this.grow = Math.min(1, this.grow + dt / 0.75);
		this.uniforms.uGrow.value = this.grow;
		this.uniforms.uAlpha.value = this.k;
		const vis = this.k > 0.003 && this.nA + this.nB > 0;
		this.mesh.visible = vis;
		if (vis) {
			// oklar ve rozetler ayrı aralıklarda: rozet yoksa yalnızca ok indeksleri çizilir
			const nIdxA = this.nA * (SECT - 1) * 6;
			if (this.nB === 0) this.geo.setDrawRange(0, nIdxA);
			else if (this.nA === 0) this.geo.setDrawRange(this.idxA, this.nB * 6);
			else this._both();
		}
	}

	_both() {
		// ikisi birden: aradaki boş okları sıfır alanlı bırak (yazılmamış köşeler 0) ve hepsini çiz
		this.geo.setDrawRange(0, this.idxA + this.nB * 6);
	}
}
