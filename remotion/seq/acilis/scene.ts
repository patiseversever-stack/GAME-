// AÇILIŞ — "Şehir uyurken, harfler uyanır."
// Sahnenin tamamı son karenin (poster) koordinatlarında tarif edilir (1080x1920). Her katmanın bir derinliği (D) var;
// kamera kahraman kulenin cephesindeki "G" penceresinden geriye doğru çekilir, yakın katmanlar daha hızlı kayar
// (gerçek perspektif). Pencerelerin yanma/sönme zamanları kameranın onları gördüğü ana göre hesaplanır.
import { Easing } from 'remotion';
import { hash } from '../../lib/math';

export const W = 1080, H = 1920, D0 = 1000, FPS = 60, DUR = 5.0;

// ---------- zaman çizelgesi (sn) ----------
export const T = {
  gOn: 0.1, // ilk pencere yanar
  pull: [0.5, 3.55] as const, // geri çekiliş
  tag: [3.22, 3.38] as const, // alt yazı satırları
  clue: 3.75, // bulmaca numaraları
  lastOff: 4.42, // şehirde sönen son pencere
} as const;

// ---------- kamera ----------
const pullEase = Easing.bezier(0.5, 0, 0.12, 1);
export const MAG = 11; // başlangıçta G penceresi ~11 kat büyük
export const G_CENTER = { x: 205 + 35, y: 800 + 2 * 104 + 40 }; // (240, 1048)

export type CamState = { m: number; cz: number; cx: number; cy: number; roll: number };
export function camAt(t: number): CamState {
  const u = pullEase(Math.max(0, Math.min(1, (t - T.pull[0]) / (T.pull[1] - T.pull[0]))));
  // hazırlık: çekilmeden önce kamera hafifçe içeri "nefes alır"
  const ax = Math.max(0, Math.min(1, (t - 0.1) / 0.5)), antic = ax * ax * (3 - 2 * ax);
  const m0 = Math.pow(MAG, 1 - u) * Math.pow(1.075, antic * (1 - u));
  // inişten sonra çok hafif ileri süzülme (son kare ölü durmasın, ikinci sahneye hız devri)
  const drift = 1 + 0.014 * Math.max(0, Math.min(1, (t - T.pull[1]) / (DUR - T.pull[1]))) ** 1.2;
  const m = m0 * drift;
  const lam = Math.max(0, (MAG - m0) / (MAG - 1));
  const gx = G_CENTER.x - W / 2, gy = G_CENTER.y - H / 2;
  return { m, cz: D0 * (1 - 1 / m), cx: gx * (1 - lam / m), cy: gy * (1 - lam / m), roll: (-4.5 * (1 - u) * Math.PI) / 180 };
}

// katman dönüşümü: son kare koordinatı (X,Y) → ekran; D=Infinity gök
export function layerMatrix(c: CamState, D: number): [number, number, number, number, number, number] | null {
  const cs = Math.cos(c.roll), sn = Math.sin(c.roll);
  let k = 1, ox = 0, oy = 0;
  if (Number.isFinite(D)) {
    const dist = D - c.cz;
    if (dist <= 1) return null;
    k = D / dist;
    const s = D0 / dist;
    ox = -s * c.cx; oy = -s * c.cy;
  }
  const A = ox - (W / 2) * k, B = oy - (H / 2) * k;
  return [k * cs, k * sn, -k * sn, k * cs, W / 2 + cs * A - sn * B, H / 2 + sn * A + cs * B];
}
export const apply = (mx: number[], x: number, y: number) => [mx[0] * x + mx[2] * y + mx[4], mx[1] * x + mx[3] * y + mx[5]];

// ---------- pencereler ----------
export type Win = {
  x: number; y: number; w: number; h: number; D: number;
  letter?: string; clue?: string; // başlık penceresi
  lit0: boolean; // akşam yanık mı
  onAt: number; offAt: number; // yanma / sönme zamanı (Infinity = hiç)
  warm: number; // renk sıcaklığı 0..1
  bright: number; // parlaklık
  curtain: number; // perde (-1 sol, 1 sağ, 0 yok)
};
export type Building = { D: number; x0: number; x1: number; top: number; fill: [string, string]; rim: number; wins: Win[]; roof?: 'flat' | 'dome' | 'tank' };

// başlık: GECE (2. sıra, 0-3. sütun) ve POSTASI (4. sıra, 0-6. sütun)
const TITLE: Record<string, { letter: string; clue?: string }> = {};
'GECE'.split('').forEach((l, i) => { TITLE[`2,${i}`] = { letter: l, clue: i === 0 ? '1' : undefined }; });
'POSTASI'.split('').forEach((l, i) => { TITLE[`4,${i}`] = { letter: l, clue: i === 0 ? '2' : undefined }; });

// kulenin kütleleri (son kare koordinatı)
export const HERO = {
  body: { x0: 150, x1: 930, top: 760 },
  set1: { x0: 232, x1: 848, top: 612 },
  set2: { x0: 324, x1: 756, top: 500 },
  crown: [
    { x0: 404, x1: 676, top: 420 },
    { x0: 440, x1: 640, top: 388 },
    { x0: 474, x1: 606, top: 360 },
    { x0: 508, x1: 572, top: 336 },
  ],
  spire: { x: 540, top: 206, base: 336 },
  grid: { cols: 7, x0: 205, px: 96, w: 70, rows: 11, y0: 800, py: 104, h: 80 },
};

function heroWindows(): Win[] {
  const g = HERO.grid, out: Win[] = [];
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    const t = TITLE[`${r},${c}`], hsh = hash(r + 40, c + 40, 31);
    out.push({
      x: g.x0 + c * g.px, y: g.y0 + r * g.py, w: g.w, h: g.h, D: D0,
      letter: t?.letter, clue: t?.clue,
      lit0: !t && hsh < 0.58 && !(r >= 1 && r <= 3 && c <= 2), onAt: t ? 0 : -1, offAt: Infinity,
      warm: 0.35 + hash(r, c, 32) * 0.65, bright: t ? 1 : 0.5 + hash(r, c, 33) * 0.35, curtain: t ? 0 : hash(r, c, 34) < 0.5 ? -1 : 1,
    });
  }
  // üst kütlelerin pencereleri
  for (let c = 0; c < 6; c++) out.push({ x: 262 + c * 96, y: 650, w: 70, h: 72, D: D0, lit0: hash(c, 1, 35) < 0.6, onAt: -1, offAt: Infinity, warm: hash(c, 2, 35), bright: 0.55, curtain: hash(c, 3, 35) < 0.5 ? -1 : 1 });
  for (let c = 0; c < 4; c++) out.push({ x: 348 + c * 96, y: 530, w: 70, h: 56, D: D0, lit0: hash(c, 4, 35) < 0.55, onAt: -1, offAt: Infinity, warm: hash(c, 5, 35), bright: 0.5, curtain: 0 });
  return out;
}

function cityBuilding(seed: number, D: number, x0: number, x1: number, top: number, fill: [string, string], cols: number, roof: Building['roof'] = 'flat'): Building {
  const wins: Win[] = [];
  const bw = x1 - x0, pitchX = bw / cols, ww = pitchX * 0.52, pitchY = pitchX * 1.18, wh = pitchY * 0.58;
  for (let r = 0; top + 26 + r * pitchY < H + 60; r++) for (let c = 0; c < cols; c++) {
    const hs = hash(seed, r * 17 + c, 41);
    wins.push({ x: x0 + c * pitchX + (pitchX - ww) / 2, y: top + 26 + r * pitchY, w: ww, h: wh, D, lit0: hs < 0.62, onAt: -1, offAt: Infinity, warm: hash(seed, r * 17 + c, 42), bright: 0.45 + hash(seed, r * 17 + c, 43) * 0.4, curtain: 0 });
  }
  return { D, x0, x1, top, fill, rim: D < 1300 ? 0.55 : 0.28, wins, roof };
}

export const CITY: Building[] = [
  cityBuilding(1, 1500, -10, 214, 1150, ['#101a2b', '#0b1220'], 3),
  cityBuilding(2, 1400, 870, 1090, 950, ['#0f1829', '#0a111d'], 3, 'tank'),
  cityBuilding(3, 880, -70, 176, 1240, ['#0c1422', '#070c15'], 3),
  cityBuilding(4, 905, 918, 1150, 812, ['#0c1422', '#070c15'], 3),
];
export const HERO_WINS = heroWindows();

// uzak siluetler (katman başına basit yükseklik profili + minik pencereler)
export type Far = { D: number; color: string; haze: string; blocks: Array<[number, number, number]>; specials: Array<{ kind: 'dome' | 'minaret' | 'tower'; x: number; y: number; s: number }>; dots: Array<[number, number, number]> };
function farLayer(seed: number, D: number, base: number, amp: number, color: string, haze: string): Far {
  const blocks: Array<[number, number, number]> = [], dots: Array<[number, number, number]> = [];
  let x = -120;
  while (x < W + 120) {
    const w = 28 + hash(seed, x, 51) * 70, h = base - amp * (0.2 + hash(seed, x, 52) * 0.8);
    blocks.push([x, x + w, h]);
    for (let k = 0; k < 3; k++) if (hash(seed, x + k, 53) < 0.5) dots.push([x + 6 + hash(seed, x + k, 54) * (w - 12), h + 10 + hash(seed, x + k, 55) * 120, hash(seed, x + k, 56)]);
    x += w + hash(seed, x, 57) * 6;
  }
  return { D, color, haze, blocks, specials: [], dots };
}
export const FAR: Far[] = [
  { ...farLayer(7, 4200, 1060, 120, '#26395a', 'rgba(64,86,112,0.42)'), specials: [{ kind: 'dome', x: 104, y: 980, s: 1.25 }, { kind: 'minaret', x: 14, y: 980, s: 1.2 }, { kind: 'minaret', x: 196, y: 980, s: 1.2 }, { kind: 'dome', x: 60, y: 1010, s: 0.6 }] },
  { ...farLayer(9, 2700, 1180, 150, '#172439', 'rgba(40,58,84,0.45)'), specials: [{ kind: 'tower', x: 1000, y: 1000, s: 1 }] },
];

// ön plan: çatı parapeti + su deposu (bal. alt sol)
export const FG_D = 620;

// ---------- pencere koreografisi: kamera gördükçe ----------
// ekranın içine ilk girdiği an (örnekleme ile)
function firstSeen(x: number, y: number, D: number, margin = -20) {
  for (let t = 0; t <= DUR; t += 0.02) {
    const mx = layerMatrix(camAt(t), D);
    if (!mx) continue;
    const [sx, sy] = apply(mx, x, y);
    if (sx > margin && sx < W - margin && sy > margin && sy < H - margin) return t;
  }
  return DUR;
}

(() => {
  // başlık pencereleri: görüldükleri anda yanar, aralarında en az 70 ms
  const titles = HERO_WINS.filter(w => w.letter).map(w => ({ w, seen: w.letter && w.x === HERO.grid.x0 && w.y === HERO.grid.y0 + 2 * HERO.grid.py ? T.gOn : firstSeen(w.x + w.w / 2, w.y + w.h / 2, w.D) + 0.1 }));
  titles.sort((a, b) => a.seen - b.seen);
  let last = -1;
  for (const it of titles) { const on = Math.max(it.seen, last + 0.07); it.w.onAt = on; last = on; }
  // diğer pencereler: akşam yanık olanlar, görüldükten kısa süre sonra söner (şehir uyur); birkaçı gece kuşu olarak kalır
  const all = [...HERO_WINS.filter(w => !w.letter), ...CITY.flatMap(b => b.wins)];
  all.forEach((w, i) => {
    if (!w.lit0) return;
    const owl = w.D !== D0 && hash(i, 7, 61) < 0.035;
    if (owl) return;
    const seen = firstSeen(w.x + w.w / 2, w.y + w.h / 2, w.D, 40);
    w.offAt = Math.min(4.3, Math.max(seen + 0.3, 1.1) + hash(i, 8, 61) * 1.1);
  });
  // "son uyuyan": başlığa yakın bir pencere geç söner
  const lastWin = HERO_WINS.find(w => !w.letter && w.y === HERO.grid.y0 + 3 * HERO.grid.py && w.x === HERO.grid.x0 + 5 * HERO.grid.px);
  if (lastWin) { lastWin.lit0 = true; lastWin.offAt = T.lastOff; lastWin.bright = 0.6; }
})();

// pencerenin anlık ışığı (0..1): yanarken kısa titreme, sönerken kısa kararma
export function winLight(w: Win, t: number) {
  let v = w.lit0 ? 1 : 0;
  if (w.onAt >= 0) {
    const d = t - w.onAt;
    if (d < 0) v = 0;
    else if (d < 0.05) v = 0.9;
    else if (d < 0.09) v = 0.18;
    else if (d < 0.13) v = 0.75;
    else if (d < 0.17) v = 0.45;
    else v = Math.min(1.12, 0.55 + (d - 0.17) * 3.2) - Math.max(0, Math.min(0.12, (d - 0.3) * 0.5));
  }
  if (t >= w.offAt) {
    const d = t - w.offAt;
    v *= d < 0.05 ? 0.35 : d < 0.08 ? 0.7 : Math.max(0, 1 - (d - 0.08) / 0.12) * 0.5;
  }
  return Math.max(0, v);
}
