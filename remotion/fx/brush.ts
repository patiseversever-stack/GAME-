// Değişken kalınlıklı fırça / kalem izi. Bir SVG yolunu bir kez örnekler (önbellek), sonra yolun [0,p] kısmını
// uçlarda incelen dolu bir şekil olarak üretir. Mürekkep fırçası, tüy kalem ve tebeşir aynı yardımcıyı kullanır.
import { getLength, getPointAtLength, getTangentAtLength } from '@remotion/paths';

type Sample = { x: number; y: number; nx: number; ny: number };
export type BrushSamples = { readonly pts: Sample[]; readonly L: number };

const cache = new Map<string, BrushSamples>();

export function sampleBrush(d: string, n = 64): BrushSamples {
  const key = `${n}|${d}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const L = getLength(d);
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const l = Math.min(L, (L * i) / n);
    const p = getPointAtLength(d, l) ?? { x: 0, y: 0 }, tg = getTangentAtLength(d, l) ?? { x: 1, y: 0 };
    const tl = Math.hypot(tg.x, tg.y) || 1;
    return { x: p.x, y: p.y, nx: -tg.y / tl, ny: tg.x / tl };
  });
  const r = { pts, L };
  cache.set(key, r);
  return r;
}

const ease = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };

// genişlik profili (s: 0..1): baskıyla kalınlaşan baş, incelen kuyruk
export const brushProfile = (s: number, head = 0.16, tail = 0.32, min = 0.16) =>
  min + (1 - min) * ease(s / head) * (0.35 + 0.65 * ease((1 - s) / tail));

export type BrushShape = { d: string; tip: { x: number; y: number; r: number } | null };

export function brushOutline(bs: BrushSamples, w: number, p: number, prof: (s: number) => number = brushProfile, wobble?: (s: number) => number): BrushShape {
  if (p <= 0) return { d: '', tip: null };
  const n = bs.pts.length - 1;
  const q = Math.min(1, p);
  const k = Math.min(n, Math.floor(q * n));
  const Ls: string[] = [], Rs: string[] = [];
  let tip: BrushShape['tip'] = null;
  const push = (x: number, y: number, nx: number, ny: number, s: number) => {
    const hw = (w * prof(s) * (wobble ? wobble(s) : 1)) / 2;
    Ls.push(`${(x + nx * hw).toFixed(1)} ${(y + ny * hw).toFixed(1)}`);
    Rs.push(`${(x - nx * hw).toFixed(1)} ${(y - ny * hw).toFixed(1)}`);
    tip = { x, y, r: hw };
  };
  for (let i = 0; i <= k; i++) { const a = bs.pts[i]; push(a.x, a.y, a.nx, a.ny, i / n); }
  if (k < n) {
    const a = bs.pts[k], b = bs.pts[k + 1], f = q * n - k;
    push(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.nx + (b.nx - a.nx) * f, a.ny + (b.ny - a.ny) * f, q);
  }
  return { d: `M${Ls.join(' L')} L${Rs.reverse().join(' L')} Z`, tip: q < 1 ? tip : null };
}

// yolda p konumundaki nokta (kalem ucunu taşımak için)
export function pointOn(bs: BrushSamples, p: number) {
  const n = bs.pts.length - 1, q = Math.max(0, Math.min(1, p)), k = Math.min(n - 1, Math.floor(q * n)), f = q * n - k;
  const a = bs.pts[k], b = bs.pts[k + 1];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, nx: a.nx, ny: a.ny };
}
