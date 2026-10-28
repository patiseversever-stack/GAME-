// Sürekli sesli çalgılar: zurna, ney, boru (alçak nefesli) ve bordo (drone).
// Hepsi az sayıda düğümle kurulur; eşzamanlı sayıları çağıran tarafça sınırlanır.

function connectEnd(src, nodes, e, g) {
	src.onended = () => {
		for (const n of nodes) {
			try {
				n.disconnect();
			} catch (err) {
				/* yok say */
			}
		}
		if (g) e.freeGain(g);
	};
}

// Zurna: testere dalgası + çift kamış (hafif detune) + gırtlak (formant) süzgeçleri + vibrato.
// o: {to, bend (sent, aşağıdan kayma), vib (paylaşılan titreşim), pan, bright}
export function zurna(e, t, f, dur, vol, o = {}) {
	const c = e.ctx;
	const a = c.createOscillator();
	a.type = 'sawtooth';
	a.frequency.value = f;
	const nodes = [a];
	let b = null;
	if (!e.low) {
		b = c.createOscillator();
		b.type = 'sawtooth';
		b.frequency.value = f;
		b.detune.value = 11;
		nodes.push(b);
	}
	const mix = c.createGain();
	mix.gain.value = b ? 0.55 : 0.8;
	const hp = c.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 260;
	const p1 = c.createBiquadFilter();
	p1.type = 'peaking';
	p1.frequency.value = 950;
	p1.Q.value = 3.5;
	p1.gain.value = 9;
	const p2 = c.createBiquadFilter();
	p2.type = 'peaking';
	p2.frequency.value = 2300;
	p2.Q.value = 3;
	p2.gain.value = 7;
	const lp = c.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = o.bright ? 6500 : 4600;
	const g = e.gain(0.0001);
	const v = vol * 0.5; // formant kazancı yüksek: seviye düşür
	const end = t + dur;
	g.gain.setValueAtTime(0.0001, t);
	g.gain.linearRampToValueAtTime(v, t + 0.02);
	g.gain.linearRampToValueAtTime(v * 0.82, t + 0.12);
	g.gain.setValueAtTime(v * 0.82, end);
	g.gain.linearRampToValueAtTime(0.0001, end + 0.07);
	a.connect(mix);
	if (b) b.connect(mix);
	mix.connect(hp);
	hp.connect(p1);
	p1.connect(p2);
	p2.connect(lp);
	lp.connect(g);
	let tail = g;
	let pn = null;
	if (o.pan) {
		pn = c.createStereoPanner();
		pn.pan.value = o.pan;
		g.connect(pn);
		tail = pn;
		nodes.push(pn);
	}
	tail.connect(o.to || e.dest);
	// kayma: perdeye aşağıdan gelir
	if (o.bend) {
		a.detune.setValueAtTime(-o.bend, t);
		a.detune.linearRampToValueAtTime(0, t + 0.05);
		if (b) {
			b.detune.setValueAtTime(11 - o.bend, t);
			b.detune.linearRampToValueAtTime(11, t + 0.05);
		}
	}
	// titreşim: paylaşılan ya da kendi
	let own = null;
	if (o.vib) {
		o.vib.connect(a.detune);
		if (b) o.vib.connect(b.detune);
	} else if (dur > 0.35) {
		own = c.createOscillator();
		own.frequency.value = 5.6;
		const og = c.createGain();
		og.gain.setValueAtTime(0, t);
		og.gain.setValueAtTime(0, t + 0.18);
		og.gain.linearRampToValueAtTime(18, t + 0.45);
		own.connect(og);
		og.connect(a.detune);
		if (b) og.connect(b.detune);
		own.start(t);
		own.stop(end + 0.12);
		nodes.push(own, og);
	}
	// kamış çıtırtısı (atak)
	if (!e.low) e.noise(t, 0.05, vol * 0.18, 2600, 1800, { q: 1.2, a: 0.002, to: o.to });
	a.start(t);
	a.stop(end + 0.1);
	if (b) {
		b.start(t);
		b.stop(end + 0.1);
	}
	a.onended = () => {
		if (o.vib) {
			try {
				o.vib.disconnect(a.detune);
				if (b) o.vib.disconnect(b.detune);
			} catch (err) {
				/* yok say */
			}
		}
		for (const n of [mix, hp, p1, p2, lp, ...nodes]) {
			try {
				n.disconnect();
			} catch (err) {
				/* yok say */
			}
		}
		e.freeGain(g);
	};
}

// Ney: yumuşak, nefesli. Yavaş atak, geç gelen vibrato, perdeye aşağıdan kayış.
export function ney(e, t, f, dur, vol, o = {}) {
	const c = e.ctx;
	const a = c.createOscillator();
	a.type = 'sine';
	a.frequency.value = f;
	const b = c.createOscillator();
	b.type = 'triangle';
	b.frequency.value = f;
	const bg = c.createGain();
	bg.gain.value = 0.3;
	const lp = c.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = Math.min(6000, f * 5);
	const g = e.gain(0.0001);
	const att = o.attack === undefined ? 0.11 : o.attack;
	const end = t + dur;
	g.gain.setValueAtTime(0.0001, t);
	g.gain.linearRampToValueAtTime(vol, t + att);
	g.gain.setValueAtTime(vol, Math.max(t + att, end - 0.05));
	g.gain.linearRampToValueAtTime(0.0001, end + (o.release || 0.25));
	a.connect(lp);
	b.connect(bg);
	bg.connect(lp);
	lp.connect(g);
	// nefes: perde etrafında dar bantlı gürültü
	const nodes = [a, b, bg, lp];
	let ns = null;
	if (!e.low) {
		ns = c.createBufferSource();
		ns.buffer = e.noiseBuf;
		ns.loop = true;
		const nf = c.createBiquadFilter();
		nf.type = 'bandpass';
		nf.frequency.value = Math.min(7000, f * 2.02);
		nf.Q.value = 7;
		const ng = c.createGain();
		ng.gain.value = 0.9;
		ns.connect(nf);
		nf.connect(ng);
		ng.connect(g);
		ns.start(t, e.r());
		ns.stop(end + (o.release || 0.25) + 0.05);
		nodes.push(ns, nf, ng);
	}
	let tail = g;
	if (o.pan) {
		const pn = c.createStereoPanner();
		pn.pan.value = o.pan;
		g.connect(pn);
		tail = pn;
		nodes.push(pn);
	}
	tail.connect(o.to || e.dest);
	a.detune.setValueAtTime(o.scoop === undefined ? -55 : -o.scoop, t);
	a.detune.linearRampToValueAtTime(0, t + 0.14);
	b.detune.setValueAtTime(o.scoop === undefined ? -55 : -o.scoop, t);
	b.detune.linearRampToValueAtTime(0, t + 0.14);
	if (o.vib) {
		o.vib.connect(a.detune);
		o.vib.connect(b.detune);
	} else if (dur > 0.5) {
		const own = c.createOscillator();
		own.frequency.value = 5.1;
		const og = c.createGain();
		og.gain.setValueAtTime(0, t);
		og.gain.setValueAtTime(0, t + 0.3);
		og.gain.linearRampToValueAtTime(22, t + 0.8);
		own.connect(og);
		og.connect(a.detune);
		og.connect(b.detune);
		own.start(t);
		own.stop(end + 0.3);
		nodes.push(own, og);
	}
	a.start(t);
	b.start(t);
	const stopAt = end + (o.release || 0.25) + 0.05;
	a.stop(stopAt);
	b.stop(stopAt);
	a.onended = () => {
		if (o.vib) {
			try {
				o.vib.disconnect(a.detune);
				o.vib.disconnect(b.detune);
			} catch (err) {
				/* yok say */
			}
		}
		for (const n of nodes) {
			try {
				n.disconnect();
			} catch (err) {
				/* yok say */
			}
		}
		e.freeGain(g);
	};
}

// Boru/borazan: alçak, kalın, süzgeci açılan testere (kuşatma çağrısı)
export function horn(e, t, f, dur, vol, o = {}) {
	const c = e.ctx;
	const a = c.createOscillator();
	a.type = 'sawtooth';
	a.frequency.setValueAtTime(f * 0.97, t);
	a.frequency.linearRampToValueAtTime(f, t + 0.15);
	const b = c.createOscillator();
	b.type = 'square';
	b.frequency.value = f * 1.004;
	const bg = c.createGain();
	bg.gain.value = 0.35;
	const lp = c.createBiquadFilter();
	lp.type = 'lowpass';
	lp.Q.value = 2;
	lp.frequency.setValueAtTime(220, t);
	lp.frequency.exponentialRampToValueAtTime(o.open || 1300, t + dur * 0.7);
	const g = e.gain(0.0001);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.4));
	g.gain.setValueAtTime(vol, t + dur);
	g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
	a.connect(lp);
	b.connect(bg);
	bg.connect(lp);
	lp.connect(g);
	g.connect(o.to || e.dest);
	a.start(t);
	b.start(t);
	a.stop(t + dur + 0.3);
	b.stop(t + dur + 0.3);
	connectEnd(a, [a, b, bg, lp], e, g);
}

// Bordo: köklü, yumuşak, ağır; süzgeci çok yavaş nefes alır. {stop(t, fade)} döner.
export function drone(e, f, vol, to) {
	const c = e.ctx;
	const t = c.currentTime;
	const g = c.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.linearRampToValueAtTime(vol, t + 2.2);
	const lp = c.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 420;
	lp.Q.value = 0.8;
	const list = [];
	const mk = (type, fr, gv) => {
		const o = c.createOscillator();
		o.type = type;
		o.frequency.value = fr;
		const og = c.createGain();
		og.gain.value = gv;
		o.connect(og);
		og.connect(lp);
		o.start(t);
		list.push(o, og);
		return o;
	};
	mk('sawtooth', f, 0.5);
	if (!e.low) mk('sawtooth', f * 1.0035, 0.4);
	mk('sine', f * 0.5, 0.7);
	mk('sine', f * 1.5, 0.12); // beşli
	lp.connect(g);
	g.connect(to || e.musicIn);
	const lfo = c.createOscillator();
	lfo.frequency.value = 0.09;
	const lg = c.createGain();
	lg.gain.value = 130;
	lfo.connect(lg);
	lg.connect(lp.frequency);
	lfo.start(t);
	list.push(lfo, lg);
	return {
		gain: g,
		stop(at, fade = 1) {
			try {
				g.gain.cancelScheduledValues(at);
				g.gain.setValueAtTime(g.gain.value, at);
				g.gain.linearRampToValueAtTime(0.0001, at + fade);
				for (const n of list) if (n.stop) n.stop(at + fade + 0.05);
				list[0].onended = () => {
					for (const n of [...list, lp, g]) {
						try {
							n.disconnect();
						} catch (err) {
							/* yok say */
						}
					}
				};
			} catch (err) {
				/* yok say */
			}
		},
	};
}
