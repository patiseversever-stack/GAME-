// PİLOT AİLE: ünlü kişinin doğum yılı, "kim daha yakın" tahmin sorusu (SORU-100K.md Aşama 1).
//   node tools/veri/pilot/kisi.mjs        → src/data/q/wd/dogum.js + rapor
// Doğum yılı Wikidata'dan (tools/veri/ham/kisiler.json, kisiler_tr.json; tartışmalı işaretliler alınmaz). Kim sorulacak,
// hangi kategoride ve adın önündeki tanım elle seçilir (kisi_secim.txt): Wikidata'nın meslek alanı tanım için yanıltıcı
// (Ronald Reagan "oyuncu"). Kimlik: <kat>-wd-dogum-<Q>.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
process.chdir(new URL('../../..', import.meta.url).pathname);
await import('../../../test/kanca.mjs');
const { ihlaller } = await import('../../../src/quiz/sinirlar.js');
const { BANK } = await import('../../../src/data/bank.js');
const { ek } = await import('../../../src/quiz/ek.js');
const { kardes } = await import('../../../src/quiz/hafiza.js');

const K = [...JSON.parse(readFileSync('tools/veri/ham/kisiler.json', 'utf8')), ...JSON.parse(readFileSync('tools/veri/ham/kisiler_tr.json', 'utf8'))];
const byAd = new Map();
for (const k of K) if (!byAd.has(k.ad)) byAd.set(k.ad, k);
const KAT = { tarih: 'tar', bilim: 'bil', sanat: 'san', spor: 'spo', eglence: 'egl' };
const h32 = (s) => {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0;
	return h;
};
// bankada doğum yılı zaten sorulmuş kişi (yinelenmesin). Bu ailenin kendi soruları (kimlikte -wd-) bankaya bağlandığından
// sayılmaz; sayılırsa yeniden üretimde bütün kişiler "zaten soruluyor" diye atlanır ve dosya boşalır.
const sorulmus = BANK.filter((q) => q.type === 'num' && !/-wd-/.test(q.id) && /doğdu|doğum/.test(q.q)).map((q) => q.q);

// bölüm başlığı ("# --- Türkiye: …") kişinin Türk olup olmadığını söyler: ad ekli kalıp ("X'in doğduğu yıl") yalnız Türk
// adlarında kullanılır (yabancı adın eki okunuşa bağlı, ek.js her okunuşu bilmez; ekli kalıp yanlış ek riski taşımasın)
let bolumTr = false;
const secim = [];
for (const ham of readFileSync('tools/veri/pilot/kisi_secim.txt', 'utf8').split('\n')) {
	const l = ham.trim();
	if (l.startsWith('# ---')) bolumTr = /Türkiye/.test(l);
	if (!l || l.startsWith('#')) continue;
	// 5. alan (isteğe bağlı): soruda görünen ad, Wikidata etiketi Türkçede yerleşik ya da TDK yazımından ayrıysa
	// (Celine Dion → Céline Dion, Katip Çelebi → Kâtip Çelebi); bankadaki yazımla da tutarlı olmalı
	const [ad, kat, tanim, z, goster] = l.split('|').map((x) => x.trim());
	secim.push({ ad, kat, tanim, diff: Number(z), goster: goster || ad, tr: bolumTr });
}

// Soru kalıpları (kullanıcı, 16 Kasım 2026: "hep aynı kalıp olmasın"). Kalıp sırayla dağıtılır (aynı kalıp aileye eşit
// pay), sıra kimliğin özetine göre: yeniden üretimde aynı soru aynı kalıbı alır. Ekli kalıp yalnız Türk adlarında.
const KALIP = [
	(t, a) => `${t} ${a} hangi yıl doğdu?`,
	(t, a) => `${t} ${a} hangi yıl dünyaya geldi?`,
	(t, a) => `${t} ${a} kaç yılında doğdu?`,
	(t, a) => `${t} ${a} hangi yılda doğmuştur?`,
];
const KALIP_TR = [(t, a) => `${t} ${ek(a, 'in')} doğduğu yıl kaçtır?`, (t, a) => `${t} ${ek(a, 'in')} doğum yılı kaçtır?`];

const rapor = { secilen: secim.length, atlanan: [], soru: 0, kat: {}, zorluk: { 1: 0, 2: 0, 3: 0 } };
const out = [];
const kisiOf = new Map(); // soru → seçim satırı (kalıp dağıtımı için)
const gorulen = new Set();
for (const s of secim) {
	const k = byAd.get(s.ad);
	if (!k) {
		rapor.atlanan.push(`${s.ad}: veride yok (ad yazımı?)`);
		continue;
	}
	if (gorulen.has(k.qid)) continue; // listede iki kez: sessizce bir kez
	gorulen.add(k.qid);
	if (k.tartismali) {
		rapor.atlanan.push(`${s.ad}: doğum yılı tartışmalı (${k.tartismaNeden || ''})`);
		continue;
	}
	if (!KAT[s.kat] || ![1, 2, 3].includes(s.diff)) {
		rapor.atlanan.push(`${s.ad}: kategori ya da zorluk geçersiz`);
		continue;
	}
	const soyad = s.ad.split(' ').pop();
	if (sorulmus.some((q) => q.includes(soyad) && q.includes(s.ad.split(' ')[0]))) {
		rapor.atlanan.push(`${s.ad}: doğum yılı bankada zaten soruluyor`);
		continue;
	}
	const y = k.dogumYili;
	// aralık: döneme göre genişlik (bankadaki yıl sorularıyla aynı ölçek), cevap aralığın %30–70'inde (kararlı)
	const W = y >= 1900 ? 100 : y >= 1700 ? 200 : y >= 1300 ? 400 : 600;
	const pos = 0.3 + (h32(k.qid) % 41) / 100;
	let min = Math.round((y - pos * W) / 10) * 10;
	let max = min + W;
	// üst sınır geleceğe taşmaz (2030'da 1894 doğumlu Kruşçev'e 2030'a dek yıl seçtiriyordu): en çok 2025
	if (max > 2025) (max = 2025), (min = max - W);
	if (min < 0) (min = 0), (max = W);
	const q = {
		id: `${KAT[s.kat]}-wd-dogum-${k.qid}`,
		cat: s.kat,
		diff: s.diff,
		type: 'num',
		q: KALIP[0](s.tanim, s.goster), // kalıp aşağıda, bütün aile seçildikten sonra dengeli dağıtılır
		ans: y,
		unit: '',
		min,
		max,
		kaynak: k.qid,
	};
	const ih = ihlaller(q);
	if (ih.length) {
		rapor.atlanan.push(`${s.ad}: uzunluk ${ih.map((v) => v.alan + ' ' + v.uzunluk).join(',')}`);
		continue;
	}
	out.push(q);
	kisiOf.set(q, s);
	rapor.kat[s.kat] = (rapor.kat[s.kat] || 0) + 1;
	rapor.zorluk[s.diff]++;
}
// kalıp dağıtımı: Türk adları kendi sırasıyla (ekli kalıplar dahil), yabancılar kendi sırasıyla; sınırı aşan kalıp
// atlanır, sıradaki denenir (hiçbiri sığmazsa ilk kalıp kalır: o da yukarıda sınırdan geçti)
for (const tr of [true, false]) {
	const kalip = tr ? [...KALIP, ...KALIP_TR] : KALIP;
	const grup = out.filter((q) => kisiOf.get(q).tr === tr).sort((a, b) => h32(a.kaynak + 'k') - h32(b.kaynak + 'k'));
	grup.forEach((q, i) => {
		const s = kisiOf.get(q);
		for (let j = 0; j < kalip.length; j++) {
			const metin = kalip[(i + j) % kalip.length](s.tanim, s.goster);
			if (!ihlaller({ ...q, q: metin }).length && !ihlaller({ ...q, q: metin, type: 'mancinik' }).length) {
				q.q = metin;
				break;
			}
		}
	});
}
// Açık kardeş (hafiza.js): tanım kişiyi ayırt eden eseri ya da lakabı söyler ('"Savaş ve Barış"ın yazarı Lev Tolstoy'); kök,
// cevabı bu kişi olan bankadaki sorunun cevabını açar ("Savaş ve Barış'ın yazarı kimdir?"). Soru o cevabın anahtarını
// taşır: ikisi aynı maçta sorulmaz (seçici kardeşi bayat sayar). Bankada cevap çoğu kez kısa ad ("Tolstoy"): adın
// soyadla biten ardışık kelimelerinden biri olan en sık cevap seçilir; bankada yoksa tam ad.
const cevapSay = new Map();
for (const b of BANK) {
	if (/-wd-/.test(b.id)) continue;
	const k = kardes(b);
	if (k && k.startsWith('a:')) cevapSay.set(k, (cevapSay.get(k) || 0) + 1);
}
rapor.kardes = { bankadaCevap: 0, tamAd: 0 };
for (const q of out) {
	const s = kisiOf.get(q);
	const adaylar = new Set();
	for (const ad of [s.goster, s.ad]) {
		const w = ad.split(/\s+/);
		// soyadla biten ardışık kelimeler ("Tolstoy", "Lev Tolstoy"): yalnız ad ("Albert") iki kişiyi bağlamasın
		for (let i = 0; i < w.length; i++) adaylar.add(kardes({ type: 'choice', a: [w.slice(i).join(' ')] }));
	}
	const enSik = [...adaylar].filter((k) => k && k.length >= 6 && cevapSay.has(k)).sort((a, b) => cevapSay.get(b) - cevapSay.get(a))[0];
	q.kardes = enSik || kardes({ type: 'choice', a: [s.goster] });
	rapor.kardes[enSik ? 'bankadaCevap' : 'tamAd']++;
}
rapor.kalip = {};
for (const q of out) {
	const k = q.q.replace(/^.* (\S+ \S+\?)$/, '$1');
	rapor.kalip[k] = (rapor.kalip[k] || 0) + 1;
}
// zorluk dengesi (BRIF §9: kolay ≥ %25, zor ≤ %30). Zorluk yalnız seçim dosyasından gelir. Eskiden eşik tutmazsa en çok dilde
// maddesi olanlar kendiliğinden bir kademe kolaylaşıyordu (Molière, Martin Luther 3 → 1); bağımsız denetim bunu dürüst bulmadı
// (16 Kasım 2026): dil sayısı ünü ölçer, doğum yılının bilinirliğini ölçmez. Şimdi eşik tutmazsa yalnız uyarılır.
rapor.denge = [];
rapor.zorluk = { 1: 0, 2: 0, 3: 0 };
for (const q of out) rapor.zorluk[q.diff]++;
if (rapor.zorluk[1] < 0.25 * out.length) rapor.denge.push(`kolay %${Math.round((100 * rapor.zorluk[1]) / out.length)} < %25`);
if (rapor.zorluk[3] > 0.3 * out.length) rapor.denge.push(`zor %${Math.round((100 * rapor.zorluk[3]) / out.length)} > %30`);
rapor.soru = out.length;
mkdirSync('src/data/q/wd', { recursive: true });
writeFileSync(
	'src/data/q/wd/dogum.js',
	`// Ünlü kişinin doğum yılı, "kim daha yakın" (SORU-100K.md Aşama 1 pilotu). ÜRETİLDİ: tools/veri/pilot/kisi.mjs — elle\n` +
		`// düzeltme yapma, seçimi tools/veri/pilot/kisi_secim.txt'de değiştirip yeniden üret. Doğum yılı Wikidata'dan (CC0).\n` +
		'export default ' +
		JSON.stringify(out, null, '\t') +
		';\n',
);
console.log(JSON.stringify({ ...rapor, atlanan: rapor.atlanan.length }, null, 1));
if (rapor.denge.length) console.log('  UYARI zorluk dağılımı hedef dışında: ' + rapor.denge.join(', '));
for (const a of rapor.atlanan) console.log('  atlandı: ' + a);
