// Market kataloğu: satılabilen her şey tek listede. Uygulamalar ayrı modüllerde:
//   char  → src/game/roster.ts          deck  → src/skins/index.ts (DECKS)
//   table → src/themes/tables.ts (TABLES) fx   → Table2D / HUD pişti efekti (id ile)
//   frame → src/themes/frames.css (.kh-frame--<id>)
import {ROSTER, type Rarity} from './roster';

export type ItemKind = 'char' | 'deck' | 'table' | 'fx' | 'frame';

export interface ShopItem {
  id: string;
  kind: ItemKind;
  name: string;
  desc: string;
  price: number;
  rarity: Rarity;
  /** Başlangıçta herkeste olan (ücretsiz) */
  starter?: boolean;
  /** Market rozeti: yeni / popüler / sınırlı. Yoksa market kendisi seçer (src/ui/sets.ts). */
  badge?: 'new' | 'hot' | 'limited';
  /** Tema seti kimliği: aynı `set` değerini taşıyan ürünler marketteki "Setler"de indirimli paket olur (src/ui/sets.ts). */
  set?: string;
}

export const RARITY_INFO: Record<Rarity, {name: string; color: string}> = {
  common: {name: 'Sıradan', color: '#9fb3c8'},
  rare: {name: 'Nadir', color: '#3d8bff'},
  epic: {name: 'Destansı', color: '#a855f7'},
  legendary: {name: 'Efsanevi', color: '#ffb400'},
};

export const KIND_INFO: Record<ItemKind, {name: string; plural: string}> = {
  char: {name: 'Karakter', plural: 'Karakterler'},
  deck: {name: 'Deste', plural: 'Desteler'},
  table: {name: 'Masa', plural: 'Masalar'},
  fx: {name: 'Pişti Efekti', plural: 'Efektler'},
  frame: {name: 'Çerçeve', plural: 'Çerçeveler'},
};

export const CATALOG: readonly ShopItem[] = [
  // Karakterler (biri açılışta hediye edilir)
  ...ROSTER.map(c => ({id: c.id, kind: 'char' as const, name: c.name, desc: c.title, price: c.price, rarity: c.rarity})),

  // Desteler
  {id: 'yildizli', kind: 'deck', name: 'Yıldızlı Gece', desc: 'Van Gogh\'un girdaplı gökyüzü, fırça darbeleriyle.', price: 0, rarity: 'epic', starter: true},
  {id: 'iznik', kind: 'deck', name: 'İznik Çinisi', desc: 'Lale, karanfil ve mercan kırmızısı; saray çinisi zarafeti.', price: 12000, rarity: 'legendary'},
  {id: 'dalga', kind: 'deck', name: 'Büyük Dalga', desc: 'Hokusai\'nin köpüklü dalgası, gravür çizgileriyle.', price: 9000, rarity: 'epic'},
  {id: 'aycicegi', kind: 'deck', name: 'Ayçiçekleri', desc: 'Güneş sarısı yapraklar, kalın boya dokusu.', price: 9000, rarity: 'epic'},
  {id: 'hazine', kind: 'deck', name: 'Topkapı Hazinesi', desc: 'Yakut, topaz, zümrüt, safir kesme taşlar; valede Topkapı Hançeri parlıyor.', price: 15000, rarity: 'legendary', set: 'hazine'},
  {id: 'ebru', kind: 'deck', name: 'Ebru', desc: 'Suyun üstünde doğan lale, bülbül yuvası ve taraklı ebru: her kart bir sanat eseri.', price: 13500, rarity: 'legendary', set: 'ebru'},
  {id: 'bogaz', kind: 'deck', name: 'Boğaz Gecesi', desc: 'Galata, Kız Kulesi ve ışıklı köprü: İstanbul gecesi avucunda.', price: 9500, rarity: 'epic', set: 'bogaz'},
  {id: 'neon', kind: 'deck', name: 'Neon Kahvehane', desc: 'Tuğla duvarda yanan dört renk neon; vale bir çay bardağı!', price: 8500, rarity: 'epic', set: 'neon'},
  {id: 'kapadokya', kind: 'deck', name: 'Kapadokya Şafağı', desc: 'Her takım kendi balonunda: peri bacalarının üstünde gün doğuyor.', price: 7500, rarity: 'epic', set: 'kapadokya'},

  // Masalar
  {id: 'arena', kind: 'table', name: 'Mavi Arena', desc: 'Işık hüzmeleri altında klasik arena.', price: 0, rarity: 'common', starter: true},
  {id: 'gece', kind: 'table', name: 'Yıldızlı Gece', desc: 'Girdaplı gökyüzünün altında oyna.', price: 8000, rarity: 'epic'},
  {id: 'cini', kind: 'table', name: 'Çini Salon', desc: 'Lacivert ve turkuaz çinilerle döşeli salon.', price: 10000, rarity: 'legendary'},
  {id: 'kizil', kind: 'table', name: 'Kızıl Salon', desc: 'Kadife kırmızısı, altın ışıltı.', price: 5000, rarity: 'rare'},
  {id: 'zumrut', kind: 'table', name: 'Zümrüt Kadife', desc: 'Derin yeşil kadife, nostaljik sıcaklık.', price: 4000, rarity: 'rare'},
  {id: 'ebru', kind: 'table', name: 'Ebru Salonu', desc: 'Bütün masa bir ebru teknesi; desenler yığının çevresinde döner.', price: 9000, rarity: 'epic', set: 'ebru'},
  {id: 'bogaz', kind: 'table', name: 'Boğaz Gecesi', desc: 'Ay ışığında Boğaz: Galata, ışıklı köprü ve sudaki yakamoz.', price: 8500, rarity: 'epic', set: 'bogaz'},
  {id: 'neon', kind: 'table', name: 'Neon Kahvehane', desc: 'Pembe PİŞTİ tabelası, buharı tüten neon çay, tuğla duvar.', price: 7500, rarity: 'epic', set: 'neon'},
  {id: 'kapadokya', kind: 'table', name: 'Kapadokya Şafağı', desc: 'Şafakta onlarca balon, ufukta peri bacaları.', price: 6500, rarity: 'epic', set: 'kapadokya'},
  {id: 'hazine', kind: 'table', name: 'Hazine Odası', desc: 'Kızıl kadife, altın telkâri, köşelerde dört mücevher.', price: 4500, rarity: 'rare', set: 'hazine'},

  // Pişti efektleri
  {id: 'klasik', kind: 'fx', name: 'Dört Renk Patlama', desc: 'Işın çarkı, konfeti ve jeton.', price: 0, rarity: 'common', starter: true},
  {id: 'havai', kind: 'fx', name: 'Havai Fişek', desc: 'Masanın üstünde patlayan renkli fişekler.', price: 6000, rarity: 'epic'},
  {id: 'yildiz', kind: 'fx', name: 'Yıldız Yağmuru', desc: 'Gökten kayan yıldızlar ve ışık izi.', price: 7000, rarity: 'epic'},
  {id: 'altin', kind: 'fx', name: 'Altın Yağmuru', desc: 'Masaya yağan altın sikkeler.', price: 9000, rarity: 'legendary'},
  {id: 'girdap', kind: 'fx', name: 'Dört Renk Girdap', desc: 'Işık kolları dönerek yığına çekilir, merkezde yıldız patlar.', price: 12500, rarity: 'legendary'},
  {id: 'davul', kind: 'fx', name: 'Davul Zurna', desc: 'Davul gümler, notalar uçuşur: masada düğün havası!', price: 11500, rarity: 'legendary'},
  {id: 'simsek', kind: 'fx', name: 'Şimşek', desc: 'Gök gürler, yığına şimşek iner, kıvılcımlar saçılır.', price: 8500, rarity: 'epic', set: 'neon'},
  {id: 'lale', kind: 'fx', name: 'Lale Yağmuru', desc: 'Ortada dev bir lale açar, masaya lale yaprakları yağar.', price: 7500, rarity: 'epic', set: 'ebru'},
  {id: 'nazar', kind: 'fx', name: 'Nazar Boncuğu', desc: 'Yığından halka halka nazar boncukları saçılır. Nazar değmesin!', price: 6500, rarity: 'epic', set: 'nazar'},

  // Avatar çerçeveleri
  {id: 'standart', kind: 'frame', name: 'Standart', desc: 'Sade beyaz halka.', price: 0, rarity: 'common', starter: true},
  {id: 'altin', kind: 'frame', name: 'Altın Halka', desc: 'Parlayan altın, ince işçilik.', price: 3000, rarity: 'rare'},
  {id: 'lale', kind: 'frame', name: 'Lale Bahçesi', desc: 'Laleli Osmanlı bordürü.', price: 4500, rarity: 'epic'},
  {id: 'yildizli', kind: 'frame', name: 'Yıldızlı Gece', desc: 'Dönen yıldızlarla gece halkası.', price: 5500, rarity: 'epic'},
  {id: 'ates', kind: 'frame', name: 'Alev', desc: 'Kızgın kor gibi yanan halka.', price: 7000, rarity: 'legendary'},
  {id: 'sultan', kind: 'frame', name: 'Sultan Tacı', desc: 'Taçlı, defne dallı altın halka: masanın sultanı sensin.', price: 13000, rarity: 'legendary', set: 'sultan'},
  {id: 'mucevher', kind: 'frame', name: 'Mücevher Halkası', desc: 'Sekiz kesme taş, inciler ve göz kırpan pırıltılar.', price: 10500, rarity: 'legendary', set: 'hazine'},
  {id: 'kristal', kind: 'frame', name: 'Buz Kristali', desc: 'Buzdan sivriler ve çevresinde dönen parıltılar.', price: 8000, rarity: 'epic'},
  {id: 'neon', kind: 'frame', name: 'Neon Halka', desc: 'Pembe ve camgöbeği neon tüp; içinde ışık koşar.', price: 6500, rarity: 'epic', set: 'neon'},
  {id: 'ebru', kind: 'frame', name: 'Ebru Halkası', desc: 'Altın kenarların arasında durmadan akan ebru.', price: 6000, rarity: 'epic', set: 'ebru'},
  {id: 'balon', kind: 'frame', name: 'Kapadokya Balonları', desc: 'Şafak halkasının üstünde süzülen minik balonlar.', price: 4800, rarity: 'rare', set: 'kapadokya'},
  {id: 'nazar', kind: 'frame', name: 'Nazar Boncuğu', desc: 'Mavi cam boncuk, üstünde gezinen ışık. Nazar değmez!', price: 3500, rarity: 'rare', set: 'nazar'},
];

export function itemOf(kind: ItemKind, id: string): ShopItem | undefined {
  return CATALOG.find(i => i.kind === kind && i.id === id);
}
