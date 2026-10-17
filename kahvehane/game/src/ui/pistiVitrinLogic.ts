// Pişti vitrini: DOM'suz mantık (sıra, etiket, yelpaze geometrisi, kapanma kuralları). Birim testi: tests/pistiVitrin.test.ts.
// Vitrin yalnız AÇIK pişti kartlarını gösterir (herkese açık bilgi: kapalı yakalanan kartlar hiç dokunulmaz).
import {isJack, type CardId} from '../core/types';

/** Vitrinde aynı anda en çok bu kadar pişti kartı açılır (fazlasında en eskiler atlanır; son piştiler hep görünür). */
export const VIT_MAX = 8;

/**
 * Pişti kartının etiketi. Pişti kartı OYNANAN karttır: Vale (J) yalnız vale piştide (tek J'nin üstüne J) pişti kartı olabilir
 * (J tek başka kartı alırsa pişti sayılmaz) → J = "VALE +20" (altın), diğerleri "+10".
 */
export function pistiTag(id: CardId): {points: 10 | 20; vale: boolean; label: string} {
  const vale = isJack(id);
  return {points: vale ? 20 : 10, vale, label: vale ? 'VALE +20' : '+10'};
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
  /** Kartların sol kenarı bundan küçük olamaz (ör. desteyle çakışmasın: yelpaze o kadar sağa kayar, gerekirse kartlar küçülür). */
  left?: number;
  /** Yelpazenin en alt kenarı bundan aşağı inemez (ipucu hapının üstü): gerekirse yelpaze yukarı kayar. */
  bottomMax?: number;
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

/**
 * Sahne ortasında, ekrana sığan yay biçimli yelpaze: kart sırası soldan sağa = oluş sırasıyla, sonuncusu en üstte ve tam görünür.
 * Kartlar eldekiler kadar büyük (net atlas çözünürlüğü); çok kartta ve sol sınır (deste) varsa köşe indeksi (kart genişliğinin
 * ~%36'sı) açık kalacak kadar küçülür. Sol sınır hep korunur.
 */
export function vitrinFan(n: number, b: FanBox): FanLayout {
  const edge = Math.max(0, b.W * 0.03), right = b.W - edge;
  const left = Math.max(edge, b.left ?? 0);
  const avail = Math.min(b.W * 0.94, right - left);
  const w = Math.min(b.cw * b.handS, avail / (n > 1 ? 1 + (n - 1) * 0.36 : 1)), h = w / 0.7;
  const s = w / b.cw;
  const step = n > 1 ? Math.min(w * 0.6, (avail - w) / (n - 1)) : 0;
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
    const r = off * da, y = yc + off * off * (n <= 5 ? 1.9 : 1.1); // kalabalıkta yay daha yassı
    poses.push({x: cx + off * step, y, r, s});
    const a = (Math.abs(r) * Math.PI) / 180;
    const hh = (h * Math.cos(a) + w * Math.sin(a)) / 2;
    top = Math.min(top, y - hh);
    bottom = Math.max(bottom, y + hh);
    bottoms.push(y + hh);
  }
  if (b.bottomMax !== undefined && bottom > b.bottomMax) {
    const dy = bottom - b.bottomMax; // ipucu hapına inmesin
    for (let k = 0; k < n; k++) {
      poses[k].y -= dy;
      bottoms[k] -= dy;
    }
    top -= dy;
    bottom -= dy;
  }
  return {poses, w, h, step, top, bottom, bottoms, cx};
}

export interface TagPlan {
  /** etiket merkezi (dünya) ve dönüşü: kartın dönüşünü izler, yay boyunca tek taban çizgisi */
  x: number;
  y: number;
  rot: number;
  /** yazı boyu (px); etiket genişliği şeride sığar */
  fs: number;
  label: string;
  vale: boolean;
  /** tahmini kutu (px) */
  w: number;
  h: number;
}

const quad = (cx: number, cy: number, w: number, h: number, rotDeg: number): number[][] => {
  const a = (rotDeg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * co - y * si, cy + x * si + y * co]);
};
/** İki döndürülmüş dörtgen `gap` px'ten yakın mı (ayırıcı eksen testi; dörtgenler dikdörtgen) */
function quadsNear(A: number[][], B: number[][], gap: number): boolean {
  for (const P of [A, B]) for (let i = 0; i < 2; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1, ax = [-(y1 - y0) / L, (x1 - x0) / L];
    const pr = (Q: number[][]) => { const v = Q.map(([x, y]) => x * ax[0] + y * ax[1]); return [Math.min(...v), Math.max(...v)]; };
    const [a0, a1] = pr(A), [b0, b1] = pr(B);
    if (Math.min(a1, b1) - Math.max(a0, b0) <= -gap) return false;
  }
  return true;
}

/**
 * Kart başına TEK etiket: kartın açıkta kalan şeridinin (sol şerit) alt kısmında, kartla birlikte dönerek (yay boyunca tek taban
 * çizgisi). Genişliği şeride sığar ve komşu etiketle ≥1.5 px boşluk bırakır (döndürülmüş kutular gerçekten ölçülür; sığmazsa yazı
 * küçülür) → ne komşu etiketle ne başka kartın değer/takım köşesiyle (üst-sol) çakışır. Vale: altın "VALE +20", şeride okunur
 * boyda sığmazsa altın "+20"; diğerleri "+10".
 */
export function vitrinTags(fan: FanLayout, vale: readonly boolean[], u: number): TagPlan[] {
  const n = fan.poses.length;
  const strip = n > 1 ? fan.step : fan.w * 0.82; // tek kartta kartın tamamı açıkta: etiket altta ortada
  const avail = Math.max(16, strip - 3);
  const em = (chars: number) => chars * 0.56 + 0.95; // genişlik (em): metin + dolgu + halka
  const fs0 = u * 0.86;
  const make = (long: boolean, k: number): TagPlan[] => {
    const fsPlain = Math.min(fs0, avail / em(3)) * k, fsLong = Math.min(fs0, avail / em(8)) * k;
    const fsPlainUsed = long ? Math.min(fsPlain, fsLong * 1.15) : fsPlain; // "VALE +20" ile aynı ölçekte kalsın (en çok %15 büyük)
    return fan.poses.map((p, i) => {
      const v = vale[i];
      const label = v ? (long ? 'VALE +20' : '+20') : '+10';
      const fs = v && long ? fsLong : fsPlainUsed;
      const w = em(label.length) * fs, h = fs * 1.62;
      const a = (p.r * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
      const lx = n > 1 ? -fan.w / 2 + strip / 2 : 0, ly = fan.h / 2 - h / 2 - 5;
      return {x: p.x + lx * co - ly * si, y: p.y + lx * si + ly * co, rot: p.r, fs, label, vale: v, w, h};
    });
  };
  const clash = (t: TagPlan[]): boolean => {
    const q = t.map(x => quad(x.x, x.y, x.w, x.h, x.rot));
    for (let i = 0; i + 1 < q.length; i++) for (let j = i + 1; j < Math.min(q.length, i + 3); j++) if (quadsNear(q[i], q[j], 1.5)) return true;
    return false;
  };
  const fit = (long: boolean): TagPlan[] => {
    let k = 1, t = make(long, k);
    for (let it = 0; it < 24 && clash(t); it++) t = make(long, (k *= 0.96));
    return t;
  };
  const plain = fit(false);
  if (!vale.some(Boolean)) return plain;
  const long = fit(true);
  const fsL = Math.min(...long.filter(x => x.vale).map(x => x.fs)), fsP = Math.min(...plain.map(x => x.fs));
  return fsL >= Math.max(8.4, fsP * 0.7) ? long : plain;
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
