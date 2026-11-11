// YAKIN YİNELEME DENETİMİ: yeni yazılan soruları bütün bankayla (klasik banka + yeni tiplerin örnekleri) karşılaştırır.
//   node tools/denetim/yakin.mjs <kimlik-düzenli-ifadesi> [--esik=0.5]
//   ör. node tools/denetim/yakin.mjs '^tar-ek-.*-2\d{3}$'      (yalnız bu kimlikler "yeni" sayılır)
// Bildirir:
//   AYNI     metin aynı (büyük/küçük harf, noktalama yok sayılır)
//   KARDEŞ   aynı bilgiyi soruyor (src/quiz/hafiza.js kardes(): aynı doğru cevap, aynı il, aynı atasözü …)
//   BENZER   soru metinlerinin anlamlı kelimeleri büyük ölçüde ortak (Jaccard ≥ eşik)
// KARDEŞ her zaman hata değildir (aynı cevaba farklı açıdan soru olabilir), ama aynı bilgiyi tekrar soruyorsa yeni soru
// değiştirilmeli. Çıkış kodu: AYNI varsa 1.
process.chdir(new URL('../..', import.meta.url).pathname);
await import('../../test/kanca.mjs');
const { BANK } = await import('../../src/data/bank.js');
const { yeniBank } = await import('../../src/quiz/mac.js');
const { kardes } = await import('../../src/quiz/hafiza.js');

const [pat, ...rest] = process.argv.slice(2);
if (!pat) {
	console.log('kullanım: node tools/denetim/yakin.mjs <kimlik-düzenli-ifadesi> [--esik=0.5]');
	process.exit(2);
}
const esik = Number(rest.find((a) => a.startsWith('--esik='))?.slice(7) || 0.5);
const re = new RegExp(pat);
const all = [...BANK, ...yeniBank()];
// bank.js aynı metni bir kez alır: düşürülen yeni soruları da görmek için ham kaynak listeler
const { ALL } = await import('../../src/data/q/index.js');
const inBank = new Set(all.map((q) => q.id));
const dropped = ALL.filter((q) => re.test(q.id) && !inBank.has(q.id));

const norm = (s) =>
	String(s ?? '')
		.toLocaleLowerCase('tr-TR')
		.normalize('NFC')
		.replace(/[^0-9a-zçğıöşüâîû ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
const STOP = new Set('bir bu şu o ve ile de da mi mı mu mü ne hangi hangisi hangisidir kim kimdir nedir kaç kaçtır nerede ki için olan olarak en daha çok gibi ise ilk adı adıyla adlı türk türkiye yılında yıl hangi̇ dır dir tır tir dur dür tur tür'.split(' '));
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
const text = (q) => [q.q, q.t, q.text, q.w, ...(q.f || []).map((x) => x.t)].filter(Boolean).join(' ');
const jac = (a, b) => {
	if (!a.size || !b.size) return 0;
	let n = 0;
	for (const x of a) if (b.has(x)) n++;
	return n / (a.size + b.size - n);
};

const yeni = all.filter((q) => re.test(q.id));
const eski = all.filter((q) => !re.test(q.id));
const W = new Map(all.map((q) => [q.id, words(text(q))]));
const byText = new Map();
for (const q of eski) byText.set(q.type + '|' + norm(text(q)), q);
const byK = new Map();
for (const q of eski) {
	const k = kardes(q);
	if (k) (byK.get(k) || byK.set(k, []).get(k)).push(q);
}

let ayni = 0;
let kard = 0;
let benz = 0;
const out = [];
const show = (q) => `${q.id} [${q.type}] ${String(text(q)).slice(0, 90)}`;
for (const q of dropped) {
	ayni++;
	out.push(`AYNI     ${show(q)}\n         bank.js bu soruyu almadı (aynı metin ya da yinelenme anahtarı bankada var)`);
}
const seenNew = new Map();
for (const q of yeni) {
	const tk = q.type + '|' + norm(text(q));
	const same = byText.get(tk) || seenNew.get(tk);
	if (same) {
		ayni++;
		out.push(`AYNI     ${show(q)}\n      ↔  ${show(same)}`);
	}
	seenNew.set(tk, q);
	const k = kardes(q);
	if (k && byK.has(k)) {
		kard++;
		out.push(`KARDEŞ   ${show(q)}\n      ↔  ${byK.get(k).slice(0, 3).map(show).join('\n      ↔  ')}`);
	}
	const w = W.get(q.id);
	let best = null;
	let bj = 0;
	for (const o of all) {
		if (o.id === q.id) continue;
		const j = jac(w, W.get(o.id));
		if (j > bj) {
			bj = j;
			best = o;
		}
	}
	if (bj >= esik) {
		benz++;
		out.push(`BENZER   ${bj.toFixed(2)} ${show(q)}\n      ↔  ${show(best)}`);
	}
}
console.log(out.join('\n'));
console.log(`\nyeni: ${yeni.length} soru (${pat}) · AYNI ${ayni} · KARDEŞ ${kard} · BENZER ${benz} (eşik ${esik})`);
process.exit(ayni ? 1 : 0);
