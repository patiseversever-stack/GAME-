// Soru süresi: her sorunun kendi verisinden hesaplanan süre bütçesi (sn).
//
//   süre = bakış + okuma + düşünme(tip, zorluk) + giriş(mekanik)  →  tipin sınırlarına kırpılır, tam saniyeye yuvarlanır.
//
// Saf ve belirlenimci: DOM yok, cihaz ölçümü yok, rastgelelik yok; yalnızca soru verisi (q) okunur.
// Sunucu aynı modülle aynı süreyi bulur. Süreyi her zaman Match hesaplar (`T.prepare` görünüme `v.sec` koyar)
// ve uzak koltuklara `time` olarak gönderir; istemci süreyi kendisi hesaplamaz, gelen değeri kullanır
// (publicView soru verisinden şık listesini ve cevabı sildiği için istemcide yeniden hesap farklı çıkabilirdi).
//
// Model: "rahat oyuncu". Soruyu yavaşça okuyan, bildiği cevabı hatırlayıp telefonda tek parmakla giren oyuncu
// süre bitmeden rahatça yetişir; hızlı oyuncu sürenin yarısından azında biter (hız eşitlik bozar).
//
// Sabitlerin dayanağı (yaklaşık değerler):
//   Okuma   Yetişkin Türkçe sesli okuma ~166 kelime/dk (IReST, Trauzettel-Klosinski ve Dietz 2012); Türkçe kelime
//           boşlukla ~7,5 harf → ~20 harf/sn. 12+ kitle, telefon ve süre baskısı için hedef 6. sınıf okuru
//           (~110–120 kelime/dk) → 14 harf/sn. Hızlı yetişkin sessiz okuma ~240 kelime/dk (Brysbaert 2019) → 28 harf/sn.
//   Bakış   Kart açılıp gözün metne oturması ~0,8 sn; şıklar arası her sakkad + bakış ~0,3 sn.
//   Dokunma Karar verdikten sonra parmağı hedefe götürüp basma (Fitts, telefonda 0,4–0,8 sn) → 0,7 sn.
//   Klavye  29 tuşlu, alışılmamış dizilimli ekran klavyesinde tek parmak "avlama" ~1,3 tuş/sn → harf başı 0,75 sn;
//           adam asmacada her harf düşünülerek seçilir → tahmin başı 1,3 sn.
//   Düşünme Hatırlama (test) ~3 sn, doğrulama (doğru/yanlış) ~2 sn, tahmin ve harita ~4 sn; zorluk başına eklenir.

const CPS = 14; // rahat okuma, harf/sn (boşluk dahil)
const FAST_CPS = 28; // hızlı okuyan
const BLITZ_CPS = 20; // yıldırım turunda kısa ifadeler hızlı okunur

// sabit bakış süreleri (sn)
const LOOK = { orient: 0.8, gaze: 0.3, instr: 1, map: 1.2, image: 2, rebus: 1.5, reveal: 4, emoji: 0.7, tile: 0.12 };
// giriş mekaniği (sn)
const ACT = { tap: 0.7, key: 0.75, guess: 1.3, tile: 0.5, swap: 1.5, link: 1.1, nav: 0.6, slide: 2, fine: 0.8, pin: 1.6, retry: 1.5, fix: 2 };

/**
 * Tip başına sınırlar ve düşünme süresi: think = [taban, zorluk başına] (zorluk 1'de taban).
 * Sırala, eşleştir ve çengelde taban öğe/kelime başına ayrıca hesaplanır (aşağıda); burada yalnız zorluk payı.
 */
export const PROFILE = {
	tf: { min: 8, max: 14, think: [2, 0.75] }, // kart son 5 sn'de 'sıcak' geri sayıma geçer: en kısada da 3 sn sakin
	hilo: { min: 8, max: 15, think: [2.5, 0.75] },
	proverb: { min: 8, max: 18, think: [2, 1] },
	choice: { min: 9, max: 24, think: [3, 1.25] },
	odd: { min: 10, max: 24, think: [3.5, 1.25] },
	emoji: { min: 10, max: 22, think: [3, 1.25] },
	riddle: { min: 12, max: 28, think: [4, 1.5] },
	img: { min: 10, max: 32, think: [3, 1.25] },
	num: { min: 12, max: 26, think: [4, 1.5] },
	pin: { min: 10, max: 22, think: [4, 2] },
	hang: { min: 15, max: 40, think: [3, 1.25] },
	anagram: { min: 12, max: 40, think: [2.5, 1.5] },
	order: { min: 15, max: 40, think: [0, 1.25] },
	match: { min: 15, max: 40, think: [0, 1.25] },
	cross: { min: 25, max: 90, think: [0, 0.75] },
	blitz: { min: 10, max: 18, think: [0, 0] },
};

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
/** Kod noktası sayısı (UTF-16 birimi değil: sunucu dili ne olursa olsun aynı sonuç). */
function len(s) {
	let n = 0;
	for (const _ of String(s ?? '')) n++;
	return n;
}
const sumLen = (list) => (Array.isArray(list) ? list.reduce((s, x) => s + len(x), 0) : 0);
const letters = (w) => [...String(w ?? '').toLocaleUpperCase('tr-TR')].filter((c) => c !== ' ');
// emoji sayımı: kartın çizdiği kutu sayısıyla aynı (bayrak, ZWJ dizisi ve ten rengi tek emoji)
const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*|\S/gu;

/**
 * Sürenin bileşenleri: { look (sn), read (harf), think (sn), act (sn) }.
 * read harf sayısıdır; okuma hızına bölünerek saniyeye çevrilir (rahat ve hızlı oyuncu için ayrı).
 */
function parts(q) {
	const t = q.type;
	const P = PROFILE[t] || PROFILE.choice;
	const k = clamp(Math.round(Number(q.diff) || 2), 1, 3) - 1;
	let look = LOOK.orient;
	let read = len(q.q);
	let think = P.think[0] + P.think[1] * k;
	let act = ACT.tap;
	// dört şıkkı oku: metin + şıklar arası bakış
	const opts = (list) => {
		read += sumLen(list);
		look += (list?.length || 0) * LOOK.gaze;
	};
	switch (t) {
		case 'tf':
			break;
		case 'choice':
			opts(q.a);
			break;
		case 'odd':
			opts(q.opts);
			break;
		case 'riddle':
			read = Math.round(read * 1.25); // bilmece çoğunlukla iki kez okunur
			opts(q.a);
			break;
		case 'proverb':
			read += len(q.text);
			opts(q.a);
			break;
		case 'emoji':
			look += (String(q.e ?? '').match(EMOJI) || []).length * LOOK.emoji; // resimleri çözmek
			opts(q.a);
			break;
		case 'hilo':
			read += len(q.left?.t) + len(q.right?.t) + len(q.prop);
			look += 2 * LOOK.gaze;
			break;
		case 'num': {
			read += len(q.unit);
			// kaydırıcıyı kabaca sür, ±1/±10 ile ince ayar (basamak başına), sonra GÖNDER
			const span = Math.abs(Math.round((Number(q.max) || 0) - (Number(q.min) || 0)));
			act = ACT.slide + ACT.fine * Math.min(4, String(span).length) + ACT.tap;
			break;
		}
		case 'pin':
			look += LOOK.map; // harita kadrajı oturur, ölçek kavranır
			act = ACT.pin + ACT.tap; // dokun, gerekirse düzelt, ONAYLA
			break;
		case 'hang': {
			// her harf düşünülerek seçilir: farklı harf sayısı + beklenen ıska (zor sözcükte daha çok);
			// uzun sözcükte boş kutuları izleyip deseni görmek de sürer
			const L = letters(q.w);
			act = (new Set(L).size + 2 + 0.5 * k) * ACT.guess + 0.2 * L.length;
			break;
		}
		case 'anagram': {
			const n = letters(q.w).length;
			look += LOOK.instr + n * LOOK.tile;
			think += 0.55 * n; // çözme süresi harf sayısıyla büyür
			act = n * ACT.tile + ACT.retry;
			break;
		}
		case 'order': {
			const items = q.items || [];
			const n = items.length;
			read += sumLen(items.map((x) => x.t));
			look += LOOK.instr + n * LOOK.gaze;
			think += 1.4 * n; // her öğenin değerini hatırla ve karşılaştır
			act = Math.max(0, n - 2) * ACT.swap + ACT.tap; // karışık 4 öğe ortalama ~2 yer değiştirme
			break;
		}
		case 'match': {
			const pairs = q.pairs || [];
			const n = pairs.length;
			read += sumLen(pairs.flat());
			look += LOOK.instr + 2 * n * LOOK.gaze;
			think += 1.3 * Math.max(0, n - 1); // son çift kendiliğinden kalır
			act = n * ACT.link + ACT.tap; // her çift iki dokunuş; hepsi bağlanınca ONAYLA
			break;
		}
		case 'cross': {
			const words = q.words || [];
			const n = words.length;
			const total = words.reduce((s, x) => s + letters(x.w).length, 0);
			const longest = words.reduce((m, x) => Math.max(m, letters(x.w).length), 0);
			const cells = Math.max(longest, total - Math.max(0, n - 1)); // her yeni kelime en az bir harfte kesişir
			read += sumLen(words.map((x) => x.clue));
			look += LOOK.instr * 1.5;
			think = n * (2.5 + P.think[1] * k); // kelime başına hatırlama
			act = cells * ACT.key + n * ACT.nav + ACT.fix;
			break;
		}
		case 'img': {
			const ids = Array.isArray(q.img) ? q.img : [q.img];
			look += LOOK.image + (q.mode === 'rebus' ? LOOK.rebus * ids.length : 0) + (q.mode === 'blur' || q.mode === 'zoom' ? LOOK.reveal : 0);
			if (Array.isArray(q.a)) opts(q.a);
			else {
				think += 1; // yazımı hatırla
				act = letters(q.w).length * ACT.key + ACT.retry;
			}
			break;
		}
		case 'blitz': {
			// tur süresi: ortalama bir oyuncunun ~7 ifadeyi okuyup cevaplayabileceği kadar
			const items = q.items || [];
			const avg = items.length ? sumLen(items.map((x) => x.t)) / items.length : 30;
			act = 7 * (avg / BLITZ_CPS + 0.55);
			think = 0;
			break;
		}
		default:
			think += 3; // bilinmeyen tip: genel pay
	}
	return { look, read, think, act };
}

const memo = new WeakMap();

/**
 * Sorunun süre ayrıntısı: { sec, fast, raw, look, read, think, act }.
 *   sec  : süre bütçesi (tam sn; oyunun saati)
 *   fast : hızlı ve bilen bir oyuncunun süresi (sn, 0,1 hassasiyet; botların alt sınırı)
 *   raw  : kırpma ve yuvarlama öncesi bütçe
 */
export function timing(q) {
	if (!q || typeof q !== 'object') return { sec: 15, fast: 3, raw: 15, look: 0, read: 0, think: 0, act: 0 };
	const hit = memo.get(q);
	if (hit) return hit;
	const p = parts(q);
	const P = PROFILE[q.type] || { min: 8, max: 30 };
	const raw = p.look + p.read / CPS + p.think + p.act;
	const sec = Math.round(clamp(raw, P.min, P.max));
	// hızlı oyuncu: göz şıklarda gezinmez, cevabı hemen tanır (şıkların yarısını okur), parmağı hazırdır
	const fastRaw = p.look * 0.5 + (p.read * 0.75) / FAST_CPS + p.think * 0.35 + p.act * 0.6;
	const fast = Math.round(Math.min(fastRaw, sec * 0.6) * 10) / 10;
	const out = { sec, fast, raw: Math.round(raw * 10) / 10, look: p.look, read: p.read, think: p.think, act: p.act };
	memo.set(q, out);
	return out;
}

/** Sorunun süre bütçesi (tam sn). */
export const budget = (q) => timing(q).sec;

/** Görünümün süresi: Match'in koyduğu v.sec; yoksa sorudan hesapla. */
export const secOf = (v) => v?.sec ?? budget(v?.q);

/**
 * Bot cevap süresi: hızlı oyuncu süresi ile bütçenin %80'i arasında. lo, hi: bu aralıktaki dilim (0..1);
 * dağılım erkene yatık (insanlarda da cevapların çoğu sürenin ilk yarısında gelir), usta bot biraz daha çabuk.
 * Hiçbir zaman süre dolmaz; uzun soruyu da 1,5 sn'de cevaplamaz.
 */
export function botTime(v, R, skill = 0.6, lo = 0, hi = 1) {
	const sec = secOf(v);
	const fast = Math.min(v?.fast ?? timing(v?.q).fast, sec * 0.6);
	const cap = sec * 0.8;
	const u = clamp((lo + (hi - lo) * Math.pow(R(), 1.3)) * (1.15 - 0.4 * clamp(skill, 0, 1)), 0, 1);
	return fast + (cap - fast) * u;
}
