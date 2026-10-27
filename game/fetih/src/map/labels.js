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

const VS = /* glsl */ `
${PROV}
attribute vec2 corner;     // -0.5..0.5
attribute vec3 iPos;       // dinlenme konumu (yükselme shader'da eklenir)
attribute vec4 iRect;      // atlas: u0, v0, u1, v1
attribute vec3 iSize;      // en/boy oranı, dünya boyu, il kimliği
attribute vec2 iState;     // görünürlük (0..1), vurgu (0..1)
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
	float minPx = mix(11.0, 16.0, hi) * uDpr;
	float maxPx = mix(19.0, 27.0, hi) * uDpr;
	float h = clamp(ppu * iSize.y * mix(1.0, 1.25, hi), minPx, maxPx);
	// vurgu: hafif zıplama
	h *= 1.0 + hi * 0.05 * sin(uTime * 5.0 + pid);
	vec2 off = corner * vec2(h * iSize.x, h);
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
		this.mesh.onBeforeRender = (renderer, scene, camera) => this._before(renderer, camera);

		// kip ve canlandırma durumu
		this.mode = null; // null | 'all' | 'list'
		this.forced = new Uint8Array(N);
		this.want = new Float32Array(N);
		this.alpha = new Float32Array(N);
		this.hi = new Float32Array(N);
		this.hiTo = new Float32Array(N);
		this.order = board.provinces.map((p) => p.index).sort((a, b) => board.provinces[b].area - board.provinces[a].area);
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

	/** null: hepsini gizle; 'all': hepsi (çakışan elenir); dizi: yalnızca bu iller, vurgulu. */
	show(list) {
		this.forced.fill(0);
		this.hiTo.fill(0);
		if (list === 'all') this.mode = 'all';
		else if (Array.isArray(list) && list.length) {
			this.mode = 'list';
			for (const i of list) {
				this.forced[i] = 1;
				this.hiTo[i] = 1;
			}
		} else this.mode = null;
		this._frame = 0; // bir sonraki çizimde hemen yeniden değerlendir
	}

	_before(renderer, camera) {
		this.uniforms.uDpr.value = renderer.getPixelRatio();
		if (this._cam !== camera) {
			this._cam = camera;
			this._frame = 0;
		}
	}

	/** Her kare (board.update): görünürlük ve vurgu yumuşakça değişir; 'all' kipinde çakışma elemesi. */
	update(dt) {
		if (this.mode === 'all' && this._cam && this._frame % 6 === 0) this._cull(this._cam);
		this._frame++;
		const N = this.N;
		const k = 1 - Math.exp(-10 * dt);
		let dirty = false;
		let vis = 0;
		for (let i = 0; i < N; i++) {
			let w = 0;
			if (this.mode === 'list') w = this.forced[i];
			else if (this.mode === 'all') w = this._ok[i];
			this.want[i] = w;
			const a = this.alpha[i] + (w - this.alpha[i]) * k;
			const h = this.hi[i] + (this.hiTo[i] - this.hi[i]) * k;
			if (Math.abs(a - this.alpha[i]) > 1e-3 || Math.abs(h - this.hi[i]) > 1e-3) {
				this.alpha[i] = Math.abs(a - w) < 2e-3 ? w : a;
				this.hi[i] = h;
				this.state[i * 2] = this.alpha[i];
				this.state[i * 2 + 1] = this.hi[i];
				dirty = true;
			}
			if (this.alpha[i] > 0.01) vis++;
		}
		this.visibleCount = vis;
		this.mesh.visible = true;
		if (dirty) this.aState.needsUpdate = true;
	}

	/** Ekranda çakışan yazıları ele (büyük iller önce). */
	_cull(camera) {
		const N = this.N;
		const res = this.uniforms.uRes.value;
		const dpr = this.uniforms.uDpr.value;
		const m = this._m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		const e = m.elements;
		const p11 = camera.projectionMatrix.elements[5];
		for (let i = 0; i < N; i++) {
			const x = this.pos[i * 3];
			const y = this.pos[i * 3 + 1];
			const z = this.pos[i * 3 + 2];
			const cx = e[0] * x + e[4] * y + e[8] * z + e[12];
			const cy = e[1] * x + e[5] * y + e[9] * z + e[13];
			const cw = e[3] * x + e[7] * y + e[11] * z + e[15];
			const w = Math.max(cw, 1e-3);
			this._sx[i] = (cx / w * 0.5 + 0.5) * res.x;
			this._sy[i] = (cy / w * 0.5 + 0.5) * res.y;
			const ppu = (res.y * p11 * 0.5) / w;
			const h = Math.min(19 * dpr, Math.max(11 * dpr, ppu * this.size[i * 3 + 1]));
			this._sh[i] = h * 0.8;
			this._sw[i] = h * this.size[i * 3] * 0.86;
			this._ok[i] = 0;
		}
		const ord = this.order;
		for (let a = 0; a < N; a++) {
			const i = ord[a];
			const sx = this._sx[i];
			const sy = this._sy[i];
			if (sx < -50 || sy < -50 || sx > res.x + 50 || sy > res.y + 50) continue;
			let free = true;
			for (let b = 0; b < a && free; b++) {
				const j = ord[b];
				if (!this._ok[j]) continue;
				if (Math.abs(sx - this._sx[j]) * 2 < this._sw[i] + this._sw[j] && Math.abs(sy - this._sy[j]) * 2 < this._sh[i] + this._sh[j]) free = false;
			}
			if (free) this._ok[i] = 1;
		}
	}
}
