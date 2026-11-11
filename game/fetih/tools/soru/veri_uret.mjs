// VERİDEN İL SORULARI: oyunun il verisinden (src/data/turkiye.json: plaka, ad, resmi bölge, komşular, yüzölçümü)
// doğruluğu veriden garanti çoktan seçmeli sorular üretir → src/data/q/veri.js (üretilen dosya, elle düzenlenmez).
//   node tools/soru/veri_uret.mjs
// Kullanıcı kararı (2026-11): bu sorular bankanın küçük bir payı kalır (%1–2); asıl banka elle yazılmış kültür soruları.
// Kalıplar (her biri sayıyla sınırlı):
//   komşu   "Hangisi X ile komşu değildir?"  üç gerçek komşu + komşunun komşusu (iki adım ötede, yakın ama değmez)
//   bölge   "Hangisi R Bölgesi'nde değildir?" bölgeden üç il + bölgeye sınırı olan başka bölgeden bir il
//   plaka   "Plaka kodu N olan il hangisidir?" aynı bölgeden çeldiriciler
//   alan    "Hangisinin yüzölçümü en büyüktür?" aynı bölgeden dört il; en büyüğü ikincisinden en az %25 büyük (çokgen alanı
//           gerçek yüzölçümüyle aynı sırada; pay ölçüm farkını kaldırır)
// Güven: komşuluğu yalnız denizden "değen" ya da kaynaklarda tartışmalı iller (KUSKU) komşu sorusuna hiç girmez.
// Deterministik (tohumlu): yeniden üretmek aynı dosyayı verir.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const D = JSON.parse(readFileSync(join(root, 'src/data/turkiye.json'), 'utf8'));
const P = new Map(D.provinces.map((p) => [p.id, p]));
const BOLGE = { marmara: 'Marmara', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', karadeniz: 'Karadeniz', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu Anadolu' };
const KUSKU = new Set([34, 77, 22, 17, 31, 1]); // İstanbul, Yalova, Edirne, Çanakkale, Hatay, Adana
const SAY = { komsu: 40, bolge: 30, plaka: 25, alan: 12 };
// bölge sorusunda tuzak olmaz: kıyısı Ege'ye bakan Marmara illeri ("Ege'de" denebilir, tartışmaya açık)
const BOLGE_KUSKU = new Set([10, 17]);
// alan sorusunda yer almaz: çokgen alanı kıyı ve boğaz kesimlerinde gerçekten sapan iller (Edirne ile Kırklareli gerçekte
// %5 farklı, çokgende %25+); KUSKU ile aynı küme

// her kalıbın kendi tohumu: bir kalıbı değiştirmek ötekilerin sorularını kaydırmaz
let s = 1;
const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const tohum = (n) => (s = n);
// bankada zaten sorulan bilgi: aynı soruyu üretme (plaka soruları 21, 33, 41, 67, 68; Penaltı'da Konya'nın komşuları)
const PLAKA_VAR = new Set([21, 33, 41, 67, 68]);
const KOMSU_VAR = new Set([42]);
// bölge: bankadaki "farklı olanı bul" sorularının ikilileri (bölge:tuzak il)
const BOLGE_VAR = new Set(['marmara:26', 'karadeniz:40', 'akdeniz:9', 'icanadolu:60', 'dogu:56']);
const karis = (a) => {
	a = a.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(R() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};
const ad = (id) => P.get(id).name;
const out = [];
const push = (kalip, diff, q, dogru, yanlis) => {
	const n = out.filter((x) => x.id.includes(`-${kalip}-`)).length + 1;
	out.push({ id: `cog-vr-${kalip}-${String(n).padStart(3, '0')}`, cat: 'cografya', diff, type: 'choice', tag: 'il', q, a: [dogru, ...yanlis] });
};
const yonelme = (s) => {
	// "X ile" yazımı: özel ad + "ile" (ek gerekmez)
	return s;
};

// ---------------------------------------------------------------- komşu
{
	tohum(20261111);
	const adaylar = karis([...P.values()].filter((p) => !KUSKU.has(p.id) && !KOMSU_VAR.has(p.id) && p.nb.filter((n) => !KUSKU.has(n)).length >= 4));
	for (const p of adaylar) {
		if (out.filter((x) => x.id.includes('-komsu-')).length >= SAY.komsu) break;
		const nb = p.nb.filter((n) => !KUSKU.has(n));
		const iki = new Set();
		for (const n of nb) for (const m of P.get(n).nb) if (m !== p.id && !p.nb.includes(m) && !KUSKU.has(m)) iki.add(m);
		if (!iki.size) continue;
		// tuzak: iki adım ötedeki illerden aynı bölgede olan önce (en inandırıcı)
		const tuz = karis([...iki]).sort((a, b) => (P.get(b).region === p.region) - (P.get(a).region === p.region))[0];
		const dog = karis(nb).slice(0, 3);
		const diff = P.get(tuz).region === p.region ? 3 : 2;
		push('komsu', diff, `Hangisi ${yonelme(p.name)} ile komşu değildir?`, ad(tuz), dog.map(ad));
	}
}
// ---------------------------------------------------------------- bölge
{
	tohum(20261112);
	const bolgeler = Object.keys(BOLGE);
	let k = 0;
	for (let tur = 0; tur < 20 && out.filter((x) => x.id.includes('-bolge-')).length < SAY.bolge; tur++)
		for (const r of karis(bolgeler)) {
			if (out.filter((x) => x.id.includes('-bolge-')).length >= SAY.bolge) break;
			const ici = [...P.values()].filter((p) => p.region === r);
			// sınır ili: başka bölgeden, bu bölgeye komşu
			const sinir = karis([...P.values()].filter((p) => p.region !== r && !BOLGE_KUSKU.has(p.id) && p.nb.some((n) => P.get(n).region === r)));
			const t = sinir[k++ % sinir.length];
			// üç bölge ili: tuzağın komşuları önce (yan yana duran iller: en çok karışan)
			const yakin = karis(ici.filter((p) => t.nb.includes(p.id)));
			const uzak = karis(ici.filter((p) => !t.nb.includes(p.id)));
			const uc = [...yakin, ...uzak].slice(0, 3);
			if (uc.length < 3) continue;
			const key = r + ':' + t.id;
			if (BOLGE_VAR.has(key)) continue;
			if (out.some((x) => x.key === key || x.a?.[0] === t.name && x.id.includes('-bolge-'))) continue; // her tuzak il bir kez
			push('bolge', yakin.length >= 2 ? 3 : 2, `Hangisi ${BOLGE[r]} Bölgesi’nde değildir?`, t.name, uc.map((p) => p.name));
			out[out.length - 1].key = key;
		}
	for (const x of out) delete x.key;
}
// ---------------------------------------------------------------- plaka
{
	tohum(20261113);
	const tanidik = new Set([6, 34, 35, 1, 7, 16]);
	const ids = karis([...P.keys()].filter((i) => !tanidik.has(i) && !PLAKA_VAR.has(i))).slice(0, SAY.plaka);
	for (const i of ids) {
		const p = P.get(i);
		const ayni = karis([...P.values()].filter((x) => x.region === p.region && x.id !== i)).slice(0, 3);
		if (ayni.length < 3) continue;
		const diff = i > 67 ? 3 : 2;
		push('plaka', diff, `Plaka kodu ${String(i).padStart(2, '0')} olan il hangisidir?`, p.name, ayni.map((x) => x.name));
	}
}
// ---------------------------------------------------------------- alan
{
	tohum(20261114);
	const bolgeler = Object.keys(BOLGE);
	const seen = new Set();
	for (let tur = 0; tur < 400 && out.filter((x) => x.id.includes('-alan-')).length < SAY.alan; tur++) {
		const r = bolgeler[tur % bolgeler.length];
		const dort = karis([...P.values()].filter((p) => p.region === r && !KUSKU.has(p.id))).slice(0, 4).sort((a, b) => b.area - a.area);
		if (dort.length < 4 || dort[0].area < dort[1].area * 1.4) continue;
		if (seen.has('top:' + dort[0].id)) continue; // her en büyük il bir kez
		seen.add('top:' + dort[0].id);
		const key = dort.map((p) => p.id).sort().join(',');
		if (seen.has(key)) continue;
		seen.add(key);
		push('alan', 2, 'Hangisinin yüzölçümü en büyüktür?', dort[0].name, karis(dort.slice(1)).map((p) => p.name));
	}
}

const metin = `// ÜRETİLEN DOSYA: elle düzenleme. Kaynak: tools/soru/veri_uret.mjs (il verisi src/data/turkiye.json).
// Verinin doğrudan sonucu olan il soruları; bankanın küçük bir payı (kullanıcı kararı 2026-11). ${out.length} soru.
export default [
${out.map((q) => '\t' + JSON.stringify(q)).join(',\n')}
];
`;
writeFileSync(join(root, 'src/data/q/veri.js'), metin);
const by = {};
for (const q of out) by[q.id.split('-')[2]] = (by[q.id.split('-')[2]] || 0) + 1;
console.log('üretildi', out.length, JSON.stringify(by));
