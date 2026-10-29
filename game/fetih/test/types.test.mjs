// Soru tipleri sınaması (düz node, bağımlılık yok):  node test/types.test.mjs
// Bankadaki her soru prepare() geçmeli; judge() doğruyu kabul etmeli, yanlışı reddetmeli;
// botlar geçerli ve makul cevap üretmeli; pickType() verisiz tipleri hiç çekmemeli.
import { BANK } from '../src/data/bank.js';
import { TYPES, TYPE_WEIGHTS, pickType } from '../src/quiz/types.js';
import { rng } from '../src/core/math.js';

let fails = 0;
let checks = 0;
const bad = (msg) => {
	fails++;
	if (fails <= 60) console.log('  HATA: ' + msg);
};
const ok = (cond, msg) => {
	checks++;
	if (!cond) bad(msg);
};

// ---------------------------------------------------------------- tip başına doğru / yanlış cevap üretici
const distinct = (a) => new Set(a).size === a.length;
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const ANS4 = (q) => Array.isArray(q.a) && q.a.length === 4 && q.a.every(nonEmpty) && distinct(q.a);

/** Soru verisinin biçimi (içerik sözleşmesi). */
const SHAPE = {
	choice: (q) => ANS4(q),
	tf: (q) => typeof q.ans === 'boolean',
	num: (q) => [q.ans, q.min, q.max].every(Number.isFinite) && q.min <= q.ans && q.ans <= q.max && q.min < q.max,
	pin: (q) => Number.isFinite(q.lat) && Number.isFinite(q.lon) && q.lat > 35 && q.lat < 43 && q.lon > 25 && q.lon < 45,
	hang: (q) => nonEmpty(q.w) && /^[A-ZÇĞİÖŞÜ ]+$/.test(q.w.toLocaleUpperCase('tr-TR')),
	order: (q) => Array.isArray(q.items) && q.items.length === 4 && q.items.every((x) => nonEmpty(x.t) && Number.isFinite(x.v)) && distinct(q.items.map((x) => x.v)) && distinct(q.items.map((x) => x.t)),
	match: (q) => Array.isArray(q.pairs) && q.pairs.length === 4 && q.pairs.every((p) => p.length === 2 && nonEmpty(p[0]) && nonEmpty(p[1])) && distinct(q.pairs.map((p) => p[0])) && distinct(q.pairs.map((p) => p[1])),
	hilo: (q) => nonEmpty(q.left?.t) && nonEmpty(q.right?.t) && Number.isFinite(q.left.v) && Number.isFinite(q.right.v) && q.left.v !== q.right.v && nonEmpty(q.prop),
	odd: (q) => Array.isArray(q.opts) && q.opts.length === 4 && q.opts.every(nonEmpty) && distinct(q.opts) && Number.isInteger(q.odd) && q.odd >= 0 && q.odd < 4,
	emoji: (q) => nonEmpty(q.e) && ANS4(q),
	proverb: (q) => typeof q.text === 'string' && q.text.split('___').length === 2 && ANS4(q),
	riddle: (q) => ANS4(q),
};

const CASES = {
	choice: (v) => [v.right, (v.right + 1) % 4],
	tf: (v) => [v.right, 1 - v.right],
	num: (v) => [v.q.ans, v.q.ans + (v.q.max - v.q.min) / 3],
	pin: (v) => [{ x: v.target.x, z: v.target.z }, { x: v.target.x + 6, z: v.target.z - 5 }],
	hang: () => [{ ok: true, wrong: 0 }, { ok: false, wrong: 6 }],
	order: (v) => [v.correct.slice(), v.correct.slice().reverse()],
	match: (v) => [v.ord.map((_, l) => v.ord.indexOf(l)), v.ord.map((_, l) => (v.ord.indexOf(l) + 1) % v.ord.length)],
	hilo: (v) => [v.right, 1 - v.right],
	odd: (v) => [v.right, (v.right + 1) % 4],
	emoji: (v) => [v.right, (v.right + 1) % 4],
	proverb: (v) => [v.right, (v.right + 1) % 4],
	riddle: (v) => [v.right, (v.right + 1) % 4],
};

// ---------------------------------------------------------------- 1) arayüz sözleşmesi
console.log('1) Tip sözleşmesi');
for (const [name, T] of Object.entries(TYPES)) {
	ok(typeof T.time === 'number' && T.time > 0, `${name}: time`);
	ok(nonEmpty(T.label), `${name}: label`);
	ok(T.kind === 'exact' || T.kind === 'closest', `${name}: kind`);
	for (const f of ['prepare', 'mount', 'judge', 'bot']) ok(typeof T[f] === 'function', `${name}: ${f}()`);
}
const REQUIRED = ['choice', 'tf', 'num', 'pin', 'hang', 'order', 'match', 'hilo', 'odd', 'emoji', 'anagram', 'cross', 'proverb', 'riddle', 'img', 'blitz'];
for (const t of REQUIRED) ok(TYPES[t], `${t} kayıtlı değil`);

// ---------------------------------------------------------------- 2) bankadaki her soru
console.log('2) Banka soruları');
const ids = new Set();
const count = {};
for (const q of BANK) {
	const T = TYPES[q.type];
	ok(T, `${q.id}: bilinmeyen tip ${q.type}`);
	if (!T) continue;
	ok(!ids.has(q.id), `${q.id}: yinelenen kimlik`);
	ids.add(q.id);
	ok(['tarih', 'cografya', 'spor', 'bilim', 'sanat', 'eglence'].includes(q.cat), `${q.id}: kategori ${q.cat}`);
	ok(q.diff === 1 || q.diff === 2 || q.diff === 3, `${q.id}: diff ${q.diff}`);
	ok(nonEmpty(q.q) || q.type === 'proverb', `${q.id}: soru metni boş`);
	count[q.type] = (count[q.type] || 0) + 1;
	if (SHAPE[q.type]) ok(SHAPE[q.type](q), `${q.id} (${q.type}): veri biçimi bozuk`);
	const R = rng(7 + q.id.length);
	let v;
	try {
		v = T.prepare(q, R);
	} catch (e) {
		bad(`${q.id}: prepare() patladı: ${e.message}`);
		continue;
	}
	ok(v && v.q === q, `${q.id}: prepare() q'yu döndürmeli`);
	const mk = CASES[q.type];
	if (!mk) continue;
	const [good, wrong] = mk(v);
	const jg = T.judge(v, good);
	const jw = T.judge(v, wrong);
	ok(jg.correct === true, `${q.id} (${q.type}): doğru cevap reddedildi`);
	ok(jw.correct === false, `${q.id} (${q.type}): yanlış cevap kabul edildi`);
	if (T.kind === 'closest') ok(jg.err < jw.err, `${q.id}: doğru cevabın hatası (${jg.err}) yanlıştan (${jw.err}) küçük olmalı`);
	const jn = T.judge(v, null);
	ok(jn.correct === false, `${q.id}: boş cevap yanlış sayılmalı`);
	// şıklı tiplerde doğru şık, verideki 0. şık olmalı
	if (v.opts && v.right != null) {
		const want = q.type === 'odd' ? q.opts[q.odd] : q.a[0];
		ok(v.opts[v.right] === want, `${q.id}: doğru şık yanlış yerde`);
		ok(distinct(v.opts), `${q.id}: şıklar tekrarlı`);
	}
	if (q.type === 'order') {
		const vals = v.correct.map((i) => q.items[i].v);
		ok(vals.every((x, i) => !i || vals[i - 1] <= x), `${q.id}: doğru sıra küçükten büyüğe değil`);
		ok(v.start.join() !== v.correct.join(), `${q.id}: başlangıç sırası zaten doğru`);
	}
	if (q.type === 'match') {
		ok(v.ord.join() !== v.ord.map((_, i) => i).join(), `${q.id}: sağ sütun zaten hizalı`);
		ok(v.left.every((t, l) => v.right[v.ord.indexOf(l)] === q.pairs[l][1]), `${q.id}: eşleşme tablosu bozuk`);
	}
	if (q.type === 'hilo') {
		const r = v.sides[v.right].v;
		const o = v.sides[1 - v.right].v;
		ok(r > o, `${q.id}: hilo doğru taraf büyük olmalı`);
	}
}

// ---------------------------------------------------------------- 3) botlar
console.log('3) Botlar');
const SKILLS = [0.3, 0.55, 0.85];
const botRate = {};
for (const q of BANK) {
	const T = TYPES[q.type];
	if (!T) continue;
	for (const skill of SKILLS) {
		for (let k = 0; k < 6; k++) {
			const R = rng(1000 + k * 31 + q.id.length);
			const v = T.prepare(q, R);
			const b = T.bot(v, skill, R);
			ok(b && Number.isFinite(b.time) && b.time > 0 && b.time <= v.sec + 0.001, `${q.id}: bot süresi ${b?.time} (en çok ${v.sec})`);
			const j = T.judge(v, b.value);
			ok(j && typeof j.correct === 'boolean' && (Number.isFinite(j.err) || j.err === Infinity), `${q.id}: bot cevabı değerlendirilemedi`);
			const key = q.type + '@' + skill;
			(botRate[key] ||= []).push(T.kind === 'exact' ? (j.correct ? 1 : 0) : j.correct ? 1 : 0);
		}
	}
}
for (const t of Object.keys(count)) {
	const lo = botRate[t + '@0.3'];
	const hi = botRate[t + '@0.85'];
	const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
	const a = mean(lo);
	const b = mean(hi);
	console.log(`  ${t.padEnd(8)} doğru oranı: çaylak ${(a * 100).toFixed(0)}%  usta+ ${(b * 100).toFixed(0)}%`);
	ok(b > a - 0.02, `${t}: beceri arttıkça bot doğruluğu artmalı`);
	if (t === 'pin' || t === 'num') continue; // yakınlık tipleri: 'correct' çok sıkı bir eşik
	ok(a > 0.1 && a < 0.9, `${t}: çaylak botun doğru oranı makul değil (${a})`);
	ok(b > 0.4 && b <= 1, `${t}: usta botun doğru oranı makul değil (${b})`);
}

// ---------------------------------------------------------------- 4) verisiz tipler yapay soruyla
console.log('4) Verisiz tipler (yapay soruyla)');
const SYN = {
	anagram: { id: 's1', cat: 'bilim', diff: 1, type: 'anagram', q: 'Sıcaklık ölçer', w: 'TERMOMETRE' },
	cross: { id: 's2', cat: 'tarih', diff: 2, type: 'cross', q: 'Çengel', words: [{ w: 'FATİH', clue: 'İstanbul fatihi' }, { w: 'SELİM', clue: 'Yavuz' }, { w: 'KANUNİ', clue: 'Süleyman' }] },
	img: { id: 's3', cat: 'cografya', diff: 1, type: 'img', q: 'Bu nedir?', img: 'kedi', mode: 'blur', a: ['Kedi', 'Köpek', 'Tavşan', 'Kuş'] },
	blitz: { id: 's4', cat: 'eglence', diff: 1, type: 'blitz', q: 'Yıldırım', items: Array.from({ length: 14 }, (_, i) => ({ t: 'İfade ' + i, ans: i % 2 === 0 })) },
};
for (const [t, q] of Object.entries(SYN)) {
	const T = TYPES[t];
	const R = rng(3);
	try {
		const v = T.prepare(q, R);
		const b = T.bot(v, 0.6, R);
		const j = T.judge(v, b.value);
		ok(typeof j.correct === 'boolean', `${t}: judge`);
		ok(T.judge(v, null).correct === false, `${t}: boş cevap`);
	} catch (e) {
		bad(`${t}: yapay soruda patladı: ${e.message}`);
	}
}

// ---------------------------------------------------------------- 5) tip seçimi
console.log('5) pickType');
const have = new Map();
for (const q of BANK) (have.get(q.cat) || have.set(q.cat, new Set()).get(q.cat)).add(q.type);
const EMPTY = ['anagram', 'cross', 'img', 'blitz'].filter((t) => !BANK.some((q) => q.type === t));
const R = rng(99);
for (const cat of [...Object.keys(TYPE_WEIGHTS), null]) {
	for (const phase of ['attack', 'expand']) {
		const seen = new Set();
		const h = cat && have.get(cat) ? have.get(cat) : new Set(BANK.map((q) => q.type));
		for (let i = 0; i < 400; i++) {
			const t = pickType(cat, phase, R, h);
			seen.add(t);
			ok(h.has(t), `pickType(${cat},${phase}) verisi olmayan tip döndürdü: ${t}`);
			ok(!EMPTY.includes(t), `pickType verisiz tip döndürdü: ${t}`);
		}
		if (cat && have.get(cat)) console.log(`  ${String(cat).padEnd(9)} ${phase.padEnd(6)} -> ${[...seen].sort().join(' ')}`);
	}
}
// hiçbir şey kalmayınca güvenli varsayılan
ok(pickType('tarih', 'attack', R, new Set()) === 'choice', 'boş küme: choice');
ok(pickType('tarih', 'expand', R, new Set()) === 'num', 'boş küme: num');

console.log('\nBanka: ' + Object.entries(count).map(([t, n]) => `${t} ${n}`).join(', '));
console.log(`${checks} denetim, ${fails} hata`);
process.exit(fails ? 1 : 0);
