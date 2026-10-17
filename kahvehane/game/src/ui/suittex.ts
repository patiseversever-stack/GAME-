// Tuval dokuları için takım simgeleri ve CSS gradyanı çizimi (ör. VS yarımları/şeritleri, src/ui/intro.ts).
// Neden tuval: büyük, eğik (skew) ve ekrandan geniş canlandırılan katmanlar Chrome'da ekran çözünürlüğünde ve TAM karolarla
// (dpr 2,6 telefonda 544×608 px'lik karolar) taranır: ekranın %130'u genişliğinde bir yarım ≈ 16 MB, dört şerit ≈ 40 MB
// görünür karo belleği. Aynı görünüm, kendi piksel boyutunda bir doku olan <canvas> ile ≈ 3–5 MB (bkz. src/platform/tex.ts).
import {SUIT, SUIT_TILE_ITEMS, type SuitKey} from './icons';

const paths = new Map<SuitKey, Path2D | null>();
/** Takım simgesi (24×24 görünüm kutusu) Path2D olarak: icons.ts SUIT'teki path ve daireler. Path2D yoksa null. */
export function suitPath(k: SuitKey): Path2D | null {
  if (paths.has(k)) return paths.get(k)!;
  let p: Path2D | null = null;
  try {
    p = new Path2D();
    for (const m of SUIT[k].matchAll(/<(path|circle)\s([^>]*)\/>/g)) {
      const at = (n: string): string => new RegExp(`${n}="([^"]*)"`).exec(m[2])?.[1] ?? '';
      if (m[1] === 'path') p.addPath(new Path2D(at('d')));
      else {
        const cx = +at('cx'), cy = +at('cy'), r = +at('r');
        const c = new Path2D();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        p.addPath(c);
      }
    }
  } catch {
    p = null;
  }
  paths.set(k, p);
  return p;
}

const tiles = new Map<number, HTMLCanvasElement | null>();
/** Dağınık takım deseni döşemesi (SUIT_TILE ile aynı yerleşim), `px` piksel kenarlı beyaz tuval. Önbellekli. */
export function suitTile(px: number): HTMLCanvasElement | null {
  const n = Math.max(8, Math.round(px));
  if (tiles.has(n)) return tiles.get(n)!;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  let ok = !!g;
  if (g) {
    g.scale(n / 240, n / 240);
    g.fillStyle = '#fff';
    for (const [k, x, y, sc, r] of SUIT_TILE_ITEMS) {
      const p = suitPath(k);
      if (!p) {
        ok = false;
        break;
      }
      g.save();
      g.translate(x, y);
      g.rotate((r * Math.PI) / 180);
      g.scale(sc, sc);
      g.translate(-12, -12);
      g.fill(p);
      g.restore();
    }
  }
  const out = ok ? c : null;
  tiles.set(n, out);
  return out;
}

/** Virgülle ayır (parantez içindekiler hariç): "rgba(1, 2, 3, .4) 10%, #fff" → 2 parça. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let d = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') d++;
    else if (ch === ')') d--;
    if (ch === ',' && d === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const SIDES: Record<string, number> = {'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270};
/**
 * CSS `linear-gradient(<açı>deg | to <yön>, renk [konum%], …)` → w×h kutusu için aynı geometride tuval gradyanı
 * (gradyan çizgisi uzunluğu |w·sin a| + |h·cos a|, merkezden). Tanınmazsa null.
 */
export function cssLinear(g: CanvasRenderingContext2D, css: string, w: number, h: number): CanvasGradient | null {
  const m = /linear-gradient\(([\s\S]*)\)\s*$/.exec(css.trim());
  if (!m) return null;
  const parts = splitTop(m[1]);
  let ang = 180;
  if (/^-?[\d.]+deg$/.test(parts[0])) ang = parseFloat(parts.shift()!);
  else if (parts[0] in SIDES) ang = SIDES[parts.shift()!];
  if (parts.length < 2) return null;
  const stops = parts.map(p => {
    const mm = /^([\s\S]*?)(?:\s+(-?[\d.]+)%)?$/.exec(p)!;
    return [mm[1].trim(), mm[2] !== undefined ? parseFloat(mm[2]) / 100 : NaN] as [string, number];
  });
  if (isNaN(stops[0][1])) stops[0][1] = 0;
  if (isNaN(stops[stops.length - 1][1])) stops[stops.length - 1][1] = 1;
  for (let i = 1; i < stops.length - 1; i++)
    if (isNaN(stops[i][1])) {
      let j = i;
      while (isNaN(stops[j][1])) j++;
      const a = stops[i - 1][1], b = stops[j][1];
      for (let k = i; k < j; k++) stops[k][1] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
    }
  const r = (ang * Math.PI) / 180, dx = Math.sin(r), dy = -Math.cos(r);
  const L = Math.abs(w * dx) + Math.abs(h * dy);
  const gr = g.createLinearGradient(w / 2 - (dx * L) / 2, h / 2 - (dy * L) / 2, w / 2 + (dx * L) / 2, h / 2 + (dy * L) / 2);
  let last = 0;
  try {
    for (const [c, o] of stops) {
      const t = Math.max(last, Math.min(1, o));
      gr.addColorStop(t, c);
      last = t;
    }
  } catch {
    return null; // tanınmayan renk
  }
  return gr;
}
