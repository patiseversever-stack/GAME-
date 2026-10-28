// Üretken müzik: makam dizilerinden (Hicaz, Uşşak, Rast, Kürdi) kurulan döngüler.
// Çalgılar: davul + darbuka ritmi, bağlama/kanun teli (Karplus-Strong), zurna, ney, bordo.
// Zamanlama: kısa ileri bakışlı zamanlayıcı; düğümler yalnızca çalınacak anın hemen öncesinde üretilir.
import { rng } from './dsp.js';
import { zurna, ney, drone } from './voices.js';

// ---------------------------------------------------------------- makam dizileri (sent cinsinden, karar perdesinden)
// Not: 12'lik eşit düzen yerine gerçek Türk müziği aralıklarına yakın değerler.
export const MAKAM = {
	hicaz: [0, 112, 384, 498, 702, 792, 996],
	ussak: [0, 163, 294, 498, 702, 792, 996],
	rast: [0, 204, 355, 498, 702, 906, 1086],
	kurdi: [0, 90, 294, 498, 702, 792, 996],
};
export const ROOT = 293.66; // Re (D4)

// derece → Hz. deg 0..6 dizinin perdeleri, 7 üst oktav, negatif alt oktav
export function degHz(makam, deg, root = ROOT) {
	const sc = MAKAM[makam] || MAKAM.rast;
	const o = Math.floor(deg / 7);
	const i = ((deg % 7) + 7) % 7;
	return root * Math.pow(2, (sc[i] + 1200 * o) / 1200);
}

// ---------------------------------------------------------------- ritimler
// Davul: D = düm (bas), T = tek (parlak), t = hafif tek (ghost), . = sus
// Darbuka: d = doum, t = tek, k = ka
const THEMES = {
	// Ana menü: sıcak, ağır, Rast. Düyek 8'li; ney ve bordo öne çıkar.
	menu: {
		makam: 'rast',
		root: ROOT,
		step: 0.25, // saniye / adım
		len: 8,
		cycle: 8,
		davul: 'D.t.D.T.',
		darb: 'd.k.tkt.',
		// bağlama düzeni: adım → derece (null = sus)
		pluck: [0, null, 4, null, 7, null, 4, 2],
		prog: [0, 0, 3, 0, 4, 3, 0, 0],
		pluckOct: -1,
		ney: [
			[[0, 4, 6]],
			[[0, 5, 2], [2, 4, 2], [4, 2, 4]],
			[[0, 3, 4], [4, 4, 2], [6, 2, 2]],
			[[0, 1, 2], [2, 2, 2], [4, 0, 4]],
			[[0, 7, 6]],
			[[0, 6, 2], [2, 5, 2], [4, 4, 4]],
			[[0, 5, 2], [2, 4, 2], [4, 3, 2], [6, 2, 2]],
			[[0, 2, 2], [2, 1, 2], [4, 0, 4]],
		],
		lead: null,
		vol: { drone: 0.1, davul: 0.5, darb: 0.0, pluck: 0.5, ney: 0.55, kanun: 0.34, zurna: 0 },
		layers: (bar) => ({ davul: bar >= 2, darb: bar >= 4, pluck: true, ney: true, kanun: bar % 2 === 1, zurna: false }),
		hat: false,
	},
	// Maç: gergin ama rahatsız etmeyen. Hicaz, Aksak 9/8 (2+2+2+3).
	match: {
		makam: 'hicaz',
		root: ROOT,
		step: 0.176,
		len: 18,
		cycle: 8,
		davul: 'D...T...D...T.t.t.',
		darb: 'd.k.t.ktd.k.t.kt.k',
		pluck: [0, null, 4, null, 3, null, 4, null, 0, null, 1, null, 0, null, 1, null, 2, null],
		prog: [0, 0, 0, -1, 0, 0, 1, 0],
		pluckOct: -1,
		ney: [
			null,
			null,
			[[0, 4, 8], [8, 3, 4], [12, 2, 6]],
			[[0, 1, 4], [4, 2, 4], [8, 1, 4], [12, 0, 6]],
			null,
			null,
			null,
			null,
		],
		lead: [
			null,
			null,
			null,
			null,
			[[0, 4, 4], [4, 3, 2], [6, 2, 2], [8, 1, 4], [12, 0, 6]],
			[[0, 0, 2], [2, 1, 2], [4, 2, 4], [8, 1, 2], [10, 0, 8]],
			[[0, 4, 2], [2, 5, 2], [4, 4, 2], [6, 2, 4], [10, 3, 2], [12, 2, 2], [14, 1, 2], [16, 0, 2]],
			[[0, 0, 6], [8, 1, 2], [10, 0, 2], [12, 2, 6]],
		],
		vol: { drone: 0.12, davul: 0.58, darb: 0.3, pluck: 0.46, ney: 0.5, kanun: 0.3, zurna: 0.34 },
		layers: (bar) => ({ davul: true, darb: bar >= 1, pluck: bar >= 2, ney: bar === 2 || bar === 3, kanun: bar >= 2 && bar % 2 === 0, zurna: bar >= 4 }),
		zilBar: [0, 4],
	},
	// Kuşatma: hızlı, sertleşen, sürekli yükselen yoğunluk. Hicaz, 4/4 yürüyüş.
	siege: {
		makam: 'hicaz',
		root: ROOT * Math.pow(2, -200 / 1200), // biraz daha alçak ve tehditkâr (Do)
		step: 0.11,
		len: 16,
		cycle: 8,
		davul: 'D...T.t.D.D.T.t.',
		davul2: 'D.t.T.tTD.DtT.tT',
		darb: 'd.ktd.ktd.ktdkt.',
		pluck: [0, null, 0, 0, 4, null, 3, null, 0, null, 0, 0, 1, null, 0, null],
		prog: [0, 0, 1, 0, 0, 0, 3, 2],
		pluckOct: -1,
		ney: null,
		lead: [
			[[0, 7, 2], [2, 6, 2], [4, 5, 2], [6, 4, 2], [8, 3, 2], [10, 2, 2], [12, 1, 2], [14, 0, 2]],
			[[0, 0, 4], [4, 2, 2], [6, 3, 2], [8, 4, 4], [12, 3, 2], [14, 2, 2]],
			[[0, 4, 2], [2, 4, 2], [4, 5, 4], [8, 4, 2], [10, 3, 2], [12, 2, 2], [14, 1, 2]],
			[[0, 7, 6], [6, 6, 2], [8, 5, 4], [12, 4, 4]],
			[[0, 4, 2], [2, 5, 2], [4, 6, 2], [6, 7, 2], [8, 7, 6], [14, 6, 2]],
			[[0, 2, 4], [4, 3, 4], [8, 4, 4], [12, 5, 2], [14, 4, 2]],
			[[0, 7, 4], [4, 7, 2], [6, 6, 2], [8, 5, 4], [12, 6, 2], [14, 4, 2]],
			[[0, 4, 2], [2, 3, 2], [4, 2, 2], [6, 1, 2], [8, 0, 8]],
		],
		vol: { drone: 0.14, davul: 0.7, darb: 0.36, pluck: 0.5, ney: 0, kanun: 0.0, zurna: 0.4 },
		layers: (bar) => ({ davul: true, darb: bar >= 1, pluck: true, ney: false, kanun: false, zurna: bar >= 2 }),
		zilBar: [0],
		intensity: true,
	},
	// Zafer: kısa, coşkulu. Rast. 3 ölçü + sonlandırma.
	victory: {
		makam: 'rast',
		root: ROOT,
		step: 0.1,
		len: 16,
		cycle: 4,
		once: true,
		davul: 'D.t.D.tTD.t.D.TT',
		davul2: 'DtTtDtTtDtTtDTDT',
		darb: 'd.ktd.ktd.ktdktk',
		pluck: [0, 2, 4, 7, 4, 2, 4, 7, 9, 7, 4, 7, 9, 11, 9, 7],
		prog: [0, 0, 0, 0],
		pluckOct: 0,
		ney: null,
		lead: [
			[[0, 0, 2], [2, 2, 2], [4, 4, 4], [8, 7, 8]],
			[[0, 9, 3], [3, 7, 1], [4, 9, 2], [6, 11, 2], [8, 11, 8]],
			[[0, 11, 2], [2, 9, 2], [4, 7, 4], [8, 9, 2], [10, 7, 2], [12, 4, 4]],
			[[0, 7, 16]],
		],
		vol: { drone: 0.16, davul: 0.7, darb: 0.3, pluck: 0.5, ney: 0, kanun: 0.45, zurna: 0.46 },
		layers: () => ({ davul: true, darb: true, pluck: true, ney: false, kanun: true, zurna: true }),
		zilBar: [0, 2],
	},
};

export const THEME_NAMES = Object.keys(THEMES);

// ---------------------------------------------------------------- iz (parça)
class Track {
	constructor(m, name, cfg, t0, seed) {
		this.m = m;
		this.e = m.e;
		this.name = name;
		this.cfg = cfg;
		this.r = rng(seed);
		this.i = 0; // adım sayacı
		this.next = t0;
		this.t0 = t0;
		this.done = false;
		this.dead = false;
		const e = this.e;
		const c = e.ctx;
		this.out = c.createGain();
		this.out.gain.setValueAtTime(0.0001, t0);
		this.out.gain.linearRampToValueAtTime(cfg.level || 1, t0 + (name === 'victory' ? 0.05 : 1.2));
		this.out.connect(e.musicIn);
		this.vib = e.makeVibrato(5.3, 14);
		this.drone = drone(e, cfg.root * 0.5, cfg.vol.drone, this.out);
		this.bar = 0;
		this.pendLead = [];
	}

	hz(deg, oct = 0) {
		return degHz(this.cfg.makam, deg + oct * 7, this.cfg.root);
	}

	// intensity: kuşatmada ölçü ilerledikçe 0..1
	intensity() {
		if (!this.cfg.intensity) return 0.5;
		return Math.min(1, this.bar / 14);
	}

	pump(until) {
		const cfg = this.cfg;
		let guard = 0;
		while (!this.done && this.next < until && guard++ < 400) {
			this.stepAt(this.i, this.next);
			this.i++;
			this.next += cfg.step;
			// tek seferlik parça: son ölçü bitince kapat
			if (cfg.once && this.i >= cfg.len * cfg.cycle) this.finish();
		}
	}

	finish() {
		this.done = true;
		this.drone.stop(this.next, 1.4);
	}

	stepAt(i, t) {
		const cfg = this.cfg;
		const e = this.e;
		const s = i % cfg.len;
		const bar = Math.floor(i / cfg.len);
		const bc = bar % cfg.cycle;
		const L = cfg.layers(bc);
		const v = cfg.vol;
		const r = this.r;
		if (s === 0) this.bar = bar;
		const k = this.intensity();
		const tail = cfg.once && bar === cfg.cycle - 1; // son ölçü: büyük vuruş, toplu tel, uzun nota
		const hum = (r() - 0.5) * 0.008; // insan gibi küçük zaman oynaması

		// -- davul
		if (L.davul && !tail) {
			const pat = cfg.intensity && k > 0.55 && cfg.davul2 && bc % 2 === 1 ? cfg.davul2 : cfg.davul;
			const ch = pat[s];
			const vel = 0.85 + r() * 0.3;
			if (ch === 'D') e.hit('dum', t + hum, v.davul * vel, 0.95 + r() * 0.1, 0, this.out);
			else if (ch === 'T') e.hit('tek', t + hum, v.davul * 0.8 * vel, 0.95 + r() * 0.1, 0.1, this.out);
			else if (ch === 't') e.hit('tek', t + hum, v.davul * 0.34 * vel, 1.15, -0.1, this.out);
			// kuşatma: ölçü sonunda davul yuvarlanır
			if (cfg.intensity && k > 0.35 && bc % 2 === 1 && s >= 12 && s % 1 === 0) e.hit('tek', t, v.davul * (0.25 + (s - 12) * 0.12), 1.1 + r() * 0.1, (r() - 0.5) * 0.4, this.out);
		}
		if (tail && s === 0) {
			e.hit('dumBig', t, 0.9, 1, 0, this.out);
			e.hit('zil', t, 0.55, 1, 0, this.out);
		}
		// -- darbuka
		if (L.darb && !tail) {
			const ch = cfg.darb[s];
			const vel = 0.8 + r() * 0.4;
			const dv = v.darb * (cfg.intensity ? 0.7 + k * 0.5 : 1);
			if (ch === 'd') e.hit('dbDoum', t + hum, dv * vel, 1, -0.25, this.out);
			else if (ch === 't') e.hit('dbTek', t + hum, dv * 0.8 * vel, 1, 0.25, this.out);
			else if (ch === 'k') e.hit('dbKa', t + hum, dv * 0.55 * vel, 1, 0.2, this.out);
		}
		// -- zil: belirli ölçülerin başında
		if (s === 0 && cfg.zilBar && cfg.zilBar.indexOf(bc) >= 0 && !tail) e.hit('zil', t, 0.28 + 0.22 * k, 1, 0, this.out);
		// -- bağlama düzeni
		if (L.pluck && !tail) {
			const deg = cfg.pluck[s % cfg.pluck.length];
			if (deg !== null && deg !== undefined) {
				const off = cfg.prog[bc % cfg.prog.length];
				// ara sıra nota atla: sıkmasın
				if (r() > 0.1 || cfg.once) e.pluck('baglama', this.hz(deg + off, cfg.pluckOct), t + hum, v.pluck * (0.7 + r() * 0.3), (r() - 0.5) * 0.5, this.out);
			}
		}
		// -- kanun: ölçü başında yüksek bir ışıltı/arpej
		if (L.kanun && !tail && v.kanun > 0) {
			const q = Math.round(cfg.len / 4);
			if (s % q === 0 && s !== 0 && r() < 0.7) {
				const deg = [4, 7, 9, 6, 11][Math.floor(r() * 5)] + cfg.prog[bc % cfg.prog.length];
				const f = this.hz(deg, 0);
				e.pluck('kanun', f, t, v.kanun * (0.6 + r() * 0.4), -0.35, this.out);
				if (!e.low) e.pluck('kanun', f, t + 0.012, v.kanun * 0.5, 0.35, this.out, 6);
			}
		}
		if (tail && s === 0) {
			// zafer: son akorda toplu çırpma
			[0, 2, 4, 7, 9, 11].forEach((d, n) => e.pluck('kanun', this.hz(d, 0), t + n * 0.035, v.kanun * 0.8, -0.4 + n * 0.16, this.out));
		}
		// -- melodi notaları (ney / zurna)
		if (s === 0) {
			this.pendLead = [];
			if (L.ney && cfg.ney && cfg.ney[bc]) for (const n of cfg.ney[bc]) this.pendLead.push({ kind: 'ney', n });
			if (L.zurna && cfg.lead && cfg.lead[bc]) for (const n of cfg.lead[bc]) this.pendLead.push({ kind: 'zurna', n });
		}
		for (const p of this.pendLead) {
			if (p.n[0] !== s) continue;
			const deg = p.n[1];
			const len = p.n[2];
			const dur = Math.max(0.1, len * cfg.step * 0.94);
			const f = this.hz(deg, 0);
			if (p.kind === 'ney') {
				ney(e, t, f, dur, v.ney, { to: this.out, vib: this.vib.out, pan: -0.1 });
			} else {
				// vurguyu yükselt: yoğunluk arttıkça
				const lv = v.zurna * (cfg.intensity ? 0.7 + k * 0.5 : 1);
				zurna(e, t, f, dur, lv, { to: this.out, vib: this.vib.out, bend: len >= 4 ? 60 : 0, pan: 0.1, bright: cfg.intensity && k > 0.5 });
			}
		}
	}

	// çıkışta: ses kapat, düğümleri bırak
	stop(at, fade = 0.8) {
		if (this.dead) return;
		this.dead = true;
		this.done = true;
		try {
			const g = this.out.gain;
			g.cancelScheduledValues(at);
			g.setValueAtTime(Math.max(0.0001, g.value), at);
			g.linearRampToValueAtTime(0.0001, at + fade);
			this.drone.stop(at, fade);
			this.vib.osc.stop(at + fade + 0.1);
			this.vib.osc.onended = () => {
				try {
					this.vib.out.disconnect();
					this.out.disconnect();
				} catch (err) {
					/* yok say */
				}
			};
		} catch (err) {
			/* yok say */
		}
	}
}

// ---------------------------------------------------------------- yönetici
export class Music {
	constructor(engine) {
		this.e = engine;
		this.track = null;
		this.theme = null;
		this.timer = 0;
		this.seed = 1;
	}

	// theme: ad ya da null (sus)
	set(theme, opts = {}) {
		const e = this.e;
		if (!e.ctx) return;
		const now = e.ctx.currentTime;
		if (theme === this.theme && this.track && !this.track.dead && !opts.force) return;
		if (this.track) {
			this.track.stop(now + 0.02, opts.fade || 0.9);
			this.track = null;
		}
		this.theme = theme;
		if (!theme || !THEMES[theme]) {
			this.theme = null;
			return;
		}
		this.track = new Track(this, theme, THEMES[theme], now + 0.06, this.seed++ * 101 + 7);
		this.pump(now + 0.5);
	}

	pump(until) {
		if (this.track) this.track.pump(until);
	}

	// gerçek zamanlı çalışma: 80 ms'de bir 0.45 sn ilerisini planla
	start() {
		this.stopTimer();
		if (typeof setInterval === 'undefined') return;
		this.timer = setInterval(() => {
			try {
				if (this.e.ctx && this.e.ctx.state === 'running') this.pump(this.e.ctx.currentTime + 0.45);
			} catch (err) {
				/* yok say */
			}
		}, 80);
	}

	stopTimer() {
		if (this.timer) clearInterval(this.timer);
		this.timer = 0;
	}

	// bekleme sonrası (sekme dönüşü) zaman kaymasını düzelt
	resync() {
		const t = this.track;
		if (!t || t.dead) return;
		const now = this.e.ctx.currentTime;
		if (t.next < now) t.next = now + 0.05;
	}
}
