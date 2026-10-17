// Deste yapım takımı: koleksiyon desteleri (ebru, kapadokya, bogaz) bunu kullanır.
//
// · İş (Job): boyamalar üreteç (generator) olarak yazılır; `due()` dilim süresi dolunca `yield` eder. `runJob` her
//   yield'de ana iş parçacığına nefes verir (dokunuş/animasyon aksamaz, tek görev ≤ ~10 ms), `runJobSync` aynı işi
//   kesintisiz koşar (yalnız acil yedek yol).
// · defineSkin: prepare() sanatı (önceden boyanmış tuvaller) bir kez üretir; kart çizimi yalnız kopyalar + vektör yazı.
//   Son çizimden IDLE_MS sonra tuvaller serbest bırakılır (market önizlemeleri gezilirken bellek birikmesin);
//   sonraki prepare() yeniden boyar.
// · Ortak çizim: takım şekilleri (birim kutu), değer yazısı (yazı tipi ölçülü, ortalanmış), köşe dizinleri, kart yolu.
import {yieldToMain} from '../platform/sched';
import type {Skin, Suit} from './contract';

export type {Suit};
export type RGB = readonly [number, number, number];
export type Ctx = CanvasRenderingContext2D;
export type Rnd = () => number;

// ───────────────────────── iş dilimleri ─────────────────────────
export type Job<T = void> = Generator<void, T, void>;
const SLICE = 7; // ms — 1× hızda dilim; 4× yavaş telefonda bile tek görev ~30 ms
let sliceStart = 0;
let syncRun = 0;
/** Dilim süresi doldu mu? (üreteç içinde: `if (due()) yield;`) */
export const due = (): boolean => syncRun === 0 && performance.now() - sliceStart > SLICE;

export async function runJob<T>(job: Job<T>): Promise<T> {
  sliceStart = performance.now();
  let r = job.next();
  while (!r.done) {
    await yieldToMain();
    sliceStart = performance.now();
    r = job.next();
  }
  return r.value;
}
export function runJobSync<T>(job: Job<T>): T {
  syncRun++;
  try {
    let r = job.next();
    while (!r.done) r = job.next();
    return r.value;
  } finally {
    syncRun--;
  }
}

// ───────────────────────── küçük yardımcılar ─────────────────────────
export function mulberry(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c: RGB, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const lighten = (c: RGB, t: number): RGB => mix(c, [255, 255, 255], t);
export const darken = (c: RGB, t: number): RGB => mix(c, [0, 0, 0], t);
export function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
export function pick<T>(arr: readonly T[], rnd: Rnd): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
}
export function jit(c: RGB, amt: number, rnd: Rnd): RGB {
  const k = (rnd() - 0.5) * 2 * amt;
  return [clamp(c[0] + k, 0, 255), clamp(c[1] + k, 0, 255), clamp(c[2] + k, 0, 255)];
}
export function hex(s: string): RGB {
  const v = parseInt(s.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  return [c, g];
}

export function roundRect(p: Path2D | Ctx, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
}
export function rrPath(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  roundRect(p, x, y, w, h, r);
  return p;
}
/** Kartın dış yolu (köşe yarıçapı = 0.08·w) */
export const cardPath = (w: number, h: number, inset = 0): Path2D => rrPath(inset, inset, w - inset * 2, h - inset * 2, Math.max(0, 0.08 * w - inset));

/** Doğrusal degrade kısayolu */
export function lin(g: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}
export function rad(g: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}
/** Cilalı altın (yatay-çapraz bantlı) */
export const goldStops: [number, string][] = [
  [0, '#fff3c4'],
  [0.18, '#f4c84a'],
  [0.38, '#a8690f'],
  [0.55, '#ffe7a0'],
  [0.72, '#d49a2a'],
  [0.88, '#8a5a12'],
  [1, '#f2d47c'],
];
export const gold = (g: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient => lin(g, x0, y0, x1, y1, goldStops);

/** Tuvali serbest bırak (bellek payı hemen geri verilir). */
export function freeArt(o: unknown, seen = new Set<unknown>()): void {
  if (!o || typeof o !== 'object' || seen.has(o)) return;
  seen.add(o);
  if (o instanceof HTMLCanvasElement) {
    o.width = o.height = 0;
    return;
  }
  for (const v of Object.values(o as Record<string, unknown>)) freeArt(v, seen);
}

// ───────────────────────── takım şekilleri (birim kutu, merkez 0,0, genişlik ≈ 1) ─────────────────────────
function heartPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0.47);
  p.bezierCurveTo(-0.15, 0.33, -0.5, 0.13, -0.5, -0.15);
  p.bezierCurveTo(-0.5, -0.36, -0.355, -0.47, -0.235, -0.47);
  p.bezierCurveTo(-0.115, -0.47, -0.03, -0.395, 0, -0.29);
  p.bezierCurveTo(0.03, -0.395, 0.115, -0.47, 0.235, -0.47);
  p.bezierCurveTo(0.355, -0.47, 0.5, -0.36, 0.5, -0.15);
  p.bezierCurveTo(0.5, 0.13, 0.15, 0.33, 0, 0.47);
  p.closePath();
  return p;
}
function spadePath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.55);
  p.bezierCurveTo(0.13, -0.38, 0.5, -0.2, 0.5, 0.07);
  p.bezierCurveTo(0.5, 0.27, 0.37, 0.37, 0.235, 0.37);
  p.bezierCurveTo(0.15, 0.37, 0.085, 0.335, 0.05, 0.28);
  p.bezierCurveTo(0.06, 0.4, 0.12, 0.48, 0.21, 0.54);
  p.lineTo(-0.21, 0.54);
  p.bezierCurveTo(-0.12, 0.48, -0.06, 0.4, -0.05, 0.28);
  p.bezierCurveTo(-0.085, 0.335, -0.15, 0.37, -0.235, 0.37);
  p.bezierCurveTo(-0.37, 0.37, -0.5, 0.27, -0.5, 0.07);
  p.bezierCurveTo(-0.5, -0.2, -0.13, -0.38, 0, -0.55);
  p.closePath();
  return p;
}
function diamondPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.58);
  p.quadraticCurveTo(0.24, -0.3, 0.45, 0);
  p.quadraticCurveTo(0.24, 0.3, 0, 0.58);
  p.quadraticCurveTo(-0.24, 0.3, -0.45, 0);
  p.quadraticCurveTo(-0.24, -0.3, 0, -0.58);
  p.closePath();
  return p;
}
function clubPath(): Path2D {
  const p = new Path2D();
  const r = 0.245;
  const circ = (x: number, y: number): void => {
    p.moveTo(x + r, y);
    p.arc(x, y, r, 0, Math.PI * 2);
  };
  circ(0, -0.255);
  circ(-0.255, 0.075);
  circ(0.255, 0.075);
  p.moveTo(0, -0.255);
  p.lineTo(0.255, 0.075);
  p.lineTo(0, 0.16);
  p.lineTo(-0.255, 0.075);
  p.closePath();
  p.moveTo(0.06, 0.0);
  p.bezierCurveTo(0.055, 0.3, 0.11, 0.46, 0.21, 0.54);
  p.lineTo(-0.21, 0.54);
  p.bezierCurveTo(-0.11, 0.46, -0.055, 0.3, -0.06, 0.0);
  p.closePath();
  return p;
}
let SP: Record<Suit, Path2D> | null = null;
/** Takım şeklinin birim yolu (ilk çağrıda kurulur). */
export function suitPath(s: Suit): Path2D {
  if (!SP) SP = {S: spadePath(), H: heartPath(), D: diamondPath(), C: clubPath()};
  return SP[s];
}
let OUT: Partial<Record<Suit, Path2D>> = {};
/**
 * Takımın TEK parça dış hattı (birim yol). Sinek üç daire + saptan oluşur: kontur çizilince içteki kesişim yayları
 * görünür; tüp / altın kenar gibi yalnız dış hattı isteyen çizimler için şekil maskeden izlenir (bir kez).
 */
export function suitOutline(s: Suit): Path2D {
  const hit = OUT[s];
  if (hit) return hit;
  if (s !== 'C') return (OUT[s] = suitPath(s));
  const N = 240, k = N * 0.8;
  // okunacak tuval yazılımda (willReadFrequently): getImageData GPU'dan eşzamanlı geri okuma beklemez
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d', {willReadFrequently: true})!;
  g.setTransform(k, 0, 0, k, N / 2, N / 2);
  g.fill(suitPath(s));
  const d = g.getImageData(0, 0, N, N).data;
  c.width = c.height = 0;
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < N && y < N && d[(y * N + x) * 4 + 3] > 127;
  // Moore komşuluk izleme
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (inside(x, y)) {
        sx = x;
        sy = y;
        break outer;
      }
  const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const pts: number[] = [];
  let x = sx, y = sy, dir = 7;
  for (let guard = 0; guard < N * 16; guard++) {
    pts.push(x, y);
    let found = false;
    for (let i = 0; i < 8; i++) {
      const nd = (dir + 6 + i) % 8;
      const nx = x + DX[nd], ny = y + DY[nd];
      if (inside(nx, ny)) {
        x = nx;
        y = ny;
        dir = nd;
        found = true;
        break;
      }
    }
    if (!found || (x === sx && y === sy && pts.length > 8)) break;
  }
  // yumuşat (kayan ortalama) + seyrelt
  const n = pts.length >> 1;
  const p = new Path2D();
  const W = 3;
  for (let i = 0; i < n; i += 2) {
    let ax = 0, ay = 0;
    for (let j = -W; j <= W; j++) {
      const q = ((i + j + n) % n) * 2;
      ax += pts[q];
      ay += pts[q + 1];
    }
    ax = (ax / (2 * W + 1) + 0.5 - N / 2) / k;
    ay = (ay / (2 * W + 1) + 0.5 - N / 2) / k;
    if (i === 0) p.moveTo(ax, ay);
    else p.lineTo(ax, ay);
  }
  p.closePath();
  return (OUT[s] = p);
}

/** Takım şeklinin dış hatları (sağ/sol uç, üst/alt) — birim kutuda */
export const SUIT_BOX: Record<Suit, {t: number; b: number; hw: number}> = {
  H: {t: -0.47, b: 0.47, hw: 0.5},
  S: {t: -0.55, b: 0.54, hw: 0.5},
  D: {t: -0.58, b: 0.58, hw: 0.45},
  C: {t: -0.5, b: 0.54, hw: 0.5},
};
/** Büyük takım işaretinin içindeki değerin dikey yeri (birim) */
export const SUIT_TY: Record<Suit, number> = {H: -0.07, C: -0.04, S: 0.04, D: 0};
export const isRed = (s: Suit): boolean => s === 'H' || s === 'D';
export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
export const LABEL = (r: number): string => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));

/** Takım şeklini (birim yol) bir noktaya ölçekleyerek uygula: fn içinde yol birim koordinatlarda. */
export function withSuit(g: Ctx, s: Suit, cx: number, cy: number, size: number, fn: (p: Path2D) => void): void {
  g.save();
  g.translate(cx, cy);
  g.scale(size, size);
  fn(suitPath(s));
  g.restore();
}
export function fillSuit(g: Ctx, s: Suit, cx: number, cy: number, size: number, fill: string | CanvasGradient | CanvasPattern): void {
  withSuit(g, s, cx, cy, size, p => {
    g.fillStyle = fill;
    g.fill(p);
  });
}

// ───────────────────────── değer yazısı ─────────────────────────
/** Ölçülü yazı: büyük harf yüksekliği kesin, mürekkep ortalanmış; dar alana sığmazsa yatayda sıkışır. */
export class RankFont {
  private cap = 71;
  private gl: Record<string, {l: number; r: number}> = {};
  constructor(private font: (px: number) => string) {}
  measure(): void {
    const [, g] = makeCanvas(4, 4);
    g.font = this.font(100);
    this.cap = g.measureText('H').actualBoundingBoxAscent || 71;
    for (let r = 1; r <= 13; r++) {
      const t = LABEL(r);
      const m = g.measureText(t);
      this.gl[t] = {l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight};
    }
  }
  /** Yazı yolu kurulur ve `paint(g)` çağrılır (g.fillText/strokeText ile kullanılmak üzere konum ayarlıdır). */
  place(g: Ctx, t: string, cx: number, top: number, capH: number, maxW: number, paint: (x: number) => void, spacing = 0): void {
    const fs = (capH * 100) / this.cap;
    const k = fs / 100;
    const m = this.gl[t] ?? {l: 30, r: 30};
    const inkW = (m.l + m.r) * k;
    const sx = Math.min(1, maxW / inkW);
    g.save();
    g.translate(cx, top + capH);
    g.scale(sx, 1);
    g.font = this.font(fs);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    if (spacing) (g as Ctx & {letterSpacing?: string}).letterSpacing = `${spacing * fs}px`;
    paint(((m.l - m.r) / 2) * k);
    g.restore();
  }
  /** Dolgu + isteğe bağlı kontur (kontur önce, yarım kalınlık dışta kalır). */
  draw(g: Ctx, t: string, cx: number, top: number, capH: number, maxW: number, fill: string | CanvasGradient, stroke?: string | CanvasGradient, lw = 0): void {
    this.place(g, t, cx, top, capH, maxW, x => {
      if (stroke && lw > 0) {
        g.lineJoin = 'round';
        g.lineWidth = lw;
        g.strokeStyle = stroke;
        g.strokeText(t, x, 0);
      }
      g.fillStyle = fill;
      g.fillText(t, x, 0);
    });
  }
}

// ───────────────────────── köşe dizinleri ─────────────────────────
// Yelpazede kartın yalnız sol ≈ %40'ı görünür: değer iri (kart yüksekliğinin ~%17'si), altında takım işareti.
export interface CornerSpec {
  font: RankFont;
  /** değer ekseni x (w oranı) */
  x?: number;
  /** değerin üstü (w oranı) */
  top?: number;
  /** büyük harf yüksekliği (w oranı) */
  cap?: number;
  /** takım işareti boyu (w oranı) */
  pip?: number;
  /** değer ile işaret arası (w oranı) */
  gap?: number;
  /** 10 için yatay sınır (w oranı) */
  wide?: number;
  rank: (g: Ctx, t: string, cx: number, top: number, cap: number, maxW: number, s: Suit) => void;
  pipDraw: (g: Ctx, s: Suit, cx: number, cy: number, size: number) => void;
}
export function corners(g: Ctx, w: number, h: number, s: Suit, r: number, c: CornerSpec): void {
  const t = LABEL(r);
  const X = (c.x ?? 0.2) * w, TOP = (c.top ?? 0.075) * w, CAP = (c.cap ?? 0.245) * w, PIP = (c.pip ?? 0.17) * w, GAP = (c.gap ?? 0.05) * w;
  for (let flip = 0; flip < 2; flip++) {
    g.save();
    if (flip) {
      g.translate(w, h);
      g.rotate(Math.PI);
    }
    c.rank(g, t, X, TOP, CAP, (t.length > 1 ? c.wide ?? 0.31 : 0.27) * w, s);
    c.pipDraw(g, s, X, TOP + CAP + GAP + PIP * 0.55, PIP);
    g.restore();
  }
}

/** Kartın kenarına ince koyu çizgi (masada kenar belli olsun). */
export function edge(g: Ctx, w: number, h: number, col = 'rgba(8,12,40,0.7)', k = 0.012): void {
  const lw = Math.max(1, k * w);
  g.save();
  g.lineWidth = lw;
  g.strokeStyle = col;
  g.stroke(cardPath(w, h, lw / 2));
  g.restore();
}

// ───────────────────────── deste tanımı ─────────────────────────
export interface SkinDef<A extends object> {
  id: string;
  name: string;
  desc: string;
  /** yazı tiplerini yükle (bir kez) */
  fonts?: () => Promise<void>;
  /** sanatı üret: önceden boyanmış tuvaller vb. (dilimli) */
  paint: () => Job<A>;
  face: (g: Ctx, w: number, h: number, s: Suit, r: number, art: A) => void;
  back: (g: Ctx, w: number, h: number, art: A) => void;
}
const IDLE_MS = 15000;

export function defineSkin<A extends object>(d: SkinDef<A>): Skin {
  let art: A | null = null;
  let ready: Promise<void> | null = null;
  let fontsP: Promise<void> | null = null;
  let timer = 0;
  let epoch = 0;
  const release = (): void => {
    if (!art) return;
    freeArt(art);
    art = null;
    ready = null;
    epoch++;
  };
  const touch = (): void => {
    clearTimeout(timer);
    timer = window.setTimeout(release, IDLE_MS);
  };
  const ensure = (): A => {
    if (!art) art = runJobSync(d.paint()); // yedek: prepare beklenmeden çizim istendi
    touch();
    return art;
  };
  return {
    id: d.id,
    name: d.name,
    desc: d.desc,
    prepare(): Promise<void> {
      if (!ready) {
        const gen = ++epoch;
        ready = (async () => {
          fontsP ??= (d.fonts?.() ?? Promise.resolve()).catch(() => undefined);
          await fontsP;
          const a = await runJob(d.paint());
          if (gen !== epoch || art) {
            freeArt(a); // bu arada serbest bırakıldı ya da yedek yol zaten boyadı
            return;
          }
          art = a;
          touch();
        })();
      }
      return ready;
    },
    drawFace(g, w, h, s, r) {
      d.face(g, w, h, s, r, ensure());
    },
    drawBack(g, w, h) {
      d.back(g, w, h, ensure());
    },
  };
}

/** Yazı tipi yükleyici: CSS modülü + belge yazı tipi. */
export async function loadFont(css: () => Promise<unknown>, spec: string, sample = 'AJQK0123456789'): Promise<void> {
  try {
    await css();
    await document.fonts.load(spec, sample);
  } catch {
    /* yedek yazı tipi */
  }
}

// ───────────────────────── ortak süsler ─────────────────────────
/** Dört kollu parıltı (yıldız ışıltısı) */
export function sparkle(g: Ctx, x: number, y: number, r: number, col = 'rgba(255,255,255,0.95)', thin = 0.16): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const b = a + Math.PI / 4;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    g.lineTo(Math.cos(b) * r * thin, Math.sin(b) * r * thin);
  }
  g.closePath();
  g.fill();
  g.restore();
}

/** Parlak taş (küre ışıklı) */
export function jewel(g: Ctx, x: number, y: number, r: number, col: string, ink = '#3a2206'): void {
  g.save();
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath();
  g.arc(x + r * 0.18, y + r * 0.2, r * 0.78, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = col;
  g.beginPath();
  g.arc(x - r * 0.08, y - r * 0.08, r * 0.7, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = Math.max(0.8, r * 0.22);
  g.strokeStyle = ink;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath();
  g.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Altın taç: bant + beş diş, uçlarda inci, bantta taşlar. by = bandın altı, w = genişlik. */
export function crown(g: Ctx, cx: number, by: number, w: number, gems: [string, string] = ['#d01b3a', '#2a6bf0'], ink = '#3a2206'): void {
  const h = w * 0.62, bandH = w * 0.2, top = by - bandH;
  const tipH = [0.6, 0.76, 1, 0.76, 0.6];
  const tips = [-0.5, -0.25, 0, 0.25, 0.5].map((u, i) => [cx + u * w, top - h * tipH[i]] as const);
  const p = new Path2D();
  p.moveTo(cx - w * 0.5, by);
  p.lineTo(cx - w * 0.5, top);
  p.lineTo(tips[0][0], tips[0][1]);
  for (let i = 0; i < 4; i++) {
    const mx = (tips[i][0] + tips[i + 1][0]) / 2;
    p.quadraticCurveTo(mx, top + h * 0.02, tips[i + 1][0], tips[i + 1][1]);
  }
  p.lineTo(cx + w * 0.5, top);
  p.lineTo(cx + w * 0.5, by);
  p.closePath();
  g.save();
  g.fillStyle = gold(g, cx - w * 0.5, top - h, cx + w * 0.5, by);
  g.fill(p);
  // iç gölge: alt bant koyu
  g.fillStyle = lin(g, 0, top - h, 0, by, [
    [0, 'rgba(255,255,230,0.25)'],
    [0.6, 'rgba(0,0,0,0)'],
    [1, 'rgba(60,30,0,0.35)'],
  ]);
  g.fill(p);
  g.lineWidth = Math.max(1, w * 0.035);
  g.lineJoin = 'round';
  g.strokeStyle = ink;
  g.stroke(p);
  g.beginPath();
  g.moveTo(cx - w * 0.5, top);
  g.lineTo(cx + w * 0.5, top);
  g.stroke();
  for (const [x, y] of tips) jewel(g, x, y, w * 0.06, '#fff6dc', ink);
  jewel(g, cx, by - bandH / 2, w * 0.085, gems[0], ink);
  jewel(g, cx - w * 0.3, by - bandH / 2, w * 0.06, gems[1], ink);
  jewel(g, cx + w * 0.3, by - bandH / 2, w * 0.06, gems[1], ink);
  g.restore();
}

/** Yumuşak ışık lekesi */
export function glow(g: Ctx, x: number, y: number, r: number, col: RGB, a: number, sx = 1, sy = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  g.fillStyle = rad(g, 0, 0, 0, r, [
    [0, css(col, a)],
    [0.45, css(col, a * 0.4)],
    [1, css(col, 0)],
  ]);
  g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
}

/** İnce kâğıt/sır greni: küçük gürültü karosu desen olarak tekrarlanır. */
export function grain(g: Ctx, W: number, H: number, rnd: Rnd, amt: number, size = 96): void {
  const [c, cg] = makeCanvas(size, size);
  const img = cg.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = (rnd() * amt * 255) | 0;
  }
  cg.putImageData(img, 0, 0);
  g.save();
  g.fillStyle = g.createPattern(c, 'repeat')!;
  g.fillRect(0, 0, W, H);
  g.restore();
}
