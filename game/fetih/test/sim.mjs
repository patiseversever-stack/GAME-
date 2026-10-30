// Oynanış benzetimi ve denge denetimi (düz node, çizim yok):
//   node test/sim.mjs [--n=6] [--seed=1] [--quiet] [--strict]
//
// Gerçek Match sınıfını sahte harita, kale, sinema ve arayüzle çalıştırır. Bütün modlar, süreler, bölgeler
// ve bot seviyeleri botlarla baştan sona oynanır; ayrıca bir "insan" koltuğu rastgele joker kullanıp
// bütün soru tiplerinde jokerleri sınar. Raporlar:
//   - hata / iddia ihlali (joker etkisi tutarsız, bozuk sonuç…): çıkış kodu 1
//   - joker kullanımı (bot ve insan), soru tipi × joker destek matrisi
//   - tahmini maç süresi (hızlı 5–7 dk, uzun 15–20 dk hedefi), kazanma dağılımı, bitiş nedenleri
//   - sefer: bütün sahneleri insan koltuğuyla oynatıp yıldız, kilit ve kaydı doğrular
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// maç modülleri (yeni soru tipleri) harita verisini JSON olarak içe aktarır: önce kanca, sonra dinamik içe aktarma
await import('./kanca.mjs');
const { Match, MODES, PACE } = await import('../src/game/match.js');
const { Progress } = await import('../src/game/progress.js');
const { Campaign, STAGES, REGION_ORDER } = await import('../src/game/campaign.js');
const { JOKERS, JOKER_ORDER, PER_QUESTION, questionTime, extraFor, cutFor } = await import('../src/game/jokers.js');
const { TYPES } = await import('../src/quiz/types.js');
const { WHEEL } = await import('../src/quiz/categories.js');
const MAC = await import('../src/quiz/mac.js');

const here = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(here, '../src/data/turkiye.json'), 'utf8'));
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const N = Number(opt.n || 6);
const SEED = Number(opt.seed || 1);
const QUIET = 'quiet' in opt;

let fails = 0;
const bad = (msg) => {
	fails++;
	if (fails <= 40) console.log('  HATA: ' + msg);
};
const check = (cond, msg) => cond || bad(msg);

// ---------------------------------------------------------------- sahte dünya

class V3 {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	set(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	}
}

function makeBoard() {
	const provinces = DATA.provinces.map((p, i) => ({ ...p, index: i, x: p.center[0], z: -p.center[1], owner: -1 }));
	const byId = new Map(provinces.map((p) => [p.id, p]));
	return {
		provinces,
		byId,
		count: provinces.length,
		region: (key) => provinces.filter((p) => p.region === key).map((p) => p.index),
		setOwner(i, p) {
			provinces[i].owner = p;
		},
		topAt: (i, out) => out.set(provinces[i].x, 0, provinces[i].z),
		pick(x, z) {
			let best = -1;
			let bd = 9;
			for (const p of provinces) {
				const d = Math.hypot(p.x - x, p.z - z);
				if (d < bd) {
					bd = d;
					best = p.index;
				}
			}
			return best;
		},
		fx() {},
		clearFx() {},
	};
}

function makeCastle() {
	return {
		hp: 3,
		group: { visible: false },
		hit() {
			return --this.hp;
		},
		repair() {
			this.hp = 3;
		},
		place() {},
	};
}

function memStore() {
	const m = {};
	return { get: (k) => m[k], set: (k, v) => (m[k] = JSON.parse(JSON.stringify(v))), dump: () => m };
}

function makeApp(store = memStore()) {
	const noop = async () => {};
	return {
		V3,
		store,
		hooks: {},
		board: makeBoard(),
		castles: [0, 1, 2, 3].map(makeCastle),
		playerColors: [0xff3030, 0x2a6bff, 0xffbe12, 0x9b3dff],
		cinema: new Proxy({}, { get: () => noop }),
	};
}

// ---------------------------------------------------------------- joker etkisi denetimi

const letters = (w) => new Set([...w].filter((c) => c !== ' '));
function checkEffect(m, id, effect, cur) {
	const { v, T } = cur;
	const q = v.q;
	const tag = `${q.type}/${id}/${effect.kind}`;
	switch (effect.kind) {
		case 'hide':
			check(!effect.hide.includes(v.right), `${tag}: doğru şık elendi`);
			check(effect.hide.length === (v.opts.length >= 4 ? 2 : 1), `${tag}: yanlış sayıda şık`);
			check(effect.hide.every((i) => i >= 0 && i < v.opts.length), `${tag}: geçersiz şık`);
			break;
		case 'range':
			check(effect.min <= q.ans && q.ans <= effect.max, `${tag}: aralık cevabı içermiyor`);
			check(effect.min >= q.min && effect.max <= q.max && effect.max > effect.min, `${tag}: aralık sınır dışı`);
			check(effect.max - effect.min < q.max - q.min, `${tag}: aralık daralmadı`);
			break;
		case 'letters':
			check(effect.letters.every((c) => letters(v.word).has(c)), `${tag}: sözcükte olmayan harf`);
			if (!effect.hint) check(effect.letters.length <= letters(v.word).size - 2, `${tag}: sözcük tamamlanır`);
			break;
		case 'poll':
			check(effect.pct.reduce((a, b) => a + b, 0) === 100, `${tag}: yüzdeler 100 değil`);
			check(effect.pct.length === (v.opts ? v.opts.length : 2), `${tag}: yüzde sayısı`);
			check(effect.pct.every((x) => x >= 0), `${tag}: eksi yüzde`);
			break;
		case 'crowd':
			check(effect.value >= q.min && effect.value <= q.max, `${tag}: kalabalık değeri sınır dışı`);
			break;
		case 'zone': {
			check(effect.provinces.length > 0, `${tag}: boş bölge`);
			if (!effect.crowd) check(effect.provinces.includes(m.app.board.pick(v.target.x, v.target.z)), `${tag}: bölge hedefi içermiyor`);
			break;
		}
		case 'time':
			check(effect.add > 0 && effect.add === extraFor(v.sec), `${tag}: ekstra süre ${effect.add} sn, bütçe ${v.sec} sn için ${extraFor(v.sec)} olmalı`);
			break;
		case 'sabotage':
			check(effect.victims.length > 0 && !effect.victims.includes(effect.by), `${tag}: kurban yok ya da kendisi`);
			check(effect.cut === cutFor(v.sec), `${tag}: sabotaj ${effect.cut} sn, bütçe ${v.sec} sn için ${cutFor(v.sec)} olmalı`);
			break;
		case 'shield':
		case 'second':
			break;
		case 'custom': // yeni tipin kendi joker etkisi (T.joker): tip destekliyor olmalı ve veri üretmeli
			check(T.jokers?.includes(id) && effect.data && typeof effect.data === 'object', `${tag}: yeni tip joker etkisi`);
			break;
		default:
			bad(`${tag}: bilinmeyen etki`);
	}
	check(T === TYPES[q.type], 'tip uyuşmuyor');
}

// ---------------------------------------------------------------- sahte arayüz ve "insan" oyuncu

const stats = {
	matches: 0,
	questions: 0,
	jokers: { bot: {}, human: {} },
	refused: {},
	matrix: {}, // tip -> joker -> 'ok' | 'na'
	byType: {},
	endReasons: {},
	est: {},
	wins: {},
	flow: { shield: 0, second: 0, sabotage: 0 },
	ties: {},
};
const bump = (o, k, n = 1) => (o[k] = (o[k] || 0) + n);

function makeUI({ human = false, policy = 0.5, accuracy = 0.7 } = {}) {
	const ui = {
		fast: true,
		log: [],
		hud() {},
		banner: async () => {},
		toast: () => null,
		prompt() {},
		botPick: async () => {},
		ranking: async () => {},
		reveal: async () => {},
		wheel: async (m) => WHEEL[Math.floor(m.R() * WHEEL.length)],
		chooseCategory: async () => 'tarih',
		pickProvince: async (m, options) => options[Math.floor(m.R() * options.length)],
		jokers() {},
		end: async (m, ranking, rewards) => ({ ranking, rewards }),
		async question(m, ctx) {
			const { T, v, clock } = ctx;
			stats.questions++;
			bump(stats.byType, ctx.q.type);
			if (!ctx.human) return { human: null };
			// matris: bu soru tipinde hangi joker uygulanır
			const list = m.jokerList();
			const row = (stats.matrix[ctx.q.type] ||= {});
			for (const j of list) if (j.scope === 'question') row[j.id] = j.na ? 'na' : 'ok';
			// rastgele joker kullan
			const pool = list.filter((j) => j.usable && j.scope === 'question');
			if (m.R() < policy) {
				for (let k = 0; k < PER_QUESTION + 1 && pool.length; k++) {
					const j = pool.splice(Math.floor(m.R() * pool.length), 1)[0];
					const r = m.useJoker(j.id);
					if (r.ok) {
						bump(stats.jokers.human, j.id);
						checkEffect(m, j.id, r.effect, m.cur);
					} else bump(stats.refused, `${j.id}: ${r.reason}`);
					check(r.ok || typeof r.reason === 'string', 'useJoker sonuç biçimi');
				}
			}
			// yasak kullanımlar reddedilmeli
			const again = m.jokerList().find((j) => j.scope === 'question' && !j.usable && j.why.includes('kullandın'));
			if (again) check(!m.useJoker(again.id).ok, `${again.id}: ikinci kullanım reddedilmedi`);
			if (m.R() < policy * 0.4 && m.jokerList().find((j) => j.id === 'kalkan' && j.usable)) {
				const r = m.useJoker('kalkan');
				check(r.ok, 'kalkan hazırlanamadı');
				bump(stats.jokers.human, 'kalkan');
				check(!m.useJoker('kalkan').ok, 'kalkan iki kez hazırlandı');
			}
			// bildi: bot gibi cevapla (süre ve ekstra süre dahil)
			const b = T.bot(v, accuracy, m.R);
			const total = questionTime(v.sec, clock.extra);
			check(total >= 3, `süre ${total} sn çok kısa`);
			if (b.time > total) return { human: { value: T.kind === 'exact' ? null : b.value, time: total, timeout: true } };
			return { human: { value: b.value, time: b.time } };
		},
	};
	return ui;
}

// joker kullanımını (bot dahil) ve etkilerini her uygulamada denetle
const origApply = Match.prototype.applyJoker;
Match.prototype.applyJoker = function (p, id, cur, silent) {
	const e = origApply.call(this, p, id, cur, silent);
	if (e) {
		bump(stats.jokers[p.human ? 'human' : 'bot'], id);
		if (!p.human) checkEffect(this, id, e, cur);
		if (id === 'sabotaj') stats.flow.sabotage++;
	}
	return e;
};
const origSecond = Match.prototype.secondChance;
Match.prototype.secondChance = function (...a) {
	stats.flow.second++;
	return origSecond.apply(this, a);
};

// ---------------------------------------------------------------- bir maç

async function play(cfg, { human = false, store, policy, accuracy } = {}) {
	const app = makeApp(store);
	const ui = makeUI({ human, policy, accuracy });
	const m = new Match(app, ui, { ...cfg, allBots: !human, persist: human ? cfg.persist : false });
	app.match = m;
	const t0 = performance.now();
	let out;
	try {
		out = await m.run();
	} catch (e) {
		bad(`${cfg.mode}/${cfg.length}/${cfg.region}/seed ${cfg.seed}: ${e.stack || e}`);
		return null;
	}
	const ms = performance.now() - t0;
	const r = app.lastSim;
	stats.matches++;
	bump(stats.endReasons, r.endReason);
	const key = `${cfg.mode}/${cfg.length}`;
	(stats.est[key] ||= []).push(r.estSeconds);
	if (!human && !cfg.levels) {
		// koltuk avantajı denetimi: eşit seviyede botlar arasında kazanan koltuk
		const win = Array.isArray(r.winnerSeat) ? r.winnerSeat[0] : r.winner;
		(stats.wins[cfg.mode] ||= {})[win] = (stats.wins[cfg.mode][win] || 0) + 1;
	}
	if (!human) {
		const top = out.slice ? out : m.standings();
		void top;
		const st = m.standings();
		if (st.length > 1 && st[0].alive && st[1].alive && st[0].score === st[1].score) {
			bump(stats.ties, cfg.mode);
			// eşit birincilik altın soruyla ayrılır (match.js TIE_BREAK); koltuk sırası belirlememeli
			check(m.tieWin != null && (st[0].players ? st[0].team : st[0].i) === m.tieWin, `${cfg.mode}: eşit birincilik altın soruyla ayrılmadı`);
		}
	}
	// tutarlılık
	check(r.questions > 0, 'hiç soru sorulmadı');
	check(m.players.every((p) => Number.isFinite(p.score)), 'skor NaN');
	check(m.players.every((p) => p.jk && JOKER_ORDER.every((id) => p.jk[id].left >= 0 && p.jk[id].left <= JOKERS[id].max + 2)), 'joker hakkı aralık dışı');
	check(app.board.provinces.every((p) => p.owner < m.players.length), 'geçersiz il sahibi');
	check(m.cur === null, 'soru açık kaldı');
	check(ms < 20000, `maç çok yavaş (${ms | 0} ms)`);
	return { m, app, r, out };
}

// ---------------------------------------------------------------- 1) bot maçları

const REGIONS = ['ege', 'marmara', 'akdeniz', 'icanadolu', 'karadeniz', 'dogu', 'guneydogu'];
const LEVELS = ['caylak', 'er', 'usta', 'efsane'];
console.log(`1) Bot maçları (her yapılandırma ${N} tohum)`);
for (const mode of Object.keys(MODES)) {
	for (const length of ['quick', 'long']) {
		for (let k = 0; k < N; k++) {
			const seed = SEED * 1000 + k * 17 + (mode.length + length.length);
			const region = length === 'long' ? 'all' : REGIONS[k % REGIONS.length];
			await play({ mode, length, region, bot: LEVELS[k % 4], seed });
		}
	}
}
// seviye karışımı (koltuk başına farklı bot)
for (let k = 0; k < N; k++) await play({ mode: 'ffa4', length: 'quick', region: REGIONS[k % 7], levels: ['caylak', 'er', 'usta', 'efsane'], seed: 700 + k });

// ---------------------------------------------------------------- 2) insan koltuğu: jokerler her tipte

console.log('2) İnsan koltuğuyla joker sınaması');
const humanRuns = Math.max(12, N * 3);
for (let k = 0; k < humanRuns; k++) {
	const mode = Object.keys(MODES)[k % 4];
	const store = memStore();
	const res = await play(
		{ mode, length: 'quick', region: REGIONS[k % 7], bot: LEVELS[k % 4], seed: 4000 + k, commander: { avatar: 'sultan', banner: 'lale', skin: 2, color: k % 4, name: 'Sınama' }, humanName: 'Sınama' },
		{ human: true, store, policy: 0.85, accuracy: 0.55 + (k % 3) * 0.1 },
	);
	if (res) {
		const me = res.m.players[0];
		// menüde seçilen renk maça taşınmalı
		check(me.color === res.app.playerColors[k % 4], `seçilen renk taşınmadı (${me.css})`);
		check(new Set(res.m.players.map((p) => p.color)).size === res.m.players.length, 'koltuk renkleri çakışıyor');
		// ilerleme kaydedildi mi
		check(res.out.rewards && res.out.rewards.xp > 0 && res.out.rewards.gold > 0, 'maç ödülü yok');
		const saved = store.get('progress');
		check(saved && saved.stats.played === 1 && saved.xp === res.out.rewards.xp, 'ilerleme kaydedilmedi');
	}
}

// ---------------------------------------------------------------- 3) sefer

console.log('3) Sefer: bütün sahneler');
{
	const store = memStore();
	const progress = new Progress(store, {});
	const camp = new Campaign(progress, store);
	check(camp.stageUnlocked('ege-1') && !camp.stageUnlocked('ege-2') && !camp.regionUnlocked('marmara'), 'başlangıç kilitleri');
	let safety = 0;
	let wonAll = true;
	const tries = {};
	// ilk geçişler: sıradaki yıldızsız sahneyi oyna (kaybedersen yeniden dene)
	while (camp.next() && camp.stars(camp.next()) === 0 && safety++ < 120) {
		const id = camp.next();
		if ((tries[id] = (tries[id] || 0) + 1) > 8) {
			bad(`sefer ${id}: 8 denemede geçilemedi`);
			break;
		}
		const cfg = camp.cfgFor(id, { seed: 900 + safety });
		const a = makeApp(store);
		a.progress = progress;
		a.campaign = camp;
		const mm = new Match(a, makeUI({ human: true, policy: 0.7, accuracy: 0.95 }), { ...cfg, humanName: 'Sefer' });
		a.match = mm;
		let out;
		try {
			out = await mm.run();
		} catch (e) {
			bad(`sefer ${id}: ${e.stack || e}`);
			break;
		}
		const rw = out.rewards;
		check(rw && rw.campaign, `sefer ${id}: sonuç kaydı yok`);
		if (!rw?.campaign) break;
		check(camp.stars(id) === Math.max(camp.stars(id), rw.campaign.stars), `sefer ${id}: yıldız kaydı`);
		if (rw.campaign.stars === 0) wonAll = false;
		if (!QUIET) console.log(`   ${id.padEnd(12)} ${rw.campaign.stars}★  xp+${rw.xp} altın+${rw.gold}  ${out.rewards.won ? 'kazandı' : 'yenildi'}`);
	}
	const done = REGION_ORDER.filter((k) => camp.regionCleared(k));
	console.log(`   bölge komutanı yenilen: ${done.length}/${REGION_ORDER.length}, toplam yıldız ${camp.totalStars()}, son ilerleme seviyesi ${progress.level}, altın ${progress.gold}`);
	// kayıt tekrar yüklenince aynı
	const camp2 = new Campaign(new Progress(store, {}), store);
	check(camp2.totalStars() === camp.totalStars(), 'sefer kaydı yeniden yüklenemedi');
	void wonAll;
}

// ---------------------------------------------------------------- 4) soru düzeni (v1.2): binlerce maç

// Her mod × uzunluk için PLAN maç (eşit 'er' botlar, 0. koltuk "insan" varsayımıyla süre): tip dağılımı (an × tip),
// yeni tip payı, art arda tekrar, maç başına üst sınır, canlı tur yalnız düelloda, Gölge kapalı, Kuşbakışı yapısı
// başkent ilinde değil, maç süresi (hedef hızlı 6–8, uzun 15–20 dk), film payı ve koltuk adaleti.
const PLAN = Number(opt.plan ?? 150);
const plan = {};
console.log(`4) Soru düzeni: ${PLAN * 8} maç (her mod × uzunluk ${PLAN})`);
{
	const POOL = new Map([...MAC.yeniBank()].map((q) => [q.id, q]));
	for (const mode of Object.keys(MODES))
		for (const length of ['quick', 'long']) {
			const key = `${mode}/${length}`;
			const P = (plan[key] = { n: 0, q: 0, yeni: 0, est: [], film: [], moments: {}, perMatch: {}, maxPer: {}, seat: {}, distinct: 0, repeat: 0 });
			for (let k = 0; k < PLAN; k++) {
				const seed = 90000 + k * 31 + mode.length * 7 + length.length;
				const app = makeApp();
				const ui = makeUI({});
				const m = new Match(app, ui, { mode, length, region: length === 'long' ? 'all' : REGIONS[k % 7], bot: 'er', seed, allBots: true, persist: false });
				app.match = m;
				try {
					await m.run();
				} catch (e) {
					bad(`düzen ${key}/${seed}: ${e.stack || e}`);
					continue;
				}
				const r = app.lastSim;
				P.n++;
				P.est.push(r.estSeconds);
				P.film.push(r.filmSeconds);
				const win = Array.isArray(r.winnerSeat) ? r.winnerSeat[0] : r.winner;
				P.seat[win] = (P.seat[win] || 0) + 1;
				const log = r.qlog;
				const seenT = new Set();
				log.forEach((e, j) => {
					P.q++;
					const yeni = MAC.isYeni(e.type);
					if (yeni) P.yeni++;
					const M = (P.moments[e.moment] ||= { n: 0, yeni: 0, t: {} });
					M.n++;
					if (yeni) M.yeni++;
					M.t[e.type] = (M.t[e.type] || 0) + 1;
					if (yeni) seenT.add(e.type);
					if (j && log[j - 1].type === e.type) P.repeat++;
					if (MAC.CANLI.has(e.type)) check(e.moment === 'attack' || e.moment === 'siege', `${key}: canlı tur ${e.type} düello dışında (${e.moment})`);
					check(e.type !== 'golge', `${key}: Gölge bayrağı kapalıyken sorulmadı olmalı`);
				});
				P.distinct += seenT.size;
				for (const [t, c] of Object.entries(r.types)) {
					P.perMatch[t] = (P.perMatch[t] || 0) + c;
					P.maxPer[t] = Math.max(P.maxPer[t] || 0, c);
					check(c <= MAC.sinir(t, length), `${key}: ${t} maçta ${c} kez (sınır ${MAC.sinir(t, length)})`);
				}
				// Kuşbakışı: sorulan yapının ilinde başkent kalesi olmamalı
				for (const id of m.used) {
					const q = POOL.get(id);
					if (q?.type === 'kusbakisi') {
						const i = app.board.byId.get(q.il)?.index;
						check(!m.players.some((p) => p.capital === i), `${key}: Kuşbakışı ${q.id} başkent ilinde`);
					}
				}
			}
			check(P.repeat === 0, `${key}: ${P.repeat} kez aynı tip art arda`);
		}
	// Gölge bayrakla açılır
	{
		const app = makeApp();
		const m = new Match(app, makeUI({}), { mode: '1v1', length: 'long', region: 'all', bot: 'er', seed: 5, allBots: true, persist: false, yeni: { golge: true } });
		app.match = m;
		await m.run();
		check(m.pool.some((q) => q.type === 'golge') && m.typeOn('golge'), 'Gölge bayrakla açılmadı');
	}
}

// ---------------------------------------------------------------- rapor

const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const mins = (s) => (s / 60).toFixed(1);
console.log('\n=== RAPOR ===');
console.log(`maç: ${stats.matches}, soru: ${stats.questions}, bitiş nedenleri: ${JSON.stringify(stats.endReasons)}`);
console.log('tahmini süre (dk): ort [en az–en çok]  (hedef: hızlı 6–8, uzun 15–20)');
for (const [k, a] of Object.entries(stats.est)) console.log(`  ${k.padEnd(12)} ${mins(avg(a))} [${mins(Math.min(...a))}–${mins(Math.max(...a))}]`);
console.log('joker kullanımı  bot: ' + JSON.stringify(stats.jokers.bot) + '  insan: ' + JSON.stringify(stats.jokers.human));
console.log(`ikinci şans yeniden sorusu: ${stats.flow.second}, sabotaj: ${stats.flow.sabotage}`);
console.log('soru tipi dağılımı: ' + JSON.stringify(stats.byType));
console.log('joker × tip (ok: uygulanır, na: gizlenir)');
console.log('  ' + ''.padEnd(8) + JOKER_ORDER.filter((j) => JOKERS[j].scope === 'question').map((j) => JOKERS[j].short.padEnd(8)).join(''));
for (const [t, row] of Object.entries(stats.matrix)) console.log('  ' + t.padEnd(8) + JOKER_ORDER.filter((j) => JOKERS[j].scope === 'question').map((j) => (row[j] || '-').padEnd(8)).join(''));
console.log('kazanan koltuk (yalnız eşit seviye bot maçları): ' + JSON.stringify(stats.wins));
console.log('puan eşitliği (ilk iki sıra aynı puan; altın soruyla ayrıldı): ' + JSON.stringify(stats.ties));
const topRefused = Object.entries(stats.refused).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log('reddedilen joker istekleri: ' + JSON.stringify(Object.fromEntries(topRefused)));

// denge uyarıları
for (const [k, a] of Object.entries(stats.est)) {
	const [, length] = k.split('/');
	const lo = length === 'long' ? 15 : 6;
	const hi = length === 'long' ? 20 : 8;
	const m = avg(a) / 60;
	if (m < lo * 0.85 || m > hi * 1.15) console.log(`  UYARI: ${k} tahmini ${m.toFixed(1)} dk, hedef ${lo}–${hi}`);
}
const bj = Object.values(stats.jokers.bot).reduce((a, b) => a + b, 0);
check(bj > 0, 'botlar hiç joker kullanmadı');
check(Object.keys(stats.jokers.bot).length >= 4, 'botlar yeterince çeşitli joker kullanmadı');
for (const id of ['yari', 'sure', 'ikinci', 'sabotaj', 'kahin']) check((stats.jokers.human[id] || 0) > 0, `insan ${id} jokerini hiç kullanamadı`);
for (const t of ['choice', 'tf', 'num', 'pin', 'hang', 'order', 'match', 'hilo', 'odd', 'emoji', 'proverb', 'riddle']) check(stats.matrix[t], `${t} tipi hiç sorulmadı`);

// soru düzeni raporu (4. bölüm)
{
	const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
	const MOM = ['expand', 'attack', 'siege', 'tie', 'golden'];
	console.log('\n=== SORU DÜZENİ (4. bölüm) ===');
	console.log('mod/uzunluk   maç  soru/maç  yeni%  ' + MOM.map((x) => (x + '%').padEnd(9)).join('') + 'süre dk [en az–en çok]  film sn  farklı yeni tip/maç  koltuk kazanma %');
	for (const [key, P] of Object.entries(plan)) {
		const mm = (a) => (a.reduce((x, y) => x + y, 0) / (a.length || 1) / 60).toFixed(1);
		const seats = Object.keys(P.seat)
			.sort()
			.map((s) => pct(P.seat[s], P.n))
			.join('/');
		console.log(
			`${key.padEnd(13)} ${String(P.n).padStart(4)}  ${(P.q / P.n).toFixed(1).padStart(8)}  ${String(pct(P.yeni, P.q)).padStart(5)}  ` +
				MOM.map((x) => `${pct(P.moments[x]?.yeni || 0, P.moments[x]?.n || 0)}/${((P.moments[x]?.n || 0) / P.n).toFixed(1)}`.padEnd(9)).join('') +
				`${mm(P.est)} [${(Math.min(...P.est) / 60).toFixed(1)}–${(Math.max(...P.est) / 60).toFixed(1)}]`.padEnd(24) +
				`${(P.film.reduce((a, b) => a + b, 0) / P.n).toFixed(0).padStart(6)}  ${(P.distinct / P.n).toFixed(1).padStart(10)}           ${seats}`,
		);
		const lo = key.endsWith('long') ? 15 : 6;
		const hi = key.endsWith('long') ? 20 : 8;
		const avgMin = P.est.reduce((a, b) => a + b, 0) / P.est.length / 60;
		check(avgMin >= lo && avgMin <= hi, `${key}: ortalama süre ${avgMin.toFixed(1)} dk hedef ${lo}–${hi} dışında`);
		// koltuk adaleti: eşit botlarda hiçbir koltuk/taraf payı beklenenden çok sapmasın (örneklem: PLAN maç)
		const sides = key.startsWith('team') || key.startsWith('1v1') ? 2 : Number(key[3]);
		const tol = 2.6 * Math.sqrt((1 / sides) * (1 - 1 / sides) / Math.max(1, P.n)) + 0.02;
		for (const s of Object.keys(P.seat)) check(Math.abs(P.seat[s] / P.n - 1 / sides) <= tol, `${key}: koltuk ${s} kazanma payı ${pct(P.seat[s], P.n)}% (beklenen ${pct(1, sides)}%)`);
	}
	// an × tip dağılımı (bütün modlar birlikte ve mod başına yeni tiplerin maç başına sayısı)
	const all = {};
	for (const P of Object.values(plan))
		for (const [mo, M] of Object.entries(P.moments)) {
			const A = (all[mo] ||= { n: 0, t: {} });
			A.n += M.n;
			for (const [t, c] of Object.entries(M.t)) A.t[t] = (A.t[t] || 0) + c;
		}
	console.log('\nan × tip (o anın sorularındaki pay %, bütün modlar):');
	for (const mo of MOM) {
		const A = all[mo];
		if (!A) continue;
		const row = Object.entries(A.t)
			.sort((a, b) => b[1] - a[1])
			.map(([t, c]) => `${MAC.isYeni(t) ? '*' : ''}${t} ${((100 * c) / A.n).toFixed(1)}`)
			.join(' · ');
		console.log(`  ${mo.padEnd(7)} (${A.n}) ${row}`);
	}
	console.log('\nyeni tip başına maçtaki ortalama sayı (en çok) · mod/uzunluk:');
	const keys = Object.keys(plan);
	console.log('  ' + 'tip'.padEnd(10) + keys.map((k) => k.padEnd(12)).join(''));
	for (const t of MAC.YENI) console.log('  ' + t.padEnd(10) + keys.map((k) => `${((plan[k].perMatch[t] || 0) / plan[k].n).toFixed(2)} (${plan[k].maxPer[t] || 0})`.padEnd(12)).join(''));
	const order = (mode, length) => {
		// örnek soru akışı: bir maçın soru sırası (an:tip)
		const app = makeApp();
		const m = new Match(app, makeUI({}), { mode, length, region: length === 'long' ? 'all' : 'ege', bot: 'er', seed: 4242, allBots: true, persist: false });
		app.match = m;
		return m.run().then(() => app.lastSim.qlog.map((e) => `${{ expand: 'Y', attack: 'D', siege: 'K', tie: 'E', golden: 'A' }[e.moment]}:${e.type}`).join(' '));
	};
	if (!QUIET || 'akis' in opt) for (const mode of Object.keys(MODES)) console.log(`\nörnek akış ${mode}/quick: ${await order(mode, 'quick')}`);
}

console.log(fails ? `\n${fails} HATA` : '\nhepsi temiz');
process.exit(fails ? 1 : 0);
