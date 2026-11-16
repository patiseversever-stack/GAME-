/*
 * UZUNLUK SÖZLEŞMESİ (SORU-100K.md, Aşama 0.1): her soru tipinde ekranda görünen her metin alanının en çok karakter sayısı
 * ve bölünmeden yazılan en uzun kelime. Sınırı aşan soru maça giremez (test/sinir.test.mjs bütün bankayı tarar).
 *
 * Sınırlar "kanıtlanmış zarf"tır: ekran denetiminden (tools/denetim/cakisma.cjs, 320×568…1280×720, soru/joker/cevap)
 * geçmiş en uzun değerler; stres denetimi (tools/denetim/sinir_stres.mjs) bütün alanları aynı anda sınırda, geniş
 * harflerle doldurulmuş sahte sorularla bu zarfın birlikte de sığdığını ölçer. Sınır yükseltilecekse önce stres denetimi
 * yeni değerle temiz geçmeli.
 *
 * Alan adları (metinler(q) çıktısı):
 *   kok    soru kökü (q)                         sik    şık / öğe / eşleştirme yüzü / kart adı (kısa etiket)
 *   madde  uzun cümle maddesi (yıldırım, halat, iki doğru, yanlış bul cümlesi)
 *   not    cevaptan sonra görünen açıklama / bilgi satırı      ipucu  ipucu satırı (çengel, kelime avı, kimim, il avı)
 *   metin  atasözü cümlesi, şive cümlesi                        kelime harf harf yazılan kelime (adam asmaca, anagram, çengel)
 */

const L = (s) => [...String(s ?? '')].length;
const T = (s) => (typeof s === 'string' ? s : s == null ? '' : String(s));

/**
 * Sorunun ekranda görünen her metin alanını gezer: cb(alan, metin, ekle). `metin` ekranda görünen hali (işaretler
 * çıkarılmış: yanlış bul {…}, şive […]); `ekle(s)` ham alanın sonuna yazı ekler (stres denetimi sahte soruyu böyle
 * sınıra doldurur; işaretler bozulmaz). Okuyan (metinler) ve dolduran (tools/denetim/sinir_stres.mjs) aynı yolu kullanır.
 */
export function gez(q, cb) {
	const alanOf = (alan, o, k, goster = (x) => x) => {
		if (!o || o[k] == null || o[k] === '') return;
		cb(alan, goster(T(o[k])), (s) => (o[k] = T(o[k]) + s));
	};
	const liste = (alan, arr, k) => (Array.isArray(arr) ? arr : []).forEach((x, i) => (k == null ? alanOf(alan, arr, i) : alanOf(alan, x, k)));
	alanOf('kok', q, 'q');
	switch (q.type) {
		case 'choice':
		case 'riddle':
		case 'penalti':
		case 'kusbakisi':
		case 'golge':
		case 'kazi':
		case 'gozkarari':
		case 'kayip':
			liste('sik', q.a);
			break;
		case 'proverb':
			alanOf('metin', q, 'text');
			liste('sik', q.a);
			break;
		case 'hang':
		case 'anagram':
		case 'harfal':
			alanOf('kelime', q, 'w');
			break;
		case 'order':
			liste('sik', q.items, 't');
			break;
		case 'match':
			(q.pairs || []).forEach((p) => liste('sik', p));
			break;
		case 'hilo':
			alanOf('sik', q.left, 't');
			alanOf('sik', q.right, 't');
			break;
		case 'odd':
			liste('sik', q.opts);
			alanOf('not', q, 'why');
			break;
		case 'cross':
			liste('kelime', q.words, 'w');
			liste('ipucu', q.words, 'clue');
			break;
		case 'blitz':
		case 'halat':
			liste('madde', q.items, 't');
			break;
		case 'yanlis':
			alanOf('madde', q, 't', (s) => s.replace(/[{}]/g, ''));
			alanOf('sik', q, 'ok');
			liste('sik', q.alt);
			alanOf('not', q, 'n');
			break;
		case 'ikidogru':
			liste('madde', q.f, 't');
			liste('not', q.f, 'n');
			break;
		case 'azbilinen':
			liste('sik', q.ans, 0);
			liste('sik', q.wrong, 0);
			liste('not', q.wrong, 1);
			break;
		case 'balon':
			liste('sik', q.dogru);
			liste('sik', q.yanlis);
			alanOf('not', q, 'not');
			break;
		case 'mayin':
			alanOf('ipucu', q, 'mayin');
			alanOf('not', q, 'not');
			break;
		case 'rota':
			liste('sik', q.duraklar, 'not');
			break;
		case 'tunel':
			liste('sik', q.anchors, 0);
			liste('sik', q.cards, 0);
			break;
		case 'kelimeavi':
			liste('kelime', q.words, 0);
			liste('ipucu', q.words, 1);
			break;
		case 'kimim':
			liste('ipucu', q.clues);
			break;
		case 'ilavi':
			liste('ipucu', q.hints);
			break;
		case 'sive':
			alanOf('metin', q, 'say', (s) => s.replace(/[[\]]/g, ''));
			alanOf('not', q, 'note');
			break;
	}
	if (q.type === 'kayip') alanOf('ipucu', q, 'hint');
	if (q.type === 'golge' || q.type === 'kazi') alanOf('not', q, 'alt');
	if (q.type === 'gozkarari') alanOf('not', q, 'b');
}

/** Sorunun ekranda görünen metinleri: [[alan, metin], …]. Bilinmeyen tipte yalnız kök. */
export function metinler(q) {
	const out = [];
	gez(q, (alan, s) => out.push([alan, s]));
	return out;
}

/**
 * Tip → alan → en çok karakter; `uzunKelime`: bölünmeden yazılan en uzun kelime (kelime alanı hariç, o harf harf
 * dizilir). Değerler 2026-11-16 bankasının ekran denetiminden geçmiş en uzun değerleridir (tools/soru/sayim/).
 */
export const SINIR = {
	// SINIR_TABLOSU_BASLA (tools/denetim/sinir_olc.mjs --yaz bu bloğu yeniden yazar)
	anagram: { kok: 68, kelime: 13, uzunKelime: 17 },
	azbilinen: { kok: 63, sik: 24, not: 32, uzunKelime: 18 },
	balon: { kok: 60, sik: 26, not: 92, uzunKelime: 16 },
	blitz: { kok: 44, madde: 78, uzunKelime: 21 },
	choice: { kok: 109, sik: 32, uzunKelime: 20 },
	cross: { kok: 30, ipucu: 53, kelime: 11, uzunKelime: 17 },
	fitil: { kok: 44, uzunKelime: 14 },
	golge: { kok: 30, sik: 22, not: 48, uzunKelime: 16 },
	gozkarari: { kok: 106, sik: 28, not: 132, uzunKelime: 19 },
	halat: { kok: 30, madde: 70, uzunKelime: 22 },
	hang: { kok: 75, kelime: 14, uzunKelime: 17 },
	harfal: { kok: 87, kelime: 10, uzunKelime: 18 },
	hilo: { kok: 68, sik: 24, uzunKelime: 16 },
	ikidogru: { kok: 36, madde: 103, not: 158, uzunKelime: 21 },
	ilavi: { kok: 34, ipucu: 73, uzunKelime: 20 },
	kayip: { kok: 28, sik: 14, ipucu: 59, uzunKelime: 14 },
	kazi: { kok: 41, sik: 26, not: 48, uzunKelime: 16 },
	kelimeavi: { kok: 31, ipucu: 40, kelime: 9, uzunKelime: 17 },
	kimim: { kok: 36, ipucu: 98, uzunKelime: 22 },
	kusbakisi: { kok: 61, sik: 27, uzunKelime: 16 },
	mancinik: { kok: 80, uzunKelime: 18 },
	match: { kok: 49, sik: 34, uzunKelime: 18 },
	mayin: { kok: 48, not: 91, ipucu: 40, uzunKelime: 17 },
	num: { kok: 80, uzunKelime: 18 },
	odd: { kok: 60, sik: 23, not: 108, uzunKelime: 21 },
	order: { kok: 74, sik: 32, uzunKelime: 17 },
	penalti: { kok: 76, sik: 22, uzunKelime: 15 },
	pin: { kok: 65, uzunKelime: 16 },
	proverb: { kok: 18, sik: 11, metin: 62, uzunKelime: 12 },
	riddle: { kok: 111, sik: 18, uzunKelime: 16 },
	rota: { kok: 61, sik: 12, uzunKelime: 17 },
	sive: { kok: 22, not: 122, metin: 38, uzunKelime: 14 },
	tf: { kok: 88, uzunKelime: 22 },
	tufan: { kok: 72, uzunKelime: 13 },
	tunel: { kok: 33, sik: 30, uzunKelime: 18 },
	yanlis: { kok: 44, sik: 23, madde: 93, not: 159, uzunKelime: 19 },
	// SINIR_TABLOSU_BITIR
};

/** Sorunun sözleşmeyi aştığı yerler: [{ alan, uzunluk, sinir, metin }] (boşsa uyar). */
export function ihlaller(q) {
	const S = SINIR[q.type];
	if (!S) return [];
	const out = [];
	for (const [alan, s] of metinler(q)) {
		const n = L(s);
		if (S[alan] != null && n > S[alan]) out.push({ alan, uzunluk: n, sinir: S[alan], metin: s });
		if (alan !== 'kelime' && S.uzunKelime != null) {
			const w = Math.max(0, ...s.split(/[\s/–—-]+/).map(L));
			if (w > S.uzunKelime) out.push({ alan: alan + ' kelimesi', uzunluk: w, sinir: S.uzunKelime, metin: s });
		}
	}
	return out;
}
