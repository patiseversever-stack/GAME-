// AŞAMA 2, AİLE 1: TÜRKİYE DERİN — dağ, göl (sonra baraj, antik kent, kale) → hangi ilde (test) ve haritada bul.
//   node tools/veri/aile/derin.mjs      → src/data/q/wd/derin.js, src/data/q/wd/derin_pin.js + rapor
// Aday listesi Wikidata'dan (tools/veri/getir.mjs derin → ham/derin.json: koordinat, site bağlantısı). Soru olmaya değer
// olan, doğru il ve ipucu elle seçilir (derin_secim.txt): Wikidata'nın il bağı eksik ya da tek yanlı olabilir. Kimlikler
// kaynaktan: cog-wd-<tür>-<Q>, cog-wd-<tür>pin-<Q>. Bankadaki aynı bilgi, sınırlar, harita kuralları ilçe pilotuyla aynı
// (tools/veri/pilot/ilce.mjs; yardımcılar oradan birebir alındı, pilot dondurulmuş).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
process.chdir(new URL('../../..', import.meta.url).pathname);
await import('../../../test/kanca.mjs');
const { ihlaller } = await import('../../../src/quiz/sinirlar.js');
const { ek } = await import('../../../src/quiz/ek.js');

const HAM = new Map(JSON.parse(readFileSync('tools/veri/ham/derin.json', 'utf8')).map((o) => [o.qid, o]));
const TR = JSON.parse(readFileSync('src/data/turkiye.json', 'utf8')).provinces;
const ilAd = new Map(TR.map((p) => [p.id, p.name]));
const ilOf = new Map(TR.map((p) => [p.name, p]));
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
const km = (a, b) => {
	const R = 6371, r = Math.PI / 180;
	const dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r;
	const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(x));
};
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

// ---------------------------------------------------------------- seçim
const TURLER = { dag: 'dağ', gol: 'göl', baraj: 'baraj', antik: 'antik kent', kale: 'kale' };
const secim = readFileSync('tools/veri/aile/derin_secim.txt', 'utf8')
	.split('\n')
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith('#'))
	.map((l) => {
		const [qid, tur, ad, il, z, ipucu, yasak] = l.split('|').map((x) => x.trim());
		return { qid, tur, ad, il, diff: Number(z), ipucu: ipucu || '', yasak: (yasak || '').split(',').map((x) => x.trim()).filter(Boolean) };
	});

// Ek: "Gölü/Dağı" ile biten bileşik ad iyelikli (ek.js sözlüğü "Kuşgölü"nü bilmez: "Kuşgölü'ye" değil "Kuşgölü'ne")
const ekle = (ad, tur) => ek(ad, tur, /(gölü|dağı)$/i.test(ad) ? { iyelik: true } : undefined);
// arama adı: "Erciyes Dağı" bankada çoğu kez "Erciyes" diye geçer; türü bildiren son kelime atılır
const cekirdek = (ad) => ad.replace(/\s+(Dağı|Dağ|Gölü|Krater Gölü|Barajı|Kalesi|Antik Kenti)$/u, '').trim();

// Soru kalıpları (BRIF.md §12: tek kalıp yok; dağıtım dengeli, kimliğin özetine göre kararlı)
const KALIP = {
	dag: [
		(a) => `${a} hangi ilimizdedir?`,
		(a) => `${a} hangi ilin sınırları içinde yükselir?`,
		(a) => `${ekle(a, 'e')} tırmanmak isteyen biri hangi ile gitmeli?`,
		(a) => `Haritada ${ekle(a, 'i')} hangi ilde bulursun?`,
		(a) => `${a} hangi ilimizde yer alır?`,
	],
	gol: [
		(a) => `${a} hangi ilimizdedir?`,
		(a) => `${a} hangi ilin sınırları içinde yer alır?`,
		(a) => `${ekle(a, 'e')} gitmek isteyen biri hangi ile yolculuk etmeli?`,
		(a) => `Haritada ${ekle(a, 'i')} hangi ilde bulursun?`,
		(a) => `${ekle(a, 'in')} bulunduğu il hangisi?`,
	],
};
const KALIP_IP = [(a, h) => `${h} ${a} hangi ilimizdedir?`, (a, h) => `${h} ${a} hangi ilin sınırları içinde?`];
// Haritada bul: en az 4 kelime, çıplak "X nerede?" yok (test/harita.test.mjs)
const PIN = [(a) => `${a} Türkiye haritasında nerede?`, (a) => `${ekle(a, 'i')} haritada bulabilir misin?`];
const PIN_IP = [(a, h) => `${h} ${a} haritada nerede?`];

const secimOf = new Map();
const dagit = (liste, kaliplarOf, ipKaliplar) => {
	const sira = (q) => h32(q.kaynak + 'k');
	const gruplar = new Map();
	for (const q of liste) {
		const s = secimOf.get(q);
		const k = (s.ipucu ? 'ip:' : '') + s.tur;
		if (!gruplar.has(k)) gruplar.set(k, []);
		gruplar.get(k).push(q);
	}
	for (const [k, grup] of gruplar) {
		grup.sort((a, b) => sira(a) - sira(b));
		grup.forEach((q, i) => {
			const s = secimOf.get(q);
			const duz = kaliplarOf(s.tur);
			const ana = k.startsWith('ip:') ? ipKaliplar.map((f) => f(s.ad, s.ipucu)) : duz.map((f) => f(s.ad));
			const adaylar = [...ana.map((_, j) => ana[(i + j) % ana.length]), ...duz.map((f) => f(s.ad))];
			q.q = adaylar.find((m) => !ihlaller({ ...q, q: m }).length) || q.q;
		});
	}
};

const rapor = { secilen: secim.length, atlanan: [], test: 0, harita: 0, zorluk: { 1: 0, 2: 0, 3: 0 }, tur: {}, bankada: [], bankadaHarita: [] };
const test = [];
const harita = [];
for (const s of secim) {
	const o = HAM.get(s.qid);
	if (!TURLER[s.tur] || !KALIP[s.tur]) {
		rapor.atlanan.push(`${s.ad}: tür ${s.tur} henüz üretilmiyor`);
		continue;
	}
	if (!o) {
		rapor.atlanan.push(`${s.ad} (${s.qid}): ham/derin.json'da yok`);
		continue;
	}
	const p = ilOf.get(s.il);
	if (!p || ![1, 2, 3].includes(s.diff)) {
		rapor.atlanan.push(`${s.ad}: il ya da zorluk geçersiz (${s.il}, ${s.diff})`);
		continue;
	}
	if (o.iller.length && !o.iller.includes(s.il)) rapor.atlanan.push(`UYARI ${s.ad}: Wikidata ili ${o.iller.join('/')}, seçimde ${s.il} (elle doğrulandı mı?)`);
	const seed = h32(s.qid);
	const komsu = karistir(p.nb.map((i) => ilAd.get(i)), seed);
	const bolge = karistir(TR.filter((x) => x.region === p.region && x.name !== s.il && !p.nb.includes(x.id)).map((x) => x.name), seed ^ 0x9e3779b9);
	const ikinci = karistir([...new Set(p.nb.flatMap((i) => ilOf.get(ilAd.get(i)).nb.map((j) => ilAd.get(j))))].filter((n) => n !== s.il && !komsu.includes(n)), seed ^ 0x85ebca6b);
	const izinli = (n) => n && n !== s.il && !s.yasak.includes(n) && !s.ad.includes(n);
	const yanlis = [];
	const komsuI = komsu.filter(izinli);
	for (const n of [komsuI[0], ...bolge, ...komsuI.slice(1), ...ikinci]) if (izinli(n) && !yanlis.includes(n)) yanlis.push(n);
	const arama = cekirdek(s.ad);
	const bankaIl = bankadaIl(arama, s.il) || (arama !== s.ad && bankadaIl(s.ad, s.il));
	const q = { id: `cog-wd-${s.tur}-${s.qid}`, cat: 'cografya', diff: s.diff, type: 'choice', q: KALIP[s.tur][0](s.ad), a: [s.il, ...yanlis.slice(0, 3)], kaynak: s.qid };
	if (ihlaller(q).length || q.a.length !== 4) {
		rapor.atlanan.push(`${s.ad}: ${q.a.length !== 4 ? 'çeldirici yetmedi' : 'uzunluk'}`);
		continue;
	}
	secimOf.set(q, s);
	if (bankaIl) rapor.bankada.push(`${s.ad}: ${bankaIl}`);
	else test.push(q), rapor.zorluk[s.diff]++, (rapor.tur[s.tur] = (rapor.tur[s.tur] || 0) + 1);
	// haritada bul: koordinat oyun haritasında kendi ilinde olmalı; bankada aynı yeri soran harita sorusu varsa yapılmaz;
	// iç bölgede çapasız 2–3'lük yer yapılmaz (ilçe pilotu kuralı)
	if (o.lat == null) continue;
	const ilde = haritadaIlde(o.lat, o.lon, s.il);
	if (!ilde) {
		rapor.atlanan.push(`${s.ad} (harita): nokta oyun haritasında ${s.il} çokgeninin dışında`);
		continue;
	}
	const bankaHarita = bankadaHarita(arama) || (arama !== s.ad && bankadaHarita(s.ad));
	if (bankaHarita) {
		rapor.bankadaHarita.push(`${s.ad}: ${bankaHarita}`);
		continue;
	}
	const capa = capali(o.lat, o.lon, s.il);
	if (s.diff >= 2 && !capa) continue;
	const pq = { id: `cog-wd-${s.tur}pin-${s.qid}`, cat: 'cografya', diff: capa ? s.diff : 2, type: 'pin', q: PIN[0](s.ad), lat: Math.round(o.lat * 100) / 100, lon: Math.round(o.lon * 100) / 100, r: 12, kaynak: s.qid };
	secimOf.set(pq, s);
	if (!ihlaller(pq).length) harita.push(pq);
}
dagit(test, (t) => KALIP[t], KALIP_IP);
dagit(harita, () => PIN, PIN_IP);
rapor.test = test.length;
rapor.harita = harita.length;
rapor.kalip = {};
for (const q of [...test, ...harita]) {
	const k = q.q.replace(/^.* (\S+ \S+\?)$/, '$1');
	rapor.kalip[k] = (rapor.kalip[k] || 0) + 1;
}

mkdirSync('src/data/q/wd', { recursive: true });
const bas = (ne) =>
	`// ${ne} (SORU-100K.md Aşama 2, aile 1: Türkiye derin). ÜRETİLDİ: tools/veri/aile/derin.mjs — elle düzeltme yapma,\n` +
	`// seçimi tools/veri/aile/derin_secim.txt'de değiştirip yeniden üret. Koordinat Wikidata'dan (CC0), il elle doğrulandı.\n`;
writeFileSync('src/data/q/wd/derin.js', bas('Dağ ve göl hangi ilde') + 'export default ' + JSON.stringify(test, null, '\t') + ';\n');
writeFileSync('src/data/q/wd/derin_pin.js', bas('Dağ ve göl haritada bul') + 'export default ' + JSON.stringify(harita, null, '\t') + ';\n');
console.log(JSON.stringify({ ...rapor, atlanan: rapor.atlanan.length, bankada: rapor.bankada.length, bankadaHarita: rapor.bankadaHarita.length }, null, 1));
console.log('  bankada ili zaten sorulan/açılan: ' + rapor.bankada.join('; '));
console.log('  bankada harita sorusu olan: ' + rapor.bankadaHarita.join('; '));
for (const a of rapor.atlanan) console.log('  ' + a);
