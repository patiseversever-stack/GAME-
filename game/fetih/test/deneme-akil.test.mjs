// Akıl ve kelime deneme tipleri sınaması (Yanlışı Bul, İki Doğru Bir Yalan, Harf Al, Az Bilinen):
//   node test/deneme-akil.test.mjs
// Denetler: örnek sayıları; cevap anahtarı (tek yanlış kelime, tek yalan, harf kümesi, yüzdeler); TEK doğru cevap
// (judge yalnız anahtarı tam kabul eder); çevrimiçi görünüm (publicView) cevabı, notları ve oranları taşımıyor;
// jokerler cevabı bozmuyor; arama Türkçe harf ve yazım hatasına dayanıklı. deneme.test.mjs gibi esbuild ile paketler.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES } from './src/quiz/deneme-akil.js';
import { words } from './src/quiz/d_yanlis.js';
import { ara, sade } from './src/quiz/d_azbilinen.js';
import { KEYS } from './src/quiz/util.js';
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
const MIN = { yanlis: 20, ikidogru: 15, harfal: 15, azbilinen: 10 };
for (const [t, n] of Object.entries(MIN)) ok((SAMPLES[t] || []).length >= n, t + ': en az ' + n + ' örnek (' + (SAMPLES[t] || []).length + ')');
const ids = Object.values(SAMPLES).flat().map((q) => q.id);
ok(new Set(ids).size === ids.length, 'soru kimlikleri tekil değil');
const CATS = new Set(['tarih', 'cografya', 'bilim', 'sanat', 'spor', 'eglence']);
for (const q of Object.values(SAMPLES).flat()) ok(CATS.has(q.cat) && [1, 2, 3].includes(q.diff), q.id + ': kategori/zorluk');
ok(new Set(SAMPLES.yanlis.map((q) => q.cat)).size === 6, 'yanlis: altı kategorinin hepsinden cümle yok');

const R = () => rng(11);

// ---------------------------------------------------------------- Yanlışı Bul
{
	const T = TYPES.yanlis;
	for (const q of SAMPLES.yanlis) {
		ok((q.t.match(/\\{/g) || []).length === 1 && (q.t.match(/\\}/g) || []).length === 1, q.id + ': tam bir {yanlış} kelime olmalı');
		const { list, bad } = words(q.t);
		ok(bad >= 0 && list.length >= 5, q.id + ': kelimeler');
		ok(q.alt.length === 2 && new Set([q.ok, ...q.alt, list[bad].w]).size === 4, q.id + ': seçenekler ve yanlış kelime birbirinden farklı olmalı');
		ok(typeof q.n === 'string' && q.n.length > 20, q.id + ': not yok');
		const v = T.prepare(q, R());
		ok(v.opts[v.right] === q.ok && v.opts.length === 3, q.id + ': doğru seçenek');
		// tek doğru: yalnız (yanlış kelime, doğru seçenek) tam; yer doğru + başka seçenek yarım; başka kelime puansız
		for (let w = 0; w < v.words.length; w++)
			for (let f = 0; f < 3; f++) {
				const j = T.judge(v, { w, f });
				const want = w !== v.bad ? 2 : f === v.right ? 0 : 1;
				ok(j.err === want && j.correct === (want === 0), q.id + ': judge(' + w + ',' + f + ') ' + JSON.stringify(j));
			}
		ok(T.judge(v, null).err === 3 && T.judge(v, { w: v.bad, f: null }).err === 1, q.id + ': boş cevaplar');
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		ok(pv.bad == null && pv.right == null && !pv.opts && !pv.q.t && !pv.q.ok && !pv.q.alt && !pv.q.n && !/[{}]/.test(pv.words.map((x) => x.w).join('')) && !s.includes(q.n.slice(0, 20)), q.id + ': publicView cevabı sızdırıyor');
		ok(pv.words.length === v.words.length && pv.words.every((x) => !('bad' in x)), q.id + ': publicView kelimeleri');
		const e = T.joker('yari', v, R());
		ok(!e.dim.includes(v.bad) && v.words.length - e.dim.length === 3 && e.hide !== v.right, q.id + ': yarı yarıya cevabı bozuyor');
	}
}

// ---------------------------------------------------------------- İki Doğru Bir Yalan
{
	const T = TYPES.ikidogru;
	for (const q of SAMPLES.ikidogru) {
		ok(q.f.length === 3 && Number.isInteger(q.lie) && q.f[q.lie], q.id + ': üç bilgi, bir yalan');
		q.f.forEach((f, i) => {
			ok(f.t.length > 25 && f.n.length > 30, q.id + ': bilgi ya da açıklama kısa (' + i + ')');
			if (i === q.lie) ok(/^Yalan:/.test(f.n), q.id + ': yalanın açıklaması "Yalan:" ile başlamalı (doğrusunu söyler)');
			else ok(Array.isArray(f.k) && f.k.length >= 2 && !/^Yalan/.test(f.n), q.id + ': doğru bilginin iki kaynağı yok (' + i + ')');
		});
		ok(new Set(q.f.map((f) => f.t)).size === 3, q.id + ': bilgiler farklı değil');
		for (let s = 0; s < 6; s++) {
			const v = T.prepare(q, rng(s + 1));
			ok(v.facts[v.right] === q.f[q.lie].t, q.id + ': yalanın yeri');
			for (let i = 0; i < 3; i++) ok(T.judge(v, i).correct === (i === v.right), q.id + ': tek doğru değil');
			const pv = T.publicView(v);
			const js = JSON.stringify(pv);
			ok(pv.right == null && !pv.notes && !pv.q.f && pv.q.lie == null && q.f.every((f) => !js.includes(f.n.slice(0, 30))), q.id + ': publicView yalanı ya da açıklamayı sızdırıyor');
			ok(pv.facts.length === 3, q.id + ': publicView bilgileri');
			ok(T.joker('yari', v, rng(s)).hide !== v.right, q.id + ': yarı yarıya yalanı eliyor');
			const pct = T.joker('kahin', v, rng(s)).pct;
			ok(pct.reduce((a, b) => a + b, 0) === 100 && pct.every((x) => x >= 0), q.id + ': seyirci yüzdeleri');
		}
	}
	ok(new Set(SAMPLES.ikidogru.map((q) => q.cat)).size >= 5, 'ikidogru: kategoriler çeşitli değil');
}

// ---------------------------------------------------------------- Harf Al
{
	const T = TYPES.harfal;
	const abc = KEYS.join('');
	const seen = new Set();
	for (const q of SAMPLES.harfal) {
		const w = q.w.toLocaleUpperCase('tr-TR');
		ok(w === q.w, q.id + ': kelime büyük harfle yazılmalı');
		ok([...w].length >= 4 && [...w].length <= 10, q.id + ': 4–10 harf (' + w + ')');
		ok([...w].every((c) => abc.includes(c)), q.id + ': klavyede olmayan harf (' + w + ')');
		ok(!seen.has(w), q.id + ': kelime tekrar');
		seen.add(w);
		ok(!q.q.toLocaleUpperCase('tr-TR').includes(w), q.id + ': tanım cevabı içeriyor');
		const v = T.prepare(q);
		ok(v.n === [...w].length, q.id + ': harf sayısı');
		const g = T.judge(v, { g: w, al: [] });
		ok(g.correct && g.err === 0 && g.pts === v.n * 100, q.id + ': harf almadan tam puan');
		const g2 = T.judge(v, { g: w.toLocaleLowerCase('tr-TR'), al: [0, 1, 1] });
		ok(g2.correct && g2.err === 2 && g2.pts === (v.n - 2) * 100, q.id + ': küçük harf ve tekrar eden harf yeri ' + JSON.stringify(g2));
		ok(!T.judge(v, { g: w.slice(0, -1), al: [] }).correct && !T.judge(v, { g: w + 'A', al: [] }).correct, q.id + ': eksik/fazla harf kabul edildi');
		ok(!T.judge(v, { g: w, al: [...Array(v.n).keys()] }).correct, q.id + ': bütün harfler alınınca puan olmamalı');
		const pv = T.publicView(v);
		ok(pv.word == null && pv.q.w == null && !JSON.stringify(pv).toLocaleUpperCase('tr-TR').includes(w) && pv.n === v.n, q.id + ': publicView kelimeyi sızdırıyor');
		const e = T.joker('yari', v, R());
		ok(e.open.length >= 1 && e.open.length < v.n - 1 && e.open.every((i) => i >= 0 && i < v.n), q.id + ': yarı yarıya harfleri');
	}
}

// ---------------------------------------------------------------- Az Bilinen
{
	const T = TYPES.azbilinen;
	for (const q of SAMPLES.azbilinen) {
		ok(q.ans.length >= 4 && q.wrong.length >= 4, q.id + ': en az 4 doğru ve 4 tuzak');
		ok(q.ans.every(([n, p]) => typeof n === 'string' && Number.isInteger(p) && p >= 1 && p <= 99), q.id + ': yüzdeler 1–99 tam sayı');
		const names = [...q.ans.map((a) => a[0]), ...q.wrong];
		ok(new Set(names.map(sade)).size === names.length, q.id + ': adlar tekil değil');
		const v = T.prepare(q);
		const valid = new Set(q.ans.map((a) => a[0]));
		const best = Math.min(...q.ans.map((a) => a[1]));
		v.pool.forEach((n, i) => {
			const j = T.judge(v, i);
			if (valid.has(n)) {
				const p = q.ans.find((a) => a[0] === n)[1];
				ok(j.correct && j.err === p && j.pts === 100 - p, q.id + ': doğru cevap ' + n);
			} else ok(!j.correct && j.err === 100 && j.pts === 0, q.id + ': tuzak kabul edildi ' + n);
			// arama: Türkçe harfsiz ve bir harf eksik yazımla bulunur
			const plain = sade(n);
			ok(ara(v.pool, plain).includes(i), q.id + ': aramada bulunamadı (' + plain + ')');
			const w0 = plain.length >= 5 ? plain.slice(0, 2) + plain.slice(3, 6) : plain;
			ok(ara(v.pool, w0).includes(i), q.id + ': yazım hatasıyla bulunamadı (' + w0 + ' → ' + n + ')');
		});
		ok(T.judge(v, null).err > 100 && !T.judge(v, 999).correct, q.id + ': boş/geçersiz cevap');
		ok(Math.min(...v.pool.map((_, i) => T.judge(v, i).err)) === best, q.id + ': en az bilinen en iyi');
		const pv = T.publicView(v);
		ok(!pv.pct && !pv.alias && !pv.q.ans && !pv.q.wrong && pv.pool.length === names.length && !/"(pct|ans|wrong|alias)"/.test(JSON.stringify(pv)), q.id + ': publicView doğruları sızdırıyor');
		const e = T.joker('yari', v, R());
		ok(e.hide.length >= 2 && e.hide.every((i) => !valid.has(v.pool[i])), q.id + ': yarı yarıya doğru cevap siliyor');
	}
	// eşanlam ve kısaltma
	const ab = TYPES.azbilinen.prepare(SAMPLES.azbilinen[0]);
	ok(ara(ab.pool, 'afyon', ab.alias)[0] === ab.pool.indexOf('Afyonkarahisar'), 'arama: kısaltma');
	ok(ara(ab.pool, 'izmr', ab.alias).includes(ab.pool.indexOf('İzmir')), 'arama: harf eksik');
	ok(ara(ab.pool, 'usak', ab.alias)[0] === ab.pool.indexOf('Uşak'), 'arama: Türkçe harfsiz');
	const pd = TYPES.azbilinen.prepare(SAMPLES.azbilinen.find((q) => q.id === 'dn-ab07'));
	ok(ara(pd.pool, 'fatih', pd.alias)[0] === pd.pool.indexOf('Mehmed'), 'arama: eşanlam (Fatih → Mehmed)');
}

// ---------------------------------------------------------------- botlar: usta acemiden iyi (her tip)
for (const [type, list] of Object.entries(SAMPLES)) {
	const T = TYPES[type];
	let good = [0, 0];
	for (const q of list) {
		const v = T.prepare(q, R());
		for (let k = 0; k < 200; k++) {
			const b = T.bot(v, k % 2 ? 0.9 : 0.2, rng(500 + k));
			ok(b.time > 0 && b.time <= v.sec, q.id + ': bot süresi');
			good[k % 2] += T.judge(v, b.value).err;
		}
	}
	ok(good[1] < good[0], type + ': usta bot acemiden iyi değil (' + good + ')');
}

console.log('  ' + Object.entries(SAMPLES).map(([t, l]) => t + ' ' + l.length).join(' · '));
console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

// Galeri sayfası windows-1252 diye okunabiliyor: esbuild dizeleri \u ile kaçışlar ama düzenli ifadeleri olduğu gibi bırakır.
// Bu yüzden tiplerin düzenli ifadelerinde ASCII dışı karakter olmamalı ("İMECE" → "MECE" hatası).
{
	const { readFileSync } = await import('node:fs');
	let bad = 0;
	for (const f of ['d_yanlis.js', 'd_ikidogru.js', 'd_harfal.js', 'd_azbilinen.js'])
		readFileSync(join(root, 'src/quiz', f), 'utf8')
			.split('\n')
			.forEach((line, i) => {
				if (/^\s*\/\//.test(line) || !/\.(replace|match|matchAll|split|test)\(/.test(line)) return;
				for (const m of line.matchAll(/\/(?:\\.|\[(?:\\.|[^\]])*\]|[^/\n\\])+\/[gimsuy]*/g)) if (/[^\x00-\x7f]/.test(m[0])) (bad++, console.log('  HATA: ' + f + ':' + (i + 1) + ' düzenli ifadede ASCII dışı karakter: ' + m[0]));
			});
	if (bad) process.exitCode = 1;
}

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'deneme-akil-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
