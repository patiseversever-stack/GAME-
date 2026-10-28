// İl adları: haritanın üstünde, her zaman okunur 3D yazı katmanı. Tek çizim çağrısı.
//
// - Yazılar bir kez tuvale çizilir (yazı atlası). Kanallar: r = dolgu, g = dolgu + kalın kontur.
//   Shader konturu sahibin koyu rengiyle boyar; g kanalının bulanık mip düzeyi yumuşak gölge/hale verir.
// - Her il bir örnek (instance): dünya noktası ekrana izdüşer, yazı ekrana paralel durur (bulanıklaşmaz).
// - Boyut ölçeğe duyarlı: ilin ekrandaki büyüklüğüyle orantılı, ama piksel olarak alt-üst sınırlı.
// - 'all' kipinde çakışan yazılar elenir (büyük il ve vurgulu il önce); seçim listesindekiler hep görünür.
// - Kamera her çizimde onBeforeRender ile gelir: uygulamanın çizim döngüsüne dokunmak gerekmez.

import * as THREE from 'three';
import { PROV } from '../gfx/shaderlib.js';

// büyük şehirler (plaka): genel bakışta yalnızca bunlar (önem sırasıyla)
const MAJOR = [34, 6, 35, 16, 7, 42, 1, 61, 25, 21, 65, 55, 27];
const SECOND = [38, 26, 33, 63, 44, 58, 20, 41, 10, 45, 9, 48, 52, 36, 46, 23];

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
varying float vA;
varying float vHi;
varying vec4 vOwn;
void main() {
	float pid = iSize.z;
	vec4 fx = provRow(pid, 3);
	vOwn = provRow(pid, 0);
	vec3 p = iPos;
	p.y += fx.x * uPLift + fx.z * uPSel;
	vec4 c = projectionMatrix * viewMatrix * vec4(p, 1.0);
	// bu derinlikte 1 dünya birimi kaç cihaz pikseli
	float ppu = uRes.y * projectionMatrix[1][1] * 0.5 / max(c.w, 1e-3);
	float hi = iState.y;
	// sade ve tutarlı boy: genel bakışta küçük, seçimde okunur
	float minPx = mix(10.0, 15.0, hi) * uDpr;
	float maxPx = mix(14.0, 19.0, hi) * uDpr;
	float h = clamp(ppu * iSize.y * 0.8, minPx, maxPx) * iOff.z;
	vec2 off = corner * vec2(h * iSize.x, h) + iOff.xy * uDpr;
	c.xy += off / uRes.xy * 2.0 * c.w;
	gl_Position = c;
	vUv = mix(iRect.xy, iRect.zw, corner + 0.5);
	vA = iState.x;
	vHi = hi;
}`;

const FS = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying float vA;
varying float vHi;
varying vec4 vOwn;
void main() {
	vec4 t = texture(uAtlas, vUv);
	float glow = texture(uAtlas, vUv, 2.6).g;
	float fill = t.r;
	float edge = t.g;
	// sahipli il: kontur sahibin koyu rengi; tarafsız: gece mavisi
	vec3 own = pow(max(vOwn.rgb, 0.0), vec3(1.0 / 2.2));
	vec3 outC = vOwn.w >= 0.0 ? own * 0.42 : vec3(0.07, 0.1, 0.22);
	vec3 col = mix(outC, vec3(1.0), clamp(fill / max(edge, 1e-3), 0.0, 1.0));
	// alt hale: vurguluda altın ışıltı, değilse yumuşak gölge
	vec3 gc = mix(vec3(0.02, 0.03, 0.08), vec3(1.0, 0.82, 0.32), vHi);
	float ga = glow * mix(0.55, 0.95, vHi);
	float A = edge + ga * (1.0 - edge);
	vec3 c = (col * edge + gc * ga * (1.0 - edge)) / max(A, 1e-3);
	gl_FragColor = vec4(c, A * vA);
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
		this._draw("'Lilita One', 'Fredoka', system-ui, sans-serif");
		// gömülü yazı tipi yüklenince atlası yeniden çiz (yalnızca doku güncellenir, shader değil)
		try {
			document.fonts?.load("400 56px 'Lilita One'").then(() => {
				this._draw("'Lilita One', 'Fredoka', system-ui, sans-serif");
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
		this._v = new THREE.Vector3();
		this._m = new THREE.Matrix4();
		this._frame = 0;
		this._t = -1;
		this.visibleCount = 0;
	}

	_draw(font) {
		const c = this.canvas;
		const g = c.getContext('2d');
		g.fillStyle = '#000';
		g.fillRect(0, 0, c.width, c.height);
		const names = this.board.provinces.map((p) => p.name.toLocaleUpperCase('tr-TR'));
		let fs = 58;
		let layout = null;
		// yerleşim: sığana kadar yazı boyunu küçült
		for (; fs > 24; fs -= 4) {
			g.font = `400 ${fs}px ${font}`;
			const pad = Math.ceil(fs * 0.34);
			const rowH = Math.ceil(fs * 1.32) + pad;
			let x = 0;
			let y = 0;
			const out = [];
			let ok = true;
			for (const n of names) {
				const w = Math.ceil(g.measureText(n).width) + pad * 2;
				if (x + w > c.width) {
					x = 0;
					y += rowH;
				}
				if (y + rowH > c.height) {
					ok = false;
					break;
				}
				out.push([x, y, w, rowH, pad]);
				x += w;
			}
			if (ok) {
				layout = out;
				break;
			}
		}
		g.font = `400 ${fs}px ${font}`;
		g.textBaseline = 'middle';
		g.textAlign = 'center';
		g.lineJoin = 'round';
		g.miterLimit = 2;
		const lw = Math.max(6, fs * 0.24);
		names.forEach((n, i) => {
			const [x, y, w, h] = layout[i];
			const cx = x + w / 2;
			const cy = y + h / 2 + fs * 0.04;
			g.lineWidth = lw;
			g.strokeStyle = '#00ff00';
			g.strokeText(n, cx, cy);
			g.fillStyle = '#ffff00';
			g.fillText(n, cx, cy);
			// atlas UV (CanvasTexture flipY: v aşağıdan yukarı)
			const W = c.width;
			const H = c.height;
			this.rect.set([x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H], i * 4);
			this.size[i * 3] = w / h;
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
			const lo = (list ? 15 : 10) * dpr;
			const hi = (list ? 19 : 14) * dpr;
			const h = Math.min(hi, Math.max(lo, ppu * this.size[i * 3 + 1] * 0.8));
			this._sh[i] = h * 0.82 + 2 * dpr;
			this._sw[i] = h * this.size[i * 3] * 0.82 + 3 * dpr;
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
			if (sx < -40 || sy < -40 || sx > res.x + 40 || sy > res.y + 40) continue;
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
