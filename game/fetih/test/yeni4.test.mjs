// Yeni 4 deneme tipi sınaması (Penaltı):  node test/yeni4.test.mjs
// Denetler: grup sözleşmesi (TYPES, ORDER, SAMPLES, PROFILE, deneme.js'e bağlı), örnek sayısı (en az 40) ve dağılımı (altı
// kategori, zorluk 1-2-3), kimlikler (yn-penalti-1…N sıralı; ilk üç örnek olduğu gibi), dört farklı şık, şık uzunluğu
// (panoya sığsın), tipografik kesme ve emoji yokluğu, bankayla aynı soru metni yokluğu; haritaya dayanan olguları
// src/data/turkiye.json'dan (plaka, bölge, komşuluk, kıyı, yabancı sınır) ve hesapla doğrulanabilenleri (plaka toplamı,
// olasılık, kare sayısı, asal…) hesaplayarak yeniden doğrular; tipin prepare/judge/publicView/joker/bot/ornek davranışını
// ve süre bütçesini sınar. deneme.test.mjs gibi esbuild ile paketler.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, ORDER, SAMPLES } from './src/quiz/deneme-yeni4.js';
import { DENEME_TYPES, DENEME_SAMPLES, TAZE_ORDER } from './src/quiz/deneme.js';
import { CATS } from './src/quiz/categories.js';
import { PROFILE, limits } from './src/quiz/timing.js';
import { BANK } from './src/data/bank.js';
import { rng } from './src/core/math.js';
import DATA from './src/data/turkiye.json';

let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + m);
	}
};

// ---------------------------------------------------------------- harita verisi
const PV = DATA.provinces;
const byName = new Map(PV.map((p) => [p.name, p]));
const byId = new Map(PV.map((p) => [p.id, p]));
const il = (n) => {
	const p = byName.get(n);
	ok(!!p, 'veri: il yok ' + n);
	return p || { id: -1, nb: [], region: '' };
};
const km = (pts) => {
	let s = 0;
	for (let k = 2; k < pts.length; k += 2) s += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
	return s * (111.2 / 6);
};
const sea = new Map(); // il → deniz kıyısı (km)
const abroad = new Set(); // yabancı ülkeye kara sınırı olan iller
for (const b of DATA.borders) {
	if (byId.has(b.a) && byId.has(b.b)) continue;
	const other = byId.has(b.a) ? b.b : b.a;
	const pid = byId.has(b.a) ? b.a : b.b;
	if (other === 0) sea.set(pid, (sea.get(pid) || 0) + km(b.pts));
	else if (other === -1) abroad.add(pid);
}
const coast = (n) => (sea.get(il(n).id) || 0) >= 20;

// ---------------------------------------------------------------- grup sözleşmesi
ok(Object.keys(TYPES).join() === 'penalti', 'TYPES yalnız penalti');
ok(ORDER.length === 1 && ORDER[0][0] === 'penalti' && ORDER[0][1] && ORDER[0][2], 'ORDER');
ok(DENEME_TYPES.penalti === TYPES.penalti && DENEME_SAMPLES.penalti === SAMPLES.penalti, 'deneme.js grubuna bağlı değil');
ok(TAZE_ORDER.some(([x]) => x === 'penalti'), 'galerinin YENİ listesinde yok');
ok(PROFILE.penalti && limits('penalti').lo >= 10, 'PROFILE');

const L = SAMPLES.penalti;
const T = TYPES.penalti;
ok(L.length >= 40, 'en az 40 örnek: ' + L.length);
L.forEach((q, i) => {
	ok(q.id === 'yn-penalti-' + (i + 1), q.id + ': kimlik sırası');
	ok(q.type === 'penalti', q.id + ': tip');
	ok(!!CATS[q.cat], q.id + ': kategori ' + q.cat);
	ok([1, 2, 3].includes(q.diff), q.id + ': zorluk ' + q.diff);
	ok(['gece', 'kar', 'aksam'].includes(q.hava), q.id + ': hava');
	ok(Array.isArray(q.a) && q.a.length === 4 && new Set(q.a.map((x) => x.toLocaleLowerCase('tr-TR'))).size === 4 && q.a.every((x) => typeof x === 'string' && x.trim() === x && x), q.id + ': dört farklı şık');
	ok(q.a.every((x) => [...x].length <= 22), q.id + ': şık en çok 22 harf (320 px panoya sığsın)');
	ok(q.a.every((x) => x.split(/\\s+/).every((w) => [...w].length <= 14)), q.id + ': şıkta 14 harften uzun kelime (bölünmeden sığmaz)');
	ok([...q.q].length <= 90 && /\\?$/.test(q.q), q.id + ': soru en çok 90 harf ve soru işaretiyle biter');
	const s = JSON.stringify([q.q, q.a]);
	ok(!s.includes("'"), q.id + ': düz kesme işareti (’ olmalı)');
	ok(!/\\p{Extended_Pictographic}/u.test(s), q.id + ': emoji');
});
ok(new Set(L.map((q) => q.q)).size === L.length, 'aynı soru iki kez');
const cats = {};
const diffs = {};
for (const q of L) {
	cats[q.cat] = (cats[q.cat] || 0) + 1;
	diffs[q.diff] = (diffs[q.diff] || 0) + 1;
}
for (const c of ['tarih', 'cografya', 'spor', 'bilim', 'sanat', 'eglence']) ok((cats[c] || 0) >= 6, 'kategori ' + c + ' en az 6: ' + (cats[c] || 0));
for (const d of [1, 2, 3]) ok((diffs[d] || 0) >= 8, 'zorluk ' + d + ' en az 8: ' + (diffs[d] || 0));
// ilk üç örnek (galeride ve maç köprüsünde kimliği sabit) olduğu gibi
ok(L[0].q === 'Galatasaray 2000 UEFA Kupası finalinde penaltılarla hangi takımı yendi?' && L[0].a[0] === 'Arsenal', 'yn-penalti-1 değişti');
ok(L[1].q === 'Hangisi Halide Edib Adıvar’ın romanıdır?' && L[1].a[0] === 'Sinekli Bakkal', 'yn-penalti-2 değişti');
ok(L[2].q.startsWith('DNA’nın çift sarmal') && L[2].a[0] === 'Watson ve Crick', 'yn-penalti-3 değişti');
// bankada aynı metinli soru yok (ilk üçü önceki turdan; bankayla aynı olgu, metinleri farklı)
const norm = (s) => String(s).toLocaleLowerCase('tr-TR').replace(/[’']/g, '').replace(/[^\\p{L}\\p{N}]+/gu, ' ').trim();
const bankQ = new Set(BANK.map((b) => norm(b.q)));
for (const q of L) ok(!bankQ.has(norm(q.q)), q.id + ': bankada aynı soru var');
const Q = new Map(L.map((q) => [q.id, q]));
const ans = (id) => Q.get(id)?.a || [];

// ---------------------------------------------------------------- harita olguları (turkiye.json)
{
	// en küçük plaka
	const a = ans('yn-penalti-17').map((n) => il(n).id);
	ok(a[0] === Math.min(...a), 'yn-penalti-17: en küçük plaka doğru şık değil ' + a);
	// en büyük plaka ve 81'in Düzce olduğu
	const b = ans('yn-penalti-22').map((n) => il(n).id);
	ok(b[0] === Math.max(...b) && b[0] === Math.max(...PV.map((p) => p.id)), 'yn-penalti-22: en büyük plaka ' + b);
	// Karadeniz kıyısı: doğru şıkkın kıyısı yok, ötekiler Karadeniz Bölgesi'nde kıyı ili
	const c = ans('yn-penalti-19');
	ok(!coast(c[0]) && c.slice(1).every((n) => coast(n) && il(n).region === 'karadeniz'), 'yn-penalti-19: kıyı');
	// Konya'ya komşu olmayan
	const k = il('Konya').nb;
	const d = ans('yn-penalti-20').map((n) => il(n).id);
	ok(!k.includes(d[0]) && d.slice(1).every((x) => k.includes(x)), 'yn-penalti-20: Konya komşuları');
	// denize kıyısı olmayan il
	const e = ans('yn-penalti-21');
	ok(!coast(e[0]) && e.slice(1).every(coast), 'yn-penalti-21: kıyı');
	// Akdeniz ve Karadeniz Bölgesi'nde yabancı sınırı olan tek il
	for (const [id, reg] of [['yn-penalti-24', 'akdeniz'], ['yn-penalti-25', 'karadeniz']]) {
		const only = PV.filter((p) => p.region === reg && abroad.has(p.id)).map((p) => p.name);
		const o = ans(id);
		ok(only.length === 1 && only[0] === o[0], id + ': bölgede yabancı sınırlı iller ' + only);
		// çeldiriciler: ya bölgede ve sınırsız, ya sınırlı ama başka bölgede (Ardahan)
		ok(o.slice(1).every((n) => (il(n).region === reg && !abroad.has(il(n).id)) || (il(n).region !== reg && abroad.has(il(n).id))), id + ': çeldirici');
	}
	// Hakkari: yabancı sınırlı; şıkların hepsi yabancı sınırlı iller (hangi ülke olduğu veride yok)
	ok(ans('yn-penalti-18').every((n) => abroad.has(il(n).id)), 'yn-penalti-18: şıklar sınır illeri');
	// plaka toplamı: Ankara + Adana = Antalya; çeldiricilerin plakası farklı
	const sum = il('Ankara').id + il('Adana').id;
	const f = ans('yn-penalti-26').map((n) => il(n).id);
	ok(f[0] === sum && !f.slice(1).includes(sum), 'yn-penalti-26: plaka toplamı ' + sum + ' ' + f);
	// ek sorular: plaka yarısı (34 / 2), plaka çarpımı (06 × 07), tek komşulu il, Erzurum'a komşu olmayan il
	const h = ans('yn-penalti-72').map((n) => il(n).id);
	ok(h[0] === il('İstanbul').id / 2 && !h.slice(1).includes(h[0]), 'yn-penalti-72: plaka yarısı ' + h);
	const m = ans('yn-penalti-73').map((n) => il(n).id);
	ok(m[0] === il('Ankara').id * il('Antalya').id && !m.slice(1).includes(m[0]), 'yn-penalti-73: plaka çarpımı ' + m);
	const tek = PV.filter((p) => p.nb.length === 1).map((p) => p.name);
	ok(tek.length === 1 && tek[0] === ans('yn-penalti-74')[0] && ans('yn-penalti-74').slice(1).every((n) => il(n).nb.length > 1), 'yn-penalti-74: tek komşulu il ' + tek);
	const ez = il('Erzurum').nb;
	const z = ans('yn-penalti-79').map((n) => il(n).id);
	ok(!ez.includes(z[0]) && z.slice(1).every((x) => ez.includes(x)), 'yn-penalti-79: Erzurum komşuları');
	const eg = ans('yn-penalti-78').map((n) => il(n));
	ok(eg.every((p) => p.region === 'ege') && eg[0].id === Math.max(...PV.filter((p) => p.region === 'ege').map((p) => p.id)), 'yn-penalti-78: Ege’nin en büyük plakası');
}

// ---------------------------------------------------------------- hesapla doğrulanan olgular
{
	ok(ans('yn-penalti-43')[0] === String(52 / 4), 'yn-penalti-43: kupa kartı');
	ok(ans('yn-penalti-41')[0] === '1/' + 2 * 2, 'yn-penalti-41: iki tura');
	let sq = 0;
	for (let s = 1; s <= 3; s++) sq += (3 - s + 1) ** 2;
	ok(ans('yn-penalti-42')[0] === String(sq), 'yn-penalti-42: kare sayısı ' + sq);
	ok(ans('yn-penalti-45')[0] === String(1 + (3 * 4) / 2), 'yn-penalti-45: üç kesiş');
	const prime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) + 1).keys()].slice(2).every((d) => n % d);
	const pr = ans('yn-penalti-46').map(Number);
	ok(!prime(pr[0]) && pr.slice(1).every(prime), 'yn-penalti-46: asal');
	// futbol topu (kesik ikosahedron): her köşede 1 beşgen + 2 altıgen; 5p = V, 6h = 2V, V − E + F = 2
	const V = 60;
	const p5 = V / 5;
	const h6 = (2 * V) / 6;
	ok(V - (5 * p5 + 6 * h6) / 2 + (p5 + h6) === 2 && p5 === 12, 'futbol topu yamaları');
	// Rubik 3×3: 6 yüz, her yüzde bir merkez
	ok(ans('yn-penalti-40')[0] === '6', 'yn-penalti-40');
	// ek sorular: hem kare hem küp, Romen rakamı, Braille hücresi
	const kk = ans('yn-penalti-89').map(Number);
	const kare = (n) => Number.isInteger(Math.sqrt(n));
	const kup = (n) => Math.round(Math.cbrt(n)) ** 3 === n;
	ok(kare(kk[0]) && kup(kk[0]) && kk.slice(1).every((n) => !(kare(n) && kup(n))), 'yn-penalti-89: hem kare hem küp');
	const rom = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
	const roma = (s) => [...s].reduce((t, c, i, a) => t + (rom[c] < (rom[a[i + 1]] || 0) ? -rom[c] : rom[c]), 0);
	ok(ans('yn-penalti-113')[0] === String(roma('MCM')), 'yn-penalti-113: MCM');
	ok(ans('yn-penalti-120')[0] === String(2 * 3), 'yn-penalti-120: Braille hücresi');
}

// ---------------------------------------------------------------- tip davranışı
for (const q of L) {
	const seen = new Set();
	for (let s = 0; s < 24; s++) {
		const v = T.prepare(q, rng(s * 13 + 1));
		seen.add(v.right);
		ok(v.opts.length === 4 && v.opts[v.right] === q.a[0] && [...v.opts].sort().join() === [...q.a].sort().join(), q.id + ': prepare doğru şık');
		ok(v.hava === q.hava, q.id + ': hava görünümde');
		if (s === 0) {
			const L2 = limits('penalti');
			ok(Number.isInteger(v.sec) && v.sec >= L2.lo && v.sec <= L2.hi && v.fast <= v.med && v.med <= v.slow, q.id + ': süre ' + v.sec);
			ok(T.judge(v, v.right).correct && T.judge(v, v.right).err === 0, q.id + ': judge doğru');
			for (let k = 0; k < 4; k++) if (k !== v.right) ok(!T.judge(v, k).correct, q.id + ': judge yanlış');
			ok(!T.judge(v, null).correct && !T.judge(v, 1.5).correct && !T.judge(v, '0').correct, q.id + ': geçersiz değer doğru sayıldı');
			const pv = T.publicView(v);
			ok(!('right' in pv) && !pv.q.a && !JSON.stringify(pv).includes('"right"'), q.id + ': publicView doğru köşeyi sızdırıyor');
			ok(pv.opts.length === 4 && v.right !== undefined && v.q.a, q.id + ': publicView özgün görünümü bozdu');
			const o = T.ornek(v);
			ok(T.judge(v, o.good).correct && !T.judge(v, o.bad).correct, q.id + ': ornek');
			for (let r = 0; r < 10; r++) {
				const h = T.joker('yari', v, rng(r + 7)).hide;
				ok(h.length === 2 && !h.includes(v.right) && new Set(h).size === 2, q.id + ': yarı yarıya doğru köşeyi kapattı');
				const pct = T.joker('kahin', v, rng(r + 70)).pct;
				ok(pct.length === 4 && pct.reduce((a, b) => a + b, 0) === 100 && pct.every((x) => x >= 0), q.id + ': seyirci yüzdeleri ' + pct);
			}
		}
	}
	ok(seen.size >= 3, q.id + ': doğru köşe karışmıyor');
}
// seyirci çoğunlukla doğru köşeyi gösterir; bot beceriyle iyileşir, değerleri geçerli
{
	const v = T.prepare(L[3], rng(3));
	let top = 0;
	for (let r = 0; r < 400; r++) {
		const p = T.joker('kahin', v, rng(900 + r)).pct;
		if (p.indexOf(Math.max(...p)) === v.right) top++;
	}
	ok(top > 300, 'seyirci doğru köşeyi yeterince göstermiyor ' + top);
	const rate = [0, 0];
	for (let k = 0; k < 800; k++) {
		const skill = k % 2 ? 0.9 : 0.2;
		const b = T.bot(v, skill, rng(4000 + k));
		ok(Number.isInteger(b.value) && b.value >= 0 && b.value < 4 && b.time > 0 && b.time <= v.sec + 1e-9, 'bot değeri ' + JSON.stringify(b));
		rate[k % 2] += T.judge(v, b.value).correct ? 1 : 0;
	}
	ok(rate[1] > rate[0] * 1.3, 'usta bot acemiden belirgin iyi değil ' + rate);
}
ok(T.kind === 'exact' && T.cover === true && Number(T.revealMs) <= 3600, 'tip: kind, cover, cevap filmi (mac.js FILM.penalti 3600 ile uyumlu)');

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni4-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning', loader: { '.json': 'json' } });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
