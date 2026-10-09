// Ulu Kayın uygulaması: çizici, dünya, kamera, oyun, arayüz ve sesi birbirine bağlar;
// kare döngüsünü yürütür.
//
// Pil ve akıcılık kuralları:
// - Kareler ekran yenilemesine göre eşit aralıkla çizilir (Governor), boşa kare yok.
// - Menülerde 30 kare; duraklatma ve bitiş ekranlarında sahne donar, hiç çizim yapılmaz.
// - Sekme gizlenince döngü durur.

import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { Governor } from './core/quality.js';
import { createGlobals, ENVS, applyEnv } from './gfx/env.js';
import { initMaterials } from './gfx/materials.js';
import { ShadowSystem } from './gfx/shadow.js';
import { createWorld } from './world/world.js';
import { wind } from './world/wind.js';
import { seasonWeights } from './world/layout.js';
import { CameraRig } from './game/camera.js';
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
		this.sunAz = 0;
		this.elev = null;
		this.idle = false;
		this._raf = 0;
		this._last = 0;
		this._prev = 0;
		this._dirty = true;
		this.V3 = THREE.Vector3;
	}

	async init() {
		const canvas = document.createElement('canvas');
		canvas.className = 'uk-canvas';
		this.container.appendChild(canvas);
		this.canvas = canvas;

		const saved = this.store.get('settings') || {};
		const qOpt = this.qualityOpt !== 'auto' ? this.qualityOpt : saved.quality ?? 'auto';
		const forced = qOpt === 'auto' ? null : Number(qOpt);
		const R = createRenderer(canvas, forced);
		this.renderer = R.renderer;
		this.tier = R.tier;
		this.info = R;
		this.gov = new Governor({ tier: R.tier.id, gpu: R.gpu, store: this.store, power: saved.power || this.power });
		this.gov.onScale = () => this.resize();
		this.gov.onBattery = (on) => {
			if (this.ui) this.ui.toast(on ? 'Pil koruma açık: daha az kare, daha serin telefon' : 'Pil koruma kapandı');
		};

		const G = createGlobals();
		this.G = G;
		initMaterials(G, R.tier.shadowTaps);
		this.shadow = new ShadowSystem(G, R.tier.shadowSize);
		this.world = createWorld({ G, tier: R.tier, shadow: this.shadow, aniso: R.aniso, msaa: R.msaa });
		this.scene = this.world.scene;
		this.rig = new CameraRig();
		this.focus = new THREE.Vector3(0, 30, 0);

		this.sfx = new Sfx(this.hooks);
		this.ui = new UI(this.container, {
			action: (a) => this.game.action(a),
			toggle: (t) => this.game.toggle(t),
			wait: (on) => this.game.wait(on),
		});

		this._onResize = () => this.resize();
		window.addEventListener('resize', this._onResize);
		this._onVis = () => {
			this.visible = !document.hidden;
			if (this.visible) {
				this.gov.reset();
				this._last = 0;
				this._prev = 0;
				this.wake();
				this.sfx.resume();
			} else {
				this.sfx.suspend();
				if (this.game) this.game.pause();
			}
		};
		document.addEventListener('visibilitychange', this._onVis);
		this.resize();

		this.game = new Game(this, this.ui, this.sfx);
		this.rig.pos.set(70, 32, 60);
		this.rig.look.set(0, 27, 0);
		this.rig.mode = 'manual';
		this.rig.update(0);
		await this.warmup();
	}

	/** Bütün shader'ları açılışta derle ve bir kare çiz: oyunda ilk görünen efekt takılmasın. */
	async warmup() {
		const r = this.renderer;
		const hidden = [];
		// gizli nesneler de derlensin diye geçici olarak görünür yap
		this.scene.traverse((o) => {
			if (o.isMesh && !o.visible) {
				hidden.push(o);
				o.visible = true;
			}
		});
		try {
			if (r.compileAsync) {
				await r.compileAsync(this.scene, this.rig.cam);
				await r.compileAsync(this.shadow.scene, this.shadow.cam);
			} else {
				r.compile(this.scene, this.rig.cam);
				r.compile(this.shadow.scene, this.shadow.cam);
			}
		} catch (e) {
			/* derlenemeyen olursa ilk karede derlenir */
		}
		this.renderFrame();
		for (const o of hidden) o.visible = false;
	}

	resize() {
		const w = Math.max(1, this.container.clientWidth || window.innerWidth);
		const h = Math.max(1, this.container.clientHeight || window.innerHeight);
		const pr = this.gov.pixelRatio(w, h);
		this.renderer.setPixelRatio(pr);
		this.renderer.setSize(w, h, false);
		this.canvas.style.width = w + 'px';
		this.canvas.style.height = h + 'px';
		const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
		this.G.uRes.value.x = db.x;
		this.G.uRes.value.y = db.y;
		this.rig.resize(w, h);
		this.wake();
	}

	wake() {
		this.idle = false;
		this._dirty = true;
	}

	exit() {
		if (this.hooks.onExit) this.hooks.onExit();
		else this.game.goTitle();
	}

	/** Bir karenin bütün çizimi: ortam, gölge haritası, sahne. */
	renderFrame() {
		const G = this.G;
		G.uTime.value = this.time;
		const [a, b, t] = this.game ? this.game.envState() : ['spring', 'spring', 0];
		applyEnv(G, ENVS[a], ENVS[b], t, this.sunAz, this.elev);
		G.uWind.value.set(wind.dx, wind.dz, wind.str, wind.gust);
		G.uFocus.value.set(this.focus.x, this.focus.y + 0.5, this.focus.z, 1.7);
		// akşama doğru fenerler parlar
		const dusk = Math.min(1, G.uNight.value * 1.4 + Math.max(0, 0.3 - G.uSunDir.value.y) * 1.5);
		this.world.lanternGlow.mat.uniforms.uK.value = 0.45 + dusk * 1.5;
		this.world.mats.glass.uniforms.uK.value = 1.6 + dusk * 2.2;
		// mevsim parçacıkları, ışık sütunları ve kuşlar odağı izler
		const W = this.world;
		const sw = seasonWeights(this.focus.y, this._sw || (this._sw = [0, 0, 0, 0]));
		W.particles.u.uCenter.value.copy(this.rig.look);
		W.particles.u.uSeason.value.set(sw[0], sw[1], sw[2], sw[3]);
		W.particles.u.uFire.value = dusk * (this.focus.y < 14 ? 1 : 0.3);
		W.shafts.u.uCenter.value.copy(this.focus);
		W.birds.u.uCenterY.value = this.focus.y;
		this.shadow.place(this.focus, G.uSunDir.value);
		this.shadow.render(this.renderer);
		this.renderer.render(this.scene, this.rig.cam);
		this._dirty = false;
	}

	start() {
		if (this.running) return;
		this.running = true;
		this._last = 0;
		this._prev = 0;
		const loop = (now) => {
			if (!this.running) return;
			this._raf = requestAnimationFrame(loop);
			if (!this.visible) return;
			const rafDt = this._last ? now - this._last : 16.7;
			this._last = now;
			if (this.idle && !this._dirty) {
				this._prev = now;
				return;
			}
			if (!this.gov.tick(now, rafDt)) return;
			this.frame(now);
		};
		this._raf = requestAnimationFrame(loop);
	}

	stop() {
		this.running = false;
		cancelAnimationFrame(this._raf);
		this.sfx.suspend();
	}

	frame(now) {
		const dt = Math.min(0.05, this._prev ? (now - this._prev) / 1000 : 1 / 60);
		this._prev = now;
		this.time += dt;
		this.game.update(dt, this.time);
		this.rig.update(dt);
		this.renderFrame();
	}

	destroy() {
		this.stop();
		this.game.destroy();
		window.removeEventListener('resize', this._onResize);
		document.removeEventListener('visibilitychange', this._onVis);
		this.scene.traverse((o) => {
			if (o.geometry) o.geometry.dispose();
			if (o.material) o.material.dispose();
		});
		for (const t of Object.values(this.world.tex)) t.dispose();
		this.shadow.dispose();
		this.renderer.dispose();
		this.canvas.remove();
		this.ui.el.remove();
	}

	stats() {
		const i = this.renderer.info;
		return { calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, programs: i.programs.length, tier: this.tier.name, gpu: this.info.gpu, pr: this.renderer.getPixelRatio() };
	}

	// ---- hata ayıklama: belirli bir anı ekrana getir (ekran görüntüsü araçları için) ----
	debugView({ level = 0, s = null, sunAz = null, rel = null, camDist = 1, gust = 0, zifir = true } = {}) {
		const g = this.game;
		g.startLevel(level, { retry: true });
		g.s = s == null ? g.s0 + 4 : g.s0 + s * (g.s1 - g.s0);
		g._set('play');
		this.ui.card(null);
		this.ui.hint(null);
		this.ui.hudOn(true);
		const p = this.world.curve.sample(g.s, {});
		const zAz = Math.atan2(p.z, p.x);
		g.sunAz = g.sunTarget = sunAz != null ? sunAz : zAz + (rel == null ? Math.PI : rel);
		g.zifir.g.visible = zifir;
		g.hold = true;
		g.envFrom = g.envTo = g.level.season;
		g.envT = 1;
		this.rig.zoom = camDist;
		this.rig.mode = 'follow';
		for (let k = 0; k < 4; k++) {
			this.time += 0.016;
			g.update(0.016, this.time);
			wind.gust = gust;
			this.rig.snap();
			this.rig.update(0);
		}
		this.renderFrame();
	}

	debugCam(pos, look, season = 'spring', sunAz = 0.5) {
		this.game.envFrom = this.game.envTo = season;
		this.game.envT = 1;
		this.sunAz = sunAz;
		this.elev = null;
		this.rig.pos.copy(pos);
		this.rig.look.copy(look);
		this.rig.mode = 'manual';
		this.rig.update(0);
		this.focus.copy(look);
		this.renderFrame();
	}

	debugTick(seconds, fps = 30) {
		const dt = 1 / fps;
		for (let t = 0; t < seconds; t += dt) {
			this.time += dt;
			this.game.update(dt, this.time);
			this.rig.update(dt);
		}
		this.renderFrame();
	}

	/**
	 * Oynanış benzetimi (geliştirme testi): bölümü sabit adımla oynatır, çizmeden.
	 * policy: 'none' güneşe dokunma | 'behind' güneşi hep gövdenin arkasında tut |
	 *         'smart' her 0.2 sn'de en az ışık alan açıyı seç (Zifir + yakın damlalar)
	 */
	debugSim({ level = 0, policy = 'smart', maxT = 120, dt = 1 / 30 } = {}) {
		const g = this.game;
		g.startLevel(level, { retry: true });
		g._set('play');
		g.dragged = true;
		this.rig.mode = 'follow';
		let t = 0;
		let next = 0;
		const L = new THREE.Vector3();
		const tst = g.tester;
		let litTime = 0;
		while (t < maxT && (g.state === 'play' || g.state === 'enter')) {
			if (g.state === 'enter') g._set('play');
			const p = this.world.curve.sample(g.s, {});
			const zAz = Math.atan2(p.z, p.x);
			if (policy === 'behind') g.sunTarget = zAz + Math.PI;
			else if (policy === 'smart' && t >= next && g.locks.pending(g.s) && g.speed < 0.1) {
				// kilidin önünde: ince tarama, Zifir gölgede ve tomurcuk ışıkta olan en yakın açı
				next = t + 0.25;
				const lk = g.locks.pending(g.s);
				const q = this.world.curve.sample(g.s, {});
				const el = (g.elev * Math.PI) / 180;
				let best = null;
				let bd = 1e9;
				for (let k = 0; k < 180; k++) {
					const az = g.sunAz + ((k - 90) / 90) * Math.PI;
					L.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
					let zl = 0;
					for (const h of [0.48, 0.86, 0.36]) if (!tst.blocked(q.x, q.y + h, q.z, L) || g.beams.testPoint(L, q.x, q.y + h, q.z, tst)) zl++;
					if (zl) continue;
					let ll = 0;
					for (const h of [1.0, 1.7, 0.8]) if (!tst.blocked(lk.x, lk.y + h, lk.z, L)) ll++;
					const d = Math.abs(az - g.sunAz) - ll * 0.5;
					if (ll && d < bd) {
						bd = d;
						best = az;
					}
				}
				if (best != null) g.sunTarget = best;
				g.hold = false;
			} else if (policy === 'smart' && t >= next) {
				next = t + 0.2;
				let best = g.sunTarget;
				let bestScore = 1e9;
				for (let k = 0; k < 32; k++) {
					const az = g.sunAz + ((k - 16) / 16) * Math.PI;
					L.set(Math.cos((g.elev * Math.PI) / 180) * Math.cos(az), Math.sin((g.elev * Math.PI) / 180), Math.cos((g.elev * Math.PI) / 180) * Math.sin(az));
					let sc = 0;
					// biraz ileriyi de düşün (Zifir 0.6 sn sonra nerede olacak)
					for (const ds of [0, 0.8]) {
						const q = this.world.curve.sample(g.s + ds, {});
						if (!tst.blocked(q.x, q.y + 0.5, q.z, L) || g.beams.testPoint(L, q.x, q.y + 0.45, q.z, tst)) sc += ds === 0 ? 3 : 1;
					}
					// kilidin önünde bekliyorsak: kilit ışık almalı
					const lk = g.locks.pending(g.s);
					if (lk) {
						let lit = 0;
						for (const h of [1.0, 1.7]) if (!tst.blocked(lk.x, lk.y + h, lk.z, L)) lit++;
						sc += (2 - lit) * 0.9;
					}
					for (const d of g.drops.list) {
						if (d.state !== 'idle' || d.s - g.s > 9 || d.s < g.s - 1) continue;
						if (!tst.blocked(d.x, d.y + 0.1, d.z, L) || g.beams.testPoint(L, d.x, d.y, d.z, tst, 0.35)) sc += 0.6;
					}
					sc += Math.abs(az - g.sunAz) * 0.05;
					if (sc < bestScore) {
						bestScore = sc;
						best = az;
					}
				}
				g.sunTarget = best;
				// her açıda ışık varsa bekle
				g.hold = bestScore >= 3 && !g.locks.pending(g.s);
			}
			this.time += dt;
			t += dt;
			g.update(dt, this.time);
			if (g.expo > 0.05) litTime += dt;
		}
		this.rig.update(0);
		this.renderFrame();
		return {
			level,
			policy,
			state: g.state,
			time: +t.toFixed(1),
			progress: +((g.s - g.s0) / (g.s1 - g.s0)).toFixed(2),
			minMeter: +g.minMeter.toFixed(2),
			drops: `${g.got}/${g.drops.total}`,
			lost: g.lostN,
			litTime: +litTime.toFixed(1),
		};
	}

	debugAction(a) {
		this.game.action(a);
		this.renderFrame();
	}
}
