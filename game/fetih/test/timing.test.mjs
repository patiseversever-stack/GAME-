// Soru süresi sınaması (düz node, bağımlılık yok):  node test/timing.test.mjs [--all]
// Bütün bankada süre bütçesini (src/quiz/timing.js, model v0.6) hesaplar; tip başına önceki sürümle (v0.5) kıyaslı
// dağılımı, en kısa ve en uzun soruları yazar (insan gözüyle denetim için). Denetler:
//   - sayı ve sınır içinde, belirlenimci (kopya soru, prepare, publicView), hızlı < ortanca < yavaş oyuncu
//   - KIRMIZI kuralı: ortanca oyuncu son 5 sn'lik kırmızı uyarı başlamadan, yavaş oyuncu süre bitmeden bitirir
//   - metin uzadıkça, zorluk arttıkça, cevap uzadıkça süre kısalmaz; azalan sıralama artandan kısa değil
//   - botlar ne anında ne süre dolarken cevaplar; jokerler (ekstra süre, sabotaj) bütçeyle ölçeklenir
//   - ağ: uzak koltuk aynı saati alır
// --all: her tipin bütün sorularını sırayla yazar.
import { BANK } from '../src/data/bank.js';
import { TYPES } from '../src/quiz/types.js';
import { timing, budget, PROFILE, HOT, PLAYERS } from '../src/quiz/timing.js';
import { questionTime, extraFor, cutFor, computeEffect, JOKERS, EXTRA, SABOTAGE } from '../src/game/jokers.js';
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
// önceki sürüm (v0.5, 4'lü sırala/eşleştir): tip başına [en az, ortanca, en çok, ortalama] (sn)
const V05 = {
	choice: [9, 12, 20, 12.7],
	num: [12, 14, 19, 14.5],
	pin: [10, 12, 17, 12.3],
	hang: [15, 19, 25, 19.4],
	tf: [8, 8, 11, 8.4],
	order: [16, 20, 28, 20.2],
	match: [18, 22, 26, 21.6],
	hilo: [8, 10, 13, 10.1],
	odd: [10, 12, 17, 12.3],
	emoji: [11, 13, 17, 13.2],
	riddle: [12, 15, 18, 14.7],
	proverb: [9, 10, 13, 10.3],
	anagram: [12, 20, 27, 19.7],
	cross: [29, 62, 62, 45.5],
	img: [14, 14, 19, 15.7],
	blitz: [10, 18, 18, 14],
};
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

// ---------------------------------------------------------------- 1) bütün banka: biçim, sınır, belirlenim, KIRMIZI kuralı
console.log('1) Banka: biçim, sınırlar, belirlenim, kırmızı uyarı kuralı');
const rows = [];
for (const q of SET) {
	const t = timing(q);
	const P = PROFILE[q.type];
	ok(P, `${q.id}: ${q.type} için süre profili yok`);
	ok(Number.isInteger(t.sec) && Number.isFinite(t.raw), `${q.id}: süre sayı değil (${t.sec}, ${t.raw})`);
	if (P) ok(t.sec >= P.min && t.sec <= P.max, `${q.id}: süre ${t.sec} sınır dışı [${P.min}, ${P.max}]`);
	ok(t.fast > 0 && t.fast < t.sec, `${q.id}: hızlı oyuncu süresi ${t.fast} (bütçe ${t.sec})`);
	ok(t.fast <= t.med && t.med <= t.slow, `${q.id}: oyuncu sırası bozuk (hızlı ${t.fast}, ortanca ${t.med}, yavaş ${t.slow})`);
	ok([t.wait, t.look, t.read, t.think, t.act].every(Number.isFinite), `${q.id}: bileşen NaN`);
	// kırmızı uyarı: ortanca oyuncu son HOT sn başlamadan, yavaş oyuncu süre dolmadan biter (yuvarlama payı 0,5 sn;
	// tipin üst sınırına kırpılan uç sorular ve sabit turlu yıldırım hariç)
	if (P && !P.round && t.sec < P.max) {
		ok(t.med + HOT <= t.sec + 0.5, `${q.id}: ortanca oyuncu (${t.med} sn) kırmızı uyarıya kalıyor (bütçe ${t.sec})`);
		ok(t.slow + 1 <= t.sec + 0.5, `${q.id}: yavaş oyuncu (${t.slow} sn) süreye yetişmiyor (bütçe ${t.sec})`);
	}
	// belirlenim: kopya soru (önbellek yok), prepare ve publicView sonrası aynı süre
	const c = timing(clone(q));
	ok(c.sec === t.sec && c.fast === t.fast && c.slow === t.slow, `${q.id}: kopyada farklı süre`);
	const T = TYPES[q.type];
	const v = T.prepare(q, rng(11));
	ok(v.sec === t.sec && v.fast === t.fast && v.slow === t.slow, `${q.id}: prepare v.sec ${v.sec} ≠ ${t.sec}`);
	const pv = clone(publicView(T, v));
	ok(pv.sec === t.sec && pv.slow === t.slow, `${q.id}: publicView süreyi taşımıyor`);
	rows.push({ q, ...t });
}

// ---------------------------------------------------------------- 2) dağılım: önce → sonra
console.log(`\n2) Tip başına süre (sn): v0.5 → v0.6   (oyuncular: hızlı ${PLAYERS.fast.cps}, ortanca ${PLAYERS.med.cps}, yavaş ${PLAYERS.slow.cps} harf/sn; kırmızı uyarı son ${HOT} sn)`);
console.log('  tip       adet │ v0.5 en az ortanca en çok  ort. │ v0.6 en az  %10 ortanca  %90 en çok  ort. │ ortanca oyuncu  sınırda');
const byType = {};
for (const r of rows) (byType[r.q.type] ||= []).push(r);
for (const [type, list] of Object.entries(byType)) {
	const s = list.map((r) => r.sec).sort((a, b) => a - b);
	const at = (f) => s[Math.min(s.length - 1, Math.floor(s.length * f))];
	const mean = s.reduce((a, b) => a + b, 0) / s.length;
	const meds = list.map((r) => r.med).sort((a, b) => a - b);
	const P = PROFILE[type];
	const lo = list.filter((r) => r.raw < P.min).length;
	const hi = list.filter((r) => r.raw > P.max).length;
	const o = V05[type] || ['?', '?', '?', '?'];
	const pad = (x, n) => String(x).padStart(n);
	console.log(
		`  ${type.padEnd(8)} ${pad(list.length, 5)} │ ${pad(o[0], 10)} ${pad(o[1], 7)} ${pad(o[2], 6)} ${pad(o[3], 5)} │ ${pad(s[0], 10)} ${pad(at(0.1), 4)} ${pad(at(0.5), 7)} ${pad(at(0.9), 4)} ${pad(s[s.length - 1], 6)} ${pad(mean.toFixed(1), 5)} │ ${pad(meds[Math.floor(meds.length / 2)].toFixed(1), 9)} sn   ${lo}/${hi}`,
	);
	// tipin `time` alanı (belge/yedek) bankanın ortancasına yakın olmalı
	if (list.length >= 20) ok(Math.abs(TYPES[type].time - at(0.5)) <= 2, `${type}: T.time ${TYPES[type].time} ortancadan (${at(0.5)}) uzak`);
}

// ---------------------------------------------------------------- 3) uçlar (insan gözüyle)
console.log('\n3) En kısa ve en uzun süreler');
const sorted = rows.filter((r) => !r.q.id.startsWith('y-')).sort((a, b) => a.raw - b.raw || a.q.id.localeCompare(b.q.id));
const line = (r) => `  ${String(r.sec).padStart(2)} sn (v0.5 ort. ${String(V05[r.q.type]?.[1] ?? '?').padStart(2)})  ${r.q.type.padEnd(7)} z${r.q.diff}${r.q.dir === 'desc' ? '↓' : ' '} ${text(r.q)}`;
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

// ---------------------------------------------------------------- 4) tutarlılık: uzayan metin, zorluk, cevap uzunluğu, yön
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
// sırala / eşleştir: öğe metni, öğe sayısı ve yön
{
	const o = first('order');
	const o2 = { ...o, items: o.items.map((x) => ({ ...x, t: x.t + ' (ayrıntılı açıklama)' })) };
	ok(timing(o2).raw > timing(o).raw, 'sırala: uzun öğeler süreyi artırmadı');
	const asc = { ...o, dir: undefined, q: 'Olayları eskiden yeniye sırala.' };
	const desc = { ...o, dir: 'desc', q: 'Olayları yeniden eskiye sırala.' };
	ok(timing(desc).raw > timing(asc).raw && timing(desc).sec >= timing(asc).sec, 'sırala: azalan yön (zihinde ters çevirme) artandan kısa');
	const o4 = { ...asc, items: [...o.items, { t: 'Dördüncü olay', v: 9999 }] };
	ok(timing(o4).sec > timing(asc).sec, 'sırala: 4 öğe 3 öğeden uzun sürmeli');
	const m = first('match');
	const m2 = { ...m, pairs: m.pairs.map(([a, b]) => [a + ' uzun ad', b + ' uzun karşılık']) };
	ok(timing(m2).raw > timing(m).raw, 'eşleştir: uzun çiftler süreyi artırmadı');
	const m4 = { ...m, pairs: [...m.pairs, ['Dördüncü', 'Eşi']] };
	ok(timing(m4).sec > timing(m).sec, 'eşleştir: 4 çift 3 çiftten uzun sürmeli');
	console.log(`  sırala         3 öğe artan → ${timing(asc).sec} sn, azalan → ${timing(desc).sec} sn, 4 öğe → ${timing(o4).sec} sn`);
	console.log(`  eşleştir       3 çift → ${timing(m).sec} sn, 4 çift → ${timing(m4).sec} sn`);
	const n = first('num');
	ok(timing({ ...n, min: 0, max: 100000 }).raw > timing({ ...n, min: 0, max: 50 }).raw, 'tahmin: geniş aralık süreyi artırmadı');
	const c = first('choice');
	ok(timing({ ...c, a: c.a.map((x) => x + ' ve uzun bir açıklama') }).raw > timing(c).raw, 'test: uzun şıklar süreyi artırmadı');
	const p = first('proverb');
	ok(timing({ ...p, text: p.text + ' uzun bir ek' }).raw > timing(p).raw, 'atasözü: uzun atasözü süreyi artırmadı');
	const e = first('emoji');
	ok(timing({ ...e, e: e.e + '🐟🐟' }).raw > timing(e).raw, 'emoji: fazla emoji süreyi artırmadı');
	const b1 = timing(SYN.find((q) => q.id === 'y-bz1'));
	const b2 = timing(SYN.find((q) => q.id === 'y-bz2'));
	ok(b2.sec > b1.sec, `yıldırım: uzun ifadeler (${b2.sec}) kısa ifadelerden (${b1.sec}) uzun sürmeli`);
	console.log(`  yıldırım       kısa ifadeler → ${b1.sec} sn, uzun ifadeler → ${b2.sec} sn`);
}
// tip sırası: tek dokunuşlu tiplerin ortancası çok adımlı tiplerinkinden kısa
{
	const med = (t) => {
		const s = byType[t].map((r) => r.sec).sort((a, b) => a - b);
		return s[Math.floor(s.length / 2)];
	};
	ok(med('tf') < med('choice') && med('hilo') < med('choice'), 'doğru/yanlış ve karşılaştır testten kısa olmalı');
	ok(med('choice') < med('order') && med('choice') < med('match') && med('choice') < med('hang'), 'test, sırala/eşleştir/adam asmacadan kısa olmalı');
	console.log(`  ortancalar     doğru/yanlış ${med('tf')}, karşılaştır ${med('hilo')}, test ${med('choice')}, eşleştir ${med('match')}, adam asmaca ${med('hang')}, sırala ${med('order')}`);
}
// bilinmeyen tip ve bozuk veri patlamaz
ok(Number.isFinite(budget({ type: 'yeni', q: 'Soru?' })), 'bilinmeyen tip');
ok(Number.isFinite(budget({ type: 'choice' })), 'eksik veri');
ok(Number.isFinite(budget(null)), 'boş soru');

// ---------------------------------------------------------------- 5) botlar: hızlı ile yavaş oyuncu arasında
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
			if (q.type !== 'blitz') ok(b.time <= Math.max(v.slow, v.fast) + 1e-9, `${q.id}: bot yavaş oyuncudan da geç (${b.time.toFixed(1)} > ${v.slow})`);
		}
	}
}
for (const [type, s] of Object.entries(botStat)) {
	const mean = s.sum / s.n;
	console.log(`  ${type.padEnd(8)} ort. %${Math.round(mean * 100)}  en az %${Math.round(s.min * 100)} (${s.abs.toFixed(1)} sn)  en çok %${Math.round(s.max * 100)}`);
	if (type !== 'blitz') {
		ok(mean > 0.3 && mean < 0.75, `${type}: bot ortalama süresi bütçenin %${Math.round(mean * 100)}'i`);
		ok(s.max <= 0.85 + 1e-9, `${type}: bot süreyi zorluyor (%${Math.round(s.max * 100)})`);
	}
}

// ---------------------------------------------------------------- 6) saat ve jokerler
console.log('\n6) Saat ve jokerler (bütçeyle ölçeklenir)');
ok(questionTime(12, 8) === 20, 'ekstra süre eklenmeli');
ok(questionTime(12, -5) === 7, 'sabotaj düşmeli');
ok(questionTime(7, -5, 9) === 9, 'sabotaj alt sınırı');
ok(questionTime(4, -5) === 3, 'en az 3 sn');
ok(questionTime(TYPES.tf) === TYPES.tf.time, 'eski çağrı (tip nesnesi)');
for (const sec of [9, 10, 11, 13, 14, 18, 20, 24, 30, 45, 60, 100]) {
	const add = extraFor(sec);
	const cut = cutFor(sec);
	ok(Number.isInteger(add) && add >= EXTRA.min && add <= EXTRA.max, `ekstra süre ${sec} sn → ${add}`);
	ok(Number.isInteger(cut) && cut >= SABOTAGE.min && cut <= SABOTAGE.max, `sabotaj ${sec} sn → ${cut}`);
	ok(extraFor(sec + 1) >= add && cutFor(sec + 1) >= cut, `jokerler ${sec} sn'de azalıyor`);
	ok(sec - cut >= 6, `sabotaj ${sec} sn'lik sorunun çoğunu yiyor (−${cut})`);
}
ok(extraFor(10) === 5 && extraFor(18) === 9 && extraFor(60) === 15, `ekstra süre ölçeği (10→${extraFor(10)}, 18→${extraFor(18)}, 60→${extraFor(60)})`);
ok(cutFor(9) === 3 && cutFor(18) === 6 && cutFor(60) === 10, `sabotaj ölçeği (9→${cutFor(9)}, 18→${cutFor(18)}, 60→${cutFor(60)})`);
for (const type of Object.keys(byType)) {
	const q = first(type);
	const T = TYPES[type];
	const v = T.prepare(q, rng(5));
	const e1 = computeEffect('sure', { T, v, R: rng(1) });
	const e2 = computeEffect('sabotaj', { T, v, R: rng(1) });
	ok(e1.add === extraFor(v.sec) && e2.cut === cutFor(v.sec), `${type}: joker etkisi bütçeden (${v.sec} sn) hesaplanmıyor`);
}
ok(/yarısı/.test(JOKERS.sure.desc) && /üçte biri/.test(JOKERS.sabotaj.desc), 'joker açıklamaları ölçeği söylemiyor');
{
	const show = (t) => {
		const s = byType[t].map((r) => r.sec).sort((a, b) => a - b)[Math.floor(byType[t].length / 2)];
		return `${t} ${s} sn: +${extraFor(s)} / −${cutFor(s)}`;
	};
	console.log('  ' + ['tf', 'choice', 'match', 'order', 'hang', 'cross'].map(show).join(' · '));
	console.log(`  ${JOKERS.sure.name}: ${JOKERS.sure.desc}\n  ${JOKERS.sabotaj.name}: ${JOKERS.sabotaj.desc}`);
}

// ---------------------------------------------------------------- 7) ağ: uzak koltuk aynı saati alır
console.log('\n7) Ağ: uzak koltuk');
{
	// sunucu ucu RemoteController, istemci ucu elle: istekteki süreyi kaydedip görünümden bot cevabı üretir
	const [srv, cli] = LocalTransport.pair({ clone: true });
	const ctl = new RemoteController(srv, { seat: 1 });
	const seen = [];
	cli.onmessage((m) => {
		if (m.t !== 'req' || m.k !== 'answer') return;
		// görünüm ayıklanmıştır (cevap, konum, kelime yok): bot bazı tiplerde cevap üretemez, süre yine sınanır
		const T = TYPES[m.d.v.q.type];
		let b;
		try {
			b = T.bot(m.d.v, 0.6, rng(m.id));
		} catch (e) {
			b = { value: null, time: m.d.v.med ?? m.d.time / 2 };
		}
		seen.push({ time: m.d.time, vsec: m.d.v.sec, bot: b.time });
		cli.send({ v: PROTOCOL, t: 'res', k: 'answer', id: m.id, seat: m.seat, d: { value: b.value, time: b.time } });
	});
	const types = Object.keys(byType);
	for (const type of types) {
		const q = SET.find((x) => x.type === type);
		const T = TYPES[type];
		const v = T.prepare(q, rng(3));
		const pv = publicView(T, v);
		// (görünümde cevap yok: bot doğru cevabı bilemez; burada yalnız süre denetlenir, sızıntı test/net.test.mjs'te)
		await ctl.answer({ i: 1 }, { q: pv.q, v: pv, time: v.sec }, (v.sec + 12) * 1000);
		const s = seen[seen.length - 1];
		ok(s && s.time === budget(q) && s.vsec === budget(q), `${type}: uzak koltuk farklı süre aldı (${s?.time}, ${s?.vsec}, ${budget(q)})`);
		ok(s && s.bot <= s.time, `${type}: uzak bot süre dışında cevapladı`);
	}
	console.log(`  ${seen.length}/${types.length} tip: istek süresi = v.sec = budget(q)`);
}

// ---------------------------------------------------------------- 8) örnekler
console.log('\n8) Örnekler: bileşenler (yavaş-rahat oyuncu) ve üç oyuncunun bitirme süresi');
for (let i = 0; i < sorted.length; i += Math.floor(sorted.length / 9)) {
	const r = sorted[i];
	console.log(line(r) + `\n        [bekleme ${r.wait} + bakış ${r.look} + okuma ${r.read} harf + düşünme ${r.think} + giriş ${r.act}]  hızlı ${r.fast} · ortanca ${r.med} · yavaş ${r.slow} → ${r.raw}`);
}

console.log(`\n${checks} denetim, ${fails} hata`);
process.exit(fails ? 1 : 0);
