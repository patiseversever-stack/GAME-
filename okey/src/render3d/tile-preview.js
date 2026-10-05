// Taş takımı önizlemesi: oyundaki taşın kendisi (fildişi: 3B doku çizimi; diğerleri: takımın boyanmış yüzü ve sırtı).
import { ivoryTexture } from './tile-face.js';
import { themeTile } from './tile-themes/index.js';

const urls = new Map();
const FRONT = { kind: 'num', color: 'red', value: 7 };

// side: 'front' | 'back' → Promise<url>
export function tilePreviewURL(set, side) {
  const k = set + '|' + side;
  if (urls.has(k)) return urls.get(k);
  const p =
    set === 'ivory'
      ? Promise.resolve().then(() => ivoryTexture(side === 'back' ? { kind: 'back' } : FRONT).image.toDataURL('image/png'))
      : themeTile(set, side === 'back' ? 'back' : 'n:red:7');
  urls.set(k, p);
  return p;
}

// İşaretleme: biri sırt, biri yüz; görseller hazır oldukça dolar
export function tilePairHTML(set, cls = '') {
  return `<span class="tpair ${cls}" data-tset="${set}"><span class="tpair__t tpair__t--back"><img alt="" data-side="back"></span><span class="tpair__t tpair__t--front"><img alt="" data-side="front"></span></span>`;
}
export function hydrateTiles(root = document) {
  root.querySelectorAll('.tpair').forEach((el) => {
    if (el._h) return;
    el._h = true;
    const set = el.dataset.tset;
    el.querySelectorAll('img[data-side]').forEach((img) =>
      tilePreviewURL(set, img.dataset.side).then((u) => {
        if (!u) return;
        img.onload = () => img.parentElement.classList.add('is-ready');
        img.src = u;
      }),
    );
  });
}
