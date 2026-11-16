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
// bankada doğum yılı zaten sorulmuş kişi (yinelenmesin). Bu ailenin kendi soruları (kimlikte -wd-) bankaya bağlandığından
// sayılmaz; sayılırsa yeniden üretimde bütün kişiler "zaten soruluyor" diye atlanır ve dosya boşalır.
const sorulmus = BANK.filter((q) => q.type === 'num' && !/-wd-/.test(q.id) && /doğdu|doğum/.test(q.q)).map((q) => q.q);

const secim = readFileSync('tools/veri/pilot/kisi_secim.txt', 'utf8')
	.split('\n')
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith('#'))
	.map((l) => {
		// 5. alan (isteğe bağlı): soruda görünen ad, Wikidata etiketi Türkçede yerleşik ya da TDK yazımından ayrıysa
		// (Celine Dion → Céline Dion, Katip Çelebi → Kâtip Çelebi); bankadaki yazımla da tutarlı olmalı
		const [ad, kat, tanim, z, goster] = l.split('|').map((x) => x.trim());
		return { ad, kat, tanim, diff: Number(z), goster: goster || ad };
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
	// üst sınır geleceğe taşmaz (2030'da 1894 doğumlu Kruşçev'e 2030'a dek yıl seçtiriyordu): en çok 2025
	if (max > 2025) (max = 2025), (min = max - W);
	if (min < 0) (min = 0), (max = W);
	const q = {
		id: `${KAT[s.kat]}-wd-dogum-${k.qid}`,
		cat: s.kat,
		diff: s.diff,
		type: 'num',
		q: `${s.tanim} ${s.goster} hangi yıl doğdu?`,
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
