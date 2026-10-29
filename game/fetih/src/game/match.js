// Maç: başkentler → yayılma turları (tahmin/harita: en yakın seçer) → fetih turları (çark + düello)
// → kale kuşatması (üç kule) → puan. 1'e 1, 3 kişi, 4 kişi ve eşli (2'ye 2) modlar.
//
// Akış async/await ile yazılır; arayüz (ui) her adımı Promise ile bekletir. Her koltuğun bir
// kontrolcüsü (`p.ctl`, bkz. net.js) vardır: insan (arayüz), bot ya da uzak oyuncu. Match koltuğun
// ne olduğuna bakmaz; böylece sunucu aynı sınıfı sürebilir. Hızlı benzetim (debugSim) için ui.fast = true.
//
// cfg (h.start(cfg)):
//   mode      '1v1' | 'ffa3' | 'ffa4' | 'team'
//   length    'quick' (bir bölge) | 'long' (tüm Türkiye)
//   region    bölge anahtarı ya da 'all'
//   bot       'caylak' | 'er' | 'usta' | 'efsane' | 'auto' (oyuncu puanına göre)
//   seed      tohum (aynı tohum aynı maç)
//   humanName insan oyuncunun adı (vars. 'Sen')
//   -- sefer ve kimlik --
//   campaign  true: sefer sahnesi; stage: sahne kimliği ('ege-1'); opponents: [{name,title,costume,skill,boss,ally,quote}]
//   commander menüde seçilen komutan: { name, avatar, banner, skin, color (oyuncu renk sırası), colorHex }.
//             İnsanın rengi buradan gelir (haritada sahiplik, kale, HUD, sancak, düello kartı); botlar kalan renkleri alır.
//   diffBias  soru zorluğuna eklenen kayma (sefer); perks { startProvinces, botJokers }
//   -- test ve ağ --
//   allBots   hepsi bot (benzetim); levels: ['usta','er',…] koltuk başına bot seviyesi
//   seats     ['ui'|'bot'|'remote', …] koltuk türleri; transports: { koltuk: Transport }
//   ranked    true: ELO güncellenir; persist=false: ilerleme kaydedilmez

import { TYPES, pickType } from '../quiz/types.js';
import { CATS } from '../quiz/categories.js';
import { BANK as QUESTIONS } from '../data/bank.js';
import { rng } from '../core/math.js';
import { JOKERS, JOKER_ORDER, PER_QUESTION, BOT_BOOST, SABOTAGE, makeLoadout, botLoadout, support, computeEffect, botPlan } from './jokers.js';
import { ensureSystems } from './campaign.js';
import { targetDiff } from './progress.js';
import { UIController, BotController, RemoteController, publicView, PROTOCOL } from './net.js';
import { botLook } from './commanders.js';

export const MODES = {
	'1v1': { players: 2, teams: null, label: "1'e 1" },
	ffa3: { players: 3, teams: null, label: '3 Kişi' },
	ffa4: { players: 4, teams: null, label: '4 Kişi' },
	team: { players: 4, teams: [0, 1, 0, 1], label: 'Eşli' },
};

export const BOT_LEVELS = { caylak: 0.35, er: 0.55, usta: 0.72, efsane: 0.86 };
const BOT_NAMES = ['Kaan', 'Elif', 'Mert', 'Zeynep', 'Emir', 'Defne', 'Arda', 'Ece', 'Baran', 'Nehir'];
const VALUE = { pick: 200, conquer: 200, defend: 100, castle: 1000 };
const WHEEL_CATS = Object.keys(CATS);

/** Tempo: bir maçtaki hedef düello sayısı (tur sayısı = düello / oyuncu). Hızlı maç 5–7 dk hedefler. */
export const PACE = {
	quick: { duels: 11 },
	long: { duels: 32 },
};

// Tahmini süre (sn), insan oyuncu varsayımıyla; yalnızca denge raporu için (tools/sim.mjs).
const EST = { overview: 2.5, castle: 1.6, banner: 1.4, bannerShort: 1.0, rank: 1.9, humanPick: 3, botPick: 0.8, claim: 1.5, attack: 2.6, wheel: 4, chooseCat: 2.2, conquer: 2.4, tower: 3, defend: 2, nobody: 1.5, elim: 3.5, qOpen: 0.5 };

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class Match {
	/**
	 * app: harita, kaleler, kamera; ui: arayüz
	 */
	constructor(app, ui, cfg) {
		this.app = app;
		this.ui = ui;
		this.cfg = cfg;
		const sys = ensureSystems(app);
		this.progress = sys.progress;
		this.campaign = sys.campaign;
		this.persist = !cfg.allBots && cfg.persist !== false;
		this.R = rng(cfg.seed ?? (Math.random() * 1e9) | 0);
		this.mode = MODES[cfg.mode] || MODES.ffa3;
		this.stageDef = cfg.campaign && cfg.stage ? this.campaign.stage(cfg.stage) : null;
		this.perks = cfg.perks || this.stageDef?.perks || { startProvinces: 0, botJokers: 0 };
		this.diffBias = cfg.diffBias ?? this.stageDef?.diffBias ?? 0;
		const colors = app.playerColors;
		const names = BOT_NAMES.slice().sort(() => this.R() - 0.5);
		const n = this.mode.players;
		const opps = cfg.opponents || [];
		const humanSkill = this.progress.skill();
		this.transports = cfg.transports || {};
		const kinds = Array.from({ length: n }, (_, i) => (cfg.seats && cfg.seats[i]) || (i === 0 && !cfg.allBots ? 'ui' : 'bot'));
		const palette = this.assignColors(kinds, colors, cfg.commander);
		this.players = Array.from({ length: n }, (_, i) => {
			const kind = kinds[i];
			const opp = i > 0 ? opps[i - 1] : null;
			const lv = cfg.levels?.[i] ?? cfg.bot ?? 'er';
			const base = lv === 'auto' ? clamp(humanSkill + (this.R() - 0.5) * 0.08, 0.2, 0.92) : BOT_LEVELS[lv] ?? BOT_LEVELS.er;
			const skill = opp?.skill ?? base * (0.92 + this.R() * 0.16);
			const human = kind === 'ui';
			const color = colors[palette[i]];
			const p = {
				i,
				name: human ? cfg.humanName || 'Sen' : opp?.name || names[i],
				title: human ? '' : opp?.title || '',
				quote: opp?.quote || '',
				boss: !!opp?.boss,
				ally: !!opp?.ally,
				human,
				seat: kind,
				skill,
				color,
				css: '#' + color.toString(16).padStart(6, '0'),
				team: this.mode.teams ? this.mode.teams[i] : i,
				score: 0,
				capital: -1,
				alive: true,
				shield: false,
				// görünüm: insan menüde seçtiği komutanı kullanır; sefer rakipleri kostümünden, diğer botlar arayüzün seçimiyle
				look: human ? (cfg.commander ? { avatar: cfg.commander.avatar, banner: cfg.commander.banner, skin: cfg.commander.skin } : null) : botLook(opp),
				jk: null,
			};
			p.jk = human ? makeLoadout(this.progress.jokerStock) : botLoadout(skill, this.R, p.boss, p.boss ? this.perks.botJokers || 0 : 0);
			p.ctl = kind === 'ui' ? new UIController(this) : kind === 'remote' ? new RemoteController(this.transports[i], { seat: i }) : new BotController(this);
			if (kind === 'remote') p.ctl.onAct = (k, d) => k === 'joker' && this.useJoker(d?.id, p);
			return p;
		});
		this.humanPlayer = this.players.find((p) => p.human) || null;
		// kaleler koltuk rengine boyanır (kale i. koltukta durur; rengi shader birimi uOwner'dan gelir)
		for (const p of this.players) app.castles?.[p.i]?.uniforms?.uOwner?.value?.setHex?.(p.color);
		const b = app.board;
		this.map = cfg.region === 'all' ? b.provinces.map((p) => p.index) : b.region(cfg.region);
		this.inMap = new Set(this.map);
		// komşuluk bir kez hesaplanır (tur başına dizi üretme yok)
		this.adj = new Map(this.map.map((i) => [i, b.provinces[i].nb.map((id) => b.byId.get(id).index).filter((j) => this.inMap.has(j))]));
		this.value = new Map(); // il → puan değeri
		this.used = new Set();
		this.seen = this.persist ? this.progress.seenSet() : new Set();
		this.recent = []; // son çıkan soru tipleri (art arda aynı tip gelmesin)
		this.round = 0;
		this.over = false;
		this.endReason = '';
		this.phase = 'baslangic';
		this.cur = null; // şu an sorulan soru (joker bağlamı)
		this.stat = this.players.map(() => ({ q: 0, correct: 0 }));
		this.towersLost = this.players.map(() => 0);
		this.jokerUse = {};
		this.nq = 0;
		this.duels = 0;
		this.idle = 0;
		this.est = 0;
		this.listeners = new Map();
		this.bar = null;
		for (const p of this.players) if (p.ctl.remote) p.ctl.hello({ seat: p.i, protocol: PROTOCOL, cfg: { mode: cfg.mode, length: cfg.length, region: cfg.region }, snapshot: null });
	}

	/**
	 * Koltuklara renk dağıt: dizi, koltuk başına oyuncu renkleri dizisindeki sıra.
	 * İnsan menüde seçtiği rengi alır (commander.color sırası ya da colorHex); botlar kalanları sırayla.
	 */
	assignColors(kinds, colors, cmd) {
		let want = -1;
		if (cmd) {
			if (Number.isInteger(cmd.color) && cmd.color >= 0 && cmd.color < colors.length) want = cmd.color;
			else if (cmd.colorHex != null) want = colors.indexOf(cmd.colorHex);
		}
		const free = colors.map((_, k) => k);
		const out = kinds.map(() => -1);
		const hs = kinds.indexOf('ui');
		if (hs >= 0 && want >= 0) {
			out[hs] = want;
			free.splice(free.indexOf(want), 1);
		}
		return out.map((c) => (c >= 0 ? c : free.shift()));
	}

	// ---------------------------------------------------------------- olaylar (ağ ve gözlemci)

	/** Durum olayı yayınla: uzak koltuklara mesaj, yerel dinleyicilere çağrı. Veri JSON'a çevrilebilir olmalı. */
	emit(name, data) {
		for (const p of this.players) if (p.ctl.remote) p.ctl.event(name, data);
		const fns = this.listeners.get(name);
		if (fns) for (const fn of fns) fn(data);
	}

	on(name, fn) {
		if (!this.listeners.has(name)) this.listeners.set(name, new Set());
		this.listeners.get(name).add(fn);
		return () => this.listeners.get(name).delete(fn);
	}

	/** Tam durum görüntüsü (yeniden bağlanan istemci için). */
	snapshot() {
		return {
			phase: this.phase,
			round: this.round,
			players: this.players.map((p) => ({ i: p.i, name: p.name, team: p.team, score: p.score, alive: p.alive, capital: p.capital, hp: this.app.castles[p.i].hp, shield: p.shield, look: p.look, boss: p.boss })),
			owners: this.map.map((i) => [i, this.owner(i), this.value.get(i) || 0]),
		};
	}

	tick(sec) {
		this.est += sec;
	}

	// ---------------------------------------------------------------- yardımcılar

	owner(i) {
		return this.app.board.provinces[i].owner;
	}

	ally(a, b) {
		return a >= 0 && b >= 0 && this.players[a].team === this.players[b].team;
	}

	neighbors(i) {
		return this.adj.get(i);
	}

	free() {
		return this.map.filter((i) => this.owner(i) < 0);
	}

	owned(p) {
		return this.map.filter((i) => this.owner(i) === p);
	}

	/** wave: boya dalgası ortak sınırdan yayılsın (hızlı benzetimde yok). */
	setOwner(i, p, value, wave = false) {
		const pl = p >= 0 ? this.players[p] : null;
		const o = wave && pl && !this.ui.fast ? this.waveFrom(i, p) : null;
		this.app.board.setOwner(i, p, pl ? pl.color : null, o?.x, o?.z);
		if (value != null) this.value.set(i, value);
		this.rescore();
		this.emit('owner', { i, p, value: this.value.get(i) || 0 });
	}

	/** Boya dalgasının başlayacağı nokta: oyuncunun komşu ilinden ortak sınır, yoksa ilin ortası. */
	waveFrom(i, p) {
		const b = this.app.board;
		const o = (this._wv ||= new this.app.V3());
		const nb = b.provinces[i].nb.map((id) => b.byId.get(id)?.index).find((j) => j != null && j !== i && this.owner(j) === p);
		if (nb != null && b.borderPoint) return b.borderPoint(nb, i, o);
		return b.labelAt ? b.labelAt(i, o) : o.set(b.provinces[i].x, 0, b.provinces[i].z);
	}

	rescore() {
		for (const p of this.players) {
			let s = 0;
			for (const i of this.map) if (this.owner(i) === p.i) s += this.value.get(i) || 0;
			const k = this.app.castles[p.i];
			if (p.alive && k.group.visible) s += (VALUE.castle / 3) * k.hp;
			p.score = Math.round(s);
		}
		if (!this.ui.fast) this.ui.hud(this);
	}

	/** Bir koltuğun tarafı: takım toplam ilini döndür (sonuç ve yıldız için). */
	teamProvinces(team) {
		let n = 0;
		for (const i of this.map) {
			const o = this.owner(i);
			if (o >= 0 && this.players[o].team === team) n++;
		}
		return n;
	}

	// ---------------------------------------------------------------- soru seçimi

	/** Sorunun hedef zorluğu: insanlar varsa oyuncu puanı, yoksa botların ortalaması; sefer kayması eklenir. */
	targetDiffFor(who, cat) {
		let sum = 0;
		let n = 0;
		for (const p of who || this.players) {
			if (p.human && this.persist) sum += targetDiff(this.progress.skill(cat));
			else sum += targetDiff(p.skill);
			n++;
		}
		return clamp((n ? sum / n : 2) + this.diffBias, 1, 3);
	}

	/**
	 * Kategoriye ve tipe göre kullanılmamış soru seç; hedef zorluğa yakın olanlar daha olası,
	 * daha önce görülenler (kayıtlı) seyrek çıkar. who: soruyu cevaplayacaklar, diff: zorluğu doğrudan ver.
	 */
	pick({ cat = null, types = null, who = null, diff = null } = {}) {
		const ok = (q) => !this.used.has(q.id) && (!cat || q.cat === cat) && (!types || types.includes(q.type));
		let list = QUESTIONS.filter(ok);
		if (!list.length) list = QUESTIONS.filter((q) => (!cat || q.cat === cat) && (!types || types.includes(q.type)));
		if (!list.length) list = QUESTIONS.filter((q) => !types || types.includes(q.type));
		if (!list.length) list = QUESTIONS; // istenen tipte hiç soru yok: herhangi biri
		const target = diff ?? this.targetDiffFor(who, cat);
		let total = 0;
		const w = list.map((q) => {
			const d = q.diff - target;
			const x = (Math.exp(-(d * d) / 0.6) + 0.03) * (this.seen.has(q.id) ? 0.3 : 1) * (this.used.has(q.id) ? 0.2 : 1);
			total += x;
			return x;
		});
		let r = this.R() * total;
		let k = 0;
		for (; k < list.length - 1; k++) if ((r -= w[k]) <= 0) break;
		const q = list[k];
		this.used.add(q.id);
		return q;
	}

	/** Kategoride (önce kullanılmamış) sorusu olan tipler; verisiz tipler hiç çekilmez. */
	haveTypes(cat) {
		const of = (fresh) => new Set(QUESTIONS.filter((q) => (!cat || q.cat === cat) && (!fresh || !this.used.has(q.id))).map((q) => q.type));
		let s = of(true);
		if (!s.size) s = of(false);
		if (!s.size) s = new Set(QUESTIONS.map((q) => q.type));
		return s;
	}

	/**
	 * Ağırlıklı tip seçimiyle soru: phase 'attack' (düello) ya da 'expand' (yayılma).
	 * Son iki tipten biri gelirse birkaç kez yeniden çekilir, böylece çeşit artar.
	 */
	pickTyped(cat, phase, who = null) {
		const have = this.haveTypes(cat);
		let t = 'choice';
		for (let k = 0; k < 6; k++) {
			t = pickType(cat || 'default', phase, this.R, have);
			if (!this.recent.includes(t) || have.size < 3) break;
		}
		this.recent.push(t);
		if (this.recent.length > 2) this.recent.shift();
		return this.pick({ cat, types: [t], who });
	}

	// ---------------------------------------------------------------- soru sorma ve jokerler

	botAnswer(cur, p) {
		const skill = clamp(p.skill + (cur.boost.get(p.i) || 0), 0.05, 0.98);
		const b = cur.T.bot(cur.v, skill, this.R);
		b.time += cur.delay.get(p.i) || 0;
		return b;
	}

	/** Bir soruyu oyunculara sor; herkesin sonucu döner. */
	async ask(q, who, ctx = {}) {
		const T = TYPES[q.type];
		const v = T.prepare(q, this.R);
		const clock = { extra: 0 };
		const cur = {
			q,
			v,
			T,
			who,
			clock,
			ctx,
			bots: [],
			used: new Map(who.map((p) => [p.i, new Set()])),
			second: new Set(),
			boost: new Map(),
			delay: new Map(),
			timers: [],
			botUses: [],
			closed: false,
		};
		this.cur = cur;
		this.nq++;
		this.planBotJokers(cur);
		cur.bots = who.filter((p) => !p.human).map((p) => ({ p, ...this.botAnswer(cur, p) }));
		const human = who.find((p) => p.human);
		const remote = who.filter((p) => p.ctl.remote);
		const pv = remote.length || this.listeners.has('ask') ? publicView(T, v) : null;
		if (pv) this.emit('ask', { q: pv.q, v: pv, who: who.map((p) => p.i), title: ctx.title || '' });
		this.refreshJokers();
		this.tick(EST.qOpen);
		// uzak koltuklardan cevaplar eşzamanlı toplanır
		const remoteWait = remote.map((p) => p.ctl.answer(p, { q: pv.q, v: pv, time: T.time, who: who.map((x) => x.i), phase: ctx.phase || '', cat: q.cat, attacker: ctx.attacker?.i ?? -1, defender: ctx.defender?.i ?? -1, target: ctx.target ?? -1 }, (T.time + 12) * 1000));
		const res = await this.ui.question(this, { q, v, T, who, bots: cur.bots, human, clock, botJokers: cur.botUses, ...ctx });
		const ra = await Promise.all(remoteWait);
		cur.closed = true;
		for (const t of cur.timers) clearTimeout(t);
		cur.timers.length = 0;
		this.cur = null;
		const out = who.map((p) => {
			const b = cur.bots.find((x) => x.p === p);
			const ri = remote.indexOf(p);
			let a;
			if (p.human) a = res?.human;
			else if (ri >= 0) a = ra[ri] || (b ? { value: b.value, time: b.time } : null);
			else a = b ? { value: b.value, time: b.time } : null;
			if (!a) a = { value: null, time: T.time };
			const j = T.judge(v, a.value);
			return { p, i: p.i, name: p.name, color: p.css, value: a.value, time: a.time ?? T.time, ...j };
		});
		this.estimateQuestion(T, out, cur);
		this.afterQuestion(q, T, out);
		await this.ui.reveal(this, { q, v, T, results: out, ...ctx });
		this.emit('reveal', { results: out.map((r) => ({ i: r.i, value: r.value, time: r.time, correct: r.correct, err: Number.isFinite(r.err) ? r.err : -1 })) });
		// ikinci şans: yanlış bilenlere aynı kategoriden yeni soru
		if (T.kind === 'exact' && cur.second.size) {
			for (let k = 0; k < out.length; k++) {
				const r = out[k];
				if (r.correct || !cur.second.has(r.i)) continue;
				out[k] = await this.secondChance(q, r);
			}
		}
		return out;
	}

	async secondChance(q, r) {
		const p = r.p;
		await this.ui.banner('İKİNCİ ŞANS', p.name, { tone: 'gold', short: true });
		this.tick(EST.bannerShort);
		const q2 = this.pick({ cat: q.cat, types: [q.type], who: [p], diff: Math.max(1, q.diff - 0.5) });
		const T2 = TYPES[q2.type];
		if (T2.kind !== 'exact') return r;
		let r2;
		if (p.human || p.ctl.remote) {
			const out = await this.ask(q2, [p], { title: 'İKİNCİ ŞANS', phase: 'second', cat: q2.cat });
			r2 = out[0];
		} else {
			const v2 = T2.prepare(q2, this.R);
			const b = T2.bot(v2, p.skill, this.R);
			r2 = { p, i: p.i, name: p.name, color: p.css, value: b.value, time: b.time, ...T2.judge(v2, b.value) };
			this.afterQuestion(q2, T2, [r2]);
		}
		return r2.correct ? { ...r2, time: r.time + r2.time } : r;
	}

	afterQuestion(q, T, out) {
		const rated = T.kind === 'exact' || q.type === 'pin';
		for (const r of out) {
			const s = this.stat[r.i];
			s.q++;
			if (r.correct) s.correct++;
			if (rated && this.persist && this.players[r.i].human) this.progress.rate(q.cat, q.diff, r.correct);
		}
	}

	estimateQuestion(T, out, cur) {
		const seat0 = out.find((r) => r.i === 0 && !r.p.ctl.remote);
		const times = out.filter((r) => r !== seat0).map((r) => r.time);
		const maxOther = times.length ? Math.max(...times) : 0;
		let sec;
		if (seat0) sec = Math.min(T.time + cur.clock.extra, seat0.time) + 0.4 + Math.min(1.2, Math.max(0, maxOther - seat0.time));
		else sec = Math.min(2.8, maxOther * Math.min(1, 2.6 / Math.max(maxOther, 0.1))) + 0.2;
		this.tick(sec + (T.kind === 'closest' ? 2.55 : 1.95));
	}

	// ---------------------------------------------------------------- jokerler

	/** Botların soru başı joker kararı. Kullanımlar kart açılınca arayüzde gösterilir (cur.botUses). */
	planBotJokers(cur) {
		const { who, T, v, ctx } = cur;
		const duel = !!(ctx.attacker && ctx.defender);
		const capital = duel && this.players[this.owner(ctx.target)]?.capital === ctx.target;
		for (const p of who) {
			if (p.human || p.ctl.remote) continue;
			const rivals = who.filter((x) => x !== p && !this.ally(x.i, p.i));
			const ids = botPlan(p.jk, { T, v, R: this.R, duel, capital, rivalHuman: rivals.some((x) => x.human) });
			for (const id of ids) {
				if (id === 'sabotaj' && !rivals.length) continue;
				this.spendJoker(p, id);
				const effect = this.applyJoker(p, id, cur, true);
				if (!effect) {
					this.refundJoker(p, id);
					continue;
				}
				cur.used.get(p.i).add(id);
				cur.botUses.push({ p, i: p.i, id, kind: effect.kind });
			}
		}
	}

	/** Joker hakkını düş. İnsan için bedava hak bitince kalıcı stoktan. */
	spendJoker(p, id) {
		const slot = p.jk[id];
		slot.left--;
		slot.paid = slot.free > 0 ? 0 : 1; // son düşüşün stoktan olup olmadığı (iade için)
		if (slot.free > 0) slot.free--;
		else if (p.human && this.persist) this.progress.consumeJoker(id);
		this.jokerUse[id] = (this.jokerUse[id] || 0) + 1;
	}

	/** Etki üretilemeyen jokerin hakkını geri ver. */
	refundJoker(p, id) {
		const slot = p.jk[id];
		slot.left++;
		if (slot.paid) {
			if (p.human && this.persist) this.progress.addJoker(id, 1);
		} else slot.free++;
		this.jokerUse[id]--;
	}

	/**
	 * Etkiyi uygula (hak düşme çağıranda yapılır). Dönüş: etki ya da null (bu soruda işe yaramadı).
	 * silent: arayüze bildirme (bot planı kart açılınca ayrıca gösterilir).
	 */
	applyJoker(p, id, cur, silent = false) {
		const effect = computeEffect(id, { T: cur.T, v: cur.v, R: this.R, board: this.app.board });
		if (!effect) return null;
		if (id === 'sure') cur.clock.extra += effect.add;
		else if (id === 'ikinci') cur.second.add(p.i);
		else if (id === 'yari' || id === 'kahin') {
			// bot yeteneğini yükseltir; insanın etkisi arayüzde görünür
			if (!p.human) cur.boost.set(p.i, (cur.boost.get(p.i) || 0) + (BOT_BOOST[id] || 0));
		} else if (id === 'sabotaj') {
			effect.victims = this.sabotage(p, cur);
			effect.by = p.i;
		}
		this.app.fx?.joker?.(id, p);
		if (!silent && !this.ui.fast) this.ui.jokerUsed?.(p, id, effect, cur);
		this.emit('joker', { player: p.i, id, effect: effect.kind === 'poll' || effect.kind === 'crowd' ? { id, kind: effect.kind } : effect });
		return effect;
	}

	/** Sabotaj: rakiplerin süresi kısalır ve ekranı kararır. Bot kurbanın yeteneği düşer ve geç cevaplar. Dönüş: kurbanlar. */
	sabotage(p, cur) {
		const victims = cur.who.filter((x) => x !== p && !this.ally(x.i, p.i));
		const effect = { id: 'sabotaj', kind: 'sabotage', victims: victims.map((x) => x.i), by: p.i, cut: SABOTAGE.cut, blurMs: SABOTAGE.blurMs };
		for (const x of victims) {
			if (x.human) {
				const fire = () => {
					if (cur.closed) return;
					cur.clock.extra -= SABOTAGE.cut;
					this.ui.sabotage?.(effect, cur);
				};
				if (this.ui.fast) cur.clock.extra -= SABOTAGE.cut;
				else cur.timers.push(setTimeout(fire, 1500 + this.R() * 3000));
			} else if (!x.ctl.remote) {
				cur.boost.set(x.i, (cur.boost.get(x.i) || 0) + SABOTAGE.botSkill);
				cur.delay.set(x.i, (cur.delay.get(x.i) || 0) + SABOTAGE.botDelay);
				const b = cur.bots.find((y) => y.p === x);
				if (b) Object.assign(b, this.botAnswer(cur, x));
			} else x.ctl.event('sabotage', effect);
		}
		return effect.victims;
	}

	/** Oyuncunun joker listesi (arayüz düğmeleri). `na`: bu soru tipinde hiç uygulanmaz (düğme gizlenir). */
	jokerList(p = this.humanPlayer) {
		if (!p) return null;
		const cur = this.cur;
		return JOKER_ORDER.map((id) => {
			const d = JOKERS[id];
			const slot = p.jk[id];
			const armed = id === 'kalkan' ? p.shield : id === 'ikinci' ? !!cur?.second.has(p.i) : false;
			let usable = slot.left > 0 && !this.over && p.alive;
			let why = slot.left > 0 ? '' : 'Hakkın kalmadı';
			let na = false;
			const inQ = cur && !cur.closed && cur.used.has(p.i);
			if (d.scope === 'question' && inQ) {
				const s = support(id, cur.T, cur.v);
				na = !!s.na;
				if (usable && !s.ok) {
					usable = false;
					why = s.why;
				}
			}
			if (usable && armed) {
				usable = false;
				why = id === 'kalkan' ? 'Kalkan zaten hazır' : 'İkinci şans zaten hazır';
			}
			if (usable && d.scope === 'question') {
				const used = cur?.used.get(p.i);
				if (!inQ) {
					usable = false;
					why = 'Soru sırasında kullanılır';
				} else if (used.has(id)) {
					usable = false;
					why = 'Bu soruda kullandın';
				} else if (used.size >= PER_QUESTION) {
					usable = false;
					why = `Bir soruda en çok ${PER_QUESTION} joker`;
				} else if (id === 'sabotaj' && !cur.who.some((x) => x !== p && !this.ally(x.i, p.i))) {
					usable = false;
					why = 'Rakip yok';
				}
			}
			return { id, name: d.name, short: d.short, desc: d.desc, color: d.color, icon: d.icon, scope: d.scope, count: slot.left, max: d.max, usable, ready: usable, why, armed, na };
		});
	}

	/** Arayüzün joker çubuğunu güncelle (kartın düğmeleri). */
	refreshJokers() {
		const p = this.humanPlayer;
		if (!p || this.ui.fast) return;
		this.ui.jokers?.(this.over ? [] : this.jokerList(p), (id) => this.useJoker(id));
	}

	/** Arayüz soruyu cevaplanmış gösterdiğinde çağırabilir: o sorudaki jokerler kilitlenir. */
	closeJokers() {
		if (this.cur) this.cur.closed = true;
		this.refreshJokers();
	}

	/**
	 * Joker kullan. Dönüş: { ok, reason?, effect?, left? }.
	 * İstek kuralları: soru jokerleri yalnızca soru sırasında, soru başına en çok 2 ve aynısı bir kez;
	 * kalkan her an hazırlanır.
	 */
	useJoker(id, p = this.humanPlayer) {
		const fail = (reason) => ({ ok: false, reason });
		const d = JOKERS[id];
		if (!d || !p) return fail('Joker yok');
		if (this.over || !p.alive) return fail('Maç bitti');
		const slot = p.jk[id];
		if (!slot || slot.left <= 0) return fail('Hakkın kalmadı');
		const cur = this.cur;
		if (id === 'kalkan') {
			if (p.shield) return fail('Kalkan zaten hazır');
			this.spendJoker(p, id);
			p.shield = true;
			this.app.fx?.joker?.(id, p);
			const effect = { id, kind: 'shield' };
			if (!this.ui.fast) this.ui.jokerUsed?.(p, id, effect, cur);
			this.emit('joker', { player: p.i, id, effect });
			this.refreshJokers();
			this.ui.hud?.(this);
			return { ok: true, effect, left: slot.left };
		}
		if (!cur || cur.closed || !cur.who.includes(p)) return fail('Soru sırasında kullanılır');
		const used = cur.used.get(p.i);
		if (used.has(id)) return fail('Bu soruda kullandın');
		if (used.size >= PER_QUESTION) return fail(`Bir soruda en çok ${PER_QUESTION} joker`);
		const s = support(id, cur.T, cur.v);
		if (!s.ok) return fail(s.why);
		if (id === 'sabotaj' && !cur.who.some((x) => x !== p && !this.ally(x.i, p.i))) return fail('Rakip yok');
		this.spendJoker(p, id);
		const effect = this.applyJoker(p, id, cur);
		if (!effect) {
			// etki üretilemedi: hakkı geri ver
			this.refundJoker(p, id);
			return fail('Bu soruda işe yaramaz');
		}
		used.add(id);
		this.refreshJokers();
		return { ok: true, effect, left: slot.left };
	}

	/** Kalkanı bot için hazırla (saldırı başlarken). */
	botShield(d, isCap) {
		if (d.human || d.shield || d.jk.kalkan.left <= 0) return;
		const hp = this.app.castles[d.i].hp;
		const p = isCap ? (hp <= 2 ? 0.95 : 0.7) : 0.25 + d.skill * 0.3;
		if (this.R() < p) {
			this.spendJoker(d, 'kalkan');
			d.shield = true;
			this.emit('joker', { player: d.i, id: 'kalkan', effect: { id: 'kalkan', kind: 'shield' } });
			if (!this.ui.fast) this.ui.hud(this);
		}
	}

	rank(results, kind) {
		return results.slice().sort((a, b) => {
			if (kind === 'exact') {
				if (a.correct !== b.correct) return a.correct ? -1 : 1;
				return a.time - b.time;
			}
			if (a.err !== b.err) return a.err - b.err;
			return a.time - b.time;
		});
	}

	// ---------------------------------------------------------------- akış

	async run() {
		const app = this.app;
		const b = app.board;
		this.phase = 'baslangic';
		for (const i of this.map) this.setOwner(i, -1, 0);
		this.ui.hud(this);
		this.refreshJokers();
		await app.cinema.overview(this.map);
		this.tick(EST.overview);
		if (this.stageDef) await this.stageIntro();
		this.phase = 'baskent';
		this.emit('phase', { phase: this.phase, round: 0 });
		await this.placeCapitals();
		await app.cinema.introBadges?.(this.players); // "hangisi benim?": kalelerin üstünde SEN ve bot rozetleri
		await this.startBonus();
		// yayılma: haritada boş il kalmayana kadar
		this.phase = 'yayilma';
		let r = 0;
		while (this.free().length && r < 12) {
			r++;
			this.emit('phase', { phase: this.phase, round: r });
			await this.ui.banner('YAYILMA', `Tur ${r}`, { tone: 'gold' });
			this.tick(EST.banner);
			await this.expansionRound(r);
		}
		this.expansionRounds = r;
		const pace = PACE[this.cfg.length === 'long' ? 'long' : 'quick'];
		const rounds = Math.max(2, Math.ceil((this.cfg.duels || pace.duels) / this.players.length));
		this.rounds = rounds;
		this.phase = 'fetih';
		for (this.round = 1; this.round <= rounds && !this.over; this.round++) {
			this.emit('phase', { phase: this.phase, round: this.round });
			await this.ui.banner(this.round === rounds ? 'SON TUR' : 'FETİH', `Tur ${this.round} / ${rounds}`, { tone: 'red' });
			this.tick(EST.banner);
			// başlayan oyuncu her tur kayar (ilk hamle avantajı dağılsın)
			const n = this.players.length;
			let moved = false;
			for (let k = 0; k < n && !this.over; k++) {
				const p = this.players[(k + this.round - 1) % n];
				if (!p.alive) continue;
				if (await this.attackTurn(p)) moved = true;
				this.checkOver();
			}
			if (!moved && !this.over) {
				this.over = true;
				this.endReason = 'tikanma';
			}
		}
		if (!this.endReason) this.endReason = 'tur';
		b.clearFx();
		this.phase = 'bitis';
		const ranking = this.standings();
		await app.cinema.overview(this.map);
		this.tick(EST.overview);
		this.over = true;
		this.refreshJokers();
		const rewards = this.finish(ranking);
		this.emit('over', { ranking: ranking.map((x) => (x.players ? { team: x.team, score: x.score } : { i: x.i, score: x.score })), reason: this.endReason });
		app.lastSim = this.report(ranking);
		return this.ui.end(this, ranking, rewards);
	}

	/** Sefer sahnesi girişi: sahne adı, patron ise bölge komutanı ve sözü. */
	async stageIntro() {
		const st = this.stageDef;
		const boss = this.players.find((p) => p.boss);
		const where = this.campaign.regionName(st.region);
		if (boss) await this.ui.banner('KOMUTAN', `${boss.name} · ${boss.title}`, { tone: 'red' });
		else await this.ui.banner('SEFER', `${where} · ${st.name}`, { tone: 'gold' });
		const foe = boss || this.players.find((p) => !p.human && p.quote);
		if (foe?.quote) this.ui.toast?.(foe.quote, { p: foe, ms: 3200 });
		this.tick(EST.banner);
	}

	async placeCapitals() {
		const app = this.app;
		const b = app.board;
		// başkentler birbirinden olabildiğince uzak
		const chosen = [];
		const list = this.map.slice();
		const d = (a, c) => Math.hypot(b.provinces[a].x - b.provinces[c].x, b.provinces[a].z - b.provinces[c].z);
		chosen.push(list[Math.floor(this.R() * list.length)]);
		while (chosen.length < this.players.length) {
			let best = -1;
			let bd = -1;
			for (const i of list) {
				if (chosen.includes(i)) continue;
				const m = Math.min(...chosen.map((c) => d(i, c))) * (0.85 + this.R() * 0.3);
				if (m > bd) {
					bd = m;
					best = i;
				}
			}
			chosen.push(best);
		}
		let order = chosen.sort(() => this.R() - 0.5);
		if (this.mode.teams) {
			// eşli modda takım arkadaşlarının başkentleri en yakın ikili olacak biçimde eşleşir
			const pairs = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
			let bestP = pairs[0];
			let bs = Infinity;
			for (const pr of pairs) {
				const s = pr.reduce((a, [x, y]) => a + d(order[x], order[y]), 0);
				if (s < bs) {
					bs = s;
					bestP = pr;
				}
			}
			const t0 = this.R() < 0.5 ? 0 : 1;
			const seats = [[], []];
			this.players.forEach((p) => seats[p.team].push(p.i));
			const next = [];
			bestP.forEach((pr, k) => {
				const team = (k + t0) % 2;
				const swap = this.R() < 0.5;
				next[seats[team][0]] = order[pr[swap ? 1 : 0]];
				next[seats[team][1]] = order[pr[swap ? 0 : 1]];
			});
			order = next;
		}
		for (const p of this.players) {
			const i = order[p.i];
			p.capital = i;
			this.setOwner(i, p.i, VALUE.pick);
			const k = app.castles[p.i];
			k.repair();
			k.group.visible = true;
			k.place(b.topAt(i, new app.V3()));
			await app.cinema.castleDrop(p, i);
			this.tick(EST.castle);
		}
		this.rescore();
	}

	/** Sefer patronlarının başlangıç ayrıcalığı: başkentine komşu ek iller. */
	async startBonus() {
		const k = this.perks.startProvinces || 0;
		if (!k) return;
		for (const p of this.players) {
			if (!p.boss) continue;
			for (let j = 0; j < k; j++) {
				const cand = this.free().filter((i) => this.neighbors(i).some((n) => this.owner(n) === p.i));
				if (!cand.length) break;
				const i = cand[Math.floor(this.R() * cand.length)];
				this.setOwner(i, p.i, VALUE.pick);
				await this.app.cinema.claim(p, i);
				this.tick(EST.claim);
			}
		}
	}

	async expansionRound(r) {
		// her yayılma turu başka bir kategoriden; tip kategorinin 'expand' ağırlıklarıyla seçilir
		const alive = this.players.filter((p) => p.alive);
		const q = this.pickTyped(WHEEL_CATS[Math.floor(this.R() * WHEEL_CATS.length)], 'expand', alive);
		const res = await this.ask(q, alive, { title: 'Herkes cevaplıyor', phase: 'yayilma' });
		const order = this.rank(res, TYPES[q.type].kind);
		// seçim hakları: birinciye 2, ikinciye 1 (4 kişide üçüncüye de 1); 1'e 1'de 2 ve 1
		const n = order.length;
		const picks = n <= 2 ? [2, 1] : n === 3 ? [2, 1, 0] : [2, 1, 1, 0];
		// büyük haritada hızlansın: boş il çoksa haklar katlanır
		const free = this.free().length;
		const mult = Math.max(1, Math.round(free / (n * 3 * 2)));
		await this.ui.ranking(this, order, picks.map((k) => k * mult));
		this.tick(EST.rank);
		for (let k = 0; k < n; k++) {
			for (let j = 0; j < picks[k] * mult && this.free().length; j++) await this.choose(order[k].p, 'free');
		}
	}

	/** Saldırılabilir iller: yalnızca sınır boyundaki düşman illeri (kendi ya da takım arkadaşının komşusu). */
	attackable(p) {
		const set = new Set();
		for (const i of this.map) {
			const o = this.owner(i);
			if (o < 0 || this.players[o].team !== p.team) continue;
			for (const j of this.adj.get(i)) {
				const oj = this.owner(j);
				if (oj >= 0 && !this.ally(oj, p.i)) set.add(j);
			}
		}
		return [...set];
	}

	/** Oyuncu bir il seçer: 'free' boş il (komşu öncelikli), 'attack' saldırılacak düşman ili. */
	async choose(p, kind) {
		let options;
		if (kind === 'free') {
			const free = this.free();
			const adj = free.filter((i) => this.neighbors(i).some((j) => this.owner(j) === p.i));
			options = adj.length ? adj : free;
		} else {
			options = this.attackable(p);
			// kara bağlantısı kopuk haritada son çare: herhangi bir düşman ili
			if (!options.length) options = this.map.filter((i) => this.owner(i) >= 0 && !this.ally(this.owner(i), p.i));
		}
		if (!options.length) return -1;
		const text = kind === 'free' ? 'Bir il seç' : 'Saldıracağın ili seç';
		let pickI = await p.ctl.pick(p, kind, options, text);
		if (pickI == null || !options.includes(pickI)) {
			// uzak koltuk cevap vermedi ya da geçersiz il: bot karar verir
			pickI = this.botChoose(p, options, kind);
			await this.ui.botPick(this, p, pickI);
		} else if (p.ctl.remote) await this.ui.botPick(this, p, pickI);
		this.tick(p.human ? EST.humanPick : EST.botPick);
		if (kind === 'free') {
			this.setOwner(pickI, p.i, VALUE.pick, true);
			await this.app.cinema.claim(p, pickI);
			this.tick(EST.claim);
		}
		return pickI;
	}

	botChoose(p, options, kind) {
		let best = options[0];
		let bs = -Infinity;
		for (const i of options) {
			let s = this.R() * 0.6;
			if (kind === 'free') {
				// komşusu çok olan, kendi topraklarını birleştiren il
				s += this.neighbors(i).filter((j) => this.owner(j) === p.i).length * 0.5;
			} else {
				const o = this.owner(i);
				const k = this.app.castles[o];
				const isCap = this.players[o].capital === i;
				s += (this.value.get(i) || 0) / 400;
				if (isCap) s += k.hp <= 1 ? 2.5 : p.skill > 0.65 ? 0.6 : -0.6;
				// kalkanlı rakibi tercih etme
				if (this.players[o].shield) s -= 0.5;
				// insan oyuncuya biraz daha az yüklen (keyifli olsun)
				if (this.players[o].human) s -= 0.15;
			}
			if (s > bs) {
				bs = s;
				best = i;
			}
		}
		return best;
	}

	botCategory() {
		return WHEEL_CATS[Math.floor(this.R() * WHEEL_CATS.length)];
	}

	/** Saldıran oyuncunun tur hamlesi. Dönüş: hamle yapıldı mı. */
	async attackTurn(p) {
		this.phase = 'fetih';
		const target = await this.choose(p, 'attack');
		if (target < 0) {
			this.idle++;
			return false;
		}
		this.idle = 0;
		const d = this.players[this.owner(target)];
		const isCap = d.capital === target;
		const app = this.app;
		this.duels++;
		this.botShield(d, isCap);
		await app.cinema.attack(p, d, target, isCap);
		this.tick(EST.attack);
		// çark: kategori (fetih dilimi: saldıran seçer)
		let cat = await this.ui.wheel(this, p);
		this.tick(EST.wheel);
		this.emit('wheel', { player: p.i, cat });
		if (cat === 'fetih') {
			cat = (await p.ctl.category(p)) || this.botCategory(p);
			if (!CATS[cat]) cat = this.botCategory(p);
			this.tick(p.human ? EST.chooseCat : 0.3);
		}
		const q = this.pickTyped(cat, 'attack', [p, d]);
		const res = await this.ask(q, [p, d], { title: isCap ? 'KUŞATMA' : 'DÜELLO', attacker: p, defender: d, target, cat, phase: 'duel' });
		const A = res[0];
		const D = res[1];
		let winner;
		const kind = TYPES[q.type].kind;
		if (kind === 'closest') winner = this.closestWinner(A, D, p, d);
		else if (A.correct && !D.correct) winner = p;
		else if (!A.correct) winner = D.correct ? d : null;
		else {
			// ikisi de bildi: eşitlik bozan tahmin sorusu
			await this.ui.banner('EŞİTLİK!', 'En yakın tahmin kazanır', { tone: 'gold', short: true });
			this.tick(EST.bannerShort);
			const tq = this.pick({ types: ['num'], who: [p, d] });
			const tr = await this.ask(tq, [p, d], { title: 'EŞİTLİK BOZMA', attacker: p, defender: d, target, phase: 'duel' });
			winner = this.closestWinner(tr[0], tr[1], p, d);
		}
		if (winner === p && d.shield) {
			// kalkan: kaybedilen savunma yok sayılır
			d.shield = false;
			this.emit('shield', { player: d.i, target });
			this.refreshJokers();
			await this.ui.banner('KALKAN!', `${d.name} saldırıyı savuşturdu`, { tone: 'gold', short: true });
			this.tick(EST.bannerShort);
			app.fx?.shield?.(target, d);
			await (app.cinema.shield ? app.cinema.shield(d, target) : app.cinema.defend(d, target));
			this.tick(EST.defend);
		} else if (winner === p) {
			if (isCap) {
				const left = app.castles[d.i].hit();
				this.towersLost[d.i]++;
				await app.cinema.towerDown(p, d, target, left);
				this.tick(EST.tower);
				if (left <= 0) await this.eliminate(d, p);
				else this.rescore();
			} else {
				const v = (this.value.get(target) || VALUE.pick) + VALUE.conquer;
				this.setOwner(target, p.i, v, true);
				await app.cinema.conquer(p, target);
				this.tick(EST.conquer);
			}
		} else if (winner === d) {
			this.value.set(target, (this.value.get(target) || VALUE.pick) + VALUE.defend);
			this.rescore();
			await app.cinema.defend(d, target);
			this.tick(EST.defend);
		} else {
			await app.cinema.nobody(target);
			this.tick(EST.nobody);
		}
		return true;
	}

	/** En yakın tahmin kazanır; tam eşitlikte savunan kazanır. */
	closestWinner(A, D, p, d) {
		const r = this.rank([A, D], 'closest');
		if (A.err === D.err && A.time === D.time) return d;
		return r[0].p;
	}

	async eliminate(d, by) {
		d.alive = false;
		d.shield = false;
		const app = this.app;
		app.castles[d.i].group.visible = false;
		for (const i of this.owned(d.i)) this.setOwner(i, by.i, (this.value.get(i) || VALUE.pick) + VALUE.conquer);
		this.rescore();
		this.emit('elim', { player: d.i, by: by.i });
		await app.cinema.eliminated(d, by);
		this.tick(EST.elim);
	}

	/**
	 * Bitiş koşulları (hangisi önce gelirse):
	 *  1. elenme: tek takım ayakta kalır
	 *  2. hakimiyet: haritanın tamamı tek takımın
	 *  3. tur: tur sayısı dolar (puana göre sıralanır)
	 *  4. tıkanma: kimsenin saldırabileceği il kalmaz
	 */
	checkOver() {
		if (this.over) return true;
		const teams = new Set(this.players.filter((p) => p.alive).map((p) => p.team));
		if (teams.size <= 1) {
			this.over = true;
			this.endReason = 'elenme';
			return true;
		}
		const owners = new Set();
		for (const i of this.map) {
			const o = this.owner(i);
			if (o < 0) return false;
			owners.add(this.players[o].team);
		}
		if (owners.size === 1) {
			this.over = true;
			this.endReason = 'hakimiyet';
			return true;
		}
		return false;
	}

	standings() {
		if (this.mode.teams) {
			const t = [0, 1].map((k) => ({ team: k, score: this.players.filter((p) => p.team === k).reduce((s, p) => s + p.score, 0), alive: this.players.some((p) => p.team === k && p.alive), players: this.players.filter((p) => p.team === k) }));
			return t.sort((a, b) => (a.alive !== b.alive ? (a.alive ? -1 : 1) : b.score - a.score));
		}
		return this.players.slice().sort((a, b) => (a.alive !== b.alive ? (a.alive ? -1 : 1) : b.score - a.score));
	}

	// ---------------------------------------------------------------- sonuç, ödül, rapor

	/** Karşılaştırma için "ben" oyuncusu: insan, yoksa 0 numaralı koltuk (benzetim). */
	get me() {
		return this.humanPlayer || this.players[0];
	}

	/** Sonuç özeti: yıldızlar, ilerleme ve sefer kaydı için. */
	result(ranking) {
		const me = this.me;
		const team = !!this.mode.teams;
		const rank = ranking.findIndex((x) => (team ? x.team === me.team : x === me)) + 1;
		const s = this.stat[me.i];
		const share = this.teamProvinces(me.team) / this.map.length;
		return {
			won: rank === 1,
			rank,
			players: ranking.length,
			provinces: this.owned(me.i).length,
			share,
			towersLost: team ? this.players.filter((p) => p.team === me.team).reduce((a, p) => a + this.towersLost[p.i], 0) : this.towersLost[me.i],
			towers: this.towersLost.reduce((a, b, k) => a + (k !== me.i && !this.ally(k, me.i) ? b : 0), 0),
			accuracy: s.q ? s.correct / s.q : 0,
			stat: { ...s },
		};
	}

	finish(ranking) {
		if (!this.humanPlayer || !this.persist) return null;
		const res = this.result(ranking);
		const out = { ...res, endReason: this.endReason };
		const camp = this.stageDef ? this.campaign.report(this.stageDef.id, res) : null;
		const lv = this.cfg.bot === 'auto' ? 'er' : this.cfg.bot || 'er';
		const rec = this.progress.recordMatch({
			...res,
			ranked: !!this.cfg.ranked,
			length: this.cfg.length,
			level: lv,
			stars: camp?.stars || 0,
			firstClear: !!camp?.firstClear,
			boss: !!camp?.boss,
			seen: [...this.used],
		});
		out.progress = rec;
		out.campaign = camp;
		out.xp = rec.xp;
		out.gold = rec.gold;
		out.stars = camp?.stars ?? null;
		return out;
	}

	/** Benzetim ve denge raporu (app.lastSim). Düz sayılardan oluşur. */
	report(ranking) {
		const team = !!this.mode.teams;
		const win = team ? ranking[0].team : ranking[0].i;
		return {
			mode: this.cfg.mode,
			length: this.cfg.length,
			region: this.cfg.region,
			provinces: this.map.length,
			players: this.players.length,
			levels: this.players.map((p) => +p.skill.toFixed(3)),
			winner: win,
			winnerSeat: team ? ranking[0].players.map((p) => p.i) : [win],
			scores: this.players.map((p) => p.score),
			alive: this.players.map((p) => p.alive),
			owned: this.players.map((p) => this.owned(p.i).length),
			questions: this.nq,
			duels: this.duels,
			expansionRounds: this.expansionRounds || 0,
			rounds: this.rounds || 0,
			estSeconds: Math.round(this.est),
			endReason: this.endReason,
			towersLost: this.towersLost.slice(),
			accuracy: this.stat.map((s) => (s.q ? s.correct / s.q : 0)),
			asked: this.stat.map((s) => s.q),
			jokers: { ...this.jokerUse },
		};
	}
}
