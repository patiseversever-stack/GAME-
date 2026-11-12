// BİLGİ PARÇASI YİNELEME DENETİMİ: yakin.mjs soru METNİNİ karşılaştırır; aynı bilgi bankada başka tipte (yıldırım
// önermesi, İki Doğru Bir Yalan maddesi, Yanlışı Bul cümlesi ya da açıklaması, balon notu, çengel ipucu, eşleştirme çifti,
// tünel kartı …) sorulmuşsa onu görmez. Bu araç her soruyu "bilgi parçalarına" böler (soru + doğru cevap, her madde, her
// çift, her açıklama) ve yeni soruların parçalarını bankanın bütün parçalarıyla kelime kökü örtüşmesine göre karşılaştırır.
//   node tools/denetim/parca.mjs <kimlik-düzenli-ifadesi> [--en=80] [--hepsi]
//   ör. node tools/denetim/parca.mjs '^spo-ek-.*-4\d{3}$'
// Çıktı tavsiyedir (sezgisel): her satırı oku; aynı BİLGİYİ soruyorsa yeni soruyu değiştir ya da çıkar.
process.chdir(new URL('../..', import.meta.url).pathname);
await import('../../test/kanca.mjs');
const { BANK } = await import('../../src/data/bank.js');
const { yeniBank } = await import('../../src/quiz/mac.js');
const { ALL } = await import('../../src/data/q/index.js');

const args = process.argv.slice(2);
const pat = args.find((a) => !a.startsWith('--'));
if (!pat) {
	console.log("kullanım: node tools/denetim/parca.mjs '<kimlik-düzenli-ifadesi>' [--en=80] [--hepsi]");
	process.exit(2);
}
const re = new RegExp(pat);
const EN = args.includes('--hepsi') ? Infinity : Number(args.find((a) => a.startsWith('--en='))?.slice(5) || 80);

// banka + yeni tipler + bank.js'in metin yüzünden düşürdüğü ham sorular
// otomatik türetilenler (mancınık ikizi dn-mc-<id>, -ek- sorulardan kurulan halat turu dn-ht-ek-*) kaynaklarının kopyası:
// karşılaştırmaya girmez
const turev = (q) => q.src || /^dn-ht-ek-/.test(q.id);
const seen = new Set();
const all = [];
for (const q of [...BANK, ...yeniBank(), ...ALL]) if (!seen.has(q.id) && !turev(q)) seen.add(q.id), all.push(q);

const norm = (s) =>
	String(s ?? '')
		.toLocaleLowerCase('tr-TR')
		.normalize('NFC')
		.replace(/[{}]/g, '')
		.replace(/[^0-9a-zçğıöşüâîû ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
// kalıp ve bağlaç sözcükleri: bilgi taşımaz
const STOP = new Set(
	(
		'bir bu şu o ve ile de da mi mı mu mü ne hangi hangisi hangisidir kim kimdir nedir kaç kaçtır nerede ki için olan olarak ' +
		'en daha çok gibi ise ilk adı adıyla adlı yılında yıl dır dir tır tir dur dür tur tür değildir doğru yanlış ' +
		'sırala sıralayın eşleştir eşleştirin eskiden yeniye yeniden eskiye büyükten küçüğe küçükten büyüğe hangisinin ' +
		'olduğu oldu olur olan olmuştur yaklaşık kadar sonra önce arasında içinde üzerinde tarafından hem her tüm bütün ' +
		'patlat avla yalanı bul düzelt cümlede kelime ikisi biri'
	).split(' '),
);
const kok = (w) => (/^\d+$/.test(w) ? w : w.slice(0, 5));
const kokler = (s) => {
	const out = new Set();
	for (const w of norm(s).split(' ')) {
		if (STOP.has(w)) continue;
		if (/^\d+$/.test(w) ? w.length < 2 : w.length < 3) continue;
		out.add(kok(w));
	}
	return out;
};
const str = (x) => (typeof x === 'string' ? x : typeof x === 'number' ? String(x) : '');
// bir dizi öğesinin metni (nesne, dizi ya da düz değer)
const ogeMetni = (e) =>
	Array.isArray(e) ? e.map(str).join(' ') : e && typeof e === 'object' ? Object.values(e).map(str).join(' ') : str(e);

// soruyu bilgi parçalarına böl
function parcalar(q) {
	const P = [];
	const dogru =
		(Array.isArray(q.a) ? str(q.a[0]) : '') ||
		str(q.w) ||
		(typeof q.ans === 'number' ? String(q.ans) : '') ||
		str(q.ok) ||
		str(q.ad);
	let ana = str(q.q);
	if (q.text) ana += ' ' + str(q.text).replace('___', str(q.a?.[0]));
	if (q.t && q.ok) ana += ' ' + str(q.t).replace(/\{[^}]*\}/, q.ok);
	else if (q.t) ana += ' ' + str(q.t);
	if (q.type === 'odd' && q.opts) ana += ' ' + str(q.opts[q.odd]);
	if (q.type === 'balon' && q.dogru) ana += ' ' + q.dogru.join(' ');
	P.push(ana + ' ' + dogru);
	for (const k of ['n', 'why', 'not', 'b', 'mayin', 'note', 'alt', 'hint']) if (typeof q[k] === 'string') P.push(q[k]);
	for (const k of ['items', 'pairs', 'words', 'f', 'cards', 'anchors', 'duraklar', 'clues', 'mean']) {
		if (!Array.isArray(q[k])) continue;
		for (const e of q[k]) P.push((q.type === 'order' || q.type === 'hilo' ? str(q.q) + ' ' : '') + ogeMetni(e));
	}
	if (q.left && q.right) for (const s of [q.left, q.right]) P.push(str(q.prop) + ' ' + ogeMetni(s));
	return P.map((t) => ({ id: q.id, t, k: kokler(t) })).filter((p) => p.k.size >= 3);
}

const yeni = all.filter((q) => re.test(q.id));
const eski = all.filter((q) => !re.test(q.id));
const E = eski.flatMap(parcalar);
const Y = yeni.flatMap(parcalar);
// ters dizin; çok yaygın kökler (belge sıklığı > 250) eleme dışı
const idx = new Map();
E.forEach((p, i) => {
	for (const k of p.k) (idx.get(k) || idx.set(k, []).get(k)).push(i);
});
const bulgu = [];
for (const p of Y) {
	const say = new Map();
	for (const k of p.k) {
		const l = idx.get(k);
		if (!l || l.length > 250) continue;
		for (const i of l) say.set(i, (say.get(i) || 0) + 1);
	}
	let best = null;
	for (const [i, c] of say) {
		const e = E[i];
		if (e.id === p.id) continue;
		const oran = c / Math.min(p.k.size, e.k.size);
		if (!((c >= 3 && oran >= 0.6) || (c >= 4 && oran >= 0.5))) continue;
		const puan = oran * Math.min(c, 6);
		if (!best || puan > best.puan) best = { e, c, oran, puan };
	}
	if (best) bulgu.push({ p, ...best });
}
// soru başına en güçlü bulgu
const tek = new Map();
for (const b of bulgu) if (!tek.has(b.p.id) || tek.get(b.p.id).puan < b.puan) tek.set(b.p.id, b);
const list = [...tek.values()].sort((a, b) => b.puan - a.puan);
const kisa = (s) => (s.length > 150 ? s.slice(0, 147) + '…' : s);
for (const b of list.slice(0, EN))
	console.log(`PARÇA ${b.p.id} ~ ${b.e.id}  (${b.c} kök, %${Math.round(b.oran * 100)})\n   yeni: ${kisa(b.p.t)}\n   eski: ${kisa(b.e.t)}`);
console.log(`\n${yeni.length} yeni soru, ${Y.length} parça · ${list.length} soruda olası aynı bilgi` + (list.length > EN ? ` (ilk ${EN} gösterildi; --hepsi)` : ''));
