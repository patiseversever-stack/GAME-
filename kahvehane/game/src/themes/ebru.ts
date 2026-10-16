// Masa "Ebru Salonu": bütün masa bir ebru teknesi. Battal damlalar gelgitle taranır, sonra yığının çevresinde büyük bir
// "bülbül yuvası" girdabına çekilir: desen kartların çevresinde döner, yığının altı koyu ve sakin kalır.
// Köşelerde iki lale ebrusu. Ebru motoru: src/skins/marble.ts (gerçek damla/tarak/girdap matematiği).
// Boyama dilimli (Promise): ana iş parçacığını bölmez; yumuşak içerik düşük çözünürlükte çizilip CSS ile gerilir.
import {battal, gelgit, lale, marble, rings, type MOp} from '../skins/marble';
import {runJob, type Job, type RGB} from '../skins/kit';
import {makeCanvas, mulberry, radial, resScale, spotOf} from './paint';

const PAL: RGB[] = [
  [14, 20, 62], // 0 gece laciverdi
  [26, 40, 110], // 1 lacivert
  [150, 20, 42], // 2 lal
  [222, 168, 64], // 3 altın
  [240, 228, 200], // 4 krem
  [34, 120, 132], // 5 turkuaz
  [92, 14, 40], // 6 vişne
  [60, 96, 190], // 7 mavi
  [30, 104, 66], // 8 yeşil
];

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  // ebru yumuşaktır: ~1× çözünürlük yeter (CSS ile gerilir); piksel sınırı süreyi sabit tutar
  const k = resScale(w, h, Math.min(dpr, 1), 1, 360_000);
  const W = Math.round(w * k), H = Math.round(h * k);
  const S = spotOf(w, h);
  const px = S.px * k, py = S.py * k, R = S.ringR * k;
  const u = Math.sqrt((W * H) / (390 * 844)); // ölçek: farklı ekranlarda aynı desen yoğunluğu
  const rnd = mulberry(0xeb2);
  const ops: MOp[] = [];
  battal(ops, W, H, rnd, [1, 0, 2, 1, 4, 0, 3, 5, 1, 6, 0, 7], Math.round(320 * Math.min(1.4, (W * H) / 330000)), 16 * u, 34 * u);
  gelgit(ops, true, 26 * u, 30 * u, 8 * u);
  ops.push({k: 'wave', dx: 1, dy: 0, A: 9 * u, f: 0.035 / u, ph: 0.4});
  // yığın çevresinde büyük bülbül yuvası (iç içe iki girdap: içte daha sıkı)
  ops.push({k: 'swirl', x: px, y: py, a: 3.2, r: R * 3.2});
  ops.push({k: 'swirl', x: px, y: py, a: 2.2, r: R * 1.8});
  // köşelerde küçük girdaplar
  for (const [x, y, s] of [[0.12, 0.12, -1], [0.88, 0.2, 1], [0.1, 0.7, 1], [0.9, 0.82, -1]] as const) ops.push({k: 'swirl', x: W * x, y: H * y, a: 4 * s, r: 40 * u});
  // iki lale (sol üst, sağ orta) + yeşil yapraklar
  for (const [x, y, s] of [[0.17, 0.25, 30], [0.83, 0.64, 26]] as const) {
    const lx = W * x, ly = H * y, LR = s * u;
    rings(ops, lx, ly + LR * 1.5, [LR * 0.45, LR * 0.25], [8, 5]);
    ops.push({k: 'tine', x: lx, y: ly + LR * 1.5, dx: 0, dy: -1, a: LR * 1.4, l: LR * 0.08, t0: -LR, t1: LR, fall: LR * 0.5});
    lale(ops, lx, ly, LR, [2, 4, 6, 3]);
  }
  const tex = yield* marble({w: W, h: H, ops, pal: PAL, base: PAL[0], rim: 0.24});
  const [cv, g] = makeCanvas(W, H);
  g.drawImage(tex, 0, 0);
  tex.width = tex.height = 0;
  // yığının altı sakin ve koyu (kartlar okunur), kenarlar hafif kararır
  radial(g, px, py, 0, R * 2.3, [
    [0, 'rgba(8,10,34,0.72)'],
    [0.45, 'rgba(8,10,34,0.5)'],
    [1, 'rgba(8,10,34,0)'],
  ]);
  // elin arkası: alt şerit koyulaşır
  const gb = g.createLinearGradient(0, H * 0.7, 0, H);
  gb.addColorStop(0, 'rgba(6,8,28,0)');
  gb.addColorStop(1, 'rgba(6,8,28,0.55)');
  g.fillStyle = gb;
  g.fillRect(0, H * 0.7, W, H * 0.3);
  radial(g, W / 2, H / 2, Math.min(W, H) * 0.5, Math.max(W, H) * 0.75, [
    [0, 'rgba(4,6,24,0)'],
    [1, 'rgba(4,6,24,0.5)'],
  ]);
  return cv;
}

export const paintEbru = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
