// Ebru uygulaması: çizici, akışkan, atölye sahnesi, oyun, arayüz ve kare döngüsü.
//
// Pil ve akıcılık kuralları:
// - Kareler ekran yenilemesine göre eşit aralıkla çizilir (Governor), boşa kare yok.
// - Başlık ekranında 30 kare.
// - Su durulunca akışkan benzetimi uyur: kare başına yalnızca atölye dokusu + su çizilir.
// - Atölye (masa, kâseler) bir kez dokuya çizilir, her karede yeniden hesaplanmaz.
// - Sekme gizlenince döngü durur.

import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { Governor } from './core/quality.js';
import { Fluid } from './sim/fluid.js';
import { waterMaterial } from './gfx/water.js';
import { Backdrop } from './gfx/backdrop.js';
import { Boat, Harbor, Leaves } from './game/objects.js';
import { Game } from './game/play.js';
import { Input } from './game/input.js';
import { UI } from './ui/ui.js';
import { Sfx } from './audio/sfx.js';
import { A } from './game/levels.js';

export class App {
	constructor({ container, store, hooks = {}, quality = 'auto', power = 'auto' }) {
		this.container = container;
		this.store = store;
		this.hooks = hooks;
		this.qualityOpt = quality;
		this.power = power;
		this.A = A;
		this.running = false;
		this.visible = true;
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
		this.gov.onBattery = (on) => this.ui?.toast(on ? 'Pil koruma açık' : 'Pil koruma kapandı');

		this.G = {
			uTime: { value: 0 },
			uRes: { value: new THREE.Vector2(1, 1) },
			uPxPerUnit: { value: 1000 },
		};
		const T = this.tier;
		this.fluid = new Fluid(this.renderer, { aspect: A, simW: T.simW, dyeW: T.dyeW, iters: T.iters, vorticity: T.vorticity });

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
		this.backdrop = new Backdrop(this.G, A, T);
		this.scene.add(this.backdrop.live);

		this.waterMat = waterMaterial(this.fluid, this.G);
		const water = new THREE.Mesh(new THREE.PlaneGeometry(1, A).rotateX(-Math.PI / 2), this.waterMat);
		water.renderOrder = 0;
		this.scene.add(water);
		this.water = water;

		this.boat = new Boat(this.G, A);
		this.harbor = new Harbor(this.G, A);
		this.leaves = new Leaves(this.G, A);
		this.scene.add(this.boat.group, this.harbor.mesh, this.leaves.mesh);

		this.sfx = new Sfx(this.hooks);
		this.ui = new UI(this.container, { action: (a) => this.game.action(a) });
		this.game = new Game(this);
		this.input = new Input(canvas, this);

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
		this.resize();

		// tüm shader'lar açılışta derlenir: oyun sırasında takılma olmasın
		this.game.startLevel(0);
		this.game.state = 'title';
		try {
			await this.renderer.compileAsync(this.scene, this.camera);
		} catch (e) {
			this.renderer.compile(this.scene, this.camera);
		}
		this.fluid.step(1 / 60);
		this.render();
	}

	resize() {
		const w = Math.max(1, this.container.clientWidth || window.innerWidth);
		const h = Math.max(1, this.container.clientHeight || window.innerHeight);
		const pr = this.gov.pixelRatio(w, h);
		this.renderer.setPixelRatio(pr);
		this.renderer.setSize(w, h, false);
		this.G.uRes.value.set(Math.round(w * pr), Math.round(h * pr));
		this._fit(w / h);
		this.backdrop.dirty = true;
	}

	/** Kamerayı tekne ekrana sığacak şekilde yerleştirir (üstte ve altta arayüz payı). */
	_fit(aspect) {
		const cam = this.camera;
		cam.aspect = aspect;
		const tilt = THREE.MathUtils.degToRad(13);
		const look = new THREE.Vector3(0, 0, 0.015);
		const dir = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
		const corners = [
			[-0.56, 0.03, -A / 2 - 0.06],
			[0.56, 0.03, -A / 2 - 0.06],
			[-0.56, 0.03, A / 2 + 0.06],
			[0.56, 0.03, A / 2 + 0.06],
		].map((c) => new THREE.Vector3(...c));
		const v = new THREE.Vector3();
		let lo = 0.5;
		let hi = 12;
		for (let i = 0; i < 28; i++) {
			const d = (lo + hi) / 2;
			cam.position.copy(look).addScaledVector(dir, d);
			cam.lookAt(look);
			cam.updateMatrixWorld();
			cam.updateProjectionMatrix();
			let ok = true;
			for (const c of corners) {
				v.copy(c).project(cam);
				if (Math.abs(v.x) > 0.985 || v.y > 0.8 || v.y < -0.78) ok = false;
			}
			if (ok) hi = d;
			else lo = d;
		}
		cam.position.copy(look).addScaledVector(dir, hi);
		cam.lookAt(look);
		cam.updateMatrixWorld();
		cam.updateProjectionMatrix();
		// damar kalınlığı için: su yüzeyinde bir birimin ekran pikseli
		const a = new THREE.Vector3(-0.05, 0, 0).project(cam);
		const b = new THREE.Vector3(0.05, 0, 0).project(cam);
		this.G.uPxPerUnit.value = (Math.abs(b.x - a.x) / 2) * this.G.uRes.value.x * 10;
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
			this.gov.menu = this.game.state === 'title';
			if (!this.gov.tick(now, rafDelta)) return;
			const dt = this._prev ? Math.min(0.05, (now - this._prev) / 1000) : 1 / 60;
			this._prev = now;
			this.frame(dt);
		};
		this._prevRaf = 0;
		this._raf = requestAnimationFrame(step);
	}

	frame(dt) {
		this.G.uTime.value += dt;
		this.game.update(dt);
		this.sfx.flow(this.fluid.energy);
		this.render();
	}

	render() {
		const r = this.renderer;
		r.setRenderTarget(null);
		r.clear();
		this.backdrop.flatMat.uniforms.uFlicker.value = Math.sin(this.G.uTime.value * 9.1) * 0.5 + Math.sin(this.G.uTime.value * 23.7) * 0.3;
		const sz = r.getDrawingBufferSize(this._sz || (this._sz = new THREE.Vector2()));
		this.backdrop.draw(r, this.camera, sz.x, sz.y);
		r.clearDepth();
		r.render(this.scene, this.camera);
	}

	// ---------------------------------------------------------------- geliştirme yardımcıları

	stats() {
		const i = this.renderer.info;
		return { calls: i.render.calls, tris: i.render.triangles, programs: i.programs?.length ?? 0, tier: this.tier.id, awake: this.fluid.awake };
	}

	/** Bölümü aç ve isteğe bağlı bir dizi hareketi sabit adımla oynat (ekran görüntüsü için). */
	async debugPlay({ level = 0, script = [], seconds = 0, fps = 60 } = {}) {
		this.ui.$.title.classList.add('off');
		this.game.startLevel(level);
		const dt = 1 / fps;
		let t = 0;
		const ops = script.slice().sort((a, b) => a.t - b.t);
		let k = 0;
		const end = Math.max(seconds, ops.length ? ops[ops.length - 1].t + (ops[ops.length - 1].dur || 0) + 0.5 : 0);
		const active = [];
		while (t < end) {
			while (k < ops.length && ops[k].t <= t) active.push({ ...ops[k++], s: 0 });
			for (let i = active.length - 1; i >= 0; i--) {
				const o = active[i];
				if (o.type === 'tap') {
					this.game.tap(o.x, o.y);
					active.splice(i, 1);
					continue;
				}
				// sürükleme: path üzerinde ilerle
				const u0 = o.s / o.dur;
				o.s = Math.min(o.dur, o.s + dt);
				const u1 = o.s / o.dur;
				const p0 = samplePath(o.path, u0);
				const p1 = samplePath(o.path, u1);
				this.game.drag(p0.x, p0.y, p1.x, p1.y, (p1.x - p0.x) / dt, (p1.y - p0.y) / dt);
				if (o.s >= o.dur) active.splice(i, 1);
			}
			this.G.uTime.value += dt;
			this.game.update(dt);
			t += dt;
			// yoklama sonucunu bekle (gerçek oyunda bir iki kare sonra gelir)
			if (this.fluid._probeP) await this.fluid._probeP;
		}
		this.render();
		return { state: this.game.state, boat: [+this.game.boat.x.toFixed(3), +this.game.boat.y.toFixed(3)], life: this.game.boat.life, got: this.game.got };
	}

	destroy() {
		this.stop();
		window.removeEventListener('resize', this._onResize);
		document.removeEventListener('visibilitychange', this._onVis);
		this.input.dispose();
		this.fluid.dispose();
		this.backdrop.dispose();
		this.renderer.dispose();
	}
}

function samplePath(path, u) {
	const n = path.length - 1;
	const f = Math.min(n - 1e-6, Math.max(0, u * n));
	const i = Math.floor(f);
	const t = f - i;
	const a = path[i];
	const b = path[Math.min(n, i + 1)];
	return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
}
