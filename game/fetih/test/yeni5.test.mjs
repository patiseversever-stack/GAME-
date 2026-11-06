// Yeni 5 deneme tipleri sınaması (Zaman Tüneli, Kelime Avı):  node test/yeni5.test.mjs
// Denetler: örnek sayısı, kimlik, kategori, zorluk 1-2-3; Zaman Tüneli: yıllar farklı, doğru boşluk hesabı, judge yalnız
// doğru boşlukları kabul eder, publicView kartların yılını taşımaz, joker doğru boşluğu kapatmaz; Kelime Avı: her örnek
// 300 farklı tohumla kurulur ve her tabloda her kelime TAM BİR kez geçer (sekiz yön), kaba kelime yok, kelimeler zorluğun
// yönlerinde, publicView yerleşimi taşımaz, seçim iki uçtan da kabul edilir, botlar beceriyle iyileşir ve geçerli değer
// üretir. deneme.test.mjs gibi esbuild ile paketler.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-yeni5.js';
import { DENEME_TYPES, DENEME_SAMPLES, TAZE_ORDER } from './src/quiz/deneme.js';
import { dogruBosluk, tunelYillari, puan } from './src/quiz/d_tunel.js';
import { gecis, harfler, KABA, YON, DIRS, kelimeOf, sayim, hat } from './src/quiz/d_kelimeavi.js';
import { CATS } from './src/quiz/categories.js';
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

// ---------------------------------------------------------------- grup sözleşmesi
ok(ORDER.length === 2 && ORDER.every(([t, n, s]) => TYPES[t] && n && s), 'ORDER');
for (const t of Object.keys(TYPES)) {
	ok(DENEME_TYPES[t] === TYPES[t] && DENEME_SAMPLES[t] === SAMPLES[t], t + ': deneme.js grubuna bağlı değil');
	ok(TAZE_ORDER.some(([x]) => x === t), t + ': galerinin YENİ listesinde yok');
	const list = SAMPLES[t];
	ok(list.length === 3, t + ': tam 3 örnek');
	list.forEach((q, i) => {
		ok(q.id === 'yn-' + t + '-' + (i + 1), q.id + ': kimlik');
		ok(q.diff === i + 1, q.id + ': zorluk ' + q.diff);
		ok(!!CATS[q.cat], q.id + ': kategori ' + q.cat);
		ok(q.type === t, q.id + ': tip');
		// tipografik kesme: düz kesme işareti yok
		ok(!JSON.stringify(q).includes("'"), q.id + ': düz kesme işareti (’ olmalı)');
	});
	ok(new Set(list.map((q) => q.cat)).size === 3, t + ': üç örnek üç ayrı konudan değil');
}

// ---------------------------------------------------------------- Zaman Tüneli
{
	const T = TYPES.tunel;
	for (const q of SAMPLES.tunel) {
		const ys = [...q.anchors, ...q.cards].map((x) => x[1]);
		ok(q.anchors.length === 2 && q.cards.length === 3, q.id + ': 2 çapa, 3 kart');
		ok(new Set(ys).size === 5 && ys.every((y) => Number.isInteger(y) && y > 1000 && y < 2030), q.id + ': yıllar farklı ve geçerli');
		ok([...q.anchors, ...q.cards].every(([t]) => [...t].length <= 30), q.id + ': olay adı en çok 30 harf (plakaya sığsın)');
		const v = T.prepare(q, rng(1));
		// doğru boşluk: tünelde kendisinden eski olay sayısı (elle)
		for (let k = 0; k < 3; k++) {
			const before = [q.anchors[0][1], q.anchors[1][1], ...q.cards.slice(0, k).map((c) => c[1])];
			ok(dogruBosluk(v, k) === before.filter((y) => y < q.cards[k][1]).length, q.id + ': kart ' + k + ' boşluğu');
			ok(tunelYillari(v, k).length === 2 + k, q.id + ': tünel boyu');
		}
		// bütün olası yerleştirmeler: doğru sayısı = doğru boşluğa konan kart sayısı
		const want = [0, 1, 2].map((k) => dogruBosluk(v, k));
		for (let a = 0; a < 3; a++)
			for (let b = 0; b < 4; b++)
				for (let c = 0; c < 5; c++) {
					const g = [a, b, c];
					const n = g.filter((x, k) => x === want[k]).length;
					const j = T.judge(v, { g, t: [1, 2, 3] });
					ok(j.err === 3 - n && j.correct === (n === 3), q.id + ': judge ' + g + ' ' + JSON.stringify(j));
				}
		ok(T.judge(v, { g: [want[0], 9, -1] }).err === 2, q.id + ': geçersiz boşluk doğru sayıldı');
		ok(T.judge(v, { g: [want[0]] }).err === 2 && puan(v, { g: [want[0]] }).marks[1] === null, q.id + ': yarım cevap');
		ok(T.judge(v, null).err === 3, q.id + ': boş cevap');
		// her kart başka bir bölgeye düşmeli (hep "arası" değil)
		ok(new Set(want.map((w, k) => (w === 0 ? 'once' : w === k + 2 ? 'sonra' : 'ara'))).size >= 2, q.id + ': kartların hepsi aynı bölgeye düşüyor');
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		ok(!pv.years && q.cards.every(([, y]) => !s.includes(String(y))), q.id + ': publicView kart yılını sızdırıyor');
		ok(pv.anchors.length === 2 && pv.cards.length === 3 && !('y' in pv.cards[0]), q.id + ': publicView kartları');
		// joker: kapatılan boşluklar hep yanlış, her kartta en az biri
		for (let r = 0; r < 20; r++) {
			const e = T.joker('yari', v, rng(50 + r));
			ok(e.cut.length === 3 && e.cut.every((c, k) => c.length >= 1 && !c.includes(want[k]) && c.every((g) => g >= 0 && g <= k + 2)), q.id + ': joker doğru boşluğu kapatıyor');
		}
		// bot: değer biçimi, süreler, beceriyle doğruluk
		const rate = [0, 0];
		for (let k = 0; k < 600; k++) {
			const skill = k % 2 ? 0.9 : 0.25;
			const b = T.bot(v, skill, rng(900 + k));
			ok(Array.isArray(b.value.g) && b.value.g.length === 3 && b.value.g.every((x, i) => Number.isInteger(x) && x >= 0 && x <= i + 2), q.id + ': bot boşluğu');
			ok(b.value.t.every((t, i) => t > 0 && (i === 0 || t >= b.value.t[i - 1]) && t <= b.time + 1e-9), q.id + ': bot anları');
			rate[k % 2] += T.judge(v, b.value).score;
		}
		ok(rate[1] > rate[0] * 1.3, q.id + ': usta bot acemiden belirgin iyi değil ' + rate);
	}
}

// ---------------------------------------------------------------- Kelime Avı
{
	const T = TYPES.kelimeavi;
	for (const q of SAMPLES.kelimeavi) {
		const words = q.words.map(([w]) => harfler(w).join(''));
		ok(q.words.length === 3 && new Set(words).size === 3, q.id + ': üç farklı kelime');
		ok(words.every((w) => [...w].length >= 4 && [...w].length <= 9), q.id + ': kelime boyu 4..9');
		ok(q.words.every(([, c]) => c && [...c].length <= 40), q.id + ': ipucu en çok 40 harf');
		// ipucu cevabı ele vermesin
		ok(q.words.every(([w, c]) => !c.toLocaleUpperCase('tr-TR').includes(harfler(w).join(''))), q.id + ': ipucu cevabı içeriyor');
		const dirs = new Set(YON[q.diff]);
		let used = new Set();
		for (let seed = 0; seed < 300; seed++) {
			const v = T.prepare(q, rng(seed * 31 + 7));
			const n = v.n;
			ok(v.grid.length === n && v.grid.every((r) => [...r].length === n), q.id + ' #' + seed + ': tablo boyu');
			const g = v.grid.flatMap((r) => [...r]);
			for (const w of v.words) {
				const occ = gecis(g, n, w.w);
				ok(occ.length === 1 && occ[0].r === w.r && occ[0].c === w.c && occ[0].d === w.d, q.id + ' #' + seed + ': ' + w.w + ' tabloda ' + occ.length + ' kez');
				ok(dirs.has(w.d), q.id + ' #' + seed + ': ' + w.w + ' izinsiz yönde ' + w.d);
				used.add(w.d);
			}
			for (const w of KABA) ok(!gecis(g, n, w).length, q.id + ' #' + seed + ': kaba kelime ' + w);
			ok(g.every((ch) => ch && ch === ch.toLocaleUpperCase('tr-TR')), q.id + ' #' + seed + ': boş ya da küçük harf');
			if (seed < 40) {
				// seçim iki uçtan da kabul; bir hücre kaydırılmış seçim reddedilir
				v.words.forEach((w, i) => {
					const [dr, dc] = DIRS[w.d];
					const e = [w.r + dr * (w.len - 1), w.c + dc * (w.len - 1)];
					ok(kelimeOf(v, w.r, w.c, e[0], e[1]) === i && kelimeOf(v, e[0], e[1], w.r, w.c) === i, q.id + ': seçim yönü');
					ok(hat(n, w.r, w.c, e[0], e[1]).length === w.len, q.id + ': hat boyu');
					if (w.len > 2) ok(kelimeOf(v, w.r, w.c, w.r + dr * (w.len - 2), w.c + dc * (w.len - 2)) === -1, q.id + ': eksik seçim kabul edildi');
				});
				ok(kelimeOf(v, 0, 0, 2, 1) === -1, q.id + ': düz olmayan seçim kabul edildi');
				const { good, bad } = T.ornek(v);
				ok(T.judge(v, good).correct && T.judge(v, good).err === 0, q.id + ': doğru cevap');
				ok(!T.judge(v, bad).correct && T.judge(v, bad).err >= 3, q.id + ': boş av');
				// iki kelime: eşit sayıda erken bulan önde
				const two = (t) => ({ s: good.s.slice(0, 2).map((x, k) => [...x.slice(0, 4), t + k]) });
				ok(T.judge(v, two(5)).err < T.judge(v, two(20)).err && T.judge(v, two(20)).err < 2 && T.judge(v, two(5)).err > 1, q.id + ': iki kelime sıralaması');
				// aynı kelimeyi iki kez göndermek iki sayılmaz
				ok(sayim(v, { s: [good.s[0], good.s[0]] }).got.size === 1, q.id + ': tekrar sayıldı');
				const pv = T.publicView(v);
				ok(!pv.words && !JSON.stringify(pv).includes('"r":') && pv.grid.length === n && pv.clues.length === 3, q.id + ': publicView yerleşimi sızdırıyor');
				ok(T.joker('yari', v).first.every(([i, r, c]) => v.words[i].r === r && v.words[i].c === c), q.id + ': joker ilk harfleri');
			}
		}
		// zor örnekte ters yönler gerçekten kullanılıyor; kolayda hiç
		if (q.diff === 3) ok([...used].some((d) => d >= 4), q.id + ': ters yön hiç kullanılmadı');
		if (q.diff === 1) ok([...used].every((d) => d <= 2), q.id + ': kolayda çapraz yukarı/ters yön');
		// bot
		const v = T.prepare(q, rng(5));
		const rate = [0, 0];
		for (let k = 0; k < 600; k++) {
			const skill = k % 2 ? 0.9 : 0.25;
			const b = T.bot(v, skill, rng(4000 + k));
			ok(b.time >= 1 && b.time <= v.sec + 1e-9, q.id + ': bot süresi ' + b.time);
			ok(b.value.s.every((x) => x.length === 5 && x[4] <= b.time + 1e-9 && x[4] >= 0), q.id + ': bot anları');
			const s = sayim(v, b.value);
			rate[k % 2] += s.got.size;
			if (s.got.size === 3) ok(Math.abs(b.time - s.last) < 1e-6, q.id + ': hepsini bulan bot son kelimede cevaplamıyor');
		}
		ok(rate[1] > rate[0] * 1.3, q.id + ': usta bot acemiden belirgin iyi değil ' + rate);
	}
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni5-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
