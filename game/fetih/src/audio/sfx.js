// Fetih Ligi sesi: tamamen sentezlenmiş (dosya yok) WebAudio motoru.
//
// Sözleşme (korunur, yalnızca eklenir):
//   unlock()              ilk dokunuşta çağrılır (kendiliğinden de bağlanır); AudioContext'i kurar/devam ettirir
//   play(name, opts)      efekt çalar; hooks.sound(name, opts) true dönerse çalmaz
//   music(theme)          'menu' | 'campaign' | 'match' | 'duel' | 'siege' | 'victory' | 'defeat' | null
//   mute(on)              sessize al/aç (kalıcı: store ya da localStorage)
//   setMusicVolume(v), setSfxVolume(v)   0..1
// Eklenenler: toggle(), muted, onChange(cb), preload(), prefetch(temalar), pause(), resume(), duck(), debug(), destroy().
//
// opts (hepsi isteğe bağlı): vol (0..1.5), rate, pan, delay (sn), at (mutlak sn, ölçüm için), bot (ses kısılır),
//   n (kombo ya da yıldız basamağı), left (kalan süre sn), speed (çark hızı), title (bayrak başlığı), id (joker), dur (yürüyüş),
//   soft (tower), attack (cue), on (letterbox), player (answered).
//
// Mimari: ağır sesler ve müzik açılışta çevrimdışı bağlamda pişirilir (bake.js, bank.js); çalarken tek AudioBufferSource.
// Pişmemiş efekt aynı tarifle canlı çalınır (sessizlik yok), arkada pişirilir. Müzik pişince başlar.
// Garanti: AudioContext yoksa, çökmüşse ya da sayfa gizliyse hiçbir çağrı istisna fırlatmaz.
import { Engine } from './engine.js';
import { Music } from './music.js';
import { THEME_NAMES } from './songs.js';
import { SOUNDS, SOUND_NAMES } from './sounds.js';
import { Bank } from './bank.js';
import { BANK_NAMES } from './dsp.js';

const STORE_KEY = 'fetih.audio';
const LIVE_HITS = ['woodTap', 'woodLow', 'rim', 'dbTek', 'dbDoum', 'dum', 'pop', 'tek'];

// Maç başında hemen gerekenler (öncelik 2); kalanlar boşta (öncelik 4)
const PRELOAD_A = [
	['banner', { title: 'FETİH' }],
	['banner', { title: 'YAYILMA' }],
	['castle'],
	['claim'],
	['question'],
	['rank'],
	['wheel'],
	['whoosh'],
	['vs'],
	['right', { n: 0 }],
	['wrong'],
	['reveal'],
	['timeout'],
	['attack'],
	['conquer'],
	['defend'],
	['nightFall'],
	['dawn'],
	['letterbox', { on: true }],
	['cue', { attack: true }],
	['paint'],
	['march', { dur: 1.2 }],
];

function lowEnd() {
	try {
		const n = globalThis.navigator || {};
		return !!((n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 2));
	} catch (e) {
		return false;
	}
}

const clamp01 = (v) => ((v = +v), v > 0 ? (v < 1 ? v : 1) : 0);

/** Ses değişkeni: tarifin `variant` işlevinden anahtar ve (nicemlenmiş) seçenekler. */
function variantOf(name, def, o) {
	if (!def.variant) return { key: name, v: null };
	const v = def.variant(o);
	let k = name + ':';
	for (const x in v) k += x + '=' + v[x] + ',';
	return { key: k, v };
}

export class Sfx {
	constructor(hooks = {}, options = {}) {
		this.hooks = hooks || {};
		this.options = options;
		this.low = options.low !== undefined ? options.low : lowEnd();
		this.muted = false;
		this.e = new Engine({ low: this.low });
		this.bank = new Bank({ low: this.low, can: options.bake !== false });
		this.music_ = new Music(this);
		this.bank.protect = () => [this.music_.playing, this.want, this.music_.theme].filter(Boolean);
		this.want = null; // istenen müzik teması (kilit açılmadan önce de hatırlanır)
		this.wantOpts = {};
		this.last = Object.create(null);
		this.live = Object.create(null);
		this.hidden = false;
		this.listeners = new Set();
		this._bound = false;
		this._armed = false;
		this._sus = 0;
		this._load();
		if (options.ctx) this.unlock();
		else this.armUnlock();
	}

	static get names() {
		return SOUND_NAMES.slice();
	}
	static get themes() {
		return THEME_NAMES.slice();
	}

	get ready() {
		return !!this.e.ctx;
	}

	/** Bağlam çalışıyor mu (sesler gerçekten duyuluyor mu). */
	get running() {
		return !!this.e.ctx && this.e.ctx.state === 'running';
	}

	// ---------------------------------------------------------------- yaşam döngüsü

	/**
	 * İlk dokunuşta bağlamı kurar ve devam ettirir. iOS/Android: kullanıcı jesti içinde çağrılmalı; bu yüzden sayfaya
	 * dokunma, tıklama, tuş olayları yakalanır (armUnlock) ve bağlam çalışana dek her jestte yeniden denenir.
	 */
	unlock() {
		try {
			const e = this.e;
			if (!e.ctx) {
				const ctx = this.options.ctx || Engine.createContext();
				if (!ctx || !e.init(ctx)) return;
				e.muted = this.muted;
				this._bind(ctx);
				this._prewarm();
			}
			const ctx = e.ctx;
			if (!this.options.ctx && !this.muted && !this.hidden && ctx.state !== 'running') this._resumeCtx();
			// iOS: bir kez sessiz tampon çal (ses yolunu tamamen açar)
			if (!this._silent && !this.options.ctx) {
				this._silent = true;
				try {
					const b = ctx.createBuffer(1, 1, 22050);
					const s = ctx.createBufferSource();
					s.buffer = b;
					s.connect(ctx.destination);
					s.start(0);
				} catch (err) {
					/* yok say */
				}
			}
			this.preload();
			if (this.want && !this.muted) this.music_.set(this.want, this.wantOpts);
		} catch (err) {
			/* ses yoksa oyun sessiz devam eder */
		}
	}

	_resumeCtx() {
		const ctx = this.e.ctx;
		if (!ctx || this.options.ctx) return;
		clearTimeout(this._sus);
		try {
			const p = ctx.resume();
			if (p && p.then) p.then(() => this._running(), () => this.armUnlock());
		} catch (err) {
			/* yok say */
		}
	}

	_running() {
		if (!this.e.ctx || this.e.ctx.state !== 'running') return;
		this.disarmUnlock();
		if (!this.muted && !this.hidden) {
			this.e.setMuted(false, 0.05);
			if (this.want) this.music_.set(this.want, this.wantOpts);
		}
	}

	/** İlk jestleri yakala (yakalama aşamasında: arayüz olayı durdursa bile görürüz). */
	armUnlock() {
		if (this._armed || typeof window === 'undefined' || this.options.ctx) return;
		this._armed = true;
		this._onGesture = () => {
			this.unlock();
			if (this.running) this.disarmUnlock();
		};
		for (const t of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(t, this._onGesture, { capture: true, passive: true });
	}

	disarmUnlock() {
		if (!this._armed) return;
		this._armed = false;
		for (const t of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.removeEventListener(t, this._onGesture, { capture: true });
	}

	/** Bağlam durumu ve sayfa görünürlüğü: gizliyken sessizce askıya al (pil, CPU); dönünce devam. */
	_bind(ctx) {
		if (this._bound || this.options.ctx || typeof document === 'undefined') return;
		this._bound = true;
		ctx.onstatechange = () => {
			if (ctx.state === 'running') this._running();
			else if (!this.hidden && !this.muted) this.armUnlock(); // iOS 'interrupted' (arama, ekran kilidi)
		};
		this._onVis = () => (document.visibilityState === 'hidden' ? this._hide() : this._show());
		this._onHide = () => this._hide();
		this._onShow = () => this._show();
		document.addEventListener('visibilitychange', this._onVis);
		window.addEventListener('pagehide', this._onHide);
		window.addEventListener('pageshow', this._onShow);
	}

	_hide() {
		if (this.hidden) return;
		this.hidden = true;
		this.bank.pause();
		this._suspendSoon();
	}

	_show() {
		if (!this.hidden && this.running) return;
		this.hidden = false;
		this.bank.resume();
		if (this.muted || !this.e.ctx) return;
		this._resumeCtx();
		// bazı tarayıcılar jest ister: açılmazsa ilk dokunuşta
		setTimeout(() => {
			if (!this.hidden && !this.muted && !this.running) this.armUnlock();
		}, 400);
	}

	/** Önce ana kazancı yumuşakça kıs, sonra bağlamı askıya al: ani kesilme tıkırtısı olmaz. */
	_suspendSoon() {
		const ctx = this.e.ctx;
		if (!ctx || this.options.ctx) return;
		try {
			this.e.setMuted(true, 0.015);
		} catch (err) {
			/* yok say */
		}
		clearTimeout(this._sus);
		this._sus = setTimeout(() => {
			if (!(this.hidden || this.muted)) return;
			try {
				ctx.suspend();
			} catch (err) {
				/* yok say */
			}
		}, 130);
	}

	/** Dışarıdan duraklat / devam (oyun kapanıp açılırsa). */
	pause() {
		this._hide();
	}
	resume() {
		this._show();
	}

	// canlı efektlerin vuruş örneklerini boşta ön üret: ilk çalışta takılma olmasın
	_prewarm() {
		const e = this.e;
		const names = [...LIVE_HITS, ...BANK_NAMES.filter((n) => LIVE_HITS.indexOf(n) < 0)];
		let k = 0;
		const next = () => {
			if (!e.ctx || k >= names.length) return;
			try {
				e.buf(names[k++]);
			} catch (err) {
				/* yok say */
			}
			if (typeof setTimeout === 'function') setTimeout(next, 30);
			else next();
		};
		if (typeof setTimeout === 'function') setTimeout(next, 0);
		else next();
	}

	// ---------------------------------------------------------------- pişirme

	/** Pişirmeyi başlat: önce istenen müzik, sonra temel efektler, boşta kalanlar. Çok kez çağrılabilir. */
	preload() {
		if (this._pre || !this.bank.can || this.options.preload === false) return;
		this._pre = true;
		const b = this.bank;
		b.requestMusic(this.want || 'menu', 0);
		for (const [n, o] of PRELOAD_A) this._request(n, o || {}, 2);
		b.requestMusic('match', 3);
		for (const n of SOUND_NAMES) {
			const def = SOUNDS[n];
			if (def.live) continue;
			if (def.all) for (const o of def.all()) this._request(n, o, 4);
			else this._request(n, {}, 4);
		}
		b.requestMusic('campaign', 4);
		b.requestMusic('duel', 4);
	}

	/** Yakında gerekecek temaları önceden pişir (bellek tavanı korunur). */
	prefetch(list) {
		if (!this.bank.can) return;
		for (const t of list || []) if (THEME_NAMES.indexOf(t) >= 0 && !this.bank.music.has(t)) this.bank.requestMusic(t, 3);
	}

	_request(name, o, prio) {
		const def = SOUNDS[name];
		if (!def || def.live) return;
		const { key, v } = variantOf(name, def, o);
		if (this.bank.sfx.has(key)) return;
		this.bank.requestSfx(key, name, v || {}, prio);
	}

	// ---------------------------------------------------------------- efekt

	play(name, opts) {
		try {
			if (this.hooks.sound && this.hooks.sound(name, opts) === true) return false;
			if (this.muted) return false;
			const def = SOUNDS[name];
			if (!def) return false;
			const e = this.e;
			const ctx = e.ctx;
			if (!ctx) return false;
			if (!this.options.ctx && ctx.state !== 'running') {
				// askıdaysa (tarayıcı kısıtı) bu jestte devam ettirmeyi dene; sesi biriktirme
				if (!this.hidden) this.unlock();
				return false;
			}
			const o = opts || {};
			const now = ctx.currentTime;
			const t = o.at !== undefined ? o.at : now + (o.delay || 0) + 0.004;
			const last = this.last[name];
			if (last !== undefined && t >= last && t - last < def.cd) return false;
			// ad başına eşzamanlılık (yerinde sıkıştırılır: ayırma yok)
			const arr = this.live[name] || (this.live[name] = []);
			let n = 0;
			for (let i = 0; i < arr.length; i++) if (arr[i] > t) arr[n++] = arr[i];
			arr.length = n;
			if (n >= def.max) return false;
			if (!e.admit(t, def.dur, def.prio)) return false;
			this.last[name] = t;
			arr.push(t + def.dur);
			const vol = (o.vol === undefined ? 1 : o.vol) * (o.bot ? 0.55 : 1);
			if (def.intensity !== undefined) this.music_.intensity(def.intensity);
			// pişmiş ses varsa onu çal; yoksa aynı tarifi canlı çal ve arkada pişir
			let played = false;
			if (!def.live && this.bank.can) {
				const { key, v } = variantOf(name, def, o);
				const b = this.bank.sfx.get(key);
				if (b) {
					let rate = o.rate || 1;
					if (def.vary) rate *= 1 + (e.r() - 0.5) * 0.03;
					e.shot(b.buf, t, vol * b.gain, rate, o.pan || 0, e.sfxIn);
					played = true;
				} else this.bank.requestSfx(key, name, v || {}, 1);
				if (!played) this._live(def, e, t, v ? { ...o, ...v } : o, vol);
			} else this._live(def, e, t, o, vol);
			if (def.duck) e.duck(def.duck[0], def.duck[1], def.duck[2], t - now);
			if (def.music) this.music(def.music[0], { delay: def.music[1] });
			return true;
		} catch (err) {
			return false;
		}
	}

	// canlı tarif: sesin kendi seviyesi geçici gain üzerinden
	_live(def, e, t, o, vol) {
		let pg = null;
		if (vol !== 1) {
			pg = e.gain(vol);
			pg.connect(e.sfxIn);
			e.dest = pg;
		}
		try {
			def.fn(e, t, o);
		} finally {
			e.dest = e.sfxIn;
		}
		if (pg && typeof setTimeout === 'function' && !this.options.ctx) setTimeout(() => e.freeGain(pg), (def.dur + (o.delay || 0) + 0.8) * 1000);
	}

	// ---------------------------------------------------------------- müzik

	/** theme: ad ya da null (sus). o: {fade, delay, vol}. Kilit açılmadan önce de çağrılabilir (hatırlanır, pişirme başlar). */
	music(theme, o = {}) {
		const th = theme && THEME_NAMES.indexOf(theme) >= 0 ? theme : null;
		this.want = th;
		this.wantOpts = o || {};
		try {
			if (th && !this.e.ctx && this.bank.can) this.bank.requestMusic(th, 0);
			if (!this.e.ctx || this.muted) return;
			this.music_.set(th, this.wantOpts);
		} catch (err) {
			/* yok say */
		}
	}

	/** Gerilim 0..1: düello müziğinin ek katmanı (süre azalınca açılır). */
	intensity(x) {
		this.music_.intensity(x);
	}

	// ---------------------------------------------------------------- ses düzeyi

	mute(on) {
		on = !!on;
		if (on === this.muted) {
			this._save();
			return;
		}
		this.muted = on;
		try {
			const e = this.e;
			e.muted = on;
			if (e.ctx && !this.options.ctx) {
				if (on) this._suspendSoon();
				else {
					clearTimeout(this._sus);
					this._resumeCtx();
					e.setMuted(false, 0.05);
					if (this.want) this.music_.set(this.want, this.wantOpts);
				}
			} else if (e.ctx) e.setMuted(on);
		} catch (err) {
			/* yok say */
		}
		this._save();
		this._emit();
	}

	toggle() {
		this.mute(!this.muted);
		return this.muted;
	}

	/** Ses ayarı değişince çağrılır (sessiz düğmesi simgesi). Dönen: iptal işlevi. */
	onChange(cb) {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	_emit() {
		for (const cb of this.listeners) {
			try {
				cb(this);
			} catch (err) {
				/* yok say */
			}
		}
	}

	setMusicVolume(v) {
		v = clamp01(v);
		this.e.setMusicVolume(v * 0.9);
		this._mv = v;
		this._save();
		this._emit();
	}
	setSfxVolume(v) {
		v = clamp01(v);
		this.e.setSfxVolume(v);
		this._sv = v;
		this._save();
		this._emit();
	}
	get musicVolume() {
		return this._mv === undefined ? 0.7 : this._mv;
	}
	get sfxVolume() {
		return this._sv === undefined ? 0.9 : this._sv;
	}

	// büyük anlarda dışarıdan müziği kıs
	duck(depth, hold, rel) {
		try {
			this.e.duck(depth, hold, rel);
		} catch (err) {
			/* yok say */
		}
	}

	// ---------------------------------------------------------------- kalıcılık (src/core/store.js ya da localStorage)

	_load() {
		if (this.options.persist === false) return;
		try {
			const st = this.options.store;
			const s = st && typeof st.get === 'function' ? st.get('audio') : JSON.parse(globalThis.localStorage.getItem(STORE_KEY) || 'null');
			if (!s) return;
			if (typeof s.m === 'number') {
				this._mv = clamp01(s.m);
				this.e.musicVol = this._mv * 0.9;
			}
			if (typeof s.s === 'number') {
				this._sv = clamp01(s.s);
				this.e.sfxVol = this._sv;
			}
			if (s.x) {
				this.muted = true;
				this.e.muted = true;
			}
		} catch (err) {
			/* depolama yok ya da bozuk */
		}
	}

	_save() {
		if (this.options.persist === false) return;
		const s = { m: this.musicVolume, s: this.sfxVolume, x: this.muted ? 1 : 0 };
		try {
			const st = this.options.store;
			if (st && typeof st.set === 'function') st.set('audio', s);
			else globalThis.localStorage.setItem(STORE_KEY, JSON.stringify(s));
		} catch (err) {
			/* yok say */
		}
	}

	// ---------------------------------------------------------------- hata ayıklama ve kapanış

	debug() {
		const b = this.bank;
		return {
			ctx: this.e.ctx ? this.e.ctx.state : null,
			muted: this.muted,
			hidden: this.hidden,
			low: this.low,
			want: this.want,
			playing: this.music_.playing,
			canBake: b.can,
			sfx: b.sfx.size,
			music: [...b.music.keys()],
			queue: b.q.length,
			running: b.run ? b.run.key : null,
			failed: [...b.fail],
			bytes: b.bytes,
		};
	}

	destroy() {
		try {
			this.disarmUnlock();
			clearTimeout(this._sus);
			if (this._bound) {
				document.removeEventListener('visibilitychange', this._onVis);
				window.removeEventListener('pagehide', this._onHide);
				window.removeEventListener('pageshow', this._onShow);
			}
			this.bank.pause();
			if (this.e.ctx && !this.options.ctx) this.e.ctx.close();
		} catch (err) {
			/* yok say */
		}
	}
}

export { SOUND_NAMES, THEME_NAMES };
