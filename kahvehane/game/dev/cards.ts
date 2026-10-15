// Kart atlası önizlemesi: ?w=1024|1536|2048|2560 (&art=test: sentetik arka yüz görseli)
// Kartlar 2B çizicideki gibi CSS sprite mantığıyla çizilir: kırpma yok, saydam köşeler atlastan gelir, gölgeyi önizleme ekler.
import {ATLAS_COLS, BACK_INDEX, CARD_ASPECT, buildCardAtlas, type CardArtUrls, type CardAtlas} from '../src/render/cardAtlas';
import {cardId, type Suit} from '../src/core/types';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w')) || 2048;
const TEST_ART = params.get('art') === 'test';

const info = document.getElementById('info')!;
const c = (s: Suit, r: number) => cardId(s, r);

/** Arena zemini: radial-gradient(#3d5bff, #14228a 55%, #070b2e) */
function arenaBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.5);
  g.addColorStop(0, '#3d5bff');
  g.addColorStop(0.55, '#14228a');
  g.addColorStop(1, '#070b2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawCard(ctx: CanvasRenderingContext2D, a: CardAtlas, cell: number, x: number, y: number, w: number, rot = 0, shadow = true, pivot?: [number, number]): void {
  const h = w / CARD_ASPECT;
  const col = cell % ATLAS_COLS, row = Math.floor(cell / ATLAS_COLS);
  ctx.save();
  // pivot: kartın kendi kutusunda dönme noktası (0..1); verilmezse merkez
  const [pu, pv] = pivot ?? [0.5, 0.5];
  ctx.translate(x + w * pu, y + h * pv);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(w * (0.5 - pu), h * (0.5 - pv));
  if (shadow) {
    ctx.shadowColor = 'rgba(3,6,40,0.55)';
    ctx.shadowBlur = w * 0.1;
    ctx.shadowOffsetX = w * 0.01;
    ctx.shadowOffsetY = w * 0.05;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(a.canvas, col * a.cellW, row * a.cellH, a.cellW, a.cellH, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save();
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(220,228,255,0.8)';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function setup(id: string, w: number, h: number, dpr = 1): CanvasRenderingContext2D {
  const cv = document.getElementById(id) as HTMLCanvasElement;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}

/** Telefon benzetimi: CSS pikselinde gerçek boyutlar, cihaz piksel oranında keskin çizim.
 *  (a) 53 yüz 70 px, (b) 90 px yelpaze el (yalnız sol ≈ %40 görünür), (c) 72 px hafif dönük yığın, (d) 56 px arka yüzler. */
function drawPhone(a: CardAtlas): void {
  const dpr = window.devicePixelRatio || 1;
  const cw = 70, ch = cw / CARD_ASPECT, gap = 8;
  const gridW = 13 * (cw + gap) + gap;
  const gridH = 5 * (ch + gap) + gap;
  const w = gridW, h = gridH + 230;
  const ctx = setup('phone', w, h, dpr);
  arenaBackground(ctx, w, h);
  for (let id = 0; id <= BACK_INDEX; id++) {
    const col = id % 13, row = Math.floor(id / 13);
    drawCard(ctx, a, id, gap + col * (cw + gap), gap + row * (ch + gap), cw, 0);
  }
  // (b) el: 90 px, yelpaze; her kartın yalnız sol ≈ %40'ı görünür (en üstteki hariç)
  const hw = 90;
  const fan = (ids: number[], x: number, y: number) =>
    ids.forEach((id, i) => {
      const ang = (i - (ids.length - 1) / 2) * 5;
      drawCard(ctx, a, id, x + i * hw * 0.4, y + Math.abs(i - (ids.length - 1) / 2) * 3, hw, ang, true, [0.5, 1.6]);
    });
  const hy = gridH + 46;
  const hx = 1.0 * (cw + gap);
  fan([c('H', 7), c('D', 10), c('S', 11), c('C', 13)], hx, hy);
  label(ctx, 'el 90 px', hx, hy - 16);
  const h2x = hx + 250;
  fan([c('S', 1), c('H', 12), c('C', 10), c('D', 9)], h2x, hy);
  // (c) yığın: 72 px
  const pw = 72;
  const pile = [c('C', 5), c('H', 1), c('D', 12), c('S', 10)];
  const rots = [-13, 9, -4, 7];
  const px = h2x + 270, py = hy + 6;
  pile.forEach((id, i) => drawCard(ctx, a, id, px + i * 3, py + i * 2, pw, rots[i]));
  label(ctx, 'yığın 72 px', px, hy - 16);
  // (d) rakip eli ve deste: 56 px arka yüz
  const bx = px + 130;
  for (let i = 0; i < 4; i++) drawCard(ctx, a, BACK_INDEX, bx + i * 24, py, 56, -9 + i * 6);
  for (let i = 0; i < 6; i++) drawCard(ctx, a, BACK_INDEX, bx + 150 - i * 0.6, py + 10 - i * 1.4, 56, 2, i === 0 || i === 5);
  label(ctx, 'arka 56 px / deste', bx, hy - 16);
}

function drawTable(a: CardAtlas): void {
  const w = 1180, h = 820;
  const ctx = setup('table', w, h);
  arenaBackground(ctx, w, h);

  label(ctx, '70 px', 20, 26);
  const row1 = [c('S', 1), c('H', 11), c('D', 10), c('C', 7), c('S', 12), c('H', 13), c('C', 2), c('S', 11), c('D', 9), c('C', 4), BACK_INDEX];
  const rots = [-4, 3, -2, 5, -6, 2, 4, -3, 1, -5, 3];
  row1.forEach((id, i) => drawCard(ctx, a, id, 24 + i * 100, 40, 70, rots[i]));

  label(ctx, 'yığın 70 px', 20, 196);
  const pile = [c('C', 5), c('H', 8), c('S', 3), c('D', 13), c('D', 11)];
  const pr = [-14, 9, -5, 17, -3];
  pile.forEach((id, i) => drawCard(ctx, a, id, 60 + i * 2, 214 + i, 70, pr[i]));
  for (let i = 0; i < 6; i++) drawCard(ctx, a, BACK_INDEX, 200 - i * 0.6, 220 - i * 1.2, 70, 2, i === 0 || i === 5);

  label(ctx, 'el 100 px', 330, 196);
  const hand = [c('D', 1), c('S', 10), c('H', 11), c('C', 12)];
  hand.forEach((id, i) => {
    const ang = -15 + i * 10;
    drawCard(ctx, a, id, 350 + i * 44, 222 + Math.abs(i - 1.5) * 8, 100, ang);
  });

  label(ctx, 'rakip 60 px', 680, 196);
  for (let i = 0; i < 4; i++) drawCard(ctx, a, BACK_INDEX, 700 + i * 34, 214, 60, -9 + i * 6);

  label(ctx, '140 px', 20, 430);
  const row2 = [c('H', 10), c('C', 11), c('D', 12), c('S', 13), c('H', 1), c('C', 10), c('S', 1)];
  row2.forEach((id, i) => drawCard(ctx, a, id, 24 + i * 162, 446, 140, i % 2 ? 2 : -2));
}

function drawSmall(a: CardAtlas): void {
  const cw = 70, ch = cw / CARD_ASPECT, gap = 12;
  const cols = 13, rows = 5;
  const w = cols * (cw + gap) + gap, h = rows * (ch + gap) + gap;
  const ctx = setup('small', w, h);
  arenaBackground(ctx, w, h);
  for (let id = 0; id <= BACK_INDEX; id++) {
    const col = id % 13, row = Math.floor(id / 13);
    drawCard(ctx, a, id, gap + col * (cw + gap), gap + row * (ch + gap), cw, 0);
  }
}

function drawLarge(a: CardAtlas): void {
  const big = 340, mid = 200, gap = 22;
  const ids = [c('S', 1), c('H', 13), c('C', 11), c('D', 12), c('H', 10), c('C', 10), c('D', 1), c('S', 7)];
  const perRow = 4;
  const w = 30 + big + 30 + perRow * (mid + gap) + 10;
  const h = Math.max(big / CARD_ASPECT, 2 * (mid / CARD_ASPECT) + gap) + 60;
  const ctx = setup('large', w, h);
  arenaBackground(ctx, w, h);
  drawCard(ctx, a, BACK_INDEX, 30, 30, big);
  ids.forEach((id, i) => drawCard(ctx, a, id, 30 + big + 30 + (i % perRow) * (mid + gap), 30 + Math.floor(i / perRow) * (mid / CARD_ASPECT + gap), mid));
}

// ?art=test: assets/cards/back.png yerine sentetik arka yüz (kırpma/sığdırma hattını sınamak için)
async function testArt(): Promise<CardArtUrls> {
  const back = document.createElement('canvas');
  back.width = 600;
  back.height = 900;
  const bg = back.getContext('2d')!;
  bg.fillStyle = '#26315c';
  bg.fillRect(0, 0, 600, 900);
  bg.strokeStyle = '#e3c26b';
  bg.lineWidth = 14;
  bg.strokeRect(30, 30, 540, 840);
  bg.fillStyle = '#e3c26b';
  bg.font = 'bold 120px serif';
  bg.fillText('TEST', 150, 480);
  const blob = await new Promise<Blob>((r) => back.toBlob((b) => r(b!), 'image/png'));
  return {back: URL.createObjectURL(blob)};
}

async function main(): Promise<void> {
  const art = TEST_ART ? await testArt() : undefined;
  const t0 = performance.now();
  const atlas = await buildCardAtlas(W, art);
  atlas.canvas.getContext('2d')!.getImageData(0, 0, 1, 1);
  const t1 = performance.now();
  // ikinci kurulum: fontlar hazırken saf çizim süresi
  const times: number[] = [];
  for (let i = 0; i < 3; i++) {
    const s = performance.now();
    const tmp = await buildCardAtlas(W, art);
    tmp.canvas.getContext('2d')!.getImageData(0, 0, 1, 1);
    times.push(performance.now() - s);
    tmp.canvas.width = tmp.canvas.height = 0;
  }
  const warm = Math.min(...times);
  info.textContent =
    `atlas ${atlas.width}×${atlas.height}  hücre ${atlas.cellW.toFixed(2)}×${atlas.cellH.toFixed(2)}\n` +
    `ilk kurulum (font yükleme dahil): ${(t1 - t0).toFixed(1)} ms   sıcak kurulum: ${warm.toFixed(1)} ms (en iyi / 3: ${times.map((t) => t.toFixed(1)).join(', ')})`;
  (window as unknown as {__atlas: unknown}).__atlas = {first: t1 - t0, warm, times, width: atlas.width, height: atlas.height};

  drawPhone(atlas);
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
