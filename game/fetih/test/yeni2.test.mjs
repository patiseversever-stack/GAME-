// YENİ 10 · grup 2 sınaması (Balon Patlat, Kazı Kazan):  node test/yeni2.test.mjs
// Denetler: örnek kimlikleri, kategori ve zorluk; bilgiler oyunun kendi verisiyle (Ege illeri turkiye.json'dan, yapıların
// maketi ve ili SITES'tan); Balon'un uçuş planı (aynı şeritte iki balon hiçbir anda üst üste binmez, hepsi tur bitmeden
// tepeden çıkar, ilk üç balonda bir doğru), sayım (aynı balon bir kez, o an gökte olmayan sayılmaz), bot (süre, değer,
// beceriyle artan başarı); Kazı Kazan'ın puan kuralı, yargısı, botu (usta az kazır), 100 sorusu (görsel dosyası var, il
// plakası turkiye.json'daki adla, şehir/ülke cevabı plakadaki yerle tutarlı, il sorusunun şıkları il) ve otomatik kazıma
// yolu (pencerenin her noktası fırçanın altından geçer). deneme.test.mjs gibi esbuild ile paketler.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-yeni2.js';
import { TUR, sayim } from './src/quiz/d_balon.js';
import { puanOf, PUAN, otoSerit, OTO } from './src/quiz/d_kazi.js';
import { KAZI_SORULAR, YAPILAR } from './src/data/ek/kazi.js';
import { existsSync, statSync } from 'node:fs';
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
	ok(L.length >= 30, t + ': en az 30 soru (' + L.length + ')');
	const nos = L.map((q) => Number(String(q.id).replace('yn-' + t + '-', '')));
	ok(new Set(L.map((q) => q.id)).size === L.length, t + ': kimlikler tekil');
	L.forEach((q) => {
		ok(/^yn-[a-z]+-\\d+$/.test(q.id) && q.id.startsWith('yn-' + t + '-'), q.id + ': kimlik biçimi');
		ok([1, 2, 3].includes(q.diff), q.id + ': zorluk 1–3');
		ok(!!CATS[q.cat], q.id + ': kategori');
		ok(q.type === t, q.id + ': tip');
		ok(!/'/.test(JSON.stringify(q)), q.id + ': düz kesme işareti yerine ’');
	});
	ok(nos.includes(1) && (nos.includes(2) || t === 'kazi') && nos.includes(3), t + ': eski kimlikler yerinde (Kazı 2 = Kız Kulesi çıkarıldı)');
	ok(new Set(L.map((q) => q.cat)).size >= 3, t + ': sorular en az üç kategoriden');
	ok(new Set(L.map((q) => q.diff)).size === 3, t + ': üç zorluk da var');
}

// ---------------------------------------------------------------- Balon Patlat
const BY_NAME = new Map(DATA.provinces.map((p) => [p.name, p]));
{
	const T = TYPES.balon;
	const ege = SAMPLES.balon[0];
	for (const w of ege.dogru) ok(BY_NAME.get(w)?.region === 'ege', ege.id + ': ' + w + ' Ege Bölgesi’nde değil');
	for (const w of ege.yanlis) ok(BY_NAME.has(w) && BY_NAME.get(w).region !== 'ege', ege.id + ': tuzak ' + w + ' il değil ya da Ege’de');
	// yn-balon-52: Güneydoğu Anadolu illeri (bölge turkiye.json'dan)
	const gd = SAMPLES.balon.find((q) => q.id === 'yn-balon-52');
	for (const w of gd.dogru) ok(BY_NAME.get(w)?.region === 'guneydogu', gd.id + ': ' + w + ' Güneydoğu’da değil');
	for (const w of gd.yanlis) ok(BY_NAME.has(w) && BY_NAME.get(w).region !== 'guneydogu', gd.id + ': tuzak ' + w + ' il değil ya da Güneydoğu’da');
	const temalar = new Set();
	for (const q of SAMPLES.balon) {
		temalar.add(q.tema);
		const all = [...q.dogru, ...q.yanlis];
		ok(q.dogru.length >= 3 && q.dogru.length <= 4, q.id + ': 3–4 doğru balon');
		ok(all.length >= 8 && all.length <= 10, q.id + ': 8–10 balon');
		ok(typeof q.not === 'string' && q.not.length >= 20 && [...q.not].length <= 92, q.id + ': açıklama satırı yok ya da uzun (' + [...(q.not || '')].length + ')');
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
	ok(temalar.size >= 3, 'balon: en az üç farklı tema');
}

// ---------------------------------------------------------------- Kazı Kazan
{
	const T = TYPES.kazi;
	const IL_ADI = new Map(DATA.provinces.map((p) => [p.id, p.name]));
	const IL_SET = new Set(DATA.provinces.map((p) => p.name));
	ok(puanOf(0) === PUAN.tam && puanOf(PUAN.son) === PUAN.taban && puanOf(1) === PUAN.taban, 'kazi: puan kuralı uçları');
	for (let s = 0; s < 1; s += 0.01) ok(puanOf(s + 0.01) <= puanOf(s), 'kazi: puan kazıdıkça artıyor (' + s.toFixed(2) + ')');
	// 99 yapı (05 Kız Kulesi çıkarıldı), kimlikler 1–100 içinde 2 boş
	const NOS = Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => n !== 5);
	ok(YAPILAR.length === 99 && YAPILAR.every((y, i) => y.no === NOS[i]), 'kazi: 99 yapı, görsel sırası (05 yok)');
	const IDS = Array.from({ length: 100 }, (_, i) => 'yn-kazi-' + (i + 1)).filter((x) => x !== 'yn-kazi-2');
	ok(KAZI_SORULAR.length === 99 && KAZI_SORULAR.every((q, i) => q.id === IDS[i]), 'kazi: kimlikler yn-kazi-1…100 (2 boş)');
	ok(SAMPLES.kazi === KAZI_SORULAR, 'kazi: havuz bütün sorular');
	const eski = { 'yn-kazi-1': 'Truva Atı', 'yn-kazi-3': 'Nemrut Dağı' };
	for (const [id, ad] of Object.entries(eski)) ok(KAZI_SORULAR.find((q) => q.id === id)?.ad === ad, id + ': eski kimlik ' + ad + ' değil');
	const folyo = new Set();
	const tema = new Set();
	for (const q of KAZI_SORULAR) {
		folyo.add(q.folyo);
		tema.add(q.tema);
		const no = Number(q.img);
		const f = './dist/yapi/' + q.img + '.webp';
		ok(existsSync(f) && statSync(f).size > 4000 && statSync(f).size < 80000, q.id + ': görsel yok ya da boyu tuhaf (' + f + ')');
		ok(new Set(q.a).size === 4 && q.a.every((x) => typeof x === 'string' && x.trim() === x && x.length >= 1 && [...x].length <= 26), q.id + ': 4 farklı, kısa şık');
		ok(typeof q.ad === 'string' && q.ad.length > 1 && typeof q.alt === 'string' && q.alt.length > 3 && [...q.alt].length <= 48, q.id + ': plaka adı ve bilgi satırı');
		ok(/\\?$/.test(q.q) && [...q.q].length <= 46, q.id + ': soru cümlesi');
		ok({ 1: 'gumus', 2: 'altin', 3: 'holo' }[q.diff] === q.folyo, q.id + ': folyo zorluğu söylemiyor');
		ok(['gunduz', 'batim', 'gece'].includes(q.tema), q.id + ': tema');
		if (no <= 40) {
			ok(IL_ADI.has(q.il) && !q.yer, q.id + ': Türkiye yapısının il plakası');
			if (/hangi ilimizde\\?$/.test(q.q)) {
				ok(q.a[0] === IL_ADI.get(q.il), q.id + ': il sorusunun cevabı plakadaki il değil (' + q.a[0] + ' / ' + IL_ADI.get(q.il) + ')');
				ok(q.a.every((x) => IL_SET.has(x)), q.id + ': il sorusunun şıkları il değil');
			}
		} else ok(!q.il && typeof q.yer === 'string' && q.yer.length > 2, q.id + ': yurt dışı yapının yeri');
		// "hangi şehirde/ülkede" sorularında cevap plakadaki yerin bir parçası; yapı sorusunda cevabın ilk kelimesi adda geçer
		if (/hangi (şehirde|ülkede)\\?$/.test(q.q)) ok((q.yer || '').split(' · ').includes(q.a[0]), q.id + ': cevap (' + q.a[0] + ') plakadaki yerde (' + q.yer + ') yok');
		if (q.q === 'Folyonun altında hangi yapı var?') ok(q.ad.includes(q.a[0].split(' ')[0]), q.id + ': cevap (' + q.a[0] + ') plakadaki adla (' + q.ad + ') uyuşmuyor');
	}
	ok(folyo.size === 3 && tema.size === 3, 'kazi: üç folyo, üç tema');
	for (const q of SAMPLES.kazi) {
		const v = T.prepare(q, rng(5));
		ok(v.opts[v.right] === q.a[0], q.id + ': doğru şık');
		const g0 = T.judge(v, { i: v.right, s: 0 });
		const g1 = T.judge(v, { i: v.right, s: 0.3 });
		const b0 = T.judge(v, { i: (v.right + 1) % 4, s: 0 });
		ok(g0.err === 0 && g0.score === 100 && g1.err > 0 && g1.err < 1 && b0.err > g1.err && !b0.correct, q.id + ': yargı (az kazıyan önde, yanlış en geride)');
		ok(T.judge(v, { i: 9, s: 0 }).correct === false && T.judge(v, 3).correct === false, q.id + ': geçersiz değer');
		const pv = T.publicView(v);
		ok(pv.right == null && !pv.q.a && !pv.q.ad && !pv.q.yer && !pv.q.il && !pv.q.alt, q.id + ': publicView cevabı sızdırıyor');
	}
	// bot: değer geçerli, usta daha az kazır (üç zorlukta birer soru)
	for (const d of [1, 2, 3]) {
		const q = SAMPLES.kazi.find((x) => x.diff === d);
		const v = T.prepare(q, rng(7));
		const sum = [0, 0];
		for (let k = 0; k < 400; k++) {
			const sk = k % 2 ? 0.9 : 0.25;
			const b = T.bot(v, sk, rng(900 + k));
			ok(b.value.s >= 0 && b.value.s <= 0.71 && Number.isInteger(b.value.i), q.id + ': bot değeri ' + JSON.stringify(b.value));
			sum[k % 2] += b.value.s;
		}
		ok(sum[1] < sum[0], q.id + ': usta bot daha az kazımıyor (' + sum.map((x) => (x / 200).toFixed(2)) + ')');
	}
	// otomatik kazıma: 6 ışık bıçağının sildiği bantlar (yarı genişlik hw · 0,96) pencerenin her noktasını kapsar, folyo
	// hiç ada bırakmaz; bıçaklar sırayla soldan ve sağdan girer, toplam süre cevap filmine sığar
	ok(OTO.n === 6 && OTO.sarj + (OTO.n - 1) * OTO.ara + OTO.sure + OTO.son <= 1600, 'kazi: otomatik kazıma 1,6 sn içinde bitmiyor');
	for (const [w, h] of [[300, 180], [270, 100], [380, 260], [600, 330], [200, 300]]) {
		const S = otoSerit(w, h);
		ok(S.length === 6 && S.every((s) => s.hw > 0), 'kazi: altı kesiş');
		let worst = -Infinity;
		for (let y = 0; y <= h; y += 3)
			for (let x = 0; x <= w; x += 3) {
				let best = -Infinity; // bandın içinde ne kadar (pay; artı: içeride)
				for (const s of S) {
					const [ax, ay] = s.a;
					const dx = s.b[0] - ax;
					const dy = s.b[1] - ay;
					const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
					best = Math.max(best, s.hw * 0.96 - Math.hypot(x - ax - t * dx, y - ay - t * dy));
				}
				worst = Math.max(worst, -best);
			}
		ok(worst < 0, 'kazi: otomatik kazıma ' + w + 'x' + h + ' penceresinde ' + worst.toFixed(1) + ' px folyo bırakıyor');
	}
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni2-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
