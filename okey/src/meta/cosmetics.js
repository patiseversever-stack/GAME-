// Kozmetik katalog (masa teması, ıstaka skini, taş takımı). Hiçbiri oyunu etkilemez; yalnızca XP seviyesiyle açılır.
export const THEMES = [
  { id: 'lounge', name: 'Modern Lounge', desc: 'Petrol yeşili keçe, ceviz çerçeve, pirinç detay', level: 1, swatch: ['#2a5f51', '#0e2924', '#7a4f2a'] },
  { id: 'bosphorus', name: 'Boğaz Gece', desc: 'Gece mavisi keçe, soğuk ay ışığı, gümüş çizgi', level: 3, swatch: ['#21426e', '#0a1628', '#2a2f3a'] },
  { id: 'kahvehane', name: 'Klasik Kahvehane', desc: 'Zeytin çuha, eskimiş sıcak ahşap, tungsten ışık', level: 5, swatch: ['#44622f', '#1a2b14', '#92602f'] },
  { id: 'walnut', name: 'Ceviz Salon', desc: 'Bordo keçe, koyu ceviz, altın işleme', level: 8, swatch: ['#6a2a35', '#2b0e15', '#5c3a20'] },
  { id: 'teras', name: 'Yaz Terası', desc: 'Terrakota yüzey, gün ışığı, teak çerçeve', level: 12, swatch: ['#b87a52', '#6e3a25', '#a9794a'] },
];
export const RACKS = [
  { id: 'walnut', name: 'Ceviz', desc: 'Sıcak, klasik', level: 1, swatch: ['#9a6a3d', '#4d2c11'] },
  { id: 'ebony', name: 'Abanoz', desc: 'Koyu, pirinç uçlu', level: 2, swatch: ['#3a3633', '#141210'] },
  { id: 'maple', name: 'Akçaağaç', desc: 'Açık, ferah', level: 6, swatch: ['#d6b58a', '#8a6237'] },
];
export const TILESETS = [
  { id: 'ivory', name: 'Fildişi', desc: 'Klasik sıcak beyaz', level: 1, swatch: ['#fbf6e8', '#e4d6b6'] },
  { id: 'bone', name: 'Kemik', desc: 'Mat, soğuk ton', level: 4, swatch: ['#f1efe6', '#d1ccbb'] },
  { id: 'onyx', name: 'Obsidyen', desc: 'Koyu taş, parlak rakamlar', level: 10, swatch: ['#3a3d42', '#1c1e22'] },
];
export const AVATAR_FRAMES = [{ id: 'none', name: 'Sade', level: 1 }, { id: 'brass', name: 'Pirinç', level: 7 }];

export const CATALOG = { theme: THEMES, rack: RACKS, tiles: TILESETS };

export function unlockedAt(level) {
  const out = [];
  for (const [kind, list] of Object.entries(CATALOG)) for (const it of list) if (it.level === level && level > 1) out.push({ kind, ...it });
  return out;
}
export const isUnlocked = (item, level) => level >= item.level;
