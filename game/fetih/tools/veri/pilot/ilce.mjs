// PİLOT AİLE: ilçe → il (test) ve ilçe haritada bul (SORU-100K.md Aşama 1).
//   node tools/veri/pilot/ilce.mjs        → src/data/q/wd/ilce.js, src/data/q/wd/ilce_pin.js + rapor
// Bilgi veriden gelir: il ve koordinat Wikidata (tools/veri/ham/ilceler.json; ikinci kaynakla doğrulanmış). Hangi ilçenin
// soru olmaya değer olduğu elle seçilir (ilce_secim.txt): Wikidata'nın dil sayısı ilçe tanınırlığını ölçmüyor (botlar
// küçük ilçelere onlarca dilde sayfa açmış; Midyat 5 dilde). Kimlikler kaynaktan: cog-wd-ilce-<Q>, cog-wd-ilcepin-<Q>.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
process.chdir(new URL('../../..', import.meta.url).pathname);
await import('../../../test/kanca.mjs');
const { ihlaller } = await import('../../../src/quiz/sinirlar.js');

const ILCE = JSON.parse(readFileSync('tools/veri/ham/ilceler.json', 'utf8'));
const TR = JSON.parse(readFileSync('src/data/turkiye.json', 'utf8')).provinces;
const ilAd = new Map(TR.map((p) => [p.id, p.name]));
const ilOf = new Map(TR.map((p) => [p.name, p]));
// koordinatı il çokgeninin 5–10 km dışında kalan (Wikidata ajanı raporu): haritada bul sorusu yapılmaz
// il merkezi (şehrin kendisi): mevcut "X ili nerede?" harita sorularından; merkeze 25 km'den yakın ilçe haritada il merkeziyle
// aynı nokta olur (Kadıköy ≈ İstanbul): haritada bul sorusu yapılmaz, yalnız "hangi ilde" sorulur
const HARITA = (await import('../../../src/data/q/harita.js')).default;
const MERKEZ = new Map();
for (const q of HARITA) if (q.il && !q.gol && !MERKEZ.has(q.il)) MERKEZ.set(q.il, q); // il sorusunun noktası il merkezidir
// harita sorusu olmayan ilde merkez ilçe: büyükşehir olmayan ilde ilin adını taşır, büyükşehirde elle (valiliğin bulunduğu ilçe)
const BSB = { Aydın: 'Efeler', Denizli: 'Merkezefendi', Muğla: 'Menteşe', Balıkesir: 'Karesi', Manisa: 'Şehzadeler', Tekirdağ: 'Süleymanpaşa',
	Hatay: 'Antakya', Kahramanmaraş: 'Dulkadiroğlu', Malatya: 'Battalgazi', Mardin: 'Artuklu', Ordu: 'Altınordu', Sakarya: 'Adapazarı',
	Kocaeli: 'İzmit', Trabzon: 'Ortahisar', Van: 'İpekyolu', Şanlıurfa: 'Haliliye', Erzurum: 'Yakutiye', Eskişehir: 'Odunpazarı',
	Diyarbakır: 'Yenişehir', Samsun: 'İlkadım', Gaziantep: 'Şahinbey', Kayseri: 'Kocasinan', Konya: 'Selçuklu', Mersin: 'Yenişehir',
	Adana: 'Seyhan', Antalya: 'Muratpaşa', Bursa: 'Osmangazi', İzmir: 'Konak', Ankara: 'Çankaya', İstanbul: 'Fatih' };
for (const p of TR) {
	if (MERKEZ.has(p.name)) continue;
	const m = ILCE.find((x) => x.il === p.name && x.ad === (BSB[p.name] || p.name));
	if (m) MERKEZ.set(p.name, m);
}
const km = (a, b) => {
	const R = 6371, r = Math.PI / 180;
	const dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r;
	const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(x));
};
const KOORD_SUPHE = new Set(['Sarıyahşi', 'İnönü', 'Kaynarca', 'Bahçesaray', 'Altınova', 'Adalar', 'Tuzla']);

// kararlı tohum (aynı kaynak → aynı soru): kimlikten
const h32 = (s) => {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0;
	return h;
};
const karistir = (arr, seed) => {
	const a = arr.slice();
	let x = seed || 1;
	for (let i = a.length - 1; i > 0; i--) {
		x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0;
		const j = x % (i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

const secim = readFileSync('tools/veri/pilot/ilce_secim.txt', 'utf8')
	.split('\n')
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith('#'))
	.map((l) => {
		const [ad, il, z] = l.split('|').map((x) => x.trim());
		return { ad, il, diff: Number(z) };
	});

const KALIP = [(a) => `${a} hangi ilin ilçesidir?`, (a) => `${a} ilçesi hangi ildedir?`, (a) => `${a} hangi ile bağlı bir ilçedir?`];
const rapor = { secilen: secim.length, atlanan: [], test: 0, harita: 0, zorluk: { 1: 0, 2: 0, 3: 0 } };
const test = [];
const harita = [];
const gorulen = new Set();
for (const s of secim) {
	if (gorulen.has(s.ad + '|' + s.il)) {
		rapor.atlanan.push(`${s.ad} (${s.il}): listede iki kez`);
		continue;
	}
	gorulen.add(s.ad + '|' + s.il);
	if (![1, 2, 3].includes(s.diff)) {
		rapor.atlanan.push(`${s.ad}: zorluk geçersiz (${s.diff})`);
		continue;
	}
	const k = ILCE.find((x) => x.ad === s.ad && x.il === s.il);
	if (!k) {
		const baska = ILCE.filter((x) => x.ad === s.ad).map((x) => x.il);
		rapor.atlanan.push(`${s.ad} (${s.il}): veride ${baska.length ? 'başka ilde: ' + baska.join(', ') : 'yok'}`);
		continue;
	}
	if (k.adBaskaIlde?.length) {
		rapor.atlanan.push(`${s.ad} (${s.il}): aynı ad başka ilde de var (${k.adBaskaIlde.join(', ')})`);
		continue;
	}
	if (ilOf.has(s.ad)) {
		rapor.atlanan.push(`${s.ad}: bir ilin de adı`);
		continue;
	}
	const p = ilOf.get(s.il);
	const seed = h32(k.qid);
	// çeldiriciler: 1 komşu il + 2 aynı bölgeden (komşu olmayan) il; eksikse komşunun komşusu
	const komsu = karistir(p.nb.map((i) => ilAd.get(i)), seed);
	const bolge = karistir(
		TR.filter((x) => x.region === p.region && x.name !== s.il && !p.nb.includes(x.id)).map((x) => x.name),
		seed ^ 0x9e3779b9,
	);
	const ikinci = karistir([...new Set(p.nb.flatMap((i) => ilOf.get(ilAd.get(i)).nb.map((j) => ilAd.get(j))))].filter((n) => n !== s.il && !komsu.includes(n)), seed ^ 0x85ebca6b);
	const yanlis = [];
	for (const n of [komsu[0], ...bolge, ...komsu.slice(1), ...ikinci]) if (n && !yanlis.includes(n) && n !== s.il && !s.ad.includes(n)) yanlis.push(n);
	const q = {
		id: `cog-wd-ilce-${k.qid}`,
		cat: 'cografya',
		diff: s.diff,
		type: 'choice',
		q: KALIP[seed % KALIP.length](s.ad),
		a: [s.il, ...yanlis.slice(0, 3)],
		kaynak: k.qid,
	};
	const ih = ihlaller(q);
	if (ih.length || q.a.length !== 4) {
		rapor.atlanan.push(`${s.ad}: ${ih.length ? 'uzunluk ' + ih.map((v) => v.alan).join(',') : 'çeldirici yetmedi'}`);
		continue;
	}
	test.push(q);
	rapor.zorluk[s.diff]++;
	// haritada bul: yalnız bilinen (1–2) ilçe; il çokgeni dışında kalan koordinat ve adalar alınmaz
	const mz = MERKEZ.get(s.il);
	if (!mz) rapor.atlanan.push(`${s.il}: il merkezi koordinatı bulunamadı (harita)`);
	if (s.diff <= 2 && !KOORD_SUPHE.has(s.ad) && mz && km(k, mz) >= 25) {
		const pq = {
			id: `cog-wd-ilcepin-${k.qid}`,
			cat: 'cografya',
			diff: s.diff, // yakınlığa göre puanlanır: ünlü ilçeyi haritada bulmak, adını bilmek kadar kolay
			type: 'pin',
			q: `${s.ad} ilçesi nerede?`,
			lat: Math.round(k.lat * 100) / 100,
			lon: Math.round(k.lon * 100) / 100,
			r: 12,
			kaynak: k.qid,
		};
		if (!ihlaller(pq).length) harita.push(pq);
	}
}
rapor.test = test.length;
rapor.harita = harita.length;

mkdirSync('src/data/q/wd', { recursive: true });
const bas = (ne) =>
	`// ${ne} (SORU-100K.md Aşama 1 pilotu). ÜRETİLDİ: tools/veri/pilot/ilce.mjs — elle düzeltme yapma, seçimi\n` +
	`// tools/veri/pilot/ilce_secim.txt'de değiştirip yeniden üret. Bilgi Wikidata'dan (CC0), kaynak: soru.kaynak.\n`;
writeFileSync('src/data/q/wd/ilce.js', bas('İlçe hangi ilde') + 'export default ' + JSON.stringify(test, null, '\t') + ';\n');
writeFileSync('src/data/q/wd/ilce_pin.js', bas('İlçe haritada bul') + 'export default ' + JSON.stringify(harita, null, '\t') + ';\n');
console.log(JSON.stringify({ ...rapor, atlanan: rapor.atlanan.length }, null, 1));
for (const a of rapor.atlanan) console.log('  atlandı: ' + a);
