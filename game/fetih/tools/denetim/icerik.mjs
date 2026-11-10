// İÇERİK DENETİMİ: soru metinlerinin yazım düzeni ve tutarlılığı (testlerin yapı denetiminin üstüne).
//   node tools/denetim/icerik.mjs [--hepsi]   (öntanımlı: her bulgu türünden en çok 25 örnek)
// Bakılanlar: yinelenen soru (aynı tip, aynı metin + aynı cevap), cevabın soru metninde geçmesi (ele veren soru), şıkların
// büyük/küçük harf ve şapka farkıyla aynı olması, çift boşluk, noktalamadan önce boşluk, virgül/noktadan sonra boşluk yok,
// eşleşmeyen parantez ve tırnak, baştaki/sondaki boşluk, sık yazım yanlışları, sayı sorusunda cevap aralık dışı.
import { build } from 'esbuild';
const root = new URL('../../', import.meta.url).pathname;
const BODY = `
import { BANK } from './src/data/bank.js';
import { DENEME_SAMPLES } from './src/quiz/deneme.js';
export const ALL = [...BANK, ...Object.values(DENEME_SAMPLES).flat()];
`;
const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'icerik.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const { ALL } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const HEPSI = process.argv.includes('--hepsi');

const norm = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`´]/g, "'").replace(/\s+/g, ' ').trim();
const bul = new Map();
const add = (k, q, msg) => {
	if (!bul.has(k)) bul.set(k, []);
	bul.get(k).push(`${q.id} (${q.type}): ${msg}`);
};
// bir sorunun bütün yazıları: [alan, metin]
function yazilar(q) {
	const L = [];
	const p = (k, s) => typeof s === 'string' && L.push([k, s]);
	p('q', q.q);
	p('text', q.text);
	if (Array.isArray(q.a)) q.a.forEach((s, i) => p('a' + i, s));
	if (Array.isArray(q.opts)) q.opts.forEach((s, i) => p('o' + i, s));
	if (Array.isArray(q.items)) q.items.forEach((x, i) => p('i' + i, typeof x === 'string' ? x : x?.t));
	if (Array.isArray(q.pairs)) q.pairs.forEach((x, i) => (p('p' + i, x?.[0]), p('p' + i + 'b', x?.[1])));
	for (const k of ['left', 'right']) if (q[k]?.t) p(k, q[k].t);
	for (const k of ['prop', 'not', 'unit', 'w', 'mayin', 'say', 'mean', 'note']) p(k, q[k]);
	if (Array.isArray(q.hints)) q.hints.forEach((s, i) => p('h' + i, s));
	if (Array.isArray(q.clues)) q.clues.forEach((s, i) => p('c' + i, typeof s === 'string' ? s : s?.c));
	if (Array.isArray(q.facts)) q.facts.forEach((s, i) => p('f' + i, typeof s === 'string' ? s : s?.t));
	if (Array.isArray(q.words)) q.words.forEach((w, i) => (Array.isArray(w) ? (p('w' + i, w[0]), p('wc' + i, w[1])) : p('w' + i, w?.w)));
	if (Array.isArray(q.cards)) q.cards.forEach((c, i) => p('k' + i, Array.isArray(c) ? c[0] : c?.t));
	if (Array.isArray(q.dogru)) q.dogru.forEach((s, i) => p('d' + i, s));
	if (Array.isArray(q.yanlis)) q.yanlis.forEach((s, i) => p('y' + i, s));
	return L;
}
const YAZIM = [
	[/\bbirşey/i, 'birşey → bir şey'], [/\bherşey/i, 'herşey → her şey'], [/\bhiçbirşey/i, 'hiçbirşey → hiçbir şey'],
	[/\byada\b/i, 'yada → ya da'], [/\bherkez\b/i, 'herkez → herkes'], [/\byanlız\b/i, 'yanlız → yalnız'],
	[/\bşuanda?\b/i, 'şuan → şu an'], [/\bmalesef\b/i, 'malesef → maalesef'], [/\bpekçok\b/i, 'pekçok → pek çok'],
	[/\bdeğilmi\b/i, 'değilmi → değil mi'], [/\bbirsürü\b/i, 'birsürü → bir sürü'], [/\byalnış/i, 'yalnış → yanlış'],
	[/\bherhangibir\b/i, 'herhangibir → herhangi bir'], [/\bhiç bir\b/i, 'hiç bir → hiçbir'], [/\bbirkaç tane\b/i, null],
	[/\borjinal/i, 'orjinal → orijinal'], [/\bsupriz/i, 'supriz → sürpriz'], [/\byanlız/i, 'yanlız → yalnız'],
	[/\bkirpi̇/i, null], [/\bperşembe/i, null], [/\bacaba\b/i, null], [/\bkaç tane\b/i, null],
	[/\bşöför/i, 'şöför → şoför'], [/\bmüsade\b/i, 'müsade → müsaade'], [/\bcereyan/i, null], [/\bsarımsak\b/i, null],
	[/\bhergün\b/i, 'hergün → her gün'], [/\bbirgün\b/i, 'birgün → bir gün'], [/\bbiraz önce\b/i, null],
	[/\bmerkezi\b/i, null],
].filter(([, m]) => m);
const ids = new Map();
const seen = new Map();
for (const q of ALL) {
	if (ids.has(q.id)) add('kimlik', q, 'yinelenen kimlik (' + ids.get(q.id) + ')');
	ids.set(q.id, q.type);
	// yinelenen soru: aynı tip, aynı metin ve aynı cevap (aynı metinli farklı cevaplı sorular meşru olabilir: "Hangisi ...?")
	// içerik: kimlik, kategori, zorluk dışındaki bütün alanlar (Karşılaştır ve Atasözü'nde aynı soru kalıbı farklı içerik taşır)
	const { id: _i, cat: _c, diff: _d, src: _s, ...icerik } = q;
	const k = norm(JSON.stringify(icerik));
	if (seen.has(k)) add('yinelenen', q, '= ' + seen.get(k) + ' «' + String(q.q || q.text).slice(0, 60) + '»');
	else seen.set(k, q.id);
	for (const [alan, s] of yazilar(q)) {
		if (s !== s.trim()) add('bosluk', q, `${alan} başta/sonda boşluk «${s}»`);
		if (/ {2,}/.test(s)) add('bosluk', q, `${alan} çift boşluk «${s}»`);
		if (/\s[,.;:!?](?!\.\.)/.test(s) && !/\s\.\.\./.test(s)) add('noktalama', q, `${alan} noktalamadan önce boşluk «${s}»`);
		if (/[,;](?=[A-Za-zÇĞİÖŞÜçğıöşü])/.test(s)) add('noktalama', q, `${alan} virgülden sonra boşluk yok «${s}»`);
		if (/[a-zçğıöşü]\.(?=[A-ZÇĞİÖŞÜ][a-zçğıöşü])/.test(s)) add('noktalama', q, `${alan} noktadan sonra boşluk yok «${s}»`);
		if (/(?<!\.)\.\.(?!\.)/.test(s)) add('noktalama', q, `${alan} iki nokta «${s}»`);
		const par = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
		if (par) add('parantez', q, `${alan} eşleşmeyen parantez «${s}»`);
		const dq = (s.match(/"/g) || []).length;
		const ac = (s.match(/[“«]/g) || []).length;
		const kp = (s.match(/[”»]/g) || []).length;
		if (dq % 2 || ac !== kp) add('tirnak', q, `${alan} eşleşmeyen tırnak «${s}»`);
		for (const [re, m] of YAZIM) if (re.test(s)) add('yazim', q, `${alan} ${m} «${s}»`);
		if (/[a-zçğıöşü]I|I[a-zçğıöşü]/.test(s.replace(/\b[A-Z][A-Za-z]*\b/g, '')) && /ı/.test(s) === false && /[a-z]I[a-z]/.test(s)) add('harf', q, `${alan} kelime içinde büyük I «${s}»`);
		if (/�|Ã|Ä±|Å/.test(s)) add('kodlama', q, `${alan} bozuk karakter «${s}»`);
	}
	// şıklar: büyük/küçük harf, şapka, kesme farkıyla aynı
	const sik = q.a || q.opts;
	if (Array.isArray(sik) && sik.every((x) => typeof x === 'string')) {
		const n = sik.map(norm);
		const nk = sik.map((x) => String(x).toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim()); // Türkçede şapkasız harf başka harf (Ç/C)
		if (new Set(nk).size !== nk.length) add('sik', q, 'şıklar yazım farkıyla aynı: ' + sik.join(' | '));
		// ele veren soru: doğru şık (a[0]) metinde geçiyor, yanlışların hiçbiri geçmiyor
		const qq = norm(q.q);
		if (q.a && n[0].length >= 4 && qq.includes(n[0]) && !n.slice(1).some((x) => x.length >= 4 && qq.includes(x))) add('ele-veren', q, `doğru cevap «${sik[0]}» soru metninde: «${q.q}»`);
	}
	if (q.type === 'num' && Number.isFinite(q.ans) && !(q.min <= q.ans && q.ans <= q.max)) add('sayi', q, `cevap ${q.ans} aralık dışında [${q.min}, ${q.max}]`);
	if (q.type === 'mancinik' && Number.isFinite(q.ans) && !(q.min <= q.ans && q.ans <= q.max)) add('sayi', q, `cevap ${q.ans} aralık dışında [${q.min}, ${q.max}]`);
	if (q.type === 'choice' && q.q && !/[?!:…]$|\.\.\.$|_+$/.test(q.q.trim()) && !/\.$/.test(q.q.trim())) add('soru-sonu', q, `soru işaretsiz bitiyor «${q.q}»`);
}
let top = 0;
for (const [k, L] of [...bul].sort((a, b) => b[1].length - a[1].length)) {
	top += L.length;
	console.log(`\n== ${k}: ${L.length}`);
	for (const x of HEPSI ? L : L.slice(0, 25)) console.log('  ' + x);
}
console.log(`\n${ALL.length} soru tarandı; toplam ${top} bulgu`);
