// Oyunun kendi verisinden soru defteri sayıları (JSON). node say.mjs > say.json
import { build } from '/home/user/GAME-/game/fetih/node_modules/esbuild/lib/main.js';
const root = '/home/user/GAME-/game/fetih';
const BODY = `
import { BANK } from './src/data/bank.js';
import { TYPES, TYPE_WEIGHTS } from './src/quiz/types.js';
import { DENEME_TYPES, DENEME_ORDER, DENEME_SAMPLES, TAZE_ORDER } from './src/quiz/deneme.js';
import { YENI, BAYRAK, yeniBank, SINIR, CANLI } from './src/quiz/mac.js';
import { CATS } from './src/quiz/categories.js';
const say = (L) => { const c = {}, d = {}; for (const q of L) { c[q.cat] = (c[q.cat] || 0) + 1; d[q.diff] = (d[q.diff] || 0) + 1; } return { n: L.length, cat: c, diff: d }; };
// eski tipler: bankadaki sayı, maçta ağırlığı (her kategori, iki an)
const eski = {};
for (const t of Object.keys(TYPES)) {
	if (DENEME_TYPES[t]) continue;
	let w = 0;
	for (const c of Object.values(TYPE_WEIGHTS)) for (const m of Object.values(c)) w += m[t] || 0;
	eski[t] = { label: TYPES[t].label || t, ...say(BANK.filter((q) => q.type === t)), w };
}
const yb = yeniBank();
const yeni = DENEME_ORDER.map(([t, ad, tanit]) => ({
	t, ad, tanit, taze: TAZE_ORDER.some((o) => o[0] === t),
	...say(DENEME_SAMPLES[t] || []),
	mac: YENI.includes(t), kapali: YENI.includes(t) && BAYRAK[t] === false,
	macSoru: yb.filter((q) => q.type === t).length, sinir: SINIR[t] || null, canli: CANLI.has(t),
}));
const havuz = [...BANK, ...yb].filter((q) => !(YENI.includes(q.type) && BAYRAK[q.type] === false));
console.log(JSON.stringify({ eski, yeni, havuz: say(havuz), banka: say(BANK), cats: Object.fromEntries(Object.entries(CATS).map(([k, v]) => [k, v.name])) }));
`;
const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'say.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
