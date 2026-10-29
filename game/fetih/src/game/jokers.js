// Jokerler: tanımlar, hak envanteri, soru tipine göre etkiler, bot kullanım planı.
// Bu dosya saf mantıktır (DOM yok, node'da çalışır); etkileri arayüz çizer (src/ui/jokerfx.js).
//
// Altı joker:
//   yari    Yarı Yarıya   iki yanlış şıkkı eler. Şıksız tiplerde karşılığı: tahminde dar aralık,
//                         adam asmacada açık harfler, haritada bölge ipucu.
//   sure    Ekstra Süre   sorunun süresi yarısı kadar uzar (en az 5, en çok 15 sn; extraFor).
//   kalkan  Kalkan        bir kaybedilen savunmayı yok sayar (il ya da kule elde kalır). Savunulan düellonun içinde
//                         kurulamaz (v0.8, match.js SHIELD_IN_DEFENSE): bot da insan da soruyu görmeden karar verir.
//   ikinci  İkinci Şans   yanlış bilirsen aynı kategoriden yeni bir soru daha (yalnız bildi/bilemedi tipleri).
//   sabotaj Sabotaj       rakibin süresinin üçte biri gider (en az 3, en çok 10 sn; cutFor), ekranı 2 sn kararır.
//                         Sabotaj anından sonra en az 3 sn kalır (arayüzün alt sınırı).
//   Süre jokerleri sorunun kendi süresiyle ölçeklenir (v0.6): sabit +8/−5 sn, 9 sn'lik doğru/yanlışta süreyi ikiye
//   katlıyor ya da yarıya indiriyor, 60 sn'lik çengelde fark edilmiyordu. Oran her tipte aynı etkiyi verir; saf ve
//   belirlenimci (sunucu aynı bütçeden aynı saniyeyi bulur).
//   kahin   Seyirci       seyircinin oy dağılımı (bot yeteneğinden benzetilir); tahminde kalabalık
//                         değeri, haritada olası bölge, adam asmacada önerilen harf.
//
// Hangi tipte hangi joker (support):
//   şıklı (test, farklı olan, emoji, atasözü, bilmece)  hepsi
//   doğru/yanlış, karşılaştır (iki şık)                 yarı yarıya YOK; seyirci var
//   tahmin (num)                                         yarı yarıya = dar aralık; seyirci = kalabalık değeri
//   harita (pin)                                         yarı yarıya = bölge; seyirci = olası il
//   adam asmaca                                          yarı yarıya = açık harfler; seyirci = önerilen harf
//   sırala, eşleştir, çengel, anagram, yıldırım, resimli süre + sabotaj + kalkan (+ ikinci şans bildi/bilemedi tiplerinde)
// Uygulanamayan joker `na: true` ile işaretlenir; arayüz o düğmeyi hiç göstermez.
//
// Etki verisi (effect) soru tipinden bağımsız küçük nesnelerdir; arayüz bunları kendi çizer:
//   { id, kind:'hide',   hide:[i, j] }                  şık indeksleri sönsün
//   { id, kind:'range',  min, max }                      tahmin kaydırıcısı daralsın
//   { id, kind:'letters',letters:['E','R'], hint? }      adam asmaca: bu harfler açılsın (hint: yalnız öner)
//   { id, kind:'zone',   provinces:[il indeksleri] }     haritada parlat
//   { id, kind:'poll',   pct:[%, %, …] }                 şık başına seyirci yüzdesi
//   { id, kind:'crowd',  value, spread, unit }           tahmin: kalabalık değeri
//   { id, kind:'time',   add }                           süre uzadı (ctx.clock.extra zaten arttı)
//   { id, kind:'sabotage', victims:[oyuncu], cut, blurMs }
//   { id, kind:'shield' } { id, kind:'second' }          silahlandı (durum işareti)
//   { id, kind:'custom', data }                          tipin kendi etkisi (T.joker)
//
// Yeni soru tipi desteği (quiz ajanı): `T.jokers = ['yari','kahin']` ve
// `T.joker(id, v, R, env) → effect | null` tanımlarsa o tip için etki üretilir; kartın kontrolü
// `ctl.joker?.(effect)` ile uygular. Tanımlamazsa yukarıdaki tablo geçerlidir.

import { secOf } from '../quiz/timing.js';

const pCorrect = (skill, diff) => Math.min(0.95, Math.max(0.08, skill + 0.25 - 0.15 * diff));
const gauss = (R) => Math.sqrt(-2 * Math.log(Math.max(1e-6, R()))) * Math.cos(2 * Math.PI * R());

export const PER_QUESTION = 2; // bir soruda en çok iki joker
/** Ekstra süre: sorunun süresinin yarısı (share), [min, max] sn arası. */
export const EXTRA = { share: 1 / 2, min: 5, max: 15 };
/** Sabotaj: rakibin süresinin üçte biri gider; bot kurbanın yeteneği düşer ve kesintinin yarısı kadar geç cevaplar. */
export const SABOTAGE = { share: 1 / 3, min: 3, max: 10, blurMs: 2000, botSkill: -0.1, botDelay: 1 / 2 };
const clampS = (x, a, b) => Math.max(a, Math.min(b, x));
/** Ekstra süre jokerinin eklediği saniye (sec: sorunun süre bütçesi, v.sec). */
export const extraFor = (sec) => clampS(Math.round((Number(sec) || 0) * EXTRA.share), EXTRA.min, EXTRA.max);
/** Sabotajın kestiği saniye (sec: sorunun süre bütçesi, v.sec). */
export const cutFor = (sec) => clampS(Math.round((Number(sec) || 0) * SABOTAGE.share), SABOTAGE.min, SABOTAGE.max);
export const BOT_BOOST = { yari: 0.2, kahin: 0.12 }; // bot yetenek artışı (soru başına)

export const JOKERS = {
	yari: {
		id: 'yari',
		name: 'Yarı Yarıya',
		short: '50/50',
		desc: 'İki yanlış şık elenir. Şıksız sorularda bir ipucu verir.',
		color: '#2f9bd8',
		icon: 'half',
		free: 1, // her maça bedava verilen
		max: 2, // maç başına en çok
		scope: 'question',
	},
	sure: {
		id: 'sure',
		name: 'Ekstra Süre',
		short: 'Süre',
		desc: `Bu sorunun süresi yarısı kadar uzar (+${EXTRA.min}–${EXTRA.max} sn).`,
		color: '#33b86b',
		icon: 'clock',
		free: 1,
		max: 2,
		scope: 'question',
	},
	kalkan: {
		id: 'kalkan',
		name: 'Kalkan',
		short: 'Kalkan',
		desc: 'Bir kaybedilen savunmayı yok sayar. Saldırıdan önce kurulur, ilk saldırıda devreye girer.',
		color: '#f2a51a',
		icon: 'shield',
		free: 1,
		max: 1,
		scope: 'match',
	},
	ikinci: {
		id: 'ikinci',
		name: 'İkinci Şans',
		short: 'Şans',
		desc: 'Yanlış bilirsen aynı kategoriden yeni bir soru gelir.',
		color: '#a55bd6',
		icon: 'heart',
		free: 0,
		max: 1,
		scope: 'question',
	},
	sabotaj: {
		id: 'sabotaj',
		name: 'Sabotaj',
		short: 'Sabotaj',
		desc: `Rakibin süresinin üçte biri gider (−${SABOTAGE.min}–${SABOTAGE.max} sn), ekranı ${SABOTAGE.blurMs / 1000} sn kararır.`,
		color: '#e0583a',
		icon: 'bolt',
		free: 0,
		max: 1,
		scope: 'question',
	},
	kahin: {
		id: 'kahin',
		name: 'Seyirci',
		short: 'Seyirci',
		desc: 'Seyircinin oylarını gösterir. Sürpriz: bazen yanılırlar.',
		color: '#ec4f93',
		icon: 'eye',
		free: 0,
		max: 1,
		scope: 'question',
	},
};
export const JOKER_ORDER = ['yari', 'kahin', 'sure', 'ikinci', 'sabotaj', 'kalkan'];

// ------------------------------------------------------------------------ envanter

/**
 * Maç envanteri: { id: { left, free } }.
 * stock: kalıcı envanter (progress.jokers). Bedava hak + stoktan; maç sınırını aşmaz.
 * bonus: kampanya ya da seviye ödülü { id: n }.
 */
export function makeLoadout(stock = {}, bonus = {}) {
	const out = {};
	for (const id of JOKER_ORDER) {
		const d = JOKERS[id];
		const free = d.free + (bonus[id] || 0);
		const have = free + (stock[id] || 0);
		const left = Math.min(d.max + (bonus[id] || 0), have);
		out[id] = { left, free: Math.min(free, left) };
	}
	return out;
}

/** Botlar için: yeteneğe göre 2–4 joker; patron ek bir tane daha alır. */
export function botLoadout(skill, R, boss = false, extra = 0) {
	const pool = ['yari', 'kahin', 'kalkan', 'ikinci', 'sabotaj'];
	const out = {};
	for (const id of JOKER_ORDER) out[id] = { left: 0, free: 0 };
	let n = Math.round(1 + skill * 3) + (boss ? 1 : 0) + extra;
	while (n-- > 0 && pool.length) {
		const k = Math.floor(R() * pool.length);
		const id = pool[k];
		out[id].left++;
		out[id].free++;
		if (out[id].left >= JOKERS[id].max) pool.splice(k, 1);
	}
	return out;
}

// ------------------------------------------------------------------------ destek ve etki

export const isChoice = (v) => !!v && Array.isArray(v.opts) && typeof v.right === 'number' && v.opts.length >= 2;

/** Sorunun joker açısından biçimi: choice | two | num | pin | word | other. */
export function shape(v) {
	const t = v?.q?.type;
	if (isChoice(v)) return 'choice';
	if ((t === 'tf' || t === 'hilo') && typeof v.right === 'number') return 'two';
	if (t === 'num') return 'num';
	if (t === 'pin' && v.target) return 'pin';
	if (t === 'hang' && v.word && new Set([...v.word].filter((c) => c !== ' ')).size >= 3) return 'word';
	return 'other';
}

/** Bu joker bu soru tipinde kullanılabilir mi? { ok, why, na } — na: tipe hiç uymaz (düğme gizlenir). */
export function support(id, T, v) {
	const no = (why, na = true) => ({ ok: false, why, na });
	const ok = { ok: true, why: '', na: false };
	if (!T) return no('Soru yok', false);
	if (id === 'sure' || id === 'sabotaj' || id === 'kalkan') return ok;
	if (id === 'ikinci') return T.kind === 'exact' ? ok : no('Tahmin sorusunda işe yaramaz');
	if (T.jokers) return T.jokers.includes(id) ? ok : no('Bu soru tipinde yok');
	const k = shape(v);
	if (k === 'choice') return id === 'yari' && v.opts.length < 3 ? no('Zaten iki şık var') : ok;
	if (k === 'two') return id === 'kahin' ? ok : no('Zaten iki şık var');
	if (k === 'num' || k === 'pin' || k === 'word') return ok;
	return no('Bu soru tipinde yok');
}

/** Bütün jokerler için { ok, why, na } (arayüz düğmelerini kapatmak ya da gizlemek için). */
export function supportAll(T, v) {
	const o = {};
	for (const id of JOKER_ORDER) o[id] = support(id, T, v);
	return o;
}

function split(n, right, pRight, R) {
	// kalan payı yanlışlara rastgele böl; toplam 100
	const w = Array.from({ length: n }, (_, i) => (i === right ? 0 : 0.35 + R()));
	const sum = w.reduce((a, b) => a + b, 0) || 1;
	const pct = w.map((x) => Math.round((x / sum) * (100 - Math.round(pRight * 100))));
	pct[right] = Math.round(pRight * 100);
	const diff = 100 - pct.reduce((a, b) => a + b, 0);
	pct[right] += diff;
	return pct;
}

/**
 * Bir jokerin soru etkisini hesapla (saf: durum değiştirmez). null: bu soruda etki üretilemedi.
 * env: { T, v, R, board? }  — board yalnızca harita ipuçları için (pick/region/provinces).
 */
export function computeEffect(id, env) {
	const { T, v, R, board } = env;
	const q = v.q || {};
	const diff = q.diff || 2;
	if (id === 'sure') return { id, kind: 'time', add: extraFor(secOf(v)) };
	if (id === 'kalkan') return { id, kind: 'shield' };
	if (id === 'ikinci') return { id, kind: 'second' };
	if (id === 'sabotaj') return { id, kind: 'sabotage', victims: [], cut: cutFor(secOf(v)), blurMs: SABOTAGE.blurMs };
	if (T?.joker && T.jokers?.includes(id)) {
		const e = T.joker(id, v, R, env);
		return e ? { id, kind: 'custom', data: e } : null;
	}
	const k = shape(v);
	if (id === 'yari') {
		if (k === 'choice') {
			const wrong = v.opts.map((_, i) => i).filter((i) => i !== v.right);
			for (let i = wrong.length - 1; i > 0; i--) {
				const j = Math.floor(R() * (i + 1));
				[wrong[i], wrong[j]] = [wrong[j], wrong[i]];
			}
			return { id, kind: 'hide', hide: wrong.slice(0, v.opts.length >= 4 ? 2 : 1).sort((a, b) => a - b) };
		}
		if (k === 'num') {
			// cevabı içeren, ama ortalanmamış dar aralık (toplam aralığın %28'i)
			const span = q.max - q.min;
			const w = Math.max(6, Math.round(span * 0.28));
			let lo = Math.round(q.ans - w * (0.15 + R() * 0.7));
			lo = Math.max(q.min, Math.min(q.max - w, lo));
			return { id, kind: 'range', min: lo, max: Math.min(q.max, lo + w) };
		}
		if (k === 'word') {
			// harfler açılır ama sözcük tamamlanmaz: en az iki harf kapalı kalır
			const letters = [...new Set([...v.word].filter((c) => c !== ' '))];
			const n = Math.min(letters.length >= 6 ? 2 : 1, letters.length - 2);
			const pick = [];
			while (pick.length < n) pick.push(letters.splice(Math.floor(R() * letters.length), 1)[0]);
			return { id, kind: 'letters', letters: pick };
		}
		if (k === 'pin' && board) {
			const idx = board.pick(v.target.x, v.target.z);
			if (idx >= 0) return { id, kind: 'zone', provinces: board.region(board.provinces[idx].region) };
		}
		return null;
	}
	if (id === 'kahin') {
		const bad = R() < (diff >= 3 ? 0.14 : diff === 2 ? 0.07 : 0.03); // seyirci bazen yanılır
		if (k === 'choice' || k === 'two') {
			const n = k === 'choice' ? v.opts.length : 2;
			const base = pCorrect(0.6, diff) + (R() - 0.5) * 0.18;
			const p = bad ? 0.18 + R() * 0.12 : Math.min(0.92, Math.max(0.3, base));
			return { id, kind: 'poll', pct: split(n, v.right, p, R) };
		}
		if (k === 'num') {
			const span = q.max - q.min;
			const spread = Math.round(span * (0.03 + 0.035 * diff));
			const value = Math.round(Math.max(q.min, Math.min(q.max, q.ans + gauss(R) * spread * (bad ? 3 : 1))));
			return { id, kind: 'crowd', value, spread, unit: q.unit || '' };
		}
		if (k === 'word') {
			const letters = [...new Set([...v.word].filter((c) => c !== ' '))];
			return { id, kind: 'letters', letters: [letters[Math.floor(R() * letters.length)]], hint: true };
		}
		if (k === 'pin' && board) {
			const km = 110 * (bad ? 2.5 : 1);
			const a = R() * Math.PI * 2;
			const d = (Math.abs(gauss(R)) * km) / (111.2 / 6);
			let idx = board.pick(v.target.x + Math.cos(a) * d, v.target.z + Math.sin(a) * d);
			if (idx < 0) idx = board.pick(v.target.x, v.target.z);
			if (idx >= 0) return { id, kind: 'zone', provinces: [idx], crowd: true };
		}
		return null;
	}
	return null;
}

// ------------------------------------------------------------------------ bot planı

/**
 * Bir bot bu soruda hangi jokerleri kullansın? slots: botun { id: {left} } envanteri.
 * Mantık: zor ve yüksek riskli sorularda yarı yarıya/seyirci; düelloda sabotaj ve ikinci şans;
 * süre jokerini hiç kullanmaz (bot zaman aşımına uğramaz).
 */
export function botPlan(slots, { T, v, R, duel, capital, rivalHuman }) {
	const out = [];
	const diff = v.q?.diff || 2;
	const hard = diff >= 3 ? 1 : diff === 2 ? 0.7 : 0.25;
	const stake = capital ? 1.6 : duel ? 1 : 0.55;
	const tryUse = (id, p) => {
		if (out.length >= PER_QUESTION || !(slots[id]?.left > 0)) return;
		if (!support(id, T, v).ok) return;
		if (R() < p) out.push(id);
	};
	tryUse('sabotaj', duel ? (rivalHuman ? 0.5 : 0.32) * stake : 0.1);
	tryUse('yari', 0.5 * hard * stake);
	tryUse('kahin', 0.32 * hard * stake);
	tryUse('ikinci', duel ? 0.22 * stake : 0);
	return out;
}

/**
 * Sorunun toplam süresi. base: sorunun süre bütçesi (sn; timing.js, görünümde v.sec). Eski çağrılar için tip
 * nesnesi de olur (T.time). extra: ekstra süre (+) ve sabotaj (−) toplamı; floor: sabotaj anından itibaren
 * en az 3 sn kalması için arayüzün tuttuğu alt sınır (sabotaj anı + 3). Süre hiçbir zaman 3 sn'nin altına inmez.
 */
export function questionTime(base, extra = 0, floor = 0) {
	const sec = typeof base === 'number' ? base : base?.time || 0;
	return Math.max(sec + extra, floor, 3);
}
