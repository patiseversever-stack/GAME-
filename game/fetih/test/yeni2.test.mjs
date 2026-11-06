// YENİ 10 · grup 2 sınaması (Balon Patlat, Kazı Kazan):  node test/yeni2.test.mjs
// Denetler: örnek kimlikleri, kategori ve zorluk; bilgiler oyunun kendi verisiyle (Ege illeri turkiye.json'dan, yapıların
// maketi ve ili SITES'tan); Balon'un uçuş planı (aynı şeritte iki balon hiçbir anda üst üste binmez, hepsi tur bitmeden
// tepeden çıkar, ilk üç balonda bir doğru), sayım (aynı balon bir kez, o an gökte olmayan sayılmaz), bot (süre, değer,
// beceriyle artan başarı); Kazı Kazan'ın puan kuralı, yargısı, botu (usta az kazır) ve CPU resmi (her örnekte gerçekten
// maket çiziliyor, boş ya da tek renk değil). deneme.test.mjs gibi esbuild ile paketler.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-yeni2.js';
import { TUR, sayim } from './src/quiz/d_balon.js';
import { puanOf, PUAN } from './src/quiz/d_kazi.js';
import { modelKur, ciz, TEMA } from './src/quiz/d_kazi_cizim.js';
import { HEROES } from './src/map/hero_index.js';
import { SITES } from './src/map/siteplan.js';
import { CATS } from './src/quiz/categories.js';
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

// ---------------------------------------------------------------- ortak
ok(ORDER.map((o) => o[0]).join() === 'balon,kazi', 'ORDER: balon, kazi');
for (const t of ['balon', 'kazi']) {
	const L = SAMPLES[t] || [];
	ok(L.length === 3, t + ': tam 3 örnek');
	L.forEach((q, i) => {
		ok(q.id === 'yn-' + t + '-' + (i + 1), q.id + ': kimlik yn-' + t + '-' + (i + 1));
		ok(q.diff === i + 1, q.id + ': zorluk ' + (i + 1));
		ok(!!CATS[q.cat], q.id + ': kategori');
		ok(q.type === t, q.id + ': tip');
		ok(!/'/.test(q.q), q.id + ': düz kesme işareti yerine ’');
	});
	ok(new Set(L.map((q) => q.cat)).size >= 2, t + ': örnekler en az iki kategoriden');
}

// ---------------------------------------------------------------- Balon Patlat
const BY_NAME = new Map(DATA.provinces.map((p) => [p.name, p]));
{
	const T = TYPES.balon;
	const ege = SAMPLES.balon[0];
	for (const w of ege.dogru) ok(BY_NAME.get(w)?.region === 'ege', ege.id + ': ' + w + ' Ege Bölgesi’nde değil');
	for (const w of ege.yanlis) ok(BY_NAME.has(w) && BY_NAME.get(w).region !== 'ege', ege.id + ': tuzak ' + w + ' il değil ya da Ege’de');
	const temalar = new Set();
	for (const q of SAMPLES.balon) {
		temalar.add(q.tema);
		const all = [...q.dogru, ...q.yanlis];
		ok(q.dogru.length >= 3 && q.dogru.length <= 4, q.id + ': 3–4 doğru balon');
		ok(all.length >= 8 && all.length <= 10, q.id + ': 8–10 balon');
		ok(new Set(all).size === all.length, q.id + ': etiketler tekil değil');
		ok(all.every((w) => w.split(/\\s+/).every((x) => [...x].length <= 12)), q.id + ': etiket kelimesi 12 harfi aşıyor (balona sığmaz)');
		for (let seed = 1; seed <= 40; seed++) {
			const v = T.prepare(q, rng(seed));
			ok(v.b.length === all.length && v.n === q.dogru.length, q.id + ': plan balon sayısı');
			ok(v.b.slice(0, 3).some((b) => b.ok), q.id + ' #' + seed + ': ilk üç balonda doğru yok');
			ok(v.end <= TUR.son + 1e-6 && v.end + 0.5 < v.sec, q.id + ' #' + seed + ': son balon turun bitiminden önce çıkmıyor (' + v.end + ' / ' + v.sec + ')');
			ok(v.b.every((b) => b.l >= 0 && b.l < TUR.serit && b.d > 3 && b.t >= 0), q.id + ': şerit, süre');
			// aynı şeritte: her an aradaki pay en az 0,38 (uçuş yolu payı) — gövdeler hiç üst üste binmez
			for (let i = 0; i < v.b.length; i++)
				for (let j = i + 1; j < v.b.length; j++) {
					const a = v.b[i];
					const c = v.b[j];
					if (a.l !== c.l) continue;
					for (let t = Math.max(a.t, c.t); t <= Math.min(a.t + a.d, c.t + c.d); t += 0.05) {
						const ua = (t - a.t) / a.d;
						const uc = (t - c.t) / c.d;
						ok(Math.abs(ua - uc) >= 0.375, q.id + ' #' + seed + ': ' + a.w + ' ve ' + c.w + ' aynı şeritte çok yakın (' + Math.abs(ua - uc).toFixed(3) + ')');
					}
				}
		}
		const v = T.prepare(q, rng(3));
		const mid = (b) => Math.round((b.t + b.d / 2) * 100) / 100;
		const okIdx = v.b.map((b, k) => (b.ok ? k : -1)).filter((k) => k >= 0);
		const badIdx = v.b.map((b, k) => (b.ok ? -1 : k)).filter((k) => k >= 0);
		const perfect = T.judge(v, { p: okIdx.map((k) => [k, mid(v.b[k])]) });
		ok(perfect.correct && perfect.err === 0, q.id + ': hepsi doğru → err 0');
		const one = T.judge(v, { p: [[okIdx[0], mid(v.b[okIdx[0]])], [badIdx[0], mid(v.b[badIdx[0]])]] });
		ok(!one.correct && one.err === v.n - 1 + 1, q.id + ': 1 doğru 1 yanlış → err n');
		const dup = T.judge(v, { p: [[okIdx[0], mid(v.b[okIdx[0]])], [okIdx[0], mid(v.b[okIdx[0]])]] });
		ok(dup.ok === 1, q.id + ': aynı balon iki kez sayılıyor');
		const late = T.judge(v, { p: [[okIdx[0], v.b[okIdx[0]].t + v.b[okIdx[0]].d + 3]] });
		ok(late.ok === 0, q.id + ': gökte olmayan balon sayılıyor');
		ok(T.judge(v, { p: [] }).err === v.n, q.id + ': hiç patlatmayan → err n');
		ok(typeof T.fmt(v, { p: [] }) === 'string' && T.sub(v, { p: [] }) === v.n + ' kaçtı', q.id + ': fmt/sub');
		const pv = T.publicView(v);
		ok(pv.b.every((b) => b.ok === undefined) && !pv.q.dogru && !pv.q.yanlis, q.id + ': publicView doğru balonları sızdırıyor');
		// bot: süre ve değer geçerli, usta daha az hata yapar
		const err = [0, 0];
		for (let k = 0; k < 600; k++) {
			const sk = k % 2 ? 0.9 : 0.25;
			const b = T.bot(v, sk, rng(500 + k));
			ok(b.time >= 1.5 && b.time <= v.sec, q.id + ': bot süresi ' + b.time);
			ok(b.value.p.every(([i, t]) => v.b[i] && t >= v.b[i].t && t <= v.b[i].t + v.b[i].d), q.id + ': bot gökte olmayan balonu patlattı');
			err[k % 2] += T.judge(v, b.value).err;
		}
		ok(err[1] < err[0] * 0.75, q.id + ': usta bot belirgin daha iyi değil (' + err + ')');
	}
	ok(temalar.size === 3, 'balon: üç farklı tema');
}

// ---------------------------------------------------------------- Kazı Kazan
const ILI = new Map(SITES.map((s) => [s[0], s[5]]));
{
	const T = TYPES.kazi;
	ok(puanOf(0) === PUAN.tam && puanOf(PUAN.son) === PUAN.taban && puanOf(1) === PUAN.taban, 'kazi: puan kuralı uçları');
	for (let s = 0; s < 1; s += 0.01) ok(puanOf(s + 0.01) <= puanOf(s), 'kazi: puan kazıdıkça artıyor (' + s.toFixed(2) + ')');
	const folyo = new Set();
	const tema = new Set();
	for (const q of SAMPLES.kazi) {
		folyo.add(q.folyo);
		tema.add(q.tema);
		ok(!!HEROES[q.model], q.id + ': maket yok (' + q.model + ')');
		ok(ILI.get(q.model) === q.il, q.id + ': il plakası yapının haritadaki iliyle aynı değil (' + ILI.get(q.model) + ' / ' + q.il + ')');
		ok(new Set(q.a).size === 4 && q.a[0] === q.ad, q.id + ': 4 farklı şık, ilki plakadaki ad');
		ok(!!TEMA[q.tema], q.id + ': tema');
		const v = T.prepare(q, rng(5));
		ok(v.opts[v.right] === q.a[0], q.id + ': doğru şık');
		const g0 = T.judge(v, { i: v.right, s: 0 });
		const g1 = T.judge(v, { i: v.right, s: 0.3 });
		const b0 = T.judge(v, { i: (v.right + 1) % 4, s: 0 });
		ok(g0.err === 0 && g0.score === 100 && g1.err > 0 && g1.err < 1 && b0.err > g1.err && !b0.correct, q.id + ': yargı (az kazıyan önde, yanlış en geride)');
		ok(T.judge(v, { i: 9, s: 0 }).correct === false && T.judge(v, 3).correct === false, q.id + ': geçersiz değer');
		const pv = T.publicView(v);
		ok(pv.right == null && !pv.q.a && !pv.q.ad, q.id + ': publicView cevabı sızdırıyor');
		const sum = [0, 0];
		for (let k = 0; k < 400; k++) {
			const sk = k % 2 ? 0.9 : 0.25;
			const b = T.bot(v, sk, rng(900 + k));
			ok(b.value.s >= 0 && b.value.s <= 0.71 && Number.isInteger(b.value.i), q.id + ': bot değeri ' + JSON.stringify(b.value));
			sum[k % 2] += b.value.s;
		}
		ok(sum[1] < sum[0], q.id + ': usta bot daha az kazımıyor (' + sum.map((x) => (x / 200).toFixed(2)) + ')');
		// resim: küçük bir kartpostal çizilir; maket görünür (gök ve zeminden farklı, renkli pikseller)
		const it = modelKur(q.model);
		let st;
		while (!(st = it.next()).done);
		const g = st.value;
		const geo = { pos: g.getAttribute('position').array, nor: g.getAttribute('normal').array, col: g.getAttribute('col').array, info: g.getAttribute('info').array };
		const K = q.kadraj;
		const L = [Math.cos(K.el) * Math.sin(K.az), Math.sin(K.el), Math.cos(K.el) * Math.cos(K.az)];
		const out = {};
		const r = ciz(geo, { W: 80, H: 56, ss: 1, yaw: K.yaw, pitch: K.pitch, fill: K.fill, box: K.box, panY: K.panY, groundY: K.gy, light: L, theme: { ...TEMA[q.tema], ...(K.ground ? { ground: K.ground } : {}) }, slice: 1e9 }, out);
		while (!r.next().done);
		ok(out.rgba && out.rgba.length === 80 * 56 * 4, q.id + ': resim boyu');
		const cols = new Set();
		let lum = 0;
		let lum2 = 0;
		for (let i = 0; i < out.rgba.length; i += 4) {
			const y = (out.rgba[i] + out.rgba[i + 1] + out.rgba[i + 2]) / 3;
			lum += y;
			lum2 += y * y;
			cols.add((out.rgba[i] >> 4) * 256 + (out.rgba[i + 1] >> 4) * 16 + (out.rgba[i + 2] >> 4));
		}
		const n = out.rgba.length / 4;
		const sd = Math.sqrt(lum2 / n - (lum / n) ** 2);
		ok(sd > 12 && cols.size > 40, q.id + ': resim tekdüze (sd ' + sd.toFixed(1) + ', renk ' + cols.size + ')');
	}
	ok(folyo.size === 3 && tema.size === 3, 'kazi: üç folyo, üç tema');
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni2-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
