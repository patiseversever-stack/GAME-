// Düello deneme tipleri sınaması (Halat Çekme, Mancınık):  node test/deneme-duello.test.mjs
// Genel sözleşme denetimleri test/deneme.test.mjs'te (bütün deneme tipleri). Burada tipe özgü kurallar:
//   Halat: örnek turlar (soru sayısı, şıklar, tek doğru), hakem kuralları (kilit, sıra), publicView, ve
//          RASTGELE BASMA BENZETİMİ: rastgele basan bot ortalama bilgili bota karşı kaybeder, kendi beklenen halat
//          katkısı ≤ 0 (yalnız iki şıklı turda bile ~0, karışık turda eksi).
//   Mancınık: aşma kuralı (aşmayanlardan en yakın; hepsi aşarsa en az aşan), publicView, bot aşma oranı.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { DENEME_TYPES, DENEME_SAMPLES } from './src/quiz/deneme.js';
import { tally, play, gate, LOCK, GAP } from './src/quiz/d_halat.js';
import { rng } from './src/core/math.js';

let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 40) console.log('  HATA: ' + m);
	}
};
const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

// ---------------------------------------------------------------- Halat
const H = DENEME_TYPES.halat;
const HS = DENEME_SAMPLES.halat;
ok(HS.length >= 6, 'halat: en az 6 örnek');
for (const q of HS) {
	ok(q.items.length >= 30, q.id + ': turda en az 30 soru (' + q.items.length + ')');
	const sig = (x) => x.t + '|' + x.o.slice().sort().join('|');
	ok(new Set(q.items.map(sig)).size === q.items.length, q.id + ': yinelenen soru');
	for (const it of q.items) {
		ok(it.o.length >= 2 && it.o.length <= 4 && it.r >= 0 && it.r < it.o.length && new Set(it.o).size === it.o.length, q.id + ': geçersiz madde ' + it.t);
		ok(!it.tf || (it.o.length === 2 && it.o[0] === 'DOĞRU'), q.id + ': doğru/yanlış maddesi ' + it.t);
	}
	const kinds = { tf: 0, two: 0, many: 0 };
	for (const it of q.items) kinds[it.tf ? 'tf' : it.o.length === 2 ? 'two' : 'many']++;
	ok(kinds.tf > 0 && kinds.two > 0 && kinds.many > 0, q.id + ': karışık değil ' + JSON.stringify(kinds));
	const v = H.prepare(q, rng(3));
	ok(v.sec === 20, q.id + ': tur 20 sn değil (' + v.sec + ')');
	// doğru şık karıştırmadan sonra da aynı metin
	v.items.forEach((it, i) => {
		const src = q.items.find((x) => sig(x) === sig(it));
		ok(src && it.o[v.key[i]] === src.o[src.r], q.id + ': karıştırınca doğru şık kaydı ' + it.t);
	});
	const pv = H.publicView(v);
	const s = JSON.stringify(pv);
	ok(!pv.key && !pv.q.items && !/"r":/.test(s) && pv.items.length === v.items.length, q.id + ': publicView cevabı sızdırıyor');
	// hakem: kilit içindeki ve sırasız basışlar sayılmaz
	const k0 = v.key[0];
	const w0 = (k0 + 1) % v.items[0].o.length;
	const g = (i) => gate(v.items[i]);
	const ta = g(0) + 0.2; // ilk cevap (yanlış)
	const tb = ta + LOCK - GAP + g(1); // kilit + kapı bitti
	const t1 = tally(v, [[0, w0, ta], [1, v.key[1], tb - 0.2], [1, v.key[1], tb + 0.01]]);
	ok(t1.net === 0 && t1.ok === 1 && t1.bad === 1, q.id + ': kilit içi basış sayıldı ' + JSON.stringify(t1));
	const tc = g(0) + 0.1;
	const t2 = tally(v, [[0, k0, g(0) - 0.1], [0, k0, tc], [1, v.key[1], tc + g(1) - 0.1], [5, v.key[5], 9], [1, v.key[1], tc + g(1) + 0.05]]);
	ok(t2.net === 2 && t2.steps.length === 2, q.id + ': kapı içi ya da sırasız basış sayıldı ' + JSON.stringify(t2));
	// sıralama: halat konumu (net farkı) belirler; eşitse az yanlış (isabet), sonra hız
	const T = (n0) => {
		// n0 cevap, hepsi kapı açılır açılmaz; yanlış verilecek indeksler w
		return (w = [], d = 0.05) => {
			const log = [];
			let t = 0;
			for (let i = 0; i < n0; i++) {
				t += g(i) + d;
				const bad = w.includes(i);
				log.push([i, bad ? (v.key[i] + 1) % v.items[i].o.length : v.key[i], Math.round(t * 1000) / 1000]);
				if (bad) t += LOCK - GAP;
			}
			return { log };
		};
	};
	const A = H.judge(v, T(2)());
	const B = H.judge(v, T(4)([1]));
	const C = H.judge(v, T(2)([], 0.4));
	ok(A.err < B.err, q.id + ': eşit nette az yanlış yapan önde değil (' + A.err + ' / ' + B.err + ')');
	ok(A.err < C.err, q.id + ': eşit net ve doğruda erken ulaşan önde değil');
}

// rastgele basma benzetimi: her örnek turda N tur; "ortalama bilgili" bot (beceri 0,55 = 'er' seviyesi ve 0,6) ile rastgele basan
const N = 3000;
const rows = [];
let sumRand = 0;
let cntRand = 0;
for (const q of HS) {
	const R = rng(4242 + q.id.length);
	let rw = 0;
	let rope5 = 0;
	let rope6 = 0;
	let rnet = 0;
	let presses = 0;
	let anet = 0;
	let aAns = 0;
	let rw6 = 0;
	for (let i = 0; i < N; i++) {
		const v = H.prepare(q, R);
		const rl = play(v, 0.55, R, 'random');
		const a5 = play(v, 0.55, R);
		const a6 = play(v, 0.6, R);
		const r = tally(v, rl);
		const k5 = tally(v, a5);
		const k6 = tally(v, a6);
		rnet += r.net;
		presses += r.steps.length;
		anet += k5.net;
		aAns += k5.steps.length;
		rope5 += r.net - k5.net; // rastgele basanın tarafına göre halat konumu
		rope6 += r.net - k6.net;
		const jr = H.judge(v, { log: rl });
		if (jr.err < H.judge(v, { log: a5 }).err) rw++;
		if (jr.err < H.judge(v, { log: a6 }).err) rw6++;
	}
	sumRand += rnet;
	cntRand += N;
	rows.push([q.id, f2(rnet / N), f2(presses / N), f2(anet / N), f2(aAns / N), f2(rope5 / N), f2(rope6 / N), ((rw / N) * 100).toFixed(1) + '%', ((rw6 / N) * 100).toFixed(1) + '%']);
	ok(rnet / N <= 0, q.id + ': rastgele basanın beklenen katkısı > 0 (' + rnet / N + ')');
	ok(rope5 / N < 0 && rope6 / N < 0, q.id + ': rastgele basan halatı ortalama bilgili bottan öteye çekiyor');
	ok(rw / N < 0.35 && rw6 / N < 0.35, q.id + ': rastgele basan ortalama bilgili bota karşı kazanıyor (' + rw / N + ')');
}
console.log('  RASTGELE BASMA BENZETİMİ (' + N + ' tur/örnek; konum = rastgele basanın net − bilgili botun net; + : rastgeleye çekili)');
console.log('  örnek    rast.net  basış  bilgili(0,55).net  cevap  konum(0,55) konum(0,6)  rast.kazanır(0,55)  (0,6)');
for (const r of rows) console.log('  ' + r[0].padEnd(8) + r[1].padStart(9) + r[2].padStart(7) + r[3].padStart(18) + r[4].padStart(7) + r[5].padStart(12) + r[6].padStart(12) + r[7].padStart(19) + r[8].padStart(7));

// yalnız iki şıklı (doğru/yanlış + karşılaştır) bir tur: rastgele basmanın en kârlı olabileceği durum; beklenen ~0
{
	const two = { ...HS[0], id: 'iki-sik', items: HS.flatMap((q) => q.items.filter((x) => x.o.length === 2)).slice(0, 60) };
	const R = rng(99);
	let rnet = 0;
	let rw = 0;
	let rope = 0;
	for (let i = 0; i < N; i++) {
		const v = H.prepare(two, R);
		const rl = play(v, 0.55, R, 'random');
		const al = play(v, 0.55, R);
		const r = tally(v, rl);
		rnet += r.net;
		rope += r.net - tally(v, al).net;
		if (H.judge(v, { log: rl }).err < H.judge(v, { log: al }).err) rw++;
	}
	console.log('  yalnız iki şık: rastgele net ' + f2(rnet / N) + ' · konum ' + f2(rope / N) + ' · rastgele kazanır ' + ((rw / N) * 100).toFixed(1) + '%');
	ok(rnet / N <= 0.15, 'iki şıklı turda rastgele basmanın beklentisi belirgin artı (' + rnet / N + ')');
	ok(rw / N < 0.4 && rope / N < 0, 'iki şıklı turda rastgele basan bilgili bota karşı kazanıyor');
}
ok(sumRand / cntRand < 0, 'karışık turlarda rastgele basmanın beklentisi eksi değil');

// bot gerçekçiliği: 20 sn'de usta bot daha çok ve daha isabetli; cevap aralıkları en az boşluk kadar
{
	const v = H.prepare(HS[0], rng(5));
	const R = rng(6);
	let n2 = 0;
	let n9 = 0;
	let net2 = 0;
	let net9 = 0;
	for (let i = 0; i < 500; i++) {
		const a = tally(v, play(v, 0.2, R));
		const b = tally(v, play(v, 0.9, R));
		n2 += a.steps.length;
		n9 += b.steps.length;
		net2 += a.net;
		net9 += b.net;
	}
	console.log('  bot: acemi (0,2) ' + f2(n2 / 500) + ' cevap, net ' + f2(net2 / 500) + ' · usta (0,9) ' + f2(n9 / 500) + ' cevap, net ' + f2(net9 / 500));
	ok(n9 > n2 && net9 > net2 && n2 / 500 >= 4 && n9 / 500 <= 16, 'halat botu gerçekçi değil');
	const log = play(v, 0.6, rng(1));
	ok(tally(v, log).steps.length === log.length, 'bot kaydı hakem kurallarına uymuyor');
}

// ---------------------------------------------------------------- Mancınık
const M = DENEME_TYPES.mancinik;
const MS = DENEME_SAMPLES.mancinik;
ok(MS.length >= 6, 'mancınık: en az 6 örnek');
for (const q of MS) {
	ok(Number.isFinite(q.ans) && q.min < q.ans && q.ans < q.max, q.id + ': cevap aralıkta değil');
	const v = M.prepare(q, rng(1));
	ok(v.sec >= 20, q.id + ': süre 20 sn altında (' + v.sec + ')');
	const pv = M.publicView(v);
	ok(pv.hedef == null && pv.q.ans == null && v.q.ans == null && !JSON.stringify(pv).includes('"ans"'), q.id + ': publicView cevabı sızdırıyor');
	const span = q.max - q.min;
	const j = (x) => M.judge(v, x);
	const under = Math.round(q.ans - span * 0.2);
	const over = Math.min(q.max, q.ans + Math.max(1, Math.round(span * 0.01)));
	ok(j(q.ans).err === 0 && j(q.ans).correct, q.id + ': tam isabet');
	ok(j(under).err < j(over).err, q.id + ': az aşan, çok kısa kalanın önüne geçti');
	ok(j(q.ans + 2 > q.max ? q.max : q.ans + 2).err < j(q.max).err, q.id + ': hepsi aşınca en az aşan önde değil');
	ok(j(q.ans - 1).err < j(under).err, q.id + ': aşmayanlardan yakın olan önde değil');
	ok(!j(over).correct, q.id + ': aşan doğru sayıldı');
	// bot: temkinli ama kimi zaman aşar; usta bot daha az aşar
	let o2 = 0;
	let o9 = 0;
	for (let i = 0; i < 400; i++) {
		if (j(M.bot(v, 0.2, rng(i)).value).over) o2++;
		if (j(M.bot(v, 0.9, rng(500 + i)).value).over) o9++;
	}
	ok(o2 > 0 && o2 < 400 * 0.6 && o9 <= o2, q.id + ': bot aşma oranı (' + o2 + ', ' + o9 + ')');
	// jokerler: dar aralık cevabı içerir, seyirci aralıkta
	const e = M.joker('yari', v, rng(2));
	ok(e.min <= q.ans && q.ans <= e.max && e.min >= q.min && e.max <= q.max, q.id + ': yarı yarıya aralığı cevabı içermiyor');
	const c = M.joker('kahin', v, rng(3));
	ok(c.value >= q.min && c.value <= q.max, q.id + ': seyirci değeri aralık dışı');
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'deneme-duello-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
