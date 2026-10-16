// Deste "Neon Kahvehane": gece yarısı tuğla duvarda yanan neon tabelalar. Dört renk tüp (♥ pembe-kırmızı, ♦ kehribar,
// ♣ yeşil, ♠ camgöbeği): beyaz-sıcak çekirdek + renkli hale (katmanlı çizgi, 'lighter' karışımı; bulanıklık yok → hızlı).
//   · sayılar: neon tüp takım silüeti, içinde neon değer · As: çift tüplü dev işaret + ışın patlaması
//   · Papaz: neon taç tabelası · Kız: neon lale · Vale: buharı tüten neon çay bardağı, dört renk halka
//   · arka: tuğla duvarda eğik "PİŞTİ" neon tabelası, altında çay bardağı, köşelerde dört takım
import {
  cardPath, css, defineSkin, glow, lin, loadFont, makeCanvas, mix, mulberry, rad, RankFont, rrPath, sparkle, SUIT_TY, suitOutline, SUITS,
  type Ctx, type Job, type RGB, type Suit, due, grain,
} from './kit';

export const FONT = (px: number): string => `400 ${px}px "Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif`;
const RF = new RankFont(FONT);
const PW = 360, PH = Math.round(PW / 0.7);
const WHITE: RGB = [255, 255, 255];
export const NEON: Record<Suit, RGB> = {H: [255, 46, 99], D: [255, 190, 40], C: [40, 255, 136], S: [46, 196, 255]};
export const PINK: RGB = [255, 60, 190], AMBER: RGB = [255, 170, 40], VIOLET: RGB = [170, 90, 255];

interface Art {
  /** takım başına: duvar + ortam ışığı + neon çerçeve (kart boyu) */
  frame: Record<Suit, HTMLCanvasElement>;
  /** takım başına: büyük neon silüet (sayılar), As çift tüpü, köşe işareti */
  big: Record<Suit, HTMLCanvasElement>;
  ace: Record<Suit, HTMLCanvasElement>;
  pip: Record<Suit, HTMLCanvasElement>;
  court: Record<number, HTMLCanvasElement>;
  back: HTMLCanvasElement;
}

/** Takım silüetini birim yoldan çiz (dış hat) */
export function withOutline(g: Ctx, s: Suit, cx: number, cy: number, size: number, fn: (p: Path2D) => void): void {
  g.save();
  g.translate(cx, cy);
  g.scale(size, size);
  fn(suitOutline(s));
  g.restore();
}
/** Kare sprite: takım `size` px, çevresinde hale payı */
function suitSprite(size: number, pad: number, draw: (g: Ctx, c: number) => void): HTMLCanvasElement {
  const S = Math.ceil(size + pad * 2);
  const [c, g] = makeCanvas(S, S);
  draw(g, S / 2);
  return c;
}

// ───────────────────────── neon tüp ─────────────────────────
/** Katmanlı neon: geniş soluk hale → dar parlak hale → renkli tüp → beyaz-sıcak çekirdek. `stroke` yolu çizer. */
export function tube(g: Ctx, stroke: () => void, col: RGB, lw: number, glowK = 1): void {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.globalCompositeOperation = 'lighter';
  for (const [k, a] of [
    [7, 0.045],
    [4.2, 0.08],
    [2.4, 0.2],
  ] as const) {
    g.lineWidth = lw * k * glowK;
    g.strokeStyle = css(col, a);
    stroke();
  }
  g.restore();
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = lw;
  g.strokeStyle = css(mix(col, WHITE, 0.15));
  stroke();
  g.lineWidth = lw * 0.42;
  g.strokeStyle = css(mix(col, WHITE, 0.8));
  stroke();
  g.restore();
}
export const tubePath = (g: Ctx, p: Path2D, col: RGB, lw: number, glowK = 1): void => tube(g, () => g.stroke(p), col, lw, glowK);

/** Neon değer yazısı: renkli hale + renkli kenar + beyaz-sıcak dolgu (küçük boyda da okunur). */
function neonRank(g: Ctx, t: string, cx: number, top: number, cap: number, maxW: number, col: RGB): void {
  RF.place(g, t, cx, top, cap, maxW, x => {
    g.lineJoin = 'round';
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const [k, a] of [
      [0.5, 0.07],
      [0.3, 0.14],
      [0.17, 0.32],
    ] as const) {
      g.lineWidth = cap * k;
      g.strokeStyle = css(col, a);
      g.strokeText(t, x, 0);
    }
    g.restore();
    g.lineWidth = cap * 0.1;
    g.strokeStyle = css(mix(col, WHITE, 0.1));
    g.strokeText(t, x, 0);
    g.fillStyle = css(mix(col, WHITE, 0.82));
    g.fillText(t, x, 0);
  });
}

/** Neon takım işareti (dolu çekirdekli küçük boy — köşe dizini) */
function neonPip(g: Ctx, s: Suit, cx: number, cy: number, size: number): void {
  const col = NEON[s];
  withOutline(g, s, cx, cy, size, p => {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineJoin = 'round';
    for (const [k, a] of [
      [0.5, 0.07],
      [0.28, 0.16],
      [0.14, 0.36],
    ] as const) {
      g.lineWidth = k;
      g.strokeStyle = css(col, a);
      g.stroke(p);
    }
    g.restore();
    g.lineWidth = 0.08;
    g.strokeStyle = css(col);
    g.stroke(p);
    g.fillStyle = css(mix(col, WHITE, 0.78));
    g.fill(p);
  });
}

// ───────────────────────── duvar ─────────────────────────
export function paintWall(w: number, h: number, seed: number, light: [number, number, RGB][]): HTMLCanvasElement {
  const [c, g] = makeCanvas(w, h);
  const rnd = mulberry(seed);
  g.fillStyle = '#07040d';
  g.fillRect(0, 0, w, h);
  const bh = w * 0.062, bw = bh * 2.3, mort = Math.max(1, bh * 0.12);
  for (let row = 0, y = -bh * 0.3; y < h; row++, y += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -off; x < w; x += bw) {
      const v = 18 + rnd() * 12;
      g.fillStyle = `rgb(${v + 10 + rnd() * 6},${v * 0.55},${v + 16 + rnd() * 8})`;
      g.beginPath();
      g.roundRect(x + mort / 2, y + mort / 2, bw - mort, bh - mort, bh * 0.12);
      g.fill();
      // tuğla yüzünde hafif ışık (üst kenar) ve gölge (alt kenar)
      g.fillStyle = 'rgba(255,200,255,0.035)';
      g.fillRect(x + mort, y + mort / 2, bw - mort * 2, bh * 0.18);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x + mort, y + bh - mort / 2 - bh * 0.16, bw - mort * 2, bh * 0.16);
    }
  }
  grain(g, w, h, rnd, 0.08);
  // neon ışığının duvara vuruşu (renkli ortam ışığı)
  g.globalCompositeOperation = 'lighter';
  for (const [x, y, col] of light) glow(g, x, y, Math.max(w, h) * 0.55, col, 0.16);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = rad(g, w / 2, h / 2, Math.min(w, h) * 0.3, Math.max(w, h) * 0.7, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(0,0,0,0.6)'],
  ]);
  g.fillRect(0, 0, w, h);
  return c;
}

// ───────────────────────── tabelalar (saray kartları) ─────────────────────────
const CW = 240, CH = 300;
function crownPath(cx: number, by: number, w: number): Path2D {
  const h = w * 0.6, top = by - w * 0.16;
  const p = new Path2D();
  p.moveTo(cx - w * 0.5, by);
  p.lineTo(cx - w * 0.5, top);
  p.lineTo(cx - w * 0.52, top - h * 0.72);
  p.lineTo(cx - w * 0.26, top - h * 0.3);
  p.lineTo(cx, top - h);
  p.lineTo(cx + w * 0.26, top - h * 0.3);
  p.lineTo(cx + w * 0.52, top - h * 0.72);
  p.lineTo(cx + w * 0.5, top);
  p.lineTo(cx + w * 0.5, by);
  p.closePath();
  p.moveTo(cx - w * 0.5, top);
  p.lineTo(cx + w * 0.5, top);
  return p;
}
export function* paintCourt(kind: 'K' | 'Q' | 'J'): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(CW, CH);
  const cx = CW / 2;
  if (kind === 'K') {
    // neon taç: kehribar tüp, uçlarda pembe toplar, bantta üç renkli nokta
    glow(g, cx, CH * 0.55, 120, AMBER, 0.12);
    tubePath(g, crownPath(cx, CH * 0.72, 160), AMBER, 5.5);
    for (const [dx, dy] of [[-0.52, -0.72], [0, -1], [0.52, -0.72]] as const) {
      const p = new Path2D();
      p.arc(cx + dx * 160, CH * 0.72 - 160 * 0.16 + dy * 160 * 0.6 - 10, 7, 0, Math.PI * 2);
      tubePath(g, p, PINK, 4);
    }
    // altında "kral" çizgisi: dalgalı alt çizgi
    const u = new Path2D();
    u.moveTo(cx - 70, CH * 0.85);
    u.bezierCurveTo(cx - 30, CH * 0.8, cx + 30, CH * 0.9, cx + 70, CH * 0.85);
    tubePath(g, u, VIOLET, 4);
  } else if (kind === 'Q') {
    // neon lale: pembe çiçek + yeşil sap ve iki yaprak
    glow(g, cx, CH * 0.4, 110, PINK, 0.12);
    const f = new Path2D();
    const y0 = CH * 0.52, y1 = CH * 0.16;
    f.moveTo(cx, y0);
    f.bezierCurveTo(cx - 62, y0 - 6, cx - 70, y1 + 40, cx - 46, y1);
    f.bezierCurveTo(cx - 34, y1 + 30, cx - 18, y1 + 30, cx - 12, y1 + 20);
    f.bezierCurveTo(cx - 8, y1 - 4, cx + 8, y1 - 4, cx + 12, y1 + 20);
    f.bezierCurveTo(cx + 18, y1 + 30, cx + 34, y1 + 30, cx + 46, y1);
    f.bezierCurveTo(cx + 70, y1 + 40, cx + 62, y0 - 6, cx, y0);
    tubePath(g, f, PINK, 5.5);
    const inner = new Path2D();
    inner.moveTo(cx, y0 - 18);
    inner.bezierCurveTo(cx - 14, y0 - 40, cx - 8, y1 + 50, cx, y1 + 34);
    inner.bezierCurveTo(cx + 8, y1 + 50, cx + 14, y0 - 40, cx, y0 - 18);
    tubePath(g, inner, [255, 150, 220], 3);
    const st = new Path2D();
    st.moveTo(cx, y0);
    st.bezierCurveTo(cx - 4, CH * 0.66, cx + 4, CH * 0.76, cx, CH * 0.88);
    st.moveTo(cx - 2, CH * 0.8);
    st.bezierCurveTo(cx - 40, CH * 0.78, cx - 60, CH * 0.66, cx - 52, CH * 0.58);
    st.bezierCurveTo(cx - 34, CH * 0.62, cx - 16, CH * 0.7, cx - 2, CH * 0.8);
    st.moveTo(cx + 2, CH * 0.74);
    st.bezierCurveTo(cx + 36, CH * 0.72, cx + 54, CH * 0.6, cx + 48, CH * 0.53);
    st.bezierCurveTo(cx + 30, CH * 0.56, cx + 14, CH * 0.64, cx + 2, CH * 0.74);
    tubePath(g, st, [60, 255, 140], 4.5);
  } else {
    // neon çay bardağı: ince belli bardak (kehribar), içinde çay, tabak, buhar
    glow(g, cx, CH * 0.55, 120, AMBER, 0.14);
    const top = CH * 0.3, bot = CH * 0.78, wt = 46, wm = 30, wb = 38;
    const glass = new Path2D();
    glass.moveTo(cx - wt, top);
    glass.bezierCurveTo(cx - wt, top + 40, cx - wm, (top + bot) / 2 - 20, cx - wm, (top + bot) / 2);
    glass.bezierCurveTo(cx - wm, (top + bot) / 2 + 24, cx - wb, bot - 26, cx - wb, bot);
    glass.lineTo(cx + wb, bot);
    glass.bezierCurveTo(cx + wb, bot - 26, cx + wm, (top + bot) / 2 + 24, cx + wm, (top + bot) / 2);
    glass.bezierCurveTo(cx + wm, (top + bot) / 2 - 20, cx + wt, top + 40, cx + wt, top);
    // çay dolgusu (yarı saydam kehribar)
    g.save();
    g.clip(glass);
    g.fillStyle = lin(g, 0, top + 18, 0, bot, [
      [0, 'rgba(255,120,30,0.28)'],
      [1, 'rgba(200,40,10,0.5)'],
    ]);
    g.fillRect(cx - 60, top + 18, 120, bot - top);
    g.restore();
    tubePath(g, glass, AMBER, 5);
    const lvl = new Path2D();
    lvl.moveTo(cx - wt + 4, top + 18);
    lvl.lineTo(cx + wt - 4, top + 18);
    tubePath(g, lvl, [255, 120, 40], 3);
    const plate = new Path2D();
    plate.ellipse(cx, bot + 10, 78, 13, 0, 0, Math.PI * 2);
    tubePath(g, plate, [46, 196, 255], 4.5);
    // kaşık
    const sp = new Path2D();
    sp.moveTo(cx + 56, bot + 6);
    sp.lineTo(cx + 92, bot - 14);
    tubePath(g, sp, [200, 210, 255], 3);
    // buhar
    for (const dx of [-20, 4, 26]) {
      const b = new Path2D();
      b.moveTo(cx + dx, top - 8);
      b.bezierCurveTo(cx + dx - 14, top - 28, cx + dx + 14, top - 44, cx + dx, top - 64);
      tubePath(g, b, [230, 230, 255], 3, 0.8);
    }
  }
  if (due()) yield;
  return c;
}

/** As arkası: ince ışın patlaması */
function paintBurst(): HTMLCanvasElement {
  const S = 300, C = S / 2;
  const [c, g] = makeCanvas(S, S);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? C * 0.72 : C * 0.98;
    g.strokeStyle = lin(g, C, C, C + Math.cos(a) * r, C + Math.sin(a) * r, [
      [0, 'rgba(255,255,255,0.5)'],
      [0.35, 'rgba(255,120,220,0.3)'],
      [1, 'rgba(120,60,255,0)'],
    ]);
    g.lineWidth = i % 2 ? 3 : 5;
    g.beginPath();
    g.moveTo(C + Math.cos(a) * C * 0.2, C + Math.sin(a) * C * 0.2);
    g.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r);
    g.stroke();
  }
  return c;
}

// ───────────────────────── arka ─────────────────────────
function* paintBack(): Job<HTMLCanvasElement> {
  const W = PW, H = PH, cx = W / 2;
  const wall = paintWall(W, H, 31, [
    [W * 0.5, H * 0.36, PINK],
    [W * 0.5, H * 0.72, AMBER],
  ]);
  const [c, g] = makeCanvas(W, H);
  g.drawImage(wall, 0, 0);
  wall.width = wall.height = 0;
  if (due()) yield;
  // tabela kutusu: ince mor tüp çerçeve
  tubePath(g, rrPath(26, 26, W - 52, H - 52, 24), VIOLET, 4);
  if (due()) yield;
  // "PİŞTİ" — eğik, pembe neon yazı
  g.save();
  g.translate(cx, H * 0.36);
  g.rotate(-0.12);
  g.font = FONT(84);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  tube(g, () => g.strokeText('PİŞTİ', 0, 0), PINK, 4.6);
  g.restore();
  if (due()) yield;
  // altı çizili ok/kıvrım
  const sw = new Path2D();
  sw.moveTo(cx - 110, H * 0.47);
  sw.bezierCurveTo(cx - 40, H * 0.43, cx + 40, H * 0.5, cx + 110, H * 0.44);
  tubePath(g, sw, [46, 196, 255], 4);
  // çay bardağı (küçük, ortada aşağıda)
  g.save();
  g.translate(cx - 120 * 0.72, H * 0.52);
  g.scale(0.72, 0.72);
  const cup = yield* paintCourt('J');
  g.drawImage(cup, 0, 0);
  cup.width = cup.height = 0;
  g.restore();
  // köşelerde dört takım
  const cs: Suit[] = ['H', 'D', 'C', 'S'];
  [[60, 64], [W - 60, 64], [W - 60, H - 64], [60, H - 64]].forEach(([x, y], i) => {
    withOutline(g, cs[i], x, y, 30, p => {
      tube(g, () => g.stroke(p), NEON[cs[i]], 0.1);
    });
  });
  return c;
}

function* paintAll(): Job<Art> {
  const frame = {} as Record<Suit, HTMLCanvasElement>;
  const big = {} as Record<Suit, HTMLCanvasElement>;
  const ace = {} as Record<Suit, HTMLCanvasElement>;
  const pip = {} as Record<Suit, HTMLCanvasElement>;
  const wall = paintWall(PW, PH, 7, [
    [PW * 0.2, PH * 0.15, VIOLET],
    [PW * 0.85, PH * 0.9, PINK],
  ]);
  if (due()) yield;
  const burst = paintBurst();
  const W = PW, H = PH, cx = W / 2, cy = H / 2;
  for (const s of SUITS) {
    const col = NEON[s];
    const [c, g] = makeCanvas(W, H);
    g.drawImage(wall, 0, 0);
    g.globalCompositeOperation = 'lighter';
    glow(g, cx, cy, W * 0.62, col, 0.16, 1, 1.25);
    g.globalCompositeOperation = 'source-over';
    const m = 0.05 * W;
    tubePath(g, rrPath(m, m, W - 2 * m, H - 2 * m, 0.05 * W), col, 0.011 * W);
    frame[s] = c;
    if (due()) yield;
    // sayılar: büyük silüet (kart genişliğinin yarısı)
    const sz = 0.5 * W;
    big[s] = suitSprite(sz, sz * 0.18, (bg, C) => withOutline(bg, s, C, C, sz, p => tube(bg, () => bg.stroke(p), col, 0.03)));
    ace[s] = suitSprite(W * 0.95, 0, (bg, C) => {
      bg.globalCompositeOperation = 'lighter';
      bg.drawImage(burst, 0, 0, C * 2, C * 2);
      bg.globalCompositeOperation = 'source-over';
      withOutline(bg, s, C, C, sz, p => {
        tube(bg, () => bg.stroke(p), col, 0.045);
        bg.save();
        bg.scale(0.72, 0.72);
        tube(bg, () => bg.stroke(p), mix(col, WHITE, 0.35), 0.05);
        bg.restore();
      });
    });
    const ps = 0.15 * W;
    pip[s] = suitSprite(ps, ps * 0.32, (bg, C) => neonPip(bg, s, C, C, ps));
    if (due()) yield;
  }
  wall.width = wall.height = 0;
  burst.width = burst.height = 0;
  const court: Record<number, HTMLCanvasElement> = {};
  court[13] = yield* paintCourt('K');
  court[12] = yield* paintCourt('Q');
  court[11] = yield* paintCourt('J');
  const back = yield* paintBack();
  RF.measure();
  return {frame, big, ace, pip, court, back};
}

// ───────────────────────── kart çizimi ─────────────────────────
/** Ön boyanmış sprite'ı merkezine göre, PW ölçeğinden w ölçeğine çiz */
function put(g: Ctx, c: HTMLCanvasElement, x: number, y: number, k: number): void {
  const d = c.width * k;
  g.drawImage(c, x - d / 2, y - d / 2, d, d);
}

function face(g: Ctx, w: number, h: number, s: Suit, r: number, a: Art): void {
  const col = NEON[s];
  const k = w / PW;
  g.save();
  g.clip(cardPath(w, h));
  g.drawImage(a.frame[s], 0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  if (r === 1) {
    put(g, a.ace[s], cx, cy, k);
    sparkle(g, cx + 0.22 * w, cy - 0.24 * w, 0.05 * w);
    sparkle(g, cx - 0.2 * w, cy + 0.26 * w, 0.035 * w);
  } else if (r >= 11) {
    // yuvarlak neon tabela: koyu cam + halka (vale: dört renk, diğerleri takım rengi)
    const R = 0.31 * w, oy = cy + 0.015 * w;
    g.fillStyle = rad(g, cx, oy, R * 0.2, R * 1.05, [
      [0, 'rgba(10,4,24,0.75)'],
      [1, 'rgba(10,4,24,0.35)'],
    ]);
    g.beginPath();
    g.arc(cx, oy, R, 0, Math.PI * 2);
    g.fill();
    if (r === 11) {
      (['H', 'D', 'C', 'S'] as Suit[]).forEach((su, i) => {
        const p = new Path2D();
        p.arc(cx, oy, R, -Math.PI / 2 + (i * Math.PI) / 2 + 0.14, -Math.PI / 2 + ((i + 1) * Math.PI) / 2 - 0.14);
        tubePath(g, p, NEON[su], 0.012 * w);
      });
    } else {
      const p = new Path2D();
      p.arc(cx, oy, R, 0, Math.PI * 2);
      tubePath(g, p, col, 0.01 * w, 0.9);
    }
    const dw = 0.56 * w, dh = (dw * CH) / CW;
    g.drawImage(a.court[r], cx - dw / 2, oy - dh / 2, dw, dh);
    // halkanın sağ üst ve sol altında küçük takım işareti
    const pk = (0.07 * w) / (0.15 * PW);
    put(g, a.pip[s], cx + R * 0.82, oy - R * 0.82, pk);
    put(g, a.pip[s], cx - R * 0.82, oy + R * 0.82, pk);
  } else {
    const sz = 0.5 * w;
    put(g, a.big[s], cx, cy, k);
    const capH = 0.15 * w;
    neonRank(g, String(r), cx, cy + SUIT_TY[s] * sz - capH / 2, capH, 0.25 * w, mix(col, WHITE, 0.25));
  }
  // köşe dizinleri
  const t = r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
  for (let flip = 0; flip < 2; flip++) {
    g.save();
    if (flip) {
      g.translate(w, h);
      g.rotate(Math.PI);
    }
    const X = 0.205 * w, TOP = 0.085 * w, CAP = 0.23 * w;
    neonRank(g, t, X, TOP, CAP, (t.length > 1 ? 0.28 : 0.25) * w, col);
    put(g, a.pip[s], X, TOP + CAP + 0.06 * w + 0.15 * w * 0.55, k);
    g.restore();
  }
  g.restore();
  g.save();
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.stroke(cardPath(w, h, g.lineWidth / 2));
  g.restore();
}

function back(g: Ctx, w: number, h: number, a: Art): void {
  g.save();
  const card = cardPath(w, h);
  g.clip(card);
  g.drawImage(a.back, 0, 0, w, h);
  g.restore();
  g.save();
  g.lineWidth = Math.max(1, 0.014 * w);
  g.strokeStyle = 'rgba(0,0,0,0.9)';
  g.stroke(cardPath(w, h, g.lineWidth / 2));
  g.restore();
}

export const skin = defineSkin<Art>({
  id: 'neon',
  name: 'Neon Kahvehane',
  desc: 'Gece yarısı tuğla duvarda yanan dört renk neon tabelalar.',
  fonts: () => loadFont(() => import('@fontsource/lilita-one/400.css'), `400 100px "Lilita One"`, 'AJQK0123456789PİŞTİ'),
  paint: paintAll,
  face,
  back,
});
