// Masa "Kapadokya Şafağı": şafak göğünde onlarca sıcak hava balonu, ufukta güneş, altta katman katman peri bacaları
// (oyuncunun eli koyu kaya tabanının önünde durur). Yığının çevresi balonsuz ve hafif koyu: kartlar okunur.
// Çizim vektör (keskin), dilimli; deste ile aynı çizim parçaları (src/skins/kapadokya.ts).
import {BALLOON_SETS, chimneys, dawnSky, smallBalloon} from '../skins/kapadokya';
import {due, glow, runJob, type Job} from '../skins/kit';
import {makeCanvas, mulberry, radial, resScale, spotOf} from './paint';

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  const k = resScale(w, h, dpr, 2, 1_600_000);
  const [cv, g] = makeCanvas(w * k, h * k);
  g.scale(k, k);
  const W = w, H = h;
  const S = spotOf(W, H);
  const rnd = mulberry(0xca9);
  const hz = H * 0.8;
  dawnSky(g, W, H, hz);
  // güneş: ufukta, sağda
  const sx = W * 0.72, sy = hz - H * 0.015, sr = Math.min(W, H) * 0.11;
  glow(g, sx, sy, sr * 5, [255, 190, 120], 0.6);
  g.fillStyle = '#fff1c0';
  g.beginPath();
  g.arc(sx, sy, sr, 0, Math.PI * 2);
  g.fill();
  // bulut şeritleri
  for (let i = 0; i < 9; i++) {
    g.fillStyle = `rgba(255,${190 + rnd() * 40},${200 + rnd() * 30},${0.18 + rnd() * 0.22})`;
    g.beginPath();
    g.ellipse(rnd() * W, hz * (0.2 + rnd() * 0.75), W * (0.15 + rnd() * 0.3), H * (0.004 + rnd() * 0.006), 0, 0, Math.PI * 2);
    g.fill();
  }
  if (due()) yield;
  // balonlar: uzaktan yakına; yığının çevresi ve rakip rozeti boş
  const M = Math.min(W, H * 0.5);
  const bal: [number, number, number][] = [];
  for (let tries = 0; bal.length < 26 && tries < 400; tries++) {
    const x = rnd() * W, y = H * (0.05 + rnd() * 0.68), r = M * (0.02 + Math.pow(rnd(), 2.2) * 0.1);
    if (Math.hypot(x - S.px, (y - S.py) * 0.8) < S.ringR * 1.9 + r) continue;
    if (Math.abs(x - W / 2) < W * 0.2 && y < H * 0.14) continue;
    if (bal.some(([bx, by, br]) => Math.hypot(bx - x, by - y) < (br + r) * 1.6)) continue;
    bal.push([x, y, r]);
  }
  bal.sort((a, b) => a[2] - b[2]);
  for (const [x, y, r] of bal) {
    const far = 1 - Math.min(1, (r / M - 0.02) / 0.08);
    smallBalloon(g, x, y, r, BALLOON_SETS[Math.floor(rnd() * BALLOON_SETS.length)], far * 0.5, [236, 140, 160]);
    if (due()) yield;
  }
  // yığının altı: yumuşak mor havuz
  radial(g, S.px, S.py, 0, S.ringR * 2.2, [
    [0, 'rgba(40,16,70,0.45)'],
    [0.6, 'rgba(40,16,70,0.22)'],
    [1, 'rgba(40,16,70,0)'],
  ]);
  // peri bacaları: uzak, orta, yakın (elin arkası)
  chimneys(g, -10, W + 10, hz + H * 0.01, H * 0.07, [222, 150, 150], [180, 110, 120], rnd);
  chimneys(g, -10, W + 10, hz + H * 0.07, H * 0.1, [176, 96, 104], [110, 56, 70], rnd, true);
  if (due()) yield;
  chimneys(g, -20, W + 20, H * 1.01, H * 0.15, [118, 58, 78], [56, 24, 44], rnd, true);
  // kenar karartması
  radial(g, W / 2, H * 0.48, Math.min(W, H) * 0.55, Math.max(W, H) * 0.8, [
    [0, 'rgba(30,10,50,0)'],
    [1, 'rgba(30,10,50,0.35)'],
  ]);
  return cv;
}

export const paintKapadokya = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
