// YENİ 10 · grup 4 sınaması (Penaltı, Kaçış Odası):  node test/yeni4.test.mjs
// Denetler: örnek sayısı ve kimlikleri; şıkların doğruluğu (doğru şık/kapı karışınca da doğru yerde); judge (Penaltı tam
// cevap, Kaçış Odası kısmi puan: geçilen oda, eşitlikte önce varan); süre dolunca geçilen odalar sayılır; çevrimiçi
// görünüm (publicView) cevabı taşımıyor; jokerler cevabı bozmuyor; botlar süre içinde ve beceriyle daha iyi; süreler.
// deneme.test.mjs gibi esbuild ile paketleyip çalıştırır.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-yeni4.js';
import { DENEME_TYPES } from './src/quiz/deneme.js';
import { kacisOf } from './src/quiz/d_kacis.js';
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
const CATS = new Set(['tarih', 'cografya', 'bilim', 'sanat', 'spor', 'eglence']);

ok(ORDER.map((o) => o[0]).join() === 'penalti,kacis', 'ORDER: penalti, kacis');
for (const t of ['penalti', 'kacis']) {
	ok(DENEME_TYPES[t] === TYPES[t], t + ': deneme.js gruptan almıyor');
	const L = SAMPLES[t] || [];
	ok(L.length === 3, t + ': tam 3 örnek');
	ok(L.map((q) => q.id).join() === ['1', '2', '3'].map((k) => 'yn-' + t + '-' + k).join(), t + ': kimlikler yn-' + t + '-1..3');
	ok(L.map((q) => q.diff).join() === '1,2,3', t + ': zorluklar 1, 2, 3');
	for (const q of L) ok(CATS.has(q.cat) && q.type === t, q.id + ': kategori/tip');
	ok(new Set(L.map((q) => q.cat)).size === 3, t + ': üç örnek üç ayrı kategoriden');
}
const noStraight = (s) => !/[A-Za-zÇĞİÖŞÜçğıöşü]'[a-zçğıöşü]/.test(s); // kesme işareti ’ olmalı
const textOf = (q) => JSON.stringify(q);

// ---------------------------------------------------------------- Penaltı
{
	const T = TYPES.penalti;
	ok(T.kind === 'exact' && T.cover === true, 'penalti: tür exact, tam ekran');
	ok(new Set(SAMPLES.penalti.map((q) => q.hava)).size === 3, 'penalti: üç örnek üç ayrı hava (gece, kar, akşam)');
	for (const q of SAMPLES.penalti) {
		ok(noStraight(textOf(q)), q.id + ': düz kesme işareti var');
		ok(q.a.length === 4 && new Set(q.a).size === 4 && q.a.every((x) => x.trim()), q.id + ': dört farklı şık');
		for (let s = 0; s < 8; s++) {
			const v = T.prepare(q, rng(s + 3));
			ok(v.opts[v.right] === q.a[0], q.id + ': doğru şık yerinde değil');
			ok(new Set(v.opts).size === 4, q.id + ': şıklar tekrarlı');
			ok(v.sec >= 20 && v.sec <= 30, q.id + ': süre ' + v.sec);
			ok(T.judge(v, v.right).correct && T.judge(v, v.right).err === 0, q.id + ': doğru köşe gol değil');
			for (let i = 0; i < 4; i++) if (i !== v.right) ok(!T.judge(v, i).correct && T.judge(v, i).err === 1, q.id + ': yanlış köşe gol');
			ok(!T.judge(v, null).correct && !T.judge(v, '1').correct, q.id + ': boş ya da bozuk cevap gol');
			const pv = T.publicView(v);
			ok(pv.right == null && !pv.q.a && pv.opts.length === 4, q.id + ': publicView doğru köşeyi sızdırıyor');
			const y = T.joker('yari', v, rng(s + 9));
			ok(y.hide.length === 2 && !y.hide.includes(v.right) && new Set(y.hide).size === 2, q.id + ': yarı yarıya doğru köşeyi kapatıyor');
			const k = T.joker('kahin', v, rng(s + 11));
			ok(k.pct.length === 4 && k.pct.reduce((a, b) => a + b, 0) === 100 && k.pct.every((x) => x >= 0), q.id + ': seyirci oyları 100 değil ' + k.pct);
		}
		const v = T.prepare(q, rng(5));
		let hi = 0;
		let lo = 0;
		for (let k = 0; k < 600; k++) {
			const b = T.bot(v, k % 2 ? 0.9 : 0.15, rng(500 + k));
			ok(Number.isInteger(b.value) && b.value >= 0 && b.value < 4, q.id + ': bot değeri');
			ok(b.time >= 1.5 && b.time <= v.sec, q.id + ': bot süresi ' + b.time);
			if (T.judge(v, b.value).correct) k % 2 ? hi++ : lo++;
		}
		ok(hi > lo + 40, q.id + ': usta bot acemiden belirgin iyi değil (' + hi + '/' + lo + ')');
	}
}

// ---------------------------------------------------------------- Kaçış Odası
{
	const T = TYPES.kacis;
	ok(T.kind === 'closest' && T.cover === true, 'kacis: tür closest, tam ekran');
	ok(new Set(SAMPLES.kacis.map((q) => q.tema)).size === 3, 'kacis: üç ayrı tema (saray, lab, stad)');
	for (const q of SAMPLES.kacis) {
		ok(noStraight(textOf(q)), q.id + ': düz kesme işareti var');
		ok(q.rooms.length === 3, q.id + ': üç oda');
		ok(q.rooms.every((r) => r.a.length === 3 && new Set(r.a).size === 3 && r.q.length <= 60 && r.ad), q.id + ': odada kısa soru ve üç farklı kapı');
		ok(q.rooms.every((r, k) => k === 0 || r.d >= q.rooms[k - 1].d), q.id + ': oda zorluğu artmıyor');
		for (let s = 0; s < 8; s++) {
			const v = T.prepare(q, rng(s + 1));
			ok(v.sec >= 30 && v.sec <= 40, q.id + ': koşu süresi ' + v.sec);
			ok(v.rooms.every((r, k) => r.opts[v.key[k]] === q.rooms[k].a[0]), q.id + ': doğru kapı yerinde değil');
			const right = v.key.slice();
			const wrong = (k) => (v.key[k] + 1) % 3;
			// kısmi puan: 0, 1, 2, 3 oda
			const j = [[wrong(0)], [right[0], wrong(1)], [right[0], right[1], wrong(2)], right].map((p, n) => T.judge(v, { picks: p, at: p.map((_, i) => 5 + i * 6) }));
			ok(j.map((x) => x.rooms).join() === '0,1,2,3', q.id + ': geçilen oda sayımı ' + j.map((x) => x.rooms));
			ok(j[3].correct && !j[2].correct && j[0].err > j[1].err && j[1].err > j[2].err && j[2].err > j[3].err && j[3].err === 0, q.id + ': kısmi puan sırası');
			// tuzaktan sonra basılan kapı sayılmaz
			ok(T.judge(v, { picks: [wrong(0), right[1], right[2]], at: [1, 2, 3] }).rooms === 0, q.id + ': tuzaktan sonrası sayıldı');
			// süre doldu: geçilen odalar sayılır (ctl.value)
			const sure = T.judge(v, { picks: [right[0], right[1]], at: [6, 13] });
			ok(sure.rooms === 2 && !sure.correct && kacisOf(v, { picks: [right[0], right[1]] }).stop === 'sure', q.id + ': süre dolunca kısmi puan');
			// eşitlikte önce varan önde (aynı oda)
			ok(T.judge(v, { picks: [right[0], wrong(1)], at: [4, 9] }).err < T.judge(v, { picks: [right[0], wrong(1)], at: [8, 12] }).err, q.id + ': eşitlikte önce varan önde değil');
			ok(T.judge(v, null).err > j[0].err && !T.judge(v, null).correct, q.id + ': boş cevap');
			const pv = T.publicView(v);
			const s2 = JSON.stringify(pv);
			ok(!pv.key && !pv.q.rooms && pv.rooms.length === 3 && pv.rooms.every((r) => r.opts.length === 3 && !('key' in r)), q.id + ': publicView anahtarı sızdırıyor');
			ok(!s2.includes('"a":'), q.id + ': publicView verideki şık sırasını taşıyor');
			const y = T.joker('yari', v, rng(s + 21));
			ok(y.hide.length === 3 && y.hide.every((d, k) => d !== v.key[k] && d >= 0 && d < 3), q.id + ': yarı yarıya doğru kapıyı kapatıyor');
			const k2 = T.joker('kahin', v, rng(s + 31));
			ok(k2.pct.length === 3 && k2.pct.every((p) => p.length === 3 && p.reduce((a, b) => a + b, 0) === 100), q.id + ': seyirci oyları');
			ok(typeof T.fmt(v, { picks: right }) === 'string' && T.sub(v, { picks: [wrong(0)] }).includes('1. odada'), q.id + ': fmt/sub');
		}
		const v = T.prepare(q, rng(9));
		const rooms = [0, 0];
		let esc = [0, 0];
		for (let k = 0; k < 600; k++) {
			const sk = k % 2;
			const b = T.bot(v, sk ? 0.9 : 0.15, rng(900 + k));
			const jj = T.judge(v, b.value);
			ok(b.time >= 1 && b.time <= v.sec, q.id + ': bot süresi ' + b.time);
			ok(Array.isArray(b.value.picks) && b.value.picks.length === b.value.at.length, q.id + ': bot değeri');
			ok(b.value.at.every((t, i) => i === 0 || t > b.value.at[i - 1]), q.id + ': bot kapı anları sırasız');
			rooms[sk] += jj.rooms;
			if (jj.correct) esc[sk]++;
		}
		ok(rooms[1] > rooms[0] * 1.5 && esc[1] > esc[0], q.id + ': usta bot acemiden iyi değil (' + rooms + ' / ' + esc + ')');
	}
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni4-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
