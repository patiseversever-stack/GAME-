// Sesler: hiç ses dosyası yok, hepsi Web Audio ile anında sentezlenir.
// Rüzgâr uğultusu, adım tıkırtısı, damla çanı, yanma cızırtısı, kuş cıvıltısı, zafer arpeji.
// Ana oyun kendi ses sistemini verirse (hooks.sfx) önce ona sorulur.

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

export class Sfx {
	constructor(hooks = {}) {
		this.hooks = hooks;
		this.ctx = null;
		this.on = true;
		this.season = 'spring';
		this._dropN = 0;
		this._birdT = 4;
	}

	/** Tarayıcılar sesi ilk dokunuşla açar. */
	unlock() {
		if (this.ctx) {
			if (this.ctx.state === 'suspended') this.ctx.resume();
			return;
		}
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		const c = new AC();
		this.ctx = c;
		this.master = c.createGain();
		this.master.gain.value = this.on ? 0.9 : 0;
		this.master.connect(c.destination);
		// beyaz gürültü tamponu (rüzgâr, adım, cızırtı)
		const len = c.sampleRate * 2;
		const buf = c.createBuffer(1, len, c.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
		this.noise = buf;
		// sürekli rüzgâr
		this.wind = this._loopNoise('lowpass', 520, 0.6);
		this.wind.g.gain.value = 0;
		// sürekli cızırtı (yanarken)
		this.sizz = this._loopNoise('highpass', 3200, 0.7);
		this.sizz.g.gain.value = 0;
	}

	_loopNoise(type, freq, q) {
		const c = this.ctx;
		const src = c.createBufferSource();
		src.buffer = this.noise;
		src.loop = true;
		const f = c.createBiquadFilter();
		f.type = type;
		f.frequency.value = freq;
		f.Q.value = q;
		const g = c.createGain();
		src.connect(f);
		f.connect(g);
		g.connect(this.master);
		src.start();
		return { src, f, g };
	}

	setOn(on) {
		this.on = on;
		if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
	}

	_host(name, a) {
		return this.hooks.sfx ? this.hooks.sfx(name, a) === true : false;
	}

	_tone(freq, t0, dur, vol, type = 'sine', partial = 0) {
		const c = this.ctx;
		const o = c.createOscillator();
		o.type = type;
		o.frequency.value = freq;
		const g = c.createGain();
		g.gain.setValueAtTime(0, t0);
		g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		o.connect(g);
		g.connect(this.master);
		o.start(t0);
		o.stop(t0 + dur + 0.05);
		if (partial) this._tone(freq * partial, t0, dur * 0.6, vol * 0.35, 'sine', 0);
	}

	_burst(t0, dur, freq, vol, type = 'bandpass') {
		const c = this.ctx;
		const s = c.createBufferSource();
		s.buffer = this.noise;
		const f = c.createBiquadFilter();
		f.type = type;
		f.frequency.value = freq;
		f.Q.value = 1.2;
		const g = c.createGain();
		g.gain.setValueAtTime(vol, t0);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		s.connect(f);
		f.connect(g);
		g.connect(this.master);
		s.start(t0, Math.random());
		s.stop(t0 + dur + 0.02);
	}

	step() {
		if (this._host('step') || !this.ctx) return;
		this._burst(this.ctx.currentTime, 0.05, 900 + Math.random() * 500, 0.05);
	}

	drop() {
		if (this._host('drop') || !this.ctx) return;
		const t = this.ctx.currentTime;
		const n = PENTA[Math.min(PENTA.length - 1, this._dropN++)];
		const f = 660 * Math.pow(2, n / 12);
		this._tone(f, t, 1.3, 0.16, 'sine', 2.76);
		this._tone(f * 2, t + 0.07, 0.9, 0.06, 'triangle');
	}

	resetDrops() {
		this._dropN = 0;
	}

	dropLost() {
		if (this._host('dropLost') || !this.ctx) return;
		const t = this.ctx.currentTime;
		this._burst(t, 0.35, 2600, 0.12, 'highpass');
		this._tone(420, t, 0.4, 0.06, 'triangle');
		this._tone(300, t + 0.1, 0.5, 0.05, 'triangle');
	}

	ui() {
		if (this._host('ui') || !this.ctx) return;
		this._tone(880, this.ctx.currentTime, 0.12, 0.05, 'sine');
	}

	win() {
		if (this._host('win') || !this.ctx) return;
		const t = this.ctx.currentTime;
		[0, 4, 7, 12, 16].forEach((n, i) => this._tone(523 * Math.pow(2, n / 12), t + i * 0.11, 1.6, 0.11, 'sine', 2));
		this._tone(261.6, t, 2.4, 0.06, 'triangle');
	}

	/** Işık kilidi açıldı: yumuşak bir akor. */
	unlockOpen() {
		if (this._host('unlock') || !this.ctx) return;
		const t = this.ctx.currentTime;
		[0, 7, 12, 16].forEach((n, i) => this._tone(392 * Math.pow(2, n / 12), t + i * 0.05, 1.4, 0.07, 'sine', 2));
	}

	fail() {
		if (this._host('fail') || !this.ctx) return;
		const t = this.ctx.currentTime;
		this._burst(t, 0.9, 1800, 0.14, 'highpass');
		[7, 4, 0].forEach((n, i) => this._tone(392 * Math.pow(2, n / 12), t + 0.15 + i * 0.16, 0.7, 0.07, 'triangle'));
	}

	/** Her kare: yanma ve rüzgâr seviyesi; ara sıra kuş sesi (bahar/yaz). */
	tick(dt, burn, windK, playing) {
		if (!this.ctx || !this.on) return;
		const t = this.ctx.currentTime;
		this.sizz.g.gain.setTargetAtTime(playing ? burn * 0.09 : 0, t, 0.05);
		this.wind.g.gain.setTargetAtTime(0.025 + windK * 0.05, t, 0.3);
		this.wind.f.frequency.setTargetAtTime(380 + windK * 500, t, 0.3);
		if ((this.season === 'spring' || this.season === 'summer') && playing) {
			this._birdT -= dt;
			if (this._birdT < 0) {
				this._birdT = 3 + Math.random() * 6;
				this._bird(t);
			}
		}
	}

	_bird(t) {
		const c = this.ctx;
		const n = 2 + ((Math.random() * 3) | 0);
		const base = 2200 + Math.random() * 1400;
		for (let i = 0; i < n; i++) {
			const o = c.createOscillator();
			const g = c.createGain();
			const t0 = t + i * 0.13;
			o.frequency.setValueAtTime(base, t0);
			o.frequency.exponentialRampToValueAtTime(base * 1.35, t0 + 0.05);
			o.frequency.exponentialRampToValueAtTime(base * 0.9, t0 + 0.09);
			g.gain.setValueAtTime(0, t0);
			g.gain.linearRampToValueAtTime(0.022, t0 + 0.01);
			g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
			o.connect(g);
			g.connect(this.master);
			o.start(t0);
			o.stop(t0 + 0.12);
		}
	}

	suspend() {
		if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
	}

	resume() {
		if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
	}
}
