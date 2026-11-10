// Deneme soru tipleri sınaması (YENİ · deneme, yalnız soru galerisi):  node test/deneme.test.mjs
// Tipler harita verisini (src/data/turkiye.json) içe aktardığı için düz node yetmez: sınama kendi gövdesini
// esbuild ile paketleyip çalıştırır (derleme betiğiyle aynı araç; ek bağımlılık yok).
// Denetler: sözleşme; her örnek soruda prepare (süre bütçesi tam sn, hızlı < ortanca ≤ yavaş, belirlenimci, görünüm
// JSON), çevrimiçi görünüm (publicView) cevabı taşımıyor, judge doğruyu kabul edip yanlışı reddediyor, botlar süre
// içinde ve geçerli cevap üretiyor; bağlantı duvarlarında 12 farklı taş ve grupların tek çözümü.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { DENEME_TYPES, DENEME_SAMPLES } from './src/quiz/deneme.js';
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

for (const [type, list] of Object.entries(DENEME_SAMPLES)) {
	const T = DENEME_TYPES[type];
	ok(T && typeof T.time === 'number' && T.label && (T.kind === 'exact' || T.kind === 'closest'), type + ': sözleşme');
	for (const f of ['prepare', 'mount', 'judge', 'bot', 'publicView']) ok(typeof T?.[f] === 'function', type + ': ' + f + '()');
	const row = [];
	for (const q of list) {
		const v = T.prepare(q, rng(7));
		ok(Number.isInteger(v.sec) && v.sec > 0, q.id + ': süre ' + v.sec);
		ok(v.fast < v.med && v.med <= v.slow + 1e-9, q.id + ': hızlı < ortanca ≤ yavaş (' + v.fast + ' ' + v.med + ' ' + v.slow + ')');
		ok(T.prepare(q, rng(7)).sec === v.sec, q.id + ': süre belirlenimci değil');
		ok(JSON.stringify(JSON.parse(JSON.stringify(v))) === JSON.stringify(v), q.id + ': görünüm JSON değil');
		// çevrimiçi görünüm cevabı taşımamalı
		const pv = T.publicView(v);
		const s = JSON.stringify(pv);
		if (type === 'kusbakisi') ok(pv.right == null && !pv.q.a && pv.q.il == null && Array.isArray(pv.opts), q.id + ': publicView cevabı sızdırıyor');
		if (type === 'ilavi') ok(pv.hedef == null && pv.q.il == null && !pv.q.hints && pv.hints.slice(1).every((h) => !h) && pv.sil, q.id + ': publicView gizli ili sızdırıyor');
		// doğru ve yanlış cevap
		let good;
		let bad;
		if (type === 'kusbakisi') {
			good = v.right;
			bad = (v.right + 1) % 4;
			ok(new Set(q.a).size === 4, q.id + ': şıklar farklı değil');
		} else if (type === 'ilavi') {
			good = { taps: [q.il] };
			bad = { taps: [6, 34, 35, 1].filter((id) => id !== q.il) };
		} else if (typeof T.ornek === 'function') ({ good, bad } = T.ornek(v)); // ek gruplar: tipin kendi doğru/yanlış örneği
		else if (typeof T.sinama === 'function') ({ good, bad } = T.sinama(v, q)); // aynı kanca, öbür ad
		else if (typeof T.probe === 'function') ({ good, bad } = T.probe(v)); // aynı kanca, üçüncü ad
		const jg = T.judge(v, good);
		const jb = T.judge(v, bad);
		ok(jg.correct === true, q.id + ': doğru cevap kabul edilmedi ' + JSON.stringify(jg));
		ok(jb.correct === false, q.id + ': yanlış cevap kabul edildi ' + JSON.stringify(jb));
		ok(jg.err < jb.err, q.id + ': doğru cevabın hatası küçük değil (' + jg.err + ' / ' + jb.err + ')');
		ok(T.judge(v, null).correct === false, q.id + ': boş cevap kabul edildi');
		if (typeof T.fmt === 'function') ok(typeof T.fmt(v, good, jg) === 'string' && typeof T.sub(v, good, jg) === 'string', q.id + ': fmt/sub');
		// botlar: süre içinde, geçerli ve beceriyle artan doğruluk
		const rate = [0, 0];
		for (let k = 0; k < 400; k++) {
			const skill = k % 2 ? 0.9 : 0.2;
			const b = T.bot(v, skill, rng(1000 + k));
			ok(b.time >= 1 && b.time <= v.sec + 1e-9, q.id + ': bot süresi ' + b.time + ' / ' + v.sec);
			const j = T.judge(v, b.value);
			ok(Number.isFinite(j.err), q.id + ': bot cevabı yargılanamadı ' + JSON.stringify(b.value));
			if (j.correct) rate[k % 2]++;
		}
		ok(rate[1] > rate[0], q.id + ': usta bot acemiden iyi değil (' + rate + ')');
		row.push(q.id.slice(3) + ' ' + v.sec + ' sn');
	}
	console.log('  ' + type.padEnd(10) + row.join(' · '));
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'deneme-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
