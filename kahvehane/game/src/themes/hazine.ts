// Masa "Hazine Odası": kızıl kadife üstünde altın telkâri çerçeve, köşelerde dört renk taş (yakut, topaz, zümrüt,
// safir), çok soluk altın şemse deseni. Ortası koyu ve sakin. Vektör + kadife dokusu (yumuşak), dilimli.
import {GEM, paintVelvet, pearl, roundGem, scroll} from '../skins/hazine';
import {due, glow, gold, runJob, type Job, type Suit} from '../skins/kit';
import {makeCanvas, radial, resScale, spotOf} from './paint';

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  const k = resScale(w, h, dpr, 2, 1_600_000);
  const [cv, g] = makeCanvas(w * k, h * k);
  g.scale(k, k);
  const W = w, H = h;
  const S = spotOf(W, H);
  const M = Math.min(W, H * 0.5);
  const vel = paintVelvet(Math.round(W * 0.75), Math.round(H * 0.75), [104, 8, 30], 0x7a2);
  g.drawImage(vel, 0, 0, W, H);
  vel.width = vel.height = 0;
  if (due()) yield;
  // soluk altın şemse kafesi
  g.save();
  g.globalAlpha = 0.07;
  g.strokeStyle = '#ffd77a';
  g.lineWidth = 1.2;
  const step = M * 0.22;
  for (let y = -step; y < H + step; y += step)
    for (let x = ((y / step) % 2 ? step / 2 : 0) - step; x < W + step; x += step) {
      g.beginPath();
      g.moveTo(x, y - step * 0.42);
      g.quadraticCurveTo(x + step * 0.3, y, x, y + step * 0.42);
      g.quadraticCurveTo(x - step * 0.3, y, x, y - step * 0.42);
      g.stroke();
    }
  g.restore();
  // altın telkâri çerçeve
  const m = M * 0.045;
  g.lineWidth = M * 0.012;
  g.strokeStyle = gold(g, 0, 0, W, H);
  g.beginPath();
  g.roundRect(m, m, W - 2 * m, H - 2 * m, M * 0.05);
  g.stroke();
  g.lineWidth = M * 0.005;
  g.beginPath();
  g.roundRect(m + M * 0.05, m + M * 0.05, W - 2 * m - M * 0.1, H - 2 * m - M * 0.1, M * 0.03);
  g.stroke();
  const e = m + M * 0.025, sc = M * 0.03;
  const along = (x0: number, y0: number, x1: number, y1: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      scroll(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, sc, Math.atan2(y1 - y0, x1 - x0), i % 2 ? 1 : -1);
    }
  };
  const nx = Math.max(4, Math.round(W / (M * 0.09))), ny = Math.max(6, Math.round(H / (M * 0.09)));
  along(e + M * 0.08, e, W - e - M * 0.08, e, nx);
  along(e + M * 0.08, H - e, W - e - M * 0.08, H - e, nx);
  along(e, e + M * 0.08, e, H - e - M * 0.08, ny);
  along(W - e, e + M * 0.08, W - e, H - e - M * 0.08, ny);
  if (due()) yield;
  // köşelerde taş rozetleri
  const cs: Suit[] = ['H', 'D', 'C', 'S'];
  [[e, e], [W - e, e], [W - e, H - e], [e, H - e]].forEach(([x, y], i) => {
    glow(g, x, y, M * 0.12, [255, 200, 120], 0.4);
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2;
      pearl(g, x + Math.cos(a) * M * 0.042, y + Math.sin(a) * M * 0.042, M * 0.009);
    }
    roundGem(g, x, y, M * 0.03, GEM[cs[i]], 500 + i);
  });
  // yığının çevresinde soluk altın şemse (yaprak halkası)
  g.save();
  g.translate(S.px, S.py);
  g.globalAlpha = 0.32;
  const R0 = S.ringR * 1.25, R1 = S.ringR * 1.75;
  for (let i = 0; i < 24; i++) {
    g.save();
    g.rotate((i / 24) * Math.PI * 2);
    g.beginPath();
    g.moveTo(0, -R0);
    g.quadraticCurveTo(R1 * 0.08, -(R0 + R1) / 2, 0, -(i % 2 ? R1 * 0.92 : R1));
    g.quadraticCurveTo(-R1 * 0.08, -(R0 + R1) / 2, 0, -R0);
    g.fillStyle = gold(g, -R1 * 0.1, -R1, R1 * 0.1, -R0);
    g.fill();
    g.restore();
  }
  g.lineWidth = M * 0.006;
  g.strokeStyle = '#f2c94e';
  g.beginPath();
  g.arc(0, 0, R1 * 1.04, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  // okunurluk: orta %60 koyu, yığının altı en koyu
  radial(g, W / 2, H * 0.48, 0, Math.max(W, H) * 0.5, [
    [0, 'rgba(26,0,8,0.5)'],
    [0.5, 'rgba(26,0,8,0.3)'],
    [1, 'rgba(26,0,8,0)'],
  ], (W / Math.max(W, H)) * 1.25, H / Math.max(W, H));
  radial(g, S.px, S.py, 0, S.ringR * 2.2, [
    [0, 'rgba(20,0,6,0.45)'],
    [1, 'rgba(20,0,6,0)'],
  ]);
  return cv;
}

export const paintHazine = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
