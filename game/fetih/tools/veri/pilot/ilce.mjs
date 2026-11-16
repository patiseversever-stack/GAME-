// PİLOT AİLE: ilçe → il (test) ve ilçe haritada bul (SORU-100K.md Aşama 1).
//   node tools/veri/pilot/ilce.mjs        → src/data/q/wd/ilce.js, src/data/q/wd/ilce_pin.js + rapor
// Bilgi veriden gelir: il ve koordinat Wikidata (tools/veri/ham/ilceler.json; ikinci kaynakla doğrulanmış). Hangi ilçenin
// soru olmaya değer olduğu elle seçilir (ilce_secim.txt): Wikidata'nın dil sayısı ilçe tanınırlığını ölçmüyor (botlar
// küçük ilçelere onlarca dilde sayfa açmış; Midyat 5 dilde). Kimlikler kaynaktan: cog-wd-ilce-<Q>, cog-wd-ilcepin-<Q>.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
process.chdir(new URL('../../..', import.meta.url).pathname);
await import('../../../test/kanca.mjs');
const { ihlaller } = await import('../../../src/quiz/sinirlar.js');
const { ek } = await import('../../../src/quiz/ek.js');

const ILCE = JSON.parse(readFileSync('tools/veri/ham/ilceler.json', 'utf8'));
const TR = JSON.parse(readFileSync('src/data/turkiye.json', 'utf8')).provinces;
const ilAd = new Map(TR.map((p) => [p.id, p.name]));
const ilOf = new Map(TR.map((p) => [p.name, p]));
// koordinatı il çokgeninin 5–10 km dışında kalan (Wikidata ajanı raporu): haritada bul sorusu yapılmaz
// il merkezi (şehrin kendisi): mevcut "X ili nerede?" harita sorularından; merkeze 25 km'den yakın ilçe haritada il merkeziyle
// aynı nokta olur (Kadıköy ≈ İstanbul): haritada bul sorusu yapılmaz, yalnız "hangi ilde" sorulur
const HARITA = (await import('../../../src/data/q/harita.js')).default;
// BANKADA AYNI BİLGİ (bağımsız denetim, 16 Kasım 2026; SORU-100K ölçüt 5: tekrar yok, kök başka sorunun cevabını açmaz).
// Bankada (bu ailenin kendi -wd- soruları hariç) ilçenin ilini soran ya da kökünde açıkça söyleyen soru varsa "hangi ilde"
// sorusu yapılmaz: "Bodrum hangi ilimizdedir?", Yıldırım maddesi "Akçaabat Trabzon'un ilçesidir.", "Togg'un fabrikası hangi
// Bursa ilçesindedir? → Gemlik", "İzmir'in Selçuk ilçesinin eski adı…". Açıklama (why), balon/mayın notu, rota durağı ve tünel
// kartı sayılmaz (cevaptan sonra görünür; başka bilgi sorar). Aynı ilçeyi (ya da ilçedeki yapıyı: Bodrum Kalesi, Datça
// Yarımadası, İznik Gölü) soran harita sorusu varsa haritada bul sorusu yapılmaz.
const { BANK } = await import('../../../src/data/bank.js');
const { yeniBank } = await import('../../../src/quiz/mac.js');
const BANKA = [];
{
	const gorulenId = new Set();
	for (const q of [...BANK, ...yeniBank(), ...HARITA]) if (!gorulenId.has(q.id) && !/-wd-/.test(q.id)) gorulenId.add(q.id), BANKA.push(q);
}
const kucuk = (x) => x.toLocaleLowerCase('tr');
const kelimeVar = (metin, w) => new RegExp('(^|[^a-zçğıöşüâîû])' + kucuk(w) + '($|[^a-zçğıöşüâîû])').test(kucuk(metin));
const DOGRU_ILK = new Set(['choice', 'penalti', 'kusbakisi', 'gozkarari']);
const kokler = (q) => {
	const k = [];
	if (typeof q.q === 'string') k.push({ t: q.q, cevap: DOGRU_ILK.has(q.type) ? String(q.a?.[0] ?? '') : '' });
	if (typeof q.t === 'string') k.push({ t: q.t, cevap: '' }); // yanlışı bul cümlesi
	for (const x of q.items || []) if (x && typeof x.t === 'string') k.push({ t: x.t, cevap: Array.isArray(x.o) ? String(x.o[x.r] ?? '') : '' });
	for (const x of q.anchors || []) k.push({ t: String(x[0]), cevap: '' }); // tünelin sabit kartı ekranda yazılı
	return k;
};
// adı başka bir şeyin adı olan ilçe (Fatih: padişah): kökte geçmesi ilçeyi anmaz
const BANKA_ESGEC = new Set(['Fatih']);
const bankadaIl = (ad, il) => {
	if (BANKA_ESGEC.has(ad)) return null;
	for (const q of BANKA)
		for (const k of kokler(q)) {
			if (!kelimeVar(k.t, ad) && !(k.cevap && kelimeVar(k.cevap, ad))) continue;
			const ilAnildi = kelimeVar(k.t, il) || k.cevap === il;
			if (ilAnildi) return q.id;
		}
	return null;
};
const bankadaHarita = (ad) => {
	for (const q of BANKA) if ((q.type === 'pin' || q.lat != null) && !q.il && typeof q.q === 'string' && kelimeVar(q.q, ad)) return q.id;
	return null;
};
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
// Haritada bul noktası İLÇE MERKEZİDİR (yarıçap 12 km). Wikidata'nın ilçe öğesindeki koordinat kimi ilçede ilçe alanının
// ortası (dağda, kıyıdan içeride) ya da enlem/boylamı ters girilmiş; kasabanın (ilçe merkezinin) kendi Wikidata öğesiyle
// 8 km'den çok ayrışanlarda merkez öğesinin koordinatı alınır (bağımsız denetim, 16 Kasım 2026; kaynak: köşeli QID).
// ilçe QID → [enlem, boylam, merkez öğesi QID, ilçe öğesindeki sapma]
const MERKEZ_KOORD = {
	Q49103654: [40.8028, 29.4306, 'Q206116', 'Gebze: ilçe öğesi 14,6 km kuzeydoğuda (ilçe alanının ortası)'],
	Q49103504: [36.3017, 30.1455, 'Q1012894', 'Finike: ilçe öğesi 15,3 km kuzeyde, dağda'],
	Q1958767: [38.3592, 31.4164, 'Q169974', 'Akşehir: ilçe öğesi 19,7 km güneydoğuda, Sultan Dağları'],
	Q49101057: [41.5654, 35.8952, 'Q799805', 'Bafra: ilçe öğesi 12,4 km güneyde'],
	Q117148242: [41.0458, 41.0053, 'Q2670821', 'Çamlıhemşin: ilçe öğesi 12,7 km güneyde, Kaçkarlar'],
	Q117148419: [41.0881, 40.7231, 'Q2248873', 'Çayeli: ilçe öğesinde enlem ve boylam ters (40,75 / 41,07: Erzurum)'],
	Q1635214: [36.5436, 31.9997, 'Q171810', 'Alanya: ilçe öğesi kaba (36,5 / 32,0), 4,9 km açıkta denizde'],
	Q14141584: [39.5842, 32.1472, 'Q945388', 'Polatlı: ilçe öğesi 11,6 km güneyde'],
	Q1912026: [40.7247, 26.0825, 'Q610751', 'Enez: ilçe öğesi 9,7 km doğuda'],
	Q117272530: [41.0169, 34.0383, 'Q255479', 'Tosya: ilçe öğesi 9,2 km kuzeyde'],
	Q2083281: [40.0806, 29.5097, 'Q343973', 'İnegöl: ilçe öğesi 8,3 km güneyde'],
	Q15989053: [37.7803, 38.6217, 'Q375432', 'Kâhta: ilçe öğesi 8,1 km doğuda'],
};
// "Hangi ilde" sorusunda çeldirici olamayacak iller: o ilde aynı adlı belde ya da çok bilinen bir yer var (soru belirsizleşir).
const CELDIRICI_YASAK = {
	Kadıköy: ['Yalova'], // Yalova'da Kadıköy beldesi (Wikidata Q6345862)
	Karapınar: ['Nevşehir', 'Afyonkarahisar', 'Zonguldak'], // bu illerde Karapınar beldesi (Q10777291, Q6368599, Q10777313)
	Gediz: ['İzmir', 'Manisa'], // Gediz Nehri, Gediz Ovası ve Deltası bu illerde
	Susurluk: ['Bursa'], // Susurluk Çayı Bursa'dan (Karacabey) denize dökülür
	Keban: ['Erzincan', 'Tunceli', 'Malatya'], // Keban Baraj Gölü bu illere de uzanır
};
// Oyun haritasındaki il çokgenleri (src/data/turkiye.json; dünya birimi: x = (lon - lon0)·cos(lat0)·K, y = (lat - lat0)·K).
// Haritada bul noktası kendi ilinin çokgeninde olmalı: başka ilin içine düşen nokta (kaba sınır) cevabı yanlış ilde gösterir.
// Kıyıda çokgen dışına (denize) düşen nokta, kendi iline 3 km'den yakın ve en yakın il kendi iliyse kabul edilir.
const { K: GK, lon0: GLON, lat0: GLAT } = JSON.parse(readFileSync('src/data/turkiye.json', 'utf8')).meta;
const GC = Math.cos((GLAT * Math.PI) / 180), BIRIM_KM = ((Math.PI / 180) * 6371) / GK;
const icinde = (x, y, r) => {
	let ic = false;
	for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
		const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ic = !ic;
	}
	return ic;
};
const kenarKm = (x, y, rings) => {
	let en = Infinity;
	for (const r of rings)
		for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
			const ax = r[j], ay = r[j + 1], dx = r[i] - ax, dy = r[i + 1] - ay;
			const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
			en = Math.min(en, Math.hypot(x - ax - t * dx, y - ay - t * dy));
		}
	return en * BIRIM_KM;
};
// Haritada bul zorluğu (bağımsız denetim, 16 Kasım 2026). Doğru sayılma eşiği noktaya 12 + 15 = 27 km (types.js pinJudge).
// İç bölgede ilin adını bilmek bu eşiğe yetmez (ilin ortasına basan çoğu kez 50 km öteye düşer). Bu yüzden:
// - nokta kıyıya, ulusal sınıra ya da haritada çizili büyük bir göle 12 km'den yakınsa (oyuncunun tutunacağı çapa var)
//   zorluk "hangi ilde" sorusununkiyle aynıdır;
// - iç bölgede bilinen (1) ilçe 2 olur; 2'lik ilçeyi haritada 27 km içinde bulmak yöre insanının işidir (yalnız uzmanın
//   bileceği soru olmaz kuralı): haritada bul sorusu yapılmaz.
// Açık kenar: il çokgeninin başka hiçbir ille paylaşılmayan kenarı (kıyı ya da ulusal sınır).
const segKm = (x, y, ax, ay, bx, by) => {
	const dx = bx - ax, dy = by - ay;
	const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
	return Math.hypot(x - ax - t * dx, y - ay - t * dy) * BIRIM_KM;
};
const halkaKm = (x, y, r) => {
	let en = Infinity;
	for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) en = Math.min(en, segKm(x, y, r[j], r[j + 1], r[i], r[i + 1]));
	return en;
};
const ACIK = new Map();
for (const p of TR) {
	const kenar = [];
	for (const r of p.rings)
		for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
			const mx = (r[i] + r[j]) / 2, my = (r[i + 1] + r[j + 1]) / 2;
			if (!TR.some((o) => o !== p && o.rings.some((rr) => halkaKm(mx, my, rr) < 0.02 * BIRIM_KM))) kenar.push([r[j], r[j + 1], r[i], r[i + 1]]);
		}
	ACIK.set(p.name, kenar);
}
const GOLLER = JSON.parse(readFileSync('src/data/turkiye.json', 'utf8')).lakes.filter((l) => l.ring && l.name !== 'Göl');
const capali = (lat, lon, il) => {
	const x = (lon - GLON) * GC * GK, y = (lat - GLAT) * GK;
	if (ACIK.get(il).some((s) => segKm(x, y, ...s) < 12)) return true;
	return GOLLER.some((g) => halkaKm(x, y, g.ring) < 12);
};
const haritadaIlde = (lat, lon, il) => {
	const x = (lon - GLON) * GC * GK, y = (lat - GLAT) * GK;
	const dustu = TR.find((p) => p.rings.some((r) => icinde(x, y, r)));
	if (dustu) return dustu.name === il;
	const uz = TR.map((p) => [p.name, kenarKm(x, y, p.rings)]).sort((a, b) => a[1] - b[1]);
	return uz[0][0] === il && uz[0][1] < 3;
};

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
		// 4. alan (isteğe bağlı): soruda görünen ad, Wikidata etiketi TDK/resmî yazımdan ayrıysa (Kahta → Kâhta)
		// 5. alan (isteğe bağlı): ilçeye özgü kesin ipucu, sıfat öbeği ("Cunda Adası'nın bağlı olduğu")
		const [ad, il, z, goster, ipucu] = l.split('|').map((x) => x.trim());
		return { ad, il, diff: Number(z), goster: goster || ad, ipucu: ipucu || '' };
	});

// Soru kalıpları (kullanıcı, 16 Kasım 2026: "Türkçe soru yapısı hep aynı, şurası hangi ildedir hep aynı"). İpucu olan ilçe
// ipuçlu kalıpla sorulur; kalıplar sırayla dağıtılır (her kalıba eşit pay), sıra kimliğin özetine göre (yeniden üretimde
// aynı soru aynı kalıbı alır). Sınırı aşan kalıp atlanır, sıradaki denenir. Ekler ek.js'ten (ilçe adları Türkçe).
const KALIP = [
	(a) => `${a} hangi ilin ilçesidir?`,
	(a) => `${a} ilçesi hangi ilimizde yer alır?`,
	(a) => `${a} hangi ile bağlı bir ilçedir?`,
	(a) => `Haritada ${a} ilçesini hangi ilin sınırları içinde bulursun?`,
	(a) => `${ek(a, 'e')} giden bir gezgin hangi ilimize varmış olur?`,
	(a) => `${ek(a, 'in')} bağlı olduğu il hangisi?`,
];
const KALIP_IP = [
	(a, h) => `${h} ${a} hangi ilimizdedir?`,
	// "bağlı olduğu" ipucuyla "hangi ile bağlıdır?" yan yana gelmesin diye ipuçlu kalıplarda "bağlı" yok
	(a, h) => `${h} ${a} ilçesi hangi ilimizde yer alır?`,
	(a, h) => `${h} ${a} hangi ilin ilçesidir?`,
];
// Haritada bul: "X nerede?" gibi çıplak kalıp yok (test/harita.test.mjs: en az 4 kelime); nokta ilçe merkezidir.
const PIN = [
	(a) => `${a} ilçe merkezi nerede?`,
	(a) => `${a} ilçesinin merkezi haritanın neresinde?`,
	(a) => `${ek(a, 'in')} ilçe merkezini haritada bulabilir misin?`,
];
const PIN_IP = [(a, h) => `${h} ${a} ilçesinin merkezi nerede?`, (a, h) => `${h} ${ek(a, 'in')} ilçe merkezi nerede?`];
const dagit = (liste, kaliplar, ipKaliplar) => {
	const sira = (q) => h32(q.kaynak + 'k');
	for (const ip of [true, false]) {
		const grup = liste.filter((q) => !!secimOf.get(q).ipucu === ip).sort((a, b) => sira(a) - sira(b));
		const k = ip ? ipKaliplar : kaliplar;
		grup.forEach((q, i) => {
			const s = secimOf.get(q);
			const adaylar = [...k.map((f) => f(s.goster, s.ipucu)), ...(ip ? kaliplar.map((f) => f(s.goster)) : [])];
			for (let j = 0; j < adaylar.length; j++) {
				const metin = adaylar[j < k.length ? (i + j) % k.length : j];
				if (!ihlaller({ ...q, q: metin }).length) {
					q.q = metin;
					break;
				}
			}
		});
	}
};
const secimOf = new Map(); // soru → seçim satırı
const rapor = { secilen: secim.length, atlanan: [], test: 0, harita: 0, zorluk: { 1: 0, 2: 0, 3: 0 }, haritaZorluk: { 1: 0, 2: 0, 3: 0 }, haritaIcBolge: [], bankada: [], bankadaHarita: [] };
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
	const bankaIl = bankadaIl(s.goster, s.il) || (s.goster !== s.ad && bankadaIl(s.ad, s.il));
	if (bankaIl) rapor.bankada.push(`${s.goster} (${s.il}): ${bankaIl}`); // "hangi ilde" yapılmaz; haritada bul ayrıca denetlenir
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
	const yasak = CELDIRICI_YASAK[s.ad] || [];
	const izinli = (n) => n && !yasak.includes(n) && n !== s.il && !s.ad.includes(n);
	const komsuI = komsu.filter(izinli); // yasaklı komşu atlanır, sıradaki komşu çeldirici olur
	for (const n of [komsuI[0], ...bolge, ...komsuI.slice(1), ...ikinci]) if (izinli(n) && !yanlis.includes(n)) yanlis.push(n);
	const q = {
		id: `cog-wd-ilce-${k.qid}`,
		cat: 'cografya',
		diff: s.diff,
		type: 'choice',
		q: KALIP[0](s.goster), // kalıp aşağıda, bütün aile seçildikten sonra dengeli dağıtılır
		a: [s.il, ...yanlis.slice(0, 3)],
		kaynak: k.qid,
	};
	const ih = ihlaller(q);
	if (ih.length || q.a.length !== 4) {
		rapor.atlanan.push(`${s.ad}: ${ih.length ? 'uzunluk ' + ih.map((v) => v.alan).join(',') : 'çeldirici yetmedi'}`);
		continue;
	}
	secimOf.set(q, s);
	if (!bankaIl) test.push(q), rapor.zorluk[s.diff]++;
	// haritada bul: yalnız bilinen (1–2) ilçe; il çokgeni dışında kalan koordinat ve adalar alınmaz
	const mz = MERKEZ.get(s.il);
	if (!mz) rapor.atlanan.push(`${s.il}: il merkezi koordinatı bulunamadı (harita)`);
	const mk = MERKEZ_KOORD[k.qid];
	const nokta = mk ? { lat: mk[0], lon: mk[1] } : { lat: k.lat, lon: k.lon };
	const ilde = haritadaIlde(nokta.lat, nokta.lon, s.il);
	if (s.diff <= 2 && !ilde) rapor.atlanan.push(`${s.ad} (harita): nokta oyun haritasında ${s.il} çokgeninin dışında`);
	const capa = capali(nokta.lat, nokta.lon, s.il);
	if (s.diff === 2 && !capa) rapor.haritaIcBolge.push(s.ad);
	const bankaHarita = s.diff <= 2 ? bankadaHarita(s.goster) || (s.goster !== s.ad && bankadaHarita(s.ad)) : null;
	if (bankaHarita) rapor.bankadaHarita.push(`${s.goster}: ${bankaHarita}`);
	if (s.diff <= 2 && !bankaHarita && (capa || s.diff === 1) && !KOORD_SUPHE.has(s.ad) && ilde && mz && km(nokta, mz) >= 25) {
		const pq = {
			id: `cog-wd-ilcepin-${k.qid}`,
			cat: 'cografya',
			diff: capa ? s.diff : 2, // yukarıdaki "Haritada bul zorluğu" kuralı
			type: 'pin',
			// "X ilçesi nerede?" bankanın harita kuralına aykırı (test/harita.test.mjs: en az 4 kelime, çıplak "X nerede?" yok);
			// ipucu olarak il yazılamaz (aynı ilçenin "hangi ilde" sorusunun cevabını açar). Nokta ilçe merkezidir: öyle sorulur.
			q: `${s.goster} ilçe merkezi nerede?`,
			lat: Math.round(nokta.lat * 100) / 100,
			lon: Math.round(nokta.lon * 100) / 100,
			r: 12,
			kaynak: k.qid,
		};
		secimOf.set(pq, s);
		if (!ihlaller(pq).length) harita.push(pq), rapor.haritaZorluk[pq.diff]++;
	}
}
dagit(test, KALIP, KALIP_IP);
dagit(harita, PIN, PIN_IP);
rapor.kalip = {};
for (const q of [...test, ...harita]) {
	const k = q.q.replace(/^.* (\S+ \S+\?)$/, '$1');
	rapor.kalip[k] = (rapor.kalip[k] || 0) + 1;
}
rapor.ipuclu = [...test, ...harita].filter((q) => secimOf.get(q).ipucu && q.q.startsWith(secimOf.get(q).ipucu)).length;
rapor.test = test.length;
rapor.harita = harita.length;

mkdirSync('src/data/q/wd', { recursive: true });
const bas = (ne) =>
	`// ${ne} (SORU-100K.md Aşama 1 pilotu). ÜRETİLDİ: tools/veri/pilot/ilce.mjs — elle düzeltme yapma, seçimi\n` +
	`// tools/veri/pilot/ilce_secim.txt'de değiştirip yeniden üret. Bilgi Wikidata'dan (CC0), kaynak: soru.kaynak.\n`;
writeFileSync('src/data/q/wd/ilce.js', bas('İlçe hangi ilde') + 'export default ' + JSON.stringify(test, null, '\t') + ';\n');
writeFileSync('src/data/q/wd/ilce_pin.js', bas('İlçe haritada bul') + 'export default ' + JSON.stringify(harita, null, '\t') + ';\n');
console.log(JSON.stringify({ ...rapor, atlanan: rapor.atlanan.length, haritaIcBolge: rapor.haritaIcBolge.length, bankada: rapor.bankada.length, bankadaHarita: rapor.bankadaHarita.length }, null, 1));
console.log('  bankada ili zaten sorulan/açılan (hangi ilde yapılmadı): ' + rapor.bankada.join('; '));
console.log('  bankada harita sorusu olan (haritada bul yapılmadı): ' + rapor.bankadaHarita.join('; '));
console.log('  haritada bul yapılmayan iç bölge 2\'likleri: ' + rapor.haritaIcBolge.join(', '));
for (const a of rapor.atlanan) console.log('  atlandı: ' + a);
