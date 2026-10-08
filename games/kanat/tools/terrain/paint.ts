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
  /** travertine pool water coverage 0..1 (Pamukkale patch) */
  pool: Float32Array | null;
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
  cream: L('#E9E0D0'),
  white: L('#F3ECE0'),
  ochre: L('#D9B48F'),
  rose: L('#D49A8A'),
  roseDeep: L('#CC9686'),
  gully: L('#BFA48C'),
  soil: L('#B9AD88'),
  soilWarm: L('#C2AC84'),
  steppe: L('#A39A72'),
  dryGrass: L('#A99A72'),
  stubble: L('#D0C29C'),
  plowed: L('#9E8064'),
  redSoil: L('#B98C74'),
  vineyard: L('#8C9160'),
  orchard: L('#7C8257'),
  poplar: L('#6A7247'),
  poplarDark: L('#5A6140'),
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

function hash3i(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Anatolian strip farmland: big Voronoi blocks (~blockM) each with its own orientation, cut into strips
 * (25–70 m wide, 120–320 m long). Returns [field id 0..1, interior 0..1 (0 on field borders), fallow 0|1].
 */
function stripFields(x: number, z: number, blockM: number, seed: number): [number, number, number] {
  const [bid, bin] = voronoiParcel(x, z, blockM, seed);
  const b = Math.floor(bid * 1e6);
  const th = bid * Math.PI * 7.3;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  const u = x * ct + z * st;
  const v = -x * st + z * ct;
  const w = 25 + 45 * hash3i(b, 1, seed);
  const k = Math.floor(u / w);
  const fu = u / w - k;
  const len = 120 + 200 * hash3i(b, k, seed + 1);
  const off = hash3i(b, k, seed + 2) * len;
  const m = Math.floor((v + off) / len);
  const fv = (v + off) / len - m;
  const id = hash3i(b, k * 131 + m, seed + 3);
  const edge = Math.min(fu * w, (1 - fu) * w, fv * len, (1 - fv) * len);
  const fallow = hash3i(b, k * 17 + m, seed + 4) < 0.35 ? 1 : 0;
  return [id, smoothstep(0.5, 3.5, edge) * bin, fallow];
}

const paintKapadokya: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const h = f.h[i];
  const rel = f.relH[i];
  const conv = f.convS[i];
  const dr = f.drain[i];
  const n1 = fbm(x / 140, z / 140, 3, 3);
  // valley bottoms only (multi-scale flow field), broken by noise, gentle ground
  const brk = smoothstep(-0.35, 0.15, fbm(x / 120, z / 120, 4, 3) + 0.2 * vnoise(x / 30, z / 30, 5));
  const valley = smoothstep(0.25, 0.65, dr + 0.12 * n1) * smoothstep(15, 5, s) * smoothstep(18, -5, rel) * brk;
  // orchards / vineyards on low gentle ground near the valleys (apricot, vine): soft sage patches
  const orchardZone = smoothstep(f.stats.p50, f.stats.p5, h) * smoothstep(8, 3, s) * smoothstep(0.1, 0.45, 0.5 + 0.5 * fbm(x / 260, z / 260, 6, 3));
  const expo = smoothstep(6, 15, s + 5 * n1) * (1 - valley * 0.7);
  // tuff strata by elevation: rose (#D49A8A) and warm white (#D9B48F) bands, warped so they never read as contours
  const warp = 18 * fbm(x / 500, z / 500, 9, 3) + 6 * vnoise(x / 90, z / 90, 10);
  const band = 0.5 + 0.5 * Math.sin((h + warp) / 11);
  const roseZone = smoothstep(-0.25, 0.35, fbm(x / 2600, z / 2600, 7, 3)) * smoothstep(f.stats.p95, f.stats.p5, h + warp * 3);
  let tuff = mix3(K.ochre, K.white, smoothstep(0, 4, conv) * 0.55 + 0.25 * smoothstep(0.2, 0.9, band));
  tuff = mix3(tuff, K.rose, smoothstep(0.35, 0.75, band) * (0.35 + 0.55 * roseZone));
  tuff = mix3(tuff, K.gully, smoothstep(-1, -5, conv) * 0.4);
  // fairy-chimney speckle (sub-texel bright tips / dark shadows read as texture from above)
  const speck = vnoise(x / 5.5, z / 5.5, 13) * 0.5 + vnoise(x / 2.7, z / 2.7, 14) * 0.5;
  tuff = mix3(tuff, speck > 0 ? K.white : K.gully, Math.abs(speck) * 0.3);
  const cap = smoothstep(1.5, 5, conv) * smoothstep(9, 20, s) * smoothstep(0, 35, rel) * 0.8;
  // open ground: pale tuff-derived soil, dry steppe, sparse fields
  let ground = mix3(K.soil, K.steppe, smoothstep(-0.3, 0.5, fbm(x / 220, z / 220, 23, 4)));
  ground = mix3(ground, K.soilWarm, 0.3 + 0.3 * vnoise(x / 45, z / 45, 24));
  const [pid, pin, fallow] = stripFields(x, z, 520, 19);
  const fieldsMask = smoothstep(7, 3, s) * smoothstep(-0.25, 0.1, fbm(x / 1400, z / 1400, 21, 3)) * (1 - valley) * (1 - fallow);
  const fieldCol = pick([K.stubble, K.plowed, K.vineyard, K.dryGrass, K.stubble, K.soilWarm, K.vineyard, K.plowed], pid);
  ground = mix3(ground, mix3(ground, fieldCol, 0.7 * (0.75 + 0.25 * vnoise(x / 20, z / 20, 20))), fieldsMask * pin);
  // scattered shrubs / trees on gentle ground (dark specks)
  const shrub = smoothstep(0.55, 0.85, vnoise(x / 7, z / 7, 27) * 0.6 + 0.5 * fbm(x / 300, z / 300, 28, 2) + 0.2);
  ground = mix3(ground, K.poplarDark, shrub * 0.3 * smoothstep(18, 6, s));
  // valley floors: desaturated sage orchards/vineyards with poplar clumps
  const trees = 0.5 + 0.5 * vnoise(x / 9, z / 9, 29);
  const valleyCol = mix3(mix3(K.orchard, K.vineyard, 0.5 + 0.5 * vnoise(x / 40, z / 40, 30)), K.poplarDark, smoothstep(0.6, 0.9, trees) * 0.55);
  ground = mix3(ground, mix3(K.vineyard, K.orchard, 0.5 + 0.5 * vnoise(x / 35, z / 35, 8)), orchardZone * 0.45 * (1 - valley));
  ground = mix3(ground, valleyCol, valley * 0.8);
  let a = mix3(ground, tuff, expo);
  a = mix3(a, K.basalt, cap);
  // artistic: golden valley-floor tint (ground fog glow)
  const lowT = smoothstep(f.stats.p5 + 50, f.stats.p5 - 10, h);
  a = mix3(a, K.goldFog, lowT * 0.1);
  o.albedo = a;
  o.w[0] = expo * (0.25 + 0.75 * roseZone * smoothstep(0.3, 0.7, band)) * (1 - cap);
  o.w[1] = expo * 0.75 * (1 - cap);
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
  maki: L('#7B7E5C'),
  makiDry: L('#979272'),
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
  // pine: patchy stands, denser in gullies and on north/east faces, clumpy edges (tree crowns read as texture)
  const north = clamp01(-f.n[i * 3 + 2] * 1.5 + 0.3);
  const gully = smoothstep(0, -4, f.convS[i]);
  const clump = 0.5 + 0.5 * vnoise(x / 11, z / 11, 46) * 0.6 + 0.2 * vnoise(x / 4.5, z / 4.5, 44);
  const pineBase = 0.5 + 0.5 * fbm(x / 420, z / 420, 45, 4) + 0.25 * north + 0.2 * gully - 0.15;
  const pineD = smoothstep(0.28, 0.62, pineBase + (clump - 0.5) * 0.5) * smoothstep(1000, 700, h) * smoothstep(42, 28, s) * smoothstep(5, 25, h);
  const karst = smoothstep(500, 900, h) * smoothstep(0, 6, f.convS[i] + 2);
  const [pid, pedge0, pfal] = stripFields(x, z, 300, 49);
  const pedge = pedge0 * (1 - pfal);
  const fields = smoothstep(10, 4, s) * smoothstep(600, 300, h) * smoothstep(-0.1, 0.35, fbm(x / 900, z / 900, 51, 3)) * smoothstep(20, 60, cd);
  let ground = mix3(LY.maki, LY.makiDry, 0.5 + 0.5 * fbm(x / 70, z / 70, 53, 4));
  ground = mix3(ground, pick([LY.terrace, LY.olive, LY.makiDry, LY.olive], pid), fields * pedge);
  const pineCol = mix3(LY.pineDark, LY.pine, 0.5 + 0.5 * vnoise(x / 18, z / 18, 55));
  let a = mix3(ground, pineCol, pineD);
  const limeCol = mix3(mix3(LY.lime, LY.limeWarm, 0.5 + 0.5 * fbm(x / 150, z / 150, 57, 3)), LY.limeGray, 0.3 + 0.3 * fbm(x / 45, z / 45, 59, 3));
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
  spruce: L('#34503A'),
  spruceDark: L('#28432F'),
  beech: L('#4C6A3A'),
  beechLight: L('#5E7A44'),
  meadow: L('#6E8B3D'),
  meadowMuted: L('#7A8458'),
  meadowDry: L('#8E8B62'),
  cloudShadow: L('#A9B6BC'),
  rock: L('#5F5D58'),
  rockLight: L('#7C7972'),
  snow: L('#EEF0EE'),
  soil: L('#6B5440'),
};

const paintKaradeniz: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const h = f.h[i];
  const conv = f.convS[i];
  const north = clamp01(-f.n[i * 3 + 2] * 1.5 + 0.2);
  const gully = smoothstep(0, -4, conv);
  const ridge = smoothstep(0.5, 4, conv);
  // treeline ~1950 m; forest tongues climb gullies and north faces, meadows take ridges
  const treeline = 1950 + 120 * fbm(x / 900, z / 900, 61, 3);
  const fScore = (treeline - h) / 160 + 0.7 * gully - 0.6 * ridge + 0.35 * north + 0.45 * fbm(x / 260, z / 260, 62, 3);
  const forest = smoothstep(-0.25, 0.25, fScore) * smoothstep(50, 40, s);
  // yayla clearings on gentle mid-slope benches
  const clearing = smoothstep(14, 6, s) * smoothstep(0.1, 0.45, fbm(x / 500, z / 500, 63, 3)) * smoothstep(1250, 1450, h);
  const forestF = forest * (1 - clearing);
  const deciduous = smoothstep(1500, 1150, h + 120 * fbm(x / 400, z / 400, 65, 2));
  const rockW = clamp01(smoothstep(46, 56, s + 6 * fbm(x / 80, z / 80, 67, 3)) * smoothstep(1700, 2100, h) + smoothstep(2550, 2800, h) * smoothstep(24, 36, s) * (1 - gully));
  const snowW = smoothstep(2650, 2850, h + 180 * north + 60 * fbm(x / 200, z / 200, 69, 3)) * gully * smoothstep(40, 25, s);
  const crowns = 0.5 + 0.5 * vnoise(x / 7, z / 7, 71);
  const spruceCol = mix3(KD.spruceDark, KD.spruce, crowns);
  const decidCol = mix3(KD.beech, KD.beechLight, 0.5 + 0.5 * vnoise(x / 12, z / 12, 73));
  const treeCol = mix3(spruceCol, decidCol, deciduous * 0.7);
  const meadowBase = mix3(KD.meadow, KD.meadowMuted, 0.45 + 0.35 * fbm(x / 140, z / 140, 75, 3));
  const meadowCol = mix3(meadowBase, KD.meadowDry, smoothstep(2150, 2600, h) * 0.75);
  let a = mix3(meadowCol, treeCol, forestF);
  a = mix3(a, mix3(KD.rock, KD.rockLight, 0.5 + 0.5 * vnoise(x / 30, z / 30, 77)), rockW);
  a = mix3(a, KD.snow, snowW);
  // soft cloud shadows drifting over the yayla (brief palette "bulut gölgesi" #A9B6BC)
  const cloud = smoothstep(0.15, 0.45, fbm(x / 1300 + 3.1, z / 1300 - 1.7, 66, 4));
  a = mix3(a, [a[0] * KD.cloudShadow[0], a[1] * KD.cloudShadow[1], a[2] * KD.cloudShadow[2]], cloud * 0.55);
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
  snow: L('#ECEAE6'),
  snowWarm: L('#F1EBE2'),
  snowCool: L('#E2E6EC'),
  ice: L('#BFE6F2'),
  rock: L('#4A4642'),
  rockRed: L('#5C4A42'),
  scree: L('#6B5F56'),
  steppe: L('#8E7A5E'),
  ochre: L('#A68E68'),
  soil: L('#76624E'),
};

const paintErciyes: Painter = (f, i, x, z, o) => {
  const s = eSlope(f, i);
  const h = f.h[i];
  const conv = f.convS[i];
  const nx = f.n[i * 3];
  const nz = f.n[i * 3 + 2];
  // wind from 300° → lee faces point to ~120°: snow loads there
  const lee = clamp01((nx * Math.sin(2.094) - nz * Math.cos(2.094)) * 2.5);
  const gully = smoothstep(-0.5, -3.5, conv);
  const ridge = smoothstep(0.5, 2.5, conv + 0.6 * fbm(x / 60, z / 60, 84, 2));
  const north = clamp01(-nz * 2);
  // lower slopes: brown/ochre steppe with snow only in gullies and on north/lee faces
  const snowLine = 2620 + 160 * fbm(x / 1600, z / 1600, 81, 3) - 140 * north - 80 * lee;
  const highSnow = smoothstep(snowLine - 70, snowLine + 70, h + 70 * fbm(x / 320, z / 320, 86, 3) + 15 * vnoise(x / 40, z / 40, 88));
  const patches = smoothstep(0.45, 0.6, clamp01(gully * 0.9 + north * 0.4 + lee * 0.3) + 0.35 * fbm(x / 160, z / 160, 85, 3));
  const high = smoothstep(2850, 3150, h);
  const rockSteep = smoothstep(36 - 7 * high, 44 - 7 * high, s + 6 * fbm(x / 70, z / 70, 83, 3));
  const rockRidge = ridge * smoothstep(2750, 3050, h) * smoothstep(12, 24, s);
  const rockW = clamp01((rockSteep + rockRidge * 0.85) * (1 - gully * 0.65) * (1 - lee * 0.35));
  const iceW = smoothstep(3150, 3450, h) * north * gully * smoothstep(22, 32, s) * (1 - rockW);
  const snowW = clamp01(Math.max(highSnow, patches * (1 - highSnow)) * (1 - rockW) - iceW);
  const ground = mix3(mix3(E.steppe, E.ochre, 0.5 + 0.5 * fbm(x / 140, z / 140, 87, 4)), E.soil, smoothstep(0.2, 0.7, gully));
  const rockCol = mix3(mix3(E.rock, E.rockRed, 0.5 + 0.5 * fbm(x / 400, z / 400, 89, 2)), E.scree, 0.25 * smoothstep(30, 20, s));
  let a = mix3(ground, rockCol, rockW);
  // snow: smooth tone, faint wind texture, thin snow on rock edges
  const snowCol = mix3(mix3(E.snow, E.snowWarm, 0.5 + 0.5 * fbm(x / 900, z / 900, 91, 2)), E.snowCool, 0.25 * smoothstep(0, 1, gully));
  a = mix3(a, snowCol, snowW);
  a = mix3(a, mix3(rockCol, snowCol, 0.45), rockW * smoothstep(3000, 3400, h) * gully * 0.5);
  a = mix3(a, E.ice, iceW);
  o.albedo = a;
  o.w[0] = snowW;
  o.w[1] = iceW;
  o.w[2] = rockW;
  o.w[3] = (1 - snowW) * (1 - rockW) * (1 - iceW);
  normW(o);
  o.rock = clamp01(rockW);
  o.masks[0] = clamp01(ridge * smoothstep(2900, 3250, h) * smoothstep(12, 26, s) * 1.6);
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
  grass: L('#8C8858'),
  grassDry: L('#B0A274'),
  olive: L('#5F6A3E'),
  ruin: L('#C9A27E'),
  pool: L('#49C6C9'),
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
  const [pid, pedge0, pfal] = stripFields(x, z, 600, 107);
  const pedge = pedge0 * (1 - pfal * 0.5);
  let ground = mix3(P.grassDry, P.grass, 0.5 + 0.5 * fbm(x / 90, z / 90, 109, 4));
  ground = mix3(ground, mix3(ground, pick([P.field1, P.field2, P.field3, P.field4, P.olive, P.field2], pid), 0.45 * pedge), plain);
  const olives = smoothstep(14, 6, s) * smoothstep(0.1, 0.5, 0.5 + 0.5 * fbm(x / 300, z / 300, 111, 3)) * (1 - plain) * 0.7;
  ground = mix3(ground, P.olive, olives);
  let a = mix3(ground, mix3(P.rock, P.soil, 0.4), rockW);
  a = mix3(a, mix3(P.ruin, P.grassDry, 0.4 + 0.3 * vnoise(x / 12, z / 12, 113)), ruins * 0.55);
  const travCol = mix3(mix3(P.trav, P.travWarm, 0.35 + 0.3 * fbm(x / 120, z / 120, 115, 3)), P.travGray, 0.2 * vnoise(x / 20, z / 20, 117));
  a = mix3(a, travCol, trav);
  const pool = f.pool ? f.pool[i] : 0;
  a = mix3(a, mix3(P.pool, P.trav, 0.3), pool * 0.6);
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
  /** Ambient hue used where the sun does not reach (same luminance as ambCol). */
  shadowCol: RGB;
  shadowTint: number;
  sunStrength: number;
  ambStrength: number;
  wrap: number;
  ndl0: number;
  k: number;
  norm: number;
}

function lum(c: RGB): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function makeBakeLight(def: WorldDef): BakeLight {
  const az = (def.sun.azimuthDeg * Math.PI) / 180;
  const el = (def.sun.elevationDeg * Math.PI) / 180;
  const sunDir: [number, number, number] = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
  // Desaturate the black body in linear space by a power curve (keeps a golden hue instead of drifting pink).
  const kl = kelvinToLinear(def.sun.kelvin);
  const sunCol: RGB = [kl[0] ** 0.5, kl[1] ** 0.5, kl[2] ** 0.5];
  const ambCol = hexToLinear(def.bake.ambientColor);
  const st = hexToLinear(def.bake.shadowColor);
  const sl = lum(st);
  const al = lum(ambCol);
  const shadowCol: RGB = [(st[0] / sl) * al, (st[1] / sl) * al, (st[2] / sl) * al];
  const wrap = def.bake.wrap;
  const ndl0 = (Math.sin(el) + wrap) / (1 + wrap);
  const k = ndl0 / Math.max(1 - 2 * ndl0, 0.05);
  const norm = (0.92 * def.bake.exposure) / (def.bake.sunStrength * lum(sunCol) + def.bake.ambientStrength * al * 0.95);
  return {
    sunDir,
    sunCol,
    ambCol,
    shadowCol,
    shadowTint: def.bake.shadowTint,
    sunStrength: def.bake.sunStrength,
    ambStrength: def.bake.ambientStrength,
    wrap,
    ndl0,
    k,
    norm,
  };
}

/**
 * Pre-lit color (linear) for one texel:
 *   sunVis = shadow * min(1, B(ndl));  ambient hue = mix(sky, shadowHue, (1 - sunVis) * shadowTint)
 *   lit = albedo * (sun * sunStrength * shadow * B + ambHue * ambStrength * ao * skyShape)
 * skyShape gives shadows form: faces turned toward the bright (sun-side) sky and up-facing faces get more fill.
 */
export function light(bl: BakeLight, albedo: RGB, nx: number, ny: number, nz: number, shadow: number, ao: number, out: RGB): void {
  const sd = bl.sunDir;
  const ndl = nx * sd[0] + ny * sd[1] + nz * sd[2];
  const w = Math.max(0, (ndl + bl.wrap) / (1 + bl.wrap));
  const B = (w / (w + bl.k)) * ((bl.ndl0 + bl.k) / bl.ndl0);
  const sunT = bl.sunStrength * shadow * B * bl.norm;
  const hl = Math.sqrt(sd[0] * sd[0] + sd[2] * sd[2]) || 1;
  const toward = (nx * sd[0] + nz * sd[2]) / hl; // -1..1 horizontal facing toward the sun azimuth
  const skyShape = 0.62 + 0.22 * ny + 0.16 * toward;
  const ambT = bl.ambStrength * (0.35 + 0.65 * ao) * skyShape * bl.norm;
  const sunVis = Math.min(1, shadow * Math.min(1, B));
  const t = (1 - sunVis) * bl.shadowTint;
  for (let c = 0; c < 3; c++) {
    const amb = bl.ambCol[c] + (bl.shadowCol[c] - bl.ambCol[c]) * t;
    let v = albedo[c] * (bl.sunCol[c] * sunT + amb * ambT);
    // soft shoulder above 0.8
    if (v > 0.8) v = 0.8 + (v - 0.8) / (1 + (v - 0.8) * 2.5);
    out[c] = v;
  }
}
