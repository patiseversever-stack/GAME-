// 1080×1350 share image (BRIEF §2.8): hero frame (highest-proximity frame, HUD-less, "Belgesel" filter —
// supplied by the renderer) + bottom strip: world name, route/daily title, time or score, 5 proximity
// segments, stars, mini route line over the terrain, KANAT wordmark. Returns a data URL.
import type { WorldId } from '../../sim/types.ts';
import { t, tk, upper, fmtInt, fmtTime, fmtDate, getLang, type Lang } from '../i18n.ts';
import { PROX_COLORS, PROX_COLORS_CB, WORLD_ACCENT, type ProxTier } from '../theme.ts';
import { worldArtDataUrl } from '../art.ts';
import { loadFonts } from '../fonts.ts';

export const SHARE_W = 1080;
export const SHARE_H = 1350;

export interface ShareCardInput {
  world: WorldId;
  /** Hero frame: an image/canvas/bitmap, or a URL. Painted world art is used when absent. */
  hero?: CanvasImageSource | string;
  /** Title line, e.g. route name or "Günün Rotası #214" (already localised) — defaults from routeId/dailyN. */
  title?: string;
  routeId?: string;
  dailyN?: number;
  metric: { kind: 'time'; sec: number } | { kind: 'score'; value: number };
  strip: readonly number[];
  stars: number;
  /** Top-down route polyline [x, z] (metres) for the mini route line. */
  line?: readonly (readonly [number, number])[];
  date?: { y: number; m: number; d: number };
  colorBlind?: boolean;
  lang?: Lang;
  mime?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('share hero image failed to load'));
    img.src = src;
  });
}

function sourceSize(src: CanvasImageSource): [number, number] {
  const s = src as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number | { baseVal: { value: number } }; height?: number | { baseVal: { value: number } } };
  const w = s.naturalWidth || s.videoWidth || (typeof s.width === 'number' ? s.width : 0) || SHARE_W;
  const h = s.naturalHeight || s.videoHeight || (typeof s.height === 'number' ? s.height : 0) || SHARE_H;
  return [w, h];
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, x: number, y: number, w: number, h: number): void {
  const [sw, sh] = sourceSize(src);
  const k = Math.max(w / sw, h / sh);
  const dw = sw * k;
  const dh = sh * k;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Text with tracking (uses ctx.letterSpacing where available). */
function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacingPx: number, align: 'left' | 'right' = 'left'): void {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) {
    c.letterSpacing = `${spacingPx}px`;
    c.textAlign = align;
    c.fillText(text, align === 'right' ? x + spacingPx : x, y);
    c.letterSpacing = '0px';
    return;
  }
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacingPx;
  let cx = align === 'right' ? x - w + spacingPx : x;
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacingPx;
  }
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Renders the share card and returns a data URL (JPEG 0.9 by default; the photo-heavy card stays < 1 MB). */
export async function renderShareCard(o: ShareCardInput): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  await drawShareCard(canvas, o);
  return canvas.toDataURL(o.mime ?? 'image/jpeg', o.quality ?? 0.9);
}

/** Draws the card into an existing 1080×1350 canvas (used by the gallery preview). */
export async function drawShareCard(canvas: HTMLCanvasElement, o: ShareCardInput): Promise<void> {
  const lang = o.lang ?? getLang();
  await loadFonts();
  try {
    await Promise.all([document.fonts.load('700 120px "Barlow Condensed"'), document.fonts.load('600 30px "Barlow Condensed"'), document.fonts.load('italic 400 52px "Playfair Display"')]);
  } catch {
    /* fonts optional for the canvas */
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  const W = SHARE_W;
  const H = SHARE_H;
  const accent = WORLD_ACCENT[o.world];

  // Hero
  ctx.fillStyle = '#0E141C';
  ctx.fillRect(0, 0, W, H);
  let hero: CanvasImageSource | null = null;
  try {
    hero = typeof o.hero === 'string' ? await loadImage(o.hero) : o.hero ?? (await loadImage(worldArtDataUrl(o.world, { w: 1080, h: 1350, id: 'share' })));
  } catch {
    hero = await loadImage(worldArtDataUrl(o.world, { w: 1080, h: 1350, id: 'share' }));
  }
  if (hero) drawCover(ctx, hero, 0, 0, W, H);

  // Legibility gradients (top for wordmark, bottom for the strip)
  let g = ctx.createLinearGradient(0, 0, 0, 260);
  g.addColorStop(0, 'rgba(8,11,16,0.55)');
  g.addColorStop(1, 'rgba(8,11,16,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 260);
  g = ctx.createLinearGradient(0, 700, 0, H);
  g.addColorStop(0, 'rgba(8,11,16,0)');
  g.addColorStop(0.42, 'rgba(8,11,16,0.78)');
  g.addColorStop(1, 'rgba(8,11,16,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 700, W, H - 700);

  const PAD = 72;
  ctx.textBaseline = 'alphabetic';
  // Wordmark
  ctx.fillStyle = '#F5F1E8';
  ctx.font = '700 40px "Barlow Condensed", sans-serif';
  tracked(ctx, 'KANAT', PAD, 112, 17);
  if (o.date) {
    ctx.font = '600 26px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'rgba(245,241,232,0.8)';
    tracked(ctx, upper(fmtDate(o.date.y, o.date.m, o.date.d, lang), lang), W - PAD, 110, 4, 'right');
  }

  // Hairline
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(PAD, 1004, W - PAD * 2, 1.5);

  // World eyebrow + title
  ctx.fillStyle = accent;
  ctx.font = '600 30px "Barlow Condensed", sans-serif';
  tracked(ctx, upper(tk(`world.${o.world}`, undefined, o.world, lang), lang), PAD, 1064, 4.5);
  const title = o.title ?? (o.routeId ? tk(`route.${o.routeId}`, undefined, o.routeId, lang) : o.dailyN !== undefined ? t('duel.routeDaily', { n: o.dailyN }, lang) : '');
  ctx.fillStyle = '#F5F1E8';
  ctx.font = 'italic 400 54px "Playfair Display", serif';
  ctx.textAlign = 'left';
  let titleText = title;
  while (ctx.measureText(titleText).width > 640 && titleText.length > 4) titleText = `${titleText.slice(0, -2)}…`;
  ctx.fillText(titleText, PAD, 1130);

  // Metric
  const metric = o.metric.kind === 'time' ? fmtTime(o.metric.sec) : fmtInt(o.metric.value, lang);
  ctx.font = '700 150px "Barlow Condensed", sans-serif';
  ctx.fillText(metric, PAD - 4, 1278);

  // Stars (top right of the strip)
  for (let i = 0; i < 3; i++) {
    const cx = W - PAD - 26 - (2 - i) * 64;
    starPath(ctx, cx, 1050, 26);
    if (i < o.stars) {
      ctx.fillStyle = '#F2C14E';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(245,241,232,0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // Mini route line
  const box = { x: W - PAD - 300, y: 1094, w: 300, h: 130 };
  if (o.line && o.line.length > 1) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of o.line) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const k = Math.min(box.w / Math.max(1e-6, maxX - minX), box.h / Math.max(1e-6, maxY - minY));
    const ox = box.x + (box.w - (maxX - minX) * k) / 2;
    const oy = box.y + (box.h - (maxY - minY) * k) / 2;
    const P = (x: number, y: number): [number, number] => [ox + (x - minX) * k, oy + (y - minY) * k];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(245,241,232,0.18)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    o.line.forEach(([x, y], i) => { const [px, py] = P(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.stroke();
    const [sx, sy] = P(o.line[0][0], o.line[0][1]);
    const [ex, ey] = P(o.line[o.line.length - 1][0], o.line[o.line.length - 1][1]);
    ctx.fillStyle = '#F5F1E8';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F5F1E8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex, ey, 11, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Proximity segments
  const cols = o.colorBlind ? PROX_COLORS_CB : PROX_COLORS;
  const segW = 58;
  const gap = 8;
  const total = segW * 5 + gap * 4;
  for (let i = 0; i < 5; i++) {
    const v = o.strip[i] ?? 0;
    const tier = (v === 1 || v === 2 || v === 3 || v === 5 ? v : 0) as ProxTier;
    ctx.fillStyle = tier === 0 ? 'rgba(245,241,232,0.22)' : cols[tier];
    roundRect(ctx, W - PAD - total + i * (segW + gap), 1252, segW, 16, 4);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(245,241,232,0.7)';
  ctx.font = '600 24px "Barlow Condensed", sans-serif';
  tracked(ctx, upper(t('share.prox', undefined, lang), lang), W - PAD, 1236, 3.5, 'right');
}
