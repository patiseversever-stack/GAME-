// ÖZEL ADA EK GETİRME (TDK Yazım Kılavuzu). Soru şablonları özel adlara, sayılara ve kısaltmalara hâl eki getirir:
// "{il}'de", "{yıl}'da doğan", "{kişi}'nin". Bağımlılıksız.
//   ek('Kars', 'de') → "Kars'ta"     ek('Ordu', 'in') → "Ordu'nun"     ek(1923, 'de') → "1923'te"
//   ek('TBMM', 'e') → "TBMM'ye"     ek('Kemal', 'e') → "Kemal'e"      ek('Kocaeli', 'de') → "Kocaeli'nde"
//
// Kurallar
//  - Ünlü uyumu: ekin ünlüsünü adın (okunuşunun) son ünlüsü belirler: kalın/ince, düz/yuvarlak.
//  - Ünsüz benzeşmesi: ad "fıstıkçı şahap" ünsüzlerinden (f s t k ç ş h p) biriyle bitiyorsa d → t (Kars'ta, Sinop'tan).
//  - Kaynaştırma: ünlüyle biten ada y ya da n gelir (Ordu'ya, Ordu'nun). 3. kişi iyelik ekiyle biten adlarda
//    bulunma, ayrılma, yönelme ve belirtme eklerinden önce n gelir (Kuşadası'nda, Ağrı Dağı'na, Kocaeli'nde; IYELIK).
//  - Özel adlarda ünsüz yumuşaması yapılmaz (Mehmet'e, Ahmet'in, Tokat'a).
//  - Sayılar okunuşlarının son kelimesine göre ek alır (1923'te: "üç"; 1000'de: "bin"; 3,5'te: "beş"; 15.30'da: "otuz").
//  - İnce okunan l ile biten alıntı adlar ince ek alır (Kemal'e, Celal'in; INCE_L).
//  - Okunuşu yazılışından ayrılan adlar okunuşa göre ek alır (TBMM'ye, NATO'nun, Bordeaux'ya; OKUNUS). Sözlükte
//    olmayan kısaltma ya da yabancı harfli ad için tahmin yürütülmez, hata verilir: secenek.okunus ile okunuş verin.
//  - Kesme işareti düz kesmedir ('), ek her zaman küçük harfle yazılır (TBMM'de).
//  - Yapım eki -lı (tur 'li') özel adlara bitişik yazılır (TDK: Ankaralı, İstanbullu); sayılarda, kısaltmalarda ve okunuşu
//    yazılışından ayrılan adlarda kesmeyle ayrılır (1980'li, ODTÜ'lü, Bordeaux'lu).
//  - Yalnız küçük harfli kelime cins ad sayılır, ek bitişik yazılır (ek('saat', 'de') → "saatte"); ünlüsüz küçük harfli
//    kısaltmalar (km, kg) kesmeyle ayrılır (km'ye). Cins adlarda yumuşama (kitap → kitaba) bilinemediği için p ç t k g
//    ile biten cins ada ünlüyle başlayan ek getirilmez, hata verilir.
//
// secenek: { okunus?: string, iyelik?: boolean, kesme?: boolean }
//   okunus  ekin seçildiği okunuş (yalnız son ünlü ve son ses kullanılır): ek('Gauguin', 'de', { okunus: 'gogen' })
//   iyelik  ad 3. kişi iyelik ekiyle bitiyor mu (sözlüğün önüne geçer): ek('Dünya Turu', 'de', { iyelik: true })
//   kesme   kesme işaretini zorla (true) ya da kaldır (false)

export const KESME = "'";
export const turkceKucuk = (s) => s.toLocaleLowerCase('tr-TR');

export const TURLER = ['de', 'den', 'e', 'i', 'in', 'le', 'li', 'deki'];

const KALIN = 'aıouâû'; // â ve û kalın sayılır: kâr → kârı, rüzgâr → rüzgârı
const INCE = 'eiöüî';
const UNLU = KALIN + INCE;
const YUVARLAK = 'oöuüû';
const SERT = 'fstkçşhp';
const TR_HARF = 'abcçdefgğhıijklmnoöprsştuüvyzâîû';

// ---------------------------------------------------------------- sözlükler (genişletilebilir)

/**
 * İnce okunan l ile biten alıntı kelimeler: kalın ünlülü olsalar da ince ek alırlar (Kemal'e, Hilal'in, kabulü).
 * Anahtarlar küçük harfle; düzeltme işareti yok sayılır (Kemâl = Kemal). Genişletmek için: INCE_L.add('neval').
 * Son ünlüsü zaten ince olanlar (Halil, İsrail) ekte değişiklik yapmaz; ince l'li oldukları için listede.
 */
export const INCE_L = new Set([
	// kişi ve yer adları
	'kemal', 'cemal', 'celal', 'bilal', 'hilal', 'nihal', 'ikbal', 'iclal', 'hayal', 'visal', 'halil', 'ismail', 'israil',
	// cins adlar (TDK: hâl, -li; kabul, -lü; rol, -lü …)
	'hal', 'kabul', 'rol', 'gol', 'alkol', 'petrol', 'kontrol', 'meşgul', 'ihtimal', 'istiklal', 'istikbal', 'misal', 'emsal',
	'sual', 'usul', 'mahsul', 'meçhul', 'ahval',
]);

/**
 * 3. kişi iyelik ekiyle biten adlar (birleşik yer adları ve tamlama başları): bulunma, ayrılma, yönelme ve belirtme
 * ekinden önce n gelir (Kocaeli'nde, Kuşadası'na, Ağrı Dağı'ndan, Topkapı Sarayı'nı). Çok kelimeli adlarda son kelimeye
 * bakılır. Anahtarlar küçük harfle. Genişletmek için: IYELIK.add('turu').
 */
export const IYELIK = new Set([
	// iller (Kocaeli = Koca ili, Kırklareli = Kırklar ili, Tunceli = Tunç ili)
	'kocaeli', 'kırklareli', 'tunceli',
	// ilçeler ve semtler
	'adapazarı', 'akdağmadeni', 'altınözü', 'bağlarbaşı', 'beşikdüzü', 'beylerbeyi', 'beylikdüzü', 'beyoğlu', 'beypazarı',
	'boğaziçi', 'conkbayırı', 'cumayeri', 'çarşıbaşı', 'çaybaşı', 'çiçekdağı', 'demirözü', 'dernekpazarı', 'derepazarı',
	'dilovası', 'döşemealtı', 'dulkadiroğlu', 'düziçi', 'ekinözü', 'eminönü', 'gölbaşı', 'gölpazarı', 'hamamözü', 'hanönü',
	'hisarönü', 'imamoğlu', 'ipekyolu', 'kadınhanı', 'kadışehri', 'kaleiçi', 'kemeraltı', 'konyaaltı', 'korkuteli', 'köprübaşı',
	'kubbealtı', 'kuşadası', 'marmaraereğlisi', 'mazıdağı', 'mecitözü', 'nurdağı', 'oğuzeli', 'okmeydanı', 'orhaneli',
	'osmaneli', 'otlukbeli', 'pazaryeri', 'pazaryolu', 'pınarbaşı', 'polateli', 'salıpazarı', 'sarayburnu', 'saraydüzü',
	'sarayiçi', 'sarayönü', 'sultandağı', 'sultanhanı', 'süloğlu', 'şabanözü', 'şalpazarı', 'türkeli', 'türkoğlu', 'yavuzeli',
	'yayladağı', 'yıldızeli', 'yusufeli', 'zeytinburnu', 'samanyolu', 'çinhindi',
	// tamlama başları (Ağrı Dağı, Van Gölü, Sakarya Savaşı, Topkapı Sarayı …)
	'abidesi', 'adası', 'adaları', 'akademisi', 'anıtı', 'anlaşması', 'antlaşması', 'anayasası', 'ayaklanması', 'bakanlığı',
	'barajı', 'bayramı', 'beyannamesi', 'beyliği', 'bildirgesi', 'birliği', 'bölgesi', 'boğazı', 'burnu', 'bulvarı', 'caddesi',
	'camii', 'cemiyeti', 'cephesi', 'cumhuriyeti', 'çağı', 'çarşısı', 'çayı', 'çölü', 'dağı', 'dağları', 'deltası', 'denizi',
	'destanı', 'devleti', 'devletleri', 'devri', 'devrimi', 'dönemi', 'efsanesi', 'ereğlisi', 'fermanı', 'festivali', 'galerisi',
	'gezegeni', 'geçidi', 'gölü', 'gölleri', 'günü', 'hamamı', 'hanı', 'hanlığı', 'harbi', 'harekâtı', 'havzası', 'heykeli',
	'hisarı', 'ihtilali', 'imparatorluğu', 'inkılabı', 'irmağı', 'ırmağı', 'isyanı', 'istasyonu', 'kalesi', 'kanalı', 'kanunu',
	'kanyonu', 'kapısı', 'katedrali', 'kilisesi', 'kongresi', 'konferansı', 'körfezi', 'köprüsü', 'krallığı', 'kulesi',
	'kupası', 'kuşatması', 'kutbu', 'kütüphanesi', 'külliyesi', 'ligi', 'limanı', 'mağarası', 'manastırı', 'marşı',
	'medresesi', 'meclisi', 'meydanı', 'muharebesi', 'müzesi', 'nehri', 'okulu', 'okyanusu', 'olimpiyatları', 'operası',
	'ormanı', 'ovası', 'oyunları', 'ödülü', 'ödülleri', 'parkı', 'partisi', 'platosu', 'sarayı', 'savaşı', 'savaşları',
	'seferi', 'seferleri', 'sultanlığı', 'surları', 'şampiyonası', 'şelalesi', 'tapınağı', 'tiyatrosu', 'türbesi', 'tüneli',
	'turnuvası', 'üniversitesi', 'vadisi', 'yaylası', 'yarımadası', 'yasası', 'yılı', 'yolu', 'zaferi', 'binası',
	'fuarı', 'grubu', 'harikası', 'havzası', 'kışlası', 'köşkü', 'kurumu', 'kuşağı', 'listesi', 'odası', 'olimpiyatı', 'ordusu',
	'pazarı', 'plajı', 'salonu', 'sistemi', 'sokağı', 'sözlüğü', 'şenliği', 'taşı', 'tepesi', 'topluluğu', 'yakası',
	'yazıtları', 'zirvesi',
]);

/**
 * Okunuşu yazılışından ayrılan adlar: ad → ekin seçildiği okunuş (son ünlü ve son ses). Kısaltmalar harflerin Türkçe
 * adlarıyla (TBMM: te-be-me-me), kelime gibi okunanlar kelime olarak (NATO) okunur. Genişletmek için:
 * OKUNUS['Seattle'] = 'siatıl'. Anahtar büyük-küçük harfe ve düzeltme işaretine duyarsızdır; çok kelimeli olabilir.
 */
export const OKUNUS = {
	// harf harf okunan kısaltmalar
	AB: 'abe', ABD: 'abede', AİHM: 'aiheme', AVM: 'aveme', BAE: 'beae', BBC: 'bebece', BM: 'beme', DNA: 'denea', DSİ: 'desei',
	İETT: 'ietete', KKTC: 'keketece', MTA: 'metea', NBA: 'nebea', OECD: 'oecede', ÖSYM: 'öseyeme', PTT: 'petete',
	SSCB: 'sesecebe', TBMM: 'tebememe', TC: 'tece', TCDD: 'tecedede', TDK: 'tedeke', TFF: 'tefefe', THY: 'teheye',
	TRT: 'terete', TSK: 'teseke', TTK: 'teteke', TV: 'teve',
	// kelime gibi okunan kısaltmalar
	ASELSAN: 'aselsan', BOTAŞ: 'botaş', CERN: 'sern', EXPO: 'ekspo', FIBA: 'fiba', FIFA: 'fifa', İSKİ: 'iski', İTÜ: 'itü',
	NASA: 'nasa', NATO: 'nato', ODTÜ: 'odtü', OPEC: 'opek', TEKNOFEST: 'teknofest', TOGG: 'tog', TOKİ: 'toki',
	TÜBİTAK: 'tübitak', TÜİK: 'tüik', UEFA: 'uefa', UFO: 'ufo', UNESCO: 'yunesko', UNICEF: 'yunisef', YÖK: 'yök',
	// yabancı adlar
	Bach: 'bah', Bordeaux: 'bordo', Broadway: 'brodvey', Cambridge: 'keymbric', Camus: 'kamü', Cannes: 'kan',
	Cézanne: 'sezan', Chelsea: 'çelsi', Chopin: 'şopen', Dalí: 'dali', Darwin: 'darvin', Debussy: 'dübüsi', Degas: 'döga',
	Descartes: 'dekart', Dickens: 'dikıns', Dumas: 'düma', Einstein: 'aynştayn', Freud: 'froyd', Gaudí: 'gaudi', Goethe: 'göte',
	Google: 'gugıl', Hemingway: 'hemingvey', Hollywood: 'holivud', Jackson: 'ceksın',
	Liverpool: 'livırpul', Louvre: 'luvr', 'Los Angeles': 'losencılıs', Manchester: 'mençestır', Marseille: 'marsey',
	Michigan: 'mişigın', Molière: 'molyer', Monet: 'mone', Netflix: 'netfliks', Newton: 'nivton', Nice: 'nis', Ottawa: 'otava',
	Pelé: 'pele', Renoir: 'rönuar', Rousseau: 'ruso', Seine: 'sen', Shakespeare: 'şekspir', Strasbourg: 'strazbur',
	Toulouse: 'tuluz', Twitter: 'tivitır', Verne: 'vern', Versailles: 'versay', Voltaire: 'volter', Wagner: 'vagner',
	'Wall Street': 'volstrit', Washington: 'vaşingtın', Wellington: 'velingtın', Wimbledon: 'vimbıldın', YouTube: 'yutub',
	Zidane: 'zidan', Loire: 'luar',
	// ölçü birimi kısaltmaları (TDK: km'ye, kg'dan)
	km: 'kilometre', cm: 'santimetre', mm: 'milimetre', m: 'metre', kg: 'kilogram', mg: 'miligram', ml: 'mililitre',
	// yazılışına göre değil okunuşuna göre ek alan cins adlar (son hece ince okunur; TDK: saat, -ti; harf, -fi)
	saat: 'saet', dikkat: 'dikket', hakikat: 'hakiket', seyahat: 'seyahet', sıhhat: 'sıhhet', harf: 'herf',
};

// ---------------------------------------------------------------- yardımcılar

const HARF_ADI = {
	a: 'a', b: 'be', c: 'ce', ç: 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', ğ: 'yumuşakge', h: 'he', ı: 'ı', i: 'i', j: 'je',
	k: 'ke', l: 'le', m: 'me', n: 'ne', o: 'o', ö: 'ö', p: 'pe', r: 're', s: 'se', ş: 'şe', t: 'te', u: 'u', ü: 'ü', v: 've',
	y: 'ye', z: 'ze', q: 'kü', w: 'çiftve', x: 'iks',
};

/** Kısaltmanın harf harf (Türkçe harf adlarıyla) okunuşu: harfleOku('TBMM') → "tebememe". */
export function harfleOku(kisaltma) {
	return [...turkceKucuk(String(kisaltma))]
		.map((h) => HARF_ADI[h] || '')
		.join('');
}

// sözlük anahtarı: Türkçe küçük harf, NFC, düzeltme işareti yok, kesme tek biçim
const anahtar = (s) =>
	turkceKucuk(String(s).normalize('NFC'))
		.replace(/[’‘ʼ`´]/g, "'")
		.replace(/â/g, 'a')
		.replace(/î/g, 'i')
		.replace(/û/g, 'u');

// sözlük dizini: anahtar → özgün anahtar; sözlük büyüdükçe/küçüldükçe yeniden kurulur
const DIZIN = new WeakMap();
function dizin(sozluk) {
	const boy = sozluk instanceof Set ? sozluk.size : Object.keys(sozluk).length;
	let d = DIZIN.get(sozluk);
	if (!d || d.boy !== boy) {
		const m = new Map();
		for (const k of sozluk instanceof Set ? sozluk : Object.keys(sozluk)) m.set(anahtar(k), k);
		DIZIN.set(sozluk, (d = { boy, m }));
	}
	return d.m;
}
const setteMi = (set, s) => dizin(set).has(anahtar(s));
// büyük-küçük harfe duyarsız arama; yalnız küçük harfli ad (cins ad: "nice yıllar") büyük harfli girdiyle (Nice) eşleşmez
function sozlukte(sozluk, s) {
	if (Object.hasOwn(sozluk, s)) return sozluk[s];
	const k = dizin(sozluk).get(anahtar(s));
	if (k === undefined || !Object.hasOwn(sozluk, k)) return undefined;
	return !/\p{Lu}/u.test(s) && /\p{Lu}/u.test(k) ? undefined : sozluk[k];
}

// ---------------------------------------------------------------- sayılar

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const BUYUK = ['bin', 'milyon', 'milyar', 'trilyon', 'katrilyon', 'kentilyon'];

/** Rakam dizisinin okunuşundaki son kelime: "1923" → "üç", "1000" → "bin", "0" → "sıfır". */
export function sayiSonKelime(rakamlar) {
	const s = String(rakamlar).replace(/^0+/, '');
	if (!/^\d*$/.test(s)) throw new Error(`ek: "${rakamlar}" rakam dizisi değil`);
	if (!s) return 'sıfır';
	const n = s.length;
	const b = +s[n - 1];
	const o = n >= 2 ? +s[n - 2] : 0;
	const y = n >= 3 ? +s[n - 3] : 0;
	if (b) return BIRLER[b];
	if (o) return ONLAR[o];
	if (y) return 'yüz';
	for (let g = 1; g * 3 < n; g++) {
		if (+s.slice(Math.max(0, n - 3 * (g + 1)), n - 3 * g)) {
			if (g > BUYUK.length) break;
			return BUYUK[g - 1];
		}
	}
	throw new Error(`ek: "${rakamlar}" okunamayacak kadar büyük`);
}

/**
 * Sayı yazılışının ek alan son kelimesi; sayı değilse null. Desteklenenler: 1923, 1.000 ve 1.000.000 (nokta binlik
 * ayracı; ince boşluk/bölünmez boşluk da olur), 3,5 (virgül ondalık), 1.000,25, %50, -5, 15.30 ve 15:30 (saat), A4 / MP3
 * (harften sonra rakam). Desteklenmeyen biçimlerde (1.5, 19., 4G) hata verir.
 */
function sayiOkunusu(t) {
	if (!/^[-−+]?%?\d/.test(t) && !/^\p{L}+\d+$/u.test(t)) return null;
	let m = /^\p{L}+(\d+)$/u.exec(t);
	if (m) return sayiSonKelime(m[1]);
	m = /^(\d{1,2})[.:](\d{2})$/.exec(t);
	if (m) {
		if (+m[1] > 24 || +m[2] > 59) throw new Error(`ek: "${t}" saat değil; binlik ayracı üç basamaklı olmalı`);
		return sayiSonKelime(+m[2] ? m[2] : m[1]);
	}
	m = /^[-−+]?%?(\d{1,3}(?:[.\u00A0\u202F]\d{3})+|\d+)(?:,(\d+))?$/.exec(t);
	if (!m) {
		if (/^\d+\.$/.test(t)) throw new Error(`ek: sıra sayısı "${t}" desteklenmiyor (TDK: 19. yüzyılda; ek getirilmez)`);
		throw new Error(`ek: "${t}" sayı biçimi desteklenmiyor (binlik ayracı nokta, ondalık ayracı virgül)`);
	}
	return m[2] !== undefined ? sayiSonKelime(m[2]) : sayiSonKelime(m[1].replace(/\D/g, ''));
}

// ---------------------------------------------------------------- ses bilgisi

/**
 * Adın ek seçiminde kullanılan ses bilgisi.
 * @returns {{ ad: string, son: string, okunus: string, kaynak: 'secenek'|'okunus'|'sayi'|'harf'|'yazilis', ozel: boolean,
 *   inceL: boolean, iyelik: boolean, kalin: boolean, yuvarlak: boolean, unlu: boolean, sert: boolean, sonSes: string }}
 */
export function sesBilgisi(ad, secenek = {}) {
	let s = typeof ad === 'number' ? (Number.isInteger(ad) ? String(ad) : String(ad).replace('.', ',')) : ad;
	if (typeof s !== 'string' || !s.trim()) throw new TypeError('ek: ad boş ya da metin değil');
	s = s.trim().normalize('NFC');
	const toks = [...s.matchAll(/[^ \t\r\n-]+/g)];
	if (!toks.length) throw new Error(`ek: "${s}" içinde ad yok`);
	const son = toks[toks.length - 1][0];
	if (/^\d+\.$/.test(son)) throw new Error(`ek: sıra sayısı "${son}" desteklenmiyor (TDK: 19. yüzyılda; ek getirilmez)`);
	if (!/[\p{L}\p{N}]$/u.test(son)) throw new Error(`ek: "${s}" harf ya da rakamla bitmiyor`);
	// cins ad (ek bitişik): yalnız küçük harfli ve ünlülü kelime; büyük harf, rakam ya da işaret içeren ad (d'Orsay, 1923,
	// %50) ve ünlüsüz küçük harfli kısaltma (km, kg) özel sayılır (ek kesmeyle)
	const ozel = !/^[\p{Ll}'’]+$/u.test(son) || !/[aeıioöuüâîû]/u.test(son);
	const b = { ad: s, son, okunus: null, kaynak: null, ozel, inceL: false, iyelik: false };

	if (secenek.okunus != null) {
		b.okunus = String(secenek.okunus);
		b.kaynak = 'secenek';
	} else {
		// en uzun eşleşme önce: "Los Angeles", sonra "Angeles"
		for (let i = Math.max(0, toks.length - 3); i < toks.length && b.okunus == null; i++) {
			const v = sozlukte(OKUNUS, s.slice(toks[i].index));
			if (v != null) (b.okunus = String(v)), (b.kaynak = 'okunus');
		}
	}
	if (b.okunus == null) {
		const sayi = sayiOkunusu(son);
		if (sayi) (b.okunus = sayi), (b.kaynak = 'sayi');
	}
	if (b.okunus == null) {
		const harfler = [...son].filter((h) => /\p{L}/u.test(h));
		if (/\d/.test(son)) throw new Error(`ek: "${son}" (harf ve rakam karışık) okunuşu bilinmiyor; secenek.okunus ile okunuş verin`);
		const yabanci = harfler.filter((h) => !TR_HARF.includes(turkceKucuk(h)));
		if (harfler.length === 1 && /\p{Lu}/u.test(harfler[0])) {
			b.okunus = harfleOku(harfler[0]);
			b.kaynak = 'harf';
		} else if (harfler.every((h) => /\p{Lu}/u.test(h))) {
			throw new Error(
				`ek: "${son}" kısaltmasının okunuşu bilinmiyor (harf harf mi, kelime gibi mi?); OKUNUS'a ekleyin ya da ` +
					`secenek.okunus ile okunuş verin (ör. harfleOku('${son}') → "${harfleOku(son)}")`,
			);
		} else if (yabanci.length) {
			throw new Error(
				`ek: "${son}" Türk abecesinde olmayan harf içeriyor (${yabanci.join('')}); okunuşu bilinmiyor: OKUNUS'a ekleyin ` +
					`ya da secenek.okunus ile okunuş verin`,
			);
		} else if (/\p{Ll}\p{Lu}/u.test(son)) {
			throw new Error(`ek: "${son}" içinde büyük harf var (yabancı ad?); okunuşu bilinmiyor: OKUNUS'a ekleyin ya da secenek.okunus verin`);
		} else {
			b.okunus = harfler.join('');
			b.kaynak = 'yazilis';
			b.inceL = setteMi(INCE_L, son.replace(/['’]/g, ''));
		}
	}
	if (b.kaynak !== 'sayi' && b.kaynak !== 'harf') b.iyelik = secenek.iyelik ?? setteMi(IYELIK, son.replace(/['’]/g, ''));

	const o = [...anahtar(b.okunus)].filter((h) => /\p{L}/u.test(h));
	const sonUnlu = o.findLast((h) => UNLU.includes(h));
	if (!sonUnlu) throw new Error(`ek: "${b.okunus}" okunuşunda ünlü yok`);
	b.sonSes = o[o.length - 1];
	b.kalin = KALIN.includes(sonUnlu) && !b.inceL;
	b.yuvarlak = YUVARLAK.includes(sonUnlu);
	b.unlu = UNLU.includes(b.sonSes);
	b.sert = SERT.includes(b.sonSes);
	if (b.iyelik && !'ıiuü'.includes(b.sonSes)) throw new Error(`ek: "${s}" iyelik ekiyle bitmiyor (son ses "${b.sonSes}")`);
	return b;
}

// ---------------------------------------------------------------- ekler

const A = (b) => (b.kalin ? 'a' : 'e');
const I = (b) => (b.kalin ? (b.yuvarlak ? 'u' : 'ı') : b.yuvarlak ? 'ü' : 'i');
const D = (b) => (b.sert ? 't' : 'd');
const bulunma = (b) => (b.iyelik ? 'nd' : D(b)) + A(b);
const KURAL = {
	de: bulunma,
	den: (b) => bulunma(b) + 'n',
	deki: (b) => bulunma(b) + 'ki',
	e: (b) => (b.iyelik ? 'n' : b.unlu ? 'y' : '') + A(b),
	i: (b) => (b.iyelik ? 'n' : b.unlu ? 'y' : '') + I(b),
	in: (b) => (b.unlu ? 'n' : '') + I(b) + 'n',
	le: (b) => (b.unlu ? 'y' : '') + 'l' + A(b),
	li: (b) => 'l' + I(b),
};

/**
 * Ada kesme işaretiyle eki getirir. ek('Kars', 'de') → "Kars'ta".
 * @param {string|number} ad özel ad, sayı ya da kısaltma (çok kelimeli olabilir: son kelime belirler)
 * @param {'de'|'den'|'e'|'i'|'in'|'le'|'li'|'deki'} tur
 * @param {{ okunus?: string, iyelik?: boolean, kesme?: boolean }} [secenek]
 */
export function ek(ad, tur, secenek = {}) {
	const kural = KURAL[tur];
	if (!kural) throw new Error(`ek: bilinmeyen ek türü "${tur}" (${TURLER.join(', ')})`);
	const b = sesBilgisi(ad, secenek);
	if (!b.ozel && b.kaynak === 'yazilis' && !b.unlu && 'pçtkg'.includes(b.sonSes) && (tur === 'e' || tur === 'i' || tur === 'in'))
		throw new Error(`ek: "${b.son}" cins adında ünsüz yumuşaması (kitap → kitaba) bilinmiyor; ek getirilmedi`);
	const kesme = secenek.kesme ?? (tur === 'li' ? b.ozel && b.kaynak !== 'yazilis' : b.ozel);
	return b.ad + (kesme ? KESME : '') + kural(b);
}

/**
 * Büyük ünlü uyumuna aykırı kelime var mı (yalnız bilgi amaçlı: alıntı ya da birleşik kelime işareti; ek seçimini
 * etkilemez); çok kelimeli adda her kelimeye bakılır. ekYok('Ankara') → false, ekYok('Kemal') → true,
 * ekYok('Yavuz Selim') → false.
 */
export function ekYok(ad) {
	return String(ad)
		.split(/[^\p{L}]+/u)
		.some((w) => {
			const u = [...anahtar(w)].filter((h) => UNLU.includes(h));
			return u.some((h) => KALIN.includes(h)) && u.some((h) => INCE.includes(h));
		});
}
