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

  // Masalar
  {id: 'arena', kind: 'table', name: 'Mavi Arena', desc: 'Işık hüzmeleri altında klasik arena.', price: 0, rarity: 'common', starter: true},
  {id: 'gece', kind: 'table', name: 'Yıldızlı Gece', desc: 'Girdaplı gökyüzünün altında oyna.', price: 8000, rarity: 'epic'},
  {id: 'cini', kind: 'table', name: 'Çini Salon', desc: 'Lacivert ve turkuaz çinilerle döşeli salon.', price: 10000, rarity: 'legendary'},
  {id: 'kizil', kind: 'table', name: 'Kızıl Salon', desc: 'Kadife kırmızısı, altın ışıltı.', price: 5000, rarity: 'rare'},
  {id: 'zumrut', kind: 'table', name: 'Zümrüt Kadife', desc: 'Derin yeşil kadife, nostaljik sıcaklık.', price: 4000, rarity: 'rare'},

  // Pişti efektleri
  {id: 'klasik', kind: 'fx', name: 'Dört Renk Patlama', desc: 'Işın çarkı, konfeti ve jeton.', price: 0, rarity: 'common', starter: true},
  {id: 'havai', kind: 'fx', name: 'Havai Fişek', desc: 'Masanın üstünde patlayan renkli fişekler.', price: 6000, rarity: 'epic'},
  {id: 'yildiz', kind: 'fx', name: 'Yıldız Yağmuru', desc: 'Gökten kayan yıldızlar ve ışık izi.', price: 7000, rarity: 'epic'},
  {id: 'altin', kind: 'fx', name: 'Altın Yağmuru', desc: 'Masaya yağan altın sikkeler.', price: 9000, rarity: 'legendary'},

  // Avatar çerçeveleri
  {id: 'standart', kind: 'frame', name: 'Standart', desc: 'Sade beyaz halka.', price: 0, rarity: 'common', starter: true},
  {id: 'altin', kind: 'frame', name: 'Altın Halka', desc: 'Parlayan altın, ince işçilik.', price: 3000, rarity: 'rare'},
  {id: 'lale', kind: 'frame', name: 'Lale Bahçesi', desc: 'Laleli Osmanlı bordürü.', price: 4500, rarity: 'epic'},
  {id: 'yildizli', kind: 'frame', name: 'Yıldızlı Gece', desc: 'Dönen yıldızlarla gece halkası.', price: 5500, rarity: 'epic'},
  {id: 'ates', kind: 'frame', name: 'Alev', desc: 'Kızgın kor gibi yanan halka.', price: 7000, rarity: 'legendary'},
];

export function itemOf(kind: ItemKind, id: string): ShopItem | undefined {
  return CATALOG.find(i => i.kind === kind && i.id === id);
}
