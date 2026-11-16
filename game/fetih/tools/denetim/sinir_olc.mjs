// UZUNLUK ÖLÇÜMÜ: bankadaki (klasik + yeni tipler + galeri örnekleri) her tipin her alanının en uzun değeri ve bölünmeden
// yazılan en uzun kelime; hangi soruda olduğu. --yaz: src/quiz/sinirlar.js içindeki SINIR tablosunu bu değerlerle yeniden yazar
// (ilk kurulum ve bilinçli genişletme için; genişletmeden önce stres denetimi temiz geçmeli).
//   node tools/denetim/sinir_olc.mjs [--yaz] [--json]
import { readFileSync, writeFileSync } from 'node:fs';
process.chdir(new URL('../..', import.meta.url).pathname);
await import('../../test/kanca.mjs');
const { BANK } = await import('../../src/data/bank.js');
const { yeniBank } = await import('../../src/quiz/mac.js');
const { DENEME_SAMPLES } = await import('../../src/quiz/deneme.js');
const { metinler } = await import('../../src/quiz/sinirlar.js');

const L = (s) => [...String(s ?? '')].length;
const seen = new Set();
const all = [];
for (const q of [...BANK, ...yeniBank(), ...Object.values(DENEME_SAMPLES).flat()]) if (!seen.has(q.id)) seen.add(q.id), all.push(q);

const R = {}; // tip → alan → { n, id, s }
for (const q of all) {
	const t = (R[q.type] ??= { _soru: 0 });
	t._soru++;
	for (const [alan, s] of metinler(q)) {
		const n = L(s);
		if (!t[alan] || n > t[alan].n) t[alan] = { n, id: q.id, s };
		if (alan !== 'kelime') {
			for (const w of s.split(/[\s/–—-]+/)) {
				const m = L(w);
				if (!t.uzunKelime || m > t.uzunKelime.n) t.uzunKelime = { n: m, id: q.id, s: w };
			}
		}
	}
}
const ALAN = ['kok', 'sik', 'madde', 'not', 'ipucu', 'metin', 'kelime', 'uzunKelime'];
if (process.argv.includes('--json')) console.log(JSON.stringify(R));
else
	for (const [t, a] of Object.entries(R).sort((x, y) => y[1]._soru - x[1]._soru)) {
		console.log(`${t} (${a._soru} soru)`);
		for (const k of ALAN) if (a[k]) console.log(`   ${k.padEnd(10)} ${String(a[k].n).padStart(4)}  ${a[k].id}  «${a[k].s.length > 70 ? a[k].s.slice(0, 67) + '…' : a[k].s}»`);
	}
if (process.argv.includes('--yaz')) {
	const p = 'src/quiz/sinirlar.js';
	const src = readFileSync(p, 'utf8');
	const rows = Object.keys(R)
		.sort()
		.map((t) => `\t${t}: { ${ALAN.filter((k) => R[t][k]).map((k) => `${k}: ${R[t][k].n}`).join(', ')} },`);
	const out = src.replace(
		/(\t\/\/ SINIR_TABLOSU_BASLA[^\n]*\n)[\s\S]*?(\t\/\/ SINIR_TABLOSU_BITIR)/,
		(_, a, b) => a + rows.join('\n') + '\n' + b,
	);
	if (out === src) throw new Error('SINIR tablosu işaretleri bulunamadı');
	writeFileSync(p, out);
	console.log(`\n${p}: ${rows.length} tip yazıldı`);
}
