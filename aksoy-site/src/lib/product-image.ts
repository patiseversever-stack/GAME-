// Ürünün stüdyo görseli (scripts/render-products.mjs ile üretilir). Her ürün türü ve uç şekli için
// bir görsel vardır; görseli olmayan türde teknik çizim kullanılır.
import type { Product } from '../data/types';

const KEYS = new Set([
  'insert-C-n', 'insert-C-p', 'insert-D-n', 'insert-D-p', 'insert-V-n', 'insert-V-p', 'insert-S-n', 'insert-S-p',
  'insert-T-n', 'insert-T-p', 'insert-W-n', 'insert-R-p', 'insert-A-p',
  'groove-insert', 'thread-insert',
  'holder-ext-C', 'holder-ext-D', 'holder-ext-V', 'holder-ext-V-s', 'holder-ext-W', 'holder-ext-T', 'holder-groove', 'holder-thread',
  'boring-bar-C', 'boring-bar-D',
  'drill-carbide', 'drill-hss', 'drill-u', 'center-drill', 'reamer',
  'endmill', 'endmill-ball', 'facemill', 'facemill-45', 'facemill-shank', 'facemill-round',
  'tap-helis', 'tap-duz', 'tap-ovalama', 'collet', 'chuck-bt', 'pull-stud',
]);

export function renderKey(p: Pick<Product, 'drawing' | 'shape' | 'code' | 'name'>): string | null {
  const code = p.code.toUpperCase();
  let key: string;
  switch (p.drawing) {
    case 'insert': {
      const shape = p.shape ?? 'C';
      // ISO kodunun 2. harfi boşluk açısı: N → negatif, diğerleri pozitif
      const neg = code[1] === 'N';
      key = `insert-${shape}-${neg ? 'n' : 'p'}`;
      if (!KEYS.has(key)) key = `insert-${shape}-${neg ? 'p' : 'n'}`;
      break;
    }
    // İlk harf bağlama tipi: S = vidalı (pozitif uç), P/M = kollu/pabuçlu (negatif uç)
    case 'holder-ext': key = `holder-ext-${code[1]}${code[0] === 'S' ? '-s' : ''}`; if (!KEYS.has(key)) key = `holder-ext-${code[1]}`; if (!KEYS.has(key)) key = 'holder-ext-C'; break;
    case 'boring-bar': {
      const part = code.split('-')[1] ?? '';
      key = `boring-bar-${part[1] ?? 'C'}`;
      if (!KEYS.has(key)) key = 'boring-bar-C';
      break;
    }
    case 'facemill':
      key = code.startsWith('EMR') ? 'facemill-round' : /C20|\b2T\b/.test(code) ? 'facemill-shank' : /^45°|SEKT/.test(code) || p.name.includes('45°') ? 'facemill-45' : 'facemill';
      break;
    case 'tap': {
      const n = `${p.code} ${p.name}`.toLocaleLowerCase('tr');
      key = n.includes('ovalama') ? 'tap-ovalama' : n.includes('ucu spiral') || n.includes('düz') ? 'tap-duz' : 'tap-helis';
      break;
    }
    default:
      key = p.drawing;
  }
  return KEYS.has(key) ? key : null;
}

export function productImage(p: Pick<Product, 'drawing' | 'shape' | 'code' | 'name'>) {
  const k = renderKey(p);
  if (!k) return null;
  return { src: `/img/urun/${k}.webp`, small: `/img/urun/${k}-s.webp`, w: 1200, h: 900 };
}
