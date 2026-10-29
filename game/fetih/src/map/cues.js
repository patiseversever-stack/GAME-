// Seçim işaretleri (gece odağı): "kim, nereden, nereye" tek bakışta okunsun.
//
// - Ok: sırası gelen oyuncunun kendi renginde (insan seçerken insanın rengi, bot seçerken botun rengi),
//   kalın, beyaz kenarlı ve ince koyu dış çizgili; oyuncunun toprağından (ortak sınırın hemen içinden, yuvarlak
//   bir çıkış noktasıyla) her seçilebilir ile kavisli gider. Üstünde hedefe doğru akan açık oklar (chevron).
//   Genişlik ekran pikseli olarak sabittir: uzaktan da yakından da aynı okunur. Altın ya da parlama yok;
//   sarı bir ilin üstünde de, kırmızı bir ilin üstünde de beyaz kenar sayesinde seçilir.
// - Çıkış noktası: okun kuyruğunda aynı renkte yuvarlak (beyaz halkalı): "buradan çıkıyor".
//
// Tek çizim çağrısı. Her ok üç kat çizilir (koyu dış çizgi, beyaz kenar, renkli dolgu; dıştakiler birkaç piksel
// şişirilmiş şekil) ve sonunda çıkış noktası: bu sırayla tek dizinde. Tamponlar açılışta kurulur; show()
// yalnızca seçim değişince köşeleri yeniden yazar, kare başına yalnızca uniform değişir. Derinlik testi yok:
// kabartmaya gömülmez; il adlarından önce çizilir.

import * as THREE from 'three';

const MAXA = 28; // en çok ok
const SEG = 22; // gövde kesit sayısı
const SECT = SEG + 1 + 2; // gövde + baş tabanı + uç
const UH = 0.74; // okun başının başladığı u
const HEADK = 1.9; // baş yarı genişliği / gövde yarı genişliği
const STRIPS = 3; // koyu dış çizgi, beyaz kenar, renkli dolgu
const VPS = SECT * 2; // şerit başına köşe
const VPA = VPS * STRIPS + 4; // ok başına köşe (üç şerit + çıkış noktası dörtgeni)
const IPA = (SECT - 1) * 6 * STRIPS + 6; // ok başına dizin
// şeritlerin şişirme payları (css pikseli): koyu 1,2 + beyaz 2,3 = dış çizgi 3,5
const DIL = [3.5, 2.3, 0];

const VS = /* glsl */ `
attribute vec3 aTan;
attribute vec2 aUv;   // u boyuna (0 kuyruk, 1 uç), v enine (-1..1)
attribute vec4 aInfo; // tür (0 ok, 1 çıkış noktası), ok uzunluğu (işaret: gövde/baş), şerit, sıra
attribute vec3 aCol;  // dolgu rengi (görüntü rengi, 0..1)
uniform float uTime;
uniform vec3 uRes;
uniform float uDpr;
uniform float uGrow; // görünme (0..1)
varying vec2 vUv;
varying vec4 vInfo;
varying float vHw;
varying vec3 vCol;
void main() {
	vUv = aUv;
	vInfo = aInfo;
	vCol = aCol;
	float order = aInfo.w;
	vec3 p = position;
	// kuyruk (çıkış noktası) dörtgeni: ekranda sabit boy
	vec4 c = projectionMatrix * viewMatrix * vec4(p, 1.0);
	vec2 s0 = c.xy / c.w * uRes.xy;
	float ppu = uRes.y * projectionMatrix[1][1] * 0.5 / max(c.w, 1e-3);
	float body = clamp(ppu * 0.26, 7.0 * uDpr, 10.5 * uDpr);
	float g = clamp(uGrow * 1.6 - order * 0.06, 0.0, 1.0);
	if (aInfo.x > 0.5) {
		float R = body * 1.22 + 3.5 * uDpr;
		vHw = R;
		c.xy += aUv * R / uRes.xy * 2.0 * c.w;
		gl_Position = g < 0.02 ? vec4(2.0, 2.0, 2.0, 1.0) : c;
		return;
	}
	vec4 c2 = projectionMatrix * viewMatrix * vec4(p + aTan * 0.05, 1.0);
	vec2 s1 = c2.xy / c2.w * uRes.xy;
	vec2 dir = normalize(s1 - s0 + vec2(1e-5, 0.0));
	vec2 perp = vec2(-dir.y, dir.x);
	float strip = aInfo.z;
	float dil = (strip < 0.5 ? ${DIL[0].toFixed(1)} : strip < 1.5 ? ${DIL[1].toFixed(1)} : 0.0) * uDpr;
	bool isHead = aInfo.y > 0.0; // baş kesitleri (taban ve uç)
	float head = isHead ? (1.0 - aUv.x) / ${(1 - UH).toFixed(3)} : 0.0;
	float hw = isHead ? body * ${HEADK.toFixed(2)} * min(1.0, head * 1.02) : body;
	hw += dil * (isHead ? 1.25 : 1.0); // eğik baş kenarlarında dik şişirme biraz daha geniş
	vec2 shift = vec2(0.0);
	if (isHead) shift = dir * (head > 0.5 ? -dil : dil * 1.75); // taban geri, uç ileri
	else if (aUv.x < 0.001) shift = -dir * dil;
	vHw = hw;
	c.xy += (perp * aUv.y * hw + shift) / uRes.xy * 2.0 * c.w;
	gl_Position = c;
}`;

const FS = /* glsl */ `
uniform float uTime;
uniform float uGrow;
uniform float uAlpha;
uniform float uDpr;
varying vec2 vUv;
varying vec4 vInfo;
varying float vHw;
varying vec3 vCol;
void main() {
	vec3 white = vec3(1.0, 0.985, 0.95);
	vec3 ink = vec3(0.02, 0.03, 0.06);
	float pulse = 0.93 + 0.07 * sin(uTime * 3.4 + vInfo.w * 1.3);
	if (vInfo.x > 0.5) {
		// çıkış noktası: koyu dış çizgi, beyaz halka, renkli yuvarlak, ortada beyaz nokta
		float r = length(vUv);
		float aa = fwidth(r) * 1.1;
		float a = 1.0 - smoothstep(1.0 - aa, 1.0, r);
		if (a < 0.01) discard;
		float pxr = uDpr / max(vHw, 1.0); // 1 css pikseli (r biriminde)
		float rDark = 1.0 - 1.2 * pxr;
		float rWhite = rDark - 2.3 * pxr;
		vec3 c = vCol * mix(1.05, 0.8, smoothstep(0.0, rWhite, r)) + white * 0.1 * (1.0 - r);
		c = mix(c, white, smoothstep(rWhite - aa, rWhite + aa, r));
		c = mix(c, ink, smoothstep(rDark - aa, rDark + aa, r) * 0.9);
		gl_FragColor = vec4(c * pulse, a * uAlpha);
		return;
	}
	float u = vUv.x;
	float order = vInfo.w;
	float g = clamp(uGrow * 1.6 - order * 0.06, 0.0, 1.0);
	// kuyruktan uca doğru belirir
	float reveal = smoothstep(g * 1.08 - 0.06, g * 1.08 - 0.12, u);
	if (reveal < 0.01) discard;
	float t = abs(vUv.y);
	float aaw = 1.0 / max(vHw, 1.0); // yaklaşık 1 cihaz pikseli (v biriminde)
	float shape = 1.0 - smoothstep(1.0 - aaw, 1.0, t);
	float strip = vInfo.z;
	vec3 c;
	float a = shape;
	if (strip < 0.5) {
		c = ink;
		a *= 0.85;
	} else if (strip < 1.5) c = white;
	else {
		// dolgu: ortası biraz açık, kenarı biraz koyu (düz değil, yuvarlak boru gibi)
		c = vCol * mix(1.0, 0.8, smoothstep(0.25, 1.0, t)) + white * 0.14 * (1.0 - t) * (1.0 - t);
		// hedefe doğru akan açık oklar (chevron): yalnızca gövdede
		float L = abs(vInfo.y);
		float s = u * L * 1.7 - uTime * 1.4 - t * 0.5;
		float band = smoothstep(0.66, 0.84, fract(s)) * (1.0 - smoothstep(0.9, 0.99, fract(s)));
		c = mix(c, white, band * 0.3 * (1.0 - smoothstep(${UH.toFixed(3)} - 0.05, ${UH.toFixed(3)}, u)));
	}
	gl_FragColor = vec4(c * (strip > 1.5 ? pulse : 1.0), a * reveal * uAlpha);
}`;

export class Cues {
	constructor(G, board) {
		this.board = board;
		const V = MAXA * VPA;
		this.pos = new Float32Array(V * 3);
		this.tan = new Float32Array(V * 3);
		this.uv = new Float32Array(V * 2);
		this.info = new Float32Array(V * 4);
		this.col = new Float32Array(V * 3);
		const idx = [];
		for (let a = 0; a < MAXA; a++) {
			const o = a * VPA;
			for (let s = 0; s < STRIPS; s++) {
				const so = o + s * VPS;
				for (let k = 0; k < SECT - 1; k++) {
					const i0 = so + k * 2;
					idx.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2);
				}
			}
			const d = o + STRIPS * VPS;
			idx.push(d, d + 1, d + 2, d, d + 2, d + 3);
		}
		const g = new THREE.BufferGeometry();
		this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
		this.aTan = new THREE.BufferAttribute(this.tan, 3).setUsage(THREE.DynamicDrawUsage);
		this.aUv = new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage);
		this.aInfo = new THREE.BufferAttribute(this.info, 4).setUsage(THREE.DynamicDrawUsage);
		this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
		g.setAttribute('position', this.aPos);
		g.setAttribute('aTan', this.aTan);
		g.setAttribute('aUv', this.aUv);
		g.setAttribute('aInfo', this.aInfo);
		g.setAttribute('aCol', this.aCol);
		g.setIndex(idx);
		this.geo = g;
		this.uniforms = {
			uTime: G.uTime,
			uRes: G.uRes,
			uDpr: { value: 1 },
			uGrow: { value: 1 },
			uAlpha: { value: 1 },
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
		this.sources = []; // okların çıktığı iller (arayüz: "SEN" rozeti ve kadraj için)
		this.tails = new Map(); // kaynak il → {x, y, z (okların çıkış noktası, ortalama), n (ok sayısı)}
		this.tips = new Map(); // hedef il → {x, y, z (ok ucu), bx, by, bz (okun ucundan biraz önceki noktası)}
		this.main = -1; // en çok ok çıkan kaynak il
		this._a = new THREE.Vector3();
		this._b = new THREE.Vector3();
		this._key = '';
	}

	/**
	 * targets: seçilebilir il indeksleri; me: okların çıktığı oyuncu (sahip kimliği; rengi haritadan).
	 * Komşu toprağı olan her hedefe bir ok; komşusu olmayana ok yok (adı arayüz etiketi gösterir).
	 */
	show(targets, me, { attack = false } = {}) {
		const B = this.board;
		const key = targets.join(',') + '|' + me + '|' + attack;
		if (this.on && key === this._key) return;
		this._key = key;
		this.on = true;
		this.grow = 0;
		let nA = 0;
		const P = B.provinces;
		let ord = 0;
		this.sources.length = 0;
		this.tails.clear();
		this.tips.clear();
		this.main = -1;
		const hex = B.ownerHex?.[me];
		const col = hex != null ? [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255] : [1, 0.82, 0.3];
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
					// en yakın (ve büyük) komşu toprak
					const d = Math.hypot(q.x - pt.x, q.z - pt.z);
					const sc = 1 / (d + 0.5) + (q.inner || 1) * 0.02;
					if (sc > best) {
						best = sc;
						src = q.index;
					}
				}
			}
			if (src >= 0 && nA < MAXA) {
				const r = this._arrow(nA++, src, t, ord++, col);
				if (!this.sources.includes(src)) this.sources.push(src);
				this.tips.set(t, r.tip);
				const tl = this.tails.get(src) || { x: 0, y: 0, z: 0, n: 0 };
				tl.x += r.tail.x;
				tl.y += r.tail.y;
				tl.z += r.tail.z;
				tl.n++;
				this.tails.set(src, tl);
			}
		}
		let bn = 0;
		for (const [i, tl] of this.tails) {
			tl.x /= tl.n;
			tl.y /= tl.n;
			tl.z /= tl.n;
			if (tl.n > bn) {
				bn = tl.n;
				this.main = i;
			}
		}
		this.nA = nA;
		this.aPos.needsUpdate = this.aTan.needsUpdate = this.aUv.needsUpdate = this.aInfo.needsUpdate = this.aCol.needsUpdate = true;
	}

	hide() {
		this.on = false;
		this._key = '';
	}

	_arrow(a, src, t, ord, col) {
		const B = this.board;
		const ps = B.provinces[src];
		const pt = B.provinces[t];
		const bp = B.borderPoint(src, t, this._a);
		const bx = bp.x;
		const bz = bp.z;
		// kuyruk: kaynak ilin içinde, sınırın hemen gerisinde (çıkış noktası kendi toprağında okunsun);
		// uç: hedefin içinde, ilin adının biraz önünde
		const sdx = ps.x - bx;
		const sdz = ps.z - bz;
		const sl = Math.hypot(sdx, sdz) || 1;
		let tail = Math.min(sl * 0.7, 1.5);
		const tdx = pt.x - bx;
		const tdz = pt.z - 0.3 - bz;
		const tl = Math.hypot(tdx, tdz) || 1;
		let reach = Math.min(Math.max(tl * 0.5, 0.9), tl);
		// çok kısa ok okunmaz (komşu iller yakınsa): kuyruğu geriye, ucu ileriye uzat
		const need = 3.0 - tail - reach;
		if (need > 0) {
			const t2 = Math.min(sl * 0.95, tail + need * 0.55);
			reach = Math.min(tl, reach + need - (t2 - tail));
			tail = t2;
		}
		const sx = bx + (sdx / sl) * tail;
		const sz = bz + (sdz / sl) * tail;
		const ex = bx + (tdx / tl) * reach;
		const ez = bz + (tdz / tl) * reach;
		const sy = B.heightAt(sx, sz) + 0.1;
		const ey = B.heightAt(ex, ez) + B.selLiftUnit + 0.16;
		const len = Math.hypot(ex - sx, ez - sz);
		const arc = 0.22 + len * 0.1;
		const o = a * VPA;
		const pos = this.pos;
		const tan = this.tan;
		const uv = this.uv;
		const info = this.info;
		const cl = this.col;
		const P = (u, out) => {
			const h = 4 * u * (1 - u);
			return out.set(sx + (ex - sx) * u, sy + (ey - sy) * u + arc * h, sz + (ez - sz) * u);
		};
		const put = (i, x, y, z, tx, ty, tz, u, v, k0, k1, k2, k3) => {
			pos[i * 3] = x;
			pos[i * 3 + 1] = y;
			pos[i * 3 + 2] = z;
			tan[i * 3] = tx;
			tan[i * 3 + 1] = ty;
			tan[i * 3 + 2] = tz;
			uv[i * 2] = u;
			uv[i * 2 + 1] = v;
			info[i * 4] = k0;
			info[i * 4 + 1] = k1;
			info[i * 4 + 2] = k2;
			info[i * 4 + 3] = k3;
			cl[i * 3] = col[0];
			cl[i * 3 + 1] = col[1];
			cl[i * 3 + 2] = col[2];
		};
		for (let s = 0; s < STRIPS; s++) {
			for (let k = 0; k < SECT; k++) {
				// kesitler: gövde (0..UH), baş tabanı (UH, geniş), uç (1)
				const u = k <= SEG ? (k / SEG) * UH : k === SEG + 1 ? UH : 1;
				const kind = k <= SEG ? -1 : 1; // -1: gövde genişliği, 1: baş
				const p = P(u, this._a);
				const q = P(Math.min(1, u + 0.01), this._b);
				if (u >= 0.999) P(0.99, this._b).sub(p).negate();
				else q.sub(p);
				const tl2 = Math.hypot(q.x, q.y, q.z) || 1;
				for (let side = 0; side < 2; side++) {
					const i = o + s * VPS + k * 2 + side;
					put(i, p.x, p.y, p.z, q.x / tl2, q.y / tl2, q.z / tl2, u, side ? 1 : -1, 0, kind < 0 ? -len : len, s, ord);
				}
			}
		}
		// çıkış noktası dörtgeni (kuyruğun başında)
		const C = [-1, -1, 1, -1, 1, 1, -1, 1];
		const d = o + STRIPS * VPS;
		for (let k = 0; k < 4; k++) put(d + k, sx, sy, sz, 0, 0, 1, C[k * 2], C[k * 2 + 1], 1, 0, 0, ord);
		const pb = P(0.8, this._b);
		return { tail: { x: sx, y: sy, z: sz }, tip: { x: ex, y: ey, z: ez, bx: pb.x, by: pb.y, bz: pb.z } };
	}

	update(dt) {
		const want = this.on ? 1 : 0;
		this.k += (want - this.k) * Math.min(1, dt * (this.on ? 6 : 9));
		if (Math.abs(want - this.k) < 0.003) this.k = want;
		if (this.on) this.grow = Math.min(1, this.grow + dt / 0.75);
		this.uniforms.uGrow.value = this.grow;
		this.uniforms.uAlpha.value = this.k;
		const vis = this.k > 0.003 && this.nA > 0;
		this.mesh.visible = vis;
		if (vis) this.geo.setDrawRange(0, this.nA * IPA);
	}
}
