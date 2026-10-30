// Harita deneme grubu sınaması (Kimim Ben?, Şive Haritası):  node test/deneme-harita.test.mjs
// deneme.test.mjs gibi gövdesini esbuild ile paketleyip çalıştırır (tipler harita verisini JSON olarak içe aktarır).
// Denetler: sözleşme, süre bütçesi (en az 20 sn, hızlı < ortanca ≤ yavaş, belirlenimci), publicView cevabı ve
// sonraki ipuçlarını sızdırmıyor, judge, botlar (süre içinde, usta acemiden iyi), içerik kuralları (Kimim: 15 farklı
// tarz, 5 ipucu, ipucunda il adı yok; Şive: 7 bölge dengeli, il bonusu bölgede, kaba söz yok), kalabalık belirlenimci.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, ORDER, SAMPLES } from './src/quiz/deneme-harita.js';
import { STYLES } from './src/quiz/d_kimim.js';
import { crowd, REGIONS } from './src/quiz/d_sive.js';
import { rng } from './src/core/math.js';
import DATA from './src/data/turkiye.json';

const PROV = DATA.provinces;
const byId = new Map(PROV.map((p) => [p.id, p]));
let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + m);
	}
};
const low = (s) => String(s).toLocaleLowerCase('tr-TR');

ok(ORDER.length === 2 && ORDER.every(([t]) => TYPES[t] && SAMPLES[t]), 'ORDER / TYPES / SAMPLES uyumsuz');
for (const [type, list] of Object.entries(SAMPLES)) {
	const T = TYPES[type];
	ok(T && T.label && (T.kind === 'exact' || T.kind === 'closest') && T.needsMap, type + ': sözleşme');
	for (const f of ['prepare', 'mount', 'judge', 'bot', 'publicView', 'joker', 'fmt', 'sub']) ok(typeof T?.[f] === 'function', type + ': ' + f + '()');
	ok(new Set(list.map((q) => q.id)).size === list.length, type + ': yinelenen id');
	const row = [];
	for (const q of list) {
		const v = T.prepare(q, rng(7));
		ok(Number.isInteger(v.sec) && v.sec >= 20, q.id + ': süre ' + v.sec + ' (en az 20)');
		ok(v.fast < v.med && v.med <= v.slow + 1e-9, q.id + ': hızlı < ortanca ≤ yavaş (' + v.fast + ' ' + v.med + ' ' + v.slow + ')');
		ok(T.prepare(q, rng(9)).sec === v.sec, q.id + ': süre belirlenimci değil');
		ok(JSON.stringify(JSON.parse(JSON.stringify(v))) === JSON.stringify(v), q.id + ': görünüm JSON değil');
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		let good;
		let bad;
		if (type === 'kimim') {
			ok(pv.hedef == null && pv.q.il == null && !pv.q.clues && pv.clues[0] === q.clues[0] && pv.clues.slice(1).every((c) => !c), q.id + ': publicView sızdırıyor');
			ok(q.clues.slice(1).every((c) => !s.includes(c)) && !s.includes(byId.get(q.il).name), q.id + ': publicView sonraki ipucunu ya da adı taşıyor');
			good = { taps: [q.il === 6 ? 34 : 6, q.il], at: 1 };
			bad = { taps: [q.il === 1 ? 2 : 1, q.il === 81 ? 80 : 81], at: 4 };
			ok(T.judge(v, { taps: [q.il], at: 0 }).err < T.judge(v, good).err, q.id + ': erken bilen daha iyi değil');
		} else {
			ok(pv.region == null && pv.ils == null && !pv.q.mean && !pv.q.note && !pv.q.region && !pv.q.ils && pv.q.say === q.say, q.id + ': publicView sızdırıyor');
			good = { il: q.ils[0] };
			bad = { il: PROV.find((p) => p.region !== q.region).id };
			const mid = PROV.find((p) => p.region === q.region && !q.ils.includes(p.id));
			if (mid) ok(T.judge(v, { il: mid.id }).correct && T.judge(v, { il: mid.id }).err > T.judge(v, good).err, q.id + ': il bonusu ayrışmıyor');
		}
		const jg = T.judge(v, good);
		const jb = T.judge(v, bad);
		ok(jg.correct === true, q.id + ': doğru cevap kabul edilmedi ' + JSON.stringify(jg));
		ok(jb.correct === false, q.id + ': yanlış cevap kabul edildi ' + JSON.stringify(jb));
		ok(jg.err < jb.err, q.id + ': doğru cevabın hatası küçük değil');
		ok(T.judge(v, null).correct === false, q.id + ': boş cevap kabul edildi');
		ok(typeof T.fmt(v, good) === 'string' && typeof T.sub(v, good) === 'string', q.id + ': fmt/sub');
		for (const id of ['yari', 'kahin']) ok(T.jokers.includes(id) && T.joker(id, v, rng(3)), q.id + ': joker ' + id);
		const rate = [0, 0];
		for (let k = 0; k < 400; k++) {
			const skill = k % 2 ? 0.9 : 0.2;
			const b = T.bot(v, skill, rng(1000 + k));
			ok(b.time >= 1 && b.time <= v.sec + 1e-9, q.id + ': bot süresi ' + b.time + ' / ' + v.sec);
			const j = T.judge(v, b.value);
			ok(Number.isFinite(j.err), q.id + ': bot cevabı yargılanamadı');
			if (j.correct) rate[k % 2]++;
		}
		ok(rate[1] > rate[0], q.id + ': usta bot acemiden iyi değil (' + rate + ')');
		row.push(q.id.slice(3) + ' ' + v.sec);
	}
	console.log('  ' + type.padEnd(6) + row.join(' · '));
}

// Kimim: en az 15 il, tarzlar dengeli (hepsi kullanılır, sayıları en çok 1 farklı, art arda aynı tarz yok), 5 ipucu,
// il adı ipucunda geçmez
const KM = SAMPLES.kimim;
ok(KM.length >= 15, 'kimim: en az 15 örnek');
const nst = {};
for (const q of KM) nst[q.style] = (nst[q.style] || 0) + 1;
ok(KM.every((q) => STYLES[q.style]) && Object.keys(nst).length === Math.min(KM.length, Object.keys(STYLES).length), 'kimim: tarz tanımsız ya da kullanılmayan tarz var');
ok(Math.max(...Object.values(nst)) - Math.min(...Object.values(nst)) <= 1, 'kimim: tarzlar dengesiz ' + JSON.stringify(nst));
ok(KM.every((q, i) => !i || q.style !== KM[i - 1].style), 'kimim: art arda aynı tarz');
ok(new Set(KM.map((q) => q.il)).size === KM.length, 'kimim: yinelenen il');
for (const q of KM) {
	ok(q.clues.length === 5 && q.clues.every((c) => c.length > 10), q.id + ': 5 dolu ipucu yok');
	const name = low(byId.get(q.il).name);
	ok(q.clues.every((c) => !low(c).includes(name)), q.id + ': ipucunda il adı geçiyor');
	ok(q.clues.every((c) => !(c.match(/\\d+/g) || []).includes(String(q.il))), q.id + ': ipucunda plaka');
}

// Şive: en az 20 söz, 7 bölgeden dengeli, il bonusu bölgede, vurgulu söz, kaba söz yok
const SV = SAMPLES.sive;
ok(SV.length >= 20, 'sive: en az 20 söz');
const per = Object.fromEntries(REGIONS.map((r) => [r, 0]));
for (const q of SV) per[q.region]++;
ok(Object.values(per).every((n) => n >= 2) && Math.max(...Object.values(per)) - Math.min(...Object.values(per)) <= 1, 'sive: bölgeler dengesiz ' + JSON.stringify(per));
const BAN = /(^|[^a-zçğıöşü])(lan|ulan|salak|aptal|gerizekalı|ayı|hıyar|eşek|deyyus|kıro|maganda|köylü)([^a-zçğıöşü]|$)/iu;
for (const q of SV) {
	ok(q.ils.length && q.ils.every((id) => byId.get(id)?.region === q.region), q.id + ': il bonusu bölge dışında');
	ok(/\\[[^\\]]+\\]/.test(q.say) && (q.say.match(/\\[/g) || []).length === (q.say.match(/\\]/g) || []).length, q.id + ': vurgu yok ya da bozuk');
	ok(q.mean?.length && q.note && q.who?.ad, q.id + ': anlam, açıklama ya da karakter eksik');
	ok(!BAN.test(q.say + ' ' + q.note + ' ' + q.mean.flat().join(' ')), q.id + ': kaba/aşağılayıcı söz');
	const v = TYPES.sive.prepare(q, rng(1));
	const c1 = crowd(v);
	ok(c1.length === 60 && JSON.stringify(c1) === JSON.stringify(crowd(TYPES.sive.prepare(q, rng(2)))), q.id + ': kalabalık belirlenimci değil');
	const cnt = {};
	for (const i of c1) cnt[PROV[i].region] = (cnt[PROV[i].region] || 0) + 1;
	const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
	ok(top === q.region, q.id + ': kalabalığın çoğu doğru bölgede değil (' + top + ')');
	const poll = TYPES.sive.joker('kahin', v, rng(1)).poll;
	ok(poll.reduce((s, x) => s + x[1], 0) === 100, q.id + ': seyirci yüzdeleri 100 değil');
	const keep = TYPES.sive.joker('yari', v, rng(4)).keep;
	ok(keep.length === 3 && keep.includes(q.region), q.id + ': yarı yarıya doğru bölgeyi tutmuyor');
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'deneme-harita-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
