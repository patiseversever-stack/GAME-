// Çevrimiçi güvenlik: uzak koltuğa giden soru görünümünde (publicView) cevap kalmamalı.
//   node test/net.test.mjs
//
// Bankadaki her soru (ve verisi olmayan tiplerin örnekleri) hazırlanır, görünümü alınır ve tipine göre
// gizlilerin silindiği denetlenir: doğru şık, sıra, değerler, çiftler, konum, kelime. Ayrıca sunucudaki
// tam görünüme dokunulmadığı ve adam asmaca harf denemesinin yalnız soran koltuğa döndüğü sınanır.

await import('./kanca.mjs');
const { TYPES } = await import('../src/quiz/types.js');
const { BANK } = await import('../src/data/bank.js');
const { publicView } = await import('../src/game/net.js');
const { Match } = await import('../src/game/match.js');

let fails = 0;
let checks = 0;
const ok = (c, msg) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 30) console.log('HATA: ' + msg);
	}
};
let seed = 7;
const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const deepKeys = (o, out = new Set()) => {
	if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) out.add(k), deepKeys(v, out);
	return out;
};

const SAMPLES = [
	{ id: 's1', cat: 'bilim', diff: 1, type: 'anagram', q: 'Sıcaklık ölçer', w: 'TERMOMETRE' },
	{ id: 's2', cat: 'tarih', diff: 2, type: 'cross', q: 'Çengel', words: [{ w: 'FATİH', clue: 'İstanbul fatihi' }, { w: 'SELİM', clue: 'Yavuz' }, { w: 'KANUNİ', clue: 'Süleyman' }] },
	{ id: 's3', cat: 'cografya', diff: 1, type: 'img', q: 'Bu nedir?', img: 'kedi', mode: 'blur', a: ['Kedi', 'Köpek', 'Tavşan', 'Kuş'] },
	{ id: 's4', cat: 'eglence', diff: 1, type: 'blitz', q: 'Yıldırım', items: Array.from({ length: 8 }, (_, i) => ({ t: 'İfade ' + i, ans: i % 2 === 0 })) },
];

for (const q of [...BANK, ...SAMPLES]) {
	const T = TYPES[q.type];
	const v = T.prepare(q, R);
	const before = JSON.stringify(v);
	const pv = publicView(T, v);
	const s = JSON.stringify(pv);
	const keys = deepKeys(pv);
	ok(JSON.stringify(v) === before, `${q.id}: publicView sunucudaki görünümü değiştirdi`);
	ok(pv.sec === v.sec, `${q.id}: süre bütçesi görünümde yok`);
	ok(!has(pv.q, 'ans'), `${q.id}: q.ans görünümde`);
	if (Array.isArray(v.opts)) {
		ok(!has(pv, 'right'), `${q.id}: doğru şık sırası görünümde`);
		ok(!has(pv.q, 'a'), `${q.id}: şıkların asıl sırası (q.a) görünümde`);
		ok(Array.isArray(pv.opts) && pv.opts.length === v.opts.length, `${q.id}: şıklar eksik`);
	}
	switch (q.type) {
		case 'order':
			ok(!has(pv, 'correct'), `${q.id}: doğru sıra görünümde`);
			ok(pv.q.items.every((it) => Object.keys(it).join() === 't'), `${q.id}: sıralama değerleri görünümde`);
			ok(pv.q.items.length === q.items.length && Array.isArray(pv.start), `${q.id}: sıralama çizilemez`);
			break;
		case 'match':
			ok(!has(pv.q, 'pairs') && !has(pv, 'ord'), `${q.id}: eşleşmeler görünümde`);
			ok(pv.left?.length === q.pairs.length && pv.right?.length === q.pairs.length, `${q.id}: sütunlar eksik`);
			break;
		case 'pin':
			ok(!keys.has('lat') && !keys.has('lon') && !has(pv, 'target'), `${q.id}: konum görünümde`);
			break;
		case 'hang':
		case 'anagram':
			ok(!has(pv, 'word') && !has(pv.q, 'w'), `${q.id}: kelime görünümde`);
			ok(typeof pv.mask === 'string' && [...pv.mask].length === [...v.word].length, `${q.id}: kelime kalıbı yanlış`);
			ok(!s.includes(JSON.stringify(v.word)), `${q.id}: kelime metin olarak görünümde`);
			break;
		case 'cross':
			ok(!s.includes('"ch"') && !keys.has('w'), `${q.id}: bulmaca harfleri görünümde`);
			break;
		case 'hilo':
			ok(!keys.has('v'), `${q.id}: karşılaştırma değerleri görünümde`);
			break;
		case 'odd':
			ok(!has(pv.q, 'odd') && !has(pv.q, 'why') && !has(pv.q, 'opts'), `${q.id}: farklı olan görünümde`);
			break;
		case 'blitz':
			ok(!keys.has('ans'), `${q.id}: yıldırım cevapları görünümde`);
			break;
	}
}

// adam asmaca harf denemesi: yalnız soruyu cevaplayan uzak koltuğa, harfin yerleri
{
	const sent = [];
	const fake = { cur: null, players: [] };
	const p = { i: 1, ctl: { event: (k, d) => sent.push([k, d]) } };
	const other = { i: 2, ctl: { event: (k, d) => sent.push(['diğer:' + k, d]) } };
	fake.cur = { closed: false, who: [p], v: { word: 'PERİ BACASI' } };
	Match.prototype.letterHint.call(fake, p, 'a');
	Match.prototype.letterHint.call(fake, other, 'a');
	ok(sent.length === 1 && sent[0][0] === 'harf', 'harf olayı yalnız soran koltuğa gitmeli');
	ok(JSON.stringify(sent[0]?.[1]) === JSON.stringify({ ch: 'A', at: [6, 8] }), 'harf yerleri yanlış: ' + JSON.stringify(sent[0]?.[1]));
	fake.cur.closed = true;
	Match.prototype.letterHint.call(fake, p, 'P');
	ok(sent.length === 1, 'soru kapandıktan sonra harf cevabı gitmemeli');
}

// uzak koltuklu tam maç (v0.8): istemci yalnız olaylardan maçın durumunu kurabilmeli (il sahibi ve değeri, puan,
// kale kuleleri) ve başkasının joker etkisini (elenen şıklar, aralık, harfler, bölge, oylar) hiç görmemeli.
// Eskiden kule yıkılışı, savunma değeri ve puan hiç gönderilmiyor, rakibin yarı yarıyası herkese gidiyordu.
{
	const { makeApp, makeUI } = await import('./dunya.mjs');
	const { LocalTransport, BotClient } = await import('../src/game/net.js');
	const SECRET_KEYS = ['hide', 'min', 'max', 'letters', 'provinces', 'pct', 'value', 'spread', 'data'];
	let events = 0;
	for (const [mode, n, seed] of [['1v1', 2, 50], ['1v1', 2, 53], ['ffa3', 3, 51], ['ffa4', 4, 52], ['team', 4, 54]]) {
		const app = makeApp();
		const seats = Array.from({ length: n }, (_, i) => (i === 1 ? 'remote' : 'bot'));
		const [srv, cli] = LocalTransport.pair();
		let s = seed;
		const client = new BotClient(cli, { skill: 0.7, R: () => ((s = (s * 16807) % 2147483647) / 2147483647) });
		const view = { owners: new Map(), values: new Map(), score: null, asks: 0, reveals: 0, attacks: 0, results: 0, leaks: [] };
		const recv = client._recv.bind(client);
		cli.onmessage((m) => {
			if (m.t === 'ev') {
				events++;
				const d = m.d;
				if (m.k === 'owner') view.owners.set(d.i, d.p), view.values.set(d.i, d.value);
				else if (m.k === 'score') view.score = d;
				else if (m.k === 'ask') view.asks++;
				else if (m.k === 'reveal') view.reveals++;
				else if (m.k === 'attack') view.attacks++;
				else if (m.k === 'result') view.results++;
				else if (m.k === 'joker' && d.player !== 1) for (const k of SECRET_KEYS) if (d.effect && k in d.effect) view.leaks.push(`${d.id}.${k}`);
			}
			recv(m);
		});
		const m = new Match(app, makeUI(), { mode, length: 'quick', bot: 'usta', region: 'ege', seed, seats, transports: { 1: srv }, allBots: true, persist: false });
		let jokers = 0;
		m.on('joker', () => jokers++);
		await m.run();
		await new Promise((r) => setTimeout(r, 5));
		const tag = `${mode}/${seed}`;
		ok(m.map.every((i) => view.owners.get(i) === m.owner(i)), `${tag}: istemcinin il sahipleri sunucuyla aynı değil`);
		ok(m.map.every((i) => (view.values.get(i) || 0) === (m.value.get(i) || 0)), `${tag}: istemcinin il değerleri sunucuyla aynı değil (savunma değeri gelmiyor)`);
		ok(view.score && view.score.scores.join() === m.players.map((p) => p.score).join(), `${tag}: istemcinin puanları sunucuyla aynı değil`);
		ok(view.score && view.score.hp.join() === m.players.map((p) => (p.alive ? app.castles[p.i].hp : 0)).join(), `${tag}: istemci kale kulelerini bilmiyor`);
		ok(view.asks === view.reveals, `${tag}: izleyen koltuk ${view.reveals} sorunun cevabını aldı ama ${view.asks} soruyu gördü`);
		ok(view.attacks === m.duels && view.results === m.duels, `${tag}: saldırı/sonuç olayı eksik (${view.attacks}/${view.results}, düello ${m.duels})`);
		ok(!view.leaks.length, `${tag}: başkasının joker etkisi sızdı: ${view.leaks.join(', ')}`);
		ok(jokers > 0, `${tag}: maçta joker kullanılmadı (sızıntı sınanamadı)`);
	}
	ok(events > 500, "uzak koltuk olay almadı");

	// cevabını gönderen uzak koltuk o soruda joker kullanamaz (yerelde arayüz kilitler): istemci cevaptan önce
	// "Ekstra Süre" (kabul edilmeli), cevapla aynı anda "Sabotaj" (reddedilmeli) gönderir
	{
		class Greedy extends BotClient {
			constructor(t, o) {
				super(t, o);
				// cevabı gönderdiği paketin hemen ardından sabotaj (yeni tiplerde cevap eylemlerden sonra gelir)
				const send = t.send.bind(t);
				t.send = (msg) => {
					send(msg);
					if (msg.t === 'res' && msg.k === 'answer') send({ v: 1, t: 'act', k: 'joker', d: { id: 'sabotaj' } });
				};
			}
			_recv(m) {
				if (m && m.t === 'req' && m.k === 'answer') this.t.send({ v: 1, t: 'act', k: 'joker', d: { id: 'sure' } });
				super._recv(m);
			}
		}
		const app = makeApp();
		const [srv, cli] = LocalTransport.pair();
		let s = 5;
		new Greedy(cli, { skill: 0.6, R: () => ((s = (s * 16807) % 2147483647) / 2147483647) });
		const m = new Match(app, makeUI(), { mode: '1v1', length: 'quick', region: 'ege', seed: 9, seats: ['bot', 'remote'], transports: { 1: srv }, allBots: true, persist: false });
		m.players[1].jk.sure = { left: 99, free: 99 };
		m.players[1].jk.sabotaj = { left: 99, free: 99 };
		const used = { sure: 0, sabotaj: 0 };
		m.on('joker', (d) => d.player === 1 && d.id in used && used[d.id]++);
		await m.run();
		console.log(`cevaptan önce ekstra süre: ${used.sure} kabul; cevapla birlikte sabotaj: ${used.sabotaj} kabul`);
		ok(used.sure > 5, 'uzak koltuk cevaptan önce joker kullanamadı');
		ok(used.sabotaj === 0, `uzak koltuk cevabını verdikten sonra ${used.sabotaj} kez sabotaj yaptı`);
	}
	console.log(`uzak koltuklu 5 maç: istemciye ${events} olay`);
}

// ---------------------------------------------------------------- v1.2: yeni tiplerin sunucu adımları
// Uzak koltuklu tam maçlar (bütün modlar, sanal saat: 20 sn'lik Halat turu ve 11 sn'lik Tufan filmi beklenmeden ama
// gerçek sırasıyla). Uzak koltuğun cevapladığı her soru sırayla yeni tiplerden gelir (Zorla), 4 kişide iki uzak koltuk
// birbiriyle de düello yapar. Denetimler: her yeni tipte görünüm sızıntısı (gizliler yok, Kuşbakışı/Gölge'de anlamsız
// kimlik), istemcinin cevaptaki tam görünümle yeniden yargılaması sunucuyla aynı, süre sunucu saatiyle, sunucu adımı
// olayları (harf, il, yer, ipucu saatleri, halat 'ip', fitil 'top'), sunucunun cevap filmini beklemesi, istatistik
// (Şive ısı haritası, Az Bilinen oranları) ve olaylardan kurulan durumun sunucuyla aynılığı.
{
	const { kur } = await import('./sanal-saat.mjs');
	const { makeApp, makeUI } = await import('./dunya.mjs');
	const { LocalTransport, BotClient } = await import('../src/game/net.js');
	const MAC = await import('../src/quiz/mac.js');
	const { Istatistik } = await import('../src/game/sunucu.js');
	const { GAP: KGAP } = await import('../src/quiz/d_kimim.js');
	const S = kur();
	const stats = new Istatistik();
	const typed = {}; // tip → uzak koltuğun cevapladığı soru sayısı
	const leak = (type, pv, full, salt) => {
		const has2 = (o, ...ks) => ks.some((k) => o && Object.prototype.hasOwnProperty.call(o, k));
		const q = pv.q || {};
		switch (type) {
			case 'kusbakisi':
				return has2(pv, 'right') || has2(q, 'site', 'il', 'a') || q.sid !== MAC.sidOf(full.q.site, salt) || MAC.siteOfSid(q.sid, salt, [full.q.site, 'galata', 'nemrut']) !== full.q.site;
			case 'golge':
				return has2(pv, 'right') || has2(q, 'model', 'a') || !q.sid;
			case 'ilavi':
				return has2(pv, 'hedef') || has2(q, 'il', 'hints') || pv.hints.slice(1).some((h) => h) || pv.sil === full.sil;
			case 'kimim':
				return has2(pv, 'hedef') || has2(q, 'il', 'clues') || pv.clues.slice(1).some((h) => h);
			case 'sive':
				return has2(pv, 'region', 'ils') || has2(q, 'region', 'ils', 'mean', 'note');
			case 'halat':
				return has2(pv, 'key') || has2(q, 'items');
			case 'mancinik':
				return has2(pv, 'hedef') || has2(q, 'ans', 'src');
			case 'yanlis':
				return has2(pv, 'bad', 'right', 'opts') || has2(q, 't', 'ok', 'alt', 'n');
			case 'ikidogru':
				return has2(pv, 'right', 'notes') || has2(q, 'f', 'lie');
			case 'harfal':
				return has2(pv, 'word') || has2(q, 'w') || JSON.stringify(pv).includes(JSON.stringify(full.word));
			case 'azbilinen':
				return has2(pv, 'pct', 'alias') || has2(q, 'ans', 'wrong');
			case 'tufan':
				return has2(pv, 'right', 'alt') || has2(q, 'ils');
			case 'kayip':
				return has2(pv, 'right', 'hedef', 'nb', 'hints') || has2(q, 'a', 'il', 'hint') || !Array.isArray(pv.kuyu);
			case 'fitil':
				return has2(pv, 'fuse') || pv.items.some((it) => has2(it, 'right'));
		}
		return false;
	};
	// uzak koltuğun cevapladığı soruların tipi sırayla yeni tiplerden (yayılmada canlı tur yok)
	class Zorla extends Match {
		pickTyped(cat, moment, who) {
			if (!who?.some((p) => p.ctl.remote) || moment === 'tie' || moment === 'golden') return super.pickTyped(cat, moment, who);
			// yayılma ve düello ayrı sırayla: düelloda canlı turlar (Halat, Fitil) başta
			const ex = moment === 'expand';
			const list = ex ? MAC.YENI.filter((t) => !MAC.CANLI.has(t)) : ['halat', 'fitil', ...MAC.YENI.filter((t) => !MAC.CANLI.has(t))];
			const key = ex ? 'zy' : 'zd';
			Zorla[key] = (Zorla[key] ?? -1) + 1; // sıra maçlar boyunca sürer (her tip en az bir kez)
			const t = list[Zorla[key] % list.length];
			const q = this.pick({ types: [t], who });
			this.qlog.push({ moment, type: q.type });
			this.recent.push(q.type);
			return q;
		}
	}
	let total = 0;
	let durs = [];
	for (const [mode, n, seed, remotes] of [['1v1', 2, 61, [1]], ['ffa3', 3, 62, [1]], ['ffa4', 4, 63, [1, 2]], ['team', 4, 64, [1, 2]], ['1v1', 2, 65, [0]], ['ffa3', 3, 66, [0, 2]]]) {
		const app = makeApp();
		const seats = Array.from({ length: n }, (_, i) => (remotes.includes(i) ? 'remote' : 'bot'));
		const transports = {};
		const views = {};
		for (const i of remotes) {
			const [srv, cli] = LocalTransport.pair();
			transports[i] = srv;
			let s = seed * 7 + i;
			const client = new BotClient(cli, { skill: 0.6, R: () => ((s = (s * 16807) % 2147483647) / 2147483647) });
			const view = (views[i] = { owners: new Map(), values: new Map(), score: null, ev: [], salt: null });
			const recv = client._recv.bind(client);
			cli.onmessage((m) => {
				if (m.t === 'hello') view.salt = m.d.cfg.salt;
				if (m.t === 'ev') {
					view.ev.push({ k: m.k, d: m.d, at: S.now() });
					if (m.k === 'owner') view.owners.set(m.d.i, m.d.p), view.values.set(m.d.i, m.d.value);
					else if (m.k === 'score') view.score = m.d;
				}
				recv(m);
			});
		}
		const m = new Zorla(app, makeUI(), { mode, length: 'quick', bot: 'er', region: 'ege', seed, seats, transports, allBots: true, persist: false, serverPace: 1, istatistik: stats, yeni: { golge: true } });
		const t0 = S.now();
		await S.surdur(m.run());
		durs.push(`${mode} ${((S.now() - t0) / 60000).toFixed(1)} dk`);
		const tag = `yeni/${mode}/${seed}`;
		for (const i of remotes) {
			const view = views[i];
			ok(m.map.every((j) => view.owners.get(j) === m.owner(j)), `${tag}: koltuk ${i} il sahipleri sunucuyla aynı değil`);
			ok(m.map.every((j) => (view.values.get(j) || 0) === (m.value.get(j) || 0)), `${tag}: koltuk ${i} il değerleri sunucuyla aynı değil`);
			ok(view.score && view.score.scores.join() === m.players.map((p) => p.score).join(), `${tag}: koltuk ${i} puanları sunucuyla aynı değil`);
			// soru soru: ask → (adım olayları) → reveal
			let ask = null;
			let inQ = [];
			view.ev.forEach((e, k) => {
				if (e.k === 'ask') {
					ask = e;
					inQ = [];
					return;
				}
				if (e.k !== 'reveal') {
					if (ask) inQ.push(e);
					return;
				}
				if (!ask) return;
				const type = ask.d.q.type;
				const T = TYPES[type];
				const full = e.d.answer;
				const mine = e.d.results.find((r) => r.i === i);
				// cevaptaki tam görünümle yeniden yargı: sunucunun sonucu
				for (const r of e.d.results) {
					const j = T.judge(full, r.value);
					ok(j.correct === r.correct && (Number.isFinite(j.err) ? j.err : -1) === r.err, `${tag}: ${type} yeniden yargı farklı (koltuk ${r.i})`);
					ok(r.time >= 0 && r.time <= ask.d.time + 16, `${tag}: ${type} süre ${r.time} aralık dışında`);
				}
				// sunucu filmi bekler: bir sonraki olay en erken film kadar sonra
				const next = view.ev[k + 1];
				if (next) ok(next.at - e.at >= e.d.film - 1, `${tag}: ${type} sonrası olay ${next.at - e.at} ms sonra geldi, film ${e.d.film} ms`);
				if (MAC.isYeni(type) && ask.d.who.includes(i)) {
					typed[type] = (typed[type] || 0) + 1;
					ok(!leak(type, ask.d.v, full, view.salt), `${tag}: ${type} görünümünde gizli bilgi`);
					const evs = (kk) => inQ.filter((x) => x.k === kk);
					if (type === 'harfal') ok(evs('harf').filter((x) => x.d.i >= 0).length === mine.value.al.length, `${tag}: Harf Al sunucu kaydı (${mine.value.al.length}) ile olaylar uyuşmuyor`);
					if (type === 'ilavi') ok(evs('il').filter((x) => !x.d.rejected).length === mine.value.taps.length, `${tag}: İl Avı dokunuşları sunucu kaydıyla uyuşmuyor`);
					if (type === 'kimim') {
						const ip = evs('ipucu');
						const askAt = ask.at;
						ok(ip.every((x, z) => x.d.k === z + 1 && Math.abs(x.at - askAt - x.d.k * KGAP * 1000) < 50), `${tag}: Kimim ipuçları sunucu saatinde değil`);
					}
					if (type === 'kayip') {
						const ip = evs('ipucu');
						ok(ip.length >= 1 && ip.every((x) => Math.abs(x.at - ask.at - full.hintAt[x.d.k] * 1000) < 50), `${tag}: Kayıp İl ipuçları saatinde değil`);
					}
					if (type === 'yanlis' && mine.value) ok(evs('yer').length === 1 && evs('yer')[0].d.ok === (mine.value.w === full.bad), `${tag}: Yanlışı Bul yer cevabı`);
					if (type === 'halat') {
						ok(evs('ip').length > 0, `${tag}: Halat 'ip' yayını yok`);
						const log = mine.value?.log || [];
						ok(log.every((a, z) => !z || a[2] >= log[z - 1][2]) && log.every((a) => a[2] <= full.sec + 0.5), `${tag}: Halat kaydı sunucu saatinde değil`);
					}
					if (type === 'fitil') {
						ok(evs('top').some((x) => x.d.ev.some((y) => y.type === 'boom')), `${tag}: Fitil patlaması yayınlanmadı`);
						ok(e.d.results.filter((r) => r.correct).length === 1, `${tag}: Fitil: tam bir taraf kurtulmalı`);
					}
					if (type === 'sive') ok(Array.isArray(full.heat) && full.heat.length > 0, `${tag}: Şive ısı haritası sunucudan gelmedi`);
				}
				ask = null;
			});
		}
		total++;
	}
	S.kaldir();
	const miss = MAC.YENI.filter((t) => !typed[t]);
	ok(!miss.length, `uzak koltukla hiç oynanmayan yeni tip: ${miss.join(', ')}`);
	ok(Object.keys(stats.data.sive || {}).length > 0 && Object.keys(stats.data.azbilinen || {}).length > 0, 'sunucu istatistiği birikmedi');
	console.log(`yeni tipler uzak koltukla (${total} maç, sanal saat; süre ${durs.join(', ')}): ${Object.entries(typed).map(([t, c]) => `${t} ${c}`).join(' · ')}`);
}

console.log(`${checks} denetim, ${fails} hata`);
if (fails) process.exit(1);
