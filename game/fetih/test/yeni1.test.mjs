// Yeni grup 1 sınaması (Kasa Soygunu, Terazi):  node test/yeni1.test.mjs
// Denetler: tam üç örnek (yn-<tip>-1..3, zorluk 1/2/3, geçerli kategori, üç ayrı kategori); Kasa'da tambur sayısı
// cevabın basamak sayısı (2–4, üçü de farklı), "kilit soldan açılır" puanı (soldan doğru tambur > dinleme bedeli >
// sayıca yakınlık), geçersiz şifre reddi; Terazi'de 1–3 ağırlık, hüküm toplamlardan, üç örnekte üç farklı hüküm;
// çevrimiçi görünüm cevabı taşımıyor; jokerler cevabı bozmuyor; botlar beceriyle iyileşiyor ve süre içinde.
// deneme.test.mjs gibi esbuild ile paketler (tipler three.js'li yardımcılar içe aktarır).
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-yeni1.js';
import { yokla } from './src/quiz/d_kasa.js';
import { CATS } from './src/quiz/categories.js';
import { PROFILE } from './src/quiz/timing.js';
import { rng } from './src/core/math.js';

let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + m);
	}
};

ok(ORDER.length === 2 && ORDER.every(([t, n, s]) => TYPES[t] && n && s), 'ORDER: iki tip, ad ve tanıtım');
for (const t of ['kasa', 'terazi']) {
	const L = SAMPLES[t] || [];
	ok(L.length === 3, t + ': tam üç örnek');
	ok(L.map((q) => q.id).join() === ['1', '2', '3'].map((k) => 'yn-' + t + '-' + k).join(), t + ': kimlikler yn-' + t + '-1..3');
	ok(L.map((q) => q.diff).join() === '1,2,3', t + ': zorluk 1, 2, 3');
	ok(L.every((q) => CATS[q.cat] && q.type === t), t + ': kategori ve tip');
	ok(new Set(L.map((q) => q.cat)).size === 3, t + ': üç ayrı kategori');
	ok(PROFILE[t] && PROFILE[t].min > 0, t + ': süre profili');
	for (const q of L) ok(!/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(JSON.stringify(q)), q.id + ': emoji');
	for (const q of L) ok(!/'/.test(q.q + (q.not || '')), q.id + ": düz kesme işareti (’ olmalı)");
}

// ---------------------------------------------------------------- Kasa
{
	const T = TYPES.kasa;
	const ns = [];
	for (const q of SAMPLES.kasa) {
		const v = T.prepare(q, rng(3));
		const a = String(q.ans);
		ns.push(v.n);
		ok(v.n === a.length && v.n >= 2 && v.n <= 4, q.id + ': tambur sayısı = basamak sayısı');
		ok(Number.isInteger(q.ans) && q.ans >= 10 ** (v.n - 1), q.id + ': cevap ' + v.n + ' basamaklı tam sayı');
		// basamak sınırına yaslanmaz (1999/2000 gibi): ±%2 komşuluğu aynı ilk basamakta kalır
		ok(String(Math.round(q.ans * 0.98))[0] === a[0] && String(Math.round(q.ans * 1.02))[0] === a[0], q.id + ': cevap basamak sınırına çok yakın');
		const J = (c, h = []) => T.judge(v, { c, h });
		ok(J(a).correct && J(a).err === 0, q.id + ': doğru şifre');
		ok(J(a, [1]).correct && J(a, [1]).err === 0.5, q.id + ': dinleyerek açan doğru, bedel yarım tambur');
		// soldan sayım: ilk tamburu yanlış olan, sağı doğru olsa da 0 tambur
		const wrong0 = String((Number(a[0]) % 9) + 1) + a.slice(1);
		ok(!J(wrong0).correct && J(wrong0).err >= v.n, q.id + ': ilk tambur yanlışsa hiç açılmaz');
		// sıralama: daha çok tambur > dinleme > yakınlık
		const lastWrong = a.slice(0, -1) + String((Number(a.at(-1)) + 5) % 10);
		ok(J(lastWrong).err < J(wrong0).err, q.id + ': çok tambur önde');
		const twoWrong = a.slice(0, v.n - 2) + String((Number(a[v.n - 2]) + 5) % 10) + a.at(-1); // soldan n − 2 tambur
		ok(J(lastWrong, [0]).err > J(lastWrong).err && J(lastWrong, [0]).err < J(twoWrong).err, q.id + ': dinleme bedeli bir tamburdan az');
		const near = a.slice(0, -1) + String((Number(a.at(-1)) + 1) % 10);
		if (near !== lastWrong && Math.abs(Number(near) - q.ans) < Math.abs(Number(lastWrong) - q.ans)) ok(J(near).err < J(lastWrong).err, q.id + ': eşit tamburda yakın olan önde');
		ok(J(a, [0]).err < J(lastWrong).err, q.id + ': dinleyerek açan, açamayandan önde');
		for (const bad of [null, {}, { c: a.slice(1) }, { c: a + '0' }, { c: 'x'.repeat(v.n) }]) ok(T.judge(v, bad).correct === false && T.judge(v, bad).err > v.n, q.id + ': geçersiz şifre ' + JSON.stringify(bad));
		ok(yokla(v, { c: a }).lead === v.n, q.id + ': yokla');
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		ok(pv.hedef == null && pv.q.ans == null && pv.q.not == null && pv.n === v.n && !s.includes(a), q.id + ': publicView cevabı sızdırıyor');
		ok(T.judge(pv, { c: a }).correct === false, q.id + ': cevapsız görünümde yargı yok');
		const jy = T.joker('yari', v, rng(1));
		ok(jy && jy.kind === 'acik' && a[jy.k] === String(jy.d), q.id + ': yarı yarıya doğru tamburu açar');
		for (let s2 = 0; s2 < 20; s2++) {
			const jk = T.joker('kahin', v, rng(s2));
			ok(jk && jk.kind === 'kalabalik' && jk.c.length === v.n && /^\\d+$/.test(jk.c), q.id + ': seyirci şifresi');
		}
		// botlar: geçerli şifre, dinleme en çok bir, beceriyle artan ortalama tambur
		const tum = [0, 0];
		for (let k = 0; k < 600; k++) {
			const sk = k % 2 ? 0.9 : 0.25;
			const b = T.bot(v, sk, rng(500 + k));
			ok(b.value && b.value.c.length === v.n && /^\\d+$/.test(b.value.c) && b.value.h.length <= 1, q.id + ': bot şifresi');
			ok(b.time >= 1 && b.time <= v.sec, q.id + ': bot süresi');
			tum[k % 2] += yokla(v, b.value).lead;
		}
		ok(tum[1] > tum[0], q.id + ': usta bot daha çok tambur açmalı (' + tum + ')');
		ok(typeof T.fmt(v, { c: a, h: [] }) === 'string' && T.sub(v, { c: a, h: [] }) === 'kasayı açtı', q.id + ': fmt/sub');
	}
	ok(new Set(ns).size === 3, 'kasa: örneklerde 2, 3 ve 4 tambur');
}

// ---------------------------------------------------------------- Terazi
{
	const T = TYPES.terazi;
	const hk = [];
	for (const q of SAMPLES.terazi) {
		ok(q.sol.length >= 1 && q.sol.length <= 3 && q.sag.length >= 1 && q.sag.length <= 3, q.id + ': kefede 1–3 ağırlık');
		ok([...q.sol, ...q.sag].every(([t, x]) => typeof t === 'string' && t.length >= 2 && t.length <= 14 && Number.isFinite(x) && x > 0), q.id + ': etiket ve değer');
		ok(typeof q.unit === 'string' && q.unit.length > 0, q.id + ': birim');
		const v = T.prepare(q, rng(2));
		const a = q.sol.reduce((s, w) => s + w[1], 0);
		const b = q.sag.reduce((s, w) => s + w[1], 0);
		const want = a > b ? 0 : a === b ? 1 : 2;
		hk.push(want);
		ok(v.right === want, q.id + ': hüküm toplamlardan');
		ok(q.tuzak == null || (q.tuzak !== want && [0, 1, 2].includes(q.tuzak)), q.id + ': tuzak yanlış bir seçenek olmalı');
		for (let i = 0; i < 3; i++) ok(T.judge(v, i).correct === (i === want), q.id + ': tek doğru');
		ok(!T.judge(v, null).correct && !T.judge(v, '0').correct && !T.judge(v, 3).correct, q.id + ': geçersiz seçim');
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		ok(pv.right == null && pv.vals == null && pv.tuzak == null && pv.sol.length === q.sol.length && pv.sag.length === q.sag.length, q.id + ': publicView hükmü/değerleri sızdırıyor');
		ok([...pv.sol, ...pv.sag].every((t) => typeof t === 'string') && !('sol' in pv.q) && !('sag' in pv.q) && !('tuzak' in pv.q) && !('not' in pv.q), q.id + ': publicView bir değeri ya da notu taşıyor');
		ok(typeof q.not === 'string' && q.not.length > 20, q.id + ': not');
		for (let k = 0; k < 10; k++) {
			const y = T.joker('yari', v, rng(k));
			ok(Number.isInteger(y.hide) && y.hide !== want, q.id + ': yarı yarıya doğruyu eliyor');
			const p = T.joker('kahin', v, rng(k)).pct;
			ok(p.reduce((x, z) => x + z, 0) === 100 && p.every((x) => x >= 0) && p[want] === Math.max(...p), q.id + ': seyirci yüzdeleri');
		}
		const rate = [0, 0];
		const trap = [0, 0];
		for (let k = 0; k < 600; k++) {
			const b2 = T.bot(v, k % 2 ? 0.9 : 0.2, rng(900 + k));
			ok([0, 1, 2].includes(b2.value) && b2.time >= 1 && b2.time <= v.sec, q.id + ': bot');
			if (b2.value === want) rate[k % 2]++;
			else trap[b2.value === q.tuzak ? 0 : 1]++;
		}
		ok(rate[1] > rate[0], q.id + ': usta bot daha iyi (' + rate + ')');
		if (q.tuzak != null) ok(trap[0] > trap[1], q.id + ': yanılan bot çoğunlukla sezgiye kanar (' + trap + ')');
	}
	ok(new Set(hk).size === 3, 'terazi: üç örnekte sol, denge ve sağ hükmü');
}

console.log('  yeni1: ' + checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni1-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
