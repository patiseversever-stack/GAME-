// İl adları: haritanın üstünde, her zaman okunur 3D yazı katmanı. Tek çizim çağrısı.
//
// - v0.3 tasarımı (Gündönümü tonu): Manrope kalın büyük harf, geniş harf aralığı, ince lacivert hap üstünde
//   fildişi yazı; solda sahibin renginde küçük nokta (tarafsızda ince halka). Seçimde hap koyulaşır, ince
//   altın çizgi alır. Atlas kanalları: r = yazı, g = hap, b = hapın iç çizgisi (g'nin mip'i yumuşak gölge).
// - Her il bir örnek (instance): dünya noktası ekrana izdüşer, yazı ekrana paralel durur (bulanıklaşmaz).
// - Boy sabit (css piksel): her yakınlıkta aynı, sakin. Ekran kenarına taşan ad içeri kıstırılır, asla
//   kesilmez; ekranın çok dışındaki ad gösterilmez.
// - 'all' kipinde çakışan yazılar elenir (büyük il ve vurgulu il önce); seçim listesindekiler hep görünür.
// - Kamera her çizimde onBeforeRender ile gelir: uygulamanın çizim döngüsüne dokunmak gerekmez.

import * as THREE from 'three';
import { PROV } from '../gfx/shaderlib.js';

// büyük şehirler (plaka): genel bakışta yalnızca bunlar (önem sırasıyla)
const MAJOR = [34, 6, 35, 16, 7, 42, 1, 61, 25, 21, 65, 55, 27];
const SECOND = [38, 26, 33, 63, 44, 58, 20, 41, 10, 45, 9, 48, 52, 36, 46, 23];

// Atlas yerleşimi (yazı boyu FS piksel): hücre = ince hap (pill) + kenar payı. Hap yüksekliği, nokta ve
// yazı başlangıcı hücre yüksekliği cinsinden sabittir (shader bunları bilir).
const FS_PX = 34;
const PILL = Math.round(FS_PX * 1.5);
const MARG = 6;
const CELL = PILL + MARG * 2;
const DOT_X = (MARG + PILL * 0.52) / CELL; // sahip noktası merkezi (hücre yüksekliği biriminde, soldan)
const DOT_R = (FS_PX * 0.2) / CELL;
const f4 = (v) => v.toFixed(4);

const VS = /* glsl */ `
${PROV}
attribute vec2 corner;     // -0.5..0.5
attribute vec3 iPos;       // dinlenme konumu (yükselme shader'da eklenir)
attribute vec4 iRect;      // atlas: u0, v0, u1, v1
attribute vec3 iSize;      // en/boy oranı, dünya boyu, il kimliği
attribute vec2 iState;     // görünürlük (0..1), vurgu (0..1)
attribute vec3 iOff;       // ekran kayması (css piksel) ve ölçek: çakışan seçim yazıları için
uniform float uTime;
uniform vec3 uRes;
uniform float uDpr;
uniform float uPLift;
uniform float uPSel;
varying vec2 vUv;
varying vec2 vQ;    // hücre içi konum: x soldan (hücre yüksekliği birimi), y merkezden
varying float vA;
varying float vHi;
varying float vPx;  // 1 ekran pikseli (hücre yüksekliği birimi)
varying vec4 vOwn;
void main() {
	float pid = iSize.z;
	vec4 fx = provRow(pid, 3);
	vOwn = provRow(pid, 0);
	vec3 p = iPos;
	p.y += fx.x * uPLift + fx.z * uPSel;
	vec4 c = projectionMatrix * viewMatrix * vec4(p, 1.0);
	float hi = iState.y;
	// sabit, sakin boy (css px): genel bakışta 17, vurguda 21
	float h = mix(17.0, 21.0, hi) * uDpr * iOff.z;
	float w = h * iSize.x;
	// ekran kenarında kesilmesin: hücre ekranın içine kıstırılır (kenardan 6 px pay)
	vec2 ndc = c.xy / c.w + iOff.xy * uDpr / uRes.xy * 2.0;
	vec2 hs = vec2(w, h) / uRes.xy + 6.0 * uDpr / uRes.xy * 2.0;
	vec2 cl = clamp(ndc, -1.0 + hs, 1.0 - hs);
	// çok dışarıdaki ad hiç görünmez (kıstırma yalnızca kenara taşanlar için)
	float ofs = max(abs(ndc.x - cl.x) * uRes.x, abs(ndc.y - cl.y) * uRes.y) * 0.5 / uDpr;
	vA = iState.x * (1.0 - smoothstep(24.0, 60.0, ofs));
	ndc = cl + corner * vec2(w, h) / uRes.xy * 2.0;
	gl_Position = vec4(ndc * c.w, c.z, c.w);
	vUv = mix(iRect.xy, iRect.zw, corner + 0.5);
	vQ = vec2((corner.x + 0.5) * iSize.x, corner.y);
	vPx = 1.0 / max(h, 1.0);
	vHi = hi;
}`;

const FS = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec2 vQ;
varying float vA;
varying float vHi;
varying float vPx;
varying vec4 vOwn;
void main() {
	vec4 t = texture(uAtlas, vUv, -0.4);
	float text = t.r;
	float pill = t.g;
	float line = t.b;
	float shadow = texture(uAtlas, vUv, 2.2).g;
	// hap: gece lacivert, yarı saydam; vurguda daha koyu ve ince altın çizgili
	vec3 bg = mix(vec3(0.035, 0.045, 0.085), vec3(0.02, 0.025, 0.05), vHi);
	float bgA = pill * mix(0.66, 0.84, vHi);
	vec3 c = bg;
	float a = bgA;
	// altta yumuşak gölge
	a = a + shadow * 0.35 * (1.0 - a);
	vec3 gold = vec3(0.98, 0.78, 0.4);
	c = mix(c, gold, line * mix(0.18, 0.95, vHi));
	a = max(a, line * mix(0.18, 0.95, vHi) * pill);
	// sahip noktası: sahipli ilde sahibin rengi (koyu halkalı), tarafsızda ince fildişi halka
	float d = length(vQ - vec2(${f4(DOT_X)}, 0.0));
	float aa = vPx * 1.2;
	vec3 own = pow(max(vOwn.rgb, 0.0), vec3(1.0 / 2.2));
	float disc = 1.0 - smoothstep(${f4(DOT_R)} - aa, ${f4(DOT_R)} + aa, d);
	float ring = 1.0 - smoothstep(0.0, aa * 1.2, abs(d - ${f4(DOT_R)}) - vPx * 0.6);
	if (vOwn.w >= 0.0) {
		c = mix(c, own * 1.08, disc);
		c = mix(c, vec3(1.0), ring * 0.35);
	} else c = mix(c, vec3(0.92, 0.88, 0.8), ring * 0.7);
	// yazı: fildişi (vurguda sıcak beyaz)
	vec3 tc = mix(vec3(0.9, 0.88, 0.84), vec3(1.0, 0.95, 0.84), vHi);
	c = mix(c, tc, text);
	a = max(a, text);
	gl_FragColor = vec4(c, a * vA);
}`;

export class Labels {
	constructor(G, board) {
		this.board = board;
		const N = board.count;
		this.N = N;
		this.canvas = document.createElement('canvas');
		this.canvas.width = 2048;
		this.canvas.height = 1024;
		this.tex = new THREE.CanvasTexture(this.canvas);
		this.tex.colorSpace = THREE.NoColorSpace;
		this.tex.minFilter = THREE.LinearMipmapLinearFilter;
		this.tex.magFilter = THREE.LinearFilter;
		this.tex.generateMipmaps = true;
		this.tex.anisotropy = 1;

		const g = new THREE.InstancedBufferGeometry();
		g.setAttribute('corner', new THREE.Float32BufferAttribute([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5], 2));
		g.setIndex([0, 1, 2, 0, 2, 3]);
		this.pos = new Float32Array(N * 3);
		this.rect = new Float32Array(N * 4);
		this.size = new Float32Array(N * 3);
		this.state = new Float32Array(N * 2);
		this.aPos = new THREE.InstancedBufferAttribute(this.pos, 3);
		this.aRect = new THREE.InstancedBufferAttribute(this.rect, 4);
		this.aSize = new THREE.InstancedBufferAttribute(this.size, 3);
		this.aState = new THREE.InstancedBufferAttribute(this.state, 2);
		this.aState.setUsage(THREE.DynamicDrawUsage);
		this.off = new Float32Array(N * 3);
		for (let i = 0; i < N; i++) this.off[i * 3 + 2] = 1;
		this.aOff = new THREE.InstancedBufferAttribute(this.off, 3);
		this.aOff.setUsage(THREE.DynamicDrawUsage);
		g.setAttribute('iOff', this.aOff);
		g.setAttribute('iPos', this.aPos);
		g.setAttribute('iRect', this.aRect);
		g.setAttribute('iSize', this.aSize);
		g.setAttribute('iState', this.aState);
		g.instanceCount = N;
		this.geo = g;

		const v = new THREE.Vector3();
		for (const p of board.provinces) {
			board.labelAt(p.index, v, true);
			this.pos.set([v.x, v.y, v.z], p.index * 3);
			// dünya boyu: büyük ilde büyük yazı
			this.size[p.index * 3 + 1] = THREE.MathUtils.clamp(p.inner * 0.34, 0.42, 1.05);
			this.size[p.index * 3 + 2] = p.index;
		}
		const FONT = "'Manrope', system-ui, sans-serif";
		this._draw(FONT);
		// gömülü yazı tipi yüklenince atlası yeniden çiz (yalnızca doku güncellenir, shader değil)
		try {
			document.fonts?.load(`700 ${FS_PX}px Manrope`, 'ĞğİıŞşÇçÖöÜü').then(() => {
				this._draw(FONT);
				this.tex.needsUpdate = true;
			});
		} catch (e) {
			/* yazı tipi API'si yok */
		}

		this.uniforms = {
			uTime: G.uTime,
			uRes: G.uRes,
			uState: { value: board.stateTex },
			uSelOn: board.uSelOn,
			uAtlas: { value: this.tex },
			uDpr: { value: 1 },
			uPLift: { value: board.liftUnit },
			uPSel: { value: board.selLiftUnit },
		};
		this.mat = new THREE.ShaderMaterial({
			vertexShader: VS,
			fragmentShader: FS,
			uniforms: this.uniforms,
			transparent: true,
			depthTest: false,
			depthWrite: false,
		});
		this.mesh = new THREE.Mesh(g, this.mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 50;
		this.mesh.userData.overlay = true; // tilt-shift bulanıklığından sonra çizilir
		this.mesh.onBeforeRender = (renderer, scene, camera) => this._before(renderer, camera);

		// kip ve canlandırma durumu
		this.mode = null; // null | 'all' | 'list'
		this.forced = new Uint8Array(N);
		this.want = new Float32Array(N);
		this.alpha = new Float32Array(N);
		this.hi = new Float32Array(N);
		this.hiTo = new Float32Array(N);
		// öncelik: büyük şehirler (0), ikinci halka (1), sonra alan
		this.rank = new Uint8Array(N).fill(2);
		this.inner = new Float32Array(N);
		for (const p of board.provinces) {
			this.inner[p.index] = p.inner || 1;
			if (MAJOR.includes(p.id)) this.rank[p.index] = 0;
			else if (SECOND.includes(p.id)) this.rank[p.index] = 1;
		}
		this.order = board.provinces
			.map((p) => p.index)
			.sort((a, b) => this.rank[a] - this.rank[b] || (this.rank[a] === 0 ? MAJOR.indexOf(board.provinces[a].id) - MAJOR.indexOf(board.provinces[b].id) : board.provinces[b].area - board.provinces[a].area));
		this.base = null;
		this._pp = new Float32Array(N);
		this._ox = new Float32Array(N);
		this._oy = new Float32Array(N);
		this._os = new Float32Array(N).fill(1);
		this._acc = new Int32Array(N);
		this._lastM = new Float32Array(16);
		this._dirty = true;
		this._sx = new Float32Array(N);
		this._sy = new Float32Array(N);
		this._sw = new Float32Array(N);
		this._sh = new Float32Array(N);
		this._ok = new Uint8Array(N);
		this._far = new Uint8Array(N);
		this._v = new THREE.Vector3();
		this._m = new THREE.Matrix4();
		this._frame = 0;
		this._t = -1;
		this.visibleCount = 0;
	}

	_draw(font) {
		const c = this.canvas;
		const g = c.getContext('2d');
		g.clearRect(0, 0, c.width, c.height);
		g.fillStyle = '#000';
		g.fillRect(0, 0, c.width, c.height);
		const names = this.board.provinces.map((p) => p.name.toLocaleUpperCase('tr-TR'));
		const fs = FS_PX;
		const sp = fs * 0.16; // harf aralığı (küçük büyük harf, Gündönümü tonu)
		g.font = `700 ${fs}px ${font}`;
		const textW = (n) => {
			let w = 0;
			for (const ch of n) w += g.measureText(ch).width + sp;
			return w - sp;
		};
		const left = MARG + PILL * 0.98; // nokta için yer
		const right = MARG + PILL * 0.5;
		let x = 0;
		let y = 0;
		const W = c.width;
		const H = c.height;
		g.textBaseline = 'middle';
		g.textAlign = 'left';
		names.forEach((n, i) => {
			const tw = Math.ceil(textW(n));
			const w = Math.ceil(left + tw + right);
			if (x + w > W) {
				x = 0;
				y += CELL;
			}
			const r = PILL / 2;
			const px0 = x + MARG;
			const py0 = y + MARG;
			const pw = w - MARG * 2;
			// g: hap dolgusu
			g.fillStyle = '#00ff00';
			g.beginPath();
			g.moveTo(px0 + r, py0);
			g.arcTo(px0 + pw, py0, px0 + pw, py0 + PILL, r);
			g.arcTo(px0 + pw, py0 + PILL, px0, py0 + PILL, r);
			g.arcTo(px0, py0 + PILL, px0, py0, r);
			g.arcTo(px0, py0, px0 + pw, py0, r);
			g.closePath();
			g.fill();
			// b: içe 2 px ince çizgi (toplamalı karışım: kanallar birbirini silmez)
			g.globalCompositeOperation = 'lighter';
			g.strokeStyle = '#0000ff';
			g.lineWidth = 2.2;
			g.beginPath();
			const ir = r - 3;
			g.moveTo(px0 + 3 + ir, py0 + 3);
			g.arcTo(px0 + pw - 3, py0 + 3, px0 + pw - 3, py0 + PILL - 3, ir);
			g.arcTo(px0 + pw - 3, py0 + PILL - 3, px0 + 3, py0 + PILL - 3, ir);
			g.arcTo(px0 + 3, py0 + PILL - 3, px0 + 3, py0 + 3, ir);
			g.arcTo(px0 + 3, py0 + 3, px0 + pw - 3, py0 + 3, ir);
			g.closePath();
			g.stroke();
			// r: yazı
			g.fillStyle = '#ff0000';
			let cx = x + left;
			const cy = y + CELL / 2 + fs * 0.03;
			for (const ch of n) {
				g.fillText(ch, cx, cy);
				cx += g.measureText(ch).width + sp;
			}
			g.globalCompositeOperation = 'source-over';
			// atlas UV (CanvasTexture flipY: v aşağıdan yukarı)
			this.rect.set([x / W, 1 - (y + CELL) / H, (x + w) / W, 1 - y / H], i * 4);
			this.size[i * 3] = w / CELL;
			x += w;
		});
		this.aRect.needsUpdate = true;
		this.aSize.needsUpdate = true;
	}

	/**
	 * 'all' (ya da 'auto'): akıllı genel kip, yakınlaştıkça önem sırasıyla daha çok ad, çakışan elenir.
	 * dizi: yalnızca bu iller (seçim, düello), vurgulu, her zaman görünür; çakışırsa küçülür ve kayar.
	 * []: listeyi bırak, genel kipe dön. null: hepsini kapat.
	 */
	show(list) {
		this.forced.fill(0);
		this.hiTo.fill(0);
		if (list === 'all' || list === 'auto') {
			this.base = 'auto';
			this.mode = 'auto';
		} else if (Array.isArray(list) && list.length) {
			this.mode = 'list';
			for (const i of list) {
				this.forced[i] = 1;
				this.hiTo[i] = 1;
			}
		} else if (Array.isArray(list)) this.mode = this.base;
		else {
			this.base = null;
			this.mode = null;
		}
		this._dirty = true;
	}

	_before(renderer, camera) {
		this.uniforms.uDpr.value = renderer.getPixelRatio();
		if (this._cam !== camera) {
			this._cam = camera;
			this._dirty = true;
		}
	}

	/** Her kare (board.update): görünürlük yumuşakça değişir (pat diye çıkmaz); eleme kamera oynayınca. */
	update(dt) {
		const cam = this._cam;
		this._frame++;
		if (cam && this.mode && (this._dirty || this._frame % 3 === 0)) {
			// kamera anlamlı oynadıysa (ya da kip değiştiyse) yeniden değerlendir
			const e = cam.matrixWorld.elements;
			const L = this._lastM;
			let d = 0;
			for (let k = 0; k < 16; k++) d += Math.abs(e[k] - L[k]);
			if (this._dirty || d > 0.02) {
				for (let k = 0; k < 16; k++) L[k] = e[k];
				this._dirty = false;
				this._cull(cam);
			}
		}
		const N = this.N;
		const k = 1 - Math.exp(-9 * dt);
		let dirty = false;
		let vis = 0;
		for (let i = 0; i < N; i++) {
			const w = this.mode ? this._ok[i] : 0;
			this.want[i] = w;
			const a = this.alpha[i] + (w - this.alpha[i]) * k;
			const h = this.hi[i] + (this.hiTo[i] - this.hi[i]) * k;
			const o = i * 3;
			const ox = this.off[o] + (this._ox[i] - this.off[o]) * k;
			const oy = this.off[o + 1] + (this._oy[i] - this.off[o + 1]) * k;
			const os = this.off[o + 2] + (this._os[i] - this.off[o + 2]) * k;
			if (Math.abs(a - this.alpha[i]) > 1e-3 || Math.abs(h - this.hi[i]) > 1e-3 || Math.abs(ox - this.off[o]) + Math.abs(oy - this.off[o + 1]) + Math.abs(os - this.off[o + 2]) > 1e-3) {
				this.alpha[i] = Math.abs(a - w) < 2e-3 ? w : a;
				this.hi[i] = h;
				this.state[i * 2] = this.alpha[i];
				this.state[i * 2 + 1] = this.hi[i];
				this.off[o] = ox;
				this.off[o + 1] = oy;
				this.off[o + 2] = os;
				dirty = true;
			}
			if (this.alpha[i] > 0.01) vis++;
		}
		this.visibleCount = vis;
		this.mesh.visible = vis > 0;
		if (dirty) {
			this.aState.needsUpdate = true;
			this.aOff.needsUpdate = true;
		}
	}

	/**
	 * Ekran izdüşümü + açgözlü çakışma elemesi (öncelik sırasıyla). Genel kipte ad, ilin ekrandaki
	 * büyüklüğü önemine göre yeterliyse aday olur; liste kipinde hepsi görünür, çakışan küçülüp kayar.
	 */
	_cull(camera) {
		const N = this.N;
		const res = this.uniforms.uRes.value;
		const dpr = this.uniforms.uDpr.value;
		const m = this._m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		const e = m.elements;
		const p11 = camera.projectionMatrix.elements[5];
		const list = this.mode === 'list';
		const B = this.board;
		for (let i = 0; i < N; i++) {
			const x = this.pos[i * 3];
			const y = this.pos[i * 3 + 1];
			const z = this.pos[i * 3 + 2];
			const cx = e[0] * x + e[4] * y + e[8] * z + e[12];
			const cy = e[1] * x + e[5] * y + e[9] * z + e[13];
			const cw = e[3] * x + e[7] * y + e[11] * z + e[15];
			const w = Math.max(cw, 1e-3);
			this._sx[i] = ((cx / w) * 0.5 + 0.5) * res.x;
			this._sy[i] = ((cy / w) * 0.5 + 0.5) * res.y;
			const ppu = (res.y * p11 * 0.5) / w;
			this._pp[i] = ppu;
			const h = (list ? 21 : 17) * dpr;
			this._sh[i] = h * 0.8 + 3 * dpr;
			this._sw[i] = h * this.size[i * 3] * 0.94 + 4 * dpr;
			// ekran kenarına kıstır (shader ile aynı): çakışma denetimi gerçek yerle yapılsın
			const hx = (h * this.size[i * 3]) / 2 + 6 * dpr;
			const hy = h / 2 + 6 * dpr;
			const sx0 = this._sx[i];
			const sy0 = this._sy[i];
			this._sx[i] = Math.min(res.x - hx, Math.max(hx, sx0));
			this._sy[i] = Math.min(res.y - hy, Math.max(hy, sy0));
			this._far[i] = Math.max(Math.abs(sx0 - this._sx[i]), Math.abs(sy0 - this._sy[i])) > 30 * dpr ? 1 : 0;
			this._ok[i] = 0;
			this._ox[i] = 0;
			this._oy[i] = 0;
			this._os[i] = 1;
		}
		const ord = this.order;
		let n = 0;
		const acc = this._acc;
		for (let a = 0; a < N; a++) {
			const i = ord[a];
			if (list ? !this.forced[i] : B.dimTo[i] > 0.5) continue;
			let sx = this._sx[i];
			let sy = this._sy[i];
			if (this._far[i]) continue; // ekranın çok dışında

			if (!list) {
				// önem eşiği: büyük şehirler hep aday; diğerleri ancak ekranda yeterince büyükse
				const rk = this.rank[i];
				const rpx = this._pp[i] * this.inner[i];
				const need = (rk === 0 ? 0 : rk === 1 ? 26 : 40) * dpr;
				if (rpx < need) continue;
			}
			let ok = true;
			for (let tries = 0; tries < (list ? 6 : 1); tries++) {
				ok = true;
				for (let b = 0; b < n; b++) {
					const j = acc[b];
					const ox = Math.abs(sx - (this._sx[j] + this._ox[j] * dpr));
					const oy = Math.abs(sy - (this._sy[j] + this._oy[j] * dpr));
					if (ox * 2 < this._sw[i] + this._sw[j] && oy * 2 < this._sh[i] + this._sh[j]) {
						ok = false;
						if (list) {
							// seçim yazısı hep okunur: biraz küçül, çakıştığı yazının altına/üstüne kay
							this._os[i] = 0.88;
							this._sw[i] *= 0.95;
							const dir = sy <= this._sy[j] + this._oy[j] * dpr ? -1 : 1;
							const need = ((this._sh[i] + this._sh[j]) / 2 - oy + 2 * dpr) * dir;
							sy += need;
						}
						break;
					}
				}
				if (ok || !list) break;
			}
			if (!ok && !list) continue;
			if (list) this._oy[i] = (sy - this._sy[i]) / dpr; // kırpma uzayında y yukarı
			this._ok[i] = 1;
			acc[n++] = i;
		}
	}
}
