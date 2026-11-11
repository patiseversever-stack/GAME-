// YENİ grup 3 sınaması (Mayın Tarlası, Uçuş Rotası):  node test/yeni3.test.mjs
// deneme.test.mjs gibi esbuild ile paketler (tipler harita verisini içe aktarır).
// Denetler:
//   örnek gerçekleri harita verisinden (src/data/turkiye.json): her Mayın sorusunun güvenli illeri kuraldan (komşuluk, komşu
//   sayısı, bölge, kıyı, deniz, ülke sınırı, göl, plaka, elle listeler) yeniden hesaplanır; komşuluk sorusunda merkezin
//   bütün komşuları tarlada; tarla bir bütün. Her Rota sorusunun sırası veriden (enlem, boylam, ırmak çizgisi, doruk, alan,
//   plaka) ya da yazılı beklenen sırayla doğrulanır. Sayı (≥ 30), kimlik, zorluk ve kategori dağılımı, kısa notlar
//   tip sözleşmesi: süre, publicView cevabı taşımıyor, judge (kısmi puan, ikinci mayından sonrası sayılmaz, sapma noktası),
//   bot (değer api.answer ile aynı biçimde; usta acemiden iyi), joker etkisi, fmt/sub
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import { TYPES, ORDER, SAMPLES } from './src/quiz/deneme-yeni3.js';
import { CATS } from './src/quiz/categories.js';
import { PROFILE, limits } from './src/quiz/timing.js';
import { sonuc as mSonuc, CAN } from './src/quiz/d_mayin.js';
import { sonuc as rSonuc } from './src/quiz/d_rota.js';
import { rng } from './src/core/math.js';
import DATA from './src/data/turkiye.json';

let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + m);
	}
};
const P = new Map(DATA.provinces.map((p) => [p.id, p]));
const name = (id) => P.get(id)?.name;
const len = (pts) => {
	let s = 0;
	for (let k = 2; k < pts.length; k += 2) s += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
	return s * (111.2 / 6);
};
const sea = new Map();
for (const b of DATA.borders) {
	if (P.has(b.a) && P.has(b.b)) continue;
	const other = P.has(b.a) ? b.b : b.a;
	const pid = P.has(b.a) ? b.a : b.b;
	if (other === 0) sea.set(pid, (sea.get(pid) || 0) + len(b.pts));
}
const coast = (id) => (sea.get(id) || 0) >= 20;
const lat = (id) => P.get(id).center[1] / 6 + 39;
const same = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((x, k) => x === [...b].sort((x, y) => x - y)[k]);

// ---------------------------------------------------------------- grup sözleşmesi
ok(Object.keys(TYPES).join() === 'mayin,rota', 'TYPES');
ok(ORDER.length === 2 && ORDER.every(([t, n, s]) => TYPES[t] && n && s), 'ORDER');
for (const t of ['mayin', 'rota']) {
	ok(PROFILE[t] && limits(t).lo >= 20, t + ': PROFILE');
	ok(SAMPLES[t].length >= 30, t + ': en az 30 soru (' + SAMPLES[t].length + ')');
	const cats = new Set();
	const diffs = new Set();
	SAMPLES[t].forEach((q, k) => {
		ok(q.id === 'yn-' + t + '-' + (k + 1), q.id + ': kimlik sırası');
		if (k < 3) ok(q.diff === k + 1, q.id + ': ilk üç sorunun zorluğu değişmedi ' + q.diff);
		ok([1, 2, 3].includes(q.diff), q.id + ': zorluk ' + q.diff);
		ok(!!CATS[q.cat], q.id + ': kategori ' + q.cat);
		ok(q.type === t, q.id + ': tip');
		ok(!/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(JSON.stringify(q)), q.id + ': emoji');
		ok(!/'/.test(JSON.stringify(q).replace(/"/g, '')), q.id + ': düz kesme işareti (’ olmalı)');
		cats.add(q.cat);
		diffs.add(q.diff);
	});
	ok(diffs.size === 3 && cats.size >= 3, t + ': zorluk ve kategori dağılımı');
	ok(new Set(SAMPLES[t].map((q) => q.q)).size === SAMPLES[t].length, t + ': aynı soru metni iki kez');
}

// ---------------------------------------------------------------- veriden gerçekler
const ID = Object.fromEntries(DATA.provinces.map((p) => [p.name, p.id]));
const ids = (s) => s.split(',').map((n) => {
	ok(ID[n] != null, 'il adı: ' + n);
	return ID[n];
});
// kara sınırı: veride yabancı ülkeyle (−1) sınırı ≥ 20 km olan iller (15 il)
const land = new Map();
for (const b of DATA.borders) {
	if (P.has(b.a) && P.has(b.b)) continue;
	const other = P.has(b.a) ? b.b : b.a;
	const pid = P.has(b.a) ? b.a : b.b;
	if (other === -1) land.set(pid, (land.get(pid) || 0) + len(b.pts));
}
const sinir = (id) => (land.get(id) || 0) >= 20;
ok(same([...land.keys()].filter(sinir), ids('Edirne,Kırklareli,Artvin,Ardahan,Kars,Iğdır,Ağrı,Van,Hakkari,Şırnak,Mardin,Şanlıurfa,Gaziantep,Kilis,Hatay')), 'veri: 15 sınır ili');
// denizler (elle; dört listenin birleşimi verideki 28 kıyı iliyle aynı olmalı)
const DENIZ = {
	K: ids('Kırklareli,İstanbul,Kocaeli,Sakarya,Düzce,Zonguldak,Bartın,Kastamonu,Sinop,Samsun,Ordu,Giresun,Trabzon,Rize,Artvin'),
	M: ids('Tekirdağ,İstanbul,Kocaeli,Yalova,Bursa,Balıkesir,Çanakkale'),
	E: ids('Edirne,Çanakkale,Balıkesir,İzmir,Aydın,Muğla'),
	A: ids('Muğla,Antalya,Mersin,Adana,Hatay'),
};
const kiyi = (id) => Object.keys(DENIZ).filter((k) => DENIZ[k].includes(id));
ok(same([...new Set(Object.values(DENIZ).flat())], [...sea.keys()].filter(coast)), 'deniz listeleri verideki 28 kıyı iliyle aynı değil');
// Suriye sınırı (elle; hepsi verideki sınır illerinden)
const SURIYE = ids('Hatay,Kilis,Gaziantep,Şanlıurfa,Mardin,Şırnak');
ok(SURIYE.every(sinir), 'Suriye sınırındaki iller veride sınır ili');
const IRAN = ids('Iğdır,Ağrı,Van,Hakkari');
ok(IRAN.every(sinir), 'İran sınırındaki iller veride sınır ili');
// göl kıyısı: verideki göl halkasının noktaları (çevresinde) ilin içinde
const pip = (x, y, r) => {
	let c = false;
	for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
		const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
	}
	return c;
};
const inP = (id, x, y) => P.get(id).rings.some((r) => pip(x, y, r));
const golKiyi = (ad) => {
	const L = DATA.lakes.find((l) => l.name === ad);
	const n = new Map();
	for (let k = 0; k < L.ring.length; k += 2)
		for (const p of DATA.provinces)
			for (const [dx, dy] of [[0.08, 0], [-0.08, 0], [0, 0.08], [0, -0.08]]) if (inP(p.id, L.ring[k] + dx, L.ring[k + 1] + dy)) n.set(p.id, (n.get(p.id) || 0) + 1);
	return [...n].filter(([, c]) => c >= 40).map(([id]) => id);
};
const BUYUKSEHIR = ids('Adana,Ankara,Antalya,Aydın,Balıkesir,Bursa,Denizli,Diyarbakır,Erzurum,Eskişehir,Gaziantep,Hatay,İstanbul,İzmir,Kahramanmaraş,Kayseri,Kocaeli,Konya,Malatya,Manisa,Mardin,Mersin,Muğla,Ordu,Sakarya,Samsun,Şanlıurfa,Tekirdağ,Trabzon,Van');
ok(BUYUKSEHIR.length === 30, '30 büyükşehir');
const UNVAN = ids('Gaziantep,Kahramanmaraş,Şanlıurfa');
const reg = (id) => P.get(id).region;
const nbs = (id) => P.get(id).nb;

// Mayın Tarlası: her sorunun güvenli illeri = tarladan kurala uyanlar (kural veriden ya da yukarıdaki listelerden)
const MK = {
	'yn-mayin-1': (id) => nbs(6).includes(id),
	'yn-mayin-2': (id) => !coast(id),
	'yn-mayin-3': (id) => id >= 68,
	'yn-mayin-4': (id) => kiyi(id).includes('K'),
	'yn-mayin-5': (id) => kiyi(id).includes('A'),
	'yn-mayin-6': (id) => kiyi(id).includes('M'),
	'yn-mayin-7': (id) => kiyi(id).length === 2,
	'yn-mayin-8': (id) => reg(id) === 'karadeniz' && !coast(id),
	'yn-mayin-9': (id) => golKiyi('Tuz Gölü').includes(id),
	'yn-mayin-10': sinir,
	'yn-mayin-11': (id) => SURIYE.includes(id),
	'yn-mayin-12': (id) => IRAN.includes(id),
	'yn-mayin-13': (id) => nbs(42).includes(id),
	'yn-mayin-14': (id) => nbs(58).includes(id),
	'yn-mayin-15': (id) => nbs(25).includes(id),
	'yn-mayin-16': (id) => nbs(46).includes(id),
	'yn-mayin-17': (id) => nbs(14).includes(id),
	'yn-mayin-18': (id) => nbs(21).includes(id),
	'yn-mayin-19': (id) => nbs(3).includes(id),
	'yn-mayin-20': (id) => nbs(id).length >= 7,
	'yn-mayin-21': (id) => nbs(id).length === 3,
	'yn-mayin-22': (id) => reg(id) === 'guneydogu',
	'yn-mayin-23': (id) => reg(id) === 'ege',
	'yn-mayin-24': (id) => reg(id) === 'icanadolu',
	'yn-mayin-25': (id) => reg(id) === 'akdeniz',
	'yn-mayin-26': (id) => reg(id) === 'marmara',
	'yn-mayin-27': (id) => reg(id) === 'dogu',
	'yn-mayin-28': (id) => id > 40,
	'yn-mayin-29': (id) => id >= 72,
	'yn-mayin-30': (id) => UNVAN.includes(id),
	'yn-mayin-31': (id) => BUYUKSEHIR.includes(id),
};
ok(same(golKiyi('Tuz Gölü'), ids('Ankara,Konya,Aksaray')), 'veri: Tuz Gölü üç ilin sınırında');
for (const q of SAMPLES.mayin) {
	ok(q.alan.length >= 10 && q.alan.length <= 16, q.id + ': tarla 10–16 il (' + q.alan.length + ')');
	ok(new Set(q.alan).size === q.alan.length && q.alan.every((id) => P.has(id)), q.id + ': tarla illeri');
	ok(q.guvenli.every((id) => q.alan.includes(id)), q.id + ': güvenli il tarlada değil');
	ok(q.guvenli.length >= 3 && q.alan.length - q.guvenli.length >= 3, q.id + ': güvenli ve mayın en az 3');
	ok(q.merkez == null || !q.alan.includes(q.merkez), q.id + ': merkez tarlada');
	ok(q.mayin && q.not && [...q.not].length <= 96, q.id + ': mayın kuralı ve kısa not');
	const rule = MK[q.id];
	ok(!!rule, q.id + ': sınamada kuralı yok');
	if (!rule) continue;
	const want = q.alan.filter(rule);
	ok(same(q.guvenli, want), q.id + ': güvenli iller kurala uymuyor (olmalı: ' + want.map(name) + ' · yazılan: ' + q.guvenli.map(name) + ')');
	// komşuluk sorusunda merkezin bütün komşuları tarlada (eksik komşu tuzak sayılırdı)
	if (q.merkez != null) {
		const nb = nbs(q.merkez);
		ok(nb.every((id) => q.alan.includes(id)), q.id + ': merkezin her komşusu tarlada değil (' + nb.filter((id) => !q.alan.includes(id)).map(name) + ')');
		ok(new RegExp(nb.length + ' komşu').test(q.not), q.id + ': notta komşu sayısı');
	}
	// tarla bir bütün: her il tarladaki (ya da merkezdeki) bir ile komşu (kamera dar bir bölgeyi çerçeveler)
	{
		const pool = q.merkez != null ? [...q.alan, q.merkez] : q.alan;
		ok(q.alan.every((id) => nbs(id).some((x) => pool.includes(x))), q.id + ': tarlada kopuk il (' + q.alan.filter((id) => !nbs(id).some((x) => pool.includes(x))).map(name) + ')');
	}
}
// notlarda adı geçen sayılar ve tuzaklar
ok(same(SAMPLES.mayin[2].guvenli, [74, 77, 78, 81]), 'yn-mayin-3: notta adı geçen genç iller (Bartın, Yalova, Karabük, Düzce)');
ok(nbs(42).length === 9 && nbs(25).length === 9 && nbs(58).length === 8 && nbs(46).length === 7, 'veri: komşu sayıları (Konya, Erzurum 9; Sivas 8; Kahramanmaraş 7)');
ok(!coast(ID['Osmaniye']) && reg(ID['Osmaniye']) === 'akdeniz', 'veri: Osmaniye Akdeniz’de ve kıyısız');
ok(!sinir(ID['Erzurum']) && sinir(ID['Iğdır']), 'veri: Erzurum’un ülke sınırı yok');
ok([...sea.keys()].filter(coast).filter(sinir).length === 4, 'veri: hem kıyı hem sınır ili dört');

// Uçuş Rotası
const lon = (id) => P.get(id).center[0];
const desc = (a, f) => a.every((x, k) => !k || f(a[k - 1]) > f(x));
const asc = (a, f) => a.every((x, k) => !k || f(a[k - 1]) < f(x));
const peak = (ad) => DATA.peaks.find((p) => p.name === ad);
const nehir = (ad) => {
	// verideki ırmak çizgisinin (ilk parça) geçtiği iller sırasıyla
	const s = DATA.rivers.find((r) => r.name === ad);
	const seq = [];
	for (let k = 0; k < s.pts.length; k += 2) {
		const p = DATA.provinces.find((p) => inP(p.id, s.pts[k], s.pts[k + 1]));
		if (p && seq[seq.length - 1] !== p.id) seq.push(p.id);
	}
	return seq;
};
const altdizi = (a, b) => {
	let j = 0;
	for (const x of b) if (x === a[j]) j++;
	return j === a.length;
};
const RK = {
	'yn-rota-1': (I) => I.map(name).join() === 'Samsun,Amasya,Erzurum,Sivas,Ankara',
	'yn-rota-2': (I) => I.every(coast) && desc(I, lat) && I.join() === DENIZ.E.slice().sort((a, b) => lat(b) - lat(a)).join(),
	'yn-rota-3': (I, q) => q.duraklar.map((d) => d.ad).join() === 'Göbeklitepe,Çatalhöyük,Efes,Ayasofya,Selimiye,Anıtkabir' && I.map(name).join() === 'Şanlıurfa,Konya,İzmir,İstanbul,Edirne,Ankara',
	'yn-rota-4': (I) => I.every((id) => kiyi(id).includes('K')) && asc(I, lon),
	'yn-rota-5': (I) => same(I, DENIZ.A) && asc(I, lon),
	'yn-rota-6': (I) => desc(I, lat) && I.every((x, k) => !k || lat(I[k - 1]) - lat(x) > 0.5),
	'yn-rota-7': (I) => same(I, SURIYE) && asc(I, lon),
	'yn-rota-8': (I) => I.every(sinir) && desc(I, lat),
	'yn-rota-9': (I) => I.every((id) => kiyi(id).includes('M')) && I.every((x, k) => !k || nbs(I[k - 1]).includes(x)) && I.map(name).join() === 'Tekirdağ,İstanbul,Kocaeli,Yalova,Bursa,Balıkesir',
	'yn-rota-10': (I) => desc(I, lon) && I.map(name).join() === 'Erzincan,Tokat,Çorum,Bolu,Düzce,Kocaeli',
	'yn-rota-11': (I) => altdizi(I, nehir('Kızılırmak')) && I[0] === ID['Sivas'] && I[I.length - 1] === ID['Samsun'],
	'yn-rota-12': (I) => altdizi(I, nehir('Dicle')),
	'yn-rota-13': (I, q) => q.duraklar.map((d) => d.ad || name(d.il)).join() === 'Erzurum,Kemaliye,Keban,Birecik,Karkamış' && I.map(name).join() === 'Erzurum,Erzincan,Elazığ,Şanlıurfa,Gaziantep',
	'yn-rota-14': (I, q) =>
		q.duraklar.every((d) => {
			const p = peak(d.ad);
			return p && inP(d.il, p.p[0], p.p[1]) && d.not === p.m + ' m';
		}) && asc(q.duraklar, (d) => peak(d.ad).m),
	'yn-rota-15': (I) => I.map(name).join() === 'İzmir,Ankara,Sivas,Kars,Erzurum',
	'yn-rota-16': (I) => desc(I, (id) => P.get(id).area) && I[0] === DATA.provinces.slice().sort((a, b) => b.area - a.area)[0].id && I[I.length - 1] === DATA.provinces.slice().sort((a, b) => a.area - b.area)[0].id,
	'yn-rota-17': (I, q) => q.duraklar.map((d) => d.ad).join() === 'Van Gölü,Tuz Gölü,Beyşehir,Eğirdir,İznik' && [['Van Gölü', 0], ['Tuz Gölü', 1], ['Beyşehir Gölü', 2], ['Eğirdir Gölü', 3], ['İznik Gölü', 4]].every(([g, k]) => golKiyi(g).includes(I[k])),
	'yn-rota-18': (I, q) => asc(I, (id) => id) && q.duraklar.every((d) => d.not.startsWith(String(d.il))),
	'yn-rota-19': (I) => I.map(name).join() === 'Muş,Bursa,İstanbul,Çanakkale,Kütahya',
	'yn-rota-20': (I) => I.map(name).join() === 'Bilecik,Bursa,Edirne,İstanbul,Ankara',
	'yn-rota-21': (I) => I.map(name).join() === 'Eskişehir,Afyonkarahisar,Kütahya,İzmir,Bursa,Ankara',
	'yn-rota-22': (I) => I.map(name).join() === 'Çorum,Ankara,Manisa,Konya,Bursa',
	'yn-rota-23': (I, q) => asc(I, (id) => id) && I.every((id) => id >= 68) && asc(q.duraklar, (d) => +d.not),
	'yn-rota-24': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Çorum,Adıyaman,Denizli,Karabük,Çanakkale',
	'yn-rota-25': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Konya,Kars,Aydın,Şanlıurfa,Malatya,Ankara',
	'yn-rota-26': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Sivas,Bursa,Edirne,İstanbul,Ankara',
	'yn-rota-27': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Tekirdağ,Diyarbakır,Sivas,Sakarya,Kırşehir',
	'yn-rota-28': (I) => I.map(name).join() === 'Aydın,Muğla,Sinop,Amasya,İzmir,Çanakkale',
	'yn-rota-29': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'İstanbul,Ankara,İzmir,Bursa,Eskişehir,Trabzon',
	'yn-rota-30': (I) => I.map(name).join() === 'Ankara,Kayseri,Sivas,Erzincan,Erzurum,Kars',
	'yn-rota-31': (I) => I.map(name).join() === 'Ankara,Eskişehir,Bilecik,Sakarya,Kocaeli,İstanbul' && I.every((x, k) => !k || nbs(I[k - 1]).includes(x)),
	// 2026-11 büyütmesi: yazılı (kaynaklardan doğrulanmış) sıra; yıl notlarında artış, yönlerde il ortaları, dağda veri
	'yn-rota-32': (I) => I.map(name).join() === 'Kahramanmaraş,Şanlıurfa,Gaziantep,Adana,İzmir',
	'yn-rota-33': (I) => I.map(name).join() === 'Bursa,Eskişehir,Konya,Kayseri,Kahramanmaraş,Hatay',
	'yn-rota-34': (I) => I.map(name).join() === 'Edirne,Çanakkale,Manisa,Denizli,Konya,Mersin',
	'yn-rota-35': (I) => I.map(name).join() === 'Çanakkale,Manisa,Aydın,Muğla,Ankara,Mersin',
	'yn-rota-36': (I) => I.map(name).join() === 'Trabzon,Ordu,Sinop,Zonguldak,İstanbul' && desc(I, lon),
	'yn-rota-37': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Ankara,Erzincan,Kars,Çanakkale,Eskişehir',
	'yn-rota-38': (I, q) => asc(q.duraklar, (d) => +d.not.slice(-4)) && I.map(name).join() === 'Edirne,Manisa,İstanbul,Kocaeli',
	'yn-rota-39': (I) => I.map(name).join() === 'Amasya,Trabzon,İstanbul,Tekirdağ',
	'yn-rota-40': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Aydın,Ankara,Konya,Sivas,Diyarbakır,Erzurum',
	'yn-rota-41': (I) => I.map(name).join() === 'Sivas,Ankara,Bursa,İzmir',
	'yn-rota-42': (I, q) => asc(q.duraklar, (d) => parseInt(d.not)) && I.map(name).join() === 'Tunceli,Hatay,Uşak,Adıyaman',
	'yn-rota-43': (I) => I.map(name).join() === 'Balıkesir,Erzurum,Aydın,Manisa,Sivas',
	'yn-rota-44': (I, q) => asc(q.duraklar, (d) => parseInt(d.not)) && I.map(name).join() === 'Eskişehir,Balıkesir,Aydın,Manisa,Bursa',
	'yn-rota-45': (I) => I.map(name).join() === 'Malatya,Erzincan,Karaman,Konya',
	'yn-rota-46': (I) => I.map(name).join() === 'Yozgat,Aydın,Konya,Sinop,Ankara',
	'yn-rota-47': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Diyarbakır,Trabzon,Manisa,İzmir,Ankara',
	'yn-rota-48': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Kastamonu,Adana,Konya,Manisa,Burdur',
	'yn-rota-49': (I, q) => asc(q.duraklar, (d) => parseInt(d.not)) && I.map(name).join() === 'Denizli,İzmir,Van,Bursa,İstanbul',
	'yn-rota-50': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'İstanbul,Mersin,Kocaeli,Ankara',
	'yn-rota-51': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Antalya,Adana,İstanbul,Ankara',
	'yn-rota-52': (I, q) => asc(q.duraklar, (d) => parseInt(d.not)) && I.map(name).join() === 'Kırşehir,Ankara,Erzurum,Şanlıurfa,İstanbul',
	'yn-rota-53': (I, q) => asc(q.duraklar, (d) => +d.not.slice(-4)) && I.map(name).join() === 'İzmir,Erzurum,Mersin,Samsun,Konya',
	'yn-rota-54': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'İzmir,Adana,Samsun,Antalya,Sivas,Gaziantep',
	'yn-rota-55': (I) => asc(I, lon) && I.map(name).join() === 'Bursa,Bolu,Kayseri,Erzurum,Kars',
	'yn-rota-56': (I) => asc(I, lon) && same(I, ids('İzmir,İstanbul,Ankara,Kayseri')),
	'yn-rota-57': (I) => I.map(name).join() === 'İzmir,Bursa,Adana,İstanbul,Diyarbakır,Mardin',
	'yn-rota-58': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'Kayseri,Sivas,Amasya,Edirne,Manisa',
	'yn-rota-59': (I) => asc(I, lon) && I.map(name).join() === 'Manisa,Konya,Kayseri,Bitlis',
	'yn-rota-60': (I, q) => asc(q.duraklar, (d) => +d.not) && I.map(name).join() === 'İzmir,Antalya,Ankara,Kayseri,Diyarbakır,Erzurum',
	'yn-rota-61': (I) => I.map(name).join() === 'Ankara,Kırıkkale,Yozgat,Sivas' && I.every((x, k) => !k || nbs(I[k - 1]).includes(x)),
	'yn-rota-62': (I) => asc(I, lon) && I.map(name).join() === 'Tekirdağ,Bursa,Sakarya,Sivas,Trabzon',
	'yn-rota-63': (I) => I.map(name).join() === 'İstanbul,Kocaeli,Sakarya,Düzce,Bolu,Ankara' && I.every((x, k) => !k || nbs(I[k - 1]).includes(x)),
	'yn-rota-64': (I) => asc(I, lon) && I.map(name).join() === 'Bursa,Adana,Tokat,Şanlıurfa,Erzurum',
	'yn-rota-65': (I) => I.map(name).join() === 'Sinop,Iğdır,Hatay,Çanakkale',
	'yn-rota-66': (I, q) => asc(q.duraklar, (d) => parseInt(d.not)) && I.map(name).join() === 'Yozgat,Ankara,Bursa,Bolu,Nevşehir',
	'yn-rota-67': (I) => I.every(coast) && I.map(name).join() === 'Kocaeli,Bursa,Balıkesir,İzmir,Muğla,Hatay',
	'yn-rota-68': (I) => asc(I, lon) && I.map(name).join() === 'Bursa,Antalya,Kayseri,Erzurum,Van',
	'yn-rota-69': (I) => asc(I, lon) && I.every((id) => kiyi(id).includes('K')) && I.map(name).join() === 'Ordu,Giresun,Trabzon,Rize,Artvin',
	'yn-rota-70': (I, q) =>
		q.duraklar.every((d) => {
			const p = peak(d.ad);
			return p && inP(d.il, p.p[0], p.p[1]) && d.not === p.m + ' m';
		}) && asc(q.duraklar, (d) => peak(d.ad).m),
	'yn-rota-71': (I) => asc(I, lon) && I.map(name).join() === 'Bursa,Burdur,Sakarya,Elazığ,Van',
};
ok(altdizi([58, 38, 50, 40, 71], nehir('Kızılırmak')) && nehir('Dicle')[0] === ID['Elazığ'], 'veri: ırmak çizgileri');
for (const q of SAMPLES.rota) {
	ok(q.duraklar.length >= 4 && q.duraklar.length <= 6, q.id + ': 4–6 durak');
	ok(new Set(q.duraklar.map((d) => d.il)).size === q.duraklar.length && q.duraklar.every((d) => P.has(d.il)), q.id + ': duraklar farklı iller');
	ok(q.duraklar.every((d) => d.not && [...d.not].length <= 12), q.id + ': her durağın kısa notu (' + q.duraklar.filter((d) => [...d.not].length > 12).map((d) => d.not) + ')');
	ok(q.duraklar.every((d) => !d.ad || [...d.ad].length <= 13), q.id + ': kart adı kısa');
	const I = q.duraklar.map((d) => d.il);
	const rule = RK[q.id];
	ok(!!rule && rule(I, q), q.id + ': sıra doğrulanamadı (' + I.map(name) + ')');
}

// ---------------------------------------------------------------- tip davranışı
const M = TYPES.mayin;
for (const q of SAMPLES.mayin) {
	const v = M.prepare(q, rng(3));
	ok(v.sec >= limits('mayin').lo && v.sec <= limits('mayin').hi, q.id + ': süre ' + v.sec);
	const S = q.guvenli;
	const mines = q.alan.filter((id) => !S.includes(id));
	// kısmi puan; ikinci mayından sonraki dokunuşlar sayılmaz; aynı ile iki dokunuş bir sayılır; tarla dışı sayılmaz
	const a = M.judge(v, { taps: [S[0], S[1], mines[0], S[2]] });
	const b = M.judge(v, { taps: [S[0], S[1], S[2]] });
	ok(a.score === 3 && b.score === 3 && b.err < a.err, q.id + ': mayın eşitlikte geride bırakır');
	const c = M.judge(v, { taps: [S[0], mines[0], mines[1], S[1], S[2]] });
	ok(c.score === 1 && !c.correct, q.id + ': ikinci mayından sonra dokunuş sayıldı');
	ok(M.judge(v, { taps: [S[0], S[0], S[0]] }).score === 1, q.id + ': aynı il iki kez sayıldı');
	ok(M.judge(v, { taps: [S[0], 34, 65, 6].filter((id) => !q.alan.includes(id)) }).score <= 1, q.id + ': tarla dışı il sayıldı');
	ok(M.judge(v, { taps: S }).correct && M.judge(v, { taps: S }).err === -S.length, q.id + ': temiz tarla');
	ok(mSonuc(v, { taps: [] }).dead === false && CAN === 2, q.id + ': iki can');
	// bot: değer api.answer ile aynı biçim; usta çoğu kez temizler
	let usta = 0;
	for (let k = 0; k < 200; k++) {
		const r = M.bot(v, 0.95, rng(50 + k));
		ok(Array.isArray(r.value?.taps) && r.value.taps.every((id) => q.alan.includes(id)), q.id + ': bot değeri');
		if (M.judge(v, r.value).correct) usta++;
	}
	ok(usta > 40, q.id + ': usta bot (0,95) tarlayı yeterince temizlemiyor (' + usta + '/200)');
	const j = M.joker('yari', v, rng(1));
	ok(j.mines.length === 2 && j.mines.every((i) => v.alan.includes(i) && !v.guvenli.includes(i)), q.id + ': joker mayın göstermiyor');
	const pv = M.publicView(v);
	ok(pv.guvenli == null && pv.q.guvenli == null && !JSON.stringify(pv).includes('"not"'), q.id + ': publicView güvenli illeri sızdırıyor');
	// çevrimiçi görünüm (güvenli iller yok): sayım ve biçim çökmesin; güvenli il sayısı görünümde kalır (sayaç)
	let pvOk = true;
	try {
		pvOk = pv.n === v.guvenli.length && M.fmt(pv, { taps: S }) === '0/' + v.guvenli.length + ' il' && typeof M.sub(pv, { taps: S }) === 'string';
	} catch {
		pvOk = false;
	}
	ok(pvOk, q.id + ': çevrimiçi görünümde fmt/sub çöküyor');
	ok(typeof M.fmt(v, { taps: S }) === 'string' && M.sub(v, { taps: [mines[0], mines[1]] }).includes('patladı'), q.id + ': fmt/sub');
}
const R = TYPES.rota;
for (const q of SAMPLES.rota) {
	const v = R.prepare(q, rng(5));
	const ids = q.duraklar.map((d) => d.il);
	const n = ids.length;
	ok(v.sec >= limits('rota').lo && v.sec <= limits('rota').hi, q.id + ': süre ' + v.sec);
	ok(v.kart.length === n && v.kart[0] !== v.sira[0], q.id + ': kartlar karışık değil (kalkış ilk kartta)');
	for (let s = 0; s < 30; s++) {
		const w = R.prepare(q, rng(100 + s));
		ok(w.kart[0] !== w.sira[0] && w.kart.filter((x, k) => x === w.sira[k]).length <= 1, q.id + ': karışım kuralı');
	}
	// en uzun doğru başlangıç; eşitlikte doğru yer sayısı
	const sw = ids.slice();
	[sw[2], sw[3]] = [sw[3], sw[2]];
	const j1 = R.judge(v, { route: sw });
	ok(rSonuc(v, sw).pre === 2 && rSonuc(v, sw).pos === n - 2 && !j1.correct, q.id + ': başlangıç / yer');
	const sh = [...ids.slice(1), ids[0]]; // kalkış yanlış uca: başlangıç 0
	ok(rSonuc(v, sh).pre === 0 && R.judge(v, sh).err > j1.err, q.id + ': kalkış yanlış');
	const part = ids.slice(0, 3);
	ok(rSonuc(v, part).pre === 3 && !R.judge(v, { route: part }).correct && R.sub(v, { route: part }) === 'rota yarım kaldı', q.id + ': eksik rota (süre doldu)');
	const t1 = [ids[0], ids[1], ids[3], ids[2], ...ids.slice(4)];
	const t2 = [ids[0], ids[1], ids[4] ?? ids[3], ids[2], ids[3], ...ids.slice(5)].filter((x, k, a) => a.indexOf(x) === k);
	ok(R.judge(v, { route: t1 }).err <= R.judge(v, { route: t2 }).err, q.id + ': eşitlikte doğru yer');
	ok(R.judge(v, { route: ids }).correct && R.judge(v, { route: ids }).err === 0, q.id + ': tam rota');
	ok(R.judge(v, { route: [ids[0], ids[0], ids[1]] }).score === 2, q.id + ': yinelenen durak');
	let usta = 0;
	for (let k = 0; k < 200; k++) {
		const r = R.bot(v, 0.95, rng(70 + k));
		ok(Array.isArray(r.value?.route) && r.value.route.length === n && new Set(r.value.route).size === n, q.id + ': bot değeri');
		if (R.judge(v, r.value).correct) usta++;
	}
	ok(usta > 60, q.id + ': usta bot (0,95) rotayı yeterince bilmiyor (' + usta + '/200)');
	const jk = R.joker('yari', v);
	ok(jk.uc[0] === v.sira[0] && jk.uc[1] === v.sira[n - 1], q.id + ': joker kalkış ve varış');
	const pv = R.publicView(v);
	ok(pv.sira == null && pv.q.duraklar == null && pv.not == null && pv.kart.length === n, q.id + ': publicView sırayı sızdırıyor');
	let pvOk = true;
	try {
		pvOk = R.fmt(pv, { route: sw }) === '0/' + n + ' durak' && typeof R.sub(pv, { route: sw }) === 'string';
	} catch {
		pvOk = false;
	}
	ok(pvOk, q.id + ': çevrimiçi görünümde fmt/sub çöküyor');
	ok(R.fmt(v, { route: sw }) === '2/' + n + ' durak' && R.sub(v, { route: sw }) === '3. durakta saptı', q.id + ': fmt/sub');
}

console.log('  mayin  ' + SAMPLES.mayin.map((q) => q.id + ' ' + M.prepare(q, rng(1)).sec + ' sn').join(' · '));
console.log('  rota   ' + SAMPLES.rota.map((q) => q.id + ' ' + R.prepare(q, rng(1)).sec + ' sn').join(' · '));
console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni3-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
