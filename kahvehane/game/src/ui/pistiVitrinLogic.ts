// Pişti vitrini: DOM'suz mantık (sıra, etiket, yelpaze geometrisi, kapanma kuralları). Birim testi: tests/pistiVitrin.test.ts.
// Vitrin yalnız AÇIK pişti kartlarını gösterir (herkese açık bilgi: kapalı yakalanan kartlar hiç dokunulmaz).
import {isJack, type CardId} from '../core/types';

/** Vitrinde aynı anda en çok bu kadar pişti kartı açılır (fazlasında en eskiler atlanır; son piştiler hep görünür). */
export const VIT_MAX = 8;

/**
 * Pişti kartının etiketi. Pişti kartı OYNANAN karttır: Vale (J) yalnız vale piştide (tek J'nin üstüne J) pişti kartı olabilir
 * (J tek başka kartı alırsa pişti sayılmaz) → J = "Vale Pişti +20", diğerleri "+10".
 */
export function pistiTag(id: CardId): {points: 10 | 20; vale: boolean; label: string} {
  const vale = isJack(id);
  return {points: vale ? 20 : 10, vale, label: vale ? 'Vale Pişti +20' : '+10'};
}

/** Gösterilecek kartlar: oluş sırasıyla (pişti yapılış sırası), en çok `cap`; fazlası varsa en eskiler atlanır (first: ilk gösterilenin sıra no'su). */
export function showCards<T>(row: readonly T[], cap = VIT_MAX): {items: T[]; first: number} {
  const first = Math.max(0, row.length - cap);
  return {items: row.slice(first), first};
}

export interface FanBox {
  W: number;
  H: number;
  cw: number;
  /** Elin kart ölçeği (L.hand.s): vitrin kartları eldekiler kadar büyük (atlas o çözünürlükte pişirilir → köşe indeksi net) */
  handS: number;
  /** Kartların sol kenarı bundan küçük olamaz (ör. desteyle çakışmasın: yelpaze o kadar sağa kayar / daralır). */
  left?: number;
}
export interface FanPose {
  x: number;
  y: number;
  r: number;
  s: number;
}
export interface FanLayout {
  poses: FanPose[];
  /** kart boyu (px) */
  w: number;
  h: number;
  step: number;
  /** yelpazenin en üst / en alt y'si (başlık ve etiketler için) */
  top: number;
  bottom: number;
  /** her kartın alt kenarı (döndürülmüş dörtgenin en alçak noktası) */
  bottoms: number[];
  /** yelpazenin orta x'i (başlık bunun üstünde) */
  cx: number;
}

/** Sahne ortasında, ekrana sığan yay biçimli yelpaze: kart sırası soldan sağa = oluş sırası, sonuncusu en üstte ve tam görünür. */
export function vitrinFan(n: number, b: FanBox): FanLayout {
  const s = b.handS, w = b.cw * s, h = w / 0.7;
  const edge = Math.max(0, b.W * 0.03), right = b.W - edge;
  // adım: köşe indeksi (kart genişliğinin ~%34'ü) rahat okunsun; dar ekranda sığacak kadar
  const stepFor = (l: number) => (n > 1 ? Math.min(w * 0.6, (Math.min(b.W * 0.94, right - l) - w) / (n - 1)) : 0);
  let left = Math.max(edge, b.left ?? 0), step = stepFor(left);
  if (n > 1 && step < w * 0.36) {
    // sol sınıra uyunca köşe indeksleri sıkışıyorsa (çok kart): sınırdan vazgeç, tüm genişliği kullan
    left = edge;
    step = stepFor(left);
  }
  const total = w + (n - 1) * step;
  // ortalı; sol sınır (deste) varsa o kadar sağa kayar
  const cx = Math.min(right - total / 2, Math.max(b.W / 2, left + total / 2));
  const da = n > 1 ? Math.min(5.5, 26 / (n - 1)) : 0;
  const yc = b.H * 0.485;
  const poses: FanPose[] = [];
  const bottoms: number[] = [];
  let top = Infinity, bottom = -Infinity;
  for (let k = 0; k < n; k++) {
    const off = k - (n - 1) / 2;
    const r = off * da, y = yc + off * off * (n <= 5 ? 1.9 : 1.1); // kalabalıkta yay daha yassı: etiketler elin ipucuna inmez
    poses.push({x: cx + off * step, y, r, s});
    const a = (Math.abs(r) * Math.PI) / 180;
    const hh = (h * Math.cos(a) + w * Math.sin(a)) / 2;
    top = Math.min(top, y - hh);
    bottom = Math.max(bottom, y + hh);
    bottoms.push(y + hh);
  }
  return {poses, w, h, step, top, bottom, bottoms, cx};
}

/**
 * Etiket satırları: soldan sağa dizili etiketler (merkez x, genişlik) yan yana sığmıyorsa sonrakiler bir alt satıra iner.
 * Sonuç: her etiketin satır no'su (0 = ilk satır).
 */
export function tagRows(xs: readonly number[], widths: readonly number[], gap = 6): number[] {
  const rows: number[] = [];
  const last: number[] = []; // her satırdaki son etiketin sağ kenarı
  for (let i = 0; i < xs.length; i++) {
    const left = xs[i] - widths[i] / 2;
    let r = 0;
    while (r < last.length && left < last[r] + gap) r++;
    last[r] = xs[i] + widths[i] / 2;
    rows.push(r);
  }
  return rows;
}

/** Vitrini etkileyebilecek olaylar: masadaki sahne animasyonları, dokunmalar, süre, el sonu. */
export type VitEvent = 'play' | 'collect' | 'deal' | 'fx' | 'reset' | 'layout' | 'turn' | 'tap' | 'timer' | 'end';
/** Kapanış biçimi: keep = açık kalır · normal = zarif geri uçuş · fast = hızlı geri uçuş · instant = animasyonsuz yerine konur. */
export type VitClose = 'keep' | 'normal' | 'fast' | 'instant';

/**
 * Kapanma kuralları: yeni yakalama / pişti / dağıtım / el sonu animasyonu başlarsa hızlı geri uçuş; yerleşim değişir ya da el
 * sıfırlanırsa (kartların yeri geçersiz) anında; sıra sende ve sayaç varsa hızlı; dokunma hızlı; 3,5 sn dolunca zarif.
 */
export function closeRule(ev: VitEvent, ctx: {timedTurn: boolean}): VitClose {
  switch (ev) {
    case 'play':
    case 'collect':
    case 'deal':
    case 'fx':
    case 'tap':
      return 'fast';
    case 'timer':
      return 'normal';
    case 'turn':
      return ctx.timedTurn ? 'fast' : 'keep';
    case 'reset':
    case 'layout':
    case 'end':
      return 'instant';
  }
}

/** Dokunuş ne yapar: pişti varsa ve masa sakinse aç; pişti yoksa yığın hafifçe zıplar; masa meşgulse yok say. */
export function tapAction(ctx: {pistis: number; busy: number; stack: number; openSeat: number; seat: number}): 'open' | 'swap' | 'close' | 'bounce' | 'ignore' {
  if (ctx.openSeat === ctx.seat) return 'close';
  if (ctx.pistis <= 0) return ctx.stack > 0 && ctx.busy === 0 ? 'bounce' : 'ignore';
  if (ctx.busy > 0) return 'ignore';
  return ctx.openSeat >= 0 ? 'swap' : 'open';
}

/** Tek seferlik ipucu ("Dokun, piştileri gör"): bir koltuk ilk kez 2+ pişti yaptığında, oturumda bir kez, otomatik oyunda hiç. */
export function shouldHint(ctx: {n: number; seen: boolean; auto: boolean; shownThisSession: boolean}): boolean {
  return ctx.n >= 2 && !ctx.seen && !ctx.auto && !ctx.shownThisSession;
}
