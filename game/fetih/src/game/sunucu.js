// SUNUCU ADIMLARI (v1.2): yeni soru tiplerinin çevrimiçi (sunucu otoriter) yürütmesi. Match.ask, uzak bir koltuk soruyu
// cevaplarken o tipin adımlarını burada çalıştırır: istemcinin bilmemesi gereken her şey (gizli il, kelime, yanlışın yeri,
// fitilin süresi, mini soruların cevapları) sunucuda kalır; istemci bir eylem (act) gönderir, sunucu kendi saatiyle
// damgalar, kendi kaydını tutar ve yalnız o an gereken kadarını olay (ev) olarak döner. Son değer istemcinin bildirdiği
// değil sunucunun kaydıdır (final). Şema ve akış şeması: net.js başı, ref/mac-entegrasyon-v12/rapor.md.
//
//   Ortak: kart açılış onayı (act 'acildi'): koltuğun saati sunucuya bu onayın varışıyla başlar (gelmezse isteğin
//   gönderilişiyle). Cevap süresi = cevabın varışı − saat başı (sunucu saati); istemcinin bildirdiği süre kullanılmaz.
//
//   tip        eylem (koltuk → sunucu)      olay (sunucu → koltuk)                      son değer (sunucunun kaydı)
//   harfal     'harf' {}                    'harf' { i, c } (açılan kutu ve harfi)       { g: yazılan, al: sunucunun açtıkları }
//   ilavi      'il' { il }                  'il' { il, km, dir, found, hint, left }      { taps: sunucuya gelen dokunuşlar }
//   kimim      'il' { il }                  'il' { il, ok, lock } · 'ipucu' { k, text }  { taps, at: dokunuşun sunucu zamanından }
//   sive       (yok; cevap { il })          reveal: v.heat (sunucu istatistiği)          { il } doğrulanmış plaka
//   kayip      (yok; cevap şık)             'ipucu' { k, text, il? } saatinde            şık
//   yanlis     'yer' { w } (bir kez)        'yer' { w, ok, opts? }                       { w: ilk işaret, f: yer doğruysa }
//   halat      'halat' { k, c }             'halat' { k, ok, r } · herkese 'ip' { nets } { log: sunucu damgalı basışlar }
//   fitil      'fitil' { k, c }             herkese 'top' { ev: [olaylar] } (açılış, cevap, patlama)   iki tarafın kaydı
//   azbilinen  (yok; cevap sıra)            reveal: gerçek seçilme oranları (istatistik) { sıra }
//   tufan, kusbakisi, kayip, golge, ikidogru: şık (0..n−1) · mancinik: sayı (min..max): yalnız doğrulama
//
// İstatistik (Az Bilinen, Şive): Match cfg.istatistik ile bir Istatistik nesnesi alır (sunucu saklar, JSON); yoksa
// çevrimdışı tahmini oranlar ve kalabalık kullanılır.

import { clock, setTimeout, clearTimeout, setInterval, clearInterval } from '../core/clock.js';
import { rng } from '../core/math.js';
import { tally } from '../quiz/d_halat.js';
import { engine } from '../quiz/d_fitil.js';
import { between } from '../quiz/d_ilavi.js';
import { GAP as KIMIM_GAP, LOCK as KIMIM_LOCK } from '../quiz/d_kimim.js';
import { karma } from '../quiz/mac.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
const clampN = (x, a, b) => (x < a ? a : x > b ? b : x);
const isInt = (x, n) => Number.isInteger(x) && x >= 0 && x < n;
const plate = (x) => (BY_ID.has(Number(x)) ? Number(x) : null);

/** Sunucu saatiyle cevap süresi (sn): varış − saat başı, [0, üst] aralığında. */
export const serverTime = (t0, at, hi) => clampN((at - t0) / 1000, 0, hi);

/** Şık doğrulama: tamsayı ve şık sayısı içinde, yoksa null. */
const choice = (S, x) => (isInt(x, S.v.opts?.length ?? S.v.facts?.length ?? 4) ? x : null);

/**
 * Tip adımları. Her biri isteğe bağlı: open(S) (koltuğun kartı açıldı), acts[k](S, d) (eylem), final(S, value) (son
 * değer), before(m, cur) (yargıdan önce, bir kez: gerçek oranlar), after(m, cur, out) (yargıdan sonra: istatistik),
 * duo (iki koltuklu ortak tur: open/act bir kez kurulan cur.duo üstünde).
 * S = { m, cur, v, p, st (koltuğun durumu), t() (saat başından sn), send(k, d) (bu koltuğa), all(k, d) (bütün uzak
 * koltuklara), later(fn, ms) (soru kapanınca iptal) }.
 */
export const ADIM = {
	harfal: {
		open(S) {
			S.st.al = [];
			S.st.free = new Set();
			S.st.R = rng(parseInt(karma(S.m.salt + S.v.q.id + S.p.i), 16) || 1);
		},
		acts: {
			harf(S) {
				const n = S.v.n;
				const closed = [];
				for (let i = 0; i < n; i++) if (!S.st.al.includes(i) && !S.st.free.has(i)) closed.push(i);
				if (closed.length <= 1) return S.send('harf', { i: -1 }); // son harf alınamaz
				const i = closed[Math.floor(S.st.R() * closed.length)];
				S.st.al.push(i);
				S.send('harf', { i, c: [...S.v.word][i] });
			},
		},
		/** Yarı yarıya jokeri bedava harf açar (puan düşmez): sunucu bunları sayılmayan kutu olarak kaydeder. */
		joker(S, effect) {
			for (const i of effect?.data?.open || []) S.st.free.add(i);
		},
		final(S, value) {
			const g = typeof value?.g === 'string' ? value.g.slice(0, 24) : '';
			return { g, al: S.st.al.slice() };
		},
	},

	ilavi: {
		open(S) {
			S.st.taps = [];
			S.st.found = false;
		},
		acts: {
			il(S, d) {
				const id = plate(d?.il);
				const st = S.st;
				if (id == null || st.found || st.taps.length >= S.v.tries || st.taps.includes(id)) return S.send('il', { il: d?.il ?? null, rejected: true });
				st.taps.push(id);
				const i = BY_ID.get(id);
				const found = i === S.v.hedef;
				if (found) st.found = true;
				const b = found ? { km: 0, dir: '' } : between(i, S.v.hedef);
				const k = st.taps.length;
				S.send('il', { il: id, km: b.km, dir: b.dir, found, left: S.v.tries - k, hint: found ? '' : S.v.hints[k] || '' });
			},
		},
		final(S) {
			return { taps: S.st.taps.slice() };
		},
	},

	kimim: {
		open(S) {
			S.st.taps = [];
			S.st.at = 0;
			S.st.found = false;
			S.st.lock = 0;
			// ipuçları sunucunun saatiyle: her GAP sn'de bir (ilk ipucu görünümde zaten var)
			for (let k = 1; k < S.v.clues.length; k++) S.later(() => S.send('ipucu', { k, text: S.v.clues[k] }), (S.v.gap || KIMIM_GAP) * 1000 * k);
		},
		acts: {
			il(S, d) {
				const id = plate(d?.il);
				const st = S.st;
				const t = S.t();
				if (id == null || st.found || t < st.lock) return S.send('il', { il: d?.il ?? null, ok: false, rejected: true });
				st.taps.push(id);
				if (BY_ID.get(id) === S.v.hedef) {
					st.found = true;
					st.at = clampN(Math.floor(t / (S.v.gap || KIMIM_GAP)), 0, S.v.clues.length - 1);
					return S.send('il', { il: id, ok: true });
				}
				st.lock = t + KIMIM_LOCK;
				S.send('il', { il: id, ok: false, lock: KIMIM_LOCK });
			},
		},
		final(S) {
			return { taps: S.st.taps.slice(), at: S.st.at };
		},
	},

	kayip: {
		open(S) {
			const at = S.v.hintAt || [];
			const P = PROV[S.v.hedef];
			at.forEach((sec, k) => S.later(() => S.send('ipucu', { k, text: S.v.hints[k], ...(k === 0 ? { bolge: P.region } : k === 1 ? { il: S.v.nb } : {}) }), sec * 1000));
		},
		final: (S, x) => choice(S, x),
	},

	sive: {
		final(S, value) {
			const il = plate(value?.il);
			return il == null ? null : { il };
		},
		/** Isı haritası: sunucunun biriktirdiği gerçek dokunuşlar (bu maçınkiler dahil), cevapla gider. */
		after(m, cur, out) {
			if (!m.stats) return;
			for (const r of out) if (r.value?.il != null) m.stats.add('sive', cur.q.id, r.value.il);
			const c = m.stats.counts('sive', cur.q.id);
			const list = [];
			const total = Object.values(c).reduce((a, b) => a + b, 0) || 1;
			const k = Math.min(1, 240 / total); // en çok ~240 dokunuş gider (oran korunur)
			for (const [il, n] of Object.entries(c)) for (let j = 0, e = Math.max(1, Math.round(n * k)); j < e; j++) list.push(Number(il));
			cur.v.heat = list;
		},
	},

	yanlis: {
		open(S) {
			S.st.w = null;
		},
		acts: {
			yer(S, d) {
				const w = Number(d?.w);
				if (S.st.w != null || !isInt(w, S.v.words.length)) return S.send('yer', { w: d?.w ?? null, ok: false, rejected: true });
				S.st.w = w;
				const ok = w === S.v.bad;
				S.send('yer', ok ? { w, ok, opts: S.v.opts.slice() } : { w, ok });
			},
		},
		final(S, value) {
			const w = S.st.w;
			if (w == null) return null;
			const f = w === S.v.bad && isInt(value?.f, S.v.opts.length) ? value.f : null;
			return { w, f };
		},
	},

	azbilinen: {
		final: (S, x) => (isInt(x, S.v.pool.length) ? x : null),
		/**
		 * Gerçek seçilme oranları: istatistikte yeterli cevap varsa tahmini oran gerçeğe doğru kayar (Bayes: tahmin 20
		 * cevaplık ağırlıkla başlar). Yargı bu oranlarla yapılır; bu maçın seçimleri sonra eklenir.
		 */
		before(m, cur) {
			if (!m.stats) return;
			const v = cur.v;
			const c = m.stats.counts('azbilinen', v.q.id);
			const n = c.n || 0;
			if (!n) return;
			const K = 20;
			v.pct = v.pct.map((p, i) => (p < 0 ? p : Math.round((p * K + 100 * (c[i] || 0)) / (K + n))));
			v.oran = n >= 30 ? 'gercek' : 'karma';
		},
		after(m, cur, out) {
			if (!m.stats) return;
			for (const r of out) if (Number.isInteger(r.value)) m.stats.add('azbilinen', cur.q.id, r.value);
		},
	},

	halat: {
		duo: true,
		open(S) {
			S.st.log = [];
			const D = S.duo();
			if (D.halat) return;
			// botların kaydı (önceden üretilmiş, gerçekçi okuma hızı) sunucu saatinde canlı yayınlanır
			D.halat = true;
			D.bots = S.cur.bots.filter((b) => S.cur.who.includes(b.p) && !b.p.ctl.remote); // uzak koltuğun yedek bot cevabı sayılmaz
			const times = new Set();
			for (const b of D.bots) for (const a of b.value?.log || []) times.add(Math.round(a[2] * 1000));
			for (const ms of [...times].sort((a, b) => a - b)) S.later(() => ADIM.halat.ip(S), ms + 5);
		},
		/** Halatın konumu: her tarafın neti (tally: kilit ve sıra kuralları sunucuda). */
		ip(S) {
			const D = S.duo();
			const t = (clock.now() - D.t0) / 1000;
			const nets = S.cur.who.map((p) => {
				const b = D.bots.find((x) => x.p === p);
				const log = b ? (b.value?.log || []).filter((a) => a[2] <= t) : S.stOf(p)?.log || [];
				return tally(S.v, log).net;
			});
			S.all('ip', { nets, t: Math.round(t * 100) / 100 });
		},
		acts: {
			halat(S, d) {
				const k = Number(d?.k);
				const c = Number(d?.c);
				const n = S.v.items.length;
				if (!Number.isInteger(k) || k < 0 || !Number.isInteger(c)) return;
				const t = Math.round(S.t() * 100) / 100;
				if (t > S.v.sec + 0.5) return S.send('halat', { k, ok: false, late: true });
				S.st.log.push([k, c, t]);
				const r = S.v.key[k % n];
				S.send('halat', { k, ok: c === r, r });
				ADIM.halat.ip(S);
			},
		},
		final(S) {
			return { log: S.st.log.slice() };
		},
	},

	fitil: {
		duo: true,
		open(S) {
			const D = S.duo();
			if (D.E) return;
			// ortak tur: iki taraf tek motorda (saldıran 0, savunan 1); botun planı (sheet) motorda, uzak koltuk canlı
			const P = S.cur.who.map((p) => {
				if (p.ctl.remote) return { log: [] };
				const b = S.cur.bots.find((x) => x.p === p);
				return { sheet: b?.value?.me?.sheet || [] };
			});
			D.P = P;
			D.E = engine(S.v, P);
			D.sent = 0;
			const push = () => {
				const ev = D.E.ev;
				if (ev.length > D.sent) {
					S.all('top', { ev: ev.slice(D.sent) });
					D.sent = ev.length;
				}
			};
			D.push = push;
			D.tick = setInterval(() => {
				if (S.cur.closed) return clearInterval(D.tick);
				D.E.adv((clock.now() - D.t0) / 1000);
				push();
				if (D.E.done) clearInterval(D.tick);
			}, 100);
			S.cur.timers.push(D.tick);
			push();
		},
		acts: {
			fitil(S, d) {
				const D = S.duo();
				if (!D.E) return;
				const side = S.cur.who.indexOf(S.p);
				const k = Number(d?.k);
				const c = Number(d?.c);
				const t = Math.round(((clock.now() - D.t0) / 1000) * 100) / 100;
				const ok = Number.isInteger(k) && D.E.act(side, k, c, t);
				if (ok) D.P[side].log.push([k, c, t]);
				S.send('fitil', { k, accepted: ok });
				D.push();
			},
		},
		final(S) {
			const D = S.duo();
			const side = S.cur.who.indexOf(S.p);
			return { side, me: D.P[side], vs: D.P[1 - side] };
		},
	},

	mancinik: {
		final(S, x) {
			const q = S.v.q;
			const n = Number(x);
			return Number.isFinite(n) && n >= q.min && n <= q.max ? n : null;
		},
	},
	tufan: { final: (S, x) => choice(S, x) },
	kusbakisi: { final: (S, x) => choice(S, x) },
	golge: { final: (S, x) => choice(S, x) },
	ikidogru: { final: (S, x) => choice(S, x) },
};

/**
 * Sunucu istatistiği (Az Bilinen seçilme oranları, Şive ısı haritası). Düz nesne: JSON'a çevrilir, sunucu saklar.
 * counts(tip, soru) → { anahtar: sayı, n: toplam }.
 */
export class Istatistik {
	constructor(data = {}) {
		this.data = data;
	}
	add(type, qid, key) {
		const t = (this.data[type] ||= {});
		const c = (t[qid] ||= { n: 0 });
		c[key] = (c[key] || 0) + 1;
		c.n++;
	}
	counts(type, qid) {
		const c = this.data[type]?.[qid] || { n: 0 };
		const out = {};
		for (const [k, v] of Object.entries(c)) if (k !== 'n') out[k] = v;
		if (type === 'azbilinen') out.n = c.n || 0;
		return out;
	}
	toJSON() {
		return this.data;
	}
}

/**
 * Sorunun sunucu oturumu: Match.ask uzak koltuklar için kurar. seats: uzak koltuklar; her biri için açılış (onay ya da
 * gönderim), eylem yönlendirme ve son değer. Tip adımı yoksa yalnız süre ölçülür.
 */
export class Oturum {
	constructor(m, cur) {
		this.m = m;
		this.cur = cur;
		this.A = ADIM[cur.q.type] || null;
		this.seat = new Map(); // koltuk → { st, t0, opened }
		this.duoState = { t0: clock.now() };
		this.timers = [];
	}
	/** Uzak koltuğa soru gitti: saat şimdilik gönderimden; onay gelince onay anından. Onay 3 sn gelmezse açılır. */
	sent(p) {
		const s = { st: {}, t0: clock.now(), opened: false };
		this.seat.set(p.i, s);
		this.timers.push(setTimeout(() => this.open(p), 3000));
	}
	/** Kart açılış onayı (act 'acildi'): koltuğun saati başlar, tipin açılış adımı çalışır. */
	open(p, ack = false) {
		const s = this.seat.get(p.i);
		if (!s || s.opened || this.cur.closed) return;
		s.opened = true;
		if (ack) s.t0 = clock.now();
		this.A?.open?.(this.S(p));
	}
	act(p, k, d) {
		const s = this.seat.get(p.i);
		if (!s || this.cur.closed) return false;
		const fn = this.A?.acts?.[k];
		if (!fn) return false;
		if (!s.opened) this.open(p);
		fn(this.S(p), d);
		return true;
	}
	joker(p, effect) {
		const s = this.seat.get(p.i);
		if (s && this.A?.joker) {
			if (!s.opened) this.open(p);
			this.A.joker(this.S(p), effect);
		}
	}
	/** Son değer (sunucunun kaydı) ve sunucu saatiyle süre. */
	final(p, r, hi) {
		const s = this.seat.get(p.i);
		if (!s) return r;
		if (!s.opened) this.open(p);
		const time = serverTime(s.t0, r ? r.at : clock.now(), hi);
		let value = r ? r.value : null;
		if (this.A?.final) value = this.A.final(this.S(p), value);
		return { value, time };
	}
	S(p) {
		const s = this.seat.get(p.i);
		const m = this.m;
		const cur = this.cur;
		const self = this;
		return {
			m,
			cur,
			v: cur.v,
			p,
			st: s.st,
			t: () => (clock.now() - s.t0) / 1000,
			send: (k, d) => p.ctl.event(k, d),
			all: (k, d) => {
				for (const x of m.players) if (x.ctl.remote) x.ctl.event(k, d);
			},
			later: (fn, ms) => {
				const h = setTimeout(() => !cur.closed && fn(), ms);
				self.timers.push(h);
				return h;
			},
			duo: () => this.duoState,
			stOf: (q) => this.seat.get(q.i)?.st,
		};
	}
	close() {
		for (const t of this.timers) clearTimeout(t);
		this.timers.length = 0;
	}
}
