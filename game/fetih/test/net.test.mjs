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
			_recv(m) {
				const ans = m && m.t === 'req' && m.k === 'answer';
				if (ans) this.t.send({ v: 1, t: 'act', k: 'joker', d: { id: 'sure' } });
				super._recv(m);
				if (ans) this.t.send({ v: 1, t: 'act', k: 'joker', d: { id: 'sabotaj' } });
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

console.log(`${checks} denetim, ${fails} hata`);
if (fails) process.exit(1);
