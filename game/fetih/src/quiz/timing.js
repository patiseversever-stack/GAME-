// Soru süresi: her sorunun kendi verisinden ve TİPİNİN EKRANDAKİ MEKANİĞİNDEN hesaplanan süre bütçesi (sn).
//
// Saf ve belirlenimci: DOM yok, cihaz ölçümü yok, rastgelelik yok; yalnızca soru verisi (q) okunur. Sunucu aynı
// modülle aynı süreyi bulur. Süreyi her zaman Match hesaplar (`T.prepare` görünüme `v.sec` koyar) ve uzak koltuklara
// `time` olarak gönderir; istemci kendisi hesaplamaz (publicView şıkları sildiği için yeniden hesap farklı çıkabilir).
//
// ------------------------------------------------------------------------------------------------ MODEL (v0.6)
// Her tip için telefonda (dikey, 412×892, tek başparmak) oyuncunun bu arayüzde YAPTIĞI işler adım adım sayılır:
//
//   bekleme (sabit)  arayüzün kendi süreleri: kartın açılışı, emojilerin düşmesi, anagramda yanlış kilidi…
//   bakış            göz metne oturur, şıklar/öğeler arasında gezinir (sakkad + bakış)
//   okuma (harf)     soru metni + ekranda okunması gereken bütün yazı (şıklar, öğeler, ipucu…)
//   düşünme          hatırlama / karşılaştırma / karar (tipe ve zorluğa göre)
//   giriş            dokunma, sürükleme, tuşlama, kaydırma, ONAYLA (tipin gerçek hareketleri)
//
// Bu bileşenler üç oyuncu için ölçeklenir (PLAYERS): hızlı (botların alt sınırı), ortanca ve yavaş-rahat oyuncu.
// Sabitler yavaş-rahat oyuncu içindir (ölçek 1); ortanca ve hızlı oyuncu bunların kesridir.
//
//   süre = en büyüğü( yavaş + PAY,  ortanca + KIRMIZI )  → tipin sınırlarına kırpılır, tam saniyeye yuvarlanır
//
//   KIRMIZI (HOT = 5 sn): son 5 sn'de kart kırmızı yanıp söner ve saat tıklar (ui.js). Ortanca oyuncu cevabını bu
//            panik penceresi başlamadan verebilmeli; kısa tiplerde (doğru/yanlış, karşılaştır) belirleyici olan bu.
//   PAY (1 sn): yavaş ama bilen oyuncu süre dolmadan, en az 1 sn kala bitirebilmeli; uzun tiplerde belirleyici.
//
// Sabitlerin dayanağı (yaklaşık):
//   Okuma   Yetişkin Türkçe sesli okuma ~166 kelime/dk (IReST, Trauzettel-Klosinski ve Dietz 2012); Türkçe kelime
//           boşlukla ~7,5 harf. Yavaş-rahat okur (12+ kitle, 6. sınıf, telefonda süre baskısı) ~110 kelime/dk → 14 harf/sn;
//           ortanca sessiz okuma ~160 kelime/dk → 20 harf/sn; hızlı yetişkin ~240 kelime/dk (Brysbaert 2019) → 28 harf/sn.
//   Açılış  Kart 0,38 sn'de kayar, soru yazısı 0,08+0,45 sn'de, gövde 0,18+0,35 sn'de belirir (styles-q.js): ~0,5 sn
//           okunacak bir şey yoktur; saat ise kart açılınca başlar.
//   Dokunma Karar sonrası başparmağı 56 px'lik düğmeye götürüp basma (Fitts, telefonda 0,4–0,8 sn) → 0,75 sn;
//           ekranın altındaki ONAYLA/GÖNDER için bakıp uzanma → 0,9 sn.
//   Sürükle Satırı tut (6 px eşiği), bir-iki yuva taşı, ötekilerin kaymasını izle, bırak → 1,4 sn (iki dokunuşla yer
//           değiştirme de aynı ölçüde).
//   Bağla   Soldaki karta, sonra sağdaki eşine dokun (ya da çizgi çek) → 1,3 sn.
//   Klavye  29 tuşlu Türkçe Q dizilimi; bilinen kelimede harfi bulup basma ~0,85 sn; adam asmacada boşa giden her
//           tahmin yeni bir harf seçmeyi gerektirir → 1,6 sn.
//   Kaydırıcı Başparmakla kabaca sür (büyük sayıyı izleyerek) 2,2 sn; ±1/±10 ince ayar dokunuşu 0,45 sn.
//   Harita  Kadrajı kavra 1 sn; yere dokun 1,2 sn; iğneye bakıp gerekirse düzelt 1,2 sn (en yakın kazanır: titizlik).

/** Kırmızı uyarı penceresi (sn): ui.js son HOT saniyede kartı kırmızı yakar ve saati tıklatır. */
export const HOT = 5;
/** Yavaş-rahat oyuncunun süre bitmeden kalan en az payı (sn). */
const SLACK = 1;

/** Oyuncu profilleri: okuma hızı (harf/sn) ve bakış, düşünme, giriş çarpanları (yavaş-rahat = 1). */
export const PLAYERS = {
	fast: { cps: 28, look: 0.55, think: 0.4, act: 0.65 },
	med: { cps: 20, look: 0.8, think: 0.7, act: 0.85 },
	slow: { cps: 14, look: 1, think: 1, act: 1 },
};

// sabit arayüz bekleme ve bakış süreleri (sn)
const OPEN = 0.5; // kart açılış canlandırması (bekleme)
const LOOK = { orient: 0.5, gaze: 0.3, map: 1, image: 2, rebus: 1.5, reveal: 4, emoji: 0.6, tile: 0.12, ends: 0.6 };
// giriş hareketleri (sn, yavaş-rahat oyuncu)
const ACT = { tap: 0.75, confirm: 0.9, move: 1.4, link: 1.3, key: 0.85, miss: 1.6, slide: 2.2, step: 0.45, mapTap: 1.2, mapFix: 1.2, tile: 0.5, retry: 1.5, nav: 0.6, fix: 2 };

/**
 * Tip başına sınırlar (sn) ve düşünme süresi think = [taban, zorluk başına] (yavaş-rahat oyuncu, zorluk 1'de taban).
 * Sırala, eşleştir ve çengelde düşünme öğe/kelime başına ayrıca hesaplanır (aşağıda); burada yalnız zorluk payı.
 */
export const PROFILE = {
	tf: { min: 9, max: 16, think: [2, 0.8] }, // bir ifadeyi doğrula
	hilo: { min: 9, max: 16, think: [2.5, 1] }, // iki değeri hatırla, karşılaştır
	proverb: { min: 10, max: 18, think: [2, 1] }, // tanıdık kalıbı tamamla
	choice: { min: 10, max: 25, think: [2.5, 1.25] }, // hatırla, şıklarda bul
	odd: { min: 11, max: 24, think: [3.5, 1.25] }, // ortak kuralı bul
	emoji: { min: 11, max: 24, think: [2.5, 1.25] }, // resimleri çöz
	riddle: { min: 12, max: 28, think: [4, 1.5] }, // bilmeceyi çöz
	img: { min: 12, max: 34, think: [3, 1.25] },
	num: { min: 12, max: 28, think: [3.5, 1.5] }, // tahmin et
	pin: { min: 12, max: 26, think: [3.5, 1.5] }, // yeri hatırla, haritada ölçeği kur
	hang: { min: 15, max: 42, think: [3.5, 1.5] }, // kelimeyi hatırla (açılan harflerle desen çözülür)
	anagram: { min: 13, max: 45, think: [2.5, 1.5] },
	order: { min: 13, max: 36, think: [0, 0.5] }, // öğe başına: aşağıda
	match: { min: 13, max: 36, think: [0, 0.4] }, // karar başına: aşağıda
	cross: { min: 25, max: 100, think: [0, 0.75] },
	blitz: { min: 10, max: 20, think: [0, 0], round: true }, // sabit tur: KIRMIZI kuralı yok
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
/** Karışık başlayan n öğeyi dizmek için ortalama hamle (sürükle ya da iki dokunuşla takas): n − en uzun artan alt dizi. */
const MOVES = [0, 0, 1, 1.2, 1.9, 2.7, 3.6];

/**
 * Sürenin bileşenleri (yavaş-rahat oyuncu): { wait (sn), look (sn), read (harf), think (sn), act (sn) }.
 * read harf sayısıdır; profilin okuma hızına bölünerek saniyeye çevrilir.
 */
function parts(q) {
	const t = q.type;
	const P = PROFILE[t] || PROFILE.choice;
	const k = clamp(Math.round(Number(q.diff) || 2), 1, 3) - 1;
	let wait = OPEN;
	let look = LOOK.orient;
	let read = len(q.q);
	let think = P.think[0] + P.think[1] * k;
	let act = ACT.tap;
	// şıkları oku: metin + şıklar arası bakış
	const opts = (list) => {
		read += sumLen(list);
		look += (list?.length || 0) * LOOK.gaze;
	};
	switch (t) {
		case 'tf': // ifadeyi oku, doğrula, iki büyük düğmeden birine bas
			break;
		case 'choice': // soruyu oku, dört şıkkı tara, doğruyu bul, bas
			opts(q.a);
			break;
		case 'odd': // dört öğeyi oku, ortak kuralı ve dışarıda kalanı bul
			opts(q.opts);
			break;
		case 'riddle': // bilmece çoğunlukla iki kez okunur
			read = Math.round(read * 1.25);
			opts(q.a);
			break;
		case 'proverb': // "Atasözünü tamamla" + boşluklu atasözü + dört şık; doğru şık boşluğa oturur
			read += len(q.text);
			look += LOOK.gaze; // atasözü kartına geçiş
			opts(q.a);
			break;
		case 'emoji': {
			// emojiler sırayla düşer (0,08 + i·0,12 sn, her biri 0,55 sn): sonuncusu oturana dek bekle, sonra çöz
			const n = (String(q.e ?? '').match(EMOJI) || []).length;
			wait += Math.max(0, 0.08 + 0.12 * (n - 1) + 0.55 - 0.35);
			look += n * LOOK.emoji;
			opts(q.a);
			break;
		}
		case 'hilo': // iki kart: adlar ve özellik; ikisini de hatırla, büyük olana bas
			read += len(q.left?.t) + len(q.right?.t) + len(q.prop);
			look += 2 * LOOK.gaze;
			break;
		case 'num': {
			// soru + birim; tahmini kur; kaydırıcıyı kabaca sür, ±1/±10 ile ince ayar (aralık basamağı kadar), GÖNDER
			read += len(q.unit);
			look += LOOK.gaze; // büyük sayı göstergesi
			const span = Math.abs(Math.round((Number(q.max) || 0) - (Number(q.min) || 0)));
			act = ACT.slide + ACT.step * (2 + Math.min(4, String(span).length)) + ACT.confirm;
			break;
		}
		case 'pin': // kart üstte, harita hazır: kadrajı kavra, yeri bul, dokun, iğneye bak/düzelt, ONAYLA
			look += LOOK.map;
			act = ACT.mapTap + ACT.mapFix + ACT.confirm;
			break;
		case 'hang': {
			// ipucunu oku, kutulardan uzunluğu gör, kelimeyi hatırla; sonra her farklı harfi klavyede bul ve bas.
			// Bilen oyuncu da çoğu kez sesli harfle açar: zorlukla artan beklenen ıska. Uzun kelimede deseni izlemek sürer.
			const L = letters(q.w);
			look += 0.15 * L.length;
			act = new Set(L).size * ACT.key + (1.5 + 0.75 * k) * ACT.miss;
			break;
		}
		case 'anagram': {
			const n = letters(q.w).length;
			look += LOOK.gaze + n * LOOK.tile;
			think += 0.55 * n; // çözme süresi harf sayısıyla büyür
			act = n * ACT.tile + ACT.retry;
			wait += 0.52 * 0.5; // yanlış denemede 0,52 sn kilit (yarı olasılıkla)
			break;
		}
		case 'order': {
			// soru metni (yön!) + uç etiketleri + n öğe; her öğenin değerini hatırla, yan yana koy, yönü denetle;
			// karışık başlangıçtan ortalama MOVES[n] hamle, son bir bakış ve ONAYLA
			const items = q.items || [];
			const n = items.length;
			read += sumLen(items.map((x) => x.t));
			look += LOOK.ends + n * LOOK.gaze;
			think += n * (1 + 0.5 * k) + 0.6 * Math.max(0, n - 1) + 0.8;
			if (q.dir === 'desc') think += 0.6; // azalan yönde zihin ters çevirir (alışılmış "küçükten büyüğe" değil)
			act = (MOVES[n] ?? n - 1) * ACT.move + ACT.confirm;
			break;
		}
		case 'match': {
			// soru + iki sütun; i. sol öğe için kalan (n − i) sağ öğe taranır; son çift kendiliğinden bağlanır;
			// n − 1 bağ, son bir bakış ve ONAYLA
			const pairs = q.pairs || [];
			const n = pairs.length;
			read += sumLen(pairs.flat());
			look += 2 * n * LOOK.gaze;
			for (let i = 0; i < n - 1; i++) think += 0.45 * (n - i) + 0.6;
			think += 0.6;
			act = Math.max(0, n - 1) * ACT.link + ACT.confirm;
			break;
		}
		case 'cross': {
			const words = q.words || [];
			const n = words.length;
			const total = words.reduce((s, x) => s + letters(x.w).length, 0);
			const longest = words.reduce((m, x) => Math.max(m, letters(x.w).length), 0);
			const cells = Math.max(longest, total - Math.max(0, n - 1)); // her yeni kelime en az bir harfte kesişir
			read += sumLen(words.map((x) => x.clue));
			look += 1.5;
			think = n * (2.5 + P.think[1] * k); // kelime başına hatırlama
			act = cells * ACT.key + n * ACT.nav + ACT.fix;
			break;
		}
		case 'img': {
			const ids = Array.isArray(q.img) ? q.img : [q.img];
			look += LOOK.image + (q.mode === 'rebus' ? LOOK.rebus * ids.length : 0);
			if (q.mode === 'blur' || q.mode === 'zoom') wait += LOOK.reveal; // resim netleşene / uzaklaşana dek
			if (Array.isArray(q.a)) opts(q.a);
			else {
				think += 1; // yazımı hatırla
				act = letters(q.w).length * ACT.key + ACT.retry;
			}
			break;
		}
		case 'blitz': {
			// tur süresi: ortanca bir oyuncunun ~7 ifadeyi okuyup cevaplayabileceği kadar (yavaş için 1/0,85 katı)
			const items = q.items || [];
			const avg = items.length ? sumLen(items.map((x) => x.t)) / items.length : 30;
			act = (7 * (avg / 20 + 0.55)) / PLAYERS.med.act;
			think = 0;
			break;
		}
		default:
			think += 3; // bilinmeyen tip: genel pay
	}
	return { wait, look, read, think, act };
}

/** Bir oyuncu profilinin bu soruyu bitirme süresi (sn). */
function finish(p, who) {
	return p.wait + p.look * who.look + p.read / who.cps + p.think * who.think + p.act * who.act;
}

const r1 = (x) => Math.round(x * 10) / 10;
const memo = new WeakMap();

/**
 * Sorunun süre ayrıntısı: { sec, fast, med, slow, raw, wait, look, read, think, act }.
 *   sec  : süre bütçesi (tam sn; oyunun saati)
 *   fast : hızlı ve bilen oyuncunun süresi (botların alt sınırı)
 *   med  : ortanca oyuncunun süresi
 *   slow : yavaş-rahat oyuncunun süresi (botların üst sınırı)
 *   raw  : kırpma ve yuvarlama öncesi bütçe
 */
export function timing(q) {
	if (!q || typeof q !== 'object') return { sec: 15, fast: 3, med: 6, slow: 9, raw: 15, wait: 0, look: 0, read: 0, think: 0, act: 0 };
	const hit = memo.get(q);
	if (hit) return hit;
	const p = parts(q);
	const P = PROFILE[q.type] || { min: 8, max: 30 };
	const fast = finish(p, PLAYERS.fast);
	const med = finish(p, PLAYERS.med);
	const slow = finish(p, PLAYERS.slow);
	const raw = P.round ? med : Math.max(slow + SLACK, med + HOT);
	const sec = Math.round(clamp(raw, P.min, P.max));
	const out = {
		sec,
		fast: r1(Math.min(fast, sec * 0.6)),
		med: r1(Math.min(med, sec)),
		slow: r1(Math.min(slow, sec)),
		raw: r1(raw),
		wait: r1(p.wait),
		look: r1(p.look),
		read: p.read,
		think: r1(p.think),
		act: r1(p.act),
	};
	memo.set(q, out);
	return out;
}

/** Sorunun süre bütçesi (tam sn). */
export const budget = (q) => timing(q).sec;

/** Görünümün süresi: Match'in koyduğu v.sec; yoksa sorudan hesapla. */
export const secOf = (v) => v?.sec ?? budget(v?.q);

/**
 * Bot cevap süresi: hızlı oyuncu ile "ortanca–yavaş arası" bir oyuncu arasında (gerçek bir oyuncunun cevap anı;
 * bütçenin KIRMIZI payı ve yavaş oyuncunun kuyruğu bota verilmez, yoksa maç uzar). lo, hi: bu aralıktaki dilim (0..1);
 * dağılım erkene yatık (insanlarda da cevapların çoğu ilk yarıda gelir), usta bot biraz daha çabuk. Ortalama bot
 * ortanca insanın biraz önünde biter; hiçbir zaman bütçenin %85'ini aşmaz, 1,5 sn'den önce de gelmez.
 */
export function botTime(v, R, skill = 0.6, lo = 0, hi = 1) {
	const sec = secOf(v);
	const t = v?.fast == null || v?.med == null || v?.slow == null ? timing(v?.q) : null;
	const fast = Math.max(1.5, Math.min(v?.fast ?? t.fast, sec * 0.6));
	const med = v?.med ?? t.med;
	const slow = v?.slow ?? t.slow;
	const cap = Math.max(fast, Math.min(med + 0.5 * (slow - med), sec * 0.85));
	const u = clamp((lo + (hi - lo) * Math.pow(R(), 1.3)) * (1.15 - 0.4 * clamp(skill, 0, 1)), 0, 1);
	return fast + (cap - fast) * u;
}
