// YENİ grup 3 sınaması (Mayın Tarlası, Uçuş Rotası):  node test/yeni3.test.mjs
// deneme.test.mjs gibi esbuild ile paketler (tipler harita verisini içe aktarır).
// Denetler:
//   örnek gerçekleri harita verisinden (src/data/turkiye.json): komşuluk kuralında güvenli iller = merkezin tarladaki
//   komşuları ve merkezin bütün komşuları tarlada; kıyı kuralında güvenli iller = denize sınırı olmayanlar (deniz sınırı
//   ≥ 20 km; verinin yabancı kara sınırındaki birkaç km'lik kırıntıları sayılmaz); genç il kuralında güvenli iller =
//   plakası 68–81 olanlar; Ege rotasında duraklar Ege'ye (batı kıyısı) kıyısı olan illerin tamamı ve il merkezleri
//   kuzeyden güneye sıralı; tarla 10–16 il, rota 4–6 durak, kimlikler ve kategoriler doğru
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
	ok(SAMPLES[t].length === 3, t + ': 3 örnek');
	SAMPLES[t].forEach((q, k) => {
		ok(q.id === 'yn-' + t + '-' + (k + 1), q.id + ': kimlik');
		ok(q.diff === k + 1, q.id + ': zorluk ' + q.diff);
		ok(!!CATS[q.cat], q.id + ': kategori ' + q.cat);
		ok(q.type === t, q.id + ': tip');
		ok(!/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(JSON.stringify(q)), q.id + ': emoji');
		ok(!/'/.test(q.q + (q.mayin || '') + (q.not || '')), q.id + ': düz kesme işareti (’ olmalı)');
	});
}

// ---------------------------------------------------------------- Mayın Tarlası: gerçekler veriden
const [m1, m2, m3] = SAMPLES.mayin;
for (const q of SAMPLES.mayin) {
	ok(q.alan.length >= 10 && q.alan.length <= 16, q.id + ': tarla 10–16 il (' + q.alan.length + ')');
	ok(new Set(q.alan).size === q.alan.length && q.alan.every((id) => P.has(id)), q.id + ': tarla illeri');
	ok(q.guvenli.every((id) => q.alan.includes(id)), q.id + ': güvenli il tarlada değil');
	ok(q.guvenli.length >= 3 && q.alan.length - q.guvenli.length >= 3, q.id + ': güvenli ve mayın en az 3');
	ok(q.merkez == null || !q.alan.includes(q.merkez), q.id + ': merkez tarlada');
}
// 1) komşuluk
const nb = P.get(m1.merkez).nb;
ok(same(m1.guvenli, m1.alan.filter((id) => nb.includes(id))), m1.id + ': güvenli iller merkezin tarladaki komşuları değil');
ok(nb.every((id) => m1.alan.includes(id)), m1.id + ': merkezin her komşusu tarlada değil (' + nb.filter((id) => !m1.alan.includes(id)).map(name) + ')');
ok(name(m1.merkez) === 'Ankara' && nb.length === 7, m1.id + ': Ankara’nın 7 komşusu (not)');
// 2) kıyı (28 kıyı ili: veride deniz sınırı ≥ 20 km olanlar)
ok([...sea.keys()].filter(coast).length === 28, 'veri: 28 kıyı ili');
ok(same(m2.guvenli, m2.alan.filter((id) => !coast(id))), m2.id + ': güvenli iller kıyısı olmayanlar değil');
ok(m2.guvenli.includes(20) && !coast(20), m2.id + ': Denizli’nin kıyısı yok (not)');
// 3) genç iller (plaka 68–81: 1989'dan bu yana il oldu)
ok(same(m3.guvenli, m3.alan.filter((id) => id >= 68)), m3.id + ': güvenli iller plakası 68–81 olanlar değil');
ok(same(m3.guvenli, [74, 77, 78, 81]), m3.id + ': notta adı geçen genç iller (Bartın, Yalova, Karabük, Düzce)');

// ---------------------------------------------------------------- Uçuş Rotası: gerçekler
const [r1, r2, r3] = SAMPLES.rota;
for (const q of SAMPLES.rota) {
	ok(q.duraklar.length >= 4 && q.duraklar.length <= 6, q.id + ': 4–6 durak');
	ok(new Set(q.duraklar.map((d) => d.il)).size === q.duraklar.length && q.duraklar.every((d) => P.has(d.il)), q.id + ': duraklar farklı iller');
	ok(q.duraklar.every((d) => d.not && [...d.not].length <= 12), q.id + ': her durağın kısa notu');
}
ok(r1.duraklar.map((d) => name(d.il)).join() === 'Samsun,Amasya,Erzurum,Sivas,Ankara', r1.id + ': 1919 sırası');
const ege = r2.duraklar.map((d) => d.il);
ok(ege.every(coast), r2.id + ': her durağın kıyısı var');
for (let k = 1; k < ege.length; k++) ok(lat(ege[k - 1]) > lat(ege[k]), r2.id + ': kuzeyden güneye değil (' + name(ege[k - 1]) + ' / ' + name(ege[k]) + ')');
ok(ege.join() === '22,17,10,35,9,48', r2.id + ': Ege kıyısındaki altı il (Edirne, Çanakkale, Balıkesir, İzmir, Aydın, Muğla)');
ok(r3.duraklar.map((d) => d.ad).join() === 'Göbeklitepe,Çatalhöyük,Efes,Ayasofya,Selimiye,Anıtkabir', r3.id + ': yerler');
ok(r3.duraklar.map((d) => name(d.il)).join() === 'Şanlıurfa,Konya,İzmir,İstanbul,Edirne,Ankara', r3.id + ': yerlerin illeri');

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
	ok(R.fmt(v, { route: sw }) === '2/' + n + ' durak' && R.sub(v, { route: sw }) === '3. durakta saptı', q.id + ': fmt/sub');
}

console.log('  mayin  ' + SAMPLES.mayin.map((q) => q.id + ' ' + M.prepare(q, rng(1)).sec + ' sn').join(' · '));
console.log('  rota   ' + SAMPLES.rota.map((q) => q.id + ' ' + R.prepare(q, rng(1)).sec + ' sn').join(' · '));
console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'yeni3-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
