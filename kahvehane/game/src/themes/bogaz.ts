// Masa "Boğaz Gecesi": İstanbul'da gece. Üstte yıldızlı gök, hilal, ufukta Galata Kulesi, yalılar ve renk renk
// ışıklı köprü; masanın çoğu Boğaz'ın sakin, koyu suyu (yığın ay ışığının yansıdığı suyun üstünde durur).
// Suda altın ve renkli ışık yansımaları, Kız Kulesi ve bir vapur kenarlarda. Çizim vektör (keskin), dilimli.
import {bridge, crescent, galata, kizKulesi, stars, vapur, water, yalilar} from '../skins/bogaz';
import {due, glow, runJob, type Job} from '../skins/kit';
import {makeCanvas, mulberry, radial, resScale, spotOf} from './paint';

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  const k = resScale(w, h, dpr, 2, 1_600_000);
  const [cv, g] = makeCanvas(w * k, h * k);
  g.scale(k, k);
  const W = w, H = h;
  const S = spotOf(W, H);
  const rnd = mulberry(0xb06a2);
  const hz = H * 0.3;
  const M = Math.min(W, H * 0.5);
  // gök
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#03061a');
  sky.addColorStop(0.55, '#0e1856');
  sky.addColorStop(0.88, '#2c2c86');
  sky.addColorStop(1, '#5a3e9a');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, hz + 2);
  stars(g, W, hz * 0.92, Math.round(90 * (W / 390)), rnd);
  crescent(g, W * 0.84, H * 0.075, M * 0.07);
  if (due()) yield;
  // su: ay ve şehir ışıklarının yansımaları
  water(g, W, hz, H, '#141a5c', '#02041a', [
    [W * 0.84, 'rgba(255,240,190,1)', W * 0.1],
    [W * 0.2, 'rgba(255,214,120,1)', W * 0.07],
    [W * 0.55, 'rgba(255,90,180,1)', W * 0.05],
    [W * 0.7, 'rgba(90,210,255,1)', W * 0.05],
    [W * 0.38, 'rgba(255,214,120,1)', W * 0.04],
  ], rnd);
  if (due()) yield;
  // ufuk: uzak kıyı, köprü, yalılar, Galata
  yalilar(g, -10, W + 10, hz - H * 0.004, H * 0.018, '#262a6e', rnd, 0.4);
  bridge(g, W * 0.36, W * 1.22, hz - H * 0.03, H * 0.08, '#191a50', true, rnd);
  if (due()) yield;
  yalilar(g, -10, W * 0.55, hz, H * 0.028, '#05071e', rnd, 0.6);
  glow(g, W * 0.17, hz - H * 0.09, M * 0.35, [255, 200, 110], 0.25);
  galata(g, W * 0.17, hz + 1, H * 0.2, '#05071e', true);
  // suda Kız Kulesi (sağda) ve vapur (solda, elin üstünde)
  kizKulesi(g, W * 0.86, H * 0.53, H * 0.085, '#04061a', true);
  vapur(g, W * 0.2, H * 0.715, W * 0.3);
  if (due()) yield;
  // okunurluk: orta %60 derin lacivert hale, yığının altı en koyu, elin arkası koyu
  radial(g, W / 2, H * 0.5, 0, Math.max(W, H) * 0.5, [
    [0, 'rgba(3,5,24,0.55)'],
    [0.5, 'rgba(3,5,24,0.35)'],
    [1, 'rgba(3,5,24,0)'],
  ], (W / Math.max(W, H)) * 1.25, H / Math.max(W, H));
  radial(g, S.px, S.py, 0, S.ringR * 2.2, [
    [0, 'rgba(2,4,20,0.5)'],
    [1, 'rgba(2,4,20,0)'],
  ]);
  const gb = g.createLinearGradient(0, H * 0.76, 0, H);
  gb.addColorStop(0, 'rgba(2,4,20,0)');
  gb.addColorStop(1, 'rgba(2,4,20,0.55)');
  g.fillStyle = gb;
  g.fillRect(0, H * 0.76, W, H * 0.24);
  return cv;
}

export const paintBogaz = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
