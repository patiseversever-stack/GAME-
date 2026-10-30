// Tufan sesi: oyunun ses motorunun (src/audio/engine.js) bağlamı, ortak gürültüsü ve efekt hattı üzerinde kurulan
// prosedürel ses tasarımı. Ses motoruna kanca yok: düğümler motorun efekt girişine (e.dest) bağlanır; sessize alma,
// ses düzeyi ve sıkıştırıcı aynen geçerli. Bağlam çalışmıyorsa (kilitli, sessiz, sınama) her şey sessizce boş geçer.
//
//   bed()        fırtına yatağı: iki kanallı yağmur hışırtısı (yüksek geçiren gürültü, ağır nefes alan), damla sesi
//                (dar bant, yavaş dalgalanan), uzak deniz uğultusu (alçak geçiren, yavaşça kayan süzgeç). 1,5 sn'de girer.
//   rise(dur)    deniz yükselişi: süzgeci yavaşça açılan alçak uğultu + çok alçak titreşim (41 Hz), sonda söner
//   thunder(…)   uzak gök gürültüsü: şimşekten gecikmeli; alçak gürültünün düzensiz yuvarlanmaları (4–5 sn kuyruk),
//                kısa orta bant çatırtısı (yakınsa), alt titreşim; şimşeğin ekrandaki yerine göre sağ/sol
//   gulp()       batış: derin "gulp" (170 → 48 Hz kayan sinüs), suyun çöküşü (kapanan süzgeçli gürültü), kabarcıklar
//   hope()       son ada: sıcak yaylı pad (Re majör, add9; çift detune testere, yavaş açılan süzgeç), uzun kuyruk
//   stop()       hepsi 1,4 sn'de söner, düğümler bırakılır
//
// Hiçbir ses ani başlamaz ya da kesilmez (bütün zarflar rampa / setTargetAtTime).

export function sesOf(app) {
	const sx = app?.sfx;
	const e = sx?.e;
	const c = e?.ctx;
	const ok = !!(c && e.dest && e.noiseBuf && c.state === 'running' && !sx.muted);
	const nodes = [];
	let bus = null;
	const keep = (n) => (nodes.push(n), n);
	const R = Math.random;
	if (ok) {
		bus = keep(c.createGain());
		bus.gain.value = 1;
		bus.connect(e.dest);
	}
	const noise = (t, off = R() * 1.8) => {
		const s = keep(c.createBufferSource());
		s.buffer = e.noiseBuf;
		s.loop = true;
		s.start(t, off);
		return s;
	};
	const filt = (type, f, q = 0.7) => {
		const b = keep(c.createBiquadFilter());
		b.type = type;
		b.frequency.value = f;
		b.Q.value = q;
		return b;
	};
	const gain = (v = 0.0001) => {
		const g = keep(c.createGain());
		g.gain.value = v;
		return g;
	};
	const pan = (p) => {
		if (!c.createStereoPanner) return gain(1);
		const n = keep(c.createStereoPanner());
		n.pan.value = Math.max(-0.9, Math.min(0.9, p));
		return n;
	};
	const chain = (...n) => {
		for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]);
		return n[n.length - 1];
	};
	const lfo = (hz, depth, param) => {
		const o = keep(c.createOscillator());
		o.frequency.value = hz;
		const g = gain(depth);
		o.connect(g);
		g.connect(param);
		o.start();
	};
	const NOP = { ok: false, bed() {}, rise() {}, thunder() {}, gulp() {}, hope() {}, stop() {} };
	if (!ok) return NOP;
	let bedOn = false;
	let riseG = null;
	let riseF = null;
	let stopped = false;
	return {
		ok: true,
		bed() {
			if (bedOn || stopped) return;
			bedOn = true;
			const t = c.currentTime;
			// yağmur: iki kanal (sağ/sol ayrı gürültü konumundan), yüksek geçiren; yavaş nefes
			for (const p of [-0.65, 0.65]) {
				const g = gain();
				chain(noise(t), filt('highpass', 1300, 0.5), filt('lowpass', 7800, 0.4), g, pan(p), bus);
				g.gain.setValueAtTime(0.0001, t);
				g.gain.linearRampToValueAtTime(0.05, t + 1.6);
				lfo(0.11 + R() * 0.06, 0.012, g.gain);
			}
			// damlalar: dar bant, ağır dalgalanan
			const gd = gain();
			chain(noise(t), filt('bandpass', 3200, 1.4), gd, bus);
			gd.gain.setValueAtTime(0.0001, t);
			gd.gain.linearRampToValueAtTime(0.018, t + 2);
			lfo(0.27, 0.008, gd.gain);
			// uzak deniz uğultusu: alçak, süzgeci yavaşça kayan
			const fl = filt('lowpass', 200, 0.8);
			const gl = gain();
			chain(noise(t), fl, gl, bus);
			gl.gain.setValueAtTime(0.0001, t);
			gl.gain.linearRampToValueAtTime(0.07, t + 2.5);
			lfo(0.06, 70, fl.frequency);
		},
		/** Deniz yükselişi: dur sn boyunca kabarır (süzgeç açılır), sonra söner. */
		rise(dur = 8) {
			if (stopped) return;
			const t = c.currentTime;
			riseF = filt('lowpass', 110, 0.9);
			riseG = gain();
			chain(noise(t), riseF, riseG, bus);
			riseF.frequency.setValueAtTime(110, t);
			riseF.frequency.exponentialRampToValueAtTime(420, t + dur);
			riseG.gain.setValueAtTime(0.0001, t);
			riseG.gain.linearRampToValueAtTime(0.13, t + 2.2);
			riseG.gain.setValueAtTime(0.13, t + dur - 0.5);
			riseG.gain.setTargetAtTime(0.0001, t + dur - 0.5, 0.9);
			const o = keep(c.createOscillator());
			o.frequency.value = 41;
			const go = gain();
			chain(o, go, bus);
			o.start(t);
			go.gain.setValueAtTime(0.0001, t);
			go.gain.linearRampToValueAtTime(0.045, t + 3);
			go.gain.setTargetAtTime(0.0001, t + dur - 0.5, 1.0);
		},
		/** Uzak gök gürültüsü: delay sn sonra; p: -1 sol … 1 sağ; near 0..1 (yakınsa çatırtı ve daha güçlü). */
		thunder(delay = 1.2, p = 0, near = 0.4) {
			if (stopped) return;
			const t = c.currentTime + delay;
			const out = pan(p * 0.7);
			out.connect(bus);
			// yuvarlanma: alçak gürültü, düzensiz kabarmalar, uzun kuyruk; süzgeç uzaklaştıkça kapanır
			const f = filt('lowpass', 240, 0.6);
			const g = gain();
			const sn = noise(t);
			sn.stop(t + 9);
			chain(sn, f, g, out);
			f.frequency.setValueAtTime(260 + near * 200, t);
			f.frequency.exponentialRampToValueAtTime(85, t + 4.5);
			const pk = 0.16 + near * 0.12;
			g.gain.setValueAtTime(0.0001, t);
			g.gain.setTargetAtTime(pk, t, 0.12);
			let tt = t + 0.35;
			for (let i = 0; i < 5; i++) {
				const k = pk * (0.45 + R() * 0.55) * (1 - i * 0.13);
				g.gain.setTargetAtTime(k * 0.45, tt, 0.18);
				tt += 0.25 + R() * 0.5;
				g.gain.setTargetAtTime(k, tt, 0.1);
				tt += 0.15 + R() * 0.25;
			}
			g.gain.setTargetAtTime(0.0001, tt, 0.9);
			// çatırtı: yakınsa kısa orta bant
			if (near > 0.3) {
				const gc = gain();
				const cn = noise(t);
				cn.stop(t + 1.5);
				chain(cn, filt('bandpass', 900, 0.6), gc, out);
				gc.gain.setValueAtTime(0.0001, t);
				gc.gain.linearRampToValueAtTime(0.05 * near, t + 0.03);
				gc.gain.setTargetAtTime(0.0001, t + 0.05, 0.25);
			}
			// alt titreşim
			const o = keep(c.createOscillator());
			o.frequency.setValueAtTime(38, t);
			o.frequency.exponentialRampToValueAtTime(30, t + 3);
			const gs = gain();
			chain(o, gs, out);
			o.start(t);
			o.stop(t + 6);
			gs.gain.setValueAtTime(0.0001, t);
			gs.gain.setTargetAtTime(0.07 + near * 0.05, t + 0.05, 0.2);
			gs.gain.setTargetAtTime(0.0001, t + 0.9, 0.8);
		},
		/** Batış: derin gulp, suyun çöküşü, kabarcıklar. */
		gulp() {
			if (stopped) return;
			const t = c.currentTime;
			const o = keep(c.createOscillator());
			o.frequency.setValueAtTime(170, t);
			o.frequency.exponentialRampToValueAtTime(48, t + 0.55);
			const g = gain();
			chain(o, filt('lowpass', 520, 0.7), g, bus);
			o.start(t);
			o.stop(t + 1.5);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.linearRampToValueAtTime(0.24, t + 0.03);
			g.gain.setTargetAtTime(0.0001, t + 0.12, 0.18);
			const fc = filt('lowpass', 1500, 0.6);
			const gc = gain();
			const wn = noise(t);
			wn.stop(t + 2.5);
			chain(wn, fc, gc, bus);
			fc.frequency.setValueAtTime(1500, t);
			fc.frequency.exponentialRampToValueAtTime(240, t + 1.0);
			gc.gain.setValueAtTime(0.0001, t);
			gc.gain.linearRampToValueAtTime(0.12, t + 0.06);
			gc.gain.setTargetAtTime(0.0001, t + 0.2, 0.35);
			for (let i = 0; i < 9; i++) {
				const tb = t + 0.15 + R() * 0.95;
				const f0 = 320 + R() * 520;
				const b = keep(c.createOscillator());
				b.frequency.setValueAtTime(f0, tb);
				b.frequency.exponentialRampToValueAtTime(f0 * 1.7, tb + 0.06);
				const gb = gain();
				chain(b, gb, bus);
				b.start(tb);
				b.stop(tb + 0.12);
				gb.gain.setValueAtTime(0.0001, tb);
				gb.gain.linearRampToValueAtTime(0.03, tb + 0.008);
				gb.gain.exponentialRampToValueAtTime(0.0001, tb + 0.09);
			}
		},
		/** Son ada: sıcak yaylı pad (Re majör add9), yavaş girer, kart kapanınca söner. */
		hope() {
			if (stopped) return;
			const t = c.currentTime;
			const f = filt('lowpass', 600, 0.4);
			const g = gain();
			chain(f, g, bus);
			f.frequency.setValueAtTime(600, t);
			f.frequency.exponentialRampToValueAtTime(2300, t + 3.2);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.linearRampToValueAtTime(0.11, t + 1.8);
			for (const hz of [73.42, 146.83, 220, 293.66, 369.99, 440, 659.25]) {
				for (const d of [-6, 6]) {
					const o = keep(c.createOscillator());
					o.type = hz < 100 ? 'triangle' : 'sawtooth';
					o.frequency.value = hz;
					o.detune.value = d;
					const go = gain(hz < 100 ? 0.22 : hz > 600 ? 0.035 : 0.06);
					chain(o, go, f);
					o.start(t);
				}
			}
		},
		stop() {
			if (stopped) return;
			stopped = true;
			const t = c.currentTime;
			bus.gain.setValueAtTime(bus.gain.value, t);
			bus.gain.linearRampToValueAtTime(0.0001, t + 1.4);
			setTimeout(() => {
				for (const n of nodes) {
					try {
						n.stop?.();
					} catch {
						/* başlamamış */
					}
					try {
						n.disconnect();
					} catch {
						/* yok say */
					}
				}
				nodes.length = 0;
			}, 1700);
		},
	};
}
