// node sayim.mjs <proje kökü> → JSON: tip × kategori × zorluk sayımı (banka + yeni tip örnekleri)
const root = process.argv[2];
process.chdir(root);
await import(root + '/test/kanca.mjs');
const { BANK } = await import(root + '/src/data/bank.js');
const { yeniBank } = await import(root + '/src/quiz/mac.js');
const all = [...BANK, ...yeniBank()];
const out = { toplam: all.length, tip: {}, kat: {}, zor: { 1: 0, 2: 0, 3: 0 }, tipkat: {}, veri: all.filter((q) => /^cog-vr-/.test(q.id)).length };
for (const q of all) {
	out.tip[q.type] = (out.tip[q.type] || 0) + 1;
	out.kat[q.cat] = (out.kat[q.cat] || 0) + 1;
	out.zor[q.diff] = (out.zor[q.diff] || 0) + 1;
	(out.tipkat[q.type] ||= {})[q.cat] = (out.tipkat[q.type][q.cat] || 0) + 1;
}
console.log(JSON.stringify(out));
