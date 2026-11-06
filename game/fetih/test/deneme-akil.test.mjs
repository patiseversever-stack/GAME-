// Akıl ve kelime deneme tipleri sınaması (Yanlışı Bul, İki Doğru Bir Yalan, Harf Al, Az Bilinen):
//   node test/deneme-akil.test.mjs
// Denetler: örnek sayıları; cevap anahtarı (tek yanlış kelime, tek yalan, harf kümesi, Az Bilinen'de tam beş şık:
// 3–4 doğru + 1–2 nedenli tuzak, tekil ve belirgin söyleyen sayıları); TEK doğru cevap (judge yalnız anahtarı tam
// kabul eder); çevrimiçi görünüm (publicView) cevabı, notları ve oranları taşımıyor; jokerler cevabı bozmuyor (Az
// Bilinen: yarı yarıya tam iki şık, seyirci her şıkka yüzde). deneme.test.mjs gibi esbuild ile paketler.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES } from './src/quiz/deneme-akil.js';
import { words } from './src/quiz/d_yanlis.js';
import { sade } from './src/quiz/d_azbilinen.js';
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

// ---------------------------------------------------------------- Az Bilinen (beş şık)
{
	const T = TYPES.azbilinen;
	const mix = [0, 0]; // tek tuzaklı (4+1), iki tuzaklı (3+2)
	const L = (x) => [...String(x)].length;
	for (const q of SAMPLES.azbilinen) {
		ok(Array.isArray(q.ans) && Array.isArray(q.wrong) && q.ans.length + q.wrong.length === 5, q.id + ': tam 5 şık olmalı');
		ok(q.ans.length >= 3 && q.ans.length <= 4 && q.wrong.length >= 1 && q.wrong.length <= 2, q.id + ': 3–4 doğru ve 1–2 tuzak olmalı');
		mix[Math.min(1, Math.max(0, q.wrong.length - 1))]++;
		ok(q.ans.every((a) => a.length === 2 && typeof a[0] === 'string' && Number.isInteger(a[1]) && a[1] >= 1 && a[1] <= 99), q.id + ': doğru şık [ad, 1–99 kişi] olmalı');
		ok(q.wrong.every((w) => Array.isArray(w) && w.length === 2 && typeof w[0] === 'string' && typeof w[1] === 'string' && L(w[1]) >= 6 && L(w[1]) <= 32), q.id + ': tuzak [ad, 6–32 harflik neden] olmalı');
		const cnt = q.ans.map((a) => a[1]).sort((x, y) => x - y);
		ok(new Set(cnt).size === cnt.length, q.id + ': söyleyen sayıları tekil değil (' + cnt + ')');
		ok(cnt[1] - cnt[0] >= 3, q.id + ': en az bilinen ikinciden belirgin değil (' + cnt + ')');
		ok(cnt[cnt.length - 1] >= 25 && cnt[cnt.length - 1] - cnt[0] >= 20, q.id + ': popülerlikler yeterince farklı değil (' + cnt + ')');
		const names = [...q.ans.map((a) => a[0]), ...q.wrong.map((w) => w[0])];
		ok(new Set(names.map(sade)).size === 5, q.id + ': adlar tekil değil');
		ok(names.every((n) => L(n) >= 1 && L(n) <= 24), q.id + ': şık adı 24 harften uzun');
		ok(L(q.q) <= 66, q.id + ': soru 66 harften uzun (en dar ekranda iki satır)');
		const v = T.prepare(q);
		ok(v.pool.length === 5 && v.pct.length === 5 && v.note.length === 5, q.id + ': görünüm beş şık taşımıyor');
		ok(v.pool.every((n, i) => !i || v.pool[i - 1].localeCompare(n, 'tr', { numeric: true }) <= 0), q.id + ': şıklar alfabetik değil (doğruların yeri ele verilir)');
		const best = cnt[0];
		v.pool.forEach((n, i) => {
			const j = T.judge(v, i);
			const a = q.ans.find((x) => x[0] === n);
			if (a) ok(j.correct && j.err === a[1] && j.pts === 100 - a[1] && v.note[i] === '', q.id + ': doğru cevap ' + n + ' ' + JSON.stringify(j));
			else ok(!j.correct && j.err === 100 && j.pts === 0 && v.note[i] === q.wrong.find((w) => w[0] === n)?.[1], q.id + ': tuzak kabul edildi ' + n);
		});
		ok(T.judge(v, null).err > 100 && !T.judge(v, 999).correct && !T.judge(v, -1).correct && !T.judge(v, 1.5).correct, q.id + ': boş/geçersiz cevap');
		ok(Math.min(...v.pool.map((_, i) => T.judge(v, i).err)) === best, q.id + ': en az bilinen en iyi değil');
		const ex = T.ornek(v);
		ok(T.judge(v, ex.good).err === best && T.judge(v, ex.bad).correct === false, q.id + ': örnek doğru/yanlış');
		ok(typeof T.fmt(v, ex.good) === 'string' && /puan/.test(T.fmt(v, ex.good)) && T.sub(v, ex.bad).includes('tuzak'), q.id + ': fmt/sub');
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		ok(!pv.pct && !pv.note && !pv.q.ans && !pv.q.wrong && pv.pool.length === 5 && !/"(pct|ans|wrong|note|alias)"/.test(s) && q.wrong.every((w) => !s.includes(w[1])), q.id + ': publicView doğruları sızdırıyor');
		// yarı yarıya: tam iki şık söner; kalan üçü doğru, en az bilinen hep kalır
		const e = T.joker('yari', v, R());
		const left = v.pool.map((_, i) => i).filter((i) => !e.hide.includes(i));
		ok(e.hide.length === 2 && new Set(e.hide).size === 2 && e.hide.every((i) => i >= 0 && i < 5), q.id + ': yarı yarıya tam iki şık silmeli');
		ok(left.length === 3 && left.every((i) => v.pct[i] >= 0) && left.some((i) => v.pct[i] === best), q.id + ': yarı yarıya doğru cevap ya da en az bilineni siliyor');
		// seyirci: her şıkka 1–99 yüzde; ortalamada tuzak doğrulardan az, en bilinen en az bilinenden çok oy alır
		const avg = new Array(5).fill(0);
		for (let k = 0; k < 40; k++) {
			const p = T.joker('kahin', v, rng(900 + k)).poll;
			ok(p.length === 5 && p.every((x) => Number.isInteger(x) && x >= 1 && x <= 99), q.id + ': seyirci yüzdeleri');
			p.forEach((x, i) => (avg[i] += x / 40));
		}
		const good = v.pool.map((_, i) => i).filter((i) => v.pct[i] >= 0);
		const traps = v.pool.map((_, i) => i).filter((i) => v.pct[i] < 0);
		const top = good.reduce((a, i) => (v.pct[i] > v.pct[a] ? i : a), good[0]);
		const low = good.reduce((a, i) => (v.pct[i] < v.pct[a] ? i : a), good[0]);
		ok(Math.max(...traps.map((i) => avg[i])) < Math.min(...good.map((i) => avg[i])) && avg[top] > avg[low], q.id + ': seyirci oyları anlamsız ' + avg.map(Math.round));
	}
	ok(mix[0] >= 30 && mix[1] >= 30, 'azbilinen: tek ve iki tuzaklı sorular dengeli değil (' + mix + ')');
	console.log('  azbilinen: ' + mix[0] + ' soru 4 doğru + 1 tuzak, ' + mix[1] + ' soru 3 doğru + 2 tuzak');
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
