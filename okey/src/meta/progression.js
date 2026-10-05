// İlerleme kataloğu: unvanlar, avatar çerçeveleri, kutlama efektleri, taş takımları.
// Hepsi kozmetik; oyunu etkilemez. Bir öğe ya seviyeyle açılır (level), ya Çarşı'da reklamla (ads) açılır;
// çip fiyatı (chips) çevrim içi oyunla gelecek ve şimdilik "yakında" olarak gösterilir.

// Unvanlar: önce kahvehane dili, en üstte Ağa / Bey / Paşa
export const TITLES = [
  { id: 'caylak', name: 'Çaylak', level: 1 },
  { id: 'cirak', name: 'Çırak', level: 3 },
  { id: 'mudavim', name: 'Müdavim', level: 6 },
  { id: 'masakurdu', name: 'Masa Kurdu', level: 10 },
  { id: 'usta', name: 'Usta', level: 14 },
  { id: 'ustat', name: 'Üstat', level: 18 },
  { id: 'aga', name: 'Ağa', level: 22 },
  { id: 'bey', name: 'Bey', level: 26 },
  { id: 'pasa', name: 'Paşa', level: 30 },
];

// Çerçeve serileri: İznik çini, Ebru ve telkari, Zanaat (sedef, kilim, bakır, tezhip, kehribar), Nişan (çelenk, sorguç)
export const FRAMES = [
  { id: 'sade', name: 'Pirinç Halka', series: 'Klasik', desc: 'Dövme pirinç, ince bilezik', level: 1 },
  { id: 'lale', name: 'Lale Bordür', series: 'İznik çini', desc: 'Kobalt sır üstünde beyaz laleler', level: 2 },
  { id: 'bakir', name: 'Bakır Dövme', series: 'Zanaat', desc: 'Çekiçle dövülmüş bakır, yeşil patina', level: 4 },
  { id: 'gelgit', name: 'Gelgit Ebru', series: 'Ebru ve telkari', desc: 'Taraklı gelgit ebrusu, gümüş tel', level: 5 },
  { id: 'rumi', name: 'Rumi Çini', series: 'İznik çini', desc: 'Turkuaz zemin, saz yaprakları', level: 8 },
  { id: 'kilim', name: 'Kilim', series: 'Zanaat', desc: 'Yün dokuma, elibelinde motifi', level: 11 },
  { id: 'sal', name: 'Şal Ebru', series: 'Ebru ve telkari', desc: 'Taraklı şal deseni, gümüş telkari', level: 13 },
  { id: 'mercan', name: 'Mercan İznik', series: 'İznik çini', desc: 'Mercan kırmızısı lale ve karanfil, altın sırt', level: 16 },
  { id: 'hatip', name: 'Hatip Ebru', series: 'Ebru ve telkari', desc: 'Hatip ebrusu, altın telkari', level: 20 },
  { id: 'aga', name: 'Ağa Çelengi', series: 'Nişan', desc: 'Altın telkari, çini madalyonlar, zümrüt', level: 24 },
  { id: 'pasa', name: 'Paşa Sorgucu', series: 'Nişan', desc: 'Yakut sorguç, altın tel, İznik çini', level: 30 },
  { id: 'gece', name: 'Gece Çinisi', series: 'İznik çini', desc: 'Lacivert sır, altın varak geçmeli yıldızlar', ads: 5, chips: 3000 },
  { id: 'gul', name: 'Gül Ebru', series: 'Ebru ve telkari', desc: 'Çiçekli ebru, gümüş tel', ads: 6, chips: 4500 },
  { id: 'kehribar', name: 'Kehribar', series: 'Zanaat', desc: 'Bal rengi kehribar taneleri, altın halka', ads: 6, chips: 5000 },
  { id: 'firuze', name: 'Firuze Telkari', series: 'Ebru ve telkari', desc: 'Firuze mine, oyma gümüş filigran, mercan', ads: 7, chips: 7000 },
  { id: 'sedef', name: 'Sedef Kakma', series: 'Zanaat', desc: 'Ceviz üstünde sedef geçme yıldızlar', ads: 7, chips: 7500 },
  { id: 'tezhip', name: 'Tezhip', series: 'Zanaat', desc: 'Lacivert zeminde altın rumi tezhip', ads: 7, chips: 8000 },
];

// Kazanınca oynayan kutlama efektleri
export const EFFECTS = [
  { id: 'konfeti', name: 'Çini Konfeti', desc: 'Altın pullar, lale ve yıldızlar', level: 1 },
  { id: 'lale', name: 'Lale Yağmuru', desc: 'Süzülen İznik laleleri', level: 7 },
  { id: 'varak', name: 'Altın Varak', desc: 'Işıkta dönen altın yaprak pulları', level: 12 },
  { id: 'havai', name: 'Havai Fişek', desc: 'Boğaz gecesi gibi patlayan ışıklar', level: 15 },
  { id: 'fener', name: 'Dilek Fenerleri', desc: 'Göğe yükselen sıcak ışıklı fenerler', level: 19 },
  { id: 'altin', name: 'Altın Yağmuru', desc: 'Parlayan altın sikkeler', level: 25 },
  { id: 'yildiz', name: 'Yıldız Kayması', desc: 'Gece göğünde kayan yıldızlar', level: 28 },
  { id: 'nazar', name: 'Nazar Boncuğu', desc: 'Göz değmesin', ads: 5, chips: 2500 },
  { id: 'gul', name: 'Gül Yaprakları', desc: 'Kadife gül yaprakları', ads: 5, chips: 2500 },
  { id: 'ebru', name: 'Ebru Damlaları', desc: 'Ekranda açan mürekkep çiçekleri', ads: 6, chips: 4000 },
  { id: 'kelebek', name: 'Kelebekler', desc: 'Kanat çırpan renkli kelebekler', ads: 6, chips: 4000 },
  { id: 'mozaik', name: 'Çini Mozaik', desc: 'Dönerek dizilen çini karolar', ads: 7, chips: 5000 },
];

// Taş takımları (render3d/tile-themes): fildişi herkese açık; diğerleri seviye ya da Çarşı ile
export const TILESETS = [
  { id: 'ivory', name: 'Fildişi', desc: 'Klasik sıcak beyaz', level: 1 },
  { id: 'cini', name: 'İznik Çini', desc: 'Sırlı kobalt ve mercan', level: 9, ads: 7, chips: 12000 },
  { id: 'ebru', name: 'Ebru', desc: 'Mermerli kâğıt, altın cetvel', level: 17, ads: 7, chips: 12000 },
  { id: 'yagli', name: 'Yağlı Boya', desc: 'Empasto fırça izi', level: 27, ads: 7, chips: 15000 },
];

export const CATALOG = { frame: FRAMES, effect: EFFECTS, tiles: TILESETS, title: TITLES };
export const KIND_NAME = { frame: 'Çerçeve', effect: 'Kutlama', tiles: 'Taş takımı', title: 'Unvan' };
export const DEFAULT_EQUIP = { frame: 'sade', effect: 'konfeti', title: null };

export const itemOf = (kind, id) => (CATALOG[kind] || []).find((x) => x.id === id) || null;

// Bir seviyede açılan her şey (unvan dahil)
export function rewardsAt(level) {
  const out = [];
  for (const kind of ['title', 'frame', 'effect', 'tiles']) for (const it of CATALOG[kind]) if (it.level === level && level > 1) out.push({ kind, ...it });
  return out;
}

// Seviyeye göre en yüksek unvan
export function titleFor(level) {
  let t = TITLES[0];
  for (const x of TITLES) if (level >= x.level) t = x;
  return t;
}

// Sıradaki seviye ödülü
export function nextReward(level) {
  for (let l = level + 1; l <= 60; l++) {
    const r = rewardsAt(l);
    if (r.length) return { level: l, items: r };
  }
  return null;
}

// Seviye rozeti tonu: bronz / gümüş / altın / yakut
export const levelTier = (level) => (level >= 30 ? 'ruby' : level >= 20 ? 'gold' : level >= 10 ? 'silver' : 'bronze');
