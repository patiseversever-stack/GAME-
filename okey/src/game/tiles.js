// TileEngine — 106 taş, renk/değer çözümleme, gösterge → okey, sahte okey temsili.
//
// Taşlar 0..105 arası tam sayıdır:
//   doğal taş:  renk*26 + (değer-1)*2 + kopya   (0..103)
//   sahte okey: 104, 105
// Tam sayı kimlik; çözücüler için hızlı, DOM için `data-id` olarak kararlı.

export const COLORS = ['red', 'blue', 'black', 'yellow'];
export const COLOR_TR = { red: 'Kırmızı', blue: 'Mavi', black: 'Siyah', yellow: 'Sarı' };
export const COLOR_SHAPE = { red: 'circle', blue: 'diamond', black: 'triangle', yellow: 'square' };
export const TILE_COUNT = 106;
export const FAKE_A = 104;
export const FAKE_B = 105;

export const isFake = (t) => t >= 104;
export const colorOf = (t) => (t / 26) | 0; // yalnızca doğal taş
export const valueOf = (t) => ((t % 26) >> 1) + 1; // yalnızca doğal taş
export const copyOf = (t) => t & 1;
export const tileId = (c, v, copy = 0) => c * 26 + (v - 1) * 2 + copy;

export function allTiles() {
  return Array.from({ length: TILE_COUNT }, (_, i) => i);
}

// Bir gösterge taşından okey bağlamı (ctx) üretir. 13 göstergesinde okey 1'dir.
export function makeCtx(indicator) {
  if (isFake(indicator)) throw new Error('Gösterge sahte okey olamaz.');
  const oc = colorOf(indicator);
  const ov = (valueOf(indicator) % 13) + 1;
  return { indicator, oc, ov };
}

// Gerçek okey: göstergenin aynı renkte bir üstü (iki kopya da joker).
export const isOkey = (t, ctx) => t < 104 && colorOf(t) === ctx.oc && valueOf(t) === ctx.ov;

// Joker olmayan taşın yüzü. Sahte okey, okeyin doğal yüzünü taşır.
export function faceOf(t, ctx) {
  if (isFake(t)) return { c: ctx.oc, v: ctx.ov };
  return { c: colorOf(t), v: valueOf(t) };
}

export const sameFace = (a, b) => a.c === b.c && a.v === b.v;
export const faceKey = (c, v) => c * 14 + v;

// Elin değeri (101 ceza hesabı): okey ve sahte okey okeyin doğal değeri kadar.
export function tilePenaltyValue(t, ctx) {
  if (isFake(t) || isOkey(t, ctx)) return ctx.ov;
  return valueOf(t);
}

// Görüntü için insan okunur ad.
export function tileLabel(t, ctx) {
  if (isFake(t)) return `Sahte okey (${COLOR_TR[COLORS[ctx.oc]]} ${ctx.ov})`;
  const name = `${COLOR_TR[COLORS[colorOf(t)]]} ${valueOf(t)}`;
  return ctx && isOkey(t, ctx) ? `Okey (${name})` : name;
}

// Dizilimi sabit kopyalama yardımcıları.
export const cloneHands = (hands) => hands.map((h) => h.slice());
