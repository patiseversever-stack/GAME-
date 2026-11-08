// Deneme grubu "icat" (Gölge Oyunu) sınaması:  node test/deneme-icat.test.mjs
// deneme.test.mjs ile aynı yol (esbuild ile paketlenip çalıştırılır). Denetler: galeriye kayıt; sözleşme; her örnekte
// süre (en az 20 sn), belirlenimcilik, JSON görünüm, publicView doğru şıkkı ve ilk harfi taşımıyor, judge, probe, botlar
// süre içinde ve usta acemiden iyi. GÖLGE: 99 yapı görseli (dist/yapi) var; ipuçları doğru (Türkiye'de ilin bölgesi
// turkiye.json'dan, yurt dışında kıta, tür, ilk harf = cevabın ilk harfi); dört şıkkın baş harfleri (işaretler yok
// sayılınca da) farklı, yani ilk harf cevabı ayırır; ipuçları sırayla ve film içinde açılır.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-icat.js';
import { DENEME_TYPES, DENEME_ORDER } from './src/quiz/deneme.js';
import { PROFILE } from './src/quiz/timing.js';
import { ipucuOf, IPUCU_AN, filmOf } from './src/quiz/d_golge.js';
import { GOLGELER } from './src/data/ek/golge.js';
import { YAPILAR } from './src/data/ek/kazi.js';
import DATA from './src/data/turkiye.json';
import { existsSync } from 'node:fs';
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

const BOLGE = { akdeniz: 'Akdeniz', guneydogu: 'Güneydoğu Anadolu', ege: 'Ege', dogu: 'Doğu Anadolu', karadeniz: 'Karadeniz', icanadolu: 'İç Anadolu', marmara: 'Marmara' };
const ILB = new Map(DATA.provinces.map((p) => [p.id, p.region]));
const KITA = new Set(['Avrupa', 'Asya', 'Afrika', 'Kuzey Amerika', 'Güney Amerika', 'Okyanusya']);

for (const [t] of ORDER) ok(DENEME_TYPES[t] === TYPES[t] && DENEME_ORDER.some((o) => o[0] === t), t + ': galeriye kayıtlı değil');

for (const [type, list] of Object.entries(SAMPLES)) {
	const T = TYPES[type];
	ok(T && typeof T.time === 'number' && T.label && T.kind === 'exact', type + ': sözleşme');
	for (const f of ['prepare', 'mount', 'judge', 'bot', 'publicView', 'probe']) ok(typeof T?.[f] === 'function', type + ': ' + f + '()');
	ok(PROFILE[type] && PROFILE[type].min >= 20, type + ': süre profili en az 20 sn');
	for (const q of list) {
		const v = T.prepare(q, rng(7));
		ok(Number.isInteger(v.sec) && v.sec >= 20, q.id + ': süre ' + v.sec);
		ok(v.fast < v.med && v.med <= v.slow + 1e-9, q.id + ': hızlı < ortanca ≤ yavaş');
		ok(T.prepare(q, rng(7)).sec === v.sec && T.prepare(q, rng(7)).right === v.right, q.id + ': belirlenimci değil');
		ok(JSON.stringify(JSON.parse(JSON.stringify(v))) === JSON.stringify(v), q.id + ': görünüm JSON değil');
		ok(new Set(q.a).size === 4 && v.opts.length === 4 && v.opts[v.right] === q.a[0], q.id + ': şıklar');
		ok(existsSync('./dist/yapi/' + q.img + '.webp'), q.id + ': görsel yok ' + q.img);
		const pv = T.publicView(v);
		ok(pv.right == null && !pv.q.a && !pv.q.ad && Array.isArray(pv.opts) && pv.opts.length === 4, q.id + ': publicView doğru şıkkı sızdırıyor');
		ok(Array.isArray(pv.ipucu) && pv.ipucu[0] && pv.ipucu[1] && pv.ipucu[2] === '', q.id + ': publicView ilk harfi sızdırıyor');
		const { good, bad } = T.probe(v);
		const jg = T.judge(v, good);
		const jb = T.judge(v, bad);
		ok(jg.correct === true && jb.correct === false && jg.err < jb.err, q.id + ': judge');
		ok(T.judge(v, null).correct === false, q.id + ': boş cevap kabul edildi');
		const rate = [0, 0];
		for (let k = 0; k < 400; k++) {
			const skill = k % 2 ? 0.9 : 0.2;
			const b = T.bot(v, skill, rng(1000 + k));
			ok(b.time >= 1 && b.time <= v.sec + 1e-9, q.id + ': bot süresi ' + b.time);
			ok(Number.isInteger(b.value) && b.value >= 0 && b.value < 4, q.id + ': bot cevabı');
			if (T.judge(v, b.value).correct) rate[k % 2]++;
		}
		ok(rate[1] > rate[0], q.id + ': usta bot acemiden iyi değil');

		// ---------------------------------------------------------------- ipuçları
		const ip = v.ipucu;
		ok(ip.length === 3 && ip.every((x) => typeof x === 'string' && x.length >= 1), q.id + ': üç ipucu');
		ok(ip[2] === [...q.a[0]][0].toLocaleUpperCase('tr'), q.id + ': ilk harf cevabın ilk harfi değil');
		if (q.il) ok(ip[0] === BOLGE[ILB.get(q.il)], q.id + ': bölge ipucu ' + ip[0]);
		else ok(q.ip1 ? ip[0] === q.ip1 : KITA.has(ip[0]), q.id + ': kıta ipucu ' + ip[0]);
		const bas = q.a.map((x) => [...x][0].toLocaleUpperCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace('I', 'I').replace('İ', 'I'));
		ok(new Set(bas.map((c) => c.replace('İ', 'I'))).size === 4, q.id + ': şıkların baş harfleri aynı (' + q.a.join(', ') + ')');
		ok(!/'/.test(JSON.stringify(q)), q.id + ': düz kesme işareti yerine ’');
	}
}
// veri: 99 yapı, görsellerin hepsi, kimlikler tekil, zorluklar karışık
ok(GOLGELER.length === 99 && SAMPLES.golge.length === 99, 'gölge: 99 soru');
ok(new Set(SAMPLES.golge.map((q) => q.id)).size === 99, 'gölge: kimlikler tekil');
ok(GOLGELER.every((g) => YAPILAR.some((y) => y.no === g.no)), 'gölge: her soru bir yapı görseline bağlı');
ok(new Set(SAMPLES.golge.map((q) => q.diff)).size === 3 && new Set(SAMPLES.golge.map((q) => q.cat)).size >= 3, 'gölge: zorluk ve kategori karışık');
// ipuçları sırayla ve filmin içinde; film soru süresinden kısa
ok(IPUCU_AN.every((u, k) => u > 0 && u < 1 && (k === 0 || u > IPUCU_AN[k - 1])), 'gölge: ipucu anları sırasız');
for (const sec of [20, 24, 30]) ok(filmOf(sec) < sec, 'gölge: film süreden uzun (' + sec + ')');

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'icat-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
