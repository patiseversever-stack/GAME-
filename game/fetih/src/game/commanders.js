// Komutanlar: kostümler, sancaklar ve yüzler. Yalnızca veri ve küçük yardımcılar (sahne yok).
//
// Kostüm = komutanın kıyafeti. Tarihten esinlenen (Göktürk, Selçuklu, Osmanlı, Kurtuluş dönemi, halk)
// ve eğlenceli (futbolcu, astronot, aşçı, öğretmen…) kostümler karışık. Gerçek kişi ya da telifli
// karakter yok; hepsi genel meslek ve dönem tasarımlarıdır.
//
// Çizim: arayüz ve sinema `look` alanından komutanı çizer (SVG ya da küçük 3B kukla).
//   look = { hat, outfit, cape, prop, c1, c2, c3 }
//     hat    : başlık/başlık türü anahtarı (kalpak, tug, sorguc, kavuk, fes, kask, toka, sef, mezun, korsan…)
//     outfit : gövde anahtarı (zirh, kaftan, cepken, forma, takim, onluk…)
//     cape   : pelerin/atkı rengi ya da null
//     prop   : eldeki nesne (kilic, yay, bayrak, top, kepce, kitap, telsiz…)
//     c1, c2 : ana ve ikincil renk; c3 vurgu (altın, gümüş…)
// Çizimde bulunamayan anahtar için çizici varsayılana düşmelidir.
//
// Açılış (`unlock`) = eşyayı almak için gereken koşul. `price` = koşul sağlanınca altın bedeli.
//   { free: true }              baştan açık, bedava
//   { level: n }                n. seviyeden sonra mağazada satılır
//   { stars: n }                seferde toplam n yıldız olunca mağazada satılır
//   { shop: true }              her zaman mağazada satılır
//   { campaign: 'ege' }         ÖDÜL: o bölgenin komutanı yenilince otomatik verilir (satılmaz)
//   { daily: gün }              ÖDÜL: günlük ödül serisinin o gününde verilir (satılmaz)
// `price` null ise satılmaz. Fiyatlı kampanya/günlük eşyada fiyat yalnızca "değer" göstergesidir.

export const RARITY = {
	common: { name: 'Yaygın', color: '#8fb0d6', rank: 0 },
	rare: { name: 'Nadir', color: '#4aa3ff', rank: 1 },
	epic: { name: 'Destansı', color: '#b36bff', rank: 2 },
	legendary: { name: 'Efsanevi', color: '#ffb52e', rank: 3 },
};

export const ERAS = {
	gokturk: 'Göktürk',
	selcuklu: 'Selçuklu',
	osmanli: 'Osmanlı',
	kurtulus: 'Kurtuluş',
	halk: 'Anadolu',
	eglence: 'Eğlence',
};

const C = (id, name, era, rarity, price, unlock, look, blurb) => ({ id, kind: 'costume', name, era, rarity, price, unlock, look, blurb });

export const COSTUMES = [
	// --- baştan açık
	C('acemi', 'Acemi Komutan', 'halk', 'common', null, { free: true }, { hat: 'kalpak', outfit: 'cepken', cape: null, prop: 'kilic', c1: '#c0553c', c2: '#f2d9a8', c3: '#ffd25a' }, 'Her büyük sefer bir adımla başlar.'),
	C('futbolcu', 'Kramponlu Komutan', 'eglence', 'common', null, { free: true }, { hat: null, outfit: 'forma', cape: null, prop: 'top', c1: '#e63946', c2: '#ffd25a', c3: '#ffffff' }, 'Sahada da haritada da oyun kurar.'),

	// --- Göktürk
	C('gokturk_okcu', 'Bozkır Okçusu', 'gokturk', 'common', 300, { level: 3 }, { hat: 'kalpak', outfit: 'zirh', cape: '#3a6ea5', prop: 'yay', c1: '#5b7fa8', c2: '#d9c7a0', c3: '#c9d6e4' }, 'Atı gibi hızlı, oku gibi isabetli.'),
	C('gokturk_kagan', 'Kök Kağan', 'gokturk', 'epic', 1800, { campaign: 'icanadolu' }, { hat: 'tug', outfit: 'zirh', cape: '#2e6fd1', prop: 'bayrak', c1: '#2e6fd1', c2: '#f4e3b5', c3: '#ffd25a' }, 'Mavi gökün altında tek bayrak.'),

	// --- Selçuklu
	C('selcuklu_sipahi', 'Selçuklu Sipahisi', 'selcuklu', 'rare', 700, { level: 6 }, { hat: 'sorguc', outfit: 'kaftan', cape: '#1f8a8a', prop: 'kilic', c1: '#1f8a8a', c2: '#e6d3a3', c3: '#d8b24a' }, 'Firuze kaftan, keskin kılıç.'),
	C('selcuklu_emir', 'Selçuklu Emiri', 'selcuklu', 'epic', 1500, { campaign: 'akdeniz' }, { hat: 'sorguc', outfit: 'kaftan', cape: '#7b2fa8', prop: 'bayrak', c1: '#7b2fa8', c2: '#f1e2b8', c3: '#ffd25a' }, 'Kervansaraydan kaleye.'),

	// --- Osmanlı
	C('osmanli_akinci', 'Akıncı Beyi', 'osmanli', 'rare', 800, { level: 9 }, { hat: 'kavuk', outfit: 'cepken', cape: '#b3262e', prop: 'kilic', c1: '#b3262e', c2: '#e8d4a2', c3: '#ffb52e' }, 'Önce o varır, sonra ordu.'),
	C('osmanli_yeniceri', 'Yeniçeri', 'osmanli', 'rare', 1000, { level: 12 }, { hat: 'sorguc', outfit: 'kaftan', cape: '#2a4fa0', prop: 'kepce', c1: '#2a4fa0', c2: '#f2e6c9', c3: '#e8c14a' }, 'Kazan ters dönse de saf bozulmaz.'),
	C('osmanli_kaptan', 'Kaptan-ı Derya', 'osmanli', 'epic', 2200, { stars: 40 }, { hat: 'kavuk', outfit: 'kaftan', cape: '#143d6b', prop: 'telsiz', c1: '#143d6b', c2: '#f0e0b0', c3: '#ffd25a' }, 'Üç denizin kaptanı.'),
	C('osmanli_sultan', 'Fetih Sultanı', 'osmanli', 'legendary', 5000, { stars: 70 }, { hat: 'kavuk', outfit: 'kaftan', cape: '#8e1b2e', prop: 'bayrak', c1: '#8e1b2e', c2: '#f7e7b9', c3: '#ffcc3d' }, 'Surlar yüksek, hedef daha yüksek.'),

	// --- Kurtuluş dönemi
	C('kurtulus_gonullu', 'Kalpaklı Gönüllü', 'kurtulus', 'common', 400, { level: 4 }, { hat: 'kalpak', outfit: 'onluk', cape: null, prop: 'bayrak', c1: '#6f7d4a', c2: '#d8cfae', c3: '#c0392b' }, 'Cepheye giden her yürek bir kahraman.'),
	C('kurtulus_subay', 'Kurtuluş Subayı', 'kurtulus', 'epic', 2000, { campaign: 'karadeniz' }, { hat: 'kalpak', outfit: 'onluk', cape: '#4a5a33', prop: 'telsiz', c1: '#4a5a33', c2: '#cfc6a0', c3: '#d4b04a' }, 'Plan sağlam, kararlılık daha sağlam.'),
	C('zeybek', 'Ege Zeybeği', 'halk', 'rare', 900, { campaign: 'ege' }, { hat: 'fes', outfit: 'cepken', cape: '#c63f2c', prop: 'kilic', c1: '#c63f2c', c2: '#f1e0b4', c3: '#2b2b2b' }, 'Zeybek ayağa kalktı mı dağlar dinler.'),

	// --- eğlenceli
	C('astronot', 'Astronot Komutan', 'eglence', 'rare', 900, { level: 8 }, { hat: 'kask', outfit: 'takim', cape: null, prop: 'telsiz', c1: '#e9eef5', c2: '#ff8a1f', c3: '#4aa3ff' }, 'Haritanın dışından bile fethederim.'),
	C('asci', 'Şef Komutan', 'eglence', 'common', 350, { level: 5 }, { hat: 'sef', outfit: 'onluk', cape: null, prop: 'kepce', c1: '#f4f4f4', c2: '#c0392b', c3: '#ffd25a' }, 'Tarif basit: bilgi, hız, biraz tuz.'),
	C('ogretmen', 'Öğretmen Komutan', 'eglence', 'common', 350, { level: 7 }, { hat: null, outfit: 'takim', cape: null, prop: 'kitap', c1: '#3d5a80', c2: '#e0e6ee', c3: '#ffd25a' }, 'Soru sorma sırası bende.'),
	C('korsan', 'Korsan Kaptan', 'eglence', 'rare', 800, { level: 10 }, { hat: 'korsan', outfit: 'cepken', cape: '#2b2b2b', prop: 'kilic', c1: '#2b2b2b', c2: '#c0392b', c3: '#ffd25a' }, 'Hazine haritası elimde.'),
	C('ninja', 'Gölge Komutan', 'eglence', 'epic', 1600, { level: 18 }, { hat: 'kask', outfit: 'takim', cape: '#222222', prop: 'kilic', c1: '#1c1c28', c2: '#7b2fa8', c3: '#ff4d6d' }, 'Gelir, bilir, fetheder; kimse görmez.'),
	C('simitci', 'Simitçi Usta', 'eglence', 'common', 300, { level: 2 }, { hat: 'fes', outfit: 'onluk', cape: null, prop: 'kepce', c1: '#c98a3c', c2: '#f7e7b9', c3: '#7b3f1e' }, 'Susam kadar şanslı.'),
	C('dino', 'Dino Pijama', 'eglence', 'rare', 700, { shop: true }, { hat: 'toka', outfit: 'takim', cape: null, prop: 'top', c1: '#4cb86b', c2: '#f7e7b9', c3: '#ffd25a' }, 'Pati sesleri duyuluyor.'),
	C('robot', 'Çelik Komutan', 'eglence', 'epic', 1700, { shop: true }, { hat: 'kask', outfit: 'zirh', cape: null, prop: 'telsiz', c1: '#8a9bb0', c2: '#4aa3ff', c3: '#ffd25a' }, 'Bip bip: tüm iller hesaplandı.'),
	C('mezun', 'Birinci Öğrenci', 'eglence', 'common', 400, { level: 14 }, { hat: 'mezun', outfit: 'takim', cape: '#23395d', prop: 'kitap', c1: '#23395d', c2: '#e0e6ee', c3: '#ffd25a' }, 'Karne günü her gün.'),
	C('kral_cay', 'Çay Ocağı Ustası', 'halk', 'rare', 900, { daily: 7 }, { hat: null, outfit: 'onluk', cape: null, prop: 'kepce', c1: '#b3262e', c2: '#f7e7b9', c3: '#ffb52e' }, 'Tavşan kanı, taze fikir.'),
];

const B = (id, name, rarity, price, unlock, look) => ({ id, kind: 'banner', name, rarity, price, unlock, look });

// Sancak: `look = { pattern, c1, c2, c3 }`; pattern: solid | seritler | capraz | halka | ucgen | ay | yildiz | ejder
export const BANNERS = [
	B('s_kirmizi', 'Kızıl Sancak', 'common', null, { free: true }, { pattern: 'solid', c1: '#e8423f', c2: '#ffd25a', c3: '#ffffff' }),
	B('s_mavi', 'Mavi Sancak', 'common', null, { free: true }, { pattern: 'seritler', c1: '#2f78e0', c2: '#ffffff', c3: '#ffd25a' }),
	B('s_altin', 'Altın Şerit', 'common', 200, { level: 2 }, { pattern: 'seritler', c1: '#f2b21a', c2: '#7a4a12', c3: '#ffffff' }),
	B('s_yesil', 'Zümrüt Sancak', 'common', 250, { level: 3 }, { pattern: 'capraz', c1: '#27a36a', c2: '#e8fff2', c3: '#ffd25a' }),
	B('s_ay', 'Hilal Sancağı', 'rare', 600, { level: 6 }, { pattern: 'ay', c1: '#b3262e', c2: '#ffffff', c3: '#ffd25a' }),
	B('s_bozkurt', 'Gök Bayrak', 'rare', 700, { level: 10 }, { pattern: 'halka', c1: '#2e6fd1', c2: '#f4e3b5', c3: '#ffd25a' }),
	B('s_lale', 'Lale Devri', 'rare', 800, { campaign: 'marmara' }, { pattern: 'ucgen', c1: '#e0457b', c2: '#fff0f5', c3: '#ffd25a' }),
	B('s_yildiz', 'Yıldızlı Gece', 'epic', 1300, { stars: 25 }, { pattern: 'yildiz', c1: '#1a2a5c', c2: '#ffd25a', c3: '#ffffff' }),
	B('s_ejder', 'Ejder Sancağı', 'epic', 1600, { campaign: 'dogu' }, { pattern: 'ejder', c1: '#7b2fa8', c2: '#ffd25a', c3: '#ffffff' }),
	B('s_efsane', 'Efsane Sancağı', 'legendary', 4000, { stars: 60 }, { pattern: 'ay', c1: '#ffb52e', c2: '#8e1b2e', c3: '#ffffff' }),
];

// Yüzler ve ten tonları (yapılandırma için; kozmetik fiyatsız)
export const FACES = ['yuvarlak', 'keskin', 'bıyıklı', 'sakallı', 'gülen', 'ciddi'];
export const SKINS = ['#f6d3b0', '#e9b98c', '#c98e5f', '#9b6a43', '#6b4429'];

export const ALL_ITEMS = [...COSTUMES, ...BANNERS];
const BY_ID = new Map(ALL_ITEMS.map((x) => [x.kind + ':' + x.id, x]));
export const item = (kind, id) => BY_ID.get(kind + ':' + id) || null;
export const costume = (id) => item('costume', id);
export const banner = (id) => item('banner', id);

export const DEFAULT_LOADOUT = { costume: 'acemi', banner: 's_kirmizi', face: 'yuvarlak', skin: SKINS[0] };

/** Bu seviyede ve altında otomatik açılan eşyalar. */
export function unlockedByLevel(level) {
	return ALL_ITEMS.filter((x) => x.unlock && x.unlock.level != null && x.unlock.level <= level);
}

/** Botlar için tema: bölge → uygun kostüm kimlikleri (seferde rakip görünümü). */
export const REGION_THEME = {
	ege: ['zeybek', 'asci', 'korsan'],
	marmara: ['simitci', 'osmanli_kaptan', 'futbolcu'],
	akdeniz: ['selcuklu_emir', 'asci', 'astronot'],
	icanadolu: ['gokturk_okcu', 'gokturk_kagan', 'ogretmen'],
	karadeniz: ['kurtulus_gonullu', 'kurtulus_subay', 'korsan'],
	guneydogu: ['selcuklu_sipahi', 'asci', 'osmanli_akinci'],
	dogu: ['gokturk_kagan', 'osmanli_yeniceri', 'ninja'],
	all: ['osmanli_sultan', 'robot', 'ninja'],
};

/** Hızlı maçta botlara rastgele ama çeşitli kostüm: aynı maçta tekrar etmez. */
export function randomLook(R, taken = new Set()) {
	const pool = COSTUMES.filter((c) => !taken.has(c.id));
	const c = pool[Math.floor(R() * pool.length)] || COSTUMES[0];
	taken.add(c.id);
	const b = BANNERS[Math.floor(R() * BANNERS.length)];
	return { costume: c.id, banner: b.id, face: FACES[Math.floor(R() * FACES.length)], skin: SKINS[Math.floor(R() * SKINS.length)] };
}

// ------------------------------------------------------------------ arayüz portre eşlemesi
// Arayüz (src/ui/art.js) sekiz portre çizer: gokturk, selcuklu, yeniceri, kalpak, sultan, astronot, asci, futbol.
// Kostüm kataloğundaki her eşya en yakın portreye düşer (kataloğa yeni kostüm eklenince buraya da eklenir).
export const AVATAR_OF = {
	acemi: 'kalpak',
	futbolcu: 'futbol',
	gokturk_okcu: 'gokturk',
	gokturk_kagan: 'gokturk',
	selcuklu_sipahi: 'selcuklu',
	selcuklu_emir: 'selcuklu',
	osmanli_akinci: 'yeniceri',
	osmanli_yeniceri: 'yeniceri',
	osmanli_kaptan: 'yeniceri',
	osmanli_sultan: 'sultan',
	kurtulus_gonullu: 'kalpak',
	kurtulus_subay: 'kalpak',
	zeybek: 'kalpak',
	astronot: 'astronot',
	asci: 'asci',
	ogretmen: 'selcuklu',
	korsan: 'yeniceri',
	ninja: 'gokturk',
	simitci: 'asci',
	dino: 'futbol',
	robot: 'astronot',
	mezun: 'kalpak',
	kral_cay: 'asci',
};
export const avatarOf = (costumeId) => AVATAR_OF[costumeId] || 'kalpak';

const UI_BANNERS = ['duz', 'serit', 'ok', 'yildiz', 'gunes', 'lale'];

/**
 * Sefer rakibinin arayüz görünümü: kostümü portreye, adı sancağa ve ten rengine bağlar (aynı rakip hep aynı görünür).
 * Rakipte kostüm yoksa null döner; arayüz botlara kendi çeşitli portrelerini verir.
 */
export function botLook(opp) {
	if (!opp || !opp.costume) return null;
	let h = 0;
	for (const c of String(opp.name || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return { kind: avatarOf(opp.costume), costume: opp.costume, banner: UI_BANNERS[h % UI_BANNERS.length], skin: (h >>> 5) % 4 };
}
