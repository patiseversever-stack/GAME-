// Kart atlası önizlemesi: ?w=1024|1536|2048
import {ATLAS_COLS, BACK_INDEX, CARD_ASPECT, CORNER_RADIUS, buildCardAtlas, type CardAtlas} from '../src/render/cardAtlas';
import {cardId, type Suit} from '../src/core/types';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w')) || 2048;

const info = document.getElementById('info')!;
const c = (s: Suit, r: number) => cardId(s, r);

function feltBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  g.addColorStop(0, '#2c6b45');
  g.addColorStop(0.6, '#1b4a2f');
  g.addColorStop(1, '#0c2416');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // keçe dokusu
  const n = 96, t = document.createElement('canvas');
  t.width = t.height = n;
  const tg = t.getContext('2d')!;
  const img = tg.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = Math.random();
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0.5 ? 255 : 0;
    img.data[i * 4 + 3] = Math.abs(v - 0.5) * 30;
  }
  tg.putImageData(img, 0, 0);
  ctx.fillStyle = ctx.createPattern(t, 'repeat')!;
  ctx.fillRect(0, 0, w, h);
  // sıcak lamba ışığı
  const l = ctx.createRadialGradient(w * 0.45, h * 0.3, 10, w * 0.45, h * 0.3, w * 0.7);
  l.addColorStop(0, 'rgba(255,200,120,0.12)');
  l.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, w, h);
}

function drawCard(ctx: CanvasRenderingContext2D, a: CardAtlas, cell: number, x: number, y: number, w: number, rot = 0, shadow = true): void {
  const h = w / CARD_ASPECT, r = CORNER_RADIUS * w;
  const col = cell % ATLAS_COLS, row = Math.floor(cell / ATLAS_COLS);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  const path = new Path2D();
  path.roundRect(-w / 2, -h / 2, w, h, r);
  if (shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = w * 0.08;
    ctx.shadowOffsetX = w * 0.02;
    ctx.shadowOffsetY = w * 0.04;
    ctx.fillStyle = '#000';
    ctx.fill(path);
    ctx.restore();
  }
  ctx.clip(path);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(a.canvas, col * a.cellW, row * a.cellH, a.cellW, a.cellH, -w / 2, -h / 2, w, h);
  // hafif kenar kalınlığı hissi
  ctx.strokeStyle = 'rgba(80,60,40,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke(path);
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save();
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,225,190,0.75)';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function setup(id: string, w: number, h: number): CanvasRenderingContext2D {
  const cv = document.getElementById(id) as HTMLCanvasElement;
  cv.width = w;
  cv.height = h;
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  return cv.getContext('2d')!;
}

function drawTable(a: CardAtlas): void {
  const w = 1180, h = 820;
  const ctx = setup('table', w, h);
  feltBackground(ctx, w, h);

  label(ctx, '70 px', 20, 26);
  const row1 = [c('S', 1), c('H', 11), c('D', 10), c('C', 7), c('S', 12), c('H', 13), c('C', 2), c('S', 11), c('D', 9), c('C', 4), BACK_INDEX];
  const rots = [-4, 3, -2, 5, -6, 2, 4, -3, 1, -5, 3];
  row1.forEach((id, i) => drawCard(ctx, a, id, 24 + i * 100, 40, 70, rots[i]));

  // Pişti yığını (70 px) ve deste
  label(ctx, 'yığın 70 px', 20, 196);
  const pile = [c('C', 5), c('H', 8), c('S', 3), c('D', 13), c('D', 11)];
  const pr = [-14, 9, -5, 17, -3];
  pile.forEach((id, i) => drawCard(ctx, a, id, 60 + i * 2, 214 + i, 70, pr[i]));
  for (let i = 0; i < 6; i++) drawCard(ctx, a, BACK_INDEX, 200 - i * 0.6, 220 - i * 1.2, 70, 2, i === 0);

  // El yelpazesi (100 px)
  label(ctx, 'el 100 px', 330, 196);
  const hand = [c('D', 1), c('S', 10), c('H', 11), c('C', 12)];
  hand.forEach((id, i) => {
    const ang = -15 + i * 10;
    drawCard(ctx, a, id, 350 + i * 44, 222 + Math.abs(i - 1.5) * 8, 100, ang);
  });

  // Rakip eli (arka, 60 px)
  label(ctx, 'rakip 60 px', 680, 196);
  for (let i = 0; i < 4; i++) drawCard(ctx, a, BACK_INDEX, 700 + i * 34, 214, 60, -9 + i * 6);

  label(ctx, '140 px', 20, 430);
  const row2 = [c('H', 10), c('C', 11), c('D', 12), c('S', 13), c('H', 1), c('C', 8), c('S', 1)];
  row2.forEach((id, i) => drawCard(ctx, a, id, 24 + i * 162, 446, 140, i % 2 ? 2 : -2));
  void h;
}

function drawSmall(a: CardAtlas): void {
  const cw = 70, ch = cw / CARD_ASPECT, gap = 12;
  const cols = 13, rows = 5;
  const w = cols * (cw + gap) + gap, h = rows * (ch + gap) + gap;
  const ctx = setup('small', w, h);
  feltBackground(ctx, w, h);
  for (let id = 0; id <= BACK_INDEX; id++) {
    const col = id % 13, row = Math.floor(id / 13);
    drawCard(ctx, a, id, gap + col * (cw + gap), gap + row * (ch + gap), cw, 0);
  }
}

function drawLarge(a: CardAtlas): void {
  const big = 380, mid = 250;
  const w = big + 4 * (mid + 24) + 60, h = big / CARD_ASPECT + 60;
  const ctx = setup('large', w, h);
  feltBackground(ctx, w, h);
  drawCard(ctx, a, BACK_INDEX, 30, 30, big);
  const ids = [c('S', 1), c('H', 13), c('C', 11), c('D', 12)];
  ids.forEach((id, i) => drawCard(ctx, a, id, 30 + big + 30 + i * (mid + 24), 30, mid));
}

async function main(): Promise<void> {
  const t0 = performance.now();
  const atlas = await buildCardAtlas(W);
  atlas.canvas.getContext('2d')!.getImageData(0, 0, 1, 1);
  const t1 = performance.now();
  // ikinci kurulum: fontlar hazırken saf çizim süresi
  const times: number[] = [];
  for (let i = 0; i < 3; i++) {
    const s = performance.now();
    const tmp = await buildCardAtlas(W);
    // GPU kuyruğunu boşalt: gerçek rasterleştirme süresi de ölçülsün
    tmp.canvas.getContext('2d')!.getImageData(0, 0, 1, 1);
    times.push(performance.now() - s);
    tmp.canvas.width = tmp.canvas.height = 0;
  }
  const warm = Math.min(...times);
  info.textContent =
    `atlas ${atlas.width}×${atlas.height}  hücre ${atlas.cellW.toFixed(2)}×${atlas.cellH.toFixed(2)}\n` +
    `ilk kurulum (font yükleme dahil): ${(t1 - t0).toFixed(1)} ms   sıcak kurulum: ${warm.toFixed(1)} ms (en iyi / 3: ${times.map((t) => t.toFixed(1)).join(', ')})`;
  (window as unknown as {__atlas: unknown}).__atlas = {first: t1 - t0, warm, times, width: atlas.width, height: atlas.height};

  drawTable(atlas);
  drawSmall(atlas);
  drawLarge(atlas);
  atlas.canvas.id = 'atlas';
  document.getElementById('atlasWrap')!.appendChild(atlas.canvas);
  document.body.dataset.ready = '1';
}

main().catch((e) => {
  info.textContent = `HATA: ${e instanceof Error ? e.stack : String(e)}`;
  document.body.dataset.ready = 'err';
});
