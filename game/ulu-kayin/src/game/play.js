// Oyun akışı: başlık → (ilk açılışta sinematik) → bölüm → kazan/kaybet → sonraki bölüm.
// Her karede: güneşi oyuncuya göre döndür, Zifir'i yürüt, gölge testini yap, damlaları güncelle,
// kamerayı ve arayüzü besle.

import * as THREE from 'three';
import { levelInfo, LEVEL_COUNT, gustAt, gustIn, levelSpan } from './levels.js';
import { LEVELS, BRIDGES, TRUNK_TOP } from '../world/layout.js';
import { wind } from '../world/wind.js';
import { sunVector } from '../gfx/env.js';
import { ShadowTester } from './shadowtest.js';
import { Zifir } from './zifir.js';
import { DropSet } from './drops.js';
import { Beams } from './beams.js';
import { Locks } from './locks.js';
import { FxPool, puffSteam, burstSparkle } from './fx.js';
import { Flock, GATHER } from './flock.js';
import { damp, clamp, wrapAngle, lerp, smoothstep, TAU } from '../core/math.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SUN_SPEED = 4.0; // güneşin en hızlı dönüşü (radyan/sn)
const BURN = 0.42; // tam ışıkta saniyede kaybedilen mürekkep
const REGEN = 0.22; // gölgede saniyede geri kazanılan
const RUN_K = 1.35; // ışıkta Zifir telaşla koşar (ışıktan çabuk çıkar)
const STREAK_STEP = 1.0; // gölgede yürünen her 1 birim: gölge serisi +1
const BIRD_STEP = 4.2; // gölgede yürünen her 4.2 birim: Sürü'ye bir kuş
const FLOCK_DUR = 5.0; // Sürü'nün gölgelediği süre (sn)
const LAST_STAND = 1.1; // son nefes: mürekkep bitince gölgeye kaçmak için tanınan süre (bölümde bir kez)
const NEAR = 0.3; // bu seviyenin altından gölgeye dönmek "kıl payı" sayılır

// Arayüzde karşılığı olmayan yeni ipuçları (metin olarak gönderilir)
const HINT_TEXT = {
	streak: 'Gölgede yürüdükçe <em>gölge serisi</em> büyür. Seri, Zifir’e gölge kuşları toplar.',
	flock: '<em>Sürü hazır!</em> Dokun: kuşlar güneşin önünde dönüp Zifir’i birkaç saniye gölgeler.',
};

export class Game {
	constructor(app, ui, sfx) {
		this.app = app;
		this.ui = ui;
		this.sfx = sfx;
		const w = app.world;
		this.world = w;
		this.curve = w.curve;
		this.G = app.G;
		this.store = app.store;
		this.tester = new ShadowTester(w);
		this.zifir = new Zifir(app.G, w.tex, { segs: app.tier.id >= 1 ? 40 : 28 });
		this.zifir.g.visible = false;
		w.scene.add(this.zifir.g);
		this.drops = new DropSet(app.G, w.tex, w.scene);
		this.beams = new Beams(app.G, w.tex, w.scene, w);
		this.drops.beams = this.beams;
		this.locks = new Locks(app.G, w.tex, w.scene);
		this.fx = new FxPool(app.G, w.tex.particles, { additive: true });
		this.petals = new FxPool(app.G, w.tex.particles, { additive: false });
		w.scene.add(this.fx.mesh, this.petals.mesh);
		// Sürü: gölge kuşları. Zifir'in ışınları ve yakın damlalar için ek bir gölgeleyici.
		this.flock = new Flock(app.G, w.scene, app.shadow && app.shadow.scene);
		this._ft = { blocked: (x, y, z, L) => this.flock.blocks(x, y, z, L) || this.tester.blocked(x, y, z, L) };
		this.streak = 0;
		this.best = 0;
		this.score = 0;
		this.nearN = 0;
		this.timeScale = 1;
		this._slowT = 0;
		this._slowK = 1;
		this._popT = -9;
		this._abKey = -1;
		this._progU = -1;

		this.prog = Object.assign({ unlocked: 0, stars: [], dust: 0, fails: {}, seen: {}, intro: false }, this.store.get('progress') || {});
		this.settings = Object.assign({ sound: true, haptics: true, quality: 'auto', power: 'auto' }, this.store.get('settings') || {});
		this.sfx.setOn(this.settings.sound);

		this.state = 'title';
		this.stateT = 0;
		this.level = null;
		this.li = 0;
		this.s = 0;
		this.speed = 0;
		this.hold = false;
		this.keyHold = false;
		this.meter = 1;
		this.expo = 0;
		this.minMeter = 1;
		this.burnTotal = 0;
		this.sunAz = 0;
		this.sunTarget = 0;
		this.elev = 34;
		this.levelT = 0;
		this.dragged = false;
		this.sunDir = V3(0, 1, 0);
		this.zp = V3();
		this._ahead = V3();
		this._smp = {};
		this._smp2 = {};
		this._hintUntil = 0;
		this._hintQueue = [];
		this._pts = [V3(), V3(), V3(), V3(), V3(), V3()];
		this.rays = app.tier.id >= 1 ? 6 : 4;
		this.envFrom = 'spring';
		this.envTo = 'spring';
		this.envT = 1;
		this.envDur = 1;
		this._titleSeason = 0;

		this._onStep = () => this.sfx.step();
		this._bindInput();
		this.ui.setToggles(this.settings);
		this.ui.setPlayLabel(this.prog.unlocked > 0 || this.prog.intro ? 'Devam Et' : 'Başla');
		this.goTitle(true);
	}

	// ------------------------------------------------------------------------------------------
	// Girdi: ekranda sürükle → güneş döner. Bekle düğmesi ve klavye.
	// ------------------------------------------------------------------------------------------
	_bindInput() {
		const el = this.app.container;
		let id = null;
		let lastX = 0;
		el.addEventListener('pointerdown', (e) => {
			this.sfx.unlock();
			if (e.target.closest('button')) return;
			if (id !== null) return;
			id = e.pointerId;
			lastX = e.clientX;
			if (this.state === 'intro') this.ui.skip(true);
		});
		el.addEventListener('pointermove', (e) => {
			if (e.pointerId !== id) return;
			const dx = e.clientX - lastX;
			lastX = e.clientX;
			this.drag(dx / Math.max(320, el.clientWidth));
		});
		const end = (e) => {
			if (e.pointerId === id) id = null;
		};
		el.addEventListener('pointerup', end);
		el.addEventListener('pointercancel', end);
		this._onKey = (e) => {
			if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
			if (e.key === 'ArrowLeft') this.drag(-0.06);
			else if (e.key === 'ArrowRight') this.drag(0.06);
			else if ((e.key === 'f' || e.key === 'F' || e.key === 'Enter') && e.type === 'keydown') this.callFlock();
			else if (e.key === ' ') {
				this.keyHold = e.type === 'keydown';
				e.preventDefault();
			} else if (e.key === 'Escape' && e.type === 'keydown') {
				if (this.state === 'play' || this.state === 'ready') this.pause();
				else if (this.state === 'paused') this.resume();
			}
		};
		window.addEventListener('keydown', this._onKey);
		window.addEventListener('keyup', this._onKey);
	}

	/** Sürükleme: ekran genişliği kadar kaydırmak güneşi ~300° döndürür. Sağa çekmek güneşi sağa götürür. */
	drag(f) {
		if (this.state !== 'play' && this.state !== 'ready') return;
		this.sunTarget -= f * TAU * 0.85;
		if (!this.dragged && Math.abs(f) > 0.004) {
			this.dragged = true;
			if (this.state === 'ready') this._begin();
		}
	}

	wait(on) {
		this.hold = on;
	}

	// ------------------------------------------------------------------------------------------
	// Ekran akışı
	// ------------------------------------------------------------------------------------------
	_set(state) {
		this.state = state;
		this.stateT = 0;
		this.app.wake();
	}

	envTo2(name, dur = 2) {
		// süren bir geçişin ortasındaysak bulunduğu yerden devam et (kopma olmasın)
		if (this.envT < 1) this.envFrom = this.envT > 0.5 ? this.envTo : this.envFrom;
		else this.envFrom = this.envTo;
		this.envTo = name;
		this.envT = 0;
		this.envDur = dur;
	}

	goTitle(first = false) {
		this._set('title');
		this.ui.hudOn(false);
		this.ui.card(null);
		this.ui.hint(null);
		this.ui.show('title');
		this.zifir.g.visible = false;
		this.drops.hideAll();
		this.beams.hide();
		this.locks.hide();
		this.flock.hide();
		this.sfx.lockCharge(null);
		this.sfx.music('title');
		this.ui.ability?.('flock', { count: 0, max: GATHER, ready: false, active: false });
		this.app.gov.menu = true;
		if (first) {
			this.envFrom = this.envTo = 'spring';
			this.envT = 1;
		} else this.envTo2('spring', 1.5);
		this._orbit = { a: 0.6, r: 84, y: 16, ly: 25 };
	}

	goLevels() {
		this._set('levels');
		this.ui.hudOn(false);
		this.ui.card(null);
		this.ui.hint(null);
		this.ui.renderLevels(LEVELS, this.prog);
		this.ui.show('levels');
		this.zifir.g.visible = false;
		this.drops.hideAll();
		this.beams.hide();
		this.locks.hide();
		this.flock.hide();
		this.sfx.music('title');
		this.app.gov.menu = true;
		if (!this._orbit) this._orbit = { a: 0.6, r: 84, y: 16, ly: 25 };
	}

	action(a) {
		this.sfx.unlock();
		if (a === 'ability:flock') return this.callFlock();
		this.sfx.ui();
		if (a === 'play') {
			if (!this.prog.intro) this.startIntro();
			else this.startLevel(Math.min(this.prog.unlocked, LEVEL_COUNT - 1));
		} else if (a === 'levels') this.goLevels();
		else if (a === 'title') this.goTitle();
		else if (a === 'exit') this.app.exit();
		else if (a.startsWith('lv:')) {
			const i = Number(a.slice(3));
			if (i <= this.prog.unlocked) this.startLevel(i);
			else this.ui.toast('Önceki bölümü tamamla');
		} else if (a === 'pause') this.pause();
		else if (a === 'resume') this.resume();
		else if (a === 'retry') this.startLevel(this.li, { retry: true });
		else if (a === 'next') this.startLevel(Math.min(this.li + 1, LEVEL_COUNT - 1), { cont: true });
		else if (a === 'skip') this.skipIntro();
		else if (a === 'settings') {
			this._settingsFromTitle = true;
			this.ui.$('.uk-card h4').textContent = 'Ayarlar';
			this.ui.$('[data-s=pause] [data-a=resume]').textContent = 'Tamam';
			this.ui.$('[data-s=pause] [data-a=retry]').style.display = 'none';
			this.ui.$('[data-s=pause] [data-a=levels]').style.display = 'none';
			this.ui.show('pause');
		}
	}

	toggle(t) {
		const S = this.settings;
		if (t === 'sound') {
			S.sound = !S.sound;
			this.sfx.setOn(S.sound);
		} else if (t === 'haptics') S.haptics = !S.haptics;
		else if (t === 'quality') {
			const order = ['auto', 0, 1, 2];
			S.quality = order[(order.indexOf(S.quality) + 1) % order.length];
			this.ui.toast('Grafik ayarı bir sonraki açılışta uygulanır');
		} else if (t === 'power') {
			const order = ['auto', 'saver', 'performance'];
			S.power = order[(order.indexOf(S.power) + 1) % order.length];
			this.app.gov.power = S.power;
			this.app.resize();
		}
		this.store.set('settings', S);
		this.ui.setToggles(S);
	}

	pause() {
		if (this.state !== 'play' && this.state !== 'ready') return;
		this._paused = this.state;
		this._set('paused');
		this._settingsFromTitle = false;
		this.ui.$('.uk-card h4').textContent = 'Duraklatıldı';
		this.ui.$('[data-s=pause] [data-a=resume]').textContent = 'Devam';
		this.ui.$('[data-s=pause] [data-a=retry]').style.display = '';
		this.ui.$('[data-s=pause] [data-a=levels]').style.display = '';
		this.ui.show('pause');
		this.sfx.tick(0, 0, 0, false);
		this.sfx.lockCharge(null);
		this.sfx.music('soft');
	}

	resume() {
		if (this._settingsFromTitle) {
			this._settingsFromTitle = false;
			this.ui.show('title');
			return;
		}
		if (this.state !== 'paused') return;
		this.ui.show(null);
		this._set(this._paused || 'play');
		this.sfx.music('play');
	}

	haptic(p) {
		if (!this.settings.haptics) return;
		if (this.app.hooks.haptic && this.app.hooks.haptic(p) === true) return;
		try {
			if (navigator.vibrate) navigator.vibrate(p);
		} catch (e) {
			/* desteklenmiyor */
		}
	}

	// ------------------------------------------------------------------------------------------
	// Açılış sinematiği: uzaktan ağaca süzülüş, tepeye tırmanış, üç satır efsane.
	// ------------------------------------------------------------------------------------------
	startIntro() {
		this._set('intro');
		this.ui.show(null);
		this.ui.hudOn(false);
		this.app.gov.menu = false;
		this.envFrom = this.envTo = 'spring';
		this.envT = 1;
		const L = levelInfo(0);
		this._setupLevelData(0);
		this._birds0 = 0;
		const p = this.curve.sample(this.s, this._smp);
		const a = this.curve.sample(this.s + 3, this._smp2);
		const rig = this.app.rig;
		rig.followTarget(V3(p.x, p.y, p.z), V3(a.x, a.y, a.z));
		const end = rig.tPos.clone();
		const endL = rig.tLook.clone();
		const az = Math.atan2(p.z, p.x);
		rig.play(
			[
				{ t: 0, pos: V3(Math.cos(az + 1.3) * 150, -6, Math.sin(az + 1.3) * 150), look: V3(0, 22, 0), fov: 44 },
				{ t: 4.5, pos: V3(Math.cos(az + 0.9) * 62, 14, Math.sin(az + 0.9) * 62), look: V3(0, 30, 0), fov: 46 },
				{ t: 8.5, pos: V3(Math.cos(az + 0.4) * 30, TRUNK_TOP + 6, Math.sin(az + 0.4) * 30), look: V3(0, TRUNK_TOP + 2, 0), fov: 50 },
				{ t: 11.5, pos: end, look: endL },
			],
			() => this._enterLevel(0, { fromIntro: true })
		);
		this.sunAz = this.sunTarget = az + Math.PI * 0.6;
		this.zifir.g.visible = true;
		this._lore = [
			[0.6, 'Gök ile yeri bir ağaç bağlar: Ulu Kayın.'],
			[4.4, 'Tün Ana’nın son yıldızı köklerine düştü.'],
			[8.0, 'Güneş ağacın çevresinde döner; gölgesi Zifir’in yoludur.'],
		];
		this._loreI = 0;
		this.ui.skip(true);
		void L;
	}

	skipIntro() {
		if (this.state !== 'intro') return;
		this.ui.lore(null);
		this.ui.skip(false);
		this.app.rig.skipCine();
	}

	// ------------------------------------------------------------------------------------------
	// Bölüm kurulumu
	// ------------------------------------------------------------------------------------------
	_setupLevelData(i) {
		this.li = i;
		this.level = levelInfo(i);
		const L = this.level;
		[this.s0, this.s1] = levelSpan(this.curve, i);
		this.s = this.s0;
		this.drops.setup(this.curve, this.s0, this.s1, L.drops);
		this.locks.setup(this.curve, this.s0, this.s1, L.locks, L.season);
		this.ui.setLevel(L);
		this.ui.setDrops(0, L.drops.length);
		this.sfx.resetDrops();
		this.sfx.season = L.season;
		this.meter = 1;
		this.minMeter = 1;
		this.burnTotal = 0;
		this.expo = 0;
		this.speed = 0;
		this.levelT = 0;
		this.dragged = false;
		this.got = 0;
		this.lostN = 0;
		const fails = this.prog.fails[i] || 0;
		this.fails = fails;
		this.mercy = Math.max(0.55, 1 - 0.12 * fails);
		this.burnK = (L.burn || 1) * this.mercy;
		// seri, puan, kıl payı, son nefes
		this.streak = 0;
		this.best = 0;
		this.score = 0;
		this.nearN = 0;
		this.unlocks = 0;
		this._shadeD = 0;
		this._birdD = 0;
		this._litT = 0;
		this._shadeT = 0;
		this._wasLit = false;
		this._expMin = 1;
		this._scared = false;
		this._lastStand = 0;
		this._lastUsed = false;
		this._slowT = 0;
		this.timeScale = 1;
		this._tutShade = i !== 0;
		this._flockOn = false;
		this._beamHit = false;
		this._lkOn = false;
		this._pend = null;
		(this._dropWarn || (this._dropWarn = new Uint8Array(16))).fill(0);
		this._progU = -1;
		this.ui.streak?.(0);
		this.sfx.streakReset();
		this.elev = L.elev[0];
		wind.str = L.wind;
		wind.gust = 0;
		this._gate = 0;
		this._lockT = 0;
		this._arcOn = false;
		this.ui.lockArc(null);
	}

	startLevel(i, { retry = false, cont = false } = {}) {
		const fromPlay = cont && this.level && this.li === i - 1;
		const prevS = this.s;
		// toplanmış kuşlar bir sonraki bölüme taşınır; yenilgiden sonra kuşlar yardıma gelir
		// tekrar denemede bölüme hangi kuşlarla başlandıysa onlar geri gelir
		const carry = fromPlay ? this._carryBirds || 0 : retry && this.li === i ? this._startBirds || 0 : 0;
		this._setupLevelData(i);
		const mercyBirds = this.fails > 0 ? Math.min(GATHER, this.fails + 1) : 0;
		this._birds0 = Math.max(carry, mercyBirds);
		this._mercyBirds = mercyBirds > carry;
		this._startBirds = carry;
		this.zifir.reset();
		this.zifir.g.visible = true;
		this.fx.clear();
		this.petals.clear();
		if (fromPlay) {
			// önceki bölümün bittiği yerden yürüyerek devam
			this._walkFrom = prevS;
			this.s = prevS;
		} else this._walkFrom = null;
		this._enterLevel(i, { retry, cont: fromPlay });
	}

	_enterLevel(i, { retry = false, fromIntro = false, cont = false } = {}) {
		const L = this.level;
		this._set('enter');
		this.ui.show(null);
		this.ui.hudOn(false);
		this.ui.lore(null);
		this.ui.skip(false);
		this.app.gov.menu = false;
		if (this.envTo !== L.season) this.envTo2(L.season, cont ? 3 : 1.6);
		// güneş: Zifir'in arkasında, gölgede güvenli başla
		const p = this.curve.sample(this.s0, this._smp);
		const az = Math.atan2(p.z, p.x);
		if (!fromIntro) this.sunAz = this.sunTarget = az + L.sunStart;
		else this.sunTarget = az + L.sunStart;
		const rig = this.app.rig;
		const a = this.curve.sample(this.s0 + 3, this._smp2);
		rig.followTarget(V3(p.x, p.y, p.z), V3(a.x, a.y, a.z));
		if (!fromIntro && !retry && !cont) {
			// uzaktan bölüme süzül
			const end = rig.tPos.clone();
			const endL = rig.tLook.clone();
			const start = rig.pos.clone();
			const mid = V3(Math.cos(az - 0.6) * 34, p.y + 9, Math.sin(az - 0.6) * 34);
			rig.play(
				[
					{ t: 0, pos: start, look: rig.look.clone() },
					{ t: 1.4, pos: mid, look: V3(p.x * 0.5, p.y + 1, p.z * 0.5) },
					{ t: 2.6, pos: end, look: endL },
				],
				null
			);
		} else if (retry) {
			rig.mode = 'follow';
			rig.snap();
		} else rig.mode = 'follow';
		this.ui.card(L.kicker, L.title, L.finale ? 'Son bölüm' : '');
		// tekrar denemede kart kısa: oyuncu hemen oyuna döner
		this._cardT = retry ? 1.3 : 2.4;
		this.ui.setDrops(0, L.drops.length);
		this._queueHints(L.hints || []);
		// Sürü: taşınan ya da yardıma gelen kuşlar Zifir'in tepesinde hazır
		const zp0 = this.curve.sample(this.s, this._smp);
		this.zp.set(zp0.x, zp0.y, zp0.z);
		this.flock.reset(this._birds0 || 0, this.zp);
		this._abil();
		this.sfx.music('play');
		this.sfx.lockCharge(null);
	}

	_queueFront(h) {
		if (!this._hintQueue.includes(h)) this._hintQueue.unshift(h);
	}

	_queueHints(list) {
		this._hintQueue = list.filter((h) => !this.prog.seen[h]);
	}

	_showHint(key, dur = 4.5) {
		this.ui.hint(HINT_TEXT[key] || key);
		this._hintUntil = this.levelT + dur;
		this._hintKey = key;
		this.prog.seen[key] = true;
		this.store.set('progress', this.prog);
	}

	/** İpucu sırası: ekranda başka bir ipucu varsa o bitince gösterilir. */
	_hintLater(key, dur = 4.5) {
		if (this.prog.seen[key]) return;
		if (!this._hintKey) this._showHint(key, dur);
		else this._pend = [key, dur];
	}

	_begin() {
		this._set('play');
		this.ui.hudOn(true);
		if (this._hintKey === 'drag') {
			this.ui.hint(null);
			this._hintKey = null;
			if (this._hintQueue[0] === 'hide') this._showHint(this._hintQueue.shift(), 4.5);
		}
	}

	// ------------------------------------------------------------------------------------------
	// Kare güncellemesi
	// ------------------------------------------------------------------------------------------
	update(dt, time) {
		this.stateT += dt;
		// ortam geçişi
		if (this.envT < 1) this.envT = Math.min(1, this.envT + dt / this.envDur);
		const st = this.state;

		if (st === 'title' || st === 'levels') return this._updateOrbit(dt, time);
		if (st === 'intro') return this._updateIntro(dt, time);
		if (st === 'paused' || st === 'complete' || st === 'fail' || st === 'ending') {
			// arka planda sahne donar: GPU dinlenir (pil)
			this.app.idle = this.stateT > 1.2;
			this._updateZifirOnly(dt, time, st === 'paused');
			return;
		}
		this.app.idle = false;

		const L = this.level;
		const curve = this.curve;

		// --- güneş: hedefe sınırlı hızla yaklaşır (anında ışınlanmaz, plan gerektirir).
		// Ağır çekimde de gerçek zamanla döner: oyuncu hızlı, dünya yavaş.
		const d = this.sunTarget - this.sunAz;
		const maxStep = SUN_SPEED * dt;
		this.sunAz += clamp(d, -maxStep, maxStep);

		// --- ağır çekim (kıl payı, son nefes, zafer)
		if (this._slowT > 0) this._slowT -= dt;
		this.timeScale = damp(this.timeScale, this._slowT > 0 ? this._slowK : 1, this._slowT > 0 ? 16 : 4, dt);
		dt *= this.timeScale;
		this.levelT += st === 'play' ? dt : 0;

		// --- rüzgâr
		wind.gust = st === 'play' ? gustAt(L.gust, this.levelT) : 0;
		const gustSoon = st === 'play' && gustIn(L.gust, this.levelT) < 1.6 && wind.gust < 0.05;
		this.ui.gust(gustSoon);
		if (gustSoon && !this._gustSoon) {
			this.sfx.gustWarn();
			this.haptic(6);
		}
		this._gustSoon = gustSoon;
		if (st === 'play' && L.gust && gustIn(L.gust, this.levelT) < 1.6 && this._hintQueue[0] === 'gust') this._showHint(this._hintQueue.shift(), 4);

		// --- Zifir yürür
		let moving = false;
		if (st === 'enter') {
			this._cardT -= dt;
			if (this._cardT < 0.4) this.ui.card(null);
			if (this._walkFrom != null && this.s < this.s0) {
				this.s = Math.min(this.s0, this.s + 1.6 * dt);
				moving = true;
			}
			const rig = this.app.rig;
			if (rig.mode !== 'cine' && this._cardT < 0.6 && (this._walkFrom == null || this.s >= this.s0)) {
				this.ui.card(null);
				this.ui.hudOn(true);
				if (this.li === 0 && !this.prog.seen.drag) {
					this._set('ready');
					this._showHint(this._hintQueue.shift() || 'drag', 999);
				} else {
					this._set('play');
					if (this._mercyBirds) {
						this._pop('Kuşlar yardıma geldi', 'good');
						this._mercyBirds = false;
					}
					if (this._hintQueue.length && this._hintQueue[0] !== 'gust' && this._hintQueue[0] !== 'bridge') this._showHint(this._hintQueue.shift(), 4.5);
					if (this.flock.ready && this.li >= 1) this._hintLater('flock', 5.5);
				}
			}
		} else if (st === 'ready') {
			if (this.stateT > 7) this._begin(); // oyuncu kaydırmazsa da başla
		} else if (st === 'play') {
			const holding = this.hold || this.keyHold;
			// kapalı ışık kilidinin önünde durur
			const lim = this.locks.limit(this.s);
			const atLock = this.s >= lim - 0.05;
			// kilide yaklaşınca yavaşlayıp tam önünde durur
			const brake = clamp((lim - this.s) / 0.7, 0, 1);
			// ışıkta telaşla koşar: yanlış bir anda ışığa yakalanmak ölüm değil, kaçış
			const run = this.expo > 0.3 ? RUN_K : 1;
			const target = holding ? 0 : L.speed * brake * run;
			this.speed = damp(this.speed, target, holding ? 14 : 5, dt);
			this.s = Math.min(this.s + this.speed * dt, Math.max(this.s, lim));
			moving = this.speed > 0.15;
			if (atLock && !this.prog.seen.lock) this._showHint('lock', 6);
			// kilidin önünde takılırsa pusulada doğru aralığı göster (ilk bölümlerde daha erken)
			this._lockT = atLock ? (this._lockT || 0) + dt : 0;
			if (this._lockT > (this.li <= 1 ? 2.5 : 4)) this._lockAssist();
			else if (this._arcOn) {
				this.ui.lockArc(null);
				this._arcOn = false;
			}
			// köprü ipucu
			if (this._hintQueue[0] === 'bridge') {
				for (const b of BRIDGES) {
					const bs = curve.sAtTheta(b.th);
					if (bs > this.s && bs - this.s < 9) this._showHint(this._hintQueue.shift(), 4.5);
				}
			}
		}

		// --- konum
		const p = curve.sample(this.s, this._smp);
		this.zp.set(p.x, p.y, p.z);
		const ahead = curve.sample(Math.min(curve.length, this.s + 3.2), this._smp2);
		this._ahead.set(ahead.x, ahead.y, ahead.z);
		const zAz = Math.atan2(p.z, p.x);

		// --- gün akışı: güneş bölüm boyunca alçalır
		const u = clamp((this.s - this.s0) / (this.s1 - this.s0), 0, 1);
		this.elev = lerp(L.elev[0], L.elev[1], u);
		sunVector(this.sunAz, this.elev, this.sunDir);

		// --- Sürü (gölge kuşları): girdap merkezi bu karenin güneşine göre
		this.flock.update(dt, time, this.zp, this.sunDir);
		if (this._flockOn && this.flock.active <= 0) {
			this._flockOn = false;
			this.sfx.flockEnd();
			this._abil();
		}

		// --- gölge testi (Sürü uçarken onun gölgesi de sayılır)
		const active = st === 'play';
		this.tester.setTime(time);
		let lit = 0;
		if (active || st === 'ready') {
			const pts = this._pts;
			const fx = p.tx;
			const fz = p.tz;
			const sx = p.sx;
			const sz = p.sz;
			pts[0].set(p.x, p.y + 0.48, p.z);
			pts[1].set(p.x, p.y + 0.86, p.z);
			pts[2].set(p.x + sx * 0.3, p.y + 0.36, p.z + sz * 0.3);
			pts[3].set(p.x - sx * 0.3, p.y + 0.36, p.z - sz * 0.3);
			pts[4].set(p.x + fx * 0.3, p.y + 0.36, p.z + fz * 0.3);
			pts[5].set(p.x - fx * 0.3, p.y + 0.36, p.z - fz * 0.3);
			const T = this._ft;
			for (let k = 0; k < this.rays; k++) {
				const q = pts[k];
				if (!T.blocked(q.x, q.y, q.z, this.sunDir)) lit++;
			}
			lit /= this.rays;
		}
		// kristal ışınları: güneş gibi yakar (Sürü ışını da yutar)
		let beam = 0;
		if (st !== 'title' && st !== 'levels') beam = this.beams.update(dt, time, p.y, this.sunDir, this.tester, this.zp);
		if (this.flock.active > 0) beam = 0;
		if (beam > 0 && active && this._hintQueue[0] !== 'crystal' && !this.prog.seen.crystal) this._queueFront('crystal');
		if (this.beams.active.length && active && this._hintQueue[0] === 'crystal' && (!this._hintKey || beam > 0)) this._showHint(this._hintQueue.shift(), 5);
		if (beam > 0.3 && active && !this._beamHit) this.app.rig.shake = Math.max(this.app.rig.shake, 0.07);
		this._beamHit = beam > 0.3;
		lit = Math.max(lit, beam);
		this.expo = damp(this.expo, lit, 18, dt);

		// --- mürekkep, gölge serisi, kuşlar, kıl payı, son nefes
		let dead = false;
		if (active) dead = this._feel(dt, lit, p, moving);
		this.G.uDanger.value = damp(this.G.uDanger.value, active ? lit * 0.8 + (1 - this.meter) * 0.4 * lit + (this._lastStand > 0 ? 0.5 : 0) : 0, 8, dt);

		// --- damlalar
		this.drops.update(
			dt,
			time,
			this.s,
			this.zp,
			this._ft,
			this.sunDir,
			this.fx,
			() => {
				this.got++;
				this.score += 25;
				this.ui.setDrops(this.got, this.drops.total, 'pop');
				this.sfx.drop();
				this.haptic(12);
				this.zifir.react?.('drop');
				if (this.got === this.drops.total && !this.lostN && this.drops.total > 1) {
					this._pop('Bütün damlalar!', 'gold');
					this.score += 50;
				}
			},
			() => {
				this.lostN++;
				this.ui.setDrops(this.got, this.drops.total, 'bad');
				this.sfx.dropLost();
				this.haptic(40);
				this.app.rig.shake = Math.max(this.app.rig.shake, 0.06);
				this._pop('Damla eridi', 'bad');
				if (this.prog.seen.drops !== true) this._showHint('drops', 4);
			},
			active
		);

		// erimeye başlayan damla: bir kez uyar (oyuncu güneşi kaydırıp kurtarabilir)
		if (active) {
			const W = this._dropWarn;
			for (const dr of this.drops.list) {
				if (dr.state === 'idle' && dr.melt > 0.18 && !W[dr.i]) {
					W[dr.i] = 1;
					this.sfx.dropWarn();
					this._pop('Damla eriyor!', 'bad');
				}
			}
		}

		// --- ışık kilitleri
		if (active || st === 'ready')
			this.locks.update(dt, this.s, this.sunDir, this.tester, this.beams, this.fx, () => {
				this.sfx.unlockOpen ? this.sfx.unlockOpen() : this.sfx.win();
				this.haptic([15, 30, 15]);
				this.app.rig.shake = Math.max(this.app.rig.shake, 0.14);
				this.zifir.hop();
				this.zifir.react?.('safe');
				this.unlocks++;
				this.score += 30;
				const quick = this._lockT < 3;
				this._pop(quick ? 'Çabuk açtın!' : 'Açıldı!', 'good');
				if (quick) this.score += 20;
				if (this._hintKey === 'lock') {
					this.ui.hint(null);
					this._hintKey = null;
				}
				this.ui.lockArc(null);
				this._arcOn = false;
				this._lockT = 0;
				this._lkC = 0;
			});
		// kilit dolarken yükselen ton (yalnızca dolarken)
		const lk = active ? this.locks.pending(this.s) : null;
		if (lk && lk.charge > (this._lkC || 0) + 1e-5) {
			this.sfx.lockCharge(lk.charge);
			this._lkOn = true;
		} else if (this._lkOn) {
			this.sfx.lockCharge(null);
			this._lkOn = false;
		}
		this._lkC = lk ? lk.charge : 0;

		// --- ipucu süresi
		if (this._hintKey && this._hintKey !== 'drag' && this.levelT > this._hintUntil) {
			this.ui.hint(null);
			this._hintKey = null;
		}
		if (this._pend && !this._hintKey && active) {
			const [k, dd] = this._pend;
			this._pend = null;
			if (!this.prog.seen[k]) this._showHint(k, dd);
		}

		// --- bitiş kontrolü
		if (active && dead) this._die();
		else if (active && this.s >= this.s1) this._win();

		// --- Zifir ve kamera (buharlaşırken ve kapıya girerken kendi animasyonu yürür)
		if (st !== 'dying' && st !== 'gate') {
			const zs = this._zstate(p, moving, moving ? Math.max(this.speed, 1.2) : 0, st === 'play' && (this.hold || this.keyHold), active ? lit : 0, lit, this.meter);
			this.zifir.update(dt, time, zs, this._onStep);
		}
		const rig = this.app.rig;
		if (rig.mode === 'follow') rig.followTarget(this.zp, this._ahead);

		this.ui.compass(wrapAngle(this.sunAz - zAz), lit > 0.01);
		if (active && Math.abs(u - this._progU) > 0.004) {
			this._progU = u;
			this.ui.progress?.(u);
		}
		// müzik: gölge serisi uzadıkça zenginleşir
		this.sfx.intensity = damp(this.sfx.intensity, active ? clamp((this.streak - 2) / 14, 0, 1) : 0, 1.2, dt);
		this.sfx.tick(dt, active ? lit : 0, wind.str + wind.gust, active, this.meter);
		this._commonFx(dt);
	}

	/** Mürekkep, gölge serisi, kuşlar, kıl payı ve son nefes. Döndürür: Zifir buharlaştı mı. */
	_feel(dt, lit, p, moving) {
		const shaded = lit < 0.01;
		if (!shaded) {
			this.meter -= lit * BURN * this.burnK * dt;
			this.burnTotal += lit * dt;
			if (Math.random() < dt * 22 * lit) puffSteam(this.fx, p.x, p.y + 0.7, p.z, 0.9);
		} else this.meter = Math.min(1, this.meter + REGEN * dt);

		// ışığa giriş ve çıkış (kenarda bir anlık titreşimleri yok say)
		if (lit > 0.15) {
			this._litT += dt;
			this._shadeT = 0;
		} else if (shaded) {
			this._shadeT += dt;
			this._litT = 0;
		}
		if (!this._wasLit && this._litT > 0.12) this._enterLight();
		else if (this._wasLit && this._shadeT > 0.1) this._exitLight();
		if (this._wasLit) {
			this._expMin = Math.min(this._expMin, this.meter);
			if (!this._scared && this.meter < 0.3) {
				this._scared = true;
				this.zifir.react?.('scared');
				this.haptic([20, 30, 20]);
			}
		}

		// eğitim: ilk gölge anı kutlanır
		if (!this._tutShade && shaded && this._shadeT > 0.3) {
			this._tutShade = true;
			this._pop('Gölgede!', 'gold');
			this.sfx.milestone(5);
			this.zifir.react?.('safe');
		}

		// gölgede yürüdükçe: seri büyür, kuşlar toplanır
		if (shaded && moving) {
			const ds = this.speed * dt;
			this._shadeD += ds;
			while (this._shadeD >= STREAK_STEP) {
				this._shadeD -= STREAK_STEP;
				this._streakUp();
			}
			if (this.flock.count < GATHER && this.flock.active <= 0) {
				this._birdD += ds;
				if (this._birdD >= BIRD_STEP) {
					this._birdD = 0;
					this._birdJoin();
				}
			}
		}

		// son nefes: mürekkep bitince bir kez, kısa bir kaçış süresi
		if (this._lastStand > 0) {
			this._lastStand -= dt;
			if (shaded) {
				this._lastStand = 0;
				this._wasLit = false;
				this._slowT = 0;
				this.meter = Math.max(this.meter, 0.15); // gölge bir yudum mürekkep verir
				this._nearMiss(true);
			} else {
				this.meter = Math.max(this.meter, 0.001);
				if (this._lastStand <= 0) return true;
			}
		} else if (this.meter <= 0) {
			if (this._lastUsed) return true;
			this._lastUsed = true;
			this._lastStand = LAST_STAND;
			this.meter = 0.001;
			this._slow(0.45, 0.9);
			this.sfx.lastStand();
			this._pop('Son nefes!', 'bad');
			this.haptic([40, 30, 60]);
			this.app.rig.shake = Math.max(this.app.rig.shake, 0.18);
			this.zifir.react?.('scared');
		}
		this.minMeter = Math.min(this.minMeter, this.meter);
		return false;
	}

	_enterLight() {
		this._wasLit = true;
		this._expMin = this.meter;
		this._scared = false;
		this.sfx.burnStart();
		this.haptic(10);
		this.app.rig.shake = Math.max(this.app.rig.shake, 0.05);
		this.zifir.react?.('burn');
		if (this.streak >= 5) {
			this._pop('Seri bozuldu', 'bad');
			this.sfx.streakBreak(this.streak);
		} else this.sfx.streakReset();
		if (this.streak) {
			this.streak = 0;
			this.ui.streak?.(0);
		}
		this._shadeD = 0;
	}

	_exitLight() {
		this._wasLit = false;
		if (this._expMin < NEAR) this._nearMiss(false);
		else this.zifir.react?.('safe');
	}

	_nearMiss(big) {
		this.nearN++;
		this.score += big ? 40 : 15;
		this._pop(big ? 'Kıl payı!!' : 'Kıl payı!', 'gold');
		this.sfx.nearMiss();
		this.haptic([20, 40, 30]);
		this.zifir.react?.('safe');
		this._slow(0.35, big ? 0.55 : 0.35);
		this.app.rig.shake = Math.max(this.app.rig.shake, 0.08);
		burstSparkle(this.fx, this.zp.x, this.zp.y + 0.7, this.zp.z, big ? 26 : 16, [1.4, 1.1, 2.6]);
	}

	_streakUp() {
		const n = ++this.streak;
		if (n > this.best) this.best = n;
		this.score += 1 + Math.floor(n / 10);
		this.ui.streak?.(n);
		if (n % 5 === 0) {
			const big = n % 10 === 0;
			this._pop(`Gölge serisi ×${n}`, big ? 'gold' : 'good');
			this.sfx.milestone(n);
			this.haptic(big ? [12, 30, 12] : 10);
			if (big) burstSparkle(this.fx, this.zp.x, this.zp.y + 0.9, this.zp.z, 14, [1.2, 1.0, 2.4]);
			if (n === 10) this.app.hooks.onStreak?.(n);
			if (n === 5) this._hintLater('streak', 4.5);
		} else if (n >= 3) this.sfx.streak(n);
	}

	_birdJoin() {
		if (!this.flock.add(this.zp)) return;
		const c = this.flock.count;
		this.sfx.birdJoin(c);
		this.haptic(6);
		this._abil();
		if (c === GATHER) {
			this._pop('Sürü hazır!', 'gold');
			this.sfx.flockReady();
			this.haptic([10, 20, 10]);
			// ilk bölümde yalnızca kutlanır; ipucu, işe yarayacağı ikinci bölümde gelir
			if (this.li >= 1) this._hintLater('flock', 5.5);
		}
	}

	/** Sürü yeteneği: dört kuş toplanınca dokun, kuşlar Zifir'i birkaç saniye gölgelesin. */
	callFlock() {
		if (this.state !== 'play') return;
		if (!this.flock.ready) {
			if (this.flock.active > 0) return;
			this.sfx.ui();
			this._pop(`Sürü toplanıyor ${this.flock.count}/${GATHER}`, 'bad');
			return;
		}
		this.flock.activate(FLOCK_DUR, this.zp);
		this._flockOn = true;
		this.sfx.flockGo();
		this.haptic([15, 25, 15, 25, 40]);
		this.app.rig.shake = Math.max(this.app.rig.shake, 0.1);
		this._pop('Sürü!', 'gold');
		this.zifir.react?.('safe');
		if (this._hintKey === 'flock') {
			this.ui.hint(null);
			this._hintKey = null;
		}
		this._abil();
	}

	/** Yetenek düğmesinin durumu (yalnızca değişince arayüze gider). */
	_abil() {
		const f = this.flock;
		const key = f.count * 4 + (f.ready ? 1 : 0) + (f.active > 0 ? 2 : 0);
		if (key === this._abKey) return;
		this._abKey = key;
		this.ui.ability?.('flock', { count: f.count, max: GATHER, ready: f.ready, active: f.active > 0, dur: FLOCK_DUR });
	}

	/** Kısa yazı (seri, kıl payı...). Altın olmayanlar sık gelirse atlanır: ekran kalabalıklaşmasın. */
	_pop(text, kind = 'good') {
		const t = this.app.time;
		if (kind !== 'gold' && t - this._popT < 0.7) return;
		this._popT = t;
		this.ui.pop?.(text, kind);
	}

	_slow(k, t) {
		this._slowK = k;
		this._slowT = t;
	}

	/** Kilit yardımı: güneşin tomurcuğu aydınlatıp Zifir'i gölgede bıraktığı açı aralığını bul. */
	_lockAssist() {
		this._assistT = (this._assistT || 0) - 1;
		if (this._assistT > 0) return;
		this._assistT = 15; // ~yarım saniyede bir
		const lk = this.locks.pending(this.s);
		if (!lk) return;
		const p = this.curve.sample(this.s, {});
		const zAz = Math.atan2(p.z, p.x);
		const L = this._Lt || (this._Lt = V3());
		const ok = [];
		for (let k = 0; k < 72; k++) {
			const rel = (k / 72) * TAU - Math.PI;
			sunVector(zAz + rel, this.elev, L);
			let z = false;
			for (const h of [0.48, 0.86, 0.36]) if (!this.tester.blocked(p.x, p.y + h, p.z, L)) z = true;
			if (z) continue;
			let l = false;
			for (const h of [1.0, 1.7, 0.8]) if (!this.tester.blocked(lk.x, lk.y + h, lk.z, L)) l = true;
			if (l) ok.push(rel);
		}
		if (!ok.length) return;
		// güneşe en yakın kesintisiz aralık
		const cur = wrapAngle(this.sunAz - zAz);
		let best = null;
		let i = 0;
		while (i < ok.length) {
			let j = i;
			while (j + 1 < ok.length && ok[j + 1] - ok[j] < 0.1) j++;
			const mid = (ok[i] + ok[j]) / 2;
			const d = Math.abs(wrapAngle(mid - cur));
			if (!best || d < best.d) best = { a0: ok[i] - 0.04, a1: ok[j] + 0.04, d };
			i = j + 1;
		}
		this.ui.lockArc(best.a0, best.a1);
		this._arcOn = true;
	}

	/** Zifir'in kare durumu: her kare aynı nesne doldurulur (çöp toplayıcıya iş çıkmasın). */
	_zstate(p, moving, speed, hold, burn, lit, meter) {
		const z = this._zs || (this._zs = {});
		z.x = p.x;
		z.y = p.y;
		z.z = p.z;
		z.yaw = Math.atan2(p.tx, p.tz);
		z.moving = moving;
		z.speed = speed;
		z.hold = hold;
		z.burn = burn;
		z.lit = lit;
		z.meter = meter;
		return z;
	}

	_commonFx(dt) {
		this.fx.update(dt);
		this.petals.update(dt);
		this.app.sunAz = this.sunAz;
		this.app.elev = this.elev;
		this.app.focus.copy(this.zp);
	}

	_updateZifirOnly(dt, time, frozen) {
		if (frozen) return;
		const p = this.curve.sample(this.s, this._smp);
		if (this.state === 'complete' || this.state === 'ending') this.zifir.update(dt, time, this._zstate(p, false, 0, false, 0, 0, 1));
		this.flock.update(dt, time, this.zp, this.sunDir);
		this._commonFx(dt);
	}

	_updateOrbit(dt, time) {
		// başlık: kamera ağacın çevresinde yavaşça döner, güneş de döner; mevsimler sırayla akar
		const o = this._orbit;
		o.a += dt * 0.05;
		const rig = this.app.rig;
		rig.mode = 'manual';
		const r = this.app.rig.aspect < 1 ? o.r * 1.12 : o.r;
		rig.pos.set(Math.cos(o.a) * r, o.y + Math.sin(time * 0.1) * 3, Math.sin(o.a) * r);
		rig.look.set(0, o.ly, 0);
		this.sunAz = o.a + 1.1 + Math.sin(time * 0.07) * 0.6;
		this.elev = 30;
		const seasons = ['spring', 'summer', 'autumn', 'winter'];
		this._titleSeason += dt;
		if (this._titleSeason > 9) {
			this._titleSeason = 0;
			const next = seasons[(seasons.indexOf(this.envTo) + 1) % 4];
			this.envTo2(next, 3);
		}
		wind.str = 0.25;
		wind.gust = 0;
		this.elev = null;
		this.app.sunAz = this.sunAz;
		this.app.elev = null;
		this.sfx.season = this.envTo === 'night' ? 'night' : this.envTo;
		this.sfx.tick(dt, 0, 0.25, false);
		this.app.focus.set(0, 30, 0);
		this.app.idle = false;
		this.fx.update(dt);
		this.petals.update(dt);
	}

	_updateIntro(dt, time) {
		const rig = this.app.rig;
		const t = rig.cine ? rig.cine.t : 99;
		while (this._loreI < this._lore.length && t >= this._lore[this._loreI][0]) {
			this.ui.lore(this._lore[this._loreI][1]);
			this._loreI++;
		}
		if (t > 10.6) this.ui.lore(null);
		const p = this.curve.sample(this.s, this._smp);
		this.zp.set(p.x, p.y, p.z);
		this.zifir.update(dt, time, this._zstate(p, false, 0, false, 0, 0, 1));
		this.sunAz += dt * 0.12;
		this.elev = 34;
		this.app.sunAz = this.sunAz;
		this.app.elev = this.elev;
		this.app.focus.copy(this.zp);
		this.fx.update(dt);
		this.petals.update(dt);
		if (!rig.cine && this.state === 'intro') {
			this.prog.intro = true;
			this.store.set('progress', this.prog);
		}
	}

	// ------------------------------------------------------------------------------------------
	// Bitişler
	// ------------------------------------------------------------------------------------------
	_die() {
		this._set('dying');
		this.ui.hudOn(false);
		this.ui.hint(null);
		this.ui.gust(false);
		this.ui.streak?.(0);
		this.sfx.fail();
		this.sfx.lockCharge(null);
		this.sfx.music('soft');
		this.haptic([30, 40, 60]);
		this.app.rig.shake = Math.max(this.app.rig.shake, 0.32);
		this.flock.release(false);
		this._flockOn = false;
		this._slowT = 0;
		this.timeScale = 1;
		this.prog.fails[this.li] = (this.prog.fails[this.li] || 0) + 1;
		this.store.set('progress', this.prog);
		const t0 = performance.now();
		const zf = this.zifir;
		const p = this.zp.clone();
		const tick = () => {
			const t = Math.min(1, (performance.now() - t0) / 1300);
			zf.evaporate(t);
			if (Math.random() < 0.6) puffSteam(this.fx, p.x, p.y + 0.4, p.z, 1.3);
			this.app.wake();
			if (t < 1) requestAnimationFrame(tick);
			else {
				this._set('fail');
				this.G.uDanger.value = 0;
				this.ui.showFail({ progress: clamp((this.s - this.s0) / (this.s1 - this.s0), 0, 1), mercy: this.prog.fails[this.li] >= 1 });
			}
		};
		requestAnimationFrame(tick);
	}

	_win() {
		const L = this.level;
		this._set(L.finale ? 'gate' : 'won');
		this.ui.hudOn(false);
		this.ui.hint(null);
		this.ui.gust(false);
		this.G.uDanger.value = 0;
		if (this.zifir.celebrate) this.zifir.celebrate();
		else this.zifir.hop();
		this.sfx.win();
		this.sfx.lockCharge(null);
		this.sfx.music('soft');
		this.haptic([20, 40, 20, 40, 60]);
		this.app.rig.shake = Math.max(this.app.rig.shake, 0.12);
		// kuşlar kutlama uçuşuyla göğe dağılır (kullanılmadıysa sonraki bölümde geri gelir), an bir nefes ağırlaşır
		this._carryBirds = this.flock.active > 0 ? 0 : this.flock.count;
		this.flock.release(true);
		this._flockOn = false;
		this._slow(0.5, 0.45);
		this.ui.streak?.(0);
		// çiçek/yaprak yağmuru
		const p = this.zp;
		const cell = { spring: 0, summer: 3, autumn: 1, winter: 2 }[L.season];
		for (let i = 0; i < 60; i++) {
			const a = Math.random() * TAU;
			const r = Math.random() * 3.4;
			this.petals.emit(p.x + Math.cos(a) * r, p.y + 3 + Math.random() * 3.5, p.z + Math.sin(a) * r, (Math.random() - 0.5) * 1.2, -0.3 - Math.random() * 0.6, (Math.random() - 0.5) * 1.2, 3 + Math.random() * 1.5, 0.22, 0.2, 0.25, 0.6, 1, 1, 1, 1, cell, (Math.random() - 0.5) * 4);
		}
		burstSparkle(this.fx, p.x, p.y + 0.8, p.z, 36, [2.6, 2.0, 0.9]);
		burstSparkle(this.fx, p.x, p.y + 0.5, p.z, 18, [1.4, 1.1, 2.6]);
		if (!L.finale) this._heroCam();

		const drops = this.drops.total;
		const stars = [true, drops === 0 || this.got === drops, this.minMeter > 0.9];
		const nStars = stars.filter(Boolean).length;
		this.score += 50 + (stars[2] ? 50 : 0);
		const prev = this.prog.stars[this.li] || 0;
		// ışık tozu: bitirmek, damlalar, lekesizlik, en uzun gölge serisi, kıl payları
		const dust = 10 + this.got * 5 + (stars[2] ? 10 : 0) + (nStars === 3 ? 10 : 0) + Math.floor(this.best / 5) * 2 + this.nearN * 3;
		const gain = nStars > prev ? dust : Math.round(dust * 0.25);
		this.prog.stars[this.li] = Math.max(prev, nStars);
		this.prog.unlocked = Math.min(LEVEL_COUNT - 1, Math.max(this.prog.unlocked, this.li + 1));
		this.prog.dust += gain;
		this.prog.fails[this.li] = 0;
		const bestPrev = (this.prog.best || [])[this.li] || 0;
		(this.prog.best || (this.prog.best = []))[this.li] = Math.max(bestPrev, this.best);
		this.store.set('progress', this.prog);
		if (this.app.hooks.onReward) this.app.hooks.onReward({ level: this.li, stars: nStars, dust: gain, drops: this.got, streak: this.best });
		this._result = { title: L.title, kicker: L.kicker, stars, dust: gain, last: this.li === LEVEL_COUNT - 1, best: this.best, record: this.best > bestPrev && bestPrev > 0, score: this.score, near: this.nearN, unlocks: this.unlocks };

		if (L.finale) this._gateSeq();
		else
			setTimeout(() => {
				if (this.state !== 'won') return;
				this._set('complete');
				this.ui.showComplete(this._result);
			}, 1500);
	}

	/** Zafer anı: kamera Zifir'in önüne süzülür (yüzünü gördüğümüz bir kahraman çekimi). */
	_heroCam() {
		const rig = this.app.rig;
		// patikanın biraz ilerisinden, tahtaların üstünden geriye, Zifir'in yüzüne bakar (korkuluk araya girmez)
		// Zifir ekranın alt üçte birinde kalır: ortadaki sonuç kartının altında görünür
		const q = this.curve.sample(Math.min(this.curve.length, this.s + 3.6), {});
		const zp = this.zp;
		const r = Math.hypot(q.x, q.z) || 1;
		const pos = V3(q.x + (q.x / r) * 0.35, q.y + 1.7, q.z + (q.z / r) * 0.35);
		const look = V3(zp.x, zp.y + 1.35, zp.z);
		rig.play(
			[
				{ t: 0, pos: rig.pos.clone(), look: rig.look.clone() },
				{ t: 3.1, pos, look },
			],
			null
		);
	}

	/** Son bölüm: Zifir Kök Kapısı'ndan içeri girer, gece çöker, yıldızlar yanar. */
	_gateSeq() {
		const isl = this.world.island;
		const gp = isl.gatePos.clone();
		const start = this.zp.clone();
		const rig = this.app.rig;
		const out = isl.gateOut;
		const camEnd = gp.clone().addScaledVector(out, 14).add(V3(0, 4, 0));
		rig.play(
			[
				{ t: 0, pos: rig.pos.clone(), look: rig.look.clone() },
				{ t: 2.2, pos: gp.clone().addScaledVector(out, 9).add(V3(0, 2.5, 0)), look: gp.clone() },
				{ t: 6.5, pos: camEnd.add(V3(0, 16, 0)), look: V3(0, 22, 0), fov: 55 },
			],
			null
		);
		this.envTo2('night', 5);
		this.sfx.season = 'night';
		const t0 = performance.now();
		const zf = this.zifir;
		const tick = () => {
			const t = (performance.now() - t0) / 1000;
			const k = clamp((t - 0.6) / 1.6, 0, 1);
			const pos = start.clone().lerp(V3(gp.x, start.y, gp.z), k);
			zf.g.position.copy(pos);
			zf.setFade(1 - smoothstep(0.7, 1, k));
			this.world.gateMat.uniforms.uOpen.value = smoothstep(0, 1.2, t);
			if (t < 7) requestAnimationFrame(tick);
			else {
				zf.g.visible = false;
				this._set('ending');
				this.ui.showEnding(this.prog.dust);
			}
		};
		requestAnimationFrame(tick);
	}

	/** Ortam karışımı için o anki iki ön ayar ve oran. */
	envState() {
		const t = this.envT;
		return [this.envFrom, this.envTo, t * t * (3 - 2 * t)];
	}

	destroy() {
		window.removeEventListener('keydown', this._onKey);
		window.removeEventListener('keyup', this._onKey);
	}
}
