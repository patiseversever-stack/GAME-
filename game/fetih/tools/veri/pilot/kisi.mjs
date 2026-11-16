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

const K = [...JSON.parse(readFileSync('tools/veri/ham/kisiler.json', 'utf8')), ...JSON.parse(readFileSync('tools/veri/ham/kisiler_tr.json', 'utf8'))];
const byAd = new Map();
for (const k of K) if (!byAd.has(k.ad)) byAd.set(k.ad, k);
const KAT = { tarih: 'tar', bilim: 'bil', sanat: 'san', spor: 'spo', eglence: 'egl' };
const h32 = (s) => {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0;
	return h;
};
// bankada doğum yılı zaten sorulmuş kişi (yinelenmesin)
const sorulmus = BANK.filter((q) => q.type === 'num' && /doğdu|doğum/.test(q.q)).map((q) => q.q);

const secim = readFileSync('tools/veri/pilot/kisi_secim.txt', 'utf8')
	.split('\n')
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith('#'))
	.map((l) => {
		const [ad, kat, tanim, z] = l.split('|').map((x) => x.trim());
		return { ad, kat, tanim, diff: Number(z) };
	});

const rapor = { secilen: secim.length, atlanan: [], soru: 0, kat: {}, zorluk: { 1: 0, 2: 0, 3: 0 } };
const out = [];
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
	if (max > 2030) (max = 2030), (min = max - W);
	if (min < 0) (min = 0), (max = W);
	const q = {
		id: `${KAT[s.kat]}-wd-dogum-${k.qid}`,
		cat: s.kat,
		diff: s.diff,
		type: 'num',
		q: `${s.tanim} ${s.ad} hangi yıl doğdu?`,
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
	rapor.kat[s.kat] = (rapor.kat[s.kat] || 0) + 1;
	rapor.zorluk[s.diff]++;
}
// zorluk dengesi (BRIF §9: kolay ≥ %25, zor ≤ %30): elle verilen zorluk korunur; eşik tutmazsa en tanınanlar (çok dilde
// maddesi olan: kişilerde tanınırlığın iyi ölçüsü) bir kademe kolaylaşır
const sl = new Map(K.map((k) => [k.qid, k.sitelinks]));
const pay = (d) => out.filter((q) => q.diff === d).length / out.length;
rapor.denge = [];
for (const [d, hedef, kos] of [[3, 0.28, () => pay(3) > 0.28], [2, 0.26, () => pay(1) < 0.26]])
	for (const q of out.filter((x) => x.diff === d).sort((a, b) => sl.get(b.kaynak) - sl.get(a.kaynak))) {
		if (!kos()) break;
		q.diff = d - 1;
		rapor.denge.push(`${q.q.replace(' hangi yıl doğdu?', '')}: ${d} → ${d - 1}`);
	}
rapor.zorluk = { 1: 0, 2: 0, 3: 0 };
for (const q of out) rapor.zorluk[q.diff]++;
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
console.log(JSON.stringify({ ...rapor, atlanan: rapor.atlanan.length, denge: rapor.denge.length }, null, 1));
for (const a of rapor.atlanan) console.log('  atlandı: ' + a);
