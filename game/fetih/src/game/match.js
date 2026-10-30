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

import { TYPES } from '../quiz/types.js';
import { secOf } from '../quiz/timing.js';
import { BAYRAK, CANLI, HIZLI, isYeni, yeniBank, kapsam, tipSec, payOf, egri, okumaK, filmMs, varsayilan, kusbakisiUygun, eslestir, karma, yayilmaKat } from '../quiz/mac.js';
import { bindApp } from '../quiz/d_ortak.js';
import { ADIM, Oturum } from './sunucu.js';
import { CATS } from '../quiz/categories.js';
import { BANK as QUESTIONS } from '../data/bank.js';
import { rng } from '../core/math.js';
import { JOKERS, JOKER_ORDER, PER_QUESTION, BOT_BOOST, SABOTAGE, cutFor, makeLoadout, botLoadout, support, computeEffect, botPlan, questionTime } from './jokers.js';
import { ensureSystems } from './campaign.js';
import { targetDiff } from './progress.js';
import { UIController, BotController, RemoteController, publicView, PROTOCOL } from './net.js';
import { botLook } from './commanders.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';

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
/**
 * Maç haritası büyüklüğü: hızlı maçta seçilen bölge, oyuncu başına bu kadar il olana dek komşu illerle
 * büyür (tek bölge 3–4 kişiye dar geliyordu: herkese 2–3 il düşüyor, maç başlamadan bitiyordu).
 */
export const PROVINCES_PER_PLAYER = 6;

/**
 * Seçim süreleri (sn). Her koltuk aynı kurala tabidir: süre uzak koltuğa da gönderilir, dolunca seçimi bot yapar.
 * Yayılmada bir oyuncunun sırası bir süre havuzudur: ilk il için `first`, sonraki her il için `next` eklenir
 * (4 il seçen 1 il seçenden uzun düşünür); havuz azalsa da her seçimde en az `floor` sn kalır.
 */
export const PICK_TIME = { capital: 15, attack: 12, category: 8, first: 10, next: 5, floor: 4 };
export const pickPool = (n) => PICK_TIME.first + PICK_TIME.next * Math.max(0, n - 1);

/**
 * İki botun savaşında filmin hız çarpanı (kullanıcı kararı: seçilen moda ve haritaya göre). Oyuncu sayısı ve
 * harita büyüdükçe botlar arası savaş çoğalır, film kısalır; insanın katıldığı savaş hep tam film (1).
 * Kısa film, dokunarak atlamayla aynı yoldan biter: an erken kapanır, ordular o anın son haline yerleşir.
 */
export const BOT_FILM = {
	quick: { '1v1': 1, ffa3: 0.75, ffa4: 0.6, team: 0.6 },
	long: { '1v1': 1, ffa3: 0.55, ffa4: 0.45, team: 0.45 },
};

/**
 * v1.2: yeni tiplerin soruları ve cevap filmleri daha uzun (Tufan 11 sn, canlı turlar 20–30 sn); mod başına düello sayısı
 * hedef süreye göre (hızlı 6–8, uzun 15–20 dk; test/sim.mjs 4. bölüm ölçer). 1'e 1'de her düelloda insan var (tam film).
 */
export const PACE = {
	quick: { duels: 11, byMode: { '1v1': 10, ffa3: 11, ffa4: 11, team: 11 } },
	long: { duels: 32, byMode: { '1v1': 20, ffa3: 27, ffa4: 28, team: 28 } },
};

/**
 * Fetih turlarında saldırı sırası (v0.8 kuralı). Eskiden 1. tur hep 0. koltukla (yerelde insan) başlar, sıra her tur
 * bir kayardı; son turu en son oynayan koltuk ölçülebilir avantaj alıyordu (eşit botlarla 4 kişide son turu açan
 * koltuk %16,5, kapatan %31 kazanıyordu; 1'e 1'de 0. koltuk %53,8, uzun maçta %55,8).
 *   first: 'seed'  ilk turun sırası maç tohumundan karışık (koltuk numarasından bağımsız; sunucu aynı sırayı bulur),
 *                  sonraki turlarda sıra bir kayar. 'seat': eski davranış (0. koltuk başlar).
 *   last:  'score' son turda sıra puana göre: önde olan önce, geride olan en son saldırır (Bil ve Fethet / Triviador
 *                  kuralı: son sözü geride olan söyler). Eşli modda takımlar dönüşümlü kalır, önde olan takım başlar.
 *                  'rotate': eski davranış.
 */
export const TURN_ORDER = { first: 'seed', last: 'score' };

/**
 * Puan eşitliği (v0.8 kuralı). Eskiden eşit puanda koltuk sırası belirliyordu (yerelde hep insan kazanıyordu;
 * eşit botlarla 1'e 1 maçların %1,8'i, 4 kişide %4,4'ü).
 *   golden: birinciliği paylaşan taraflar maç sonunda tek bir "altın soru" (tahmin, en yakın kazanır; eşitlikte hızlı)
 *           çözer (Triviador düello kuralı: berabere biten maçı tahmin sorusu bitirir).
 *   Diğer sıralar ve altın sorusuz durumlar için: daha çok il, kalede daha çok kule, daha çok doğru cevap.
 *   Elenenler arasında geç elenen önde.
 */
export const TIE_BREAK = { golden: true };

/**
 * Kalkan jokeri savunulan düellonun içinde kurulamaz (v0.8 kuralı): botlar kalkan kararını saldırı başında, soruyu
 * görmeden verir; insan ise soruyu görüp "bilmiyorum" deyince kurabiliyordu. Kalkan saldırıdan önce (kendi
 * sorunda ya da yayılma sorusunda) kurulur.
 */
export const SHIELD_IN_DEFENSE = false;
const SHIELD_WHY = 'Saldırıdan önce kurulur';

/**
 * Botun başkente saldırma isteği (v0.8). Eskiden 0,65 beceride bir uçurum vardı (+0,6 / −0,6): 'er' botlar maç başına
 * 0,08 kuşatma yapıyordu (kaleler hiç sarsılmıyordu), 'usta' botlar 4,4. Şimdi beceriyle sürekli artar:
 * tercih = slope × (beceri − pivot) (+ wounded: iki kulesi kalmış kale), tek kulesi kalmışsa kill. Çaylak neredeyse hiç,
 * 'er' maç başına ~1,3, 'usta' ~4,3 kuşatma (eşit botlarla, test/kurallar.test.mjs ölçer).
 */
export const BOT_SIEGE = { slope: 3, pivot: 0.55, wounded: 0.4, kill: 2.5 };

// Tahmini süre (sn), insan oyuncu varsayımıyla; yalnızca denge raporu için (tools/sim.mjs).
// Savaş filmi (v0.6, cinema.js): saldırı ~4,9–6,4 sn (kuşatma uzun), fetih ~4, kule ~3,3, savunma ~2,7.
const EST = { mapOpen: 0.95, overview: 2.5, castle: 1.6, banner: 1.4, bannerShort: 1.0, rank: 1.9, humanPick: 3, botPick: 0.8, claim: 1.5, attack: 5.4, wheel: 4, chooseCat: 2.2, conquer: 4.0, tower: 3.4, defend: 2.7, nobody: 1.6, elim: 3.5, qOpen: 0.5 };

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/**
 * Bölgeyi komşu illerle hedef büyüklüğe büyüt: her adımda sınırdaki illerden bölgenin ortasına en yakını
 * eklenir (toprak bitişik ve toparlak kalır). Rastgelelik yok: aynı bölge ve oyuncu sayısı her yerde
 * (sunucuda da) aynı haritayı verir.
 */
export function growMap(board, base, size) {
	const P = board.provinces;
	const set = new Set(base);
	if (set.size >= size) return [...set];
	let cx = 0;
	let cz = 0;
	for (const i of set) {
		cx += P[i].x;
		cz += P[i].z;
	}
	cx /= set.size;
	cz /= set.size;
	while (set.size < size) {
		let best = -1;
		let bd = Infinity;
		for (const i of set)
			for (const id of P[i].nb) {
				const j = board.byId.get(id)?.index;
				if (j == null || set.has(j)) continue;
				const d = Math.hypot(P[j].x - cx, P[j].z - cz);
				if (d < bd) {
					bd = d;
					best = j;
				}
			}
		if (best < 0) break;
		set.add(best);
	}
	return [...set];
}

/** Maçtan çıkıldı: yarım kalan akış bu hatayla durur (App.startMatch yakalar). */
export class Abort extends Error {
	constructor() {
		super('maçtan çıkıldı');
		this.name = 'Abort';
	}
}

/** Maçtan çıkılınca arayüz ve sinema çağrıları Abort fırlatır; böylece akış bir sonraki adımda kesilir. */
const guard = (m, o) =>
	new Proxy(o, {
		get(t, k) {
			const v = t[k];
			if (typeof v !== 'function') return v;
			return (...a) => {
				m.check();
				return v.apply(t, a);
			};
		},
	});

export class Match {
	/**
	 * app: harita, kaleler, kamera; ui: arayüz
	 */
	constructor(app, ui, cfg) {
		this.app = app;
		this.aborted = false;
		this.ui = guard(this, ui);
		this.cinema = guard(this, app.cinema);
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
		const names = this.shuffle(BOT_NAMES);
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
			if (kind === 'remote') {
				p.ctl.onAct = (k, d) => this.remoteAct(p, k, d);
				// cevabını gönderen koltuk o soruda artık joker kullanamaz (yerelde arayüz kilitler); işaret zaman uyumlu
				// konur ki cevapla aynı anda gelen joker isteği de reddedilsin
				p.ctl.onRes = (k) => {
					if (k === 'answer' && this.cur && !this.cur.closed && this.cur.who.includes(p)) this.cur.done.add(p.i);
				};
			}
			return p;
		});
		this.humanPlayer = this.players.find((p) => p.human) || null;
		// kaleler koltuk rengine boyanır (kale i. koltukta durur; rengi shader birimi uOwner'dan gelir)
		for (const p of this.players) app.castles?.[p.i]?.uniforms?.uOwner?.value?.setHex?.(p.color);
		const b = app.board;
		this.map = cfg.region === 'all' ? b.provinces.map((p) => p.index) : growMap(b, b.region(cfg.region), cfg.size ?? n * PROVINCES_PER_PLAYER);
		this.inMap = new Set(this.map);
		// komşuluk bir kez hesaplanır (tur başına dizi üretme yok)
		this.adj = new Map(this.map.map((i) => [i, b.provinces[i].nb.map((id) => b.byId.get(id).index).filter((j) => this.inMap.has(j))]));
		this.value = new Map(); // il → puan değeri
		this.used = new Set();
		this.seen = this.persist ? this.progress.seenSet() : new Set();
		this.recent = []; // son çıkan soru tipleri (art arda aynı tip gelmesin)
		// v1.2 soru düzeni (src/quiz/mac.js): yeni tiplerin açık olanları, maçın soru havuzu (eski banka + köprü),
		// tip sayaçları, eski/yeni dengesi ve soru günlüğü (an, tip; rapor ve sınama için)
		this.flags = { ...BAYRAK, ...(cfg.yeni || {}) };
		this.pool = [...QUESTIONS, ...yeniBank()].filter((q) => this.typeOn(q.type));
		this.tcount = {};
		this.cov = kapsam(this.pool, WHEEL_CATS); // yeni tiplerin kategori kapsamı (mac.js agirliklar)
		this.mix = { n: 0, yeni: 0, hedef: 0 };
		this.qlog = [];
		this.filmSec = 0; // cevap filmlerine giden toplam süre (sn, tahmin)
		// maç tuzu: çevrimiçi görünümde yapı adlarının yerine giden anlamsız kimlikler maça özgü (mac.js sidOf)
		this.salt = karma('tuz|' + (cfg.seed ?? Math.random()));
		this.stats = cfg.istatistik || null; // sunucu istatistiği (Az Bilinen oranları, Şive ısı haritası); yoksa tahmini
		this.serverPace = cfg.serverPace ?? 0; // çevrimiçi sunucu: cevap filmini gerçekten bekle (1 = gerçek süre)
		bindApp(app); // yeni tipler haritaya, kameraya ve arayüze buradan ulaşır (d_ortak.js)
		this.round = 0;
		this.over = false;
		this.endReason = '';
		this.phase = 'baslangic';
		this.cur = null; // şu an sorulan soru (joker bağlamı)
		this.stat = this.players.map(() => ({ q: 0, correct: 0 }));
		this.towersLost = this.players.map(() => 0);
		this.towersBy = this.players.map(() => 0); // koltuğun kendi yıktığı kuleler (istatistik)
		this.outSeq = 0; // elenme sırası (sıralamada geç elenen önde)
		this.duel = null; // süren düello { attacker, defender, target } (kalkan kuralı)
		this.tieWin = null; // altın soruyu kazanan taraf (koltuk ya da takım)
		this.lastScore = '';
		this.jokerUse = {};
		this.nq = 0;
		this.duels = 0;
		this.idle = 0;
		this.est = 0;
		this.listeners = new Map();
		this.bar = null;
		for (const p of this.players) if (p.ctl.remote) p.ctl.hello({ seat: p.i, protocol: PROTOCOL, cfg: { mode: cfg.mode, length: cfg.length, region: cfg.region, salt: this.salt }, snapshot: null });
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

	/** Koltuğa göre değişen olay: of(koltuk) uzak koltuğun verisi, of(null) yerel dinleyicilerin (herkese açık kısım). */
	emitEach(name, of) {
		for (const p of this.players) if (p.ctl.remote) p.ctl.event(name, of(p));
		const fns = this.listeners.get(name);
		if (fns) for (const fn of fns) fn(of(null));
	}

	/** Uzak koltuk ya da dinleyici var mı (olay verisi hazırlamaya değer mi). */
	get watched() {
		return this.players.some((p) => p.ctl.remote) || this.listeners.size > 0;
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

	/** Maçtan çıkıldıysa akışı kes. */
	check() {
		if (this.aborted) throw new Abort();
	}

	/** Maçtan çık: ilerleme kaydedilmez, yarım kalan akış bir sonraki adımında durur. */
	abort() {
		this.aborted = true;
		this.over = true;
		if (this.cur) this.cur.closed = true;
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
		this.check();
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
		// 'score' olayı: yalnız değişince (kule yıkılışı ve savunma değeri 'owner' olayından çıkarılamaz)
		if (this.watched) {
			const d = { scores: this.players.map((p) => p.score), hp: this.players.map((p) => (p.alive && this.app.castles[p.i].group.visible ? this.app.castles[p.i].hp : 0)), alive: this.players.map((p) => p.alive) };
			const key = JSON.stringify(d);
			if (key !== this.lastScore) {
				this.lastScore = key;
				this.emit('score', d);
			}
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

	/** Tip bu maçta açık mı: kayıtlı ve (yeni tipse) bayrağı kapalı değil. */
	typeOn(t) {
		return !!TYPES[t] && (!isYeni(t) || this.flags[t] !== false);
	}

	/** Maçın ilerleyişi 0..1 (zorluk eğrisi): yayılma turları ilk %30, fetih turları kalan. */
	progressOf() {
		if (this.phase === 'yayilma' || this.phase === 'baskent' || this.phase === 'baslangic') return Math.min(0.3, (this.expRound || 0) * 0.06);
		if (this.phase === 'altin' || this.phase === 'bitis') return 1;
		const R = this.rounds || 1;
		return 0.3 + 0.7 * Math.min(1, Math.max(0, (this.round - 1) / Math.max(1, R - 1)));
	}

	/** Soru bu maçta sorulabilir mi (havuzda değil, kardeşi sorulmamış, Kuşbakışı yapısı gömülü değil). */
	askable(q) {
		return !(q.src && this.used.has(q.src)) && kusbakisiUygun(q, this);
	}

	/**
	 * Kategoriye ve tipe göre kullanılmamış soru seç; hedef zorluğa yakın olanlar daha olası,
	 * daha önce görülenler (kayıtlı) seyrek çıkar. who: soruyu cevaplayacaklar, diff: zorluğu doğrudan ver.
	 * moment: soru düzenindeki an (okuma ağır tiplerde kısa soru öne; mac.js okumaK).
	 */
	pick({ cat = null, types = null, who = null, diff = null, moment = null } = {}) {
		const P = this.pool;
		const fit = (q) => (!types || types.includes(q.type)) && this.askable(q);
		const ok = (q) => !this.used.has(q.id) && (!cat || q.cat === cat) && fit(q);
		let list = P.filter(ok);
		if (!list.length) list = P.filter((q) => (!cat || q.cat === cat) && fit(q));
		if (!list.length) list = P.filter(fit);
		if (!list.length) list = P.filter((q) => !types || types.includes(q.type));
		if (!list.length) list = QUESTIONS; // istenen tipte hiç soru yok: herhangi biri
		const target = diff ?? this.targetDiffFor(who, cat);
		let total = 0;
		const w = list.map((q) => {
			const d = q.diff - target;
			let x = (Math.exp(-(d * d) / 0.6) + 0.03) * (this.seen.has(q.id) ? 0.3 : 1) * (this.used.has(q.id) ? 0.2 : 1);
			if (moment) {
				const k = okumaK(q.type, isYeni(q.type) ? this.secOfQ(q) : NaN, moment);
				x *= k || 0.001;
			}
			total += x;
			return x;
		});
		let r = this.R() * total;
		let k = 0;
		for (; k < list.length - 1; k++) if ((r -= w[k]) <= 0) break;
		const q = list[k];
		this.used.add(q.id);
		if (q.src) this.used.add(q.src); // Mancınık sorusu bankadaki tahmin sorusunun kardeşi: ikisi aynı maçta çıkmaz
		return q;
	}

	/** Yeni tipin sorusunun süre bütçesi (okuma ağır tiplerde kısa soru seçimi için; önbellekli). */
	secOfQ(q) {
		const c = (this._secQ ||= new Map());
		if (!c.has(q.id)) {
			let s = NaN;
			try {
				s = TYPES[q.type].prepare(q, () => 0.5).sec;
			} catch {
				s = NaN;
			}
			c.set(q.id, s);
		}
		return c.get(q.id);
	}

	/** Kategoride (önce kullanılmamış) sorusu olan tipler; verisiz tipler hiç çekilmez. */
	haveTypes(cat) {
		const P = this.pool;
		const of = (fresh) => new Set(P.filter((q) => (!cat || q.cat === cat) && (!fresh || !this.used.has(q.id)) && this.askable(q)).map((q) => q.type));
		let s = of(true);
		if (!s.size) s = of(false);
		if (!s.size) s = new Set(P.map((q) => q.type));
		return s;
	}

	/**
	 * Soru düzeniyle (mac.js tipSec) soru seç. moment: 'expand' (yayılma), 'attack' (düello), 'siege' (kale kuşatması),
	 * 'tie' (eşitlik bozma), 'golden' (altın soru). An × mod × kategori ağırlıkları, yeni tip payı ve maç içi denge, maç
	 * başına üst sınır, art arda gelme yasakları; yerel insanın yalnız izlediği bot düellosunda harita tipleri geri.
	 */
	pickTyped(cat, moment, who = null) {
		const tie = moment === 'tie' || moment === 'golden';
		const have = tie ? null : this.haveTypes(cat);
		const watch = !!this.humanPlayer && !!who && !who.some((p) => p.human || p.ctl.remote) && (moment === 'attack' || moment === 'siege');
		const { type } = tipSec({ moment, mode: this.cfg.mode in MODES ? this.cfg.mode : 'ffa3', length: this.cfg.length, cat: cat || 'default', have, recent: this.recent, counts: this.tcount, mix: this.mix, watch, on: (t) => this.typeOn(t), cov: this.cov, R: this.R });
		const first = isYeni(type) && !this.tcount[type];
		const base = this.targetDiffFor(who, cat);
		const diff = clamp(base + egri(this.progressOf(), moment, first), 1, 3);
		const q = this.pick({ cat: tie ? null : cat, types: [type], who, diff, moment });
		// sayaçlar sorulan sorunun tipiyle (soru bulunamazsa havuz başka tipe düşebilir)
		const t = q.type;
		this.recent.push(t);
		if (this.recent.length > 4) this.recent.shift();
		this.tcount[t] = (this.tcount[t] || 0) + 1;
		// eski/yeni dengesi: hedef pay birikir, gerçekleşen yeni tip sayısı ona yaklaştırılır
		this.mix.n++;
		this.mix.hedef += payOf(moment, this.cfg.mode in MODES ? this.cfg.mode : 'ffa3');
		if (isYeni(t)) this.mix.yeni++;
		this.qlog.push({ moment, type: q.type, cat: q.cat, diff: q.diff, round: this.phase === 'yayilma' ? this.expRound || 0 : this.round, n: who?.length || 0 });
		return q;
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
		// süre bütçesi sorunun verisinden (timing.js); bütün koltuklar aynı saati görür, uzaklara `time` olarak gider
		const sec = secOf(v);
		// koltuk başına saat (ekstra süre +, sabotaj −): bir oyuncunun süre jokeri yalnız kendi süresini uzatır.
		// Eskiden tek ortak saat vardı: uzak rakibin "Ekstra Süre"si yerel insanın sayacını da uzatıyordu.
		const clocks = new Map(who.map((p) => [p.i, { extra: 0 }]));
		const human = who.find((p) => p.human);
		const qclock = human ? clocks.get(human.i) : { extra: 0 }; // arayüzün sayacı: insanın kendi saati
		const cur = {
			q,
			v,
			T,
			sec,
			who,
			clock: qclock,
			clocks,
			ctx,
			bots: [],
			used: new Map(who.map((p) => [p.i, new Set()])),
			second: new Set(),
			done: new Set(), // cevabını göndermiş uzak koltuklar (cevaptan sonra soru jokeri yok; yerelde arayüz kilitler)
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
		const remote = who.filter((p) => p.ctl.remote);
		// 'ask' bütün uzak koltuklara gider (düelloyu izleyenler de kartı görür; eskiden yalnız soruyu cevaplayanlar
		// alıyordu, izleyiciler görmediği sorunun 'reveal'ini alıyordu)
		const pv = remote.length || this.watched ? publicView(T, v, { salt: this.salt }) : null;
		// cevap filmi (mac.js filmMs): insanın ya da uzak oyuncunun içinde olduğu anda tam film, iki botun düellosunda ve
		// çok oyunculu yayılmada kısa sürüm; çevrimiçinde 'ask' ve 'reveal' ile gider, sunucu tur zamanlamasına katar
		const involved = who.some((p) => p.human || p.ctl.remote);
		const film = filmMs({ type: q.type, T, phase: ctx.phase || '', who, involved, tempo: ctx.attacker && ctx.defender ? this.filmTempo(ctx.attacker, ctx.defender) : 1 });
		if (pv) this.emit('ask', { q: pv.q, v: pv, time: sec, who: who.map((p) => p.i), title: ctx.title || '', phase: ctx.phase || '', attacker: ctx.attacker?.i ?? -1, defender: ctx.defender?.i ?? -1, target: ctx.target ?? -1, film: film ?? varsayilan(T) });
		this.refreshJokers();
		this.tick(EST.qOpen);
		// sunucu oturumu (sunucu.js): uzak koltuğun saati kart açılış onayıyla başlar, tipin eylemleri sunucuda yürür
		const ses = remote.length ? new Oturum(this, cur) : null;
		cur.ses = ses;
		// uzak koltuklardan cevaplar eşzamanlı toplanır (bekleme: süre + ekstra süre jokeri + ağ payı = sec + 12 sn)
		const remoteWait = remote.map((p) => {
			const w = p.ctl.answer(p, { q: pv.q, v: pv, time: sec, who: who.map((x) => x.i), phase: ctx.phase || '', cat: q.cat, attacker: ctx.attacker?.i ?? -1, defender: ctx.defender?.i ?? -1, target: ctx.target ?? -1, film: film ?? varsayilan(T) }, (sec + 12) * 1000);
			ses.sent(p);
			return w.then((r) => (r ? { ...r, at: clock.now() } : null));
		});
		const res = await this.ui.question(this, { q, v, T, who, bots: cur.bots, human, clock: qclock, botJokers: cur.botUses, ...ctx });
		const ra = await Promise.all(remoteWait);
		this.check(); // çıkışta kapanan soru sayılmaz (beceri puanına yanlış diye işlenmesin)
		// uzak koltuğun son değeri sunucunun kaydı, süresi sunucu saatiyle (istemcinin bildirdiği süre kullanılmaz)
		const finals = remote.map((p, k) => ses.final(p, ra[k], questionTime(sec, Math.max(0, clocks.get(p.i).extra))));
		cur.closed = true;
		ses?.close();
		for (const t of cur.timers) clearTimeout(t);
		cur.timers.length = 0;
		this.cur = null;
		const ans = who.map((p) => {
			const b = cur.bots.find((x) => x.p === p);
			const ri = remote.indexOf(p);
			let a;
			if (p.human) a = res?.human;
			else if (ri >= 0) a = ra[ri] ? finals[ri] : b ? { value: b.value, time: b.time } : null; // koptu: bot devralır
			else a = b ? { value: b.value, time: b.time } : null;
			return a || { value: null, time: sec };
		});
		// iki oyunculu ortak tur (Fitil): değerler birbirinin oyununu taşır, iki yargı çelişmez
		if (CANLI.has(q.type) && ans.length === 2) {
			const pv2 = eslestir(q.type, ans.map((a) => a.value));
			pv2.forEach((x, k) => (ans[k] = { ...ans[k], value: x }));
		}
		ADIM[q.type]?.before?.(this, cur);
		const out = who.map((p, k) => {
			const a = ans[k];
			const j = T.judge(v, a.value);
			return { p, i: p.i, name: p.name, color: p.css, value: a.value, time: a.time ?? sec, ...j };
		});
		ADIM[q.type]?.after?.(this, cur, out);
		this.estimateQuestion(T, out, cur, film, q);
		this.afterQuestion(q, T, out);
		await this.ui.reveal(this, { q, v, T, results: out, film, ...ctx });
		// answer: tam görünüm (doğru cevap, değerler, konum); istemciye soru sırasında gitmez, burada gider.
		// film: cevap ekranının süresi (ms); bütün istemciler bu kadar bekler, sunucu da (serverPace) sonra ilerler
		const fms = film ?? varsayilan(T);
		this.emit('reveal', { results: out.map((r) => ({ i: r.i, value: r.value, time: r.time, correct: r.correct, err: Number.isFinite(r.err) ? r.err : -1 })), answer: v, film: fms });
		if (this.serverPace > 0) await this.pace(fms * this.serverPace);
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

	/** Sunucu tur zamanlaması: cevap filmi bitene dek bekle (herkes aynı anda bir sonraki adıma geçer). */
	pace(ms) {
		return new Promise((r) => setTimeout(r, ms));
	}

	async secondChance(q, r) {
		const p = r.p;
		await this.ui.banner('İKİNCİ ŞANS', p.name, { tone: 'gold', short: true });
		this.tick(EST.bannerShort);
		// iki oyunculu canlı tur tek kişiyle oynanmaz; yeni tipin taze sorusu kalmadıysa da 4 şıklı test gelir
		const same = !CANLI.has(q.type) && this.pool.some((x) => x.type === q.type && !this.used.has(x.id) && this.askable(x));
		const q2 = this.pick({ cat: q.cat, types: [same ? q.type : 'choice'], who: [p], diff: Math.max(1, q.diff - 0.5) });
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

	/**
	 * Tahmini süre (insan oyuncu varsayımı; 0. koltuk "insan" sayılır): cevap süresi + cevap ekranı. Yeni tiplerde cevap
	 * ekranı filmin süresi (film), haritalı tiplerde kartın açılmasından önce kameranın süzülüşü (EST.mapOpen).
	 */
	estimateQuestion(T, out, cur, film = null, q = null) {
		const seat0 = out.find((r) => r.i === 0 && !r.p.ctl.remote);
		const times = out.filter((r) => r !== seat0).map((r) => r.time);
		const maxOther = times.length ? Math.max(...times) : 0;
		let sec;
		if (seat0) sec = Math.min(cur.sec + cur.clock.extra, seat0.time) + 0.4 + Math.min(1.2, Math.max(0, maxOther - seat0.time));
		else sec = Math.min(2.8, maxOther * Math.min(1, 2.6 / Math.max(maxOther, 0.1))) + 0.2;
		const rv = film != null ? film / 1000 + 0.26 : T.kind === 'closest' ? 2.55 : 1.95;
		if (film != null) this.filmSec += rv;
		const open = T.needsMap && !(cur.ctx?.attacker && cur.ctx?.phase === 'duel') ? EST.mapOpen : 0;
		this.tick(sec + rv + open);
	}

	// ---------------------------------------------------------------- jokerler

	/**
	 * Uzak koltuğun adam asmaca harf denemesi: kelime istemciye gitmediği için harfin yerlerini yalnız o
	 * koltuğa sunucu söyler. Yalnızca o soruyu cevaplayan koltuk ve soru açıkken.
	 */
	letterHint(p, ch) {
		const cur = this.cur;
		if (!cur || cur.closed || !cur.who.includes(p) || typeof cur.v.word !== 'string' || typeof ch !== 'string') return;
		const c = ch.toLocaleUpperCase('tr-TR').charAt(0);
		const at = [];
		[...cur.v.word].forEach((x, i) => x === c && at.push(i));
		p.ctl.event('harf', { ch: c, at });
	}

	/**
	 * Uzak koltuğun eylemi: joker, kart açılış onayı ('acildi': saat sunucuda başlar), adam asmaca harfi ya da sorunun
	 * tipine ait sunucu adımı (sunucu.js ADIM: 'harf' Harf Al, 'il', 'yer', 'halat', 'fitil'). Soruyu cevaplamayan
	 * koltuğun ve kapanmış sorunun eylemi yok sayılır.
	 */
	remoteAct(p, k, d) {
		if (k === 'joker') return this.useJoker(d?.id, p);
		const cur = this.cur;
		if (!cur || cur.closed || !cur.who.includes(p) || !cur.ses) return null;
		if (k === 'acildi') return cur.ses.open(p, true);
		if (k === 'harf' && cur.q.type === 'hang') return this.letterHint(p, d?.ch);
		if (cur.done.has(p.i)) return null; // cevabını vermiş
		return cur.ses.act(p, k, d);
	}

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
		if (id === 'sure') cur.clocks.get(p.i).extra += effect.add;
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
		if (p.ctl.remote) cur.ses?.joker(p, effect); // Harf Al: bedava açılan harfler sunucunun kaydına
		this.emitJoker(p, id, effect);
		return effect;
	}

	/**
	 * 'joker' olayı: etkinin tamamı yalnız kullananın koltuğuna gider; diğerleri (rakip dahil) yalnız herkese açık kısmı
	 * görür. Eskiden tam etki herkese gidiyordu: rakibin yarı yarıyası elenen şıkları, tahmin aralığı cevabın aralığını,
	 * adam asmaca harfleri, harita bölgesi hedefi soru sürerken öbür oyuncuya söylüyordu.
	 */
	emitJoker(p, id, effect) {
		if (!this.watched) return;
		const pub = { id, kind: effect.kind };
		if (effect.kind === 'time') pub.add = effect.add;
		else if (effect.kind === 'sabotage') Object.assign(pub, { victims: effect.victims, by: effect.by, cut: effect.cut, blurMs: effect.blurMs });
		this.emitEach('joker', (to) => ({ player: p.i, id, effect: to === p ? effect : pub }));
	}

	/**
	 * Sabotaj: rakiplerin süresi kısalır (sorunun süresinin üçte biri, cutFor) ve ekranı kararır. Bot kurbanın yeteneği
	 * düşer ve kesintinin yarısı kadar geç cevaplar. Dönüş: kurbanlar.
	 */
	sabotage(p, cur) {
		const victims = cur.who.filter((x) => x !== p && !this.ally(x.i, p.i));
		const cut = cutFor(cur.sec);
		const effect = { id: 'sabotaj', kind: 'sabotage', victims: victims.map((x) => x.i), by: p.i, cut, blurMs: SABOTAGE.blurMs };
		for (const x of victims) {
			const xc = cur.clocks.get(x.i);
			if (x.human) {
				const fire = () => {
					if (cur.closed) return;
					xc.extra -= cut;
					this.ui.sabotage?.(effect, cur);
				};
				if (this.ui.fast) xc.extra -= cut;
				else cur.timers.push(setTimeout(fire, 1500 + this.R() * 3000));
			} else if (!x.ctl.remote) {
				cur.boost.set(x.i, (cur.boost.get(x.i) || 0) + SABOTAGE.botSkill);
				cur.delay.set(x.i, (cur.delay.get(x.i) || 0) + cut * SABOTAGE.botDelay);
				const b = cur.bots.find((y) => y.p === x);
				if (b) Object.assign(b, this.botAnswer(cur, x));
			} else {
				xc.extra -= cut;
				x.ctl.event('sabotage', effect);
			}
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
			if (usable && id === 'kalkan' && this.defending(p)) {
				usable = false;
				why = SHIELD_WHY;
			}
			if (usable && id === 'kalkan' && this.phase === 'altin') {
				usable = false;
				why = 'Saldırı kalmadı';
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
			if (this.defending(p)) return fail(SHIELD_WHY);
			if (this.phase === 'altin') return fail('Saldırı kalmadı');
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
		if (cur.done.has(p.i)) return fail('Cevabını verdin');
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

	/** Oyuncu şu an süren bir düelloda savunuyor mu (kalkan o düelloda kurulamaz; SHIELD_IN_DEFENSE). */
	defending(p) {
		return !SHIELD_IN_DEFENSE && !!this.duel && this.duel.defender === p;
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
		if (this.watched) this.emit('state', this.snapshot()); // maç haritası ve koltuklar (selamda henüz yoktu)
		this.ui.hud(this);
		this.refreshJokers();
		await this.cinema.overview(this.map);
		this.tick(EST.overview);
		if (this.stageDef) await this.stageIntro();
		this.phase = 'baskent';
		this.emit('phase', { phase: this.phase, round: 0 });
		await this.placeCapitals();
		await this.cinema.introBadges?.(this.players); // "hangisi benim?": kalelerin üstünde SEN ve bot rozetleri
		if (!this.ui.fast) this.app.board.showLabels?.('all'); // il adları buradan sonra: yaklaşınca, ilin içine sığanlar
		await this.startBonus();
		// yayılma: haritada boş il kalmayana kadar
		this.phase = 'yayilma';
		let r = 0;
		while (this.free().length && r < 12) {
			r++;
			this.emit('phase', { phase: this.phase, round: r });
			this.expRound = r;
			await this.ui.banner('YAYILMA', `Tur ${r}`, { tone: 'gold' });
			this.tick(EST.banner);
			await this.expansionRound(r);
		}
		this.expansionRounds = r;
		const pace = PACE[this.cfg.length === 'long' ? 'long' : 'quick'];
		const rounds = Math.max(2, Math.ceil((this.cfg.duels || pace.byMode?.[this.cfg.mode] || pace.duels) / this.players.length));
		this.rounds = rounds;
		this.phase = 'fetih';
		// ilk turun sırası koltuktan bağımsız (TURN_ORDER.first); tohumdan, sunucuda da aynı
		this.turnBase = TURN_ORDER.first === 'seat' ? this.players.slice() : this.shuffle(this.players);
		for (this.round = 1; this.round <= rounds && !this.over; this.round++) {
			const last = this.round === rounds;
			const order = this.turnOrder(this.round, rounds);
			this.emit('phase', { phase: this.phase, round: this.round, order: order.map((p) => p.i) });
			const scoreOrder = last && rounds > 1 && TURN_ORDER.last === 'score';
			await this.ui.banner(last ? 'SON TUR' : 'FETİH', scoreOrder ? `Tur ${this.round} / ${rounds} · son saldırı gerideki oyuncunun` : `Tur ${this.round} / ${rounds}`, { tone: 'red' });
			this.tick(EST.banner);
			let moved = false;
			for (const p of order) {
				if (this.over) break;
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
		// bütün harita kadraja gelir; eşitlik varsa altın soru bu kadrajın önünde sorulur
		await this.cinema.overview(this.map);
		this.tick(EST.overview);
		await this.goldenQuestion();
		this.phase = 'bitis';
		const ranking = this.standings();
		this.over = true;
		this.refreshJokers();
		const rewards = this.finish(ranking);
		this.emit('over', { ranking: ranking.map((x) => (x.players ? { team: x.team, score: x.score } : { i: x.i, score: x.score })), reason: this.endReason });
		app.lastSim = this.report(ranking);
		return this.ui.end(this, ranking, rewards);
	}

	/** Tohumlu karıştırma (Fisher–Yates; Array.sort ile rastgele karşılaştırma eşit dağılmaz). */
	shuffle(list) {
		const a = list.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(this.R() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	/** Oyuncunun tarafı: eşli modda takım, yoksa koltuk. */
	side(p) {
		return this.mode.teams ? p.team : p.i;
	}

	/** Tarafın puanı (eşli modda takım toplamı). */
	sideScore(s) {
		let t = 0;
		for (const p of this.players) if (this.side(p) === s) t += p.score;
		return t;
	}

	/**
	 * Bir fetih turunun saldırı sırası (TURN_ORDER). Temel sıra her tur bir kayar; son turda (puan kuralı) taraflar
	 * puana göre dizilir: önde olan önce, geride olan en son. Eşitlikte kayan sıra korunur; eşli modda takımlar
	 * dönüşümlü kalır (A, B, A, B: önde olan takım başlar).
	 */
	turnOrder(round, rounds) {
		const base = this.turnBase || this.players;
		const n = base.length;
		const rot = base.map((_, k) => base[(k + round - 1) % n]);
		if (!(round === rounds && rounds > 1 && TURN_ORDER.last === 'score')) return rot;
		const sides = [...new Set(rot.map((p) => this.side(p)))].sort((a, b) => this.sideScore(b) - this.sideScore(a)); // kararlı: eşitte kayan sıra
		const queues = sides.map((s) => rot.filter((p) => this.side(p) === s));
		const out = [];
		while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift());
		return out;
	}

	/**
	 * Puan eşitliği (TIE_BREAK.golden): birinciliği paylaşan taraflar tek bir tahmin sorusu çözer; en yakın (eşitse
	 * hızlı) kazanır. Puanlar değişmez, yalnız sıralama (standings) kazananı öne alır.
	 */
	async goldenQuestion() {
		if (!TIE_BREAK.golden || this.aborted) return;
		const st = this.standings();
		if (st.length < 2 || !st[0].alive || !st[1].alive || st[0].score !== st[1].score) return;
		const tied = st.filter((x) => x.alive && x.score === st[0].score);
		const who = tied.flatMap((x) => (x.players ? x.players.filter((p) => p.alive) : [x]));
		if (who.length < 2) return;
		this.phase = 'altin';
		this.turn = -1; // HUD'daki "SIRA" rozeti son saldırıda kalmasın
		if (!this.ui.fast) this.ui.hud(this);
		this.refreshJokers();
		this.emit('phase', { phase: this.phase, round: this.rounds, tied: tied.map((x) => (x.players ? x.team : x.i)) });
		await this.ui.banner('EŞİTLİK!', 'Altın soru: en yakın tahmin kazanır', { tone: 'gold' });
		this.tick(EST.banner);
		const q = this.pickTyped(null, 'golden', who);
		const res = await this.ask(q, who, { title: 'ALTIN SORU', phase: 'altin' });
		const best = this.rank(res, 'closest')[0];
		this.tieWin = this.side(best.p);
		const name = this.mode.teams ? this.players.filter((p) => p.team === best.p.team).map((p) => p.name).join(' & ') : best.p.name;
		await this.ui.banner('ALTIN SORU', `${name} kazandı`, { tone: 'gold', short: true });
		this.tick(EST.bannerShort);
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

	/**
	 * Başkent seçimi: koltuklar rastgele sırayla başkentini seçer (insan haritada dokunur, bot karar verir).
	 * Başkent başka bir başkente komşu olamaz; seçilir seçilmez kale oraya iner.
	 * Sıra eşit olasılıklı karıştırılır (v0.8): eski `sort(() => R() - 0.5)` 4 kişide 0. koltuğu %36, 1. koltuğu %14
	 * ilk seçtiriyordu (ilk seçen en iyi yeri alır).
	 */
	async placeCapitals() {
		const app = this.app;
		const b = app.board;
		const order = this.shuffle(this.players);
		for (const p of order) {
			const i = await this.choose(p, 'capital');
			p.capital = i;
			this.setOwner(i, p.i, VALUE.pick, true);
			const k = app.castles[p.i];
			k.repair();
			k.group.visible = true;
			k.place(b.topAt(i, new app.V3()));
			await this.cinema.castleDrop(p, i);
			this.tick(EST.castle);
		}
		this.rescore();
	}

	/** Başkent olabilecek iller: boş ve hiçbir başkente komşu değil (yer kalmazsa herhangi bir boş il). */
	capitalOptions() {
		const caps = this.players.filter((p) => p.capital >= 0).map((p) => p.capital);
		const free = this.free();
		const ok = free.filter((i) => !caps.some((c) => this.neighbors(c).includes(i)));
		return ok.length ? ok : free;
	}

	/** Botun başkenti: rakip başkentlerinden uzak, takım arkadaşına yakın, komşusu bol bir il. */
	botCapital(p, options) {
		const P = this.app.board.provinces;
		const d = (a, c) => Math.hypot(P[a].x - P[c].x, P[a].z - P[c].z);
		let best = options[0];
		let bs = -Infinity;
		for (const i of options) {
			let foe = 0;
			let near = Infinity;
			let mate = 0;
			for (const q of this.players) {
				if (q === p || q.capital < 0) continue;
				if (this.ally(q.i, p.i)) mate = Math.max(mate, d(i, q.capital));
				else near = Math.min(near, d(i, q.capital));
			}
			if (near < Infinity) foe = near;
			const s = foe - mate * 0.6 + this.neighbors(i).length * 0.4 + this.R() * 1.5;
			if (s > bs) {
				bs = s;
				best = i;
			}
		}
		return best;
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
				await this.cinema.claim(p, i);
				this.tick(EST.claim);
			}
		}
	}

	async expansionRound(r) {
		// her yayılma turu başka bir kategoriden; tip kategorinin 'expand' ağırlıklarıyla seçilir
		const alive = this.players.filter((p) => p.alive);
		const q = this.pickTyped(yayilmaKat(this.R), 'expand', alive); // Coğrafya ağırlıklı (mac.js YAYILMA_KAT)
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
			const total = Math.min(picks[k] * mult, this.free().length);
			const pool = { left: pickPool(total) };
			for (let j = 0; j < total && this.free().length; j++) await this.choose(order[k].p, 'free', [j + 1, total], pool);
		}
	}

	/** Savaş filminin hız çarpanı: insan ya da uzak koltuk varsa 1 (tam film), iki botsa moda ve haritaya göre. */
	filmTempo(p, d) {
		if (p.human || d.human || p.ctl.remote || d.ctl.remote) return 1;
		return BOT_FILM[this.cfg.length === 'long' ? 'long' : 'quick'][this.cfg.mode] ?? 1;
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

	/**
	 * Oyuncu bir il seçer: 'capital' başkent, 'free' boş il (komşu öncelikli), 'attack' saldırılacak düşman ili.
	 * step: [kaçıncı, kaç] — aynı oyuncunun art arda seçimleri (yayılma hakları); pool: { left } süre havuzu (sn).
	 */
	async choose(p, kind, step = null, pool = null) {
		let options;
		if (kind === 'capital') options = this.capitalOptions();
		else if (kind === 'free') {
			const free = this.free();
			const adj = free.filter((i) => this.neighbors(i).some((j) => this.owner(j) === p.i));
			options = adj.length ? adj : free;
		} else {
			options = this.attackable(p);
			// kara bağlantısı kopuk haritada son çare: herhangi bir düşman ili
			if (!options.length) options = this.map.filter((i) => this.owner(i) >= 0 && !this.ally(this.owner(i), p.i));
		}
		if (!options.length) return -1;
		const n = step && step[1] > 1 ? ` · ${step[0]}/${step[1]}` : '';
		const text = kind === 'capital' ? 'Başkentini seç' : kind === 'free' ? `Bir il al${n}` : 'Saldıracağın ili seç';
		const sec = pool ? Math.max(PICK_TIME.floor, Math.round(pool.left)) : PICK_TIME[kind === 'free' ? 'first' : kind];
		const t0 = clock.now();
		let pickI = await p.ctl.pick(p, kind, options, text, sec);
		if (pool) pool.left -= (clock.now() - t0) / 1000;
		if (pickI == null || !options.includes(pickI)) {
			// süre doldu, uzak koltuk cevap vermedi ya da geçersiz il: bot karar verir
			if (p.human) this.ui.toast?.('Süre doldu. İl senin yerine seçildi.', { tone: 'warn' });
			pickI = this.botChoose(p, options, kind);
			await this.ui.botPick(this, p, pickI);
		} else if (p.ctl.remote) await this.ui.botPick(this, p, pickI);
		this.tick(p.human ? EST.humanPick : EST.botPick);
		if (kind === 'free') {
			this.setOwner(pickI, p.i, VALUE.pick, true);
			await this.cinema.claim(p, pickI);
			this.tick(EST.claim);
		}
		return pickI;
	}

	botChoose(p, options, kind) {
		if (kind === 'capital') return this.botCapital(p, options);
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
				if (isCap) s += k.hp <= 1 ? BOT_SIEGE.kill : BOT_SIEGE.slope * (p.skill - BOT_SIEGE.pivot) + (k.hp === 2 ? BOT_SIEGE.wounded : 0);
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
		// iki botun savaşı (insan ve uzak koltuk yok): film moda ve haritaya göre kısalır (BOT_FILM)
		const cin = this.app.cinema;
		try {
			return await this._attackTurn(p, cin);
		} finally {
			if (cin) cin.tempo = 1;
			this.duel = null;
		}
	}

	async _attackTurn(p, cin) {
		this.phase = 'fetih';
		this.emit('turn', { player: p.i, round: this.round });
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
		this.duel = { attacker: p, defender: d, target };
		this.emit('attack', { player: p.i, defender: d.i, target, capital: isCap });
		const k = this.filmTempo(p, d);
		if (cin) cin.tempo = k;
		await this.cinema.attack(p, d, target, isCap);
		this.tick(EST.attack * k);
		// çark: kategori (fetih dilimi: saldıran seçer)
		let cat = await this.ui.wheel(this, p);
		this.tick(EST.wheel);
		this.emit('wheel', { player: p.i, cat });
		if (cat === 'fetih') {
			cat = (await p.ctl.category(p, PICK_TIME.category)) || this.botCategory(p);
			if (!CATS[cat]) cat = this.botCategory(p);
			this.tick(p.human ? EST.chooseCat : 0.3);
		}
		// soru anı: kale kuşatması ayrı bir an (yıldız tipler: Halat, Fitil, Tufan…), sahra düellosu 'attack'
		const q = this.pickTyped(cat, isCap ? 'siege' : 'attack', [p, d]);
		const res = await this.ask(q, [p, d], { title: isCap ? 'KUŞATMA' : 'DÜELLO', attacker: p, defender: d, target, cat, phase: 'duel' });
		const A = res[0];
		const D = res[1];
		let winner;
		const kind = TYPES[q.type].kind;
		if (kind === 'closest') winner = this.closestWinner(A, D, p, d);
		else if (A.correct && !D.correct) winner = p;
		else if (!A.correct) winner = D.correct ? d : null;
		else if (HIZLI.has(q.type)) {
			// "erken bilen kazanır" tipleri (Kuşbakışı, Kayıp İl, Kimim, Gölge): ikisi de bildiyse erken bilen (Kimim'de
			// daha erken ipucu) kazanır; tam eşitlikte savunan
			winner = this.closestWinner({ ...A, err: Number.isFinite(A.err) ? A.err : 0 }, { ...D, err: Number.isFinite(D.err) ? D.err : 0 }, p, d);
		} else {
			// ikisi de bildi: eşitlik bozan tahmin sorusu (en yakın kazanır: Tahmin ya da Mancınık)
			await this.ui.banner('EŞİTLİK!', 'En yakın tahmin kazanır', { tone: 'gold', short: true });
			this.tick(EST.bannerShort);
			const tq = this.pickTyped(null, 'tie', [p, d]);
			const tr = await this.ask(tq, [p, d], { title: 'EŞİTLİK BOZMA', attacker: p, defender: d, target, phase: 'duel' });
			winner = this.closestWinner(tr[0], tr[1], p, d);
		}
		const result = (kind, extra = {}) => this.emit('result', { kind, player: p.i, defender: d.i, target, ...extra });
		if (winner === p && d.shield) {
			// kalkan: kaybedilen savunma yok sayılır
			d.shield = false;
			this.emit('shield', { player: d.i, target });
			result('shield');
			this.refreshJokers();
			await this.ui.banner('KALKAN!', `${d.name} saldırıyı savuşturdu`, { tone: 'gold', short: true });
			this.tick(EST.bannerShort);
			await (this.cinema.shield ? this.cinema.shield(d, target) : this.cinema.defend(d, target));
			this.tick(EST.defend * k);
		} else if (winner === p) {
			if (isCap) {
				const left = app.castles[d.i].hit();
				this.towersLost[d.i]++;
				this.towersBy[p.i]++;
				result('tower', { left });
				await this.cinema.towerDown(p, d, target, left);
				this.tick(EST.tower * k);
				if (left <= 0) await this.eliminate(d, p);
				else this.rescore();
			} else {
				const v = (this.value.get(target) || VALUE.pick) + VALUE.conquer;
				result('conquer');
				this.setOwner(target, p.i, v, true);
				await this.cinema.conquer(p, target);
				this.tick(EST.conquer * k);
			}
		} else if (winner === d) {
			this.value.set(target, (this.value.get(target) || VALUE.pick) + VALUE.defend);
			result('defend');
			this.emit('owner', { i: target, p: d.i, value: this.value.get(target) }); // il değeri arttı (istemci puanı tutsun)
			this.rescore();
			await this.cinema.defend(d, target);
			this.tick(EST.defend * k);
		} else {
			result('nobody');
			await this.cinema.nobody(target);
			this.tick(EST.nobody * k);
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
		d.out = ++this.outSeq; // elenme sırası: sıralamada geç elenen önde
		const app = this.app;
		app.castles[d.i].group.visible = false;
		for (const i of this.owned(d.i)) this.setOwner(i, by.i, (this.value.get(i) || VALUE.pick) + VALUE.conquer);
		this.rescore();
		this.emit('elim', { player: d.i, by: by.i });
		if (this.app.cinema) this.app.cinema.tempo = 1; // elenme hep tam film
		await this.cinema.eliminated(d, by);
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

	/**
	 * Sıralama (TIE_BREAK): ayakta olan önde; elenenler arasında geç elenen önde; sonra puan; eşit puanda altın soruyu
	 * kazanan, sonra daha çok il, kalede daha çok kule, daha çok doğru cevap. Eskiden eşitlikte koltuk sırası
	 * belirliyordu (yerelde hep insan öne geçiyordu) ve elenenlerin hepsi 0 puanla koltuk sırasına diziliyordu.
	 */
	standings() {
		const hp = (p) => (p.alive && this.app.castles[p.i].group.visible ? this.app.castles[p.i].hp : 0);
		const sides = this.mode.teams
			? [0, 1].map((k) => {
					const players = this.players.filter((p) => p.team === k);
					return { team: k, score: players.reduce((s, p) => s + p.score, 0), alive: players.some((p) => p.alive), players, out: Math.max(0, ...players.map((p) => p.out || 0)) };
				})
			: this.players.slice();
		const key = new Map(
			sides.map((x) => {
				const ps = x.players || [x];
				const side = x.players ? x.team : x.i;
				return [x, [x.alive ? 1 : 0, x.alive ? 0 : x.out || 0, x.score, this.tieWin === side ? 1 : 0, ps.reduce((a, p) => a + this.owned(p.i).length, 0), ps.reduce((a, p) => a + hp(p), 0), ps.reduce((a, p) => a + this.stat[p.i].correct, 0)]];
			}),
		);
		return sides.sort((a, b) => {
			const ka = key.get(a);
			const kb = key.get(b);
			for (let j = 0; j < ka.length; j++) if (ka[j] !== kb[j]) return kb[j] - ka[j];
			return 0;
		});
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
			// kendi (eşlide takımın) yıktığı kuleler; eskiden 3–4 kişide botların birbirine yıktıkları da sayılıyordu
			towers: team ? this.players.filter((p) => p.team === me.team).reduce((a, p) => a + this.towersBy[p.i], 0) : this.towersBy[me.i],
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
			types: { ...this.tcount },
			qlog: this.qlog.slice(),
			filmSeconds: Math.round(this.filmSec),
		};
	}
}
