// Ses (ilk sürüm): domino tıkırtısı, yerleştirme, büyük taş gümlemesi, kazanma.
// Hepsi WebAudio ile anında üretilir; ses dosyası yok. İlk dokunuşta açılır.

export class Sfx {
	constructor(hooks = {}) {
		this.hooks = hooks;
		this.muted = false;
		this.ctx = null;
		this._noise = null;
		this._voices = 0;
	}

	unlock() {
		if (this.ctx) {
			if (this.ctx.state === 'suspended') this.ctx.resume();
			return;
		}
		try {
			const C = window.AudioContext || window.webkitAudioContext;
			if (!C) return;
			this.ctx = new C();
			const comp = this.ctx.createDynamicsCompressor();
			comp.threshold.value = -14;
			comp.ratio.value = 4;
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.8;
			this.master.connect(comp).connect(this.ctx.destination);
			const len = this.ctx.sampleRate * 0.25;
			const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
			const ch = buf.getChannelData(0);
			for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
			this._noise = buf;
			document.addEventListener('visibilitychange', () => {
				if (!this.ctx) return;
				if (document.visibilityState === 'hidden') this.ctx.suspend();
				else this.ctx.resume();
			});
		} catch (e) {
			this.ctx = null;
		}
	}

	mute(on) {
		this.muted = !!on;
		if (this.master) this.master.gain.value = on ? 0 : 0.8;
	}

	_click(t, freq, q, gain, dur) {
		const c = this.ctx;
		const src = c.createBufferSource();
		src.buffer = this._noise;
		src.playbackRate.value = 0.8 + Math.random() * 0.4;
		const bp = c.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = freq;
		bp.Q.value = q;
		const g = c.createGain();
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		src.connect(bp).connect(g).connect(this.master);
		src.start(t, Math.random() * 0.2, dur + 0.02);
		this._voices++;
		src.onended = () => this._voices--;
	}

	_tone(t, f0, f1, gain, dur, type = 'sine') {
		const c = this.ctx;
		const o = c.createOscillator();
		o.type = type;
		o.frequency.setValueAtTime(f0, t);
		o.frequency.exponentialRampToValueAtTime(f1, t + dur);
		const g = c.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g).connect(this.master);
		o.start(t);
		o.stop(t + dur + 0.05);
	}

	play(name, o = {}) {
		if (this.hooks.sound && this.hooks.sound(name, o)) return;
		if (!this.ctx || this.muted) return;
		const t = this.ctx.currentTime;
		if (name === 'click') {
			if (this._voices > 10) return;
			const s = o.size || 1;
			this._click(t, 3200 / Math.sqrt(s) + Math.random() * 600, 3.5, 0.35 * Math.min(1.6, Math.sqrt(s)), 0.045 * Math.sqrt(s));
		} else if (name === 'place') {
			this._click(t, 1800, 2, 0.5, 0.08);
			this._tone(t, o.perfect ? 880 : 660, o.perfect ? 1320 : 880, 0.18, 0.18, 'triangle');
			if (o.perfect) this._tone(t + 0.07, 1320, 1760, 0.12, 0.22, 'triangle');
		} else if (name === 'thud') {
			const s = o.size || 3;
			this._tone(t, 120 / Math.sqrt(s / 3), 45, 0.6, 0.45, 'sine');
			this._click(t, 500, 1, 0.5, 0.25);
		} else if (name === 'start') {
			this._tone(t, 520, 780, 0.15, 0.2, 'triangle');
		} else if (name === 'miss') {
			this._tone(t, 330, 180, 0.2, 0.3, 'square');
		} else if (name === 'win') {
			[523, 659, 784, 1047].forEach((f, i) => this._tone(t + i * 0.11, f, f * 1.01, 0.18, 0.5, 'triangle'));
		} else if (name === 'fail') {
			[392, 330, 262].forEach((f, i) => this._tone(t + i * 0.16, f, f * 0.98, 0.16, 0.5, 'triangle'));
		}
	}
}
