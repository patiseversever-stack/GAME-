// Canlı ses motoru (gerçek AudioContext): ana karıştırıcı (sıkıştırıcı + yumuşak sınırlayıcı), efekt ve müzik hatları,
// ducking, ses havuzu ve eşzamanlılık sınırı. Kare başına iş yok; yalnızca olay anında birkaç düğüm. Hiçbir yerde
// istisna fırlatmaz.
//
// Ağır sesler ve müzik burada çalınmaz: bake.js bunları JS'te (synth.js) pişirip AudioBuffer yapar; çalarken tek
// AudioBufferSource yeter. Bu motor (a) pişmiş sesi çalar, (b) henüz pişmemiş efekti aynı tarifle canlı çalar.
import { rng, buildSample, pluckSample, BANK_RATE } from './dsp.js';

const POOL_MAX = 64;
const MASTER = 0.55; // sıkıştırıcı öncesi pay: Chrome sıkıştırıcısı kendi telafi kazancını ekler

// Bağlamlar arası paylaşılan AudioBuffer'lar (spesifikasyon izin verir): vuruş ve tel örnekleri bir kez kurulur.
const SHARED = new Map();
const SHARED_PLUCK = new Map();

export class Engine {
	/** ctx: AudioContext (çevrimdışı sınama için OfflineAudioContext de olur). low: düşük cihaz (daha az düğüm). */
	constructor({ ctx = null, low = false, seed = 0xfe71 } = {}) {
		this.ctx = null;
		this.low = low;
		this.r = rng(seed);
		this.pool = [];
		this.voices = [];
		this.musicVol = 0.7;
		this.sfxVol = 0.9;
		this.muted = false;
		this.noiseBuf = null;
		if (ctx) this.init(ctx);
	}

	static createContext() {
		const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!AC) return null;
		try {
			return new AC({ latencyHint: 'interactive' });
		} catch (e) {
			try {
				return new AC();
			} catch (e2) {
				return null;
			}
		}
	}

	get now() {
		return this.ctx ? this.ctx.currentTime : 0;
	}

	init(ctx) {
		if (this.ctx) return true;
		try {
			const c = ctx;
			this.ctx = c;
			// ana hat: toplam → sıkıştırıcı → yumuşak sınırlayıcı → çıkış
			this.master = c.createGain();
			this.master.gain.value = this.muted ? 0 : MASTER;
			this.comp = c.createDynamicsCompressor();
			this.comp.threshold.value = -16;
			this.comp.knee.value = 14;
			this.comp.ratio.value = 4;
			this.comp.attack.value = 0.003;
			this.comp.release.value = 0.2;
			this.clip = c.createWaveShaper();
			const curve = new Float32Array(1024);
			for (let i = 0; i < curve.length; i++) curve[i] = (Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 1.15) / Math.tanh(1.15)) * 0.97;
			this.clip.curve = curve;
			this.master.connect(this.comp);
			this.comp.connect(this.clip);
			this.clip.connect(c.destination);
			// efekt ve müzik hatları
			this.sfxIn = c.createGain();
			this.sfxIn.gain.value = this.sfxVol;
			this.sfxIn.connect(this.master);
			this.dest = this.sfxIn;
			this.musicIn = c.createGain();
			this.musicIn.gain.value = this.musicVol;
			this.duckG = c.createGain();
			this.musicIn.connect(this.duckG);
			this.duckG.connect(this.master);
			// ortak gürültü
			const n = Math.floor(c.sampleRate * 2);
			const nb = c.createBuffer(1, n, c.sampleRate);
			const d = nb.getChannelData(0);
			const rr = rng(777);
			for (let i = 0; i < n; i++) d[i] = rr() * 2 - 1;
			this.noiseBuf = nb;
			return true;
		} catch (e) {
			this.ctx = null;
			return false;
		}
	}

	// ---------------------------------------------------------------- hat ayarları

	setMusicVolume(v) {
		this.musicVol = v;
		if (this.ctx && this.musicIn) this.musicIn.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
	}
	setSfxVolume(v) {
		this.sfxVol = v;
		if (this.ctx && this.sfxIn) this.sfxIn.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
	}
	/** Sessize al / aç: ana kazanç yumuşakça iner ve çıkar (tıkırtı yok). tc: zaman sabiti (sn). */
	setMuted(on, tc = 0.04) {
		this.muted = on;
		if (this.ctx && this.master) this.master.gain.setTargetAtTime(on ? 0 : MASTER, this.ctx.currentTime, tc);
	}

	// Büyük anlarda müziği kıs: depth 0..1, hold sn, rel sn
	duck(depth = 0.5, hold = 0.6, rel = 0.8, at = 0) {
		if (!this.ctx || !this.duckG) return;
		const g = this.duckG.gain;
		const t = this.ctx.currentTime + at;
		try {
			g.cancelScheduledValues(t);
			g.setValueAtTime(Math.max(0.05, Math.min(1, g.value)), t);
			g.setTargetAtTime(1 - depth, t, 0.025);
			g.setTargetAtTime(1, t + hold, rel / 3);
		} catch (e) {
			/* yok say */
		}
	}

	// ---------------------------------------------------------------- ses havuzu

	gain(v = 1) {
		const g = this.pool.pop() || this.ctx.createGain();
		g.gain.cancelScheduledValues(0);
		g.gain.value = v;
		return g;
	}
	freeGain(g) {
		try {
			g.disconnect();
		} catch (e) {
			/* yok say */
		}
		if (this.pool.length < POOL_MAX) this.pool.push(g);
	}

	// Eşzamanlılık: t anında çalan ses sayısı sınırı aşıyorsa, öncelik düşük olan düşer.
	admit(t, dur, prio = 1) {
		const v = this.voices;
		const now = this.ctx.currentTime - 0.1;
		for (let i = v.length - 1; i >= 0; i--) if (v[i].e < now) v.splice(i, 1);
		let n = 0;
		for (let i = 0; i < v.length; i++) if (v[i].s <= t && v[i].e > t) n++;
		const cap = this.low ? 12 : 22;
		if (n >= cap + (prio >= 3 ? 8 : 0)) return false;
		if (n >= cap * 0.7 && prio <= 0) return false;
		v.push({ s: t, e: t + dur });
		return true;
	}

	// ---------------------------------------------------------------- yardımcı sesler

	// bir kaynağı gain'e bağlayıp çalar; bitince gain havuza döner
	_play(src, g, to, t, stop, pan = 0, extra = null) {
		let tail = g;
		let pn = null;
		if (pan && this.ctx.createStereoPanner) {
			pn = this.ctx.createStereoPanner();
			pn.pan.value = pan;
			g.connect(pn);
			tail = pn;
		}
		tail.connect(to || this.dest);
		src.onended = () => {
			try {
				src.disconnect();
			} catch (e) {
				/* yok say */
			}
			if (pn) {
				try {
					pn.disconnect();
				} catch (e) {
					/* yok say */
				}
			}
			this.freeGain(g);
			if (extra) extra();
		};
		src.start(t);
		if (stop) src.stop(stop);
	}

	/** Vuruş örneği (paylaşılan AudioBuffer). */
	buf(name) {
		let b = SHARED.get(name);
		if (b) return b;
		const d = buildSample(name, BANK_RATE);
		if (!d) return null;
		b = this.ctx.createBuffer(1, d.length, BANK_RATE);
		b.getChannelData(0).set(d);
		SHARED.set(name, b);
		return b;
	}

	/** Hazır (pişirilmiş ya da örnek) tamponu çal. */
	shot(buf, t, vol = 1, rate = 1, pan = 0, to = null) {
		if (!buf) return;
		const s = this.ctx.createBufferSource();
		s.buffer = buf;
		if (rate !== 1) s.playbackRate.value = rate;
		const g = this.gain(vol);
		s.connect(g);
		this._play(s, g, to, t, 0, pan);
	}

	// vuruş örneğini çal
	hit(name, t, vol = 1, rate = 1, pan = 0, to = null) {
		this.shot(this.buf(name), t, vol, rate, pan, to);
	}

	// tel çal (bağlama/kanun/tambur), freq Hz
	pluck(kind, freq, t, vol = 0.6, pan = 0, to = null, detune = 0) {
		const key = kind + ':' + Math.round(freq * 20);
		let b = SHARED_PLUCK.get(key);
		if (!b) {
			const d = pluckSample(kind, freq);
			b = this.ctx.createBuffer(1, d.data.length, d.rate);
			b.getChannelData(0).set(d.data);
			SHARED_PLUCK.set(key, b);
			if (SHARED_PLUCK.size > 220) SHARED_PLUCK.delete(SHARED_PLUCK.keys().next().value); // en eski teli at
		}
		const s = this.ctx.createBufferSource();
		s.buffer = b;
		if (detune) s.detune.value = detune;
		const g = this.gain(vol);
		s.connect(g);
		this._play(s, g, to, t, 0, pan);
	}

	// ses dalgası: frekans süpürmeli, zarflı
	// o: {a: atak, to, pan, lp, sweep}
	tone(type, f0, f1, t, dur, vol, o = {}) {
		const c = this.ctx;
		const s = c.createOscillator();
		s.type = type;
		s.frequency.setValueAtTime(f0, t);
		if (f1 && f1 !== f0) s.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * (o.sweep || 1));
		const a = o.a === undefined ? 0.004 : o.a;
		const g = this.gain(0.0001);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(vol, t + a);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		if (o.lp) {
			const f = c.createBiquadFilter();
			f.type = 'lowpass';
			f.frequency.value = o.lp;
			s.connect(f);
			f.connect(g);
		} else s.connect(g);
		this._play(s, g, o.to, t, t + dur + 0.03, o.pan || 0);
	}

	// filtreli gürültü: f0→f1 süpürme
	// o: {type, q, a, to, pan, hold}
	noise(t, dur, vol, f0, f1, o = {}) {
		const c = this.ctx;
		const s = c.createBufferSource();
		s.buffer = this.noiseBuf;
		s.loop = true;
		const f = c.createBiquadFilter();
		f.type = o.type || 'bandpass';
		f.Q.value = o.q === undefined ? 1 : o.q;
		f.frequency.setValueAtTime(f0, t);
		if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
		const a = o.a === undefined ? 0.01 : o.a;
		const g = this.gain(0.0001);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(vol, t + a);
		if (o.hold) g.gain.setValueAtTime(vol, t + o.hold);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		s.connect(f);
		f.connect(g);
		let tail = g;
		let pn = null;
		if (o.pan && c.createStereoPanner) {
			pn = c.createStereoPanner();
			pn.pan.value = o.pan;
			g.connect(pn);
			tail = pn;
		}
		tail.connect(o.to || this.dest);
		s.start(t, this.r() * 1.5);
		s.stop(t + dur + 0.03);
		s.onended = () => {
			try {
				s.disconnect();
				f.disconnect();
				if (pn) pn.disconnect();
			} catch (e) {
				/* yok say */
			}
			this.freeGain(g);
		};
	}
}
