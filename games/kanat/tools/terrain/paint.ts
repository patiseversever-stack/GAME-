// World painters: per-texel splat weights, albedo (linear), rock mask and placement masks; plus the shared
// pre-lighting model used for color_macro / color_far (documented in world.json bakeLighting).

import { type RGB, hexToLinear, kelvinToLinear, mix3 } from './color.ts';
import { clamp01, fbm, smoothstep, vnoise } from './grid.ts';
import type { WorldDef } from './worldDefs.ts';

export interface PaintFields {
  res: number;
  spacing: number;
  originX: number;
  originZ: number;
  /** heights (m, scaled) */
  h: Float32Array;
  /** normals xyz interleaved */
  n: Float32Array;
  slope: Float32Array;
  /** small-scale convexity (m): h - blur(~16 m) */
  convS: Float32Array;
  /** large-scale relative height (m): h - blur(~500 m) */
  relH: Float32Array;
  /** drainage 0..1 (log flow accumulation) */
  drain: Float32Array;
  /** signed coast distance (m): + land, - sea. null when no sea. */
  coast: Float32Array | null;
  /** travertine / special zone 0..1 (Pamukkale), null otherwise */
  zone: Float32Array | null;
  /** ruins zone 0..1 (Pamukkale) */
  zone2: Float32Array | null;
  stats: { min: number; max: number; p5: number; p50: number; p95: number };
  /** True when painting the far ring (coarser data: painter compensates slope thresholds). */
  far: boolean;
}

export interface TexelOut {
  w: [number, number, number, number];
  albedo: RGB;
  rock: number;
  masks: [number, number, number, number];
}

export type Painter = (f: PaintFields, i: number, x: number, z: number, o: TexelOut) => void;

const L = hexToLinear;

/** Rectangular field parcels: returns id in [0,1) and edge factor (1 inside, →0 on hedges). */
function parcel(x: number, z: number, size: number, angle: number, seed: number): [number, number] {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  let u = (x * ca + z * sa) / size;
  let v = (-x * sa + z * ca) / (size * 0.55);
  // warp
  u += 0.35 * vnoise(x / 700, z / 700, seed + 1);
  v += 0.35 * vnoise(x / 650, z / 650, seed + 2);
  const iv = Math.floor(v);
  u += (((iv * 73856093) >>> 0) % 1000) / 1000; // row offset
  const iu = Math.floor(u);
  const fu = u - iu;
  const fv = v - iv;
  let hsh = Math.imul(iu, 374761393) ^ Math.imul(iv, 668265263) ^ Math.imul(seed, 1442695041);
  hsh = Math.imul(hsh ^ (hsh >>> 13), 1274126177);
  hsh ^= hsh >>> 16;
  const id = (hsh >>> 0) / 4294967296;
  const e = Math.min(fu, 1 - fu, fv * 0.55, (1 - fv) * 0.55) * size;
  return [id, smoothstep(0, 6, e)];
}

function pick(cols: RGB[], t: number): RGB {
  return cols[Math.min(cols.length - 1, Math.floor(t * cols.length))];
}

function normW(o: TexelOut): void {
  const s = o.w[0] + o.w[1] + o.w[2] + o.w[3];
  if (s <= 1e-6) {
    o.w[0] = 1;
    o.w[1] = o.w[2] = o.w[3] = 0;
    return;
  }
  for (let k = 0; k < 4; k++) o.w[k] /= s;
}

/** Effective slope for rules: the far ring's coarse grid under-reports slope. */
function eSlope(f: PaintFields, i: number): number {
  const s = f.slope[i];
  return f.far ? Math.min(89, s * 1.7) : s;
}

// ---------------------------------------------------------------- Kapadokya
const K = {
  cream: L('#E8DFCF'),
  white: L('#F0E9DD'),
  ochre: L('#DCC39F'),
  rose: L('#E0B3A3'),
  roseDeep: L('#CC9686'),
  gully: L('#BFA48C'),
  soil: L('#C9BC98'),
  soilWarm: L('#C4AE86'),
  steppe: L('#B0A47A'),
  dryGrass: L('#A99A72'),
  stubble: L('#D2C3A0'),
  plowed: L('#B4977A'),
  redSoil: L('#B98C74'),
  vineyard: L('#9A9466'),
  orchard: L('#6E7646'),
  poplar: L('#5A6636'),
  poplarDark: L('#475229'),
  basalt: L('#73665E'),
  goldFog: L('#F4D9A6'),
};

/** Organic field parcels: warped jittered-grid Voronoi. Returns [cell id 0..1, interior 0..1 (0 on borders)]. */
function voronoiParcel(x: number, z: number, size: number, seed: number): [number, number] {
  const wx = x + size * 0.18 * vnoise(x / (size * 1.7), z / (size * 1.7), seed + 3);
  const wz = z + size * 0.18 * vnoise(x / (size * 1.6), z / (size * 1.6), seed + 4);
  const u = wx / size;
  const v = wz / (size * 0.62);
  const iu = Math.floor(u);
  const iv = Math.floor(v);
  let d1 = 1e9;
  let d2 = 1e9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      let h = Math.imul(iu + i, 374761393) ^ Math.imul(iv + j, 668265263) ^ Math.imul(seed, 1442695041);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      h ^= h >>> 16;
      const r1 = (h >>> 0) / 4294967296;
      const r2 = (Math.imul(h, 2654435761) >>> 0) / 4294967296;
      const px = iu + i + 0.15 + 0.7 * r1;
      const py = iv + j + 0.15 + 0.7 * r2;
      const d = (px - u) * (px - u) + (py - v) * (py - v);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = r1 * 0.5 + r2 * 0.5;
      } else if (d < d2) d2 = d;
    }
  }
  const edge = Math.sqrt(d2) - Math.sqrt(d1);
  return [id, smoothstep(0.02, 0.09, edge)];
}

const paintKapadokya: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const h = f.h[i];
  const rel = f.relH[i];
  const conv = f.convS[i];
  const dr = f.drain[i];
  const n1 = fbm(x / 140, z / 140, 3, 3);
  const valley = smoothstep(0.47, 0.64, dr + 0.06 * n1) * smoothstep(16, 5, s) * (0.55 + 0.45 * smoothstep(-0.35, 0.1, fbm(x / 160, z / 160, 4, 3)));
  const expo = smoothstep(7, 17, s + 5 * n1) * (1 - valley * 0.7);
  const pinkZone = smoothstep(-0.1, 0.45, fbm(x / 2400, z / 2400, 7, 3));
  // subtle, irregular strata (ignimbrite layers), broken up by noise so they never read as contour lines
  const band = (0.5 + 0.5 * Math.sin(h / 9 + 6.0 * fbm(x / 300, z / 300, 9, 3))) * smoothstep(-0.2, 0.4, vnoise(x / 180, z / 180, 10));
  let tuff = mix3(K.cream, K.white, smoothstep(0, 4, conv) * 0.7 + 0.15 * vnoise(x / 60, z / 60, 11));
  tuff = mix3(tuff, K.ochre, band * 0.18);
  tuff = mix3(tuff, band > 0.55 ? K.roseDeep : K.rose, pinkZone * (0.3 + 0.2 * band));
  tuff = mix3(tuff, K.gully, smoothstep(-1, -5, conv) * 0.45);
  // fairy-chimney speckle (sub-texel bright tips / dark shadows read as texture from above)
  const speck = vnoise(x / 5.5, z / 5.5, 13) * 0.5 + vnoise(x / 2.7, z / 2.7, 14) * 0.5;
  tuff = mix3(tuff, speck > 0 ? K.white : K.gully, Math.abs(speck) * 0.35);
  const cap = smoothstep(1.5, 5, conv) * smoothstep(9, 20, s) * smoothstep(0, 35, rel) * 0.85;
  // open ground: pale tuff-derived soil, dry steppe, sparse fields
  let ground = mix3(K.soil, K.steppe, smoothstep(-0.3, 0.5, fbm(x / 220, z / 220, 23, 4)));
  ground = mix3(ground, K.soilWarm, 0.3 + 0.3 * vnoise(x / 45, z / 45, 24));
  const [pid, pin] = voronoiParcel(x, z, 190, 19);
  const fieldsMask = smoothstep(6, 2.5, s) * smoothstep(0.0, 0.3, fbm(x / 1200, z / 1200, 21, 3)) * (1 - valley);
  const fieldCol = pick([K.stubble, K.plowed, K.vineyard, K.redSoil, K.stubble, K.dryGrass, K.vineyard, K.soilWarm], pid);
  ground = mix3(ground, mix3(ground, fieldCol, 0.6 * pin), fieldsMask);
  // scattered shrubs / trees on gentle ground (dark specks)
  const shrub = smoothstep(0.55, 0.85, vnoise(x / 7, z / 7, 27) * 0.6 + 0.5 * fbm(x / 300, z / 300, 28, 2) + 0.2);
  ground = mix3(ground, K.poplarDark, shrub * 0.35 * smoothstep(18, 6, s));
  // valley floors: orchards, poplar rows
  const trees = 0.5 + 0.5 * vnoise(x / 9, z / 9, 29);
  const valleyCol = mix3(mix3(K.orchard, K.poplar, trees), K.poplarDark, smoothstep(0.55, 0.9, trees) * 0.6);
  ground = mix3(ground, valleyCol, valley * 0.85);
  let a = mix3(ground, tuff, expo);
  a = mix3(a, K.basalt, cap);
  // artistic: golden valley-floor tint (ground fog glow)
  const lowT = smoothstep(f.stats.p5 + 50, f.stats.p5 - 10, h);
  a = mix3(a, K.goldFog, lowT * 0.1);
  o.albedo = a;
  o.w[0] = expo * (0.2 + 0.8 * pinkZone) * (1 - cap);
  o.w[1] = expo * (1 - pinkZone) * 0.8 * (1 - cap);
  o.w[2] = 1 - expo;
  o.w[3] = cap;
  normW(o);
  o.rock = clamp01(expo * 0.9 + cap);
  const chim = smoothstep(5, 12, s) * smoothstep(42, 28, s) * smoothstep(30, -10, rel) * smoothstep(0.15, 0.6, 0.5 + 0.5 * fbm(x / 350, z / 350, 31, 3));
  o.masks[0] = clamp01(chim * 1.4 + valley * 0.3 * smoothstep(0.2, 0.6, 0.5 + 0.5 * fbm(x / 200, z / 200, 33, 2)));
  o.masks[1] = clamp01(valley * smoothstep(0.3, 0.6, trees) * 1.3);
  o.masks[2] = smoothstep(9, 4, s);
  o.masks[3] = dr;
};

// ---------------------------------------------------------------- Likya
const LY = {
  lime: L('#CFC6B4'),
  limeWarm: L('#D8C8AA'),
  limeGray: L('#A9A497'),
  pine: L('#3F5B3A'),
  pineDark: L('#2E4730'),
  maki: L('#86805A'),
  makiDry: L('#A39A73'),
  sand: L('#E9D8B4'),
  terrace: L('#9C8E62'),
  olive: L('#6F7550'),
  seaShallow: L('#2BB3B1'),
  seaDeep: L('#0B4F6C'),
  seabedSand: L('#BFD8C6'),
  seagrass: L('#1E5A5A'),
};

const paintLikya: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const h = f.h[i];
  const cd = f.coast ? f.coast[i] : 1000;
  if (h < 0) {
    const depth = -h;
    const shallow = smoothstep(0, 22, depth);
    const grass = smoothstep(6, 14, depth) * smoothstep(0.0, 0.4, 0.5 + 0.5 * fbm(x / 160, z / 160, 41, 3)) * smoothstep(40, 20, depth);
    let a = mix3(mix3(LY.seabedSand, LY.seaShallow, 0.55), LY.seaShallow, shallow * 0.6);
    a = mix3(a, LY.seagrass, grass * 0.6);
    a = mix3(a, LY.seaDeep, smoothstep(12, 70, depth));
    o.albedo = a;
    o.w[0] = 0;
    o.w[1] = 0;
    o.w[2] = 1;
    o.w[3] = 0;
    o.rock = 0;
    o.masks[0] = 0;
    o.masks[1] = 0;
    o.masks[2] = 0;
    o.masks[3] = clamp01(1 - Math.abs(cd) / 1000);
    return;
  }
  const cliff = smoothstep(30, 48, s + 8 * fbm(x / 90, z / 90, 43, 3));
  const beach = smoothstep(6, 1.5, h) * smoothstep(16, 6, s) * smoothstep(60, 15, cd);
  const pineD = smoothstep(-0.25, 0.3, fbm(x / 600, z / 600, 45, 4)) * smoothstep(1000, 700, h) * smoothstep(42, 28, s) * smoothstep(5, 25, h);
  const karst = smoothstep(500, 900, h) * smoothstep(0, 6, f.convS[i] + 2);
  const [pid, pedge] = parcel(x, z, 55, 0.2 + 0.5 * vnoise(x / 3000, z / 3000, 47), 49);
  const fields = smoothstep(10, 4, s) * smoothstep(600, 300, h) * smoothstep(-0.1, 0.35, fbm(x / 900, z / 900, 51, 3)) * smoothstep(20, 60, cd);
  let ground = mix3(LY.maki, LY.makiDry, 0.5 + 0.5 * fbm(x / 70, z / 70, 53, 4));
  ground = mix3(ground, pick([LY.terrace, LY.olive, LY.makiDry, LY.olive], pid), fields * pedge);
  const pineCol = mix3(LY.pineDark, LY.pine, 0.5 + 0.5 * vnoise(x / 18, z / 18, 55));
  let a = mix3(ground, pineCol, pineD);
  const limeCol = mix3(mix3(LY.lime, LY.limeWarm, 0.5 + 0.5 * fbm(x / 150, z / 150, 57, 3)), LY.limeGray, 0.3 + 0.3 * vnoise(x / 40, z / 40, 59));
  a = mix3(a, limeCol, Math.max(cliff, karst * 0.6));
  a = mix3(a, LY.sand, beach);
  o.albedo = a;
  const rockW = Math.max(cliff, karst * 0.6);
  o.w[0] = rockW;
  o.w[1] = (1 - rockW) * pineD;
  o.w[2] = beach;
  o.w[3] = (1 - rockW) * (1 - pineD) * (1 - beach);
  normW(o);
  o.rock = clamp01(rockW);
  o.masks[0] = clamp01(smoothstep(38, 55, s) * smoothstep(400, 30, h) * smoothstep(15, 40, h) * smoothstep(1500, 200, cd) * 1.5);
  o.masks[1] = clamp01(pineD * (1 - cliff));
  o.masks[2] = smoothstep(9, 4, s) * smoothstep(1, 3, h);
  o.masks[3] = clamp01(1 - Math.abs(cd) / 1000);
};

// ---------------------------------------------------------------- Karadeniz
const KD = {
  spruce: L('#1F3B2C'),
  spruceDark: L('#17301F'),
  beech: L('#3E5A2C'),
  beechLight: L('#557038'),
  meadow: L('#6E8B3D'),
  meadowLight: L('#87A04E'),
  meadowDry: L('#8D8F55'),
  rock: L('#5F5D58'),
  rockLight: L('#7C7972'),
  snow: L('#EEF0EE'),
  soil: L('#6B5440'),
};

const paintKaradeniz: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const h = f.h[i];
  const treeline = 1950 + 180 * fbm(x / 900, z / 900, 61, 3);
  const forest = smoothstep(treeline + 60, treeline - 60, h) * smoothstep(48, 36, s);
  // clearings (yayla meadows) inside the forest on gentle ground
  const clearing = smoothstep(16, 7, s) * smoothstep(0.05, 0.4, fbm(x / 500, z / 500, 63, 3)) * smoothstep(1250, 1450, h);
  const forestF = forest * (1 - clearing);
  const deciduous = smoothstep(1500, 1150, h + 120 * fbm(x / 400, z / 400, 65, 2));
  const rockW = clamp01(smoothstep(36, 50, s + 6 * fbm(x / 80, z / 80, 67, 3)) + smoothstep(2650, 3000, h) * smoothstep(18, 30, s));
  const north = -f.n[i * 3 + 2]; // >0 faces north
  const snowW = smoothstep(2750, 3000, h + 150 * north + 60 * fbm(x / 200, z / 200, 69, 3)) * smoothstep(-2, -6, f.convS[i] - 2) * smoothstep(40, 25, s);
  const treeCol = mix3(mix3(KD.spruceDark, KD.spruce, 0.5 + 0.5 * vnoise(x / 14, z / 14, 71)), mix3(KD.beech, KD.beechLight, 0.5 + 0.5 * vnoise(x / 20, z / 20, 73)), deciduous * 0.75);
  const meadowCol = mix3(mix3(KD.meadow, KD.meadowLight, 0.5 + 0.5 * fbm(x / 60, z / 60, 75, 3)), KD.meadowDry, smoothstep(2200, 2700, h) * 0.6);
  let a = mix3(meadowCol, treeCol, forestF);
  a = mix3(a, mix3(KD.rock, KD.rockLight, 0.5 + 0.5 * vnoise(x / 30, z / 30, 77)), rockW);
  a = mix3(a, KD.snow, snowW);
  o.albedo = a;
  o.w[0] = forestF * (1 - rockW);
  o.w[1] = (1 - forestF) * (1 - rockW) * (1 - snowW);
  o.w[2] = rockW * (1 - snowW);
  o.w[3] = snowW;
  normW(o);
  o.rock = clamp01(rockW);
  o.masks[0] = clamp01(smoothstep(14, 6, s) * smoothstep(1250, 1350, h) * smoothstep(2350, 2150, h) * (clearing + (1 - forest) * 0.6) * smoothstep(0.1, 0.5, 0.5 + 0.5 * fbm(x / 260, z / 260, 79, 2)));
  o.masks[1] = clamp01(forestF * (1 - rockW));
  o.masks[2] = smoothstep(9, 4, s);
  o.masks[3] = f.drain[i];
};

// ---------------------------------------------------------------- Erciyes
const E = {
  snow: L('#F6F3EE'),
  snowWarm: L('#FBF4EA'),
  snowBlue: L('#E6EDF5'),
  ice: L('#BFE6F2'),
  rock: L('#4A4642'),
  rockRed: L('#5E4A42'),
  soil: L('#6E5E52'),
  steppe: L('#8E8170'),
};

const paintErciyes: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const h = f.h[i];
  const conv = f.convS[i];
  const snowLine = 1750 + 150 * fbm(x / 1500, z / 1500, 81, 3);
  const snowAlt = smoothstep(snowLine - 120, snowLine + 120, h);
  const scour = smoothstep(2.0, 5.5, conv) * smoothstep(2400, 3000, h) * 0.8;
  const rockW = clamp01(smoothstep(38, 52, s + 7 * fbm(x / 70, z / 70, 83, 3)) + scour * smoothstep(18, 32, s));
  const north = -f.n[i * 3 + 2];
  const iceW = smoothstep(3100, 3400, h) * smoothstep(0.1, 0.5, north) * smoothstep(-1.5, -4, conv) * smoothstep(25, 35, s) * (1 - rockW);
  const lowSnow = snowAlt * (0.75 + 0.25 * smoothstep(-0.3, 0.3, fbm(x / 120, z / 120, 85, 3)));
  const snowW = clamp01(lowSnow * (1 - rockW * 0.85) - iceW);
  const ground = mix3(E.steppe, E.soil, 0.5 + 0.5 * fbm(x / 90, z / 90, 87, 3));
  const rockCol = mix3(E.rock, E.rockRed, 0.5 + 0.5 * fbm(x / 400, z / 400, 89, 2));
  let a = mix3(ground, rockCol, rockW);
  const snowCol = mix3(mix3(E.snow, E.snowWarm, 0.5), E.snowBlue, 0.3 + 0.3 * vnoise(x / 60, z / 60, 91));
  a = mix3(a, snowCol, snowW);
  a = mix3(a, E.ice, iceW);
  o.albedo = a;
  o.w[0] = snowW;
  o.w[1] = iceW;
  o.w[2] = rockW * (1 - snowW);
  o.w[3] = (1 - snowW) * (1 - rockW) * (1 - iceW);
  normW(o);
  o.rock = clamp01(rockW);
  o.masks[0] = clamp01(smoothstep(1.5, 5, conv) * smoothstep(2800, 3200, h) * smoothstep(15, 30, s) * 1.5);
  o.masks[1] = 0;
  o.masks[2] = smoothstep(9, 4, s);
  o.masks[3] = snowW;
};

// ---------------------------------------------------------------- Pamukkale
const P = {
  trav: L('#F5EDE4'),
  travWarm: L('#F3D9BF'),
  travGray: L('#DCD3C8'),
  soil: L('#B0906F'),
  soilDark: L('#8E6E52'),
  grass: L('#7F8350'),
  grassDry: L('#A39A6B'),
  olive: L('#5F6A3E'),
  ruin: L('#C9A27E'),
  rock: L('#8F8070'),
  field1: L('#8C8A4E'),
  field2: L('#B79D74'),
  field3: L('#6E7A3C'),
  field4: L('#A5835F'),
  town: L('#C7B9A6'),
};

const paintPamukkale: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const zone = f.zone ? f.zone[i] : 0;
  const ruins = f.zone2 ? f.zone2[i] : 0;
  const trav = clamp01(zone * smoothstep(1.0, 3.0, s + 2) * (0.85 + 0.15 * vnoise(x / 30, z / 30, 101)));
  const rockW = smoothstep(26, 42, s + 6 * fbm(x / 80, z / 80, 103, 3));
  const plain = smoothstep(8, 3, s) * smoothstep(f.stats.p50 + 20, f.stats.p5 + 10, f.h[i]);
  const [pid, pedge] = parcel(x, z, 85, 0.1 + 0.4 * vnoise(x / 3000, z / 3000, 105), 107);
  let ground = mix3(P.grassDry, P.grass, 0.5 + 0.5 * fbm(x / 90, z / 90, 109, 4));
  ground = mix3(ground, mix3(P.soilDark, pick([P.field1, P.field2, P.field3, P.field4, P.olive, P.field2], pid), pedge), plain);
  const olives = smoothstep(14, 6, s) * smoothstep(0.1, 0.5, 0.5 + 0.5 * fbm(x / 300, z / 300, 111, 3)) * (1 - plain) * 0.7;
  ground = mix3(ground, P.olive, olives);
  let a = mix3(ground, mix3(P.rock, P.soil, 0.4), rockW);
  a = mix3(a, mix3(P.ruin, P.grassDry, 0.4 + 0.3 * vnoise(x / 12, z / 12, 113)), ruins * 0.55);
  const travCol = mix3(mix3(P.trav, P.travWarm, 0.35 + 0.3 * fbm(x / 120, z / 120, 115, 3)), P.travGray, 0.2 * vnoise(x / 20, z / 20, 117));
  a = mix3(a, travCol, trav);
  o.albedo = a;
  o.w[0] = trav;
  o.w[1] = (1 - trav) * (plain * 0.6 + rockW * 0.5);
  o.w[2] = (1 - trav) * (1 - plain * 0.6) * (1 - rockW);
  o.w[3] = (1 - trav) * Math.max(ruins * 0.6, rockW * 0.5);
  normW(o);
  o.rock = clamp01(rockW * (1 - trav));
  o.masks[0] = clamp01(ruins * smoothstep(12, 5, s));
  o.masks[1] = clamp01(smoothstep(30, 10, s) * (1 - plain) * (1 - trav) * (1 - ruins) * smoothstep(0.0, 0.5, 0.5 + 0.5 * fbm(x / 220, z / 220, 119, 3)));
  o.masks[2] = smoothstep(9, 4, s);
  o.masks[3] = trav;
};

export const PAINTERS: Record<string, Painter> = {
  kapadokya: paintKapadokya,
  likya: paintLikya,
  karadeniz: paintKaradeniz,
  erciyes: paintErciyes,
  pamukkale: paintPamukkale,
};

// ---------------------------------------------------------------- lighting
export interface BakeLight {
  sunDir: [number, number, number];
  sunCol: RGB;
  ambCol: RGB;
  sunStrength: number;
  ambStrength: number;
  wrap: number;
  ndl0: number;
  k: number;
  norm: number;
}

export function makeBakeLight(def: WorldDef): BakeLight {
  const az = (def.sun.azimuthDeg * Math.PI) / 180;
  const el = (def.sun.elevationDeg * Math.PI) / 180;
  const sunDir: [number, number, number] = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
  // Slightly desaturated black body so the albedo still reads (artistic).
  const kl = kelvinToLinear(def.sun.kelvin);
  // Desaturate the black body in linear space by a power curve (keeps a golden hue instead of drifting pink).
  const sunCol: RGB = [kl[0] ** 0.5, kl[1] ** 0.5, kl[2] ** 0.5];
  const ambCol = hexToLinear(def.bake.ambientColor);
  const wrap = def.bake.wrap;
  const ndl0 = (Math.sin(el) + wrap) / (1 + wrap);
  const k = ndl0 / Math.max(1 - 2 * ndl0, 0.05);
  const lumSun = 0.2126 * sunCol[0] + 0.7152 * sunCol[1] + 0.0722 * sunCol[2];
  const lumAmb = 0.2126 * ambCol[0] + 0.7152 * ambCol[1] + 0.0722 * ambCol[2];
  const norm = 0.92 / (def.bake.sunStrength * lumSun + def.bake.ambientStrength * lumAmb * 0.95);
  return { sunDir, sunCol, ambCol, sunStrength: def.bake.sunStrength, ambStrength: def.bake.ambientStrength, wrap, ndl0, k, norm };
}

/** Pre-lit color (linear) for one texel. */
export function light(bl: BakeLight, albedo: RGB, nx: number, ny: number, nz: number, shadow: number, ao: number, out: RGB): void {
  const ndl = nx * bl.sunDir[0] + ny * bl.sunDir[1] + nz * bl.sunDir[2];
  const w = Math.max(0, (ndl + bl.wrap) / (1 + bl.wrap));
  const B = (w / (w + bl.k)) * ((bl.ndl0 + bl.k) / bl.ndl0);
  const sunT = bl.sunStrength * shadow * B * bl.norm;
  const ambT = bl.ambStrength * ao * (0.8 + 0.2 * ny) * bl.norm;
  for (let c = 0; c < 3; c++) {
    let v = albedo[c] * (bl.sunCol[c] * sunT + bl.ambCol[c] * ambT);
    // soft shoulder above 0.8
    if (v > 0.8) v = 0.8 + (v - 0.8) / (1 + (v - 0.8) * 2.5);
    out[c] = v;
  }
}
