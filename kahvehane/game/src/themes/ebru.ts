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
  const k = resScale(w, h, Math.min(dpr, 1), 1, 280_000);
  const W = Math.round(w * k), H = Math.round(h * k);
  const S = spotOf(w, h);
  const px = S.px * k, py = S.py * k, R = S.ringR * k;
  const u = Math.sqrt((W * H) / (330 * 714)); // ölçek: farklı ekranlarda aynı desen yoğunluğu
  const rnd = mulberry(0xeb2);
  const ops: MOp[] = [];
  // taraklı ebru: sık battal → yatay gelgit → ince dikey tarak → dalga
  battal(ops, W, H, rnd, [1, 2, 4, 3, 0, 5, 6, 7, 1, 2, 4, 8], Math.round((W * H) / 300), 11 * u, 21 * u);
  gelgit(ops, true, 15 * u, 22 * u, 5 * u);
  ops.push({k: 'tine', x: 0, y: 0, dx: 0, dy: 1, a: 12 * u, l: 2.5 * u, s: 10 * u});
  ops.push({k: 'wave', dx: 1, dy: 0, A: 5 * u, f: 0.05 / u, ph: 0});
  // yığın çevresinde yumuşak girdap: tarak çizgileri kartların çevresinde döner
  ops.push({k: 'swirl', x: px, y: py, a: 1.05, r: R * 3.4});
  ops.push({k: 'swirl', x: px, y: py, a: 0.9, r: R * 1.6});
  // köşelerde küçük girdaplar
  for (const [x, y, s] of [[0.1, 0.1, -1], [0.9, 0.16, 1], [0.08, 0.66, 1], [0.92, 0.86, -1]] as const) ops.push({k: 'swirl', x: W * x, y: H * y, a: 3 * s, r: 30 * u});
  // iki lale (sol üst, sağ orta) + yeşil yapraklar
  for (const [x, y, s] of [[0.16, 0.27, 26], [0.84, 0.66, 22]] as const) {
    const lx = W * x, ly = H * y, LR = s * u;
    rings(ops, lx, ly + LR * 1.5, [LR * 0.45, LR * 0.25], [8, 5]);
    ops.push({k: 'tine', x: lx, y: ly + LR * 1.5, dx: 0, dy: -1, a: LR * 1.4, l: LR * 0.08, t0: -LR, t1: LR, fall: LR * 0.5});
    lale(ops, lx, ly, LR, [2, 4, 6, 3]);
  }
  const tex = yield* marble({w: W, h: H, ops, pal: PAL, base: PAL[0], rim: 0.24});
  const [cv, g] = makeCanvas(W, H);
  g.drawImage(tex, 0, 0);
  tex.width = tex.height = 0;
  // okunurluk: genel kontrast ~%30 düşer (lacivert örtü), orta %60 derin lacivert bir hale ile sakinleşir;
  // ebru kenarlara ve köşelere doğru güçlenir. Yığının altı ve elin arkası en koyu.
  g.fillStyle = 'rgba(12,16,52,0.32)';
  g.fillRect(0, 0, W, H);
  radial(g, W / 2, H * 0.5, 0, Math.max(W, H) * 0.5, [
    [0, 'rgba(7,10,36,0.78)'],
    [0.42, 'rgba(7,10,36,0.6)'],
    [0.72, 'rgba(7,10,36,0.22)'],
    [1, 'rgba(7,10,36,0)'],
  ], W / Math.max(W, H) * 1.25, H / Math.max(W, H));
  radial(g, px, py, 0, R * 2.2, [
    [0, 'rgba(6,8,30,0.55)'],
    [1, 'rgba(6,8,30,0)'],
  ]);
  const gb = g.createLinearGradient(0, H * 0.72, 0, H);
  gb.addColorStop(0, 'rgba(6,8,28,0)');
  gb.addColorStop(1, 'rgba(6,8,28,0.6)');
  g.fillStyle = gb;
  g.fillRect(0, H * 0.72, W, H * 0.28);
  return cv;
}

export const paintEbru = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
