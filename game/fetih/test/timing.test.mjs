// Soru süresi sınaması (düz node, bağımlılık yok):  node test/timing.test.mjs [--all]
// Bütün bankada süre bütçesini (src/quiz/timing.js) hesaplar; tip başına dağılımı, en kısa ve en uzun soruları
// yazar (insan gözüyle denetim için). Denetler: sayı ve sınır içinde, belirlenimci (kopya soru, publicView),
// metin uzadıkça ve zorluk arttıkça süre kısalmaz, yazılı tiplerde süre cevap uzunluğuyla büyür,
// botlar ne anında ne süre dolarken cevaplar. --all: her tipin bütün sorularını sırayla yazar.
import { BANK } from '../src/data/bank.js';
import { TYPES } from '../src/quiz/types.js';
import { timing, budget, PROFILE } from '../src/quiz/timing.js';
import { questionTime } from '../src/game/jokers.js';
import { publicView, LocalTransport, RemoteController, PROTOCOL } from '../src/game/net.js';
import { rng } from '../src/core/math.js';

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
	checks++;
	if (!cond) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + msg);
	}
};
const ALL = process.argv.includes('--all');
// eski sabit süreler (karşılaştırma için)
const OLD = { choice: 15, tf: 8, num: 20, pin: 15, hang: 30, order: 25, match: 25, hilo: 10, odd: 15, emoji: 15, proverb: 15, riddle: 20, anagram: 30, cross: 50, img: 20, blitz: 10 };
const clone = (q) => JSON.parse(JSON.stringify(q));
const short = (s, n = 70) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
/** Sorunun ekrandaki içeriğinin kısa özeti (soru metni + şıklar/öğeler). */
function text(q) {
	const extra =
		q.a?.join(' / ') ||
		q.opts?.join(' / ') ||
		q.items?.map((x) => x.t).join(' / ') ||
		q.pairs?.map((p) => p.join('=')).join(' / ') ||
		(q.left ? `${q.left.t} vs ${q.right.t} (${q.prop})` : '') ||
		q.words?.map((x) => `${x.w}: ${x.clue}`).join(' / ') ||
		q.w ||
		(q.max != null ? `${q.min}..${q.max} ${q.unit || ''}` : '');
	return short(`${q.text ? q.text + ' ' : ''}${q.e ? q.e + ' ' : ''}${q.q || ''}${extra ? ' | ' + extra : ''}`, 110);
}

// ---------------------------------------------------------------- yapay sorular (verisi olmayan tipler)
const SYN = [
	{ id: 'y-an1', cat: 'bilim', diff: 1, type: 'anagram', q: 'Evcil hayvan', w: 'KEDİ' },
	{ id: 'y-an2', cat: 'bilim', diff: 2, type: 'anagram', q: 'Sıcaklık ölçer', w: 'TERMOMETRE' },
	{ id: 'y-an3', cat: 'sanat', diff: 3, type: 'anagram', q: 'Kitapları düzenleyen meslek', w: 'KÜTÜPHANECİLİK' },
	{ id: 'y-cr1', cat: 'tarih', diff: 2, type: 'cross', q: 'Padişahlar', words: [{ w: 'FATİH', clue: 'İstanbul fatihi' }, { w: 'SELİM', clue: 'Yavuz' }, { w: 'KANUNİ', clue: 'Süleyman' }] },
	{
		id: 'y-cr2',
		cat: 'cografya',
		diff: 3,
		type: 'cross',
		q: 'Türkiye coğrafyası',
		words: [
			{ w: 'ERCİYES', clue: 'Kayseri’nin sönmüş volkanı' },
			{ w: 'KIZILIRMAK', clue: 'Türkiye’nin en uzun nehri' },
			{ w: 'TUZGÖLÜ', clue: 'İç Anadolu’nun tuzlu gölü' },
			{ w: 'KAÇKAR', clue: 'Doğu Karadeniz’in en yüksek dağı' },
			{ w: 'ALANYA', clue: 'Kızıl Kule’nin ilçesi' },
		],
	},
	{ id: 'y-im1', cat: 'cografya', diff: 1, type: 'img', q: 'Bu nedir?', img: 'kedi', mode: 'blur', a: ['Kedi', 'Köpek', 'Tavşan', 'Kuş'] },
	{ id: 'y-im2', cat: 'cografya', diff: 2, type: 'img', q: 'Siluetteki yapı hangisi?', img: 'galata', mode: 'silhouette', a: ['Galata Kulesi', 'Kız Kulesi', 'Saat Kulesi', 'Beyazıt Kulesi'] },
	{ id: 'y-im3', cat: 'eglence', diff: 2, type: 'img', q: 'Resimleri birleştir', img: ['kar', 'adam'], mode: 'rebus', w: 'KARADAM' },
	{ id: 'y-bz1', cat: 'eglence', diff: 1, type: 'blitz', q: 'Yıldırım', items: Array.from({ length: 14 }, (_, i) => ({ t: 'İfade ' + i, ans: i % 2 === 0 })) },
	{
		id: 'y-bz2',
		cat: 'cografya',
		diff: 2,
		type: 'blitz',
		q: 'Doğru mu yanlış mı?',
		items: Array.from({ length: 14 }, (_, i) => ({ t: `${i + 1}. ifade: Van Gölü Türkiye’nin en büyük gölüdür ve sodalıdır`, ans: i % 2 === 0 })),
	},
];
const SET = [...BANK, ...SYN];

// ---------------------------------------------------------------- 1) bütün banka: biçim, sınır, belirlenim
console.log('1) Banka: biçim, sınırlar, belirlenim');
const rows = [];
for (const q of SET) {
	const t = timing(q);
	const P = PROFILE[q.type];
	ok(P, `${q.id}: ${q.type} için süre profili yok`);
	ok(Number.isInteger(t.sec) && Number.isFinite(t.raw), `${q.id}: süre sayı değil (${t.sec}, ${t.raw})`);
	if (P) ok(t.sec >= P.min && t.sec <= P.max, `${q.id}: süre ${t.sec} sınır dışı [${P.min}, ${P.max}]`);
	ok(t.fast > 0 && t.fast < t.sec, `${q.id}: hızlı oyuncu süresi ${t.fast} (bütçe ${t.sec})`);
	ok([t.look, t.read, t.think, t.act].every(Number.isFinite), `${q.id}: bileşen NaN`);
	// belirlenim: kopya soru (önbellek yok) ve publicView sonrası aynı süre
	const c = timing(clone(q));
	ok(c.sec === t.sec && c.fast === t.fast, `${q.id}: kopyada farklı süre`);
	const T = TYPES[q.type];
	const v = T.prepare(q, rng(11));
	ok(v.sec === t.sec && v.fast === t.fast, `${q.id}: prepare v.sec ${v.sec} ≠ ${t.sec}`);
	const pv = clone(publicView(T, v));
	ok(pv.sec === t.sec, `${q.id}: publicView süreyi taşımıyor`);
	rows.push({ q, ...t });
}

// ---------------------------------------------------------------- 2) dağılım
console.log('\n2) Tip başına süre (sn): eski sabit → yeni dağılım');
console.log('  tip       adet  eski   en az  %10  ortanca  %90  en çok  ort.   alt/üst sınırda');
const byType = {};
for (const r of rows) (byType[r.q.type] ||= []).push(r);
for (const [type, list] of Object.entries(byType)) {
	const s = list.map((r) => r.sec).sort((a, b) => a - b);
	const at = (f) => s[Math.min(s.length - 1, Math.floor(s.length * f))];
	const mean = s.reduce((a, b) => a + b, 0) / s.length;
	const P = PROFILE[type];
	const lo = list.filter((r) => r.raw < P.min).length;
	const hi = list.filter((r) => r.raw > P.max).length;
	console.log(
		`  ${type.padEnd(8)} ${String(list.length).padStart(5)}  ${String(OLD[type] ?? '?').padStart(4)}   ${String(s[0]).padStart(5)} ${String(at(0.1)).padStart(4)} ${String(at(0.5)).padStart(8)} ${String(at(0.9)).padStart(4)} ${String(s[s.length - 1]).padStart(7)}  ${mean.toFixed(1).padStart(5)}   ${lo}/${hi}`,
	);
	// tipin `time` alanı (belge/yedek) bankanın ortancasına yakın olmalı
	if (list.length >= 20) ok(Math.abs(TYPES[type].time - at(0.5)) <= 2, `${type}: T.time ${TYPES[type].time} ortancadan (${at(0.5)}) uzak`);
}

// ---------------------------------------------------------------- 3) uçlar (insan gözüyle)
console.log('\n3) En kısa ve en uzun süreler');
const sorted = rows.filter((r) => !r.q.id.startsWith('y-')).sort((a, b) => a.raw - b.raw || a.q.id.localeCompare(b.q.id));
const line = (r) => `  ${String(r.sec).padStart(2)} sn (eski ${String(OLD[r.q.type]).padStart(2)})  ${r.q.type.padEnd(7)} z${r.q.diff}  ${text(r.q)}`;
console.log(' en kısa:');
for (const r of sorted.slice(0, 6)) console.log(line(r));
console.log(' en uzun:');
for (const r of sorted.slice(-6)) console.log(line(r));
console.log(' tip başına en kısa / en uzun:');
for (const [type, list] of Object.entries(byType)) {
	const s = list.slice().sort((a, b) => a.raw - b.raw || a.q.id.localeCompare(b.q.id));
	console.log(line(s[0]));
	if (s.length > 1) console.log(line(s[s.length - 1]));
	if (ALL) for (const r of s.slice(1, -1)) console.log('   ' + line(r));
}

// ---------------------------------------------------------------- 4) tutarlılık: uzayan metin, zorluk, cevap uzunluğu
console.log('\n4) Tutarlılık');
const first = (type) => SET.find((q) => q.type === type);
for (const type of Object.keys(byType)) {
	const q = first(type);
	const longer = { ...q, q: (q.q || '') + ' Bu cümle soruyu biraz daha uzatmak için eklenmiştir.' };
	ok(timing(longer).raw > timing(q).raw && budget(longer) >= budget(q), `${type}: uzayan metin süreyi artırmadı`);
	const d1 = timing({ ...q, diff: 1 });
	const d3 = timing({ ...q, diff: 3 });
	ok(d3.raw >= d1.raw && d3.sec >= d1.sec, `${type}: zor soru (${d3.sec}) kolaydan (${d1.sec}) kısa`);
	if (type !== 'blitz') ok(d3.raw > d1.raw, `${type}: zorluk süreyi hiç değiştirmiyor`);
}
// yazılı tipler: cevap uzadıkça süre büyür
const grows = (label, make, words) => {
	const secs = words.map((w) => timing(make(w)));
	for (let i = 1; i < secs.length; i++) ok(secs[i].raw > secs[i - 1].raw && secs[i].sec >= secs[i - 1].sec, `${label}: ${words[i]} (${secs[i].sec}) ≤ ${words[i - 1]} (${secs[i - 1].sec})`);
	ok(secs[secs.length - 1].sec > secs[0].sec, `${label}: en uzun cevap en kısa ile aynı sürede`);
	console.log(`  ${label.padEnd(14)} ` + words.map((w, i) => `${w.length} harf → ${secs[i].sec} sn`).join(', '));
};
const W = ['KAR', 'KEDİ', 'MERKÜR', 'MARATON', 'TERMOMETRE', 'KÜTÜPHANECİLİK'];
// adam asmacada asıl girdi farklı harf sayısıdır (TERMOMETRE 5 farklı harf): artan farklı harfle sınanır
grows('adam asmaca', (w) => ({ type: 'hang', diff: 2, q: 'İpucu', w }), ['KAR', 'KEDİ', 'MERKÜR', 'MARATON', 'KOLEZYUM', 'KÜTÜPHANECİLİK']);
grows('anagram', (w) => ({ type: 'anagram', diff: 2, q: 'İpucu', w }), W);
grows('resimli yazı', (w) => ({ type: 'img', diff: 2, q: 'Bu ne?', img: 'x', mode: 'silhouette', w }), W);
{
	const base = SYN.find((q) => q.id === 'y-cr2');
	const sets = [2, 3, 4, 5].map((n) => ({ ...base, words: base.words.slice(0, n) }));
	const secs = sets.map((q) => timing(q).sec);
	for (let i = 1; i < secs.length; i++) ok(secs[i] > secs[i - 1], `çengel: ${i + 2} kelime (${secs[i]}) ≤ ${i + 1} kelime (${secs[i - 1]})`);
	console.log(`  çengel         ` + secs.map((s, i) => `${i + 2} kelime → ${s} sn`).join(', '));
}
// sırala / eşleştir: öğe metni uzadıkça
{
	const o = first('order');
	const o2 = { ...o, items: o.items.map((x) => ({ ...x, t: x.t + ' (ayrıntılı açıklama)' })) };
	ok(timing(o2).raw > timing(o).raw, 'sırala: uzun öğeler süreyi artırmadı');
	const m = first('match');
	const m2 = { ...m, pairs: m.pairs.map(([a, b]) => [a + ' uzun ad', b + ' uzun karşılık']) };
	ok(timing(m2).raw > timing(m).raw, 'eşleştir: uzun çiftler süreyi artırmadı');
	const n = first('num');
	ok(timing({ ...n, min: 0, max: 100000 }).raw > timing({ ...n, min: 0, max: 50 }).raw, 'tahmin: geniş aralık süreyi artırmadı');
	const c = first('choice');
	ok(timing({ ...c, a: c.a.map((x) => x + ' ve uzun bir açıklama') }).raw > timing(c).raw, 'test: uzun şıklar süreyi artırmadı');
	const b1 = timing(SYN.find((q) => q.id === 'y-bz1'));
	const b2 = timing(SYN.find((q) => q.id === 'y-bz2'));
	ok(b2.sec > b1.sec, `yıldırım: uzun ifadeler (${b2.sec}) kısa ifadelerden (${b1.sec}) uzun sürmeli`);
	console.log(`  yıldırım       kısa ifadeler → ${b1.sec} sn, uzun ifadeler → ${b2.sec} sn`);
}
// bilinmeyen tip ve bozuk veri patlamaz
ok(Number.isFinite(budget({ type: 'yeni', q: 'Soru?' })), 'bilinmeyen tip');
ok(Number.isFinite(budget({ type: 'choice' })), 'eksik veri');
ok(Number.isFinite(budget(null)), 'boş soru');

// ---------------------------------------------------------------- 5) botlar bütçeye göre makul
console.log('\n5) Bot cevap süreleri (bütçeye oran)');
const botStat = {};
for (const q of SET) {
	const T = TYPES[q.type];
	for (const skill of [0.35, 0.55, 0.72, 0.86]) {
		for (let k = 0; k < 4; k++) {
			const R = rng(500 + k * 17 + q.id.length);
			const v = T.prepare(q, R);
			const b = T.bot(v, skill, R);
			const s = (botStat[q.type] ||= { n: 0, sum: 0, min: 9, max: 0, abs: 99 });
			const f = b.time / v.sec;
			s.n++;
			s.sum += f;
			s.min = Math.min(s.min, f);
			s.max = Math.max(s.max, f);
			s.abs = Math.min(s.abs, b.time);
			ok(b.time <= v.sec + 1e-9, `${q.id}: bot süre dolduktan sonra cevapladı (${b.time.toFixed(1)} > ${v.sec})`);
			ok(b.time >= Math.min(v.fast, v.sec * 0.6) - 1e-9 && b.time >= 1.5, `${q.id}: bot çok hızlı (${b.time.toFixed(1)} sn, hızlı oyuncu ${v.fast})`);
		}
	}
}
for (const [type, s] of Object.entries(botStat)) {
	const mean = s.sum / s.n;
	console.log(`  ${type.padEnd(8)} ort. %${Math.round(mean * 100)}  en az %${Math.round(s.min * 100)} (${s.abs.toFixed(1)} sn)  en çok %${Math.round(s.max * 100)}`);
	if (type !== 'blitz') {
		ok(mean > 0.35 && mean < 0.75, `${type}: bot ortalama süresi bütçenin %${Math.round(mean * 100)}'i`);
		ok(s.max <= 0.8 + 1e-9, `${type}: bot süreyi zorluyor (%${Math.round(s.max * 100)})`);
	}
}

// ---------------------------------------------------------------- 6) saat: jokerler
console.log('\n6) Saat ve jokerler');
ok(questionTime(12, 8) === 20, 'ekstra süre eklenmeli');
ok(questionTime(12, -5) === 7, 'sabotaj düşmeli');
ok(questionTime(7, -5, 9) === 9, 'sabotaj alt sınırı');
ok(questionTime(4, -5) === 3, 'en az 3 sn');
ok(questionTime(TYPES.tf) === TYPES.tf.time, 'eski çağrı (tip nesnesi)');

// ---------------------------------------------------------------- 7) ağ: uzak koltuk aynı saati alır
console.log('\n7) Ağ: uzak koltuk');
{
	// sunucu ucu RemoteController, istemci ucu elle: istekteki süreyi kaydedip görünümden bot cevabı üretir
	const [srv, cli] = LocalTransport.pair({ clone: true });
	const ctl = new RemoteController(srv, { seat: 1 });
	const seen = [];
	cli.onmessage((m) => {
		if (m.t !== 'req' || m.k !== 'answer') return;
		const T = TYPES[m.d.v.q.type];
		const b = T.bot(m.d.v, 0.6, rng(m.id));
		seen.push({ time: m.d.time, vsec: m.d.v.sec, bot: b.time });
		cli.send({ v: PROTOCOL, t: 'res', k: 'answer', id: m.id, seat: m.seat, d: { value: b.value, time: b.time } });
	});
	const types = Object.keys(byType);
	for (const type of types) {
		const q = SET.find((x) => x.type === type);
		const T = TYPES[type];
		const v = T.prepare(q, rng(3));
		const pv = publicView(T, v);
		// (şıklı tiplerde bot doğru şıkkı bilemez: publicView onu siler; burada yalnız süre denetlenir)
		await ctl.answer({ i: 1 }, { q: pv.q, v: pv, time: v.sec }, (v.sec + 12) * 1000);
		const s = seen[seen.length - 1];
		ok(s && s.time === budget(q) && s.vsec === budget(q), `${type}: uzak koltuk farklı süre aldı (${s?.time}, ${s?.vsec}, ${budget(q)})`);
		ok(s && s.bot <= s.time, `${type}: uzak bot süre dışında cevapladı`);
	}
	console.log(`  ${seen.length}/${types.length} tip: istek süresi = v.sec = budget(q)`);
}

// ---------------------------------------------------------------- 8) örnekler
console.log('\n8) Örnekler (eski → yeni)');
for (let i = 0; i < sorted.length; i += Math.floor(sorted.length / 9)) {
	const r = sorted[i];
	console.log(line(r) + `  [bakış ${r.look.toFixed(1)} + okuma ${r.read} harf + düşünme ${r.think.toFixed(1)} + giriş ${r.act.toFixed(1)} = ${r.raw}]`);
}

console.log(`\n${checks} denetim, ${fails} hata`);
process.exit(fails ? 1 : 0);
