// Masa "Neon Kahvehane": gece yarısı tuğla duvar. Sol üstte eğik pembe "PİŞTİ" tabelası, sağ üstte buharı tüten
// neon çay bardağı, kenarlarda dört renk takım işaretleri; altta camgöbeği neon şeritli tezgâh (elin arkası).
// Neon: katmanlı çizgi + 'lighter' (bulanıklık yok). Orta bölge koyu ve sakin: kartlar öne çıkar.
import {AMBER, FONT, NEON, paintCourt, paintWall, PINK, tube, tubePath, VIOLET, withOutline} from '../skins/neon';
import {due, runJob, type Job} from '../skins/kit';
import {makeCanvas, radial, resScale, spotOf} from './paint';

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  const k = resScale(w, h, dpr, 2, 1_600_000);
  const [cv, g] = makeCanvas(w * k, h * k);
  g.scale(k, k);
  const W = w, H = h;
  const S = spotOf(W, H);
  const M = Math.min(W, H * 0.5);
  const wall = paintWall(W, H, 0x6e0, [
    [W * 0.25, H * 0.08, PINK],
    [W * 0.8, H * 0.12, AMBER],
    [W * 0.5, H * 0.8, [46, 196, 255]],
  ]);
  g.drawImage(wall, 0, 0, W, H);
  wall.width = wall.height = 0;
  if (due()) yield;
  // PİŞTİ tabelası (sol üst, eğik)
  g.save();
  g.translate(W * 0.17, H * 0.085);
  g.rotate(-0.14);
  g.font = FONT(M * 0.13);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  tube(g, () => g.strokeText('PİŞTİ', 0, 0), PINK, M * 0.008);
  g.restore();
  if (due()) yield;
  // çay bardağı (sağ üst)
  const cup = yield* paintCourt('J');
  const cw = M * 0.42;
  g.drawImage(cup, W * 0.84 - cw / 2, H * 0.015, cw, (cw * cup.height) / cup.width);
  cup.width = cup.height = 0;
  // kenarlarda takım işaretleri
  for (const [s, x, y, sz] of [['H', 0.07, 0.62, 0.075], ['S', 0.93, 0.47, 0.07], ['D', 0.06, 0.33, 0.055], ['C', 0.08, 0.19, 0.045]] as const) {
    withOutline(g, s, W * x, H * y, M * sz * 2, p => tube(g, () => g.stroke(p), NEON[s], 0.05));
  }
  if (due()) yield;
  // tezgâh: camgöbeği şerit + koyu ahşap
  const ty = H * 0.755;
  const top = g.createLinearGradient(0, ty, 0, H);
  top.addColorStop(0, 'rgba(26,14,30,0.92)');
  top.addColorStop(0.08, 'rgba(14,8,18,0.96)');
  top.addColorStop(1, 'rgba(6,3,8,1)');
  g.fillStyle = top;
  g.fillRect(0, ty, W, H - ty);
  const strip = new Path2D();
  strip.moveTo(-10, ty);
  strip.lineTo(W + 10, ty);
  tubePath(g, strip, [46, 196, 255], M * 0.012);
  const strip2 = new Path2D();
  strip2.moveTo(-10, ty + H * 0.03);
  strip2.lineTo(W + 10, ty + H * 0.03);
  tubePath(g, strip2, VIOLET, M * 0.006, 0.7);
  // okunurluk: orta %60 koyu mor hale, yığının altı en koyu
  radial(g, W / 2, H * 0.47, 0, Math.max(W, H) * 0.5, [
    [0, 'rgba(6,2,14,0.6)'],
    [0.5, 'rgba(6,2,14,0.38)'],
    [1, 'rgba(6,2,14,0)'],
  ], (W / Math.max(W, H)) * 1.25, H / Math.max(W, H));
  radial(g, S.px, S.py, 0, S.ringR * 2.2, [
    [0, 'rgba(4,1,10,0.5)'],
    [1, 'rgba(4,1,10,0)'],
  ]);
  return cv;
}

export const paintNeon = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
