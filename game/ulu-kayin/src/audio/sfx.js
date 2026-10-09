// Sesler ve müzik: hiç ses dosyası yok, hepsi Web Audio ile anında sentezlenir.
//
// Müzik: her mevsimin kendi pentatonik dizisi, temposu ve tınısıyla üretilen yumuşak bir zemin
// (uzun akor yastığı, bas, çan ezgisi). Gölge serisi uzadıkça müzik zenginleşir (arpej katmanı),
// Zifir yanarken boğuklaşır, olaylarda (kilit, zafer, yenilgi) kısılıp geri gelir.
// Zamanlama kare döngüsünden bağımsızdır (ses saatine göre ileriye planlanır), takılmaz.
//
// Efektler: adım, damla çanı, seri tıkırtısı ve eşikleri, kıl payı, kuş katılımı, sürü,
// kilit dolma tonu, kalp atışı, rüzgâr uğultusu, yanma cızırtısı, zafer ve yenilgi.
// Ana oyun kendi ses sistemini verirse (hooks.sfx) önce ona sorulur.

// Mevsim dizileri (yarım ton). chords: her 8 vuruşta bir değişen akor kökleri ve üçlüleri.
const SCALES = {
	spring: { root: 293.66, steps: [0, 2, 4, 7, 9], beat: 0.4, wave: 'sine', bell: 3.0, chords: [[0, 4], [-3, 3], [-7, 4], [-5, 4]] },
	summer: { root: 261.63, steps: [0, 2, 4, 7, 9], beat: 0.36, wave: 'triangle', bell: 2.0, chords: [[0, 4], [5, 4], [-3, 3], [7, 4]] },
	autumn: { root: 220.0, steps: [0, 3, 5, 7, 10], beat: 0.46, wave: 'triangle', bell: 2.0, chords: [[0, 3], [-4, 4], [3, 4], [-2, 4]] },
	winter: { root: 329.63, steps: [0, 2, 3, 7, 8], beat: 0.56, wave: 'sine', bell: 4.2, chords: [[0, 3], [-4, 4], [0, 3], [-5, 4]] },
	night: { root: 246.94, steps: [0, 2, 4, 7, 9], beat: 0.62, wave: 'sine', bell: 3.0, chords: [[0, 4], [-3, 3], [-7, 4], [-5, 4]] },
};
const st = (f, n) => f * Math.pow(2, n / 12);

export class Sfx {
	constructor(hooks = {}) {
		this.hooks = hooks;
		this.ctx = null;
		this.on = true;
		this.season = 'spring';
		this._dropN = 0;
		this._birdT = 4;
		// müzik durumu
		this.musMode = 'title'; // title | play | soft | off
		this.intensity = 0; // 0..1: gölge serisiyle büyür
		this._beatN = 0;
		this._mel = 5;
		this._nextBeat = 0;
		this._hbT = 0;
		this._streakN = 0;
		this._duckUntil = 0;
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
		// hafif sıkıştırıcı: üst üste binen seslerde patlama olmasın
		const comp = c.createDynamicsCompressor();
		comp.threshold.value = -14;
		comp.knee.value = 12;
		comp.ratio.value = 3;
		comp.attack.value = 0.004;
		comp.release.value = 0.2;
		this.master.connect(comp);
		comp.connect(c.destination);
		// yankı: tek gecikme hattı, geri beslemeli (oda hissi; neredeyse bedava)
		this.echo = c.createGain();
		this.echo.gain.value = 0.32;
		const dl = c.createDelay(1.2);
		dl.delayTime.value = 0.37;
		const fb = c.createGain();
		fb.gain.value = 0.34;
		const dlf = c.createBiquadFilter();
		dlf.type = 'lowpass';
		dlf.frequency.value = 2600;
		this.echo.connect(dl);
		dl.connect(dlf);
		dlf.connect(fb);
		fb.connect(dl);
		dlf.connect(this.master);
		// müzik yolu: kazanç → alçak geçiren (yanarken boğuklaşır) → ana çıkış + yankı
		this.mus = c.createGain();
		this.mus.gain.value = 0;
		this.musF = c.createBiquadFilter();
		this.musF.type = 'lowpass';
		this.musF.frequency.value = 5200;
		this.musF.Q.value = 0.5;
		this.mus.connect(this.musF);
		this.musF.connect(this.master);
		this.musF.connect(this.echo);
		// beyaz gürültü tamponu (rüzgâr, adım, cızırtı, kanat)
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
		// kilit dolma tonu: dolulukla yükselen yumuşak ses
		const co = c.createOscillator();
		co.type = 'triangle';
		co.frequency.value = 300;
		const co2 = c.createOscillator();
		co2.type = 'sine';
		co2.frequency.value = 450;
		const cg = c.createGain();
		cg.gain.value = 0;
		co.connect(cg);
		co2.connect(cg);
		cg.connect(this.master);
		cg.connect(this.echo);
		co.start();
		co2.start();
		this.chg = { o: co, o2: co2, g: cg, on: false };
		this._hostMusic = this._host('music');
		this._nextBeat = c.currentTime + 0.3;
		// müzik zamanlayıcısı: kare döngüsünden bağımsız (duraklatma ve bitiş ekranında da çalar)
		this._timer = setInterval(() => this._schedule(), 90);
		this._applyMusic();
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
		this._sz = this._wk = this._mf = -1;
		if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
	}

	_host(name, a) {
		return this.hooks.sfx ? this.hooks.sfx(name, a) === true : false;
	}

	_ok(name, a) {
		return this.ctx && this.on && !this._host(name, a);
	}

	/** Tek nota: hızlı atak, üstel sönüm. partial: çan tınısı için üst kısmi, echo: yankıya gönderim. */
	_tone(freq, t0, dur, vol, type = 'sine', partial = 0, echo = 0, dest = null) {
		const c = this.ctx;
		const o = c.createOscillator();
		o.type = type;
		o.frequency.value = freq;
		const g = c.createGain();
		g.gain.setValueAtTime(0, t0);
		g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		o.connect(g);
		g.connect(dest || this.master);
		if (echo) {
			const e = c.createGain();
			e.gain.value = echo;
			g.connect(e);
			e.connect(this.echo);
		}
		o.start(t0);
		o.stop(t0 + dur + 0.05);
		if (partial) this._tone(freq * partial, t0, dur * 0.5, vol * 0.3, 'sine', 0, 0, dest);
	}

	/** Yavaş atak ve sönümlü uzun nota (akor yastığı, kabarma). */
	_swell(freq, t0, att, dur, vol, type = 'triangle', dest = null) {
		const c = this.ctx;
		const o = c.createOscillator();
		o.type = type;
		o.frequency.value = freq;
		const g = c.createGain();
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(vol, t0 + att);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		o.connect(g);
		g.connect(dest || this.master);
		o.start(t0);
		o.stop(t0 + dur + 0.05);
	}

	/** Kısa gürültü patlaması (adım, kanat, cızırtı). sweep: süzgecin kayacağı frekans. */
	_burst(t0, dur, freq, vol, type = 'bandpass', sweep = 0, q = 1.2) {
		const c = this.ctx;
		const s = c.createBufferSource();
		s.buffer = this.noise;
		const f = c.createBiquadFilter();
		f.type = type;
		f.frequency.setValueAtTime(freq, t0);
		if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
		f.Q.value = q;
		const g = c.createGain();
		g.gain.setValueAtTime(vol, t0);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		s.connect(f);
		f.connect(g);
		g.connect(this.master);
		s.start(t0, Math.random() * 1.5);
		s.stop(t0 + dur + 0.02);
	}

	/** Yükselip alçalan hışırtı (rüzgâr uyarısı, sürü). */
	_whoosh(t0, dur, f0, f1, vol) {
		const c = this.ctx;
		const s = c.createBufferSource();
		s.buffer = this.noise;
		const f = c.createBiquadFilter();
		f.type = 'bandpass';
		f.Q.value = 0.9;
		f.frequency.setValueAtTime(f0, t0);
		f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
		const g = c.createGain();
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.6);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		s.connect(f);
		f.connect(g);
		g.connect(this.master);
		s.start(t0, Math.random());
		s.stop(t0 + dur + 0.05);
	}

	/** Mevsimin dizisinden bir nota (i: dizi basamağı, iki oktav üstüne taşabilir). */
	_note(i, oct = 0) {
		const S = SCALES[this.season] || SCALES.spring;
		const n = S.steps.length;
		const k = ((i % n) + n) % n;
		return st(S.root, S.steps[k] + 12 * (Math.floor(i / n) + oct));
	}

	// ------------------------------------------------------------------------------------------
	// Oyun efektleri
	// ------------------------------------------------------------------------------------------
	step() {
		if (!this._ok('step')) return;
		const t = this.ctx.currentTime;
		if (this.season === 'winter') this._burst(t, 0.09, 1400 + Math.random() * 500, 0.07, 'lowpass');
		else this._burst(t, 0.05, 900 + Math.random() * 500, 0.065);
	}

	drop() {
		if (!this._ok('drop')) return;
		const t = this.ctx.currentTime;
		const i = 5 + this._dropN++;
		const f = this._note(i);
		this._tone(f, t, 1.4, 0.15, 'sine', 2.76, 0.5);
		this._tone(this._note(i + 2), t + 0.08, 1.1, 0.07, 'triangle', 0, 0.4);
		this._burst(t, 0.25, 6000, 0.03, 'highpass');
		this.duck(0.55, 0.6);
	}

	resetDrops() {
		this._dropN = 0;
	}

	dropLost() {
		if (!this._ok('dropLost')) return;
		const t = this.ctx.currentTime;
		this._burst(t, 0.4, 2600, 0.12, 'highpass');
		this._tone(this._note(4), t, 0.4, 0.06, 'triangle');
		this._tone(this._note(1), t + 0.12, 0.6, 0.06, 'triangle');
	}

	/** Bir damla erimeye başladı: kısa, inen bir ıslık ve tıslama. */
	dropWarn() {
		if (!this._ok('dropWarn')) return;
		const t = this.ctx.currentTime;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		const f = this._note(12);
		o.type = 'sine';
		o.frequency.setValueAtTime(f, t);
		o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.35);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(0.05, t + 0.02);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
		o.connect(g);
		g.connect(this.master);
		o.start(t);
		o.stop(t + 0.45);
		this._burst(t, 0.3, 4500, 0.04, 'highpass');
	}

	ui() {
		if (!this._ok('ui')) return;
		this._tone(this._note(7), this.ctx.currentTime, 0.14, 0.05, 'sine', 2);
	}

	/** Gölge serisi her arttığında: dizide yukarı çıkan yumuşak bir tıkırtı. */
	streak(n) {
		if (!this._ok('streak', n)) return;
		const t = this.ctx.currentTime;
		const i = 5 + (this._streakN++ % 8);
		this._tone(this._note(i, 1), t, 0.35, 0.034 + Math.min(0.02, n * 0.001), 'sine', 0, 0.3);
	}

	/** Seri eşiği (×5, ×10, ...): parlak, yükselen üç nota ve pırıltı. */
	milestone(n) {
		if (!this._ok('milestone', n)) return;
		const t = this.ctx.currentTime;
		const big = n % 10 === 0;
		const base = 5 + Math.min(4, Math.floor(n / 10));
		[0, 2, 4, big ? 7 : 5].forEach((d, k) => this._tone(this._note(base + d), t + k * 0.07, 1.3, big ? 0.1 : 0.075, 'sine', 3, 0.5));
		this._burst(t + 0.05, 0.6, 7000, big ? 0.05 : 0.03, 'highpass');
		if (big) this._swell(this._note(0, -1), t, 0.05, 1.6, 0.05, 'triangle');
		this.duck(0.5, 0.8);
	}

	streakReset() {
		this._streakN = 0;
	}

	/** Seri bozuldu: iki nota aşağı, boğuk. */
	streakBreak(n) {
		if (!this._ok('streakBreak', n)) return;
		const t = this.ctx.currentTime;
		this._tone(this._note(4), t, 0.35, 0.05, 'triangle');
		this._tone(this._note(1), t + 0.1, 0.5, 0.05, 'triangle');
		this._streakN = 0;
	}

	/** Işığa girildi: kısa tıslama. */
	burnStart() {
		if (!this._ok('burn')) return;
		const t = this.ctx.currentTime;
		this._burst(t, 0.22, 5000, 0.07, 'highpass', 2500);
		this._tone(140, t, 0.18, 0.05, 'triangle');
	}

	/** Kıl payı: hışırtı ve iki parlak çan. */
	nearMiss() {
		if (!this._ok('nearMiss')) return;
		const t = this.ctx.currentTime;
		this._whoosh(t, 0.45, 600, 4000, 0.09);
		this._tone(this._note(9), t + 0.12, 1.2, 0.11, 'sine', 3, 0.6);
		this._tone(this._note(12), t + 0.22, 1.4, 0.09, 'sine', 3, 0.6);
		this.duck(0.4, 1.0);
	}

	/** Son nefes: derin vuruş, ters kabarma. */
	lastStand() {
		if (!this._ok('lastStand')) return;
		const t = this.ctx.currentTime;
		this._thump(t, 0.3);
		this._thump(t + 0.2, 0.2);
		this._whoosh(t, 0.9, 200, 1800, 0.08);
		this.duck(0.15, 1.2);
	}

	_thump(t, vol) {
		const c = this.ctx;
		const o = c.createOscillator();
		o.type = 'triangle';
		o.frequency.setValueAtTime(120, t);
		o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
		const g = c.createGain();
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
		o.connect(g);
		g.connect(this.master);
		o.start(t);
		o.stop(t + 0.26);
	}

	/** Kuş katıldı: kanat çırpışı ve küçük bir ötüş (her kuşta biraz daha tiz). */
	birdJoin(i) {
		if (!this._ok('bird', i)) return;
		const t = this.ctx.currentTime;
		for (let k = 0; k < 4; k++) this._burst(t + k * 0.055, 0.05, 1200 + k * 150, 0.05);
		const f = this._note(10 + i * 2);
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		const t0 = t + 0.18;
		o.frequency.setValueAtTime(f, t0);
		o.frequency.exponentialRampToValueAtTime(f * 1.26, t0 + 0.06);
		o.frequency.exponentialRampToValueAtTime(f, t0 + 0.12);
		g.gain.setValueAtTime(0, t0);
		g.gain.linearRampToValueAtTime(0.045, t0 + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
		o.connect(g);
		g.connect(this.master);
		g.connect(this.echo);
		o.start(t0);
		o.stop(t0 + 0.25);
	}

	/** Sürü hazır: yükselen akor pırıltısı. */
	flockReady() {
		if (!this._ok('flockReady')) return;
		const t = this.ctx.currentTime;
		[0, 2, 4, 5, 7].forEach((d, k) => this._tone(this._note(5 + d), t + k * 0.06, 1.2, 0.06, 'sine', 2, 0.5));
	}

	/** Sürü kalktı: yoğun kanat fırtınası ve derin kabarma. */
	flockGo() {
		if (!this._ok('flock')) return;
		const t = this.ctx.currentTime;
		for (let k = 0; k < 14; k++) this._burst(t + k * 0.035 + Math.random() * 0.02, 0.06, 900 + Math.random() * 900, 0.06);
		this._whoosh(t, 0.8, 300, 2400, 0.12);
		this._swell(this._note(0, -1), t, 0.25, 2.2, 0.07, 'triangle');
		this._swell(this._note(2, -1) * 1.0, t, 0.25, 2.2, 0.05, 'triangle');
		this._tone(this._note(10), t + 0.3, 1.5, 0.06, 'sine', 3, 0.6);
		this.duck(0.5, 1.5);
	}

	flockEnd() {
		if (!this._ok('flockEnd')) return;
		const t = this.ctx.currentTime;
		for (let k = 0; k < 8; k++) this._burst(t + k * 0.06, 0.05, 1400 - k * 80, 0.035);
		this._tone(this._note(7), t, 0.5, 0.04, 'triangle');
		this._tone(this._note(4), t + 0.12, 0.7, 0.04, 'triangle');
	}

	/** Sert rüzgâr geliyor. */
	gustWarn() {
		if (!this._ok('gust')) return;
		this._whoosh(this.ctx.currentTime, 1.4, 250, 1100, 0.07);
	}

	win() {
		if (!this._ok('win')) return;
		const t = this.ctx.currentTime;
		// mevsimin anahtarında iki oktav yükselen arpej, üstüne akor kabarması ve pırıltı
		[0, 1, 2, 3, 4, 5, 6, 7, 10].forEach((i, k) => this._tone(this._note(i), t + k * 0.075, 1.8, 0.09, 'sine', 3, 0.45));
		const S = SCALES[this.season] || SCALES.spring;
		[0, 7, 12 + (S.steps[1] === 3 ? 3 : 4), 19].forEach((d) => this._swell(st(S.root, d - 12), t + 0.1, 0.4, 3.2, 0.045, 'triangle'));
		this._swell(st(S.root, -24), t, 0.05, 2.6, 0.08, 'sine');
		this._burst(t + 0.5, 1.4, 8000, 0.05, 'highpass');
		this.duck(0.2, 2.6);
	}

	/** Işık kilidi açıldı: akor çiçeklenmesi. */
	unlockOpen() {
		if (!this._ok('unlock')) return;
		const t = this.ctx.currentTime;
		[0, 2, 4, 7].forEach((d, k) => this._tone(this._note(5 + d), t + k * 0.06, 1.6, 0.08, 'sine', 2, 0.5));
		this._swell(this._note(0, -1), t, 0.05, 2, 0.06, 'triangle');
		this._burst(t, 0.8, 6000, 0.04, 'highpass');
		this.duck(0.35, 1.4);
	}

	fail() {
		if (!this._ok('fail')) return;
		const t = this.ctx.currentTime;
		this._burst(t, 1.1, 2400, 0.14, 'highpass', 600);
		this._thump(t, 0.25);
		[4, 2, 0, -1].forEach((i, k) => this._tone(this._note(i), t + 0.2 + k * 0.18, 0.9, 0.065, 'triangle'));
		this.duck(0.1, 2.5);
	}

	/** Kilit dolarken çalan ton (k: 0..1 doluluk; null: sustur). */
	lockCharge(k) {
		if (!this.ctx || !this.on) return;
		const t = this.ctx.currentTime;
		const C = this.chg;
		if (k == null) {
			if (C.on) C.g.gain.setTargetAtTime(0, t, 0.08);
			C.on = false;
			return;
		}
		C.on = true;
		const f = this._note(0) * Math.pow(2, k * 1.5);
		C.o.frequency.setTargetAtTime(f, t, 0.05);
		C.o2.frequency.setTargetAtTime(f * 1.5, t, 0.05);
		C.g.gain.setTargetAtTime(0.018 + k * 0.03, t, 0.06);
	}

	/** Müziği kısa süre kıs (olay sesleri öne çıksın). */
	duck(level = 0.4, dur = 1) {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		const g = this.mus.gain;
		g.cancelScheduledValues(t);
		g.setTargetAtTime(this._musBase() * level, t, 0.03);
		this._duckUntil = t + dur;
	}

	_musBase() {
		if (this._hostMusic) return 0;
		return { title: 0.75, play: 1.0, soft: 0.5, off: 0 }[this.musMode] ?? 0.6;
	}

	/** Müzik kipi: title | play | soft | off. */
	music(mode) {
		if (this.musMode === mode) return;
		this.musMode = mode;
		this._applyMusic();
	}

	_applyMusic() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		if (t < this._duckUntil) return;
		this.mus.gain.setTargetAtTime(this._musBase(), t, this.musMode === 'off' ? 0.4 : 0.8);
	}

	/** Müzik zamanlayıcısı: önümüzdeki ~0.3 sn'nin vuruşlarını planlar. */
	_schedule() {
		const c = this.ctx;
		if (!c || !this.on || c.state !== 'running' || this._hostMusic) return;
		const now = c.currentTime;
		if (this._duckUntil && now > this._duckUntil) {
			this._duckUntil = 0;
			this.mus.gain.setTargetAtTime(this._musBase(), now, 0.5);
		}
		if (this.musMode === 'off') {
			this._nextBeat = now + 0.2;
			return;
		}
		if (this._nextBeat < now - 0.5) this._nextBeat = now + 0.05;
		const S = SCALES[this.season] || SCALES.spring;
		const slow = this.musMode === 'play' ? 1 : 1.3;
		while (this._nextBeat < now + 0.3) {
			this._beat(this._nextBeat, S, S.beat * slow);
			this._nextBeat += S.beat * slow;
		}
	}

	_beat(t, S, beat) {
		const b = this._beatN++;
		const pos = b % 8;
		const play = this.musMode === 'play';
		const I = play ? this.intensity : 0.15;
		const out = this.mus;
		// akor değişimi: yastık + bas (her 8 vuruşta)
		if (pos === 0) {
			const [r, third] = S.chords[Math.floor(b / 8) % S.chords.length];
			const len = beat * 8;
			const root = st(S.root, r - 12);
			this._swell(root, t, len * 0.35, len * 1.35, 0.03, 'triangle', out);
			this._swell(st(root, 7), t, len * 0.4, len * 1.3, 0.022, 'triangle', out);
			this._swell(st(root, 12 + third), t, len * 0.45, len * 1.25, 0.018, 'sine', out);
			this._tone(st(root, -12), t, len * 0.9, 0.05, 'sine', 0, 0, out);
			this._chordRoot = r;
		}
		// ezgi: dizide rastgele yürüyüş; cümle sonunda dinlen
		const dens = 0.28 + I * 0.4;
		if (pos !== 7 && Math.random() < dens) {
			const r = Math.random();
			this._mel += r < 0.2 ? -2 : r < 0.5 ? -1 : r < 0.8 ? 1 : 2;
			if (this._mel < 2) this._mel = 3;
			if (this._mel > 11) this._mel = 9;
			const f = this._note(this._mel);
			this._tone(f, t, beat * 3.2, 0.032 + I * 0.012, S.wave, S.bell, 0, out);
		}
		// arpej katmanı: seri uzayınca açılır (sekizlik notalar, akor tonları)
		if (I > 0.45) {
			const r = this._chordRoot || 0;
			const ar = [0, 7, 12, 16, 19, 12];
			for (let h = 0; h < 2; h++) {
				const d = ar[(pos * 2 + h) % ar.length];
				this._tone(st(S.root, r + d), t + h * beat * 0.5, beat * 0.9, 0.012 + (I - 0.45) * 0.02, 'triangle', 0, 0, out);
			}
		}
	}

	/**
	 * Her kare: yanma, rüzgâr, can seviyesi (kalp atışı), ara sıra kuş sesi (bahar/yaz).
	 * burn: 0..1 ışık, windK: rüzgâr gücü, playing: bölüm sürüyor mu, meter: mürekkep 0..1
	 */
	tick(dt, burn, windK, playing, meter = 1) {
		if (!this.ctx || !this.on) return;
		const t = this.ctx.currentTime;
		// otomasyon olayları yalnızca değer belirgin değişince eklenir (zayıf cihazda ses iş parçacığı rahat)
		const sz = playing ? burn * 0.09 : 0;
		if (Math.abs(sz - (this._sz ?? -1)) > 0.004) {
			this._sz = sz;
			this.sizz.g.gain.setTargetAtTime(sz, t, 0.05);
		}
		if (Math.abs(windK - (this._wk ?? -1)) > 0.02) {
			this._wk = windK;
			this.wind.g.gain.setTargetAtTime(0.025 + windK * 0.05, t, 0.3);
			this.wind.f.frequency.setTargetAtTime(380 + windK * 500, t, 0.3);
		}
		// yanarken müzik boğuklaşır, can azaldıkça kalp atar
		const mf = playing && burn > 0.05 ? 900 + meter * 900 : 5200;
		if (Math.abs(mf - (this._mf ?? -1)) > 40) {
			this._mf = mf;
			this.musF.frequency.setTargetAtTime(mf, t, 0.12);
		}
		if (playing && meter < 0.45 && burn > 0.05 && t > this._hbT) {
			this._thump(t, 0.22);
			this._thump(t + 0.17, 0.13);
			this._hbT = t + 0.45 + meter * 0.9;
		}
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
			g.gain.linearRampToValueAtTime(0.02, t0 + 0.01);
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

Sfx.SCALES = SCALES;
