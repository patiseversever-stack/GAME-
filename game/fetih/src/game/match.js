// Maç: başkentler → yayılma turları (tahmin/harita: en yakın seçer) → fetih turları (çark + düello)
// → kale kuşatması (üç kule) → puan. 1'e 1, 3 kişi, 4 kişi ve eşli (2'ye 2) modlar.
//
// Akış async/await ile yazılır; arayüz (ui) her adımı Promise ile bekletir. Botlar aynı arayüzden
// geçer ama cevaplarını kendileri üretir. Hızlı benzetim (debugSim) için ui.fast = true.

import { TYPES } from '../quiz/types.js';
import { CATS, WHEEL } from '../quiz/categories.js';
import { QUESTIONS } from '../data/questions.js';
import { rng } from '../core/math.js';

export const MODES = {
	'1v1': { players: 2, teams: null, label: "1'e 1" },
	ffa3: { players: 3, teams: null, label: '3 Kişi' },
	ffa4: { players: 4, teams: null, label: '4 Kişi' },
	team: { players: 4, teams: [0, 1, 0, 1], label: 'Eşli' },
};

export const BOT_LEVELS = { caylak: 0.35, er: 0.55, usta: 0.72, efsane: 0.86 };
const BOT_NAMES = ['Kaan', 'Elif', 'Mert', 'Zeynep', 'Emir', 'Defne', 'Arda', 'Ece', 'Baran', 'Nehir'];
const VALUE = { pick: 200, conquer: 200, defend: 100, castle: 1000 };

export class Match {
	/**
	 * cfg: { mode, length: 'quick'|'long', region, bot: 'er', seed, humanName }
	 * app: harita, kaleler, kamera; ui: arayüz
	 */
	constructor(app, ui, cfg) {
		this.app = app;
		this.ui = ui;
		this.cfg = cfg;
		this.R = rng(cfg.seed ?? (Math.random() * 1e9) | 0);
		this.mode = MODES[cfg.mode] || MODES.ffa3;
		const colors = app.playerColors;
		const names = BOT_NAMES.slice().sort(() => this.R() - 0.5);
		this.players = Array.from({ length: this.mode.players }, (_, i) => ({
			i,
			name: i === 0 && !cfg.allBots ? cfg.humanName || 'Sen' : names[i],
			human: i === 0 && !cfg.allBots,
			skill: BOT_LEVELS[cfg.bot || 'er'] * (0.92 + this.R() * 0.16),
			color: colors[i],
			css: '#' + colors[i].toString(16).padStart(6, '0'),
			team: this.mode.teams ? this.mode.teams[i] : i,
			score: 0,
			capital: -1,
			alive: true,
		}));
		const b = app.board;
		this.map = cfg.region === 'all' ? b.provinces.map((p) => p.index) : b.region(cfg.region);
		this.inMap = new Set(this.map);
		this.value = new Map(); // il → puan değeri
		this.used = new Set();
		this.round = 0;
		this.over = false;
	}

	// ---------------------------------------------------------------- yardımcılar

	owner(i) {
		return this.app.board.provinces[i].owner;
	}

	ally(a, b) {
		return a >= 0 && b >= 0 && this.players[a].team === this.players[b].team;
	}

	neighbors(i) {
		const b = this.app.board;
		return b.provinces[i].nb.map((id) => b.byId.get(id).index).filter((j) => this.inMap.has(j));
	}

	free() {
		return this.map.filter((i) => this.owner(i) < 0);
	}

	owned(p) {
		return this.map.filter((i) => this.owner(i) === p);
	}

	setOwner(i, p, value) {
		const pl = p >= 0 ? this.players[p] : null;
		this.app.board.setOwner(i, p, pl ? pl.color : null);
		if (value != null) this.value.set(i, value);
		this.rescore();
	}

	rescore() {
		for (const p of this.players) {
			let s = 0;
			for (const i of this.map) if (this.owner(i) === p.i) s += this.value.get(i) || 0;
			const k = this.app.castles[p.i];
			if (p.alive && k.group.visible) s += (VALUE.castle / 3) * k.hp;
			p.score = Math.round(s);
		}
		this.ui.hud(this);
	}

	/** Kategoriye ve tipe göre kullanılmamış soru seç. */
	pick({ cat = null, types = null } = {}) {
		const ok = (q) => !this.used.has(q.id) && (!cat || q.cat === cat) && (!types || types.includes(q.type));
		let list = QUESTIONS.filter(ok);
		if (!list.length) list = QUESTIONS.filter((q) => (!cat || q.cat === cat) && (!types || types.includes(q.type)));
		if (!list.length) list = QUESTIONS.filter((q) => !types || types.includes(q.type));
		const q = list[Math.floor(this.R() * list.length)];
		this.used.add(q.id);
		return q;
	}

	/** Bir soruyu oyunculara sor; herkesin sonucu döner. */
	async ask(q, who, ctx = {}) {
		const T = TYPES[q.type];
		const v = T.prepare(q, this.R);
		const bots = who
			.filter((p) => !p.human)
			.map((p) => ({ p, ...T.bot(v, p.skill, this.R) }));
		const human = who.find((p) => p.human);
		const res = await this.ui.question(this, { q, v, T, who, bots, human, ...ctx });
		const out = who.map((p) => {
			const b = bots.find((x) => x.p === p);
			const a = p.human ? res.human : b ? { value: b.value, time: b.time } : { value: null, time: T.time };
			const j = T.judge(v, a.value);
			return { p, i: p.i, name: p.name, color: p.css, value: a.value, time: a.time ?? T.time, ...j };
		});
		await this.ui.reveal(this, { q, v, T, results: out, ...ctx });
		return out;
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
		for (const i of this.map) this.setOwner(i, -1, 0);
		this.ui.hud(this);
		await app.cinema.overview(this.map);
		await this.placeCapitals();
		// yayılma: haritada boş il kalmayana kadar
		let r = 0;
		while (this.free().length && r < 12) {
			r++;
			await this.ui.banner('YAYILMA', `Tur ${r}`, { tone: 'gold' });
			await this.expansionRound(r);
		}
		const rounds = this.cfg.length === 'long' ? 6 : 3;
		for (this.round = 1; this.round <= rounds && !this.over; this.round++) {
			await this.ui.banner('FETİH', `Tur ${this.round} / ${rounds}`, { tone: 'red' });
			for (const p of this.players) {
				if (!p.alive || this.over) continue;
				await this.attackTurn(p);
				this.checkOver();
			}
		}
		b.clearFx();
		const ranking = this.standings();
		await app.cinema.overview(this.map);
		this.over = true;
		return this.ui.end(this, ranking);
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
		// eşli modda takım arkadaşlarının başkentleri yakın olsun: sırayı takım düzenine göre karıştırma
		const order = chosen.sort(() => this.R() - 0.5);
		for (const p of this.players) {
			const i = order[p.i];
			p.capital = i;
			this.setOwner(i, p.i, VALUE.pick);
			const k = app.castles[p.i];
			k.repair();
			k.group.visible = true;
			k.place(b.topAt(i, new app.V3()));
			await app.cinema.castleDrop(p, i);
		}
		this.rescore();
	}

	async expansionRound(r) {
		const types = r % 2 ? ['num'] : ['pin', 'num'];
		const q = this.pick({ types });
		const res = await this.ask(q, this.players.filter((p) => p.alive), { title: 'Herkes cevaplıyor', phase: 'yayilma' });
		const order = this.rank(res, TYPES[q.type].kind);
		// seçim hakları: birinciye 2, ikinciye 1 (4 kişide üçüncüye de 1); 1'e 1'de 2 ve 1
		const n = order.length;
		const picks = n <= 2 ? [2, 1] : n === 3 ? [2, 1, 0] : [2, 1, 1, 0];
		// büyük haritada hızlansın: boş il çoksa haklar katlanır
		const free = this.free().length;
		const mult = Math.max(1, Math.round(free / (n * 3 * 2)));
		await this.ui.ranking(this, order, picks.map((k) => k * mult));
		for (let k = 0; k < n; k++) {
			for (let j = 0; j < picks[k] * mult && this.free().length; j++) await this.choose(order[k].p, 'free');
		}
	}

	/** Oyuncu bir il seçer: 'free' boş il (komşu öncelikli), 'attack' saldırılacak düşman ili. */
	async choose(p, kind) {
		const b = this.app.board;
		let options;
		if (kind === 'free') {
			const free = this.free();
			const adj = free.filter((i) => this.neighbors(i).some((j) => this.owner(j) === p.i));
			options = adj.length ? adj : free;
		} else {
			const set = new Set();
			for (const i of this.owned(p.i)) for (const j of this.neighbors(i)) if (this.owner(j) >= 0 && !this.ally(this.owner(j), p.i)) set.add(j);
			options = [...set];
		}
		if (!options.length) return -1;
		let pickI;
		if (p.human) {
			pickI = await this.ui.pickProvince(this, options, kind === 'free' ? 'Bir il seç' : 'Saldıracağın ili seç');
		} else {
			pickI = this.botChoose(p, options, kind);
			await this.ui.botPick(this, p, pickI);
		}
		if (kind === 'free') {
			this.setOwner(pickI, p.i, VALUE.pick);
			await this.app.cinema.claim(p, pickI);
		}
		return pickI;
	}

	botChoose(p, options, kind) {
		const b = this.app.board;
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

	async attackTurn(p) {
		const target = await this.choose(p, 'attack');
		if (target < 0) return;
		const d = this.players[this.owner(target)];
		const isCap = d.capital === target;
		const app = this.app;
		await app.cinema.attack(p, d, target, isCap);
		// çark: kategori (fetih dilimi: saldıran seçer)
		let cat = await this.ui.wheel(this, p);
		if (cat === 'fetih') cat = p.human ? await this.ui.chooseCategory(this) : Object.keys(CATS)[Math.floor(this.R() * 6)];
		const types = cat === 'cografya' || cat === 'tarih' ? ['choice', 'choice', 'tf', 'hang', 'pin'] : ['choice', 'choice', 'tf', 'hang'];
		const t = types[Math.floor(this.R() * types.length)];
		const q = this.pick({ cat, types: [t] });
		const res = await this.ask(q, [p, d], { title: isCap ? 'KUŞATMA' : 'DÜELLO', attacker: p, defender: d, target, cat, phase: 'duel' });
		const A = res[0];
		const D = res[1];
		let winner;
		const kind = TYPES[q.type].kind;
		if (kind === 'closest') winner = this.rank(res, 'closest')[0].p;
		else if (A.correct && !D.correct) winner = p;
		else if (!A.correct) winner = D.correct ? d : null;
		else {
			// ikisi de bildi: eşitlik bozan tahmin sorusu
			await this.ui.banner('EŞİTLİK!', 'En yakın tahmin kazanır', { tone: 'gold', short: true });
			const tq = this.pick({ types: ['num'] });
			const tr = await this.ask(tq, [p, d], { title: 'EŞİTLİK BOZMA', attacker: p, defender: d, target, phase: 'duel' });
			winner = this.rank(tr, 'closest')[0].p;
		}
		if (winner === p) {
			if (isCap) {
				const left = app.castles[d.i].hit();
				await app.cinema.towerDown(p, d, target, left);
				if (left <= 0) await this.eliminate(d, p);
				else this.rescore();
			} else {
				const v = (this.value.get(target) || VALUE.pick) + VALUE.conquer;
				this.setOwner(target, p.i, v);
				await app.cinema.conquer(p, target);
			}
		} else if (winner === d) {
			this.value.set(target, (this.value.get(target) || VALUE.pick) + VALUE.defend);
			this.rescore();
			await app.cinema.defend(d, target);
		} else {
			await app.cinema.nobody(target);
		}
	}

	async eliminate(d, by) {
		d.alive = false;
		const app = this.app;
		app.castles[d.i].group.visible = false;
		for (const i of this.owned(d.i)) this.setOwner(i, by.i, (this.value.get(i) || VALUE.pick) + VALUE.conquer);
		this.rescore();
		await app.cinema.eliminated(d, by);
	}

	checkOver() {
		const teams = new Set(this.players.filter((p) => p.alive).map((p) => p.team));
		if (teams.size <= 1) this.over = true;
	}

	standings() {
		if (this.mode.teams) {
			const t = [0, 1].map((k) => ({ team: k, score: this.players.filter((p) => p.team === k).reduce((s, p) => s + p.score, 0), players: this.players.filter((p) => p.team === k) }));
			return t.sort((a, b) => b.score - a.score);
		}
		return this.players.slice().sort((a, b) => (a.alive !== b.alive ? (a.alive ? -1 : 1) : b.score - a.score));
	}
}
