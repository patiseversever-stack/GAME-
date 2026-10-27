// Fetih Ligi uygulaması: çizici, ortam, gölge, harita, süsler, kaleler, kamera, oyun, arayüz, ses.
//
// Pil ve akıcılık kuralları:
// - Kareler ekran yenilemesine göre eşit aralıkla çizilir (Governor), boşa kare yok.
// - Menülerde ve soru ekranlarında 30 kare (harita arkada ağır akar).
// - Bütün shader'lar açılışta derlenir; oyun sırasında malzeme ya da hedef kurulmaz.
// - İl durumu (sahip, yükselme, parlama) küçük bir veri dokusunda; fetih geometriye dokunmaz.

import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { Governor } from './core/quality.js';
import { createGlobals, ENVS, applyEnv } from './gfx/env.js';
import { ShadowSystem } from './gfx/shadow.js';
import { TiltShift } from './gfx/post.js';
import { Board } from './map/board.js';
import { Props } from './map/props.js';
import { Castle } from './map/castle.js';
import { MapCamera } from './game/camera.js';
import { COMMON, FINISH } from './gfx/shaderlib.js';
import { Cinema } from './game/cinema.js';
import { Match } from './game/match.js';
import { UI } from './ui/ui.js';
import { Sfx } from './audio/sfx.js';

const SKY_VS = /* glsl */ `
varying vec3 vD;
void main() {
	vD = position;
	vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
	gl_Position = p.xyww;
}`;
const SKY_FS = /* glsl */ `
${COMMON}
${FINISH}
uniform vec3 uZenith, uHorizon, uSunGlow;
varying vec3 vD;
void main() {
	vec3 d = normalize(vD);
	float h = max(d.y, 0.0);
	vec3 c = mix(uHorizon, uZenith, pow(h, 0.5));
	float s = max(dot(d, uSunDir), 0.0);
	c += uSunGlow * pow(s, 10.0) * 0.4;
	gl_FragColor = finish(c, 1.0);
}`;

export const PLAYER_COLORS = [0xff4d4d, 0x3d7dff, 0xffc12e, 0xa55bff];

export class App {
	constructor({ container, store, hooks = {}, quality = 'auto', power = 'auto' }) {
		this.container = container;
		this.store = store;
		this.hooks = hooks;
		this.qualityOpt = quality;
		this.power = power;
		this.running = false;
		this.visible = true;
		this.time = 0;
		this._raf = 0;
		this._prev = 0;
		this.V3 = THREE.Vector3;
	}

	async init() {
		const canvas = document.createElement('canvas');
		canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
		this.container.appendChild(canvas);
		this.canvas = canvas;

		const saved = this.store.get('settings') || {};
		const qOpt = this.qualityOpt !== 'auto' ? this.qualityOpt : saved.quality ?? 'auto';
		const R = createRenderer(canvas, qOpt === 'auto' ? null : Number(qOpt));
		this.renderer = R.renderer;
		this.renderer.autoClear = false;
		this.tier = R.tier;
		this.info = R;
		this.gov = new Governor({ tier: R.tier.id, gpu: R.gpu, store: this.store, power: saved.power || this.power });
		this.gov.onScale = () => this.resize();

		const G = createGlobals();
		this.G = G;
		const C = (h, k = 1) => new THREE.Color(h).multiplyScalar(k);
		const env = {
			...ENVS.ogle,
			sunAz: 118,
			sunEl: 50,
			sun: C('#fff0d6', 3.1),
			skyTop: C('#86b4ff', 0.46),
			skyHor: C('#b9dcff', 0.42),
			ground: C('#ffd2a0', 0.3),
			shade: C('#aab8ff', 1),
			fog: C('#cfe6ff'),
			fogP: [0.0024, 95, 0.02, 8],
			grade: [1.3, 1.12, 0.96],
			vignette: 0.3,
		};
		applyEnv(G, ENVS.harita || env);
		this.shadow = new ShadowSystem(G, R.tier.shadowSize, R.tier.shadowHalf);
		this.post = new TiltShift(this.renderer, R.tier);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(32, 1, 1, 1500);
		this.cam = new MapCamera(this.camera);

		this.board = new Board(G, R.tier, this.renderer);
		this.scene.add(this.board.group);
		this.shadow.add(this.board.shadowMesh);
		this.props = new Props(G, R.tier, this.board);
		this.scene.add(this.props.group);
		for (const c of this.props.casters) this.shadow.add(c);

		const sky = new THREE.Mesh(
			new THREE.SphereGeometry(900, 32, 16),
			new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: { ...G }, side: THREE.BackSide, depthWrite: false }),
		);
		sky.renderOrder = 20; // en son: yalnızca boş kalan pikseller (deniz ufka kadar örttüğü için çoğu kez hiç)
		sky.frustumCulled = false;
		this.scene.add(sky);

		// kaleler (en çok 4 oyuncu): açılışta kurulur, kullanılmayan gizlenir
		this.castles = PLAYER_COLORS.map((c, i) => {
			const k = new Castle(G, R.tier, i, c);
			k.group.visible = false;
			this.scene.add(k.group);
			for (const s of k.casters) this.shadow.add(s);
			return k;
		});

		this.playerColors = PLAYER_COLORS;
		this.cinema = new Cinema(this);
		this.sfx = new Sfx(this.hooks);
		this.ui = new UI(this.container, this, { start: (cfg) => this.startMatch(cfg) });
		this.lowFps = true;

		this._onResize = () => this.resize();
		window.addEventListener('resize', this._onResize);
		this._onVis = () => {
			this.visible = document.visibilityState === 'visible';
			if (this.visible && this.running) {
				this.gov.reset();
				this._prev = 0;
				this._loop();
			}
		};
		document.addEventListener('visibilitychange', this._onVis);
		this._bindInput();
		this.resize();
		// derleme: bütün malzemeler sahnede (kaleler dahil) görünür haldeyken
		for (const k of this.castles) k.group.visible = true;
		try {
			await this.renderer.compileAsync(this.scene, this.camera);
		} catch (e) {
			this.renderer.compile(this.scene, this.camera);
		}
		for (const k of this.castles) k.group.visible = false;
		this.cam.update(1 / 60);
		this.render();
	}

	_bindInput() {
		const c = this.canvas;
		const pts = new Map();
		let pinch = 0;
		c.addEventListener('pointerdown', (e) => {
			this.sfx.unlock();
			pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() });
			try {
				c.setPointerCapture(e.pointerId);
			} catch (err) {
				/* desteklenmiyor */
			}
		});
		c.addEventListener('pointermove', (e) => {
			const p = pts.get(e.pointerId);
			if (!p) return;
			if (pts.size === 2) {
				const [a, b] = [...pts.values()];
				const d0 = Math.hypot(a.x - b.x, a.y - b.y);
				p.x = e.clientX;
				p.y = e.clientY;
				const d1 = Math.hypot(a.x - b.x, a.y - b.y);
				if (pinch && d0 > 0) this.cam.zoom(d0 / d1);
				pinch = 1;
				return;
			}
			if (this.inputLocked) return;
			this.cam.pan(e.clientX - p.x, e.clientY - p.y, c.clientHeight);
			p.x = e.clientX;
			p.y = e.clientY;
		});
		const up = (e) => {
			const p = pts.get(e.pointerId);
			pts.delete(e.pointerId);
			if (pts.size < 2) pinch = 0;
			if (!p) return;
			const moved = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
			if (moved < 12 && performance.now() - p.t < 400) {
				const idx = this.pickAt(e.clientX, e.clientY);
				this.onGround?.({ x: this._hit.x, z: this._hit.z });
				this.onTap?.(idx, e.clientX, e.clientY);
			}
		};
		c.addEventListener('pointerup', up);
		c.addEventListener('pointercancel', up);
		c.addEventListener('wheel', (e) => this.cam.zoom(e.deltaY > 0 ? 1.1 : 0.9), { passive: true });
		this._ray = new THREE.Raycaster();
		this._ndc = new THREE.Vector2();
		this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.board.top);
		this._hit = new THREE.Vector3();
	}

	/** Ekran noktasındaki il (yoksa -1). */
	pickAt(cx, cy) {
		const r = this.canvas.getBoundingClientRect();
		this._ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
		this._ray.setFromCamera(this._ndc, this.camera);
		if (this.board.raycast) return this.board.raycast(this._ray.ray, this._hit); // kabartmalı arazide doğru il
		if (!this._ray.ray.intersectPlane(this._plane, this._hit)) return -1;
		return this.board.pick(this._hit.x, this._hit.z);
	}

	/** Dünya noktası → ekran (css piksel). */
	toScreen(v, out = { x: 0, y: 0 }) {
		const p = this._sv || (this._sv = new THREE.Vector3());
		p.copy(v).project(this.camera);
		const r = this.canvas.getBoundingClientRect();
		out.x = (p.x * 0.5 + 0.5) * r.width;
		out.y = (-p.y * 0.5 + 0.5) * r.height;
		out.behind = p.z > 1;
		return out;
	}

	resize() {
		const w = Math.max(1, this.container.clientWidth || window.innerWidth);
		const h = Math.max(1, this.container.clientHeight || window.innerHeight);
		const pr = this.gov.pixelRatio(w, h);
		this.renderer.setPixelRatio(pr);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.fov = w < h ? 40 : 30;
		this.camera.updateProjectionMatrix();
		this.cam.setAspect(w / h);
		this.G.uRes.value.x = Math.round(w * pr);
		this.G.uRes.value.y = Math.round(h * pr);
		this.post?.setSize(this.G.uRes.value.x, this.G.uRes.value.y);
	}

	start() {
		if (this.running) return;
		this.running = true;
		this._prev = 0;
		this._loop();
	}

	stop() {
		this.running = false;
		cancelAnimationFrame(this._raf);
	}

	_loop() {
		cancelAnimationFrame(this._raf);
		const step = (now) => {
			if (!this.running || !this.visible) return;
			this._raf = requestAnimationFrame(step);
			const rafDelta = this._prevRaf ? now - this._prevRaf : 16.7;
			this._prevRaf = now;
			this.gov.menu = !!this.lowFps;
			if (!this.gov.tick(now, rafDelta)) return;
			const dt = this._prev ? Math.min(0.05, (now - this._prev) / 1000) : 1 / 60;
			this._prev = now;
			this.frame(dt);
		};
		this._prevRaf = 0;
		this._raf = requestAnimationFrame(step);
	}

	frame(dt, draw = true) {
		this.time += dt;
		this.G.uTime.value = this.time;
		this.game?.update(dt);
		this.board.update(dt);
		for (const k of this.castles) if (k.group.visible) k.update(dt);
		this.cam.update(dt);
		if (draw) {
			this.ui.update();
			this.render();
		}
	}

	render() {
		const r = this.renderer;
		this.shadow.place(this.cam.target, this.G.uSunDir.value, this.cam.dist);
		this.shadow.render(r);
		if (this.post?.render(r, this.scene, this.camera)) return;
		r.setRenderTarget(null);
		r.clear();
		r.render(this.scene, this.camera);
	}

	// ---------------------------------------------------------------- maç

	resetBoard() {
		const b = this.board;
		for (const p of b.provinces) b.setOwner(p.index, -1, null);
		b.clearFx();
		for (const k of this.castles) {
			k.group.visible = false;
			k.repair();
		}
	}

	async startMatch(cfg) {
		this.resetBoard();
		this.ui.title(false);
		this.lowFps = false;
		this.game = null;
		const m = new Match(this, this.ui, cfg);
		this.match = m;
		await m.run();
		this.lowFps = true;
	}

	// ---------------------------------------------------------------- geliştirme yardımcıları

	/** Bütün oyuncular bot, arayüz ve sinema anında: maçı baştan sona oynat (denge testi). */
	async debugSim(cfg = {}) {
		this.ui.fast = true;
		this.cinema.fast = true;
		this.resetBoard();
		const m = new Match(this, this.ui, { mode: 'ffa3', length: 'quick', region: 'ege', bot: 'er', ...cfg, allBots: true });
		const r = await m.run();
		this.ui.fast = false;
		this.cinema.fast = false;
		return { winner: (r[0].players ? r[0].players.map((p) => p.name).join('&') : r[0].name), scores: m.players.map((p) => [p.name, p.score, p.alive]), used: m.used.size };
	}

	/** Maçı belli bir ana kadar hızlı oynat, sonra o anı gerçek arayüzle göster (ekran görüntüsü). */
	async debugScene({ cfg = {}, show = 'question', type = 'choice', cat = 'tarih', seconds = 1.2 } = {}) {
		this.ui.title(false);
		this.ui.fast = true;
		this.cinema.fast = true;
		this.resetBoard();
		const m = new Match(this, this.ui, { mode: 'ffa3', length: 'quick', region: 'ege', bot: 'er', ...cfg });
		this.match = m;
		for (const i of m.map) m.setOwner(i, -1, 0);
		await m.placeCapitals();
		while (m.free().length) await m.expansionRound(1);
		this.ui.fast = false;
		this.cinema.fast = false;
		this.lowFps = false;
		const p = m.players[0];
		const d = m.players[1];
		if (show === 'question') {
			const q = m.pick({ cat, types: [type] });
			const target = m.owned(d.i)[0];
			this.board.fx(target, 0.35, 1);
			const T = (await import('./quiz/types.js')).TYPES[q.type];
			const v = T.prepare(q, m.R);
			m.ui.question(m, { q, v, T, who: [p, d], bots: [{ p: d, ...T.bot(v, d.skill, m.R) }], human: p, attacker: p, defender: d, target, cat: q.cat });
		} else if (show === 'wheel') {
			m.ui.wheel(m, m.players[1]);
		}
		const dt = 1 / 30;
		const t0 = performance.now();
		while (performance.now() - t0 < seconds * 1000) {
			this.frame(dt, false);
			await new Promise((r) => setTimeout(r, 30));
		}
		this.ui.update();
		this.render();
		return this.stats();
	}


	stats() {
		const i = this.renderer.info;
		return { calls: i.render.calls, tris: i.render.triangles, programs: i.programs?.length ?? 0, tier: this.tier.id, props: this.props.counts };
	}

	/** Haritayı belirli bir görünümle çiz: owners [[il, oyuncu]], castles [[oyuncu, il]], region. */
	debugView({ owners = [], castles = [], region = null, focus = null, glow = [], seconds = 1.5 } = {}) {
		const b = this.board;
		for (const [pid, o] of owners) b.setOwner(b.byId.get(pid).index, o, PLAYER_COLORS[o]);
		for (const [o, pid] of castles) {
			const k = this.castles[o];
			k.group.visible = true;
			k.place(b.topAt(b.byId.get(pid).index, new THREE.Vector3()));
		}
		for (const pid of glow) b.fx(b.byId.get(pid).index, 0.35, 1);
		if (region) {
			const idx = region === 'all' ? b.provinces.map((p) => p.index) : b.region(region);
			this.cam.fit(this.boundsOf(idx));
		} else if (focus) {
			const p = b.byId.get(focus);
			this.cam.focus(p.x, p.z, { dist: 26 });
		}
		const dt = 1 / 30;
		for (let t = 0; t < seconds; t += dt) this.frame(dt, false);
		this.render();
		return this.stats();
	}

	boundsOf(list) {
		const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
		for (const i of list) {
			const p = this.board.provinces[i];
			for (const r of p.rings)
				for (let k = 0; k < r.length; k += 2) {
					b.x0 = Math.min(b.x0, r[k]);
					b.x1 = Math.max(b.x1, r[k]);
					b.z0 = Math.min(b.z0, -r[k + 1]);
					b.z1 = Math.max(b.z1, -r[k + 1]);
				}
		}
		return b;
	}

	destroy() {
		this.stop();
		window.removeEventListener('resize', this._onResize);
		document.removeEventListener('visibilitychange', this._onVis);
		this.shadow.dispose();
		this.renderer.dispose();
	}
}
