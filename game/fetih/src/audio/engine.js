// Ses motoru: AudioContext, ana karıştırıcı (sıkıştırıcı + yumuşak sınırlayıcı), müzik/efekt hatları,
// yankı, ducking, ses havuzu ve eşzamanlılık sınırı. Hiçbir yerde istisna fırlatmaz.
import { rng, buildSample, pluckSample, BANK_RATE } from './dsp.js';

const POOL_MAX = 64;
const MASTER = 0.55; // sıkıştırıcı öncesi pay: Chrome sıkıştırıcısı kendi telafi kazancını ekler

export class Engine {
	constructor({ ctx = null, low = false, sync = false } = {}) {
		this.ctx = null;
		this.low = low; // düşük cihaz: yankı yok, daha az ses
		this.sync = sync; // çevrimdışı ölçümde örnekleri hemen üret
		this.r = rng(0xfe71);
		this.bufs = new Map();
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
			for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 1.15) / Math.tanh(1.15) * 0.97;
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
			// yankı (ping-pong gecikme): düşük cihazda kurulmaz
			this.echoIn = null;
			if (!this.low) {
				const eIn = c.createGain();
				const dl = c.createDelay(1);
				const dr = c.createDelay(1);
				dl.delayTime.value = 0.19;
				dr.delayTime.value = 0.29;
				const fa = c.createGain();
				const fb = c.createGain();
				fa.gain.value = fb.gain.value = 0.36;
				const lp = c.createBiquadFilter();
				lp.type = 'lowpass';
				lp.frequency.value = 3200;
				const out = c.createGain();
				out.gain.value = 0.8;
				const pl = c.createStereoPanner();
				const pr = c.createStereoPanner();
				pl.pan.value = -0.65;
				pr.pan.value = 0.65;
				eIn.connect(dl);
				dl.connect(fa);
				fa.connect(lp);
				lp.connect(dr);
				dr.connect(fb);
				fb.connect(dl);
				dl.connect(pl);
				dr.connect(pr);
				pl.connect(out);
				pr.connect(out);
				out.connect(this.master);
				const ms = c.createGain();
				ms.gain.value = 0.2;
				this.musicIn.connect(ms);
				ms.connect(eIn);
				const ss = c.createGain();
				ss.gain.value = 0.1;
				this.sfxIn.connect(ss);
				ss.connect(eIn);
				this.echoIn = eIn;
			}
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
		if (this.ctx) this.musicIn.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
	}
	setSfxVolume(v) {
		this.sfxVol = v;
		if (this.ctx) this.sfxIn.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
	}
	setMuted(on) {
		this.muted = on;
		if (this.ctx) this.master.gain.setTargetAtTime(on ? 0 : MASTER, this.ctx.currentTime, 0.04);
	}

	// Büyük anlarda müziği kıs: depth 0..1, hold sn, rel sn
	duck(depth = 0.5, hold = 0.6, rel = 0.8, at = 0) {
		if (!this.ctx) return;
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
		if (pan) {
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

	buf(name) {
		let b = this.bufs.get(name);
		if (b) return b;
		const d = buildSample(name, BANK_RATE);
		if (!d) return null;
		b = this.ctx.createBuffer(1, d.length, BANK_RATE);
		b.getChannelData(0).set(d);
		this.bufs.set(name, b);
		return b;
	}

	// vuruş örneğini çal
	hit(name, t, vol = 1, rate = 1, pan = 0, to = null) {
		const b = this.buf(name);
		if (!b) return;
		const s = this.ctx.createBufferSource();
		s.buffer = b;
		s.playbackRate.value = rate;
		const g = this.gain(vol);
		s.connect(g);
		this._play(s, g, to, t, 0, pan);
	}

	// tel çal (bağlama/kanun), freq Hz
	pluck(kind, freq, t, vol = 0.6, pan = 0, to = null, detune = 0) {
		const key = kind + ':' + Math.round(freq * 20);
		let b = this.bufs.get(key);
		if (!b) {
			const d = pluckSample(kind, freq);
			b = this.ctx.createBuffer(1, d.data.length, d.rate);
			b.getChannelData(0).set(d.data);
			this.bufs.set(key, b);
			if (this.bufs.size > 140) {
				// en eski telleri at
				for (const k of this.bufs.keys()) {
					if (k.indexOf(':') > 0) {
						this.bufs.delete(k);
						break;
					}
				}
			}
		}
		const s = this.ctx.createBufferSource();
		s.buffer = b;
		if (detune) s.detune.value = detune;
		const g = this.gain(vol);
		s.connect(g);
		this._play(s, g, to, t, 0, pan);
	}

	// ses dalgası: frekans süpürmeli, zarflı
	// o: {a: atak, bus, pan, curve:'exp'|'lin', det}
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
		let src = s;
		if (o.lp) {
			const f = c.createBiquadFilter();
			f.type = 'lowpass';
			f.frequency.value = o.lp;
			s.connect(f);
			f.connect(g);
		} else s.connect(g);
		this._play(src, g, o.to, t, t + dur + 0.03, o.pan || 0);
	}

	// filtreli gürültü: f0→f1 süpürme
	// o: {type, q, a, to, pan, off}
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
		s.start(t, this.r() * 1.5);
		// _play start çağırır; burada kendi başlatmamız var
		let tail = g;
		let pn = null;
		if (o.pan) {
			pn = c.createStereoPanner();
			pn.pan.value = o.pan;
			g.connect(pn);
			tail = pn;
		}
		tail.connect(o.to || this.dest);
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

	// Paylaşılan titreşim (vibrato) kaynağı: çıkışı sent cinsinden; sesler detune'a bağlar.
	makeVibrato(rate = 5.4, cents = 14) {
		const c = this.ctx;
		const o = c.createOscillator();
		o.frequency.value = rate;
		const g = c.createGain();
		g.gain.value = cents;
		o.connect(g);
		o.start();
		return { osc: o, out: g };
	}
}
