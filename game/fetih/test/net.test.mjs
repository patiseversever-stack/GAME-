// Çevrimiçi güvenlik: uzak koltuğa giden soru görünümünde (publicView) cevap kalmamalı.
//   node test/net.test.mjs
//
// Bankadaki her soru (ve verisi olmayan tiplerin örnekleri) hazırlanır, görünümü alınır ve tipine göre
// gizlilerin silindiği denetlenir: doğru şık, sıra, değerler, çiftler, konum, kelime. Ayrıca sunucudaki
// tam görünüme dokunulmadığı ve adam asmaca harf denemesinin yalnız soran koltuğa döndüğü sınanır.

import { TYPES } from '../src/quiz/types.js';
import { BANK } from '../src/data/bank.js';
import { publicView } from '../src/game/net.js';
import { Match } from '../src/game/match.js';

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

console.log(`${checks} denetim, ${fails} hata`);
if (fails) process.exit(1);
