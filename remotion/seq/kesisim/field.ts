// "Kesişim" sekansının dünyası: sonsuz bir Truchet karo alanı (her karede iki çeyrek yay), yayların oluşturduğu
// kesintisiz yollar, bu yollarda koşan ışık kuyruklu yıldızları ve tek bir sinema kamerası. Hepsi saf fonksiyon:
// aynı t için her zaman aynı sonuç (deterministik render).
import { Easing } from 'remotion';
import { hash } from '../../lib/math';

export type Edge = 0 | 1 | 2 | 3; // K D G B (N E S W)
const STEP: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const OPP: readonly Edge[] = [2, 3, 0, 1];
const PARTNER: ReadonlyArray<readonly Edge[]> = [[3, 2, 1, 0], [1, 0, 3, 2]]; // o=0: K↔B, D↔G · o=1: K↔D, G↔B
export const PAIRS: ReadonlyArray<ReadonlyArray<readonly [Edge, Edge]>> = [[[0, 3], [1, 2]], [[0, 1], [3, 2]]];

export const GRID = { i0: -48, i1: 48, j0: -52, j1: 76 } as const;
export const ARC_LEN = Math.PI / 4; // yarıçap 0.5, çeyrek çember

const k = (i: number, j: number) => i * 4096 + j;

// ---------- kahramanın rotası: her satırda bir yatay + bir kuzey adımı, yatay yön hedef eğriyi izler ----------
export type Step = { readonly i: number; readonly j: number; readonly a: Edge; readonly b: Edge };
const targetX = (j: number) => 2.4 * Math.sin(j / 5.2) + 1.1 * Math.sin(j / 2.1 + 1.3);

const routeTiles = new Map<number, 0 | 1>();
export const ROUTE: Step[] = (() => {
  const r: Step[] = [];
  let i = 0, j = 0;
  for (let row = 0; row < 64; row++) {
    const d = targetX(j + 1) > i + 0.5 ? 1 : -1;
    const o = (d > 0 ? 0 : 1) as 0 | 1;
    r.push({ i, j, a: 2, b: d > 0 ? 1 : 3 });
    r.push({ i: i + d, j, a: d > 0 ? 3 : 1, b: 0 });
    routeTiles.set(k(i, j), o);
    routeTiles.set(k(i + d, j), o);
    i += d; j += 1;
  }
  return r;
})();
export const onRoute = (i: number, j: number) => routeTiles.has(k(i, j));

// ---------- karo yönleri: rastgele (tohumlu), rota karoları sabit; dönüş dalgası karoların ~%55'ini çevirir ----------
export const baseO = (i: number, j: number): 0 | 1 => routeTiles.get(k(i, j)) ?? (hash(i + 500, j + 500, 1) < 0.5 ? 0 : 1);
export const flips = (i: number, j: number) => !onRoute(i, j) && hash(i + 500, j + 500, 2) < 0.55;
export const finalO = (i: number, j: number): 0 | 1 => (flips(i, j) ? (1 - baseO(i, j)) as 0 | 1 : baseO(i, j));
export const isAmber = (i: number, j: number) => hash(i + 500, j + 500, 3) < 0.13;

// yay geometrisi: köşe merkezi + giriş/çıkış açıları
export function arcGeom(i: number, j: number, a: Edge, b: Edge) {
  const has = (e: Edge) => a === e || b === e;
  let cx: number, cy: number, ang: Record<number, number>;
  if (has(0) && has(3)) { cx = i; cy = j + 1; ang = { 0: 0, 3: -Math.PI / 2 }; }
  else if (has(0) && has(1)) { cx = i + 1; cy = j + 1; ang = { 0: Math.PI, 1: 1.5 * Math.PI }; }
  else if (has(2) && has(1)) { cx = i + 1; cy = j; ang = { 1: Math.PI / 2, 2: Math.PI }; }
  else { cx = i; cy = j; ang = { 3: Math.PI / 2, 2: 0 }; }
  return { cx, cy, a0: ang[a], a1: ang[b] };
}

export function trace(i: number, j: number, a: Edge, orient: (i: number, j: number) => 0 | 1, max = 160): Step[] {
  const out: Step[] = [], seen = new Set<number>();
  for (let n = 0; n < max; n++) {
    if (i < GRID.i0 || i > GRID.i1 || j < GRID.j0 || j > GRID.j1) break;
    const s = k(i, j) * 4 + a;
    if (seen.has(s)) break;
    seen.add(s);
    const b = PARTNER[orient(i, j)][a];
    out.push({ i, j, a, b });
    i += STEP[b][0]; j += STEP[b][1]; a = OPP[b];
  }
  return out;
}

// yol üzerinde s uzunluğundaki nokta (dünya xy)
export function pointOnPath(path: readonly Step[], s: number) {
  const n = Math.max(0, Math.min(path.length - 1, Math.floor(s / ARC_LEN)));
  const u = Math.max(0, Math.min(1, s / ARC_LEN - n));
  const st = path[n], g = arcGeom(st.i, st.j, st.a, st.b), an = g.a0 + (g.a1 - g.a0) * u;
  return { x: g.cx + 0.5 * Math.cos(an), y: g.cy + 0.5 * Math.sin(an), n, u };
}

// ---------- zaman çizelgesi (sn) ----------
export const T = {
  ignite: 0.16,
  waveDraw: 0.85, // alan kendini çizmeye başlar
  orbit: [3.0, 5.5] as const, // yükselip kahramanın etrafında 180° dönüş
  turn: 5.6, // dönüş dalgası ("kesişim")
  comets: [6.0, 7.1] as const,
  title: 6.35,
  titleOut: 8.75,
  dive: [8.8, 9.62] as const,
  flash: 9.46,
  end: 9.7,
} as const;

// kahraman kuyruklu yıldızın yol üzerindeki konumu: yumuşak ivmelenme, sabit hız
export const HERO_V = 5.2;
export const heroS = (t: number) => {
  const tau = Math.max(0, t - T.ignite), kk = 0.3;
  return HERO_V * (tau - kk * (1 - Math.exp(-tau / kk)));
};
export const heroAt = (t: number) => pointOnPath(ROUTE, heroS(t));
// kameranın izlediği yumuşatılmış baş (zikzakları süzer)
export const heroSmooth = (t: number) => {
  let x = 0, y = 0, w = 0;
  for (let q = -10; q <= 10; q++) {
    const wt = Math.exp(-(q * q) / 50), p = heroAt(t + q * 0.07);
    x += p.x * wt; y += p.y * wt; w += wt;
  }
  return { x: x / w, y: y / w };
};

// alan dalgası (çizim) ve dönüş dalgası yarıçapları: hızlanarak büyür
export const drawRadius = (t: number) => { const d = Math.max(0, t - T.waveDraw); return 2.6 * d + 2.3 * d * d; };
export const WAVE_ORIGIN = { x: 0.5, y: 0 };
export const turnOrigin = heroAt(T.turn);
export const turnRadius = (t: number) => { const d = Math.max(0, t - T.turn); return 5 * d + 10 * d * d; };

// ---------- ikincil kuyruklu yıldızlar: dönüşten sonra açılan yeni yollarda ----------
export type Comet = { path: Step[]; t0: number; v: number; trail: number; hue: number };
export const COMETS: Comet[] = (() => {
  const out: Comet[] = [];
  const o = turnOrigin;
  for (let n = 0; out.length < 36 && n < 600; n++) {
    const ang = hash(n, 11, 7) * Math.PI * 2, rad = 2 + hash(n, 12, 7) * 15;
    const i = Math.floor(o.x + Math.cos(ang) * rad), j = Math.floor(o.y + Math.sin(ang) * rad);
    if (onRoute(i, j)) continue;
    const a = Math.floor(hash(n, 13, 7) * 4) as Edge;
    const path = trace(i, j, a, finalO, 140);
    if (path.length < 24) continue;
    const order = out.length / 35; // giderek sıklaşan ateşleme (hızlanan tempo)
    out.push({ path, t0: T.comets[0] + (T.comets[1] - T.comets[0]) * Math.pow(order, 0.6), v: 3.8 + hash(n, 14, 7) * 2.8, trail: 3.5 + hash(n, 15, 7) * 3, hue: hash(n, 16, 7) });
  }
  return out;
})();

// ---------- kamera ----------
export type Cam = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number; f: number };
const D2R = Math.PI / 180;
const orbitEase = Easing.bezier(0.55, 0, 0.18, 1);
const diveEase = Easing.bezier(0.6, 0, 0.9, 0.5);
const mixN = (a: number, b: number, p: number) => a + (b - a) * p;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Kamerayı kahramana göre tarif eder: azimut (0 = kuzeyde, önde · 180 = güneyde, arkada), yatay mesafe, yükseklik,
// başın ekranda duracağı y, odak uzaklığı. Tek bir ilerleme eğrisi (p) tüm parametreleri birlikte sürer.
type Rig = { az: number; D: number; h: number; yh: number; f: number; roll: number };
const CHASE: Rig = { az: 180, D: 3.4, h: 1.6, yh: 1010, f: 1250, roll: 0 };
const HIGH: Rig = { az: 0, D: 7.2, h: 7.4, yh: 1430, f: 1460, roll: 0 };

export function camAt(t: number, W = 1080, H = 1920): Cam {
  const hs = heroSmooth(t), hr = heroAt(t);
  let rig: Rig;
  if (t < T.orbit[0]) {
    // takip: kahramanın yanal kaymasına göre hafif yatış (drone hissi)
    const lat = heroSmooth(t + 0.12).x - heroSmooth(t - 0.12).x;
    rig = { ...CHASE, roll: Math.max(-3, Math.min(3, -lat * 7)) };
  } else {
    const p = orbitEase(clamp01((t - T.orbit[0]) / (T.orbit[1] - T.orbit[0])));
    const lat = heroSmooth(t + 0.12).x - heroSmooth(t - 0.12).x;
    const breathe = clamp01((t - T.orbit[1]) / 3.2);
    rig = {
      az: mixN(180, 0, p) - 6 * Math.sin(breathe * Math.PI * 0.9),
      D: mixN(CHASE.D, HIGH.D, p) + 1.1 * breathe,
      h: mixN(CHASE.h, HIGH.h, Math.pow(p, 0.85)) + 0.9 * breathe,
      yh: mixN(CHASE.yh, HIGH.yh, p),
      f: mixN(CHASE.f, HIGH.f, p),
      roll: (1 - p) * Math.max(-3, Math.min(3, -lat * 7)) + 1.6 * Math.sin(breathe * Math.PI),
    };
    if (t > T.dive[0]) {
      const q = diveEase(clamp01((t - T.dive[0]) / (T.dive[1] - T.dive[0])));
      rig = { ...rig, D: mixN(rig.D, 0.55, q), h: mixN(rig.h, 0.2, q), yh: mixN(rig.yh, H / 2, q), f: mixN(rig.f, 1250, q) };
    }
  }
  const az = rig.az * D2R;
  const x = hs.x + rig.D * Math.sin(az), y = hs.y + rig.D * Math.cos(az);
  const yaw = Math.atan2(hs.x - x, hs.y - y);
  void hr;
  const pitch = Math.atan2(rig.h, rig.D) - Math.atan2(rig.yh - H / 2, rig.f);
  return { x, y, z: rig.h, yaw, pitch, roll: rig.roll * D2R, f: rig.f };
}

// ---------- izdüşüm ----------
export type Basis = { cx: number; cy: number; cz: number; rx: number; ry: number; rz: number; ux: number; uy: number; uz: number; fx: number; fy: number; fz: number; f: number; W: number; H: number };
export function basis(c: Cam, W: number, H: number): Basis {
  const sy = Math.sin(c.yaw), cyw = Math.cos(c.yaw), sp = Math.sin(c.pitch), cp = Math.cos(c.pitch);
  const fx = sy * cp, fy = cyw * cp, fz = -sp;
  let rx = cyw, ry = -sy, rz = 0;
  let ux = sy * sp, uy = cyw * sp, uz = cp;
  const sr = Math.sin(c.roll), cr = Math.cos(c.roll);
  const rx2 = rx * cr + ux * sr, ry2 = ry * cr + uy * sr, rz2 = rz * cr + uz * sr;
  const ux2 = ux * cr - rx * sr, uy2 = uy * cr - ry * sr, uz2 = uz * cr - rz * sr;
  rx = rx2; ry = ry2; rz = rz2; ux = ux2; uy = uy2; uz = uz2;
  return { cx: c.x, cy: c.y, cz: c.z, rx, ry, rz, ux, uy, uz, fx, fy, fz, f: c.f, W, H };
}
// dünya noktası → [sx, sy, derinlik]; kameranın arkasındaysa derinlik <= 0
export function proj(b: Basis, X: number, Y: number, Z = 0): [number, number, number] {
  const dx = X - b.cx, dy = Y - b.cy, dz = Z - b.cz;
  const z = dx * b.fx + dy * b.fy + dz * b.fz;
  const x = dx * b.rx + dy * b.ry + dz * b.rz, y = dx * b.ux + dy * b.uy + dz * b.uz;
  if (z <= 0.02) return [0, 0, z];
  return [b.W / 2 + (b.f * x) / z, b.H / 2 - (b.f * y) / z, z];
}
