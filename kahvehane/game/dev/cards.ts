// Kart atlası önizlemesi: ?w=1024|1536|2048
import {ATLAS_COLS, BACK_INDEX, CARD_ASPECT, CORNER_RADIUS, buildCardAtlas, type CardArtUrls, type CardAtlas} from '../src/render/cardAtlas';
import {cardId, type Suit} from '../src/core/types';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w')) || 2048;
const TEST_ART = params.get('art') === 'test';

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

function drawCard(ctx: CanvasRenderingContext2D, a: CardAtlas, cell: number, x: number, y: number, w: number, rot = 0, shadow = true, pivot?: [number, number]): void {
  const h = w / CARD_ASPECT, r = CORNER_RADIUS * w;
  const col = cell % ATLAS_COLS, row = Math.floor(cell / ATLAS_COLS);
  ctx.save();
  // pivot: kartın kendi kutusunda dönme noktası (0..1); verilmezse merkez
  const [pu, pv] = pivot ?? [0.5, 0.5];
  ctx.translate(x + w * pu, y + h * pv);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(w * (0.5 - pu), h * (0.5 - pv));
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
 *  (a) 53 yüz 70 px, (b) 88 px yelpaze el (yalnız sol ≈ %45 görünür), (c) 72 px hafif dönük 3 kartlık yığın. */
function drawPhone(a: CardAtlas): void {
  const dpr = window.devicePixelRatio || 1;
  const cw = 70, ch = cw / CARD_ASPECT, gap = 8;
  const gridW = 13 * (cw + gap) + gap;
  const gridH = 5 * (ch + gap) + gap;
  const w = gridW, h = gridH + 210;
  const ctx = setup('phone', w, h, dpr);
  feltBackground(ctx, w, h);
  for (let id = 0; id <= BACK_INDEX; id++) {
    const col = id % 13, row = Math.floor(id / 13);
    drawCard(ctx, a, id, gap + col * (cw + gap), gap + row * (ch + gap), cw, 0);
  }
  // (b) el: 88 px, yelpaze; her kartın yalnız sol ≈ %45'i görünür (üstteki hariç)
  const hw = 88, hh = hw / CARD_ASPECT;
  const hand = [c('H', 7), c('D', 10), c('S', 11), c('C', 13)];
  const hx = 1.2 * (cw + gap), hy = gridH + 40;
  hand.forEach((id, i) => {
    const ang = (i - 1.5) * 5;
    drawCard(ctx, a, id, hx + i * hw * 0.45, hy + Math.abs(i - 1.5) * 3, hw, ang, true, [0.5, 1.6]);
  });
  label(ctx, 'el 88 px', hx, hy - 14);
  // ikinci el: as, kız, sayı, papaz
  const hand2 = [c('S', 1), c('H', 12), c('C', 9), c('D', 13)];
  const h2x = hx + 270;
  hand2.forEach((id, i) => {
    const ang = (i - 1.5) * 5;
    drawCard(ctx, a, id, h2x + i * hw * 0.45, hy + Math.abs(i - 1.5) * 3, hw, ang, true, [0.5, 1.6]);
  });
  // (c) yığın: 72 px, 3 kart
  const pw = 72;
  const pile = [c('C', 5), c('H', 1), c('D', 12)];
  const rots = [-13, 9, -4];
  const px = h2x + 290, py = hy + 6;
  pile.forEach((id, i) => drawCard(ctx, a, id, px + i * 3, py + i * 2, pw, rots[i]));
  label(ctx, 'yığın 72 px', px, hy - 14);
  // rakip eli ve deste (arka yüzün çuha üzerinde seçilmesi)
  const bx = px + 140;
  for (let i = 0; i < 4; i++) drawCard(ctx, a, BACK_INDEX, bx + i * 24, py, 56, -9 + i * 6);
  label(ctx, 'arka 56 px', bx, hy - 14);
  void hh;
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

// ?art=test: gerçek assets/cards görselleri yerine sentetik test sayfaları (kırpma/sığdırma hattını sınamak için)
async function testArt(): Promise<CardArtUrls> {
  const toUrl = async (c: HTMLCanvasElement) => URL.createObjectURL(await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png')));
  const sheet = (letter: string, hue: number) => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1400;
    const g = c.getContext('2d')!;
    g.fillStyle = '#efe6d2'; // krem zemin (kırpılmalı)
    g.fillRect(0, 0, c.width, c.height);
    ['♠', '♥', '♦', '♣'].forEach((sym, q) => {
      const qx = (q % 2) * 512, qy = Math.floor(q / 2) * 700;
      const x = qx + 60, y = qy + 50, w = 392, h = 600; // kenarlarda krem pay
      const bg = g.createLinearGradient(x, y, x, y + h);
      bg.addColorStop(0, `hsl(${hue + q * 20} 45% 45%)`);
      bg.addColorStop(1, `hsl(${hue + q * 20} 55% 18%)`);
      g.fillStyle = bg;
      g.fillRect(x, y, w, h);
      g.fillStyle = '#f1c27d';
      g.beginPath();
      g.arc(x + w / 2, y + 190, 80, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#7a1a2c';
      g.fillRect(x + w / 2 - 90, y + 80, 180, 50);
      g.fillStyle = '#2a2a3a';
      g.beginPath();
      g.moveTo(x + 60, y + h);
      g.lineTo(x + w / 2, y + 290);
      g.lineTo(x + w - 60, y + h);
      g.fill();
      g.fillStyle = '#fff';
      g.font = 'bold 90px serif';
      g.fillText(`${letter}${sym}`, x + 20, y + h - 30);
    });
    return c;
  };
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
  const ace = document.createElement('canvas');
  ace.width = ace.height = 600;
  const ag = ace.getContext('2d')!;
  ag.fillStyle = '#123';
  ag.font = '560px serif';
  ag.textAlign = 'center';
  ag.fillText('♠', 300, 500);
  return {
    jacks: await toUrl(sheet('J', 30)),
    queens: await toUrl(sheet('Q', 220)),
    kings: await toUrl(sheet('K', 350)),
    back: await toUrl(back),
    aceSpade: await toUrl(ace),
  };
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
