// MAÇ SORU DÜZENİ (v1.2): kullanıcının onayladığı 14 yeni soru tipi maçta. Hangi an (yayılma, düello, kale kuşatması,
// eşitlik bozma, altın soru, ikinci şans), hangi mod (1'e 1, 3 kişi, 4 kişi, eşli), hangi uzunluk (hızlı, uzun) ve hangi
// kategori (çark dilimi) için hangi tipin ne sıklıkla geleceği burada. Tablolar ve gerekçeler: DESIGN.md "v1.2 maç soru
// düzeni"; sayısal doğrulama: node test/sim.mjs (binlerce maç), rapor: ref/mac-entegrasyon-v12/rapor.md.
//
//   YENİ TİPLER   kusbakisi ilavi kimim sive halat mancinik yanlis ikidogru harfal azbilinen tufan kayip fitil golge
//                 (golge kullanıcı onayı bekliyor: maçta KAPALI, BAYRAK.golge ya da cfg.yeni = { golge: true } açar)
//                 Elenenler (kosu, baglanti) maça hiç girmez. Eski 16 tip olduğu gibi kalır.
//   KÖPRÜ         yeni tiplerin soruları galeri örneklerinden (DENEME_SAMPLES) okunur: yeniBank(). Örnek dizilerine
//                 eklenen her soru maça kendiliğinden girer (bu dosya yalnız okur).
//   SEÇİM         tipSec(): an × mod × kategori ağırlıkları, yeni tip payı (eski/yeni dengesi, maç içinde dengelenir),
//                 maç başına üst sınır, art arda gelme yasakları, izlenen bot düellosunda harita ve uzun film çekincesi.
//   FİLM          filmMs(): cevap ekranının (sinematik sonun) süresi: insanın ya da uzak oyuncunun içinde olduğu anda tam
//                 film, bot düellosunda ve çok oyunculu yayılmada kısa sürüm. Çevrimiçinde 'reveal' olayıyla gider,
//                 sunucu bu süreyi tur zamanlamasına katar (herkes aynı anda ilerler).
//   ÇEVRİMİÇİ     publicView sertleştirme: Kuşbakışı ve Gölge'de yapı adı yerine maça tuzlu anlamsız kimlik (sid),
//                 İl Avı silueti ve Kayıp İl boşluğu sadeleştirilmiş, tamsayıya yuvarlanmış çokgen. Sunucu adımları:
//                 src/game/sunucu.js.

import { TYPES, TYPE_WEIGHTS } from './types.js';
import { DENEME_TYPES, DENEME_SAMPLES } from './deneme.js';
import { BANK } from '../data/bank.js';
import { CATS } from './categories.js';
import DATA from '../data/turkiye.json';

/** Maça giren yeni tipler (kullanıcının onayladığı 13 + onay bekleyen Gölge). */
export const YENI = ['kusbakisi', 'ilavi', 'kimim', 'sive', 'halat', 'mancinik', 'yanlis', 'ikidogru', 'harfal', 'azbilinen', 'tufan', 'kayip', 'fitil', 'golge'];
const YENI_SET = new Set(YENI);
export const isYeni = (t) => YENI_SET.has(t);

/** Açma bayrakları: false olan tip maçta hiç seçilmez (galeride oynanır). cfg.yeni = { golge: true } maç başına açar. */
export const BAYRAK = { golge: false };

/** İki oyunculu canlı tur (aynı tur, iki taraf aynı anda): yalnız düelloda (saldırı ve kuşatma). */
export const CANLI = new Set(['halat', 'fitil']);
/** "Erken bilen kazanır" tipleri: düelloda ikisi de bilirse eşitlik sorusu yerine hızlı olan (Kimim'de erken ipucu) kazanır. */
export const HIZLI = new Set(['kusbakisi', 'kayip', 'kimim', 'golge']);
/** Okuma ağır tipler: yayılmada yalnız kısa sürümleri (bütçesi ≤ OKUMA_SN), her yerde kısa olanlar öne. */
export const OKUMA = new Set(['ikidogru', 'yanlis', 'azbilinen']);
export const OKUMA_SN = 30;
/** Haritalı tipler (eski 'pin' dahil): kamera bütün haritaya ya da bir yapıya gider. */
export const HARITA = new Set(['pin', ...YENI.filter((t) => DENEME_TYPES[t]?.needsMap)]);

// ---------------------------------------------------------------- tip kaydı

/** Tip nesneleri TYPES'a eklenir (maç, ağ ve arayüz aynı kayıttan okur); çevrimiçi görünüm sertleştirilir. */
for (const t of YENI) {
	const T = DENEME_TYPES[t];
	if (!T) continue;
	TYPES[t] = { ...T, publicView: hardened(t, T.publicView), ...(CANLI.has(t) ? { duo: true } : {}) };
}

// ---------------------------------------------------------------- köprü: yeni tiplerin soruları

let BANKY = null;
/**
 * Yeni tiplerin maç bankası: galeri örnekleri (DENEME_SAMPLES; içerik ajanı oraya ekler). Kimliği bankayla çakışan,
 * kategorisi çarkta olmayan ya da tipi uymayan soru alınmaz. İlk çağrıda bir kez kurulur.
 */
export function yeniBank() {
	if (BANKY) return BANKY;
	const seen = new Set(BANK.map((q) => q.id));
	const out = [];
	for (const t of YENI)
		for (const q of DENEME_SAMPLES[t] || []) {
			if (!q || q.type !== t || !CATS[q.cat] || seen.has(q.id)) continue;
			seen.add(q.id);
			out.push(q);
		}
	return (BANKY = out);
}

// ---------------------------------------------------------------- an × mod ağırlıkları

/**
 * Anlar: expand (yayılma: herkes aynı soruyu çözer, sıralama il hakkı verir), attack (saldırı düellosu, 2 kişi),
 * siege (kale kuşatması: başkente düello), tie (düelloda eşitlik bozma), golden (maç sonu altın soru).
 * Değerler yeni tiplerin kendi aralarındaki göreli ağırlığı; eski/yeni payı PAY tablosundan gelir.
 */
export const YENI_W = {
	// sıralama üreten tipler önde (en yakın, ipucu sırası, deneme sayısı); canlı tur yok
	expand: { mancinik: 2.2, azbilinen: 2.5, ilavi: 2.5, sive: 2.5, kimim: 2.5, harfal: 2, yanlis: 1.5, kusbakisi: 1.8, kayip: 1.5, tufan: 1.5, ikidogru: 1, golge: 1 },
	// yüz yüze: canlı tur, erken bilen, sinematik
	attack: { halat: 2.5, fitil: 2.5, kusbakisi: 2.5, kayip: 2, tufan: 2.5, kimim: 2, ikidogru: 2, yanlis: 1.5, harfal: 1.5, mancinik: 1.5, ilavi: 1.2, sive: 1.2, azbilinen: 1, golge: 2 },
	// kale: maçın en büyük anı, yıldız tipler
	siege: { halat: 3, fitil: 3, tufan: 2.5, kusbakisi: 2, kayip: 2, mancinik: 1.5, kimim: 1.5, ikidogru: 1, yanlis: 1, harfal: 1, ilavi: 1, sive: 1, azbilinen: 0.5, golge: 2 },
	// eşitlik bozma ve altın soru: en yakın kazanır (tahmin ya da Mancınık)
	tie: { mancinik: 1 },
	golden: { mancinik: 1 },
};

/** Yeni tiplerin payı (an × mod): 0,5 = soruların yarısı yeni tip. Kalanı eski tiplerin kategori ağırlıkları. */
export const PAY = {
	expand: { '1v1': 0.45, ffa3: 0.5, ffa4: 0.5, team: 0.5 },
	attack: { '1v1': 0.55, ffa3: 0.5, ffa4: 0.45, team: 0.45 },
	siege: { '1v1': 0.65, ffa3: 0.65, ffa4: 0.65, team: 0.65 },
	tie: { '1v1': 0.3, ffa3: 0.3, ffa4: 0.3, team: 0.3 },
	golden: { '1v1': 0.5, ffa3: 0.5, ffa4: 0.5, team: 0.5 },
};

/**
 * Mod çarpanları (tip sınıfına göre). 3–4 kişilik yayılmada derece ayrımı gerekir: en yakın tipler öne, okuma ağır tipler
 * geri (herkes en yavaşı bekler). 4 kişide ve eşlide düelloların çoğu iki botun arasında: harita tipleri biraz geri.
 */
const SINIF = (t) => (CANLI.has(t) ? 'canli' : HARITA.has(t) ? 'harita' : OKUMA.has(t) ? 'okuma' : 'diger');
const closest = (t) => TYPES[t]?.kind === 'closest';
export function modK(mode, moment, t) {
	let k = 1;
	const many = mode !== '1v1';
	if (moment === 'expand' && many) {
		k *= closest(t) ? 1.25 : 0.8;
		if (OKUMA.has(t)) k *= 0.7;
	}
	if ((moment === 'attack' || moment === 'siege') && mode === '1v1' && CANLI.has(t)) k *= 1.2;
	if (moment === 'attack' && (mode === 'ffa4' || mode === 'team') && SINIF(t) === 'harita') k *= 0.85;
	return k;
}

/**
 * Kategori uyumu: yeni tipin sorusu o kategoride varsa seçilebilir (haveTypes); bu çarpan çarkın dilimine en çok
 * yakışan tipleri öne alır (coğrafyada harita tipleri, Genel Kültürde Şive).
 */
export const KAT = {
	kusbakisi: { cografya: 1.3, tarih: 1.2 },
	ilavi: { cografya: 1.3 },
	kimim: { cografya: 1.3 },
	kayip: { cografya: 1.3 },
	tufan: { cografya: 1.2 },
	sive: { eglence: 1.4, sanat: 1.2 },
	azbilinen: { cografya: 1.1, eglence: 1.1 },
	ikidogru: { bilim: 1.2, eglence: 1.2 },
	yanlis: { tarih: 1.1, bilim: 1.1 },
};
const katK = (t, cat) => KAT[t]?.[cat] ?? 1;

/** Eski tiplerde ana çarpan: 4 şıklı klasik düelloda baskın kalsın (Trivia Crack ve Bil ve Fethet'in omurgası). */
export const KLASIK = { attack: { choice: 1.6 }, siege: { choice: 1.6 } };

/**
 * İzlenen bot düellosu (yerel insan yalnız seyrediyor): harita tipleri kamerayı savaştan koparır, Tufan'ın filmi uzun.
 * Bu düellolarda ağırlıkları azalır (kamera savaşın başında kalsın).
 */
const IZLE = { harita: 0.4, tufan: 0.3 };

/** Maç başına üst sınır: [hızlı, uzun]. Eski tiplerde sınır yok (bankası büyük). */
export const SINIR = {
	kusbakisi: [2, 4],
	ilavi: [1, 2],
	kimim: [2, 3],
	sive: [2, 3],
	halat: [2, 3],
	mancinik: [2, 3],
	yanlis: [1, 2],
	ikidogru: [1, 2],
	harfal: [2, 3],
	azbilinen: [1, 2],
	tufan: [1, 2],
	kayip: [2, 3],
	fitil: [2, 3],
	golge: [1, 2],
};
export const sinir = (t, length) => (SINIR[t] ? SINIR[t][length === 'long' ? 1 : 0] : Infinity);

/**
 * Tip seç. o = { moment, mode, length, cat, have (Set: o kategoride taze sorusu olan tipler), recent ([son tipler],
 * en yeni sonda), counts ({tip: maçtaki sayısı}), mix ({ n, yeni, hedef }: maçtaki eski/yeni dengesi), watch (izlenen bot
 * düellosu), on (tip → açık mı), R }. Dönüş: { type, w } (w: seçilen tiplerin son ağırlıkları, rapor için).
 */
export function tipSec(o) {
	let w = agirliklar(o);
	let list = Object.entries(w).filter(([, x]) => x > 0);
	if (!list.length) {
		// art arda yasakları her şeyi elediyse (ör. eşitlik bozmanın hemen ardından altın soru): yasaklar gevşer, yalnız
		// bir önceki tip yine gelmez; o da tek seçenekse öntanımlı tip
		const last = o.recent?.[o.recent.length - 1];
		w = agirliklar({ ...o, recent: [] });
		list = Object.entries(w).filter(([t, x]) => x > 0 && t !== last);
		if (!list.length) {
			const def = o.moment === 'expand' || o.moment === 'tie' || o.moment === 'golden' ? ['num', 'mancinik', 'order'] : ['choice', 'tf', 'odd'];
			const free = (t) => t !== last && TYPES[t] && (o.on ? o.on(t) : true) && (o.counts?.[t] || 0) < sinir(t, o.length);
			return { type: def.find(free) || def[0], w };
		}
	}
	let r = o.R() * list.reduce((s, [, x]) => s + x, 0);
	for (const [t, x] of list) if ((r -= x) <= 0) return { type: t, w };
	return { type: list[list.length - 1][0], w };
}

/** Bu an için hedef yeni tip payı (mod tablosu). */
export const payOf = (moment, mode) => PAY[moment]?.[mode] ?? PAY[moment]?.ffa3 ?? 0;

/**
 * Kategori kapsamı: yeni tipin sorusu olan çark kategorilerinin payı (0..1). Haritalı tiplerin soruları yalnız
 * Coğrafya'da, Halat her kategoride: kapsam bölünerek kullanılınca her tipin maçtaki sıklığı YENI_W ile orantılı olur
 * (dar kapsamlı tip kendi kategorisinde daha sık gelir, o kategorinin yeni tip payı da o oranda büyür).
 */
export function kapsam(pool, cats) {
	const by = new Map();
	for (const q of pool) {
		if (!isYeni(q.type)) continue;
		if (!by.has(q.type)) by.set(q.type, new Set());
		by.get(q.type).add(q.cat);
	}
	const out = {};
	for (const [t, set] of by) out[t] = Math.max(1, cats.filter((c) => set.has(c)).length) / cats.length;
	return out;
}

/** Kategori payının üst sınırı: Coğrafya bile tamamen yeni tip olmasın (klasik harita sorusu, tahmin kalsın). */
export const PAY_UST = 0.85;

export function agirliklar({ moment, mode, length = 'quick', cat, have, recent = [], counts = {}, mix = null, watch = false, on = () => true, cov = null }) {
	const elig = (t) => TYPES[t] && on(t) && (counts[t] || 0) < sinir(t, length);
	const ok = (t) => elig(t) && (!have || have.has(t));
	const old = {};
	if (moment === 'tie' || moment === 'golden') {
		if (ok('num') || !have) old.num = 1;
	} else {
		const tw = (TYPE_WEIGHTS[cat] || TYPE_WEIGHTS.default)[moment === 'expand' ? 'expand' : 'attack'] || {};
		for (const [t, x] of Object.entries(tw)) if (x > 0 && ok(t) && !isYeni(t)) old[t] = x * (KLASIK[moment]?.[t] ?? 1);
	}
	// yeni tiplerin genel ağırlığı (kategoriden bağımsız, W) ve bu kategorideki ağırlığı (kapsama bölünmüş)
	let W = 0;
	const nw = {};
	for (const [t, x] of Object.entries(YENI_W[moment] || {})) {
		if (!elig(t)) continue;
		if (CANLI.has(t) && moment !== 'attack' && moment !== 'siege') continue;
		let g = x * modK(mode, moment, t);
		if (watch) g *= t === 'tufan' ? IZLE.tufan : HARITA.has(t) ? IZLE.harita : 1;
		W += g;
		if (have && !have.has(t)) continue;
		nw[t] = (g * katK(t, cat)) / (cov && have ? cov[t] || 1 : 1);
	}
	const Sc = Object.values(nw).reduce((a, b) => a + b, 0);
	// art arda gelme: aynı tip hiç; yeni tip son 3 soruda varsa geri; iki canlı tur ve iki harita sorusu art arda olmaz
	const last = recent[recent.length - 1];
	const gate = (t) => {
		if (t === last) return 0;
		if (isYeni(t) && recent.slice(-3).includes(t)) return 0.15;
		if (CANLI.has(t) && recent.slice(-2).some((x) => CANLI.has(x))) return 0;
		if (HARITA.has(t) && HARITA.has(last)) return 0.3;
		return 1;
	};
	for (const t of Object.keys(old)) old[t] *= gate(t);
	for (const t of Object.keys(nw)) nw[t] *= gate(t);
	const So = Object.values(old).reduce((a, b) => a + b, 0);
	const Sn = Object.values(nw).reduce((a, b) => a + b, 0);
	let share = payOf(moment, mode);
	// kategori payı: kapsam kullanılınca bu kategorinin yeni tip zenginliğiyle orantılı (ortalamada hedef paya oturur)
	if (cov && have && W > 0) share = Math.min(PAY_UST, (share * Sc) / W);
	// maç içi denge: şimdiye dek hedeften az yeni tip geldiyse pay biraz artar, çok geldiyse azalır
	if (mix && mix.n >= 3) share = Math.min(PAY_UST, Math.max(0.05, share * Math.min(1.5, Math.max(0.6, 1 + 1.4 * ((mix.hedef - mix.yeni) / mix.n)))));
	if (!Sn) share = 0;
	else if (!So) share = 1;
	const out = {};
	for (const [t, x] of Object.entries(old)) out[t] = (x / So) * (1 - share);
	for (const [t, x] of Object.entries(nw)) out[t] = (x / Sn) * share;
	return out;
}

/**
 * Yayılma turunun kategorisi (çark yok, maç seçer): harita boşken ve herkes il kaparken haritalı tipler en anlamlı
 * anında; Coğrafya'nın ağırlığı 2,5, diğerleri 1 (bir maçtaki 4–7 yayılma turunun ~üçte biri Coğrafya).
 */
export const YAYILMA_KAT = { tarih: 1, cografya: 2.5, spor: 1, bilim: 1, sanat: 1, eglence: 1 };
export function yayilmaKat(R) {
	const list = Object.entries(YAYILMA_KAT);
	let r = R() * list.reduce((s, [, x]) => s + x, 0);
	for (const [c, x] of list) if ((r -= x) <= 0) return c;
	return list[list.length - 1][0];
}

// ---------------------------------------------------------------- zorluk eğrisi

/**
 * Maç ilerledikçe sorular zorlaşır: başta −0,3, sonda +0,3 (yayılma ilk turlar kolay, son fetih turları zor), kuşatma
 * +0,2, altın soru +0,3. Yeni bir tipin maçtaki ilk sorusu −0,5 (oyuncu kuralı tanırken soru kolay olsun).
 */
export const EGRI = { bas: -0.3, son: 0.3, siege: 0.2, golden: 0.3, ilk: -0.5 };
export function egri(progress, moment, first) {
	let d = EGRI.bas + (EGRI.son - EGRI.bas) * Math.max(0, Math.min(1, progress));
	if (moment === 'siege') d += EGRI.siege;
	if (moment === 'golden') d += EGRI.golden;
	if (first) d += EGRI.ilk;
	return d;
}

/**
 * Okuma ağır tiplerde kısa soru öne: bütçesi 24 sn olan 1, 36 sn olan ~0,2 ağırlık; yayılmada OKUMA_SN üstü hiç
 * seçilmez (herkes en yavaş okuyanı bekler). Döner: ağırlık çarpanı.
 */
export function okumaK(t, sec, moment) {
	if (!OKUMA.has(t) || !Number.isFinite(sec)) return 1;
	if (moment === 'expand' && sec > OKUMA_SN) return 0;
	return Math.exp(-Math.max(0, sec - 24) / 8);
}

// ---------------------------------------------------------------- uzun filmler

/**
 * Cevap ekranının süresi (ms): [tam film, kısa sürüm]. Eski tipler arayüzün kendi süresini kullanır (bildi/bilemedi 1,9 sn,
 * en yakın 3 sn). Tufan'ın filmi 10,9 sn (d_tufan revealMs); kısa sürüm ilk batışı ve su seviyesini gösterir. İl Avı,
 * Kimim ve Kayıp İl'in sinematik sonu (gizli ile alçalan kamera, gökten iniş) ~4,5 sn; Kuşbakışı kadrajın oturması
 * 1,7 sn + ad; Gölge perdenin aralanması ve maketin dönüşü. Okuma ağır tiplerin açıklamaları okunur.
 */
export const FILM = {
	tufan: [11000, 5200],
	golge: [5600, 3200],
	kusbakisi: [4400, 2800],
	kayip: [4600, 3000],
	ilavi: [4600, 3200],
	kimim: [4600, 3000],
	sive: [4800, 3400],
	mancinik: [4600, 3200],
	ikidogru: [4600, 2600],
	yanlis: [3800, 2600],
	harfal: [3400, 2400],
	azbilinen: [4200, 3000],
	halat: [3600, 2400],
	fitil: [3800, 2400],
};
/** Arayüzün öntanımlı cevap süresi (ui.reveal): en yakın 3 sn, bildi/bilemedi 1,9 sn. */
export const varsayilan = (T) => (T?.kind === 'closest' ? 3000 : 1900);

/**
 * Bu anın film süresi (ms) ya da null (eski tip: arayüzün süresi). o = { type, T, phase, who, involved (insan ya da
 * uzak koltuk soruyu cevaplıyor), tempo (iki botun savaşında BOT_FILM çarpanı) }.
 *   tam film   insanın ya da uzak oyuncunun cevapladığı düello ve kuşatma, 1'e 1 yayılma, altın soru
 *   kısa       3–4 kişilik yayılma (ardından sıralama ekranı gelir), ikinci şans, iki botun düellosu (× BOT_FILM, en az
 *              arayüzün öntanımlı süresi)
 */
export function filmMs({ type, T, phase, who = [], involved = true, tempo = 1 }) {
	const f = FILM[type];
	if (!f) return null;
	const def = varsayilan(T);
	if (phase === 'altin') return f[0];
	if (phase === 'second') return Math.max(def, f[1]);
	if (phase === 'yayilma') return who.length <= 2 ? f[0] : Math.max(def, f[1]);
	if (!involved) return Math.max(def, Math.round(f[1] * Math.min(1, tempo)));
	return f[0];
}

// ---------------------------------------------------------------- Kuşbakışı: gömülü yapı

/**
 * Kuşbakışı sorusu bu maçta sorulabilir mi: yapının ilinde bir başkent kalesi varsa hayır (kale maketi gömer; sunucuda
 * yapı konumları yok, bu kural her yerde aynı). Tarayıcıda ayrıca tipin kendi ölçüsü (kale yapıya değiyor mu).
 */
export function kusbakisiUygun(q, m) {
	if (q.type !== 'kusbakisi') return true;
	const b = m.app.board;
	const i = b.byId.get(q.il)?.index;
	if (i != null && m.players.some((p) => p.capital === i)) return false;
	if (m.app.props?.landmarks?.sites && TYPES.kusbakisi.usable) return TYPES.kusbakisi.usable(q, m.app);
	return true;
}

// ---------------------------------------------------------------- iki oyunculu canlı turun değerleri

/**
 * Fitil turu iki oyuncunun birlikte oynadığı tek bir turdur: her koltuğun değeri öbürünün oyununu da taşımalı (yoksa
 * iki yargı çelişir: ikisi de "kurtuldu"). Yerel insanın değeri (log) kendi kartındaki turdur: o taraf 0 kalır (kartın
 * gördüğü tur), öbürü 1; iki botta saldıran 0. Halat'ta değerler bağımsızdır (net farkı), dokunulmaz.
 */
export function eslestir(type, values) {
	if (type !== 'fitil' || values.length !== 2) return values;
	const own = (x) => (x && x.me ? x.me : { sheet: [] });
	const a = values[0];
	const b = values[1];
	const anchor = b?.me?.log && !a?.me?.log ? 1 : 0;
	const out = [];
	out[anchor] = { side: 0, me: own(values[anchor]), vs: own(values[1 - anchor]) };
	out[1 - anchor] = { side: 1, me: own(values[1 - anchor]), vs: own(values[anchor]) };
	return out;
}

// ---------------------------------------------------------------- çevrimiçi görünüm sertleştirme

/** Kısa, belirlenimci karma (FNV-1a, 32 bit) → 8 onaltılık hane. */
export function karma(s) {
	let h = 0x811c9dc5;
	for (const c of String(s)) {
		h ^= c.codePointAt(0);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}
/** Maket kimliği → maça tuzlu anlamsız kimlik (sunucu üretir; istemci tuzla kendi maket listesinde eşler). */
export const sidOf = (kind, salt = '') => 's' + karma(salt + '|' + kind);
/** İstemci tarafı eşleme: tuz ve bilinen maket adlarıyla kimliği çöz (bulunamazsa null). */
export function siteOfSid(sid, salt, kinds) {
	for (const k of kinds) if (sidOf(k, salt) === sid) return k;
	return null;
}

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));

/** Halkayı sadeleştir: her n. nokta, en az 8 nokta kalır. */
function thin(r, step) {
	const out = [];
	const n = r.length / 2;
	for (let k = 0; k < n; k += step) out.push(r[2 * k], r[2 * k + 1]);
	return out.length >= 16 ? out : r.slice();
}
/**
 * İlin sadeleştirilmiş silueti (SVG yolu, 100'lük kutu, kuzey yukarıda, tamsayı ve küçük tohumlu sapma): biçim okunur
 * ama harita verisindeki çokgenle birebir eşleşmez (istemci yolu veriyle karşılaştırıp ili bulamasın).
 */
export function kabaSiluet(i, seed = 1, S = 100) {
	const rings = PROV[i].rings.map((r) => thin(r, Math.max(1, Math.round(r.length / 2 / 48))));
	let x0 = Infinity;
	let x1 = -Infinity;
	let y0 = Infinity;
	let y1 = -Infinity;
	for (const r of rings)
		for (let k = 0; k < r.length; k += 2) {
			x0 = Math.min(x0, r[k]);
			x1 = Math.max(x1, r[k]);
			y0 = Math.min(y0, -r[k + 1]);
			y1 = Math.max(y1, -r[k + 1]);
		}
	const s = (S - 8) / Math.max(x1 - x0, y1 - y0);
	const ox = (S - (x1 - x0) * s) / 2;
	const oy = (S - (y1 - y0) * s) / 2;
	let h = seed >>> 0 || 1;
	const jit = () => {
		h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
		return ((h & 1023) / 1023 - 0.5) * 1.2;
	};
	return rings
		.map((r) => {
			let d = '';
			for (let k = 0; k < r.length; k += 2) d += (k ? 'L' : 'M') + Math.round(ox + (r[k] - x0) * s + jit()) + ' ' + Math.round(oy + (-r[k + 1] - y0) * s + jit());
			return d + 'Z';
		})
		.join('');
}
/** Kayıp İl boşluğu: ilin sadeleştirilmiş dış halkası, dünya biriminde 0,1'e yuvarlanmış (il kimliği yok). */
export function kabaKuyu(i) {
	const r = thin(PROV[i].rings[0], 3);
	return r.map((x) => Math.round(x * 10) / 10);
}

/**
 * Tipin publicView'ına çevrimiçi sertleştirme ekler. ctx = { salt } (maç tuzu; Match verir).
 *   kusbakisi  site → sid (anlamsız kimlik), yön tercihi kalır (yaw), il ve şıkların asıl sırası yok
 *   golge      model → sid, gölge kutuları kalır (çizim için)
 *   ilavi      siluet sadeleştirilir ve yuvarlanır
 *   kayip      boşluk: il dizini yerine kaba çokgen (kuyu)
 */
function hardened(type, base) {
	return function publicView(v, ctx = {}) {
		const o = base ? base(v) : JSON.parse(JSON.stringify(v));
		const salt = ctx.salt ?? '';
		if (type === 'kusbakisi' && o.q) {
			if (o.q.site) o.q.sid = sidOf(o.q.site, salt);
			delete o.q.site;
		} else if (type === 'golge' && o.q) {
			if (o.q.model) o.q.sid = sidOf(o.q.model, salt);
			delete o.q.model;
		} else if (type === 'ilavi' && Number.isInteger(v.hedef)) {
			o.sil = kabaSiluet(v.hedef, (karma(salt + v.q.id).charCodeAt(0) * 7919) | 1);
		} else if (type === 'kayip' && Number.isInteger(v.hedef)) {
			o.kuyu = kabaKuyu(v.hedef);
		}
		return o;
	};
}

/** Sertleştirmenin kullandığı il dizini (sınama). */
export const ilDizini = (plaka) => BY_ID.get(plaka);
