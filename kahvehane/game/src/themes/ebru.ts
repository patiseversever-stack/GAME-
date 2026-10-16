// Masa "Ebru Salonu" — gerçek ebru kâğıdı gibi: oyun alanı derin çivit tonlarında, kendi içinde düşük kontrastlı
// bir battal/gelgit ebru (kartların altında sakin, kâğıt dokulu). Klasik zengin renkler (lal, altın, krem, turkuaz)
// yalnız dış kenar şeridinde ve üst köşelerde; köşelerde iki lale. Damlalar konumlarına göre paletten renk alır:
// tarak ve dalga iki paleti kenarda doğal bir ebru geçişiyle karıştırır. Kartların durduğu yerler (tableCalm) ayrıca
// derinleştirilir. Ebru motoru: src/skins/marble.ts. Dilimli (Promise); yumuşak içerik ~1× çizilip CSS ile gerilir.
import {gelgit, lale, marble, rings, type MOp} from '../skins/marble';
import {due, runJob, type Job, type RGB} from '../skins/kit';
import {canvasWeave, tableCalm} from './oil';
import {clamp, grain, makeCanvas, mulberry, radial, resScale, smooth, spotOf} from './paint';

const PAL: RGB[] = [
  // 0-5: oyun alanı (çivit; birbirine yakın değerler)
  [26, 36, 98],
  [32, 44, 112],
  [22, 30, 86],
  [40, 52, 124],
  [28, 40, 106],
  [44, 42, 112],
  // 6-12: kenar (klasik ebru)
  [150, 24, 44], // lal
  [214, 166, 70], // altın
  [238, 226, 198], // krem
  [34, 118, 128], // turkuaz
  [16, 22, 64], // gece
  [96, 18, 42], // vişne
  [62, 96, 184], // mavi
  [30, 104, 66], // yeşil
];
const FIELD = [0, 1, 2, 3, 4, 5, 1, 0];
const RICH = [6, 7, 8, 9, 10, 6, 11, 12, 8, 7];

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  const k = resScale(w, h, Math.min(dpr, 1), 1, 300_000);
  const W = Math.round(w * k), H = Math.round(h * k);
  const S = spotOf(w, h);
  const u = Math.sqrt((W * H) / (330 * 714));
  const rnd = mulberry(0xeb3);
  const calm = tableCalm(w, h);
  // kenarlık ağırlığı: dış şerit + üst köşeler (0..1)
  const edgeW = W * 0.075, topW = H * 0.11;
  const rich = (x: number, y: number): number => {
    const e = Math.min(x, W - x) / edgeW, t = y / topW;
    const corner = (1 - smooth(0, 1, Math.hypot(Math.min(x, W - x) / (W * 0.34), y / (H * 0.2))));
    // yan şerit alt yarıda söner (yan deste, oyuncu rozeti ve elin yanında desen olmasın)
    const side = (1 - smooth(0.6, 1.2, e)) * (1 - smooth(H * 0.36, H * 0.56, y));
    return clamp(Math.max(side, 1 - smooth(0.6, 1.25, t), corner), 0, 1);
  };
  const ops: MOp[] = [];
  const n = Math.round((W * H) / 300);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H;
    const useRich = rnd() < rich(x, y);
    ops.push({k: 'drop', x, y, r: (11 + rnd() * 10) * u, c: useRich ? RICH[i % RICH.length] : FIELD[i % FIELD.length]});
  }
  gelgit(ops, true, 15 * u, 20 * u, 5 * u);
  ops.push({k: 'tine', x: 0, y: 0, dx: 0, dy: 1, a: 10 * u, l: 2.5 * u, s: 10 * u});
  ops.push({k: 'wave', dx: 1, dy: 0, A: 4 * u, f: 0.05 / u, ph: 0});
  // üst köşelerde iki lale (yaprak + sap)
  for (const [x, y, s] of [[0.13, 0.085, 24], [0.87, 0.085, 22]] as const) {
    const lx = W * x, ly = H * y, LR = s * u;
    rings(ops, lx, ly + LR * 1.5, [LR * 0.45, LR * 0.25], [13, 9]);
    ops.push({k: 'tine', x: lx, y: ly + LR * 1.5, dx: 0, dy: -1, a: LR * 1.4, l: LR * 0.08, t0: -LR, t1: LR, fall: LR * 0.5});
    lale(ops, lx, ly, LR, [6, 8, 11, 7]);
  }
  const tex = yield* marble({w: W, h: H, ops, pal: PAL, base: PAL[0], rim: 0.2});
  const [cv, g] = makeCanvas(W, H);
  g.drawImage(tex, 0, 0);
  tex.width = tex.height = 0;
  if (due()) yield;
  // kâğıt: lif greni + çok hafif ipeksi parlaklık (aharlı kâğıt)
  grain(g, W, H, rnd, 0.05);
  canvasWeave(g, W, H, rnd, 0.06);
  radial(g, W * 0.35, H * 0.3, 0, Math.max(W, H) * 0.7, [[0, 'rgba(255,250,235,.06)'], [1, 'rgba(255,250,235,0)']]);
  // okunurluk: kartların durduğu yerler derin çivitle sakinleşir (kenar ebrusu dahil)
  const step = 6, ow = Math.ceil(W / step), oh = Math.ceil(H / step);
  const [oc, og] = makeCanvas(ow, oh);
  const od = og.createImageData(ow, oh);
  for (let y = 0; y < oh; y++)
    for (let x = 0; x < ow; x++) {
      const q = calm(((x + 0.5) * step) / k, ((y + 0.5) * step) / k), i = (y * ow + x) * 4;
      od.data[i] = 12;
      od.data[i + 1] = 16;
      od.data[i + 2] = 52;
      od.data[i + 3] = q * 0.42 * 255;
    }
  og.putImageData(od, 0, 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(oc, 0, 0, W, H);
  oc.width = oc.height = 0;
  if (due()) yield;
  radial(g, S.px * k, S.py * k, 0, S.ringR * k * 2.2, [[0, 'rgba(8,10,36,.35)'], [1, 'rgba(8,10,36,0)']]);
  // ince altın çerçeve çizgisi (çerçevelenmiş ebru kâğıdı)
  const m = W * 0.022;
  g.strokeStyle = 'rgba(232,196,110,.55)';
  g.lineWidth = Math.max(1, W * 0.004);
  g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  radial(g, W / 2, H / 2, Math.min(W, H) * 0.6, Math.max(W, H) * 0.8, [[0, 'rgba(4,6,24,0)'], [1, 'rgba(4,6,24,.32)']]);
  return cv;
}

export const paintEbru = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
