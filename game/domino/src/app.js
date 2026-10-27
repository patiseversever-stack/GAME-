// Domino Şehri uygulaması: çizici, ortam, gölge, şehir, taşlar, kamera, oyun, arayüz, ses.
//
// Pil ve akıcılık kuralları:
// - Kareler ekran yenilemesine göre eşit aralıkla çizilir (Governor), boşa kare yok.
// - Başlık ekranında 30 kare.
// - Bütün shader'lar açılışta derlenir; oyun sırasında hiçbir malzeme ya da hedef kurulmaz.
// - Taşların yalnızca hareket edenlerinin açısı güncellenir.
// - Sekme gizlenince döngü durur.

import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { Governor } from './core/quality.js';
import { createGlobals, ENVS, applyEnv } from './gfx/env.js';
import { ShadowSystem } from './gfx/shadow.js';
import { Dominoes } from './domino/dominoes.js';
import { buildCity } from './world/city.js';
import { Director } from './game/camera.js';
import { Ghosts, Puffs } from './game/fx.js';
import { Game } from './game/play.js';
import { UI } from './ui/ui.js';
import { Sfx } from './audio/sfx.js';

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
		this.gov.onBattery = (on) => this.ui?.pop?.(on ? 'Pil koruma açık' : 'Pil koruma kapandı', innerWidth / 2, innerHeight * 0.3, 'ok');

		const G = createGlobals();
		this.G = G;
		applyEnv(G, ENVS.ogle);
		this.shadow = new ShadowSystem(G, R.tier.shadowSize, R.tier.shadowHalf);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(42, 1, 0.3, 900);
		this.director = new Director(this.camera);

		this.dominoes = new Dominoes(G, 6000, R.tier);
		this.ghosts = new Ghosts(G);
		this.puffs = new Puffs(G, R.tier.particles);
		this.scene.add(this.dominoes.mesh, this.ghosts.mesh, this.ghosts.ring, this.puffs.mesh);
		this.shadow.add(this.dominoes.shadowMesh);

		this.sfx = new Sfx(this.hooks);
		this.ui = new UI(this.container, { action: (a) => this.game.action(a) });
		this.game = new Game(this);

		this._ray = new THREE.Raycaster();
		this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		this._hit = new THREE.Vector3();
		this._ndc = new THREE.Vector2();
		this._down = null;
		canvas.addEventListener('pointerdown', (e) => {
			this.sfx.unlock();
			this._down = { x: e.clientX, y: e.clientY, t: performance.now() };
		});
		canvas.addEventListener('pointerup', (e) => {
			const d = this._down;
			this._down = null;
			if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 24) return;
			const p = this.groundAt(e.clientX, e.clientY);
			if (p) this.game.tap(p.x, p.z);
		});

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

		this.loadLevel(0, false);
		this.resize();
		try {
			await this.renderer.compileAsync(this.scene, this.camera);
		} catch (e) {
			this.renderer.compile(this.scene, this.camera);
		}
		this.director.update(1 / 60, this.game.front, this.game.frontYaw);
		this.render();
	}

	/** Bölümü kurar: zincir, sonra çevresindeki şehir (yollar zincirden çıkar). */
	loadLevel(i, play) {
		const { level, roads } = this.game.setup(i);
		if (this.city) {
			this.scene.remove(this.city.group);
			for (const c of this.city.casters) this.shadow.scene.remove(c);
		}
		if (!this.city || this._cityId !== level.id) {
			this.city = buildCity(this.G, this.tier, level, roads);
			this._cityId = level.id;
		}
		this.scene.add(this.city.group);
		for (const c of this.city.casters) this.shadow.add(c);
		applyEnv(this.G, ENVS[level.env] || ENVS.ogle);
		if (play) {
			this.ui.title(false);
			this.game.ready();
		} else {
			this.director.mode = 'orbit';
			this.ui.title(true);
		}
	}

	groundAt(cx, cy) {
		const r = this.canvas.getBoundingClientRect();
		this._ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
		this._ray.setFromCamera(this._ndc, this.camera);
		return this._ray.ray.intersectPlane(this._plane, this._hit);
	}

	resize() {
		const w = Math.max(1, this.container.clientWidth || window.innerWidth);
		const h = Math.max(1, this.container.clientHeight || window.innerHeight);
		const pr = this.gov.pixelRatio(w, h);
		this.renderer.setPixelRatio(pr);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		// dikey ekranda biraz daha geniş görüş
		this.camera.fov = w < h ? 50 : 40;
		this.camera.updateProjectionMatrix();
		this.director.setAspect(w / h);
		this.G.uRes.value.x = Math.round(w * pr);
		this.G.uRes.value.y = Math.round(h * pr);
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
			this.gov.menu = this.game.state === 'title' || this.director.mode === 'orbit';
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
		this.game.update(dt);
		this.puffs.update(dt);
		this.director.update(dt, this.game.front, this.game.frontYaw);
		if (draw) this.render();
	}

	render() {
		const r = this.renderer;
		// gölge haritası kameranın baktığı yere ortalanır
		const look = this.director.look;
		this.shadow.place(look, this.G.uSunDir.value);
		this.shadow.render(r);
		r.setRenderTarget(null);
		r.clear();
		r.render(this.scene, this.camera);
	}

	// ---------------------------------------------------------------- geliştirme yardımcıları

	stats() {
		const i = this.renderer.info;
		return { calls: i.render.calls, tris: i.render.triangles, programs: i.programs?.length ?? 0, tier: this.tier.id, dominoes: this.dominoes.n, toppled: this.dominoes.toppled };
	}

	/**
	 * Bölümü sabit adımla oynat: boşlukları "mükemmel" anda doldurur (perfect) ya da hiç
	 * doldurmaz. seconds sonra durur ve çizer. Ekran görüntüsü ve denge testi için.
	 */
	debugRun({ level = 0, seconds = 3, fill = 'perfect', fps = 60, camera = null } = {}) {
		this.ui.title(false);
		this.loadLevel(level, true);
		const dt = 1 / fps;
		let t = 0;
		this.game.start();
		while (t < seconds) {
			if (fill !== 'none')
				for (const s of this.game.slots) if (s.state === 'empty' && s.eta < (fill === 'perfect' ? 0.5 : 2.5)) this.game._fill(s);
			this.frame(dt, false);
			t += dt;
		}
		if (camera) {
			this.director.mode = 'free';
			this.camera.position.set(...camera.pos);
			this.camera.lookAt(new THREE.Vector3(...camera.look));
			this.camera.updateMatrixWorld();
			this.director.look.set(...camera.look);
		}
		this.render();
		return { state: this.game.state, toppled: this.dominoes.toppled, total: this.game.total, active: this.dominoes.nActive, slots: this.game.slots.map((s) => s.state).join(',') };
	}

	/** Kamerayı serbest konuma al ve çiz. */
	debugCam(pos, look) {
		this.director.mode = 'free';
		this.camera.position.set(...pos);
		this.camera.lookAt(new THREE.Vector3(...look));
		this.camera.updateMatrixWorld();
		this.director.look.set(...look);
		this.render();
		return true;
	}

	destroy() {
		this.stop();
		window.removeEventListener('resize', this._onResize);
		document.removeEventListener('visibilitychange', this._onVis);
		this.shadow.dispose();
		this.renderer.dispose();
	}
}
