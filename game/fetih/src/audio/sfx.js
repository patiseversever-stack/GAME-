// Fetih Ligi sesi: tamamen sentezlenmiş (dosya yok) WebAudio motoru.
//
// Sözleşme (korunur, yalnızca eklenir):
//   unlock()              ilk dokunuşta çağrılır; AudioContext'i kurar/devam ettirir
//   play(name, opts)      efekt çalar; hooks.sound(name, opts) true dönerse çalmaz
//   music(theme)          'menu' | 'match' | 'siege' | 'victory' | null
//   mute(on)
//   setMusicVolume(v), setSfxVolume(v)   0..1
//
// opts (hepsi isteğe bağlı): vol (0..1.5), rate, delay (sn), at (mutlak sn, ölçüm için),
//   n (kombo basamağı), left (kalan süre sn, tick için), urgent, dur (çark/yürüyüş süresi), tone ('bad'), short.
//
// Garanti: AudioContext yoksa, çökmüşse ya da sayfa gizliyse hiçbir çağrı istisna fırlatmaz.
import { Engine } from './engine.js';
import { Music, THEME_NAMES } from './music.js';
import { SOUNDS, SOUND_NAMES } from './sounds.js';
import { BANK_NAMES } from './dsp.js';

const STORE_KEY = 'fetih.audio';

function lowEnd() {
	try {
		const n = globalThis.navigator || {};
		return (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 2) || false;
	} catch (e) {
		return false;
	}
}

export class Sfx {
	constructor(hooks = {}, options = {}) {
		this.hooks = hooks || {};
		this.options = options;
		this.muted = false;
		this.e = new Engine({ low: options.low !== undefined ? options.low : lowEnd(), sync: !!options.ctx });
		this.music_ = new Music(this.e);
		this.want = null; // istenen müzik teması (kilit açılmadan önce de hatırlanır)
		this.last = Object.create(null);
		this.live = Object.create(null);
		this.hidden = false;
		this._bound = false;
		this._load();
		if (options.ctx) this.unlock();
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

	// ---------------------------------------------------------------- yaşam döngüsü

	unlock() {
		try {
			const e = this.e;
			if (!e.ctx) {
				const ctx = this.options.ctx || Engine.createContext();
				if (!ctx || !e.init(ctx)) return;
				this._bind();
				this._prewarm();
				if (!this.options.ctx) this.music_.start();
			}
			const ctx = e.ctx;
			if (ctx.state !== 'running' && !this.hidden && !this.options.ctx) {
				const p = ctx.resume();
				if (p && p.then) p.then(() => this._resumed(), () => {});
			}
			if (this.want && !this.music_.track) this.music_.set(this.want);
		} catch (err) {
			/* ses yoksa oyun sessiz devam eder */
		}
	}

	_resumed() {
		this.music_.resync();
		if (this.want && !this.music_.track && !this.muted) this.music_.set(this.want);
		if (!this.muted) this.music_.start();
	}

	// gizli sayfada bağlamı askıya al: pil ve CPU
	_bind() {
		if (this._bound || this.options.ctx || typeof document === 'undefined') return;
		this._bound = true;
		const on = () => {
			const hide = document.visibilityState === 'hidden';
			this.hidden = hide;
			const ctx = this.e.ctx;
			if (!ctx) return;
			try {
				if (hide) {
					this.music_.stopTimer();
					ctx.suspend();
				} else if (!this.muted) {
					const p = ctx.resume();
					if (p && p.then) p.then(() => this._resumed(), () => {});
				}
			} catch (err) {
				/* yok say */
			}
		};
		document.addEventListener('visibilitychange', on);
		window.addEventListener('pagehide', () => {
			this.hidden = true;
			try {
				this.music_.stopTimer();
				this.e.ctx.suspend();
			} catch (err) {
				/* yok say */
			}
		});
		window.addEventListener('pageshow', on);
	}

	// vuruşları ve çalgı örneklerini boşta ön üret: ilk çalışta takılma olmasın
	_prewarm() {
		const e = this.e;
		const names = ['woodTap', 'woodLow', 'dum', 'tek', ...BANK_NAMES.filter((n) => !['woodTap', 'woodLow', 'dum', 'tek'].includes(n))];
		if (e.sync || typeof setTimeout === 'undefined') {
			if (e.sync) for (const n of names) e.buf(n);
			return;
		}
		let k = 0;
		const next = () => {
			if (!e.ctx || k >= names.length) return;
			try {
				e.buf(names[k++]);
			} catch (err) {
				/* yok say */
			}
			setTimeout(next, 40);
		};
		setTimeout(next, 0);
	}

	// ---------------------------------------------------------------- efekt

	play(name, opts) {
		try {
			if (this.hooks.sound && this.hooks.sound(name, opts) === true) return false;
			if (this.muted) return false;
			const def = SOUNDS[name];
			if (!def) return false;
			const e = this.e;
			if (!e.ctx) return false;
			if (e.ctx.state === 'suspended' && !this.hidden && !this.options.ctx) {
				// tarayıcı askıya aldıysa bir sonraki jestte devam ettir
				this.unlock();
			}
			const o = opts || {};
			const now = e.ctx.currentTime;
			const t = o.at !== undefined ? o.at : now + (o.delay || 0) + 0.004;
			const last = this.last[name];
			if (last !== undefined && t >= last && t - last < def.cd) return false;
			// ad başına eşzamanlılık
			const live = (this.live[name] || (this.live[name] = [])).filter((x) => x > t - 0.001);
			if (live.length >= def.max) {
				this.live[name] = live;
				return false;
			}
			if (!e.admit(t, def.dur, def.prio)) return false;
			this.last[name] = t;
			live.push(t + def.dur);
			this.live[name] = live;
			// sesin kendi seviyesi: geçici gain üzerinden
			const vol = o.vol === undefined ? 1 : o.vol;
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
			if (pg) {
				if (typeof setTimeout !== 'undefined' && !this.options.ctx) setTimeout(() => e.freeGain(pg), (def.dur + (o.delay || 0) + 0.5) * 1000);
			}
			if (def.duck) e.duck(def.duck[0], def.duck[1], def.duck[2], t - now);
			return true;
		} catch (err) {
			return false;
		}
	}

	// ---------------------------------------------------------------- müzik

	music(theme) {
		const th = theme && THEME_NAMES.indexOf(theme) >= 0 ? theme : null;
		this.want = th;
		try {
			if (!this.e.ctx) return;
			if (this.muted) return;
			this.music_.set(th);
		} catch (err) {
			/* yok say */
		}
	}

	// ---------------------------------------------------------------- ses düzeyi

	mute(on) {
		this.muted = !!on;
		try {
			this.e.setMuted(this.muted);
			if (this.e.ctx) {
				if (this.muted) this.music_.stopTimer();
				else {
					this.music_.resync();
					if (this.want && !this.music_.track) this.music_.set(this.want);
					if (!this.options.ctx) this.music_.start();
				}
			}
		} catch (err) {
			/* yok say */
		}
		this._save();
	}

	setMusicVolume(v) {
		v = clamp01(v);
		this.e.setMusicVolume(v * 0.9);
		this._mv = v;
		this._save();
	}
	setSfxVolume(v) {
		v = clamp01(v);
		this.e.setSfxVolume(v);
		this._sv = v;
		this._save();
	}
	get musicVolume() {
		return this._mv === undefined ? 0.78 : this._mv;
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

	// ---------------------------------------------------------------- kalıcılık

	_load() {
		if (this.options.persist === false) return;
		try {
			const s = JSON.parse(globalThis.localStorage.getItem(STORE_KEY) || 'null');
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
		try {
			globalThis.localStorage.setItem(STORE_KEY, JSON.stringify({ m: this.musicVolume, s: this.sfxVolume, x: this.muted ? 1 : 0 }));
		} catch (err) {
			/* yok say */
		}
	}
}

function clamp01(v) {
	v = +v;
	return v > 0 ? (v < 1 ? v : 1) : 0;
}

export { SOUND_NAMES, THEME_NAMES };
