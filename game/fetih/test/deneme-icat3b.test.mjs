// Deneme grubu "icat3b" (Tufan, Kayıp İl, Fitil) sınaması:  node test/deneme-icat3b.test.mjs
// deneme.test.mjs ile aynı yol (esbuild ile paketlenip çalıştırılır). Denetler: sözleşme; her örnekte süre (en az
// 20 sn, Fitil sabit 30), belirlenimcilik, JSON görünüm, publicView cevabı sızdırmıyor, judge doğru/yanlış/boş,
// botlar süre içinde ve usta acemiden iyi; Tufan rakımları (en az 150 m fark, iller geçerli), Kayıp İl şıkları
// (geçerli il adları, doğru şık kayıp il, komşu ipucu gerçek komşu); Fitil motoru: fitil 12–25 sn, yeniden oynatma
// canlı turla aynı, ve BENZETİM: rastgele basan oyuncu bilgili bota karşı kaybeder.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-icat3b.js';
import { DENEME_TYPES, DENEME_ORDER } from './src/quiz/deneme.js';
import { engine, replay, sheetFor, FUSE, LOCK } from './src/quiz/d_fitil.js';
import { rng } from './src/core/math.js';
import DATA from './src/data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p) => [p.id, p]));
let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + m);
	}
};

for (const [t] of ORDER) ok(DENEME_TYPES[t] === TYPES[t] && DENEME_ORDER.some((o) => o[0] === t), t + ': galeriye kayıtlı değil');

for (const [type, list] of Object.entries(SAMPLES)) {
	const T = TYPES[type];
	ok(T && typeof T.time === 'number' && T.label && T.kind === 'exact', type + ': sözleşme');
	for (const f of ['prepare', 'mount', 'judge', 'bot', 'publicView']) ok(typeof T?.[f] === 'function', type + ': ' + f + '()');
	ok(list.length >= (type === 'fitil' ? 3 : 8), type + ': örnek sayısı ' + list.length);
	const row = [];
	for (const q of list) {
		const v = T.prepare(q, rng(7));
		ok(Number.isInteger(v.sec) && v.sec >= 20, q.id + ': süre ' + v.sec);
		if (type === 'fitil') ok(v.sec === 30, q.id + ': Fitil sabit tur değil ' + v.sec);
		ok(v.fast < v.med && v.med <= v.slow + 1e-9, q.id + ': hızlı < ortanca ≤ yavaş (' + v.fast + ' ' + v.med + ' ' + v.slow + ')');
		ok(JSON.stringify(T.prepare(q, rng(7))) === JSON.stringify(v), q.id + ': hazırlık belirlenimci değil');
		ok(JSON.stringify(JSON.parse(JSON.stringify(v))) === JSON.stringify(v), q.id + ': görünüm JSON değil');
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		let good;
		let bad;
		if (type === 'tufan') {
			// cevap filmi: ui.reveal cevap ekranını revealMs kadar tutar (en çok 12 sn)
			ok(Number.isInteger(T.revealMs) && T.revealMs >= 4000 && T.revealMs <= 12000, q.id + ': revealMs ' + T.revealMs);
			ok(pv.right == null && pv.alt == null && pv.q.ils == null && pv.opts.length === 4 && !/\\d{2,} ?m\\b/.test(s), q.id + ': publicView cevabı sızdırıyor');
			const alts = q.ils.map((x) => x[1]).sort((a, b) => a - b);
			for (let k = 1; k < 4; k++) ok(alts[k] - alts[k - 1] >= 150, q.id + ': rakım farkı 150 m altında (' + alts + ')');
			ok(q.ils.every(([id]) => BY_ID.has(id)) && new Set(q.ils.map((x) => x[0])).size === 4, q.id + ': il geçersiz');
			const want = q.mode === 'once' ? alts[0] : alts[3];
			ok(v.alt[v.right] === want, q.id + ': doğru şık rakımla uyuşmuyor');
			good = v.right;
			bad = (v.right + 1) % 4;
		} else if (type === 'kayip') {
			ok(pv.right == null && pv.hedef == null && pv.nb == null && !pv.hints && !pv.q.a && pv.q.il == null && !pv.q.hint && pv.opts.length === 4, q.id + ': publicView cevabı sızdırıyor');
			const p = BY_ID.get(q.il);
			ok(p && q.a[0] === p.name, q.id + ': doğru şık kayıp il değil');
			ok(q.a.every((n) => PROV.some((x) => x.name === n)) && new Set(q.a).size === 4, q.id + ': şıklar geçerli il adı değil');
			ok(p.nb.includes(v.nb) && !q.a.includes(BY_ID.get(v.nb).name), q.id + ': komşu ipucu gerçek komşu değil ya da şıklarda');
			ok(v.hintAt.length === 3 && v.hintAt[0] > 2 && v.hintAt[2] < v.sec - 4, q.id + ': ipucu saatleri ' + v.hintAt);
			good = v.right;
			bad = (v.right + 1) % 4;
		} else {
			ok(pv.fuse == null && pv.items.every((it) => it.right == null) && pv.items.length >= 24, q.id + ': publicView fitili ya da cevapları sızdırıyor');
			ok(v.fuse >= FUSE[0] && v.fuse <= FUSE[1], q.id + ': fitil ' + v.fuse);
			ok(v.items.every((it) => (it.right === 0 || it.right === 1) && it.o.length === 2 && it.q), q.id + ': mini soru bozuk');
			// iyi oyuncu: her soruya 1 sn'de doğru; kötü: hiç basmaz (rakip doğruyu bulup topu ona bırakır)
			const allRight = v.items.map((it) => [it.right, 1.0]);
			const vs = { sheet: v.items.map((it) => [1 - it.right, 2.5]) };
			good = { side: 0, me: { sheet: allRight }, vs };
			bad = { side: 0, me: { sheet: [] }, vs: { sheet: allRight } };
		}
		const jg = T.judge(v, good);
		const jb = T.judge(v, bad);
		ok(jg.correct === true, q.id + ': doğru cevap kabul edilmedi ' + JSON.stringify(jg));
		ok(jb.correct === false, q.id + ': yanlış cevap kabul edildi ' + JSON.stringify(jb));
		ok(T.judge(v, null).correct === false, q.id + ': boş cevap kabul edildi');
		const rate = [0, 0];
		for (let k = 0; k < 300; k++) {
			const skill = k % 2 ? 0.9 : 0.2;
			const b = T.bot(v, skill, rng(1000 + k));
			ok(b.time >= 1 && b.time <= v.sec + 1e-9, q.id + ': bot süresi ' + b.time + ' / ' + v.sec);
			const j = T.judge(v, b.value);
			ok(Number.isFinite(j.err), q.id + ': bot cevabı yargılanamadı');
			if (j.correct) rate[k % 2]++;
		}
		ok(rate[1] > rate[0], q.id + ': usta bot acemiden iyi değil (' + rate + ')');
		row.push(q.id.slice(3) + ' ' + v.sec + ' sn');
	}
	console.log('  ' + type.padEnd(7) + row.join(' · '));
}

// ---- Fitil: canlı tur (insan dokunuşları kayda geçer) ile yeniden oynatma aynı sonucu verir
{
	const T = TYPES.fitil;
	let same = 0;
	for (let s = 0; s < 200; s++) {
		const v = T.prepare(SAMPLES.fitil[s % SAMPLES.fitil.length], rng(50 + s));
		const R = rng(900 + s);
		const foe = { sheet: sheetFor(v, 0.7, R) };
		const log = [];
		const E = engine(v, [{ log }, foe]);
		// "insan": kare kare (60 fps) ilerler, her soruya rastgele bir anda bazen yanlış basar
		let plan = null;
		for (let f = 0; f < 60 * 26 && !E.done; f++) {
			const t = f / 60;
			E.adv(t);
			if (E.done) break;
			if (E.open && (!plan || plan.k !== E.k)) plan = { k: E.k, t: E.qOpen + 0.4 + R() * 2.5, c: R() < 0.7 ? v.items[E.k % v.items.length].right : R() < 0.5 ? 0 : 1 };
			if (plan && E.open && t >= plan.t && E.k === plan.k && !E.out[0] && t >= E.lock[0]) if (E.act(0, E.k, plan.c, t)) log.push([E.k, plan.c, t]);
		}
		E.adv(v.fuse);
		const Er = replay(v, { side: 0, me: { log }, vs: foe });
		if (Er.loser === E.loser && Er.score[0] === E.score[0] && Er.score[1] === E.score[1]) same++;
		// bot tarafından bakınca sonuç tersi
		const jb = T.judge(v, { side: 1, me: foe, vs: { log } });
		const jh = T.judge(v, { side: 0, me: { log }, vs: foe });
		ok(jb.correct !== jh.correct, 'fitil: iki tarafın sonucu çelişiyor');
	}
	ok(same === 200, 'fitil: yeniden oynatma canlı turla aynı değil (' + same + '/200)');
}

// ---- Fitil BENZETİMİ: rastgele basan (her soruya 0,3 sn'de rastgele) bilgili bota (beceri 0,75) karşı kaybetmeli;
//      bilgili hızlı oyuncu (%90 doğru, 1,2 sn) aynı bota karşı kazanmalı
{
	const T = TYPES.fitil;
	const N = 3000;
	const win = { random: 0, smart: 0, idle: 0 };
	for (let s = 0; s < N; s++) {
		const v = T.prepare(SAMPLES.fitil[s % SAMPLES.fitil.length], rng(7000 + s));
		const R = rng(13000 + s);
		const bot = { sheet: sheetFor(v, 0.75, R) };
		const random = { sheet: v.items.map(() => [R() < 0.5 ? 0 : 1, 0.25 + R() * 0.15]) };
		const smart = { sheet: v.items.map((it) => [R() < 0.9 ? it.right : 1 - it.right, 1.0 + R() * 0.6]) };
		if (T.judge(v, { side: 0, me: random, vs: bot }).correct) win.random++;
		if (T.judge(v, { side: 0, me: smart, vs: bot }).correct) win.smart++;
		if (T.judge(v, { side: 0, me: { sheet: [] }, vs: bot }).correct) win.idle++;
	}
	const pct = (x) => Math.round((x / N) * 100);
	console.log('  fitil benzetimi (' + N + ' tur, bilgili bota karşı kazanma): rastgele basan %' + pct(win.random) + ' · bilgili hızlı %' + pct(win.smart) + ' · hiç basmayan %' + pct(win.idle) + ' (kilit ' + LOCK + ' sn)');
	ok(pct(win.random) < 40, 'fitil: rastgele basmak kârlı (%' + pct(win.random) + ')');
	ok(pct(win.smart) > 60, 'fitil: bilgili oyuncu kazanamıyor (%' + pct(win.smart) + ')');
	ok(pct(win.idle) < 40, 'fitil: hiç basmamak kârlı (%' + pct(win.idle) + ')');
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'icat3b-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
