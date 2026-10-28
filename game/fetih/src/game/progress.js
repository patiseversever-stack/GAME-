// İlerleme: XP, seviye, altın, kozmetik envanteri, joker stoğu, uyarlanan zorluk puanı, ELO,
// günlük ödül ve gelir kancaları (ödüllü reklam, mağaza, reklamsız paket). Kayıt: `store` ('progress').
//
// Kayıt biçimi sürümlüdür (v). Bozuk ya da eski kayıt varsayılanlarla birleştirilir.
// Çevrimiçi sürümde `serialize()` çıktısı sunucuya gönderilebilir (bulut kaydı).

import { COSTUMES, BANNERS, ALL_ITEMS, DEFAULT_LOADOUT, item, unlockedByLevel } from './commanders.js';
import { JOKERS, JOKER_ORDER } from './jokers.js';

export const MAX_LEVEL = 60;
export const SAVE_KEY = 'progress';

/** n. seviyeden n+1'e gereken XP. */
export const xpNeeded = (level) => Math.round(100 + 35 * (level - 1) + 2.5 * (level - 1) * (level - 1));

/** Toplam XP'den seviye bilgisi. */
export function levelOf(xp) {
	let level = 1;
	let left = xp;
	while (level < MAX_LEVEL && left >= xpNeeded(level)) {
		left -= xpNeeded(level);
		level++;
	}
	return { level, into: left, need: level >= MAX_LEVEL ? 0 : xpNeeded(level), max: level >= MAX_LEVEL };
}

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const pCorrect = (skill, diff) => clamp(skill + 0.25 - 0.15 * diff, 0.08, 0.95);

/** Bu yetenekte sorunun "akış" zorluğu (doğru bilme olasılığı ≈ %66). 1..3 sürekli değer. */
export const targetDiff = (skill) => clamp((skill + 0.25 - 0.66) / 0.15, 1, 3);

/** Bot seviyelerinin ELO karşılığı (dereceli maçta rakip puanı). */
export const BOT_ELO = { caylak: 700, er: 1000, usta: 1300, efsane: 1600 };

export const eloExpected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));

export const JOKER_PRICE = { yari: 60, sure: 50, kalkan: 90, ikinci: 100, sabotaj: 120, kahin: 70 };

export const DAILY = [
	{ day: 1, gold: 50 },
	{ day: 2, gold: 70 },
	{ day: 3, joker: 'yari', gold: 40 },
	{ day: 4, gold: 100 },
	{ day: 5, joker: 'kahin', gold: 60 },
	{ day: 6, gold: 150 },
	{ day: 7, gold: 250, costume: 'kral_cay' },
];

/** Ödüllü reklam yerleşimleri. */
export const AD_PLACEMENTS = {
	altin: { name: '+60 altın', gold: 60 },
	joker: { name: 'Bir joker', joker: 'random' },
	maç_ikiye_katla: { name: 'Maç ödülü x2', double: true },
	gunluk_ikiye_katla: { name: 'Günlük ödül x2', dailyDouble: true },
};

/** Mağaza paketleri (gerçek para ürünleri: `hooks.purchase(id)` ile bağlanır). */
export const IAP = [
	{ id: 'reklamsiz', name: 'Reklamsız Paket', desc: 'Ara reklamlar kalkar. Ödüllü reklamlar isteğe bağlı kalır.', price: '₺59,99', noAds: true },
	{ id: 'altin_s', name: 'Altın Kesesi', desc: '500 altın', price: '₺29,99', gold: 500 },
	{ id: 'altin_m', name: 'Altın Sandığı', desc: '1.400 altın', price: '₺69,99', gold: 1400 },
	{ id: 'joker_paketi', name: 'Joker Paketi', desc: 'Her jokerden 3 adet', price: '₺39,99', jokers: 3 },
];

const defaults = () => ({
	v: 1,
	profile: { name: 'Komutan', created: 0 },
	xp: 0,
	gold: 150,
	owned: { costume: ['acemi', 'futbolcu'], banner: ['s_kirmizi', 's_mavi'] },
	equipped: { ...DEFAULT_LOADOUT },
	jokers: { yari: 2, sure: 2, kalkan: 1, ikinci: 1, sabotaj: 1, kahin: 1 },
	rating: { g: 0.52, n: 0, cat: {} },
	elo: { rating: 1000, games: 0, peak: 1000, wins: 0, losses: 0, season: 1 },
	stats: { played: 0, won: 0, answered: 0, correct: 0, provinces: 0, bestStreak: 0, streak: 0, towers: 0 },
	daily: { last: '', streak: 0 },
	seen: [],
	ads: { noAds: false, matches: 0, shown: 0 },
	updatedAt: 0,
});

const dayKey = (t) => {
	const d = new Date(t);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayNum = (t) => {
	const d = new Date(t);
	return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
};

export class Progress {
	/** store: {get,set}; hooks: {rewardedAd(placement), purchase(id)}; now: saat (test için) */
	constructor(store, hooks = {}, now = () => Date.now()) {
		this.store = store;
		this.hooks = hooks;
		this.now = now;
		this.listeners = new Set();
		const saved = (store && store.get && store.get(SAVE_KEY)) || null;
		const d = defaults();
		this.d = saved && typeof saved === 'object' ? this._merge(d, saved) : d;
		if (!this.d.profile.created) this.d.profile.created = now();
		this.grantAuto();
	}

	_merge(d, s) {
		const out = { ...d, ...s };
		for (const k of ['profile', 'owned', 'equipped', 'jokers', 'rating', 'elo', 'stats', 'daily', 'ads']) out[k] = { ...d[k], ...(s[k] || {}) };
		out.rating.cat = { ...(s.rating?.cat || {}) };
		out.owned.costume = [...new Set([...d.owned.costume, ...(s.owned?.costume || [])])];
		out.owned.banner = [...new Set([...d.owned.banner, ...(s.owned?.banner || [])])];
		out.seen = Array.isArray(s.seen) ? s.seen.slice(-400) : [];
		return out;
	}

	save() {
		this.d.updatedAt = this.now();
		try {
			this.store?.set?.(SAVE_KEY, this.d);
		} catch (e) {
			/* kayıt kapalı: bellekte kalır */
		}
		for (const fn of this.listeners) fn(this);
	}

	/** Değişince çağrılacak dinleyici (arayüzdeki altın/seviye göstergesi). Dönüş: iptal işlevi. */
	subscribe(fn) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	serialize() {
		return JSON.parse(JSON.stringify(this.d));
	}

	reset() {
		this.d = defaults();
		this.d.profile.created = this.now();
		this.save();
	}

	// ---------------------------------------------------------------- seviye, XP, altın

	get xp() {
		return this.d.xp;
	}
	get gold() {
		return this.d.gold;
	}
	get level() {
		return levelOf(this.d.xp).level;
	}
	get name() {
		return this.d.profile.name;
	}
	get noAds() {
		return this.d.ads.noAds;
	}
	/** { level, into, need, max } — XP çubuğu için. */
	get levelInfo() {
		return levelOf(this.d.xp);
	}

	setName(n) {
		this.d.profile.name = String(n || 'Komutan').slice(0, 14);
		this.save();
	}

	/** XP ekle; seviye atlamaları ödülleriyle döner. */
	addXp(n) {
		const from = this.level;
		this.d.xp += Math.max(0, Math.round(n));
		const to = this.level;
		const ups = [];
		for (let l = from + 1; l <= to; l++) {
			const gold = 40 + 5 * l;
			this.d.gold += gold;
			let joker = null;
			if (l % 3 === 0) {
				joker = JOKER_ORDER[l % JOKER_ORDER.length];
				this.d.jokers[joker] = (this.d.jokers[joker] || 0) + 1;
			}
			ups.push({ level: l, gold, joker, unlocks: unlockedByLevel(l).filter((x) => x.unlock.level === l).map((x) => ({ kind: x.kind, id: x.id, name: x.name })) });
		}
		this.save();
		return ups;
	}

	addGold(n) {
		this.d.gold += Math.round(n);
		this.save();
	}

	spend(n) {
		if (this.d.gold < n) return false;
		this.d.gold -= n;
		this.save();
		return true;
	}

	// ---------------------------------------------------------------- kozmetik

	owns(kind, id) {
		return this.d.owned[kind]?.includes(id) || false;
	}

	/** Gereksinim sağlandı mı? { ok, why } — `why` kilit nedeni (Türkçe). */
	requirement(it, ctx = {}) {
		const u = it.unlock || {};
		const campaign = ctx.campaign;
		if (u.free) return { ok: true };
		if (u.level != null) return this.level >= u.level ? { ok: true } : { ok: false, why: `Seviye ${u.level}` };
		if (u.stars != null) {
			const st = campaign ? campaign.totalStars() : 0;
			return st >= u.stars ? { ok: true } : { ok: false, why: `${u.stars} sefer yıldızı` };
		}
		if (u.campaign) return campaign?.regionCleared(u.campaign) ? { ok: true } : { ok: false, why: `${campaign?.regionName(u.campaign) || u.campaign} komutanını yen` };
		if (u.daily) return { ok: false, why: `Günlük ödül serisi: ${u.daily}. gün` };
		if (u.shop) return { ok: true };
		return { ok: true };
	}

	/**
	 * Bir eşya türünün kataloğu (mağaza ve dolap ekranı):
	 * [{...item, owned, equipped, available, why, canBuy}]
	 */
	catalog(kind, ctx = {}) {
		const list = kind === 'banner' ? BANNERS : COSTUMES;
		return list.map((it) => {
			const req = this.requirement(it, ctx);
			const owned = this.owns(kind, it.id);
			return {
				...it,
				owned,
				equipped: this.d.equipped[kind] === it.id,
				available: req.ok,
				why: req.why || '',
				canBuy: !owned && req.ok && it.price != null && this.d.gold >= it.price && !it.unlock.campaign && !it.unlock.daily,
			};
		});
	}

	/** Kural: ödülle gelenler (fiyatsız, kampanya, günlük) sağlanınca otomatik verilir. */
	grantAuto(ctx = {}) {
		const got = [];
		for (const it of ALL_ITEMS) {
			if (this.owns(it.kind, it.id)) continue;
			const u = it.unlock || {};
			const reward = u.campaign || u.free || (it.price == null && !u.shop);
			if (!reward) continue;
			if (this.requirement(it, ctx).ok) {
				this.d.owned[it.kind].push(it.id);
				got.push(it);
			}
		}
		if (got.length) this.save();
		return got;
	}

	buy(kind, id, ctx = {}) {
		const it = item(kind, id);
		if (!it) return { ok: false, reason: 'Eşya yok' };
		if (this.owns(kind, id)) return { ok: false, reason: 'Zaten sende' };
		const req = this.requirement(it, ctx);
		if (!req.ok) return { ok: false, reason: req.why };
		if (it.price == null || it.unlock.campaign || it.unlock.daily) return { ok: false, reason: 'Satılmıyor, ödülle gelir' };
		if (!this.spend(it.price)) return { ok: false, reason: 'Altın yetmiyor' };
		this.d.owned[kind].push(id);
		this.save();
		return { ok: true, item: it };
	}

	equip(kind, id) {
		if (kind !== 'face' && kind !== 'skin' && !this.owns(kind, id)) return false;
		this.d.equipped[kind] = id;
		this.save();
		return true;
	}

	get equipped() {
		return this.d.equipped;
	}

	// ---------------------------------------------------------------- jokerler

	get jokerStock() {
		return this.d.jokers;
	}

	addJoker(id, n = 1) {
		if (!JOKERS[id]) return;
		this.d.jokers[id] = (this.d.jokers[id] || 0) + n;
		this.save();
	}

	/** Maçta bedava haktan sonra stoktan kullanılan joker. */
	consumeJoker(id) {
		if ((this.d.jokers[id] || 0) > 0) {
			this.d.jokers[id]--;
			this.save();
		}
	}

	buyJoker(id, n = 1) {
		const price = JOKER_PRICE[id];
		if (!price) return { ok: false, reason: 'Joker yok' };
		if (!this.spend(price * n)) return { ok: false, reason: 'Altın yetmiyor' };
		this.addJoker(id, n);
		return { ok: true };
	}

	// ---------------------------------------------------------------- uyarlanan zorluk

	/** Kategoriye göre yetenek (0.15..0.95); botların yetenek ölçeğiyle aynı. */
	skill(cat) {
		const g = this.d.rating.g;
		const c = cat && this.d.rating.cat[cat];
		if (!c) return g;
		const w = Math.min(1, c.n / 12);
		return g + (c.s - g) * w;
	}

	/** Bir sorudan sonra puanı güncelle (insan oyuncunun cevabı). */
	rate(cat, diff, correct) {
		const r = this.d.rating;
		const c = r.cat[cat] || (r.cat[cat] = { s: r.g, n: 0 });
		const e = pCorrect(c.s, diff);
		const K = 0.07 / Math.sqrt(1 + c.n / 25);
		c.s = clamp(c.s + K * ((correct ? 1 : 0) - e), 0.15, 0.95);
		c.n++;
		const eg = pCorrect(r.g, diff);
		r.g = clamp(r.g + (K * 0.6) * ((correct ? 1 : 0) - eg), 0.15, 0.95);
		r.n++;
		if (r.n % 5 === 0) this.save();
	}

	/** Verilen kategori için hedef zorluk (1..3). */
	diffFor(cat) {
		return targetDiff(this.skill(cat));
	}

	/** Görülen soru kayıtları (tekrarı azaltmak için). */
	markSeen(ids) {
		const s = this.d.seen;
		for (const id of ids) {
			const k = s.indexOf(id);
			if (k >= 0) s.splice(k, 1);
			s.push(id);
		}
		if (s.length > 400) s.splice(0, s.length - 400);
	}

	seenSet() {
		return new Set(this.d.seen);
	}

	// ---------------------------------------------------------------- ELO (dereceli oyun için hazır)

	get elo() {
		return this.d.elo;
	}

	/**
	 * score: 1 kazandı, 0 kaybetti, aradaki değerler çok oyunculuda sıralama puanı.
	 * opp: rakiplerin ortalama puanı. Dönüş: { from, to, delta }.
	 */
	eloUpdate(score, opp) {
		const e = this.d.elo;
		const k = e.games < 20 ? 40 : 24;
		const from = e.rating;
		e.rating = Math.max(100, Math.round(from + k * (score - eloExpected(from, opp))));
		e.games++;
		if (score >= 0.5) e.wins++;
		else e.losses++;
		e.peak = Math.max(e.peak, e.rating);
		this.save();
		return { from, to: e.rating, delta: e.rating - from };
	}

	// ---------------------------------------------------------------- günlük ödül

	/** { available, day (1..7), streak, reward, nextInMs } */
	dailyStatus() {
		const t = this.now();
		const d = this.d.daily;
		const today = dayKey(t);
		const claimedToday = d.last === today;
		let streak = d.streak;
		if (d.last && !claimedToday) {
			const gap = dayNum(t) - dayNum(new Date(d.last + 'T12:00:00').getTime());
			if (gap > 1) streak = 0;
		}
		const day = (claimedToday ? streak - 1 : streak) % 7;
		const next = new Date(t);
		next.setHours(24, 0, 0, 0);
		return { available: !claimedToday, day: day + 1, streak, reward: DAILY[day], nextInMs: claimedToday ? next.getTime() - t : 0 };
	}

	/** Günlük ödülü al. double: ödüllü reklamla ikiye katla. */
	claimDaily({ double = false } = {}) {
		const st = this.dailyStatus();
		if (!st.available) return { ok: false, reason: 'Bugünkü ödül alındı' };
		const r = st.reward;
		const k = double ? 2 : 1;
		this.d.gold += r.gold * k;
		if (r.joker) this.d.jokers[r.joker] = (this.d.jokers[r.joker] || 0) + k;
		if (r.costume && !this.owns('costume', r.costume)) this.d.owned.costume.push(r.costume);
		this.d.daily = { last: dayKey(this.now()), streak: st.streak + 1 };
		this.save();
		return { ok: true, reward: r, day: st.day, streak: this.d.daily.streak, double };
	}

	// ---------------------------------------------------------------- gelir kancaları (kanca; gerçek SDK sonra)

	/**
	 * Ödüllü reklam. `hooks.rewardedAd(placement)` Promise<boolean> dönmeli; yoksa benzetim: hemen ödüllenir.
	 * placement: AD_PLACEMENTS anahtarı. Çağıran ('maç_ikiye_katla' gibi) kendi çarpanını uygular.
	 */
	async watchAd(placement = 'altin') {
		const p = AD_PLACEMENTS[placement];
		if (!p) return { ok: false, reason: 'Bilinmeyen yerleşim' };
		let ok = true;
		let simulated = true;
		if (typeof this.hooks.rewardedAd === 'function') {
			simulated = false;
			try {
				ok = !!(await this.hooks.rewardedAd(placement));
			} catch (e) {
				ok = false;
			}
		}
		if (!ok) return { ok: false, reason: 'Reklam gösterilemedi' };
		const out = { ok: true, simulated, placement };
		if (p.gold) {
			this.d.gold += p.gold;
			out.gold = p.gold;
		}
		if (p.joker) {
			const id = p.joker === 'random' ? JOKER_ORDER[Math.floor(Math.random() * JOKER_ORDER.length)] : p.joker;
			this.d.jokers[id] = (this.d.jokers[id] || 0) + 1;
			out.joker = id;
		}
		this.save();
		return out;
	}

	/** Ara reklam sırası geldi mi (reklamsız pakette hiç). Maç bitince çağır. */
	interstitialDue() {
		if (this.d.ads.noAds) return false;
		return this.d.ads.matches > 0 && this.d.ads.matches % 3 === 0;
	}

	noteInterstitialShown() {
		this.d.ads.shown++;
		this.save();
	}

	/** Gerçek para ürünü. `hooks.purchase(id)` Promise<boolean>; yoksa mağaza bağlı değil. */
	async purchase(id) {
		const offer = IAP.find((x) => x.id === id);
		if (!offer) return { ok: false, reason: 'Ürün yok' };
		if (typeof this.hooks.purchase !== 'function') return { ok: false, reason: 'Mağaza henüz bağlı değil' };
		let ok = false;
		try {
			ok = !!(await this.hooks.purchase(id));
		} catch (e) {
			ok = false;
		}
		if (!ok) return { ok: false, reason: 'Satın alma tamamlanmadı' };
		if (offer.noAds) this.d.ads.noAds = true;
		if (offer.gold) this.d.gold += offer.gold;
		if (offer.jokers) for (const j of JOKER_ORDER) this.d.jokers[j] = (this.d.jokers[j] || 0) + offer.jokers;
		this.save();
		return { ok: true, offer };
	}

	// ---------------------------------------------------------------- maç sonu

	/**
	 * res: { won, rank (1..n), players, ranked, oppElo, stat:{q, correct}, provinces, towers,
	 *        length, level (bot seviye anahtarı), stars (sefer), firstClear, boss, seen:[id] }
	 * Dönüş: ödül özeti (arayüz sonuç ekranı için).
	 */
	recordMatch(res) {
		const st = this.d.stats;
		const lines = [];
		const long = res.length === 'long';
		const mult = (long ? 1.8 : 1) * ({ caylak: 0.8, er: 1, usta: 1.2, efsane: 1.4 }[res.level] || 1);
		let xp = 30;
		lines.push({ label: 'Katılım', xp: 30, gold: 0 });
		let gold = 12;
		const cx = Math.min(20, res.stat.correct) * 5;
		if (cx) lines.push({ label: 'Doğru cevaplar', xp: cx, gold: 0 });
		xp += cx;
		if (res.won) {
			xp += 50;
			gold += 25;
			lines.push({ label: 'Zafer', xp: 50, gold: 25 });
		} else if (res.rank === 2 && res.players > 2) {
			xp += 20;
			gold += 8;
			lines.push({ label: 'İkincilik', xp: 20, gold: 8 });
		}
		const px = Math.min(60, res.provinces * 3);
		if (px) {
			xp += px;
			lines.push({ label: 'Fethedilen iller', xp: px, gold: 0 });
		}
		if (res.stars) {
			xp += res.stars * 15;
			gold += res.stars * 10;
			lines.push({ label: 'Sefer yıldızları', xp: res.stars * 15, gold: res.stars * 10 });
		}
		if (res.firstClear) {
			const g = res.boss ? 120 : 30;
			gold += g;
			lines.push({ label: res.boss ? 'Komutan yenildi' : 'İlk geçiş', xp: 0, gold: g });
		}
		xp = Math.round(xp * mult);
		gold = Math.round(gold * mult);
		this.d.gold += gold;
		const levelUps = this.addXp(xp);
		st.played++;
		if (res.won) st.won++;
		st.answered += res.stat.q;
		st.correct += res.stat.correct;
		st.provinces += res.provinces;
		st.towers += res.towers || 0;
		st.streak = res.won ? st.streak + 1 : 0;
		st.bestStreak = Math.max(st.bestStreak, st.streak);
		this.d.ads.matches++;
		let elo = null;
		if (res.ranked) {
			const score = res.players > 1 ? (res.players - res.rank) / (res.players - 1) : res.won ? 1 : 0;
			elo = this.eloUpdate(score, res.oppElo ?? BOT_ELO[res.level] ?? 1000);
		}
		if (res.seen) this.markSeen(res.seen);
		this.save();
		return { xp, gold, lines, levelUps, elo, level: this.level, levelInfo: this.levelInfo, jokers: levelUps.map((u) => u.joker).filter(Boolean) };
	}
}
