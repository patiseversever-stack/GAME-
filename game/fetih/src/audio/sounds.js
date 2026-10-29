// Efekt tarifleri. Her biri e (motor), t (başlama zamanı), o (seçenekler) alır; canlı ve çevrimdışı motorda aynı çalışır.
// Karakter: davul/kös vuruşları = darbe; zurna/ney = zafer ve yas; tahta tıkı = arayüz; kanun = parıltı.
// Makamlar: Rast = olumlu, Hicaz = tehdit, Uşşak = kayıp, Nihavend = macera.
//
// Alanlar:
//   prio (0..3) eşzamanlılıkta öncelik · cd (sn) aynı sesin yeniden tetik süresi · max aynı anda en çok adet
//   dur (sn) çalma süresi tahmini · len (sn ya da o'dan sn) pişirilen uzunluk (varsayılan dur) · tail (sn) yankı kuyruğu
//   wet yankı çarpanı · peak pişirilen sesin tepe düzeyi · gain çalma kazancı · duck [derinlik, tutma, bırakma] müziği kıs
//   live: true → hiç pişirilmez, canlı çalınır (tek vuruşluk, çok sık sesler)
//   variant(o) → sesi değiştiren seçeneklerin (nicemlenmiş) özeti; her farklı özet ayrı pişirilir. Yoksa tek ses.
//   vary: true → her çalışta ±%1.5 hız oynaması (aynı ses sıkmasın)
//   music: [tema, gecikme sn] → ses çalınca müzik temasını da değiştirir (zafer/yenilgi)
import { degHz } from './scales.js';
import { zurna, ney, horn, strings, choir } from './voices.js';

const R = (d) => degHz('rast', d);
const H = (d) => degHz('hicaz', d);
const U = (d) => degHz('ussak', d);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ---------------------------------------------------------------- küçük yardımcılar
const roll = (e, t, n, gap0, gap1, v0, v1, rate = 1, name = 'tek') => {
	let tt = t;
	for (let i = 0; i < n; i++) {
		const k = i / Math.max(1, n - 1);
		e.hit(name, tt, v0 + (v1 - v0) * k, rate * (0.95 + e.r() * 0.1), i % 2 ? 0.2 : -0.2);
		tt += gap0 + (gap1 - gap0) * k;
	}
	return tt;
};
const sparkle = (e, t, vol = 0.25, n = 4, base = 1500) => {
	for (let i = 0; i < n; i++) e.tone('sine', base * Math.pow(1.5, i % 3) * (1 + (i >> 1) * 0.5), 0, t + i * 0.045, 0.22, vol * (1 - i * 0.12), { a: 0.002 });
};
const whoosh = (e, t, dur, vol, f0, f1, o = {}) => e.noise(t, dur, vol, f0, f1, { q: 0.9, a: dur * 0.6, ...o });
// çan (örnek 880 Hz'de; oynatma hızıyla f Hz'e ayarlanır)
const bell = (e, t, f, vol = 0.3, pan = 0) => e.hit('chime', t, vol, f / 880, pan);
// kanun dizisi: derece listesi, gap arayla, soldan sağa yayılır
const arp = (e, fn, degs, t, gap, vol, kind = 'kanun') => degs.forEach((d, i) => e.pluck(kind, fn(d), t + i * gap, vol * (1 - i * 0.025), -0.55 + (1.1 * i) / Math.max(1, degs.length - 1)));
// büyük vuruş: davul + kös + alt gürleme
const impact = (e, t, vol = 1, big = false) => {
	e.hit(big ? 'dumBig' : 'dum', t, vol, 1);
	e.hit('kos', t, vol * 0.7, big ? 0.9 : 1.05);
	e.tone('sine', 90, 36, t, big ? 1.0 : 0.7, vol * 0.34, { a: 0.003 });
};
// çalgı hızı: elden gelen "tek" çıtırtıları rastgele dağıt
const scatter = (e, t, n, span, name, vol, r0 = 0.6, r1 = 1.4, pan = 0.9, curve = 1.6) => {
	for (let i = 0; i < n; i++) {
		const at = Math.pow(e.r(), curve) * span;
		e.hit(name, t + at, vol * (1 - (at / (span * 1.4))) * (0.7 + e.r() * 0.6), r0 + e.r() * (r1 - r0), (e.r() - 0.5) * pan * 2);
	}
};

// ---------------------------------------------------------------- bayrak türleri
/** Bayrak başlığından ses türü (UI başlığı Türkçe büyük harf: 'FETİH', 'YAYILMA', ...). */
export function bannerKind(title) {
	const T = String(title || '').toLocaleUpperCase('tr-TR');
	if (/KOMUTAN/.test(T)) return 'boss';
	if (/SON TUR/.test(T)) return 'final';
	if (/KUŞATMA/.test(T)) return 'siege';
	if (/FETİH/.test(T)) return 'fetih';
	if (/YAYILMA/.test(T)) return 'expand';
	if (/SEFER/.test(T)) return 'camp';
	if (/EŞİTLİK/.test(T)) return 'tie';
	if (/KALKAN/.test(T)) return 'shield';
	if (/İKİNCİ/.test(T)) return 'second';
	if (/YENİLGİ|SÜRE DOLDU/.test(T)) return 'bad';
	return 'default';
}
const BANNER_TITLES = { boss: 'KOMUTAN', final: 'SON TUR', siege: 'KUŞATMA', fetih: 'FETİH', expand: 'YAYILMA', camp: 'SEFER', tie: 'EŞİTLİK', shield: 'KALKAN', second: 'İKİNCİ ŞANS', bad: 'YENİLGİ', default: '' };
const BANNER_LEN = { boss: 2.7, final: 2.1, siege: 1.9, fetih: 1.5, expand: 1.3, camp: 1.5, tie: 1.0, shield: 1.1, second: 1.3, bad: 1.4, default: 1.2 };

const BANNERS = {
	// FETİH turu / açılış: tehditkâr çağrı
	fetih(e, t) {
		whoosh(e, t, 0.3, 0.22, 300, 2400);
		impact(e, t + 0.2, 0.9);
		e.hit('zil', t + 0.2, 0.22, 1.1);
		horn(e, t + 0.18, H(0) * 0.5, 0.9, 0.2, { open: 1500 });
		zurna(e, t + 0.22, H(4), 0.15, 0.38);
		zurna(e, t + 0.4, H(7), 0.6, 0.42, { bend: 70, bright: true });
		e.pluck('kanun', H(7), t + 0.45, 0.4);
	},
	// YAYILMA: parlak, hafif, davetkâr
	expand(e, t) {
		whoosh(e, t, 0.3, 0.2, 400, 3000);
		e.hit('def', t + 0.18, 0.7, 1);
		e.hit('dum', t + 0.2, 0.7, 1.1);
		zurna(e, t + 0.2, R(0), 0.13, 0.36);
		zurna(e, t + 0.35, R(4), 0.5, 0.4, { bend: 50 });
		arp(e, R, [7, 9, 11], t + 0.38, 0.06, 0.34);
		sparkle(e, t + 0.5, 0.07, 3, 2000);
	},
	// KUŞATMA: alçak boru, kös yuvarlanması, kılıç çınlaması
	siege(e, t) {
		whoosh(e, t, 0.4, 0.2, 250, 1800);
		horn(e, t, H(0) * 0.5, 1.1, 0.3, { open: 1000 });
		roll(e, t + 0.1, 11, 0.09, 0.035, 0.15, 0.55, 0.9);
		impact(e, t + 1.2, 1, true);
		e.hit('clang', t + 1.2, 0.5, 0.9);
		e.hit('zil', t + 1.2, 0.3, 0.9);
		zurna(e, t + 1.25, H(0), 0.5, 0.36, { bend: 80 });
	},
	// SON TUR: büyük çağrı, koro
	final(e, t) {
		whoosh(e, t, 0.45, 0.24, 250, 3200);
		impact(e, t + 0.3, 1, true);
		e.hit('zil', t + 0.3, 0.45, 1);
		choir(e, t + 0.15, [H(0) * 0.5, H(4) * 0.5, H(0)], 1.5, 0.12, { att: 0.2, rel: 0.6, vowel: 'a' });
		zurna(e, t + 0.35, H(0), 0.18, 0.4);
		zurna(e, t + 0.55, H(4), 0.18, 0.42);
		zurna(e, t + 0.75, H(7), 0.9, 0.46, { bend: 60, bright: true });
		arp(e, H, [0, 2, 4, 7, 9, 11], t + 0.45, 0.055, 0.34);
		e.hit('dumBig', t + 1.35, 0.85, 1.05);
	},
	// KOMUTAN: patron girişi: üç kös, derin boru, koro, çınlama
	boss(e, t) {
		impact(e, t, 1, true);
		impact(e, t + 0.4, 0.9, true);
		impact(e, t + 0.8, 1, true);
		horn(e, t + 0.1, H(0) * 0.5, 1.7, 0.34, { open: 1100 });
		horn(e, t + 0.1, H(4) * 0.5, 1.7, 0.2, { open: 800 });
		choir(e, t + 0.5, [H(0) * 0.5, H(4) * 0.5, H(0)], 1.9, 0.14, { att: 0.5, rel: 0.9, vowel: 'o' });
		e.hit('clang', t + 0.8, 0.6, 0.8);
		e.hit('zil', t + 0.8, 0.4, 0.9);
		whoosh(e, t + 0.8, 0.9, 0.18, 2500, 300, { a: 0.02 });
		zurna(e, t + 1.35, H(4), 0.8, 0.4, { bend: 80 });
	},
	// SEFER: sıcak, yiğit
	camp(e, t) {
		whoosh(e, t, 0.25, 0.14, 300, 2000);
		e.hit('def', t + 0.15, 0.6, 1);
		e.hit('dum', t + 0.15, 0.6, 1);
		ney(e, t + 0.2, R(4), 0.55, 0.36, { scoop: 40 });
		ney(e, t + 0.65, R(2), 0.55, 0.32, { scoop: 40, release: 0.4 });
		e.pluck('baglama', R(0), t + 0.2, 0.5);
		e.pluck('baglama', R(4), t + 0.28, 0.4);
		arp(e, R, [7, 9], t + 0.7, 0.07, 0.3);
	},
	// EŞİTLİK: gergin çift çınlama
	tie(e, t) {
		e.hit('dum', t, 0.7, 0.95);
		e.hit('tink', t + 0.05, 0.4, 0.8);
		e.hit('tink', t + 0.3, 0.4, 0.8);
		e.hit('clang', t + 0.3, 0.3, 1.2);
		zurna(e, t + 0.4, H(2), 0.35, 0.3);
		e.tone('sine', 220, 0, t + 0.3, 0.6, 0.1);
	},
	// KALKAN: parlak metal parıltı
	shield(e, t) {
		whoosh(e, t, 0.3, 0.16, 500, 4200);
		e.hit('clang', t + 0.15, 0.7, 1.15);
		bell(e, t + 0.15, R(14), 0.4);
		arp(e, R, [7, 9, 11, 14], t + 0.22, 0.05, 0.3);
		e.hit('dum', t + 0.15, 0.5, 1.2);
	},
	// İKİNCİ ŞANS: kalp atışı, yükselen ney
	second(e, t) {
		e.hit('dum', t, 0.7, 0.9);
		e.hit('dum', t + 0.22, 0.5, 1);
		ney(e, t + 0.4, U(2), 0.4, 0.34, { scoop: 40 });
		ney(e, t + 0.75, U(4), 0.5, 0.34, { scoop: 30, release: 0.35 });
		bell(e, t + 0.8, R(11), 0.28);
	},
	// kötü haber
	bad(e, t) {
		whoosh(e, t, 0.3, 0.18, 300, 1200);
		e.hit('dum', t + 0.2, 0.85, 0.9);
		ney(e, t + 0.2, H(4), 0.5, 0.38, { scoop: 40 });
		ney(e, t + 0.6, H(1), 0.6, 0.34, { scoop: 40 });
	},
	default(e, t) {
		whoosh(e, t, 0.32, 0.22, 300, 2400);
		e.hit('dum', t + 0.2, 0.85, 1);
		e.hit('zil', t + 0.2, 0.2, 1.3);
		zurna(e, t + 0.2, R(0), 0.14, 0.4);
		zurna(e, t + 0.36, R(4), 0.5, 0.42, { bend: 50 });
		e.pluck('kanun', R(7), t + 0.4, 0.4);
	},
};

// ---------------------------------------------------------------- joker sesleri
const JOKER_IDS = ['yari', 'sure', 'kalkan', 'ikinci', 'sabotaj', 'kahin'];
const JOKERS = {
	// yarı yarıya: iki keskin kesik, iki yarı
	yari(e, t) {
		whoosh(e, t, 0.2, 0.18, 3000, 700, { a: 0.05 });
		e.hit('crack', t + 0.02, 0.7, 1);
		e.hit('woodTap', t + 0.02, 0.5, 1.7);
		e.hit('crack', t + 0.17, 0.7, 0.85);
		e.hit('woodTap', t + 0.17, 0.5, 1.35);
		bell(e, t + 0.2, R(7), 0.34, -0.3);
		bell(e, t + 0.3, R(4), 0.26, 0.3);
	},
	// ekstra süre: saat tıkırtısı ve yükselen çan
	sure(e, t) {
		for (let i = 0; i < 3; i++) e.hit('woodTap', t + i * 0.09, 0.45, 1.2 + i * 0.16);
		e.tone('sine', 400, 1200, t + 0.28, 0.4, 0.08, { a: 0.05 });
		bell(e, t + 0.3, R(7), 0.34);
		bell(e, t + 0.4, R(11), 0.3);
		bell(e, t + 0.5, R(14), 0.26);
		e.hit('clang', t + 0.3, 0.2, 1.4);
	},
	// kalkan: metal çınlama, parıltı
	kalkan(e, t) {
		e.hit('clang', t, 0.8, 1.1);
		bell(e, t + 0.04, R(14), 0.36);
		whoosh(e, t, 0.45, 0.16, 600, 5000, { a: 0.25 });
		arp(e, R, [9, 11, 14, 16], t + 0.18, 0.05, 0.28);
		e.hit('dum', t, 0.55, 1.2);
	},
	// ikinci şans: kalp atışı ve umut
	ikinci(e, t) {
		e.hit('dum', t, 0.6, 0.9);
		e.hit('dum', t + 0.2, 0.45, 1);
		ney(e, t + 0.35, U(2), 0.35, 0.34, { scoop: 40 });
		ney(e, t + 0.65, U(4), 0.5, 0.34, { scoop: 30, release: 0.3 });
		bell(e, t + 0.7, R(11), 0.3);
	},
	// sabotaj (kullanan): elektrik çıtırtısı ve alçak düşüş
	sabotaj(e, t) {
		e.tone('sawtooth', 2200, 90, t, 0.35, 0.12, { a: 0.003, lp: 3500 });
		e.noise(t, 0.3, 0.2, 5000, 1200, { type: 'highpass', a: 0.003 });
		for (let i = 0; i < 4; i++) e.hit('crack', t + 0.03 + i * 0.05 + e.r() * 0.03, 0.4, 0.7 + e.r() * 0.8, (e.r() - 0.5) * 1.2);
		e.hit('dum', t + 0.12, 0.7, 0.8);
		e.tone('sine', 120, 45, t + 0.1, 0.5, 0.2, { a: 0.01 });
	},
	// seyirci (kahin): gizemli ney, çan öbeği, yükselen parıltı
	kahin(e, t) {
		whoosh(e, t, 0.5, 0.14, 300, 3800, { a: 0.35 });
		ney(e, t + 0.1, R(4), 0.8, 0.32, { scoop: 25, release: 0.5 });
		bell(e, t + 0.3, R(14), 0.26, -0.4);
		bell(e, t + 0.42, R(11), 0.26, 0.4);
		bell(e, t + 0.56, R(16), 0.24, 0);
		sparkle(e, t + 0.6, 0.07, 4, 2200);
	},
};

// ---------------------------------------------------------------- tarifler
export const SOUNDS = {
	// ---------------------------------------------------------------- arayüz (canlı: tek vuruş)
	tap: {
		prio: 0, cd: 0.04, max: 3, dur: 0.12, live: true, vary: true,
		fn(e, t, o) {
			e.hit('woodTap', t, 0.5, (o.rate || 1) * (0.95 + e.r() * 0.14));
		},
	},
	// çark mandalı. o.speed (derece/sn) ile hız ve perde; o.urgent / o.left (sn) ile son 4 saniye gerginleşir.
	tick: {
		prio: 0, cd: 0.025, max: 5, dur: 0.15, live: true,
		fn(e, t, o) {
			const left = o.left;
			const urgent = o.urgent || (typeof left === 'number' && left <= 4);
			if (!urgent) {
				const sp = typeof o.speed === 'number' ? clamp(o.speed / 900, 0, 1) : 0.4;
				e.hit('woodLow', t, o.vol || 0.22 + sp * 0.2, (o.rate || 1) * (0.9 + sp * 0.25 + e.r() * 0.08));
				return;
			}
			const k = typeof left === 'number' ? clamp((4 - left) / 4, 0, 1) : 0.5;
			e.hit('woodTap', t, 0.62 + k * 0.25, 1.3 + k * 0.5);
			e.hit('dbTek', t, 0.18 + k * 0.22, 1.1 + k * 0.3);
			if (typeof left === 'number' && left <= 2) e.hit('dum', t, 0.34 + (2 - left) * 0.12, 1.15);
		},
	},
	// süre azalıyor (son 5 sn): her saniye bir tık, giderek sertleşir
	count: {
		prio: 1, cd: 0.2, max: 2, dur: 0.2, live: true, intensity: 1,
		fn(e, t, o) {
			const left = typeof o.left === 'number' ? o.left : 3;
			const k = clamp((5 - left) / 5, 0, 1);
			e.hit('woodTap', t, 0.4 + k * 0.4, 1.15 + k * 0.45);
			e.hit('dbTek', t, 0.12 + k * 0.25, 1.1 + k * 0.3);
			if (left <= 3) e.hit('dbDoum', t, 0.25 + (3 - left) * 0.1, 1.0 + k * 0.1);
			if (left <= 1) e.hit('dum', t, 0.45, 1.1);
		},
	},
	// cevap verildi: kilit sesi
	answer: {
		prio: 1, cd: 0.1, max: 2, dur: 0.4, live: true, vary: true, intensity: 0,
		fn(e, t) {
			e.hit('woodLow', t, 0.6, 1);
			e.hit('rim', t, 0.25, 1);
			e.pluck('baglama', R(2), t + 0.02, 0.4);
		},
	},
	// rakip cevapladı (küçük baloncuk): oyuncu sırasına göre perde ve yan
	answered: {
		prio: 0, cd: 0.05, max: 3, dur: 0.1, live: true,
		fn(e, t, o) {
			const k = (o.player | 0) % 4;
			e.hit('pop', t, 0.2, 0.9 + k * 0.1, (k - 1.5) * 0.35);
		},
	},
	// soru kartı süzülür
	question: {
		prio: 1, cd: 0.2, max: 1, dur: 0.6, len: 0.7, tail: 0.7, peak: 0.55, intensity: 0,
		fn(e, t) {
			whoosh(e, t, 0.2, 0.18, 500, 3000);
			e.hit('woodLow', t + 0.05, 0.6, 0.9);
			e.hit('woodTap', t + 0.14, 0.6, 1.1);
			e.pluck('kanun', R(4), t + 0.14, 0.4);
			e.pluck('kanun', R(7), t + 0.25, 0.34, 0.15);
		},
	},
	timeout: {
		prio: 2, cd: 0.3, max: 1, dur: 0.7, len: 0.7, tail: 0.7, peak: 0.7, duck: [0.3, 0.3, 0.5], intensity: 0,
		fn(e, t) {
			e.hit('dum', t, 0.8, 0.8);
			e.tone('sawtooth', 240, 120, t, 0.45, 0.14, { a: 0.01, lp: 700 });
			e.noise(t, 0.3, 0.12, 400, 160, { type: 'lowpass', a: 0.01 });
			e.hit('tink', t + 0.02, 0.3, 0.6);
		},
	},
	// doğru cevap: kombo basamağına göre yükselen kanun
	right: {
		prio: 2, cd: 0.12, max: 2, dur: 0.9, len: 1.0, tail: 0.7, peak: 0.62, duck: [0.2, 0.2, 0.4], vary: true, intensity: 0,
		variant: (o) => ({ n: clamp(o.n | 0, 0, 6) }),
		all: () => [0, 1, 2, 3, 4, 5, 6].map((n) => ({ n })),
		fn(e, t, o) {
			const n = clamp(o.n | 0, 0, 6);
			[0, 2, 4, 7].forEach((x, i) => e.pluck('kanun', R(x + n), t + i * 0.055, 0.5 - i * 0.04, (i - 1.5) * 0.12));
			e.hit('woodTap', t, 0.5, 1.4);
			e.hit('dbTek', t, 0.3, 1);
			sparkle(e, t + 0.18, 0.1 + n * 0.02, 3 + Math.min(3, n), 1600 + n * 120);
			if (n >= 2) e.hit('zil', t + 0.1, 0.18 + n * 0.03, 1.4);
			if (n >= 4) bell(e, t + 0.2, R(14 + n), 0.22);
		},
	},
	wrong: {
		prio: 2, cd: 0.12, max: 1, dur: 0.7, len: 0.75, tail: 0.6, peak: 0.66, duck: [0.25, 0.3, 0.5], vary: true, intensity: 0,
		fn(e, t) {
			e.hit('dum', t, 0.9, 0.85);
			zurna(e, t, H(2) * 0.5, 0.2, 0.3, { bend: 0 });
			zurna(e, t + 0.2, H(0) * 0.5, 0.3, 0.3, { bend: 120 });
			e.noise(t, 0.2, 0.1, 500, 120, { type: 'lowpass' });
		},
	},
	// sonuç açıldı (izleyici kipinde ya da herkesin cevabı)
	reveal: {
		prio: 1, cd: 0.2, max: 1, dur: 0.8, len: 0.9, tail: 0.7, peak: 0.66, intensity: 0,
		fn(e, t) {
			roll(e, t, 6, 0.045, 0.03, 0.18, 0.5);
			e.hit('dum', t + 0.32, 0.8, 1);
			e.pluck('baglama', H(0), t + 0.32, 0.5);
			e.pluck('baglama', H(4), t + 0.32, 0.4);
			e.hit('zil', t + 0.32, 0.2, 1.4);
		},
	},
	// sıra / puan tablosu açıldı
	rank: {
		prio: 1, cd: 0.3, max: 1, dur: 1.0, len: 1.0, tail: 0.8, peak: 0.62, duck: [0.15, 0.4, 0.5],
		fn(e, t) {
			roll(e, t, 5, 0.05, 0.03, 0.15, 0.4);
			e.hit('dum', t + 0.22, 0.7, 1.05);
			arp(e, R, [4, 7, 9], t + 0.24, 0.1, 0.4);
			bell(e, t + 0.5, R(11), 0.3);
			e.hit('zil', t + 0.24, 0.16, 1.5);
		},
	},
	// çark: dönüş başlar (mandalları arayüz çalar, burada yalnızca fırlatma ve dönen gövde)
	wheel: {
		prio: 2, cd: 0.4, max: 1, dur: 3.4, len: 3.3, tail: 0.8, peak: 0.5, duck: [0.25, 2.2, 0.8],
		fn(e, t) {
			whoosh(e, t, 0.9, 0.2, 250, 1900, { a: 0.3 });
			e.hit('def', t + 0.02, 0.7, 0.9);
			e.hit('kos', t + 0.02, 0.4, 1.2);
			// dönen gövde: yavaşlayan alçak uğultu
			e.noise(t + 0.1, 3.1, 0.07, 420, 120, { q: 3, a: 0.4 });
			e.tone('sine', 150, 70, t + 0.1, 3.0, 0.05, { a: 0.3 });
			e.tone('triangle', 300, 140, t + 0.1, 2.8, 0.025, { a: 0.3 });
		},
	},
	// çarkta FETİH dilimi: kahraman vuruşu
	fetih: {
		prio: 3, cd: 0.5, max: 1, dur: 1.6, len: 1.7, tail: 1.0, peak: 0.88, wet: 1.5, duck: [0.45, 0.8, 0.8],
		fn(e, t) {
			impact(e, t, 1, true);
			e.hit('zil', t, 0.45, 1);
			zurna(e, t + 0.04, R(0), 0.14, 0.42);
			zurna(e, t + 0.2, R(4), 0.14, 0.44);
			zurna(e, t + 0.36, R(7), 0.8, 0.48, { bend: 60, bright: true });
			arp(e, R, [0, 2, 4, 7, 9, 11], t + 0.1, 0.05, 0.36);
			sparkle(e, t + 0.4, 0.1, 5, 1900);
		},
	},
	// düello girişinde iki yandan süzülüş
	whoosh: {
		prio: 1, cd: 0.2, max: 2, dur: 0.7, len: 0.7, tail: 0.4, peak: 0.5, vary: true,
		fn(e, t) {
			e.noise(t, 0.5, 0.2, 300, 3000, { q: 0.8, a: 0.3, pan: -0.7 });
			e.noise(t + 0.1, 0.5, 0.2, 3200, 400, { q: 0.8, a: 0.15, pan: 0.7 });
			e.tone('sine', 160, 60, t + 0.15, 0.4, 0.12, { a: 0.1 });
			e.hit('def', t + 0.32, 0.4, 0.9);
		},
	},
	// düello çarpışması (VS)
	vs: {
		prio: 3, cd: 0.4, max: 1, dur: 1.3, len: 1.4, tail: 1.0, peak: 0.9, wet: 1.3, duck: [0.4, 0.5, 0.7],
		fn(e, t) {
			impact(e, t, 1, true);
			e.hit('clang', t, 0.7, 1);
			e.hit('clang', t + 0.04, 0.5, 1.37, 0.4);
			e.hit('zil', t, 0.4, 1.1);
			whoosh(e, t, 0.5, 0.2, 5000, 400, { a: 0.01, pan: 0.3 });
			sparkle(e, t + 0.1, 0.08, 4, 1700);
		},
	},
	// joker: id'ye göre ayrı ses
	joker: {
		prio: 2, cd: 0.2, max: 1, dur: 1.2, len: 1.2, tail: 0.8, peak: 0.62, duck: [0.2, 0.3, 0.5],
		variant: (o) => ({ id: JOKER_IDS.indexOf(o.id) >= 0 ? o.id : 'yari' }),
		all: () => JOKER_IDS.map((id) => ({ id })),
		fn(e, t, o) {
			(JOKERS[o.id] || JOKERS.yari)(e, t);
		},
	},
	// sabotaj ulaştı (kurban tarafı): karanlık, çıtırtı, alçak düşüş
	sabotage: {
		prio: 3, cd: 0.5, max: 1, dur: 1.2, len: 1.2, tail: 0.8, peak: 0.78, duck: [0.35, 0.8, 0.8],
		fn(e, t) {
			e.tone('sawtooth', 170, 38, t, 0.6, 0.16, { a: 0.01, lp: 520 });
			e.noise(t, 0.5, 0.2, 3500, 300, { type: 'lowpass', a: 0.01 });
			for (let i = 0; i < 6; i++) e.hit('crack', t + 0.02 + i * 0.06 + e.r() * 0.04, 0.4, 0.5 + e.r() * 0.9, (e.r() - 0.5) * 1.4);
			e.hit('kos', t, 0.7, 0.8);
			e.hit('clang', t + 0.05, 0.3, 0.6);
			zurna(e, t + 0.15, H(1) * 0.5, 0.45, 0.28, { bend: 150 });
		},
	},
	// seviye atlandı
	levelup: {
		prio: 3, cd: 0.4, max: 1, dur: 1.9, len: 2.0, tail: 1.0, peak: 0.82, wet: 1.5, duck: [0.35, 1.0, 0.8],
		fn(e, t) {
			e.hit('zil', t, 0.35, 1);
			e.hit('dum', t, 0.7, 1.05);
			arp(e, R, [0, 2, 4, 7, 9, 11, 14], t + 0.02, 0.055, 0.38);
			zurna(e, t + 0.08, R(0), 0.14, 0.4);
			zurna(e, t + 0.24, R(4), 0.14, 0.42);
			zurna(e, t + 0.4, R(7), 0.9, 0.46, { bend: 50, bright: true });
			strings(e, t + 0.05, [R(0) * 0.5, R(4) * 0.5, R(7) * 0.5], 1.2, 0.16, { att: 0.3, rel: 0.7 });
			bell(e, t + 0.55, R(14), 0.3, -0.2);
			bell(e, t + 0.68, R(18), 0.26, 0.2);
			sparkle(e, t + 0.5, 0.09, 6, 2000);
		},
	},
	// ödül sayacı: hızlanan altın şıngırtısı ve son çınlama (sayaç ~0.9 sn sürer)
	coin: {
		prio: 2, cd: 0.3, max: 2, dur: 1.5, len: 1.5, tail: 0.8, peak: 0.55, vary: true,
		fn(e, t) {
			let tt = t;
			let gap = 0.1;
			for (let i = 0; i < 14 && tt < t + 0.9; i++) {
				const k = i / 13;
				e.hit('tink', tt, 0.22 + 0.2 * k, 0.9 + k * 0.7, (i % 2 ? 0.25 : -0.25));
				if (i % 3 === 0) e.hit('woodTap', tt, 0.12, 1.6);
				tt += gap;
				gap = Math.max(0.035, gap * 0.86);
			}
			const te = t + 0.92;
			e.hit('tink', te, 0.5, 1.7);
			e.hit('tink', te + 0.06, 0.45, 2.1);
			bell(e, te + 0.02, R(11), 0.34);
			sparkle(e, te + 0.05, 0.08, 4, 2300);
		},
	},
	// yıldız belirdi (sefer sonucu): her yıldız bir üst perde
	star: {
		prio: 2, cd: 0.1, max: 3, dur: 0.9, len: 0.9, tail: 0.8, peak: 0.58,
		variant: (o) => ({ n: clamp(o.n | 0, 0, 2) }),
		all: () => [0, 1, 2].map((n) => ({ n })),
		fn(e, t, o) {
			const n = clamp(o.n | 0, 0, 2);
			const d = [7, 9, 11][n];
			e.hit('pop', t, 0.5, 0.9 + n * 0.12);
			bell(e, t + 0.02, R(d), 0.42);
			bell(e, t + 0.04, R(d + 7), 0.2, 0.3);
			sparkle(e, t + 0.08, 0.07 + n * 0.02, 3 + n, 2000 + n * 200);
			if (n === 2) e.hit('zil', t + 0.05, 0.22, 1.5);
		},
	},

	// ---------------------------------------------------------------- bayrak (başlığa göre tür)
	banner: {
		prio: 2, cd: 0.2, max: 1, dur: 2.7, tail: 1.0, peak: 0.8, wet: 1.2, duck: [0.35, 0.5, 0.6],
		variant: (o) => ({ k: bannerKind(o.title) }),
		all: () => Object.values(BANNER_TITLES).map((title) => ({ title })),
		len: (o) => BANNER_LEN[o.k] || 1.4,
		fn(e, t, o) {
			(BANNERS[o.k] || BANNERS.default)(e, t);
		},
	},
	// patron girişi (doğrudan çağrı için)
	boss: {
		prio: 3, cd: 0.5, max: 1, dur: 2.7, len: 2.7, tail: 1.2, peak: 0.95, wet: 1.4, duck: [0.5, 1.4, 0.9],
		fn(e, t) {
			BANNERS.boss(e, t);
		},
	},

	// ---------------------------------------------------------------- harita ve savaş
	castle: {
		prio: 3, cd: 0.3, max: 1, dur: 1.5, len: 1.7, tail: 1.0, peak: 0.9, wet: 1.2, duck: [0.45, 0.7, 0.9],
		fn(e, t) {
			e.hit('dumBig', t, 1, 1);
			e.noise(t, 0.4, 0.3, 700, 200, { type: 'lowpass', a: 0.005 });
			for (let i = 0; i < 6; i++) e.hit('rock', t + 0.04 + i * 0.05 + e.r() * 0.03, 0.2, 0.7 + e.r() * 0.4, (e.r() - 0.5) * 0.7);
			zurna(e, t + 0.28, R(0), 0.16, 0.38);
			zurna(e, t + 0.46, R(4), 0.6, 0.4, { bend: 60 });
			e.hit('zil', t + 0.46, 0.3, 1);
		},
	},
	claim: {
		prio: 2, cd: 0.15, max: 2, dur: 0.7, len: 0.9, tail: 0.8, peak: 0.66, duck: [0.15, 0.15, 0.4],
		fn(e, t) {
			e.hit('woodLow', t, 0.7, 0.8);
			e.hit('dum', t, 0.62, 1.15);
			e.pluck('baglama', R(0), t + 0.03, 0.5);
			e.pluck('kanun', R(4), t + 0.09, 0.45);
			e.pluck('kanun', R(7), t + 0.15, 0.4);
			sparkle(e, t + 0.14, 0.08, 3, 2000);
		},
	},
	siege: {
		prio: 3, cd: 0.5, max: 1, dur: 2.6, len: 2.8, tail: 1.0, peak: 0.95, wet: 1.3, duck: [0.5, 1.6, 0.9],
		fn(e, t) {
			horn(e, t, 73.4, 1.3, 0.34, { open: 900 });
			roll(e, t + 0.1, 16, 0.12, 0.035, 0.14, 0.55, 0.9);
			e.hit('dum', t, 0.7, 0.9);
			e.hit('dum', t + 0.6, 0.6, 0.9);
			impact(e, t + 1.35, 1, true);
			e.hit('zil', t + 1.35, 0.5, 0.9);
			zurna(e, t + 1.4, H(0), 0.5, 0.38, { bend: 80 });
			zurna(e, t + 1.4, H(0) * 1.5, 0.5, 0.2);
		},
	},
	attack: {
		prio: 2, cd: 0.2, max: 1, dur: 1.0, len: 1.1, tail: 0.8, peak: 0.82, wet: 1.1, duck: [0.3, 0.4, 0.6],
		fn(e, t) {
			whoosh(e, t, 0.28, 0.26, 250, 2600, { a: 0.2 });
			e.hit('tek', t, 0.5, 1.1, -0.2);
			e.hit('tek', t + 0.07, 0.6, 1.2, 0.2);
			e.hit('dum', t + 0.15, 0.95, 1);
			e.hit('kos', t + 0.15, 0.4, 1.1);
			zurna(e, t + 0.15, R(0), 0.12, 0.38);
			zurna(e, t + 0.28, R(4), 0.4, 0.4, { bend: 70 });
		},
	},
	conquer: {
		prio: 3, cd: 0.3, max: 1, dur: 2.2, len: 2.3, tail: 1.2, peak: 0.95, wet: 1.6, duck: [0.5, 1.0, 0.9],
		fn(e, t) {
			impact(e, t, 1, true);
			e.hit('zil', t, 0.5, 1);
			e.hit('tek', t + 0.12, 0.5, 1.1);
			e.hit('tek', t + 0.18, 0.6, 1.1);
			zurna(e, t + 0.05, R(0), 0.2, 0.42);
			zurna(e, t + 0.28, R(4), 0.2, 0.42);
			zurna(e, t + 0.5, R(7), 0.9, 0.46, { bend: 60, bright: true });
			arp(e, (i) => R(i * 2 - 2), [0, 1, 2, 3, 4, 5, 6], t + 0.1, 0.05, 0.4);
			strings(e, t + 0.1, [R(0) * 0.5, R(4) * 0.5], 1.3, 0.14, { att: 0.25, rel: 0.7 });
			sparkle(e, t + 0.5, 0.1, 5, 1900);
		},
	},
	// kule: soft = mancınık taşı surlara çarptı; tam = kule yıkıldı
	tower: {
		prio: 3, cd: 0.25, max: 2, dur: 1.5, tail: 0.9, peak: 0.9, wet: 1.2, duck: [0.45, 0.5, 0.8],
		variant: (o) => ({ soft: !!o.soft }),
		all: () => [{ soft: true }, { soft: false }],
		len: (o) => (o.soft ? 0.7 : 1.8),
		fn(e, t, o) {
			if (o.soft) {
				e.hit('thud', t, 0.9, 1);
				e.hit('crack', t, 0.5, 0.9);
				for (let i = 0; i < 4; i++) e.hit('rock', t + 0.03 + i * 0.05 + e.r() * 0.03, 0.2, 0.7 + e.r() * 0.5, (e.r() - 0.5) * 0.8);
				e.noise(t, 0.35, 0.16, 800, 150, { type: 'lowpass', a: 0.004 });
				return;
			}
			impact(e, t, 1, true);
			e.hit('crack', t, 0.8, 0.8);
			e.hit('thud', t + 0.05, 0.9, 0.8);
			e.noise(t, 1.1, 0.34, 900, 100, { type: 'lowpass', a: 0.01 });
			for (let i = 0; i < 14; i++) e.hit('rock', t + 0.05 + i * 0.07 + e.r() * 0.05, 0.3 * (1 - i / 18), 0.55 + e.r() * 0.7, (e.r() - 0.5) * 0.9);
			e.hit('thud', t + 0.55, 0.5, 0.7);
		},
	},
	defend: {
		prio: 2, cd: 0.2, max: 1, dur: 1.0, len: 1.1, tail: 0.8, peak: 0.76, duck: [0.3, 0.3, 0.5],
		fn(e, t) {
			e.hit('clang', t, 0.8, 1);
			e.hit('dum', t, 0.8, 1.1);
			e.hit('woodLow', t + 0.02, 0.5, 0.8);
			e.pluck('baglama', R(4), t + 0.12, 0.4);
			e.pluck('baglama', R(7), t + 0.2, 0.4);
		},
	},
	// kalkan çalıştı
	shield: {
		prio: 2, cd: 0.3, max: 1, dur: 1.1, len: 1.1, tail: 0.8, peak: 0.72, duck: [0.2, 0.3, 0.5],
		fn(e, t) {
			BANNERS.shield(e, t);
		},
	},
	eliminate: {
		prio: 3, cd: 0.5, max: 1, dur: 2.8, len: 3.0, tail: 1.2, peak: 0.95, wet: 1.5, duck: [0.55, 1.6, 1.0],
		fn(e, t) {
			e.hit('dumBig', t, 1, 0.8);
			e.hit('kos', t, 0.6, 0.8);
			e.hit('dum', t + 0.55, 0.7, 0.75);
			e.hit('dum', t + 1.1, 0.6, 0.7);
			e.noise(t, 1.6, 0.26, 600, 70, { type: 'lowpass', a: 0.01 });
			ney(e, t + 0.15, H(4), 0.7, 0.4, { scoop: 50 });
			ney(e, t + 0.85, H(1), 0.7, 0.38, { scoop: 50 });
			ney(e, t + 1.55, H(0), 1.0, 0.36, { scoop: 50 });
			e.hit('rock', t + 0.05, 0.3, 0.6);
			choir(e, t + 0.3, [H(0) * 0.5, H(4) * 0.5], 2.0, 0.1, { att: 0.6, rel: 0.9, vowel: 'o' });
		},
	},
	// kale çöküşü (doğrudan çağrı için)
	crumble: {
		prio: 3, cd: 0.3, max: 1, dur: 2.3, len: 2.4, tail: 1.0, peak: 0.85, duck: [0.4, 1.0, 0.8],
		fn(e, t) {
			e.hit('dumBig', t, 0.85, 0.75);
			e.noise(t, 1.9, 0.5, 380, 70, { type: 'lowpass', a: 0.05 });
			scatter(e, t + 0.06, e.low ? 16 : 28, 1.7, 'rock', 0.28, 0.55, 1.45, 1.2);
			e.hit('thud', t + 0.4, 0.6, 0.7);
		},
	},
	// zafer çığlığı: kalabalık, el çırpma
	cheer: {
		prio: 1, cd: 0.4, max: 1, dur: 1.4, len: 1.4, tail: 0.8, peak: 0.5, wet: 1.2,
		fn(e, t) {
			e.noise(t, 1.2, 0.2, 900, 1500, { q: 0.7, a: 0.15 });
			e.noise(t + 0.05, 1.0, 0.14, 1900, 2600, { q: 0.8, a: 0.12 });
			scatter(e, t + 0.1, e.low ? 12 : 22, 1.0, 'rim', 0.22, 1.2, 2.2, 0.8, 1.0);
			e.hit('dum', t, 0.4, 1.1);
		},
	},

	// ---------------------------------------------------------------- sinematik geçişler
	// gece düşer: yıldızlar belirir
	nightFall: {
		prio: 2, cd: 0.6, max: 1, dur: 1.4, len: 1.4, tail: 1.2, peak: 0.6, wet: 1.8, duck: [0.2, 0.6, 0.7],
		fn(e, t) {
			e.noise(t, 1.1, 0.22, 3600, 250, { type: 'lowpass', q: 1.2, a: 0.4 });
			e.tone('sine', 130, 40, t, 1.2, 0.3, { a: 0.1 });
			choir(e, t + 0.1, [H(0) * 0.5, H(4) * 0.5], 1.1, 0.1, { att: 0.5, rel: 0.7, vowel: 'o' });
			bell(e, t + 0.45, 2600, 0.16, -0.5);
			bell(e, t + 0.6, 3300, 0.14, 0.5);
			bell(e, t + 0.78, 3900, 0.12, 0);
		},
	},
	// şafak: ufuk ısınır, sıcak yükseliş
	dawn: {
		prio: 2, cd: 0.6, max: 1, dur: 1.5, len: 1.5, tail: 1.2, peak: 0.55, wet: 1.8, duck: [0.15, 0.6, 0.7],
		fn(e, t) {
			e.noise(t, 1.2, 0.2, 400, 5200, { q: 0.7, a: 0.85 });
			strings(e, t, [R(0), R(4), R(7)], 1.0, 0.14, { att: 0.8, rel: 0.7, bright: 2600 });
			bell(e, t + 0.75, R(11), 0.22, -0.2);
			bell(e, t + 0.95, R(14), 0.2, 0.2);
			e.pluck('kanun', R(7), t + 0.9, 0.3);
		},
	},
	// sinematik şeritler: on = kapanır, değilse açılır
	letterbox: {
		prio: 1, cd: 0.3, max: 1, dur: 0.4, len: 0.45, tail: 0.5, peak: 0.34, wet: 1.0,
		variant: (o) => ({ on: o.on !== false }),
		all: () => [{ on: true }, { on: false }],
		fn(e, t, o) {
			if (o.on) {
				e.noise(t, 0.28, 0.14, 6000, 1500, { type: 'bandpass', q: 0.8, a: 0.1 });
				e.tone('sine', 300, 120, t, 0.25, 0.1, { a: 0.02 });
				e.hit('thud', t + 0.22, 0.3, 1.2);
			} else {
				e.noise(t, 0.25, 0.1, 1500, 6000, { type: 'bandpass', q: 0.8, a: 0.15 });
				e.hit('pop', t + 0.22, 0.2, 1.3);
			}
		},
	},
	// seçilebilir illere oklar belirir
	cue: {
		prio: 1, cd: 0.3, max: 1, dur: 0.6, len: 0.6, tail: 0.7, peak: 0.42,
		variant: (o) => ({ attack: !!o.attack }),
		all: () => [{ attack: true }, { attack: false }],
		fn(e, t, o) {
			const fn = o.attack ? H : R;
			whoosh(e, t, 0.3, 0.12, 400, 3200, { a: 0.2 });
			[4, 6, 7].forEach((d, i) => e.pluck(o.attack ? 'baglama' : 'kanun', fn(d), t + 0.06 + i * 0.075, 0.38 - i * 0.04, (i - 1) * 0.3));
			if (o.attack) e.hit('rim', t + 0.28, 0.3, 1.2);
			else bell(e, t + 0.3, fn(11), 0.18);
		},
	},
	// ok yağmuru
	arrows: {
		prio: 2, cd: 0.3, max: 2, dur: 1.2, len: 1.3, tail: 0.6, peak: 0.55,
		fn(e, t) {
			whoosh(e, t, 0.55, 0.2, 1500, 4800, { a: 0.3, q: 0.6 });
			for (let i = 0; i < 7; i++) {
				const at = t + 0.05 + e.r() * 0.35;
				e.tone('sine', 3200 + e.r() * 800, 1700, at, 0.26, 0.035, { a: 0.02, pan: (e.r() - 0.5) * 1.4 });
			}
			for (let i = 0; i < 7; i++) e.hit('woodTap', t + 0.5 + i * 0.05 + e.r() * 0.05, 0.22 - i * 0.015, 0.9 + e.r() * 0.4, (e.r() - 0.5) * 1.2);
		},
	},
	// mancınık: gıcırtı, fırlatma
	catapult: {
		prio: 2, cd: 0.4, max: 2, dur: 2.2, len: 1.9, tail: 0.8, peak: 0.72, duck: [0.25, 0.8, 0.6],
		fn(e, t) {
			e.tone('sawtooth', 70, 150, t, 0.5, 0.1, { a: 0.1, lp: 520 });
			e.noise(t, 0.5, 0.1, 380, 700, { q: 7, a: 0.2 });
			const tr = t + 0.55;
			e.hit('woodLow', tr, 1, 0.55);
			e.hit('dum', tr, 0.85, 0.9);
			e.hit('rim', tr, 0.4, 0.8);
			whoosh(e, tr, 0.75, 0.3, 500, 1100, { a: 0.3 });
		},
	},
	// ordu yürüyüşü: dur süresi kadar davul ve ayak sesleri
	march: {
		prio: 2, cd: 0.3, max: 1, dur: 2.2, tail: 0.6, peak: 0.6, duck: [0.18, 1.2, 0.6],
		variant: (o) => ({ dur: clamp(Math.round((o.dur || 1.2) * 10) / 10, 0.6, 3) }),
		all: () => [{ dur: 1.1 }, { dur: 1.2 }],
		len: (o) => o.dur + 0.3,
		fn(e, t, o) {
			const dur = o.dur || 1.2;
			const g = 0.2;
			const n = Math.floor(dur / g);
			for (let i = 0; i < n; i++) {
				const k = i / n;
				const tt = t + i * g;
				const v = 0.35 + 0.35 * k;
				if (i % 4 === 0) e.hit('dum', tt, v + 0.15, 0.95);
				else if (i % 4 === 2) e.hit('dum', tt, v, 1.1);
				else e.hit('tek', tt, v * 0.6, 1.0, i % 2 ? 0.2 : -0.2);
				if (i % 4 === 3) e.hit('tek', tt + g * 0.5, v * 0.4, 1.15);
				e.noise(tt, 0.1, 0.1 + 0.1 * k, 500, 120, { type: 'lowpass', a: 0.004, pan: i % 2 ? 0.3 : -0.3 });
			}
		},
	},
	// boya dalgası: il yeni sahibinin rengine yayılır
	paint: {
		prio: 2, cd: 0.3, max: 1, dur: 1.5, len: 1.5, tail: 1.0, peak: 0.52, wet: 1.5, duck: [0.1, 0.5, 0.5],
		fn(e, t) {
			e.tone('sine', 80, 44, t, 0.7, 0.2, { a: 0.02 });
			e.noise(t, 1.1, 0.16, 500, 4800, { q: 0.8, a: 0.8 });
			arp(e, R, [0, 2, 4, 7, 9, 11, 14, 16], t + 0.1, 0.07, 0.26);
			bell(e, t + 0.85, R(14), 0.3, 0.2);
			sparkle(e, t + 0.8, 0.07, 4, 2400);
		},
	},
	fireworks: {
		prio: 1, cd: 0.06, max: 4, dur: 1.9, len: 1.4, tail: 0.8, peak: 0.55, wet: 1.2, vary: true,
		fn(e, t, o) {
			const f0 = 520 + e.r() * 300;
			const pan = o.pan !== undefined ? o.pan : (e.r() - 0.5) * 1.4;
			e.tone('sine', f0, f0 * 3.4, t, 0.5, 0.07, { a: 0.1, pan, sweep: 1 });
			const tb = t + 0.52;
			e.hit('dum', tb, 0.5, 1.3 + e.r() * 0.3, pan);
			e.noise(tb, 0.6, 0.3, 4000, 1200, { type: 'highpass', a: 0.002, pan });
			for (let i = 0; i < 14; i++) e.hit('rim', tb + 0.04 + i * 0.045 + e.r() * 0.05, 0.1 + e.r() * 0.08, 1.8 + e.r() * 1.6, pan + (e.r() - 0.5) * 0.5);
			sparkle(e, tb + 0.05, 0.05, 3, 2600 + e.r() * 800);
		},
	},
	combo: {
		prio: 2, cd: 0.1, max: 2, dur: 0.8, len: 0.9, tail: 0.7, peak: 0.55,
		variant: (o) => ({ n: clamp(o.n | 0 || 1, 1, 8) }),
		all: () => [],
		fn(e, t, o) {
			const n = clamp(o.n | 0 || 1, 1, 8);
			const f = R(n * 2 - 1);
			e.tone('sine', f * 0.5, f * 2, t, 0.16, 0.16, { a: 0.01, sweep: 1 });
			e.pluck('kanun', f, t + 0.08, 0.5);
			e.pluck('kanun', f * 1.5, t + 0.13, 0.36);
			e.tone('sine', f * 4, 0, t + 0.12, 0.3, 0.1);
			e.hit('woodTap', t, 0.4, 1.5 + n * 0.05);
			if (n >= 3) e.hit('zil', t + 0.1, 0.22, 1.5);
		},
	},

	// ---------------------------------------------------------------- sonuç
	win: {
		prio: 3, cd: 1, max: 1, dur: 4.4, len: 4.3, tail: 1.4, peak: 0.95, wet: 1.6, duck: [0.6, 3.2, 1.2], music: ['victory', 2.6],
		fn(e, t) {
			const b = 0.2;
			impact(e, t, 1, true);
			e.hit('zil', t, 0.5, 1);
			// davul figürü
			[[1, 'tek'], [1.5, 'tek'], [2, 'dum'], [2.5, 'tek'], [3, 'dum'], [3.5, 'dum']].forEach(([x, n]) => e.hit(n, t + x * b, n === 'dum' ? 0.75 : 0.5, 1.05));
			roll(e, t + 4 * b, 10, 0.05, 0.03, 0.2, 0.55);
			// zurna cümlesi
			zurna(e, t + 0.05, R(0), b * 0.9, 0.44);
			zurna(e, t + b, R(2), b * 0.9, 0.44);
			zurna(e, t + 2 * b, R(4), b * 0.9, 0.46);
			zurna(e, t + 3 * b, R(7), 2.4, 0.5, { bend: 70, bright: true });
			zurna(e, t + 3 * b, R(4), 2.4, 0.22);
			// kanun yükselen arpej
			arp(e, (i) => R(i * 2 - 1), [0, 1, 2, 3, 4, 5, 6, 7], t + 0.5, 0.055, 0.38);
			// son vuruş
			impact(e, t + 1.5, 0.9, true);
			e.hit('zil', t + 1.5, 0.55, 0.9);
			[0, 2, 4, 7, 9].forEach((d, i) => e.pluck('kanun', R(d), t + 1.5 + i * 0.03, 0.4, -0.4 + i * 0.2));
			strings(e, t + 0.1, [R(0) * 0.5, R(4) * 0.5, R(7) * 0.5], 2.8, 0.17, { att: 0.5, rel: 1.2 });
			choir(e, t + 1.5, [R(0), R(4), R(7)], 2.0, 0.1, { att: 0.4, rel: 1.0, vowel: 'a' });
			sparkle(e, t + 1.6, 0.1, 6, 1800);
		},
	},
	lose: {
		prio: 3, cd: 1, max: 1, dur: 4.0, len: 4.0, tail: 1.4, peak: 0.9, wet: 1.8, duck: [0.55, 2.6, 1.2], music: ['defeat', 2.4],
		fn(e, t) {
			e.hit('dumBig', t, 0.8, 0.8);
			e.hit('kos', t, 0.6, 0.85);
			e.hit('dum', t + 1.1, 0.5, 0.75);
			e.tone('sine', 73.4, 70, t, 3.4, 0.2, { a: 0.5 });
			const seq = [[4, 0.0, 0.9], [3, 0.8, 0.8], [2, 1.5, 0.8], [1, 2.2, 0.9], [0, 2.9, 1.3]];
			for (const [d, at, du] of seq) ney(e, t + 0.15 + at * 0.8, U(d), du * 0.9, 0.38, { scoop: 60, release: 0.4 });
			e.pluck('baglama', U(0) * 0.5, t + 2.4, 0.5);
			strings(e, t + 0.2, [U(0) * 0.5, U(2) * 0.5, U(4) * 0.5], 3.0, 0.15, { att: 0.8, rel: 1.3 });
		},
	},
};

export const SOUND_NAMES = Object.keys(SOUNDS);
