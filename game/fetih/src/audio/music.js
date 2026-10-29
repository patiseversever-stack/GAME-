// Müzik çalar: pişirilmiş döngüleri (bank.js) çalar, temalar arası eş güçlü geçiş yapar.
// Çalışma zamanında zamanlayıcı ya da nota üretimi yok: tema başına tek (ya da hot katmanıyla iki) AudioBufferSource döner.
//
// - Geçiş: eş güçlü (sin/cos) eğriyle; aynı `sync` grubundaki temalar (maç, düello, kuşatma) ölçü hizasında girer, yani
//   müzik değişmez, "yükselir".
// - hot katmanı: gerilim (süre azalıyor) arttıkça açılır, azalınca kapanır (intensity).
// - Hiçbir yerde istisna fırlatmaz.
export { THEME_NAMES } from './songs.js';

const N = 48;
const IN = new Float32Array(N);
const OUT = new Float32Array(N);
for (let i = 0; i < N; i++) {
	IN[i] = Math.sin((Math.PI / 2) * (i / (N - 1)));
	OUT[i] = Math.cos((Math.PI / 2) * (i / (N - 1)));
}

const FADE = { menu: 1.4, campaign: 1.4, match: 1.1, duel: 0.8, siege: 0.8, victory: 1.2, defeat: 2.0 };

export class Music {
	constructor(sfx) {
		this.s = sfx;
		this.cur = null; // {name, entry, out, srcs, hotG, t0, off}
		this.theme = null; // istenen
		this.hot = 0;
		this.gen = 0;
	}

	get playing() {
		return this.cur ? this.cur.name : null;
	}

	/** Sessiz ya da bağlam yokken çağrılırsa yalnızca istek hatırlanır; açılınca Sfx yeniden çağırır. */
	set(theme, o = {}) {
		try {
			const s = this.s;
			const e = s.e;
			this.theme = theme;
			if (!e.ctx || s.muted) return;
			if (!theme) return this._stop(o.fade === undefined ? 1.2 : o.fade);
			if (this.cur && this.cur.name === theme && !o.force) return;
			const ent = s.bank.music.get(theme);
			if (ent) return this._begin(theme, ent, o);
			// henüz pişmedi: öne al ve hazır olunca (hâlâ isteniyorsa) başlat
			if (!s.bank.can) return;
			s.bank.requestMusic(theme, 0);
			const g = ++this.gen;
			s.bank.once('music:' + theme, () => {
				if (g !== this.gen || this.theme !== theme || s.muted || !e.ctx) return;
				const m = s.bank.music.get(theme);
				if (m && !(this.cur && this.cur.name === theme)) this._begin(theme, m, o);
			});
		} catch (err) {
			/* müzik yoksa oyun sessiz devam eder */
		}
	}

	_begin(theme, ent, o) {
		const s = this.s;
		const e = s.e;
		const c = e.ctx;
		this.gen++;
		const prev = this.cur;
		const fade = o.fade !== undefined ? o.fade : FADE[theme] || 1.2;
		const t = c.currentTime + 0.05 + (o.delay || 0);
		// ölçü hizası: aynı sync grubunda önceki döngünün konumundan devam
		let off = 0;
		if (prev && ent.sync && prev.entry.sync === ent.sync && Math.abs(prev.entry.len - ent.len) < 0.02) off = (prev.off + Math.max(0, t - prev.t0)) % ent.len;
		// giriş eğrisi `out`ta, çıkış eğrisi ayrı `ret` kazancında: ikisi çarpılır, arada kesilme olursa bile süreksizlik yok
		const out = c.createGain();
		out.gain.setValueAtTime(0, t);
		try {
			out.gain.setValueCurveAtTime(IN, t, Math.max(0.05, fade));
		} catch (err) {
			out.gain.linearRampToValueAtTime(1, t + fade);
		}
		const ret = c.createGain();
		out.connect(ret);
		let hotG = null;
		const srcs = ent.stems.map((b, i) => {
			const src = c.createBufferSource();
			src.buffer = b;
			src.loop = true;
			if (i === 0) src.connect(out);
			else {
				hotG = c.createGain();
				hotG.gain.value = this.hot;
				src.connect(hotG);
				hotG.connect(out);
			}
			src.start(t, off % b.duration);
			return src;
		});
		ret.connect(e.musicIn);
		if (prev) this._retire(prev, t, fade);
		this.cur = { name: theme, entry: ent, out, ret, srcs, hotG, t0: t, off };
		s.bank.touch(theme);
	}

	_retire(p, t, fade) {
		try {
			p.ret.gain.setValueAtTime(1, t);
			p.ret.gain.setValueCurveAtTime(OUT, t, Math.max(0.05, fade));
		} catch (err) {
			/* yok say */
		}
		const end = t + fade + 0.08;
		p.srcs.forEach((src, i) => {
			try {
				src.stop(end);
			} catch (err) {
				/* yok say */
			}
			if (i === 0)
				src.onended = () => {
					try {
						p.ret.disconnect();
						p.out.disconnect();
						for (const x of p.srcs) x.disconnect();
						if (p.hotG) p.hotG.disconnect();
					} catch (err) {
						/* yok say */
					}
				};
		});
	}

	_stop(fade) {
		const p = this.cur;
		if (!p) return;
		this.cur = null;
		this._retire(p, this.s.e.ctx.currentTime + 0.02, fade);
	}

	/** Gerilim 0..1: hot katmanı olan temalarda ek katmanı açar/kapar. */
	intensity(x, tc = 0.35) {
		x = x > 1 ? 1 : x < 0 ? 0 : x;
		if (x === this.hot) return;
		this.hot = x;
		try {
			const p = this.cur;
			if (p && p.hotG) p.hotG.gain.setTargetAtTime(x, this.s.e.ctx.currentTime, tc);
		} catch (err) {
			/* yok say */
		}
	}

	/** Çalan temayı sessizce bırak (sessize alındığında bağlam askıya alınır; geri gelince set() yeniden çağrılır). */
	reset() {
		this.cur = null;
	}
}
