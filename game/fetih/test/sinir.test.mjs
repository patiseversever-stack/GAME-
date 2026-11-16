// UZUNLUK SÖZLEŞMESİ (src/quiz/sinirlar.js, SORU-100K.md Aşama 0.1): bankadaki her soru, tipinin ekran denetiminden
// geçmiş uzunluk sınırları içinde mi? Her tipin sözleşmesi var mı? Sınırı aşan soru maça giremez.
//   node test/sinir.test.mjs
await import('./kanca.mjs');
const { BANK } = await import('../src/data/bank.js');
const { yeniBank } = await import('../src/quiz/mac.js');
const { DENEME_SAMPLES } = await import('../src/quiz/deneme.js');
const { SINIR, metinler, ihlaller } = await import('../src/quiz/sinirlar.js');

let checks = 0;
let fails = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + m);
	}
};

const seen = new Set();
const all = [];
for (const q of [...BANK, ...yeniBank(), ...Object.values(DENEME_SAMPLES).flat()]) if (!seen.has(q.id)) seen.add(q.id), all.push(q);

const tipler = new Set(all.map((q) => q.type));
for (const t of tipler) ok(SINIR[t], `${t}: uzunluk sözleşmesi yok (src/quiz/sinirlar.js SINIR)`);
for (const t of Object.keys(SINIR)) {
	ok(SINIR[t].kok > 0 && SINIR[t].uzunKelime > 0, `${t}: kök ya da en uzun kelime sınırı eksik`);
	for (const [k, v] of Object.entries(SINIR[t])) ok(Number.isInteger(v) && v > 0 && v <= 200, `${t}.${k}: sınır ${v} geçersiz`);
}
// sözleşmenin bildiği her alan gerçekten bir sınıra bağlı (metinler() yeni alan döndürürse sınırsız kalmasın)
for (const q of all) {
	for (const [alan] of metinler(q)) ok(SINIR[q.type]?.[alan] != null, `${q.id}: ${q.type}.${alan} alanının sınırı yok`);
	for (const v of ihlaller(q)) ok(false, `${q.id} (${q.type}) ${v.alan} ${v.uzunluk} > ${v.sinir}: «${v.metin}»`);
}

console.log(`# ${all.length} soru, ${tipler.size} tip · ${checks} denetim, ${fails} hata`);
if (fails) process.exitCode = 1;
