// KANAT terrain bake (brief §4.G.1). Run: node tools/bake-terrain.ts [--world <id>|all] [--synthetic] [--no-erosion] [--no-ktx2]
//   node tools/bake-terrain.ts --scout <id> [--lat <deg> --lon <deg>] [--size <m>]   → hillshade scouting preview (scratch)
// Sources: AWS Terrain Tiles terrarium PNGs (cached in .cache/tiles/). Outputs: public/worlds/<id>/*.
// Per world: core 8192 m @ 8 m (1024²), far ring 49152 m @ 96 m (512²), Pamukkale 1 m travertine patch.

import { mkdirSync, writeFileSync, statSync, readdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { WORLD_IDS, type WorldId } from '../src/sim/types.ts';
import { encodeHeightGrid, encodeU8 } from '../src/sim/terrain/decode.ts';
import { DETAIL_AMP0, DETAIL_AMP1, DETAIL_AMP2, DETAIL_WAVELENGTH0, DETAIL_WAVELENGTH1, DETAIL_WAVELENGTH2 } from '../src/sim/terrain/detailNoise.ts';
import { WORLD_JSON_VERSION, type WorldConfig, type GridFileMeta } from '../src/content/worldConfig.ts';
import { WORLD_DEFS, type WorldDef } from './terrain/worldDefs.ts';
import { TileCache, sampleTerrariumGrid, geoToLocal, metersPerPixel } from './terrain/tiles.ts';
import { sampleSyntheticGrid } from './terrain/synthetic.ts';
import { erode } from './terrain/erosion.ts';
import {
  blur,
  clamp01,
  dilate,
  downsample2,
  fbm,
  type Grid,
  makeGrid,
  minMax,
  resample,
  sampleBilinear,
  smoothstep,
} from './terrain/grid.ts';
import {
  combinedHeight,
  computeNormals,
  convexity,
  distanceToBoundary,
  drainage,
  hillshade,
  horizonAO,
  slopeFromNormals,
  sunShadow,
} from './terrain/derive.ts';
import { PAINTERS, light, makeBakeLight, type PaintFields, type TexelOut } from './terrain/paint.ts';
import { bakePatch } from './terrain/patch.ts';
import { rebuildSea } from './terrain/coast.ts';
import { toU8, writeKtx2, writePng, writePreview, writeWebp } from './terrain/images.ts';
import { hexToLinear, kelvinToLinear, kelvinToSrgb, linearToSrgb, mix3, round3, srgbToHex, type RGB } from './terrain/color.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'tiles');

export const CORE_RES = 1024;
export const CORE_SPACING = 8;
export const CORE_SIZE = CORE_RES * CORE_SPACING; // 8192 coverage
export const CORE_ORIGIN = -CORE_SIZE / 2 + CORE_SPACING / 2; // -4092
export const FAR_RES = 512;
export const FAR_SPACING = 96;
export const FAR_SIZE = FAR_RES * FAR_SPACING; // 49152
export const FAR_ORIGIN = -FAR_SIZE / 2 + FAR_SPACING / 2; // -24528
const MACRO_RES = 2048;
const FARCOL_RES = 1024;
const MASK_RES = 512;
const BLEND_M = 256;
const PLAY_MARGIN = 320;

interface Args {
  worlds: WorldId[];
  synthetic: boolean;
  erosion: boolean;
  ktx2: boolean;
  scout: WorldId | null;
  lat: number | null;
  lon: number | null;
  size: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { worlds: [...WORLD_IDS], synthetic: false, erosion: true, ktx2: true, scout: null, lat: null, lon: null, size: 16384 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--world') {
      const v = argv[++i];
      a.worlds = v === 'all' ? [...WORLD_IDS] : (v.split(',') as WorldId[]);
    } else if (k === '--synthetic') a.synthetic = true;
    else if (k === '--no-erosion') a.erosion = false;
    else if (k === '--no-ktx2') a.ktx2 = false;
    else if (k === '--scout') a.scout = argv[++i] as WorldId;
    else if (k === '--lat') a.lat = Number(argv[++i]);
    else if (k === '--lon') a.lon = Number(argv[++i]);
    else if (k === '--size') a.size = Number(argv[++i]);
  }
  for (const w of a.worlds) if (!WORLD_IDS.includes(w)) throw new Error(`unknown world ${w}`);
  return a;
}

const log = (...m: unknown[]) => console.log(...m);

function percentile(d: Float32Array, p: number): number {
  const step = Math.max(1, Math.floor(d.length / 200000));
  const s: number[] = [];
  for (let i = 0; i < d.length; i += step) s.push(d[i]);
  s.sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

async function sampleSource(def: WorldDef, args: Args, cache: TileCache, zoom: number, res: number, spacing: number, origin: number): Promise<Float32Array> {
  if (args.synthetic) return sampleSyntheticGrid(def, res, spacing, origin, origin);
  return sampleTerrariumGrid(cache, def.lat, def.lon, zoom, res, spacing, origin, origin);
}

/** Distance inside the core sample square (m), negative outside. */
function insideCore(x: number, z: number): number {
  const lo = CORE_ORIGIN;
  const hi = CORE_ORIGIN + (CORE_RES - 1) * CORE_SPACING;
  return Math.min(x - lo, hi - x, z - lo, hi - z);
}

function u8(n: number): Uint8Array {
  return new Uint8Array(n);
}

/** Disk cache for the slow derived fields (AO, sun shadow, drainage), keyed by input content. */
function fieldCache(id: string, key: string, compute: () => Float32Array[]): Float32Array[] {
  const dir = join(ROOT, '.cache', 'bake');
  const f = join(dir, `${id}.bin`);
  const kf = join(dir, `${id}.key`);
  if (existsSync(f) && existsSync(kf) && readFileSync(kf, 'utf8') === key) {
    const buf = readFileSync(f);
    const n = buf.readUInt32LE(0);
    const out: Float32Array[] = [];
    let off = 4 + n * 4;
    for (let k = 0; k < n; k++) {
      const len = buf.readUInt32LE(4 + k * 4);
      out.push(new Float32Array(buf.buffer.slice(buf.byteOffset + off, buf.byteOffset + off + len * 4)));
      off += len * 4;
    }
    log('   derived fields: cache hit');
    return out;
  }
  const arrs = compute();
  mkdirSync(dir, { recursive: true });
  const head = Buffer.alloc(4 + arrs.length * 4);
  head.writeUInt32LE(arrs.length, 0);
  arrs.forEach((a, k) => head.writeUInt32LE(a.length, 4 + k * 4));
  writeFileSync(f, Buffer.concat([head, ...arrs.map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength))]));
  writeFileSync(kf, key);
  return arrs;
}

function checksum(...arrs: Float32Array[]): string {
  let h = 2166136261;
  for (const a of arrs) {
    const u = new Uint32Array(a.buffer, a.byteOffset, a.length);
    for (let i = 0; i < u.length; i += 7) h = Math.imul(h ^ u[i], 16777619);
  }
  return (h >>> 0).toString(16);
}

// ------------------------------------------------------------------------------------------- scout
async function scout(args: Args): Promise<void> {
  const id = args.scout as WorldId;
  const def = WORLD_DEFS[id];
  const lat = args.lat ?? def.lat;
  const lon = args.lon ?? def.lon;
  const cache = new TileCache(CACHE);
  const res = 1024;
  const spacing = args.size / res;
  const origin = -args.size / 2 + spacing / 2;
  const data = await sampleTerrariumGrid(cache, lat, lon, 13, res, spacing, origin, origin);
  const g = makeGrid(res, spacing, origin, origin, data);
  const n = computeNormals(g);
  const hs = hillshade(n, 315, 35);
  const { min, max } = minMax(data);
  const img = u8(res * res * 3);
  for (let i = 0; i < res * res; i++) {
    const t = (data[i] - min) / (max - min);
    const base: RGB = data[i] < 0 ? [0.1, 0.3, 0.6] : mix3([0.35, 0.55, 0.3], [0.95, 0.9, 0.85], t);
    const s = 0.25 + 0.85 * hs[i];
    img[i * 3] = toU8(base[0] * s);
    img[i * 3 + 1] = toU8(base[1] * s);
    img[i * 3 + 2] = toU8(base[2] * s);
  }
  // grid lines every 2 km, core square (8192) outline
  const px = (m: number) => Math.round((m - origin) / spacing);
  for (let k = -8; k <= 8; k++) {
    const m = k * 2000;
    const p = px(m);
    if (p < 0 || p >= res) continue;
    for (let j = 0; j < res; j += 3) {
      for (const idx of [(j * res + p) * 3, (p * res + j) * 3]) {
        img[idx] = 255;
        img[idx + 1] = k === 0 ? 0 : 255;
        img[idx + 2] = k === 0 ? 0 : 255;
      }
    }
  }
  const a = px(-4096);
  const b = px(4096);
  for (let j = a; j <= b; j++) {
    for (const idx of [(a * res + j) * 3, (b * res + j) * 3, (j * res + a) * 3, (j * res + b) * 3]) {
      if (idx >= 0 && idx < img.length) {
        img[idx] = 255;
        img[idx + 1] = 220;
        img[idx + 2] = 0;
      }
    }
  }
  const out = join(process.env.SCOUT_DIR ?? join(ROOT, 'tests', 'out', 'terrain'), `scout_${id}_${lat.toFixed(4)}_${lon.toFixed(4)}.png`);
  mkdirSync(dirname(out), { recursive: true });
  await writePng(out, img, res, res, 3);
  log(`scout ${id} @ ${lat},${lon}: min ${min.toFixed(0)} max ${max.toFixed(0)} m, ${spacing.toFixed(1)} m/px, grid lines every 2 km (red = center). → ${out}`);
}

// ------------------------------------------------------------------------------------------- bake
async function bakeWorld(def: WorldDef, args: Args, cache: TileCache): Promise<void> {
  const t0 = Date.now();
  const outDir = join(ROOT, 'public', 'worlds', def.id);
  mkdirSync(outDir, { recursive: true });
  log(`\n== ${def.id} (${def.lat}, ${def.lon}) ${args.synthetic ? 'SYNTHETIC' : 'terrarium'} vs=${def.verticalScale}`);
  log(`   z${def.zoomCore} ${metersPerPixel(def.lat, def.zoomCore).toFixed(1)} m/px core, z${def.zoomFar} ${metersPerPixel(def.lat, def.zoomFar).toFixed(1)} m/px far`);

  // 1. raw heights (m, unscaled)
  const core0 = await sampleSource(def, args, cache, def.zoomCore, CORE_RES, CORE_SPACING, CORE_ORIGIN);
  const far0 = await sampleSource(def, args, cache, def.zoomFar, FAR_RES, FAR_SPACING, FAR_ORIGIN);
  for (const d of [core0, far0]) for (let i = 0; i < d.length; i++) if (d[i] < def.bathyMin) d[i] = def.bathyMin;
  if (def.hasSea) {
    const a = rebuildSea(makeGrid(CORE_RES, CORE_SPACING, CORE_ORIGIN, CORE_ORIGIN, core0), 4000);
    const b = rebuildSea(makeGrid(FAR_RES, FAR_SPACING, FAR_ORIGIN, FAR_ORIGIN, far0), 400);
    log(`   sea rebuilt: core ${a.seaCells} cells, far ${b.seaCells} cells`);
  }
  const raw = minMax(core0);
  log(`   raw core ${raw.min.toFixed(1)}..${raw.max.toFixed(1)} m  (${((Date.now() - t0) / 1000).toFixed(1)} s, tiles dl ${cache.downloaded} cached ${cache.cached})`);

  // 2. erosion on the core
  if (args.erosion && def.erosion) {
    const er = erode(core0, CORE_RES, CORE_SPACING, {
      droplets: def.erosion.droplets,
      seed: def.erosion.seed,
      strength: def.erosion.strength,
      floorM: def.hasSea ? 1.5 : -1e9,
      timeBudgetMs: 120000,
    });
    log(`   erosion: ${er.dropletsRun} droplets in ${(er.ms / 1000).toFixed(1)} s, max erode ${er.maxErode.toFixed(1)} m, max deposit ${er.maxDeposit.toFixed(1)} m`);
  }

  // 3. vertical scale
  const vs = def.verticalScale;
  for (const d of [core0, far0]) for (let i = 0; i < d.length; i++) d[i] *= vs;

  // 4. blend core into far (256 m soft edge) and far into the core edge
  const core = makeGrid(CORE_RES, CORE_SPACING, CORE_ORIGIN, CORE_ORIGIN, core0);
  const coreBlur = makeGrid(CORE_RES, CORE_SPACING, CORE_ORIGIN, CORE_ORIGIN, blur(core0, CORE_RES, 6, 2));
  const far = makeGrid(FAR_RES, FAR_SPACING, FAR_ORIGIN, FAR_ORIGIN, far0);
  for (let r = 0; r < FAR_RES; r++) {
    const z = FAR_ORIGIN + r * FAR_SPACING;
    for (let c = 0; c < FAR_RES; c++) {
      const x = FAR_ORIGIN + c * FAR_SPACING;
      const d = insideCore(x, z);
      if (d <= 0) continue;
      const w = smoothstep(0, BLEND_M, d);
      const i = r * FAR_RES + c;
      far.data[i] = far.data[i] + (sampleBilinear(coreBlur, x, z) - far.data[i]) * w;
    }
  }
  for (let r = 0; r < CORE_RES; r++) {
    const z = CORE_ORIGIN + r * CORE_SPACING;
    for (let c = 0; c < CORE_RES; c++) {
      const x = CORE_ORIGIN + c * CORE_SPACING;
      const d = insideCore(x, z);
      if (d >= BLEND_M) continue;
      const w = smoothstep(0, BLEND_M, d);
      const i = r * CORE_RES + c;
      core.data[i] = sampleBilinear(far, x, z) + (core.data[i] - sampleBilinear(far, x, z)) * w;
    }
  }

  // 5. Pamukkale patch
  let patchRes: ReturnType<typeof bakePatch> | null = null;
  let travCenter = { x: 0, z: 0 };
  if (def.patch) {
    travCenter = geoToLocal(def.lat, def.lon, def.patch.lat, def.patch.lon);
    travCenter = { x: Math.round(travCenter.x), z: Math.round(travCenter.z) };
    patchRes = bakePatch(core, travCenter.x, travCenter.z, def.patch.res, def.patch.widthM, def.patch.depthM);
    log(`   patch @ (${travCenter.x}, ${travCenter.z}) ${def.patch.res}² @ 1 m`);
  }

  const coreMM = minMax(core.data);
  const stats = {
    min: coreMM.min,
    max: coreMM.max,
    p5: percentile(core.data, 0.05),
    p50: percentile(core.data, 0.5),
    p95: percentile(core.data, 0.95),
  };
  log(`   core scaled ${stats.min.toFixed(1)}..${stats.max.toFixed(1)} m (p5 ${stats.p5.toFixed(0)}, p50 ${stats.p50.toFixed(0)}, p95 ${stats.p95.toFixed(0)})`);

  // 6. derived fields @ 2048 (4 m) for the macro color
  const tD = Date.now();
  const hFn = combinedHeight(core, far);
  const macro = makeGrid(MACRO_RES, CORE_SIZE / MACRO_RES, -CORE_SIZE / 2 + CORE_SIZE / MACRO_RES / 2, -CORE_SIZE / 2 + CORE_SIZE / MACRO_RES / 2);
  resample(core, macro);
  if (patchRes) {
    const p = patchRes.patch;
    const pe = (p.res - 1) * p.spacing;
    for (let r = 0; r < MACRO_RES; r++) {
      const z = macro.originZ + r * macro.spacing;
      if (z < p.originZ || z > p.originZ + pe) continue;
      for (let c = 0; c < MACRO_RES; c++) {
        const x = macro.originX + c * macro.spacing;
        if (x < p.originX || x > p.originX + pe) continue;
        macro.data[r * MACRO_RES + c] = sampleBilinear(p, x, z);
      }
    }
  }
  const nM = computeNormals(macro);
  const slopeM = slopeFromNormals(nM);
  const convS = convexity(macro, 4);
  const relH = convexity(macro, 64);
  const gMax = Math.max(stats.max, minMax(far.data).max);
  const [aoCore, drainCore, shadowM] = fieldCache(
    def.id,
    JSON.stringify({ v: 3, sum: checksum(macro.data, far.data), sun: def.sun }),
    () => [
      horizonAO(core, hFn, 12, 18, 900),
      drainage(core),
      sunShadow(macro, hFn, def.sun.azimuthDeg, def.sun.elevationDeg, 16000, gMax),
    ],
  );
  const up = (src: Float32Array) => {
    const g = makeGrid(CORE_RES, CORE_SPACING, CORE_ORIGIN, CORE_ORIGIN, src);
    const out = new Float32Array(MACRO_RES * MACRO_RES);
    for (let r = 0; r < MACRO_RES; r++) {
      const z = macro.originZ + r * macro.spacing;
      for (let c = 0; c < MACRO_RES; c++) out[r * MACRO_RES + c] = sampleBilinear(g, macro.originX + c * macro.spacing, z);
    }
    return out;
  };
  const aoM = up(aoCore);
  const drainM = up(blur(dilate(drainCore, CORE_RES, 2), CORE_RES, 2, 2));
  let coastM: Float32Array | null = null;
  if (def.hasSea) {
    const dist = distanceToBoundary(MACRO_RES, macro.spacing, (i) => macro.data[i] >= 0);
    coastM = new Float32Array(dist.length);
    for (let i = 0; i < dist.length; i++) coastM[i] = macro.data[i] >= 0 ? dist[i] : -dist[i];
  }
  let zone: Float32Array | null = null;
  let zone2: Float32Array | null = null;
  if (def.id === 'pamukkale' && def.patch) {
    zone = new Float32Array(MACRO_RES * MACRO_RES);
    zone2 = new Float32Array(MACRO_RES * MACRO_RES);
    const hier = geoToLocal(def.lat, def.lon, 37.9265, 29.1265);
    const hTrav = sampleBilinear(core, travCenter.x, travCenter.z);
    for (let r = 0; r < MACRO_RES; r++) {
      const z = macro.originZ + r * macro.spacing;
      for (let c = 0; c < MACRO_RES; c++) {
        const x = macro.originX + c * macro.spacing;
        const i = r * MACRO_RES + c;
        const n = 60 * fbm(x / 200, z / 200, 501, 3);
        const ex = Math.abs(x - travCenter.x + n) / 420;
        const ez = Math.abs(z - travCenter.z + n * 1.5) / 1350;
        const e = Math.sqrt(ex * ex + ez * ez);
        const hh = macro.data[i];
        zone[i] = smoothstep(1.0, 0.8, e) * smoothstep(hTrav - 110, hTrav - 70, hh) * smoothstep(hTrav + 90, hTrav + 50, hh);
        const dr = Math.hypot(x - hier.x, (z - hier.z) * 0.8);
        zone2[i] = smoothstep(650, 380, dr + 50 * fbm(x / 150, z / 150, 503, 2)) * (1 - zone[i]);
      }
    }
  }
  log(`   derived fields ${((Date.now() - tD) / 1000).toFixed(1)} s`);

  // 7. paint core @ 2048
  const painter = PAINTERS[def.id];
  const bl = makeBakeLight(def);
  const fields: PaintFields = {
    res: MACRO_RES,
    spacing: macro.spacing,
    originX: macro.originX,
    originZ: macro.originZ,
    h: macro.data,
    n: nM,
    slope: slopeM,
    convS,
    relH,
    drain: drainM,
    coast: coastM,
    zone,
    zone2,
    stats,
    far: false,
  };
  const NM = MACRO_RES * MACRO_RES;
  const splatM = new Float32Array(NM * 4);
  const rockM = new Float32Array(NM);
  const masksM = new Float32Array(NM * 4);
  const colorM = u8(NM * 3);
  const albedoM = new Float32Array(NM * 3);
  const cavM = new Float32Array(NM);
  const o: TexelOut = { w: [0, 0, 0, 0], albedo: [0, 0, 0], rock: 0, masks: [0, 0, 0, 0] };
  const lit: RGB = [0, 0, 0];
  for (let r = 0; r < MACRO_RES; r++) {
    const z = macro.originZ + r * macro.spacing;
    for (let c = 0; c < MACRO_RES; c++) {
      const x = macro.originX + c * macro.spacing;
      const i = r * MACRO_RES + c;
      painter(fields, i, x, z, o);
      for (let k = 0; k < 4; k++) {
        splatM[i * 4 + k] = o.w[k];
        masksM[i * 4 + k] = o.masks[k];
      }
      rockM[i] = o.rock;
      albedoM[i * 3] = o.albedo[0];
      albedoM[i * 3 + 1] = o.albedo[1];
      albedoM[i * 3 + 2] = o.albedo[2];
      const cav = clamp01(0.5 + convS[i] * 0.12);
      cavM[i] = cav;
      const ao = aoM[i] * (0.82 + 0.36 * Math.min(cav, 0.5)) * (1 + 0.12 * Math.max(0, cav - 0.5));
      light(bl, o.albedo, nM[i * 3], nM[i * 3 + 1], nM[i * 3 + 2], shadowM[i], Math.min(1, ao), lit);
      colorM[i * 3] = toU8(linearToSrgb(lit[0]));
      colorM[i * 3 + 1] = toU8(linearToSrgb(lit[1]));
      colorM[i * 3 + 2] = toU8(linearToSrgb(lit[2]));
    }
  }

  // 8. far ring color @ 1024 (48 m)
  const farCol = makeGrid(FARCOL_RES, FAR_SIZE / FARCOL_RES, -FAR_SIZE / 2 + FAR_SIZE / FARCOL_RES / 2, -FAR_SIZE / 2 + FAR_SIZE / FARCOL_RES / 2);
  resample(far, farCol);
  const nF = computeNormals(farCol);
  const fFields: PaintFields = {
    res: FARCOL_RES,
    spacing: farCol.spacing,
    originX: farCol.originX,
    originZ: farCol.originZ,
    h: farCol.data,
    n: nF,
    slope: slopeFromNormals(nF),
    convS: convexity(farCol, 1),
    relH: convexity(farCol, 6),
    drain: (() => {
      const d = blur(drainage(far), FAR_RES, 1, 1);
      const g = makeGrid(FAR_RES, FAR_SPACING, FAR_ORIGIN, FAR_ORIGIN, d);
      const out = new Float32Array(FARCOL_RES * FARCOL_RES);
      for (let r = 0; r < FARCOL_RES; r++)
        for (let c = 0; c < FARCOL_RES; c++) out[r * FARCOL_RES + c] = sampleBilinear(g, farCol.originX + c * farCol.spacing, farCol.originZ + r * farCol.spacing) * 0.9;
      return out;
    })(),
    coast: def.hasSea
      ? (() => {
          const dist = distanceToBoundary(FARCOL_RES, farCol.spacing, (i) => farCol.data[i] >= 0);
          for (let i = 0; i < dist.length; i++) if (farCol.data[i] < 0) dist[i] = -dist[i];
          return dist;
        })()
      : null,
    zone: null,
    zone2: null,
    stats,
    far: true,
  };
  const farFn = (x: number, z: number) => sampleBilinear(far, x, z);
  const [aoF, shF] = fieldCache(`${def.id}-far`, JSON.stringify({ v: 3, sum: checksum(farCol.data), sun: def.sun }), () => [
    horizonAO(farCol, farFn, 8, 12, 4000),
    sunShadow(farCol, farFn, def.sun.azimuthDeg, def.sun.elevationDeg, 20000, minMax(far.data).max, 1.0),
  ]);
  const NF = FARCOL_RES * FARCOL_RES;
  const colorF = u8(NF * 3);
  for (let r = 0; r < FARCOL_RES; r++) {
    const z = farCol.originZ + r * farCol.spacing;
    for (let c = 0; c < FARCOL_RES; c++) {
      const x = farCol.originX + c * farCol.spacing;
      const i = r * FARCOL_RES + c;
      const d = insideCore(x, z);
      let rgb: RGB;
      painter(fFields, i, x, z, o);
      light(bl, o.albedo, nF[i * 3], nF[i * 3 + 1], nF[i * 3 + 2], shF[i], aoF[i], lit);
      rgb = [linearToSrgb(lit[0]), linearToSrgb(lit[1]), linearToSrgb(lit[2])];
      if (d > -24) {
        // inside the core: use the (box-filtered) macro color so LOD transitions match
        const w = smoothstep(-24, BLEND_M, d);
        const mc = Math.round((x - macro.originX) / macro.spacing);
        const mr = Math.round((z - macro.originZ) / macro.spacing);
        const acc: RGB = [0, 0, 0];
        let cnt = 0;
        for (let dr = -6; dr < 6; dr++) {
          for (let dc = -6; dc < 6; dc++) {
            const rr = mr + dr;
            const cc = mc + dc;
            if (rr < 0 || cc < 0 || rr >= MACRO_RES || cc >= MACRO_RES) continue;
            const j = (rr * MACRO_RES + cc) * 3;
            acc[0] += colorM[j] / 255;
            acc[1] += colorM[j + 1] / 255;
            acc[2] += colorM[j + 2] / 255;
            cnt++;
          }
        }
        if (cnt > 0) rgb = mix3(rgb, [acc[0] / cnt, acc[1] / cnt, acc[2] / cnt], w);
      }
      colorF[i * 3] = toU8(rgb[0]);
      colorF[i * 3 + 1] = toU8(rgb[1]);
      colorF[i * 3 + 2] = toU8(rgb[2]);
    }
  }

  // 9. 1024² data maps (normal, splat, shadow_ao, rock) and 512² masks
  const NC = CORE_RES * CORE_RES;
  const nC = computeNormals(core);
  const normalImg = u8(NC * 3);
  for (let i = 0; i < NC; i++) {
    const nx = nC[i * 3];
    const ny = nC[i * 3 + 1];
    const nz = nC[i * 3 + 2];
    const s = Math.abs(nx) + Math.abs(ny) + Math.abs(nz);
    let px = nx / s;
    let pz = nz / s;
    if (ny < 0) {
      const ox = (1 - Math.abs(pz)) * (px >= 0 ? 1 : -1);
      const oz = (1 - Math.abs(px)) * (pz >= 0 ? 1 : -1);
      px = ox;
      pz = oz;
    }
    normalImg[i * 3] = toU8(px * 0.5 + 0.5);
    normalImg[i * 3 + 1] = toU8(pz * 0.5 + 0.5);
    normalImg[i * 3 + 2] = 0;
  }
  const splatImg = u8(NC * 4);
  const shadowImg = u8(NC * 4);
  const rockU8 = u8(NC);
  const shadow1 = downsample2(shadowM, MACRO_RES);
  const rock1 = downsample2(rockM, MACRO_RES);
  const cav1 = downsample2(cavM, MACRO_RES);
  const splat1: Float32Array[] = [];
  for (let k = 0; k < 4; k++) {
    const ch = new Float32Array(NM);
    for (let i = 0; i < NM; i++) ch[i] = splatM[i * 4 + k];
    splat1.push(downsample2(ch, MACRO_RES));
  }
  for (let r = 0; r < CORE_RES; r++) {
    for (let c = 0; c < CORE_RES; c++) {
      const i = r * CORE_RES + c;
      // splat: quantize so the 4 weights sum to exactly 255
      const ws = [splat1[0][i], splat1[1][i], splat1[2][i], splat1[3][i]];
      const tot = ws[0] + ws[1] + ws[2] + ws[3] || 1;
      const q = ws.map((w) => Math.floor((w / tot) * 255));
      let rem = 255 - (q[0] + q[1] + q[2] + q[3]);
      const order = [0, 1, 2, 3].sort((a, b) => (ws[b] / tot) * 255 - q[b] - ((ws[a] / tot) * 255 - q[a]));
      for (let k = 0; rem > 0; k = (k + 1) % 4, rem--) q[order[k]]++;
      for (let k = 0; k < 4; k++) splatImg[i * 4 + k] = q[k];
      // rock mask fades to 0 in the outer 64 m (D continuity at the core edge)
      const d = insideCore(CORE_ORIGIN + c * CORE_SPACING, CORE_ORIGIN + r * CORE_SPACING);
      const rk = rock1[i] * smoothstep(0, 64, d);
      rockU8[i] = toU8(rk);
      shadowImg[i * 4] = toU8(shadow1[i]);
      shadowImg[i * 4 + 1] = toU8(aoCore[i]);
      shadowImg[i * 4 + 2] = toU8(cav1[i]);
      shadowImg[i * 4 + 3] = rockU8[i];
    }
  }
  const maskU8 = u8(MASK_RES * MASK_RES * 4);
  for (let r = 0; r < MASK_RES; r++) {
    for (let c = 0; c < MASK_RES; c++) {
      for (let k = 0; k < 4; k++) {
        let acc = 0;
        for (let dr = 0; dr < 4; dr++) for (let dc = 0; dc < 4; dc++) acc += masksM[((r * 4 + dr) * MACRO_RES + c * 4 + dc) * 4 + k];
        maskU8[(r * MASK_RES + c) * 4 + k] = toU8(acc / 16);
      }
    }
  }

  // 10. write files
  const sizes: Record<string, number> = {};
  const put = (name: string, bytes: Uint8Array) => {
    writeFileSync(join(outDir, name), bytes);
    sizes[name] = bytes.length;
  };
  const encGrid = (name: string, g: Grid): GridFileMeta => {
    const e = encodeHeightGrid(g.data, g.res);
    put(name, e.bytes);
    return { file: name, originX: g.originX, originZ: g.originZ, spacing: g.spacing, res: g.res, min: e.min, max: e.max };
  };
  const coreMeta = encGrid('height_core.u16.z', core);
  const farMeta = encGrid('height_far.u16.z', far);
  let patchMeta: GridFileMeta | null = null;
  let waterMeta: GridFileMeta | null = null;
  if (patchRes) {
    patchMeta = encGrid('height_patch.u16.z', patchRes.patch);
    waterMeta = encGrid('water_patch.u16.z', patchRes.water);
  }
  put('rock_core.u8.z', encodeU8(rockU8));
  put('masks_core.u8.z', encodeU8(maskU8));
  sizes['normal_core.png'] = await writePng(join(outDir, 'normal_core.png'), normalImg, CORE_RES, CORE_RES, 3);
  sizes['splat_core.png'] = await writePng(join(outDir, 'splat_core.png'), splatImg, CORE_RES, CORE_RES, 4);
  sizes['shadow_ao.png'] = await writePng(join(outDir, 'shadow_ao.png'), shadowImg, CORE_RES, CORE_RES, 4);
  sizes['color_macro.webp'] = await writeWebp(join(outDir, 'color_macro.webp'), colorM, MACRO_RES, MACRO_RES, 3, 80);
  sizes['color_far.webp'] = await writeWebp(join(outDir, 'color_far.webp'), colorF, FARCOL_RES, FARCOL_RES, 3, 78);
  let ktxName: string | null = null;
  if (args.ktx2) {
    const n = await writeKtx2(join(outDir, 'color_macro.ktx2'), colorM, MACRO_RES, MACRO_RES);
    if (n > 0) {
      ktxName = 'color_macro.ktx2';
      sizes[ktxName] = n;
    }
  }

  // world.json
  const az = (def.sun.azimuthDeg * Math.PI) / 180;
  const el = (def.sun.elevationDeg * Math.PI) / 180;
  const sunLin = kelvinToLinear(def.sun.kelvin);
  const skyLin = kelvinToLinear(def.sky.kelvin);
  const cfg: WorldConfig = {
    id: def.id,
    version: WORLD_JSON_VERSION,
    name: def.name,
    accent: def.accent,
    geo: {
      lat: def.lat,
      lon: def.lon,
      zoomCore: def.zoomCore,
      zoomFar: def.zoomFar,
      coreSizeM: CORE_SIZE,
      coreRes: CORE_RES,
      farSizeM: FAR_SIZE,
      farRes: FAR_RES,
      verticalScale: def.verticalScale,
      source: args.synthetic ? 'synthetic' : 'terrarium',
      note: def.note,
    },
    hasSea: def.hasSea,
    seaLevel: 0,
    terrain: {
      core: coreMeta,
      far: farMeta,
      patch: patchMeta,
      rock: { file: 'rock_core.u8.z', res: CORE_RES },
      masks: {
        file: 'masks_core.u8.z',
        originX: -CORE_SIZE / 2 + (CORE_SIZE / MASK_RES) / 2,
        originZ: -CORE_SIZE / 2 + (CORE_SIZE / MASK_RES) / 2,
        spacing: CORE_SIZE / MASK_RES,
        res: MASK_RES,
        channels: 4,
        names: [...def.maskNames],
      },
      detail: {
        amp: [DETAIL_AMP0, DETAIL_AMP1],
        wavelength: [DETAIL_WAVELENGTH0, DETAIL_WAVELENGTH1],
        normalOnly: { amp: DETAIL_AMP2, wavelength: DETAIL_WAVELENGTH2 },
      },
      coreBlendM: BLEND_M,
      playBounds: {
        minX: CORE_ORIGIN + PLAY_MARGIN,
        maxX: CORE_ORIGIN + (CORE_RES - 1) * CORE_SPACING - PLAY_MARGIN,
        minZ: CORE_ORIGIN + PLAY_MARGIN,
        maxZ: CORE_ORIGIN + (CORE_RES - 1) * CORE_SPACING - PLAY_MARGIN,
      },
      heightRange: { min: coreMeta.min, max: coreMeta.max },
      patchInfo:
        patchRes && waterMeta
          ? {
              terraceRect: patchRes.terraceRect,
              baseLowerM: 0.5,
              poolDepthM: 0.35,
              water: waterMeta,
            }
          : null,
    },
    textures: {
      normal: 'normal_core.png',
      splat: 'splat_core.png',
      shadowAo: 'shadow_ao.png',
      colorMacro: 'color_macro.webp',
      colorMacroKtx2: ktxName,
      colorFar: 'color_far.webp',
      coverage: {
        core: { minX: -CORE_SIZE / 2, minZ: -CORE_SIZE / 2, size: CORE_SIZE },
        far: { minX: -FAR_SIZE / 2, minZ: -FAR_SIZE / 2, size: FAR_SIZE },
        patch: patchMeta ? { minX: patchMeta.originX - 0.5, minZ: patchMeta.originZ - 0.5, size: patchMeta.res * patchMeta.spacing } : null,
      },
    },
    layers: def.layers,
    layerColors: def.layerColors,
    layerRoughness: def.layerRoughness,
    sun: {
      azimuthDeg: def.sun.azimuthDeg,
      elevationDeg: def.sun.elevationDeg,
      dir: round3([Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)], 5),
      kelvin: def.sun.kelvin,
      color: srgbToHex(kelvinToSrgb(def.sun.kelvin)),
      colorLinear: round3(sunLin),
      intensity: def.sun.intensity,
    },
    sky: {
      kelvin: def.sky.kelvin,
      zenith: def.sky.zenith,
      horizon: def.sky.horizon,
      sunGlow: def.sky.sunGlow,
      ground: def.sky.ground,
      ambientIntensity: def.sky.ambientIntensity,
    },
    fog: {
      a: def.fog.a,
      b: def.fog.b,
      baseY: Math.round(stats.p5),
      color: def.fog.color,
      sunColor: def.fog.sunColor,
      hgG: 0.76,
      maxViewM: def.fog.maxViewM,
      groundFog: def.fog.groundFog
        ? { top: Math.round(stats.p5 + def.fog.groundFog.topAboveFloor), density: def.fog.groundFog.density, color: def.fog.groundFog.color }
        : null,
      cloudSea: def.fog.cloudSea
        ? {
            bottom: Math.round(percentile(core.data, def.fog.cloudSea.bottomPct)),
            top: Math.round(percentile(core.data, def.fog.cloudSea.topPct)),
            density: def.fog.cloudSea.density,
            color: def.fog.cloudSea.color,
          }
        : null,
    },
    palette: def.palette,
    grading: def.grading,
    water: {
      enabled: def.water.enabled,
      level: 0,
      shallow: def.water.shallow,
      deep: def.water.deep,
      depthFalloffM: def.water.depthFalloffM,
      foam: def.water.foam,
      roughness: def.water.roughness,
      kind: def.water.kind,
    },
    wind: def.wind,
    bakeLighting: {
      sunColorLinear: round3(bl.sunCol),
      skyColorLinear: round3(hexToLinear(def.bake.ambientColor)),
      sunStrength: round3([bl.sunStrength * bl.norm, 0, 0])[0],
      ambientStrength: round3([bl.ambStrength * bl.norm, 0, 0])[0],
      formula:
        'lit = albedo * (sunColor*sunStrength*shadow*B(ndl) + skyColor*ambientStrength*ao*(0.8+0.2*n.y)); w=max(0,(ndl+wrap)/(1+wrap)), B=w/(w+k)*(ndl0+k)/ndl0, ' +
        `wrap=${bl.wrap}, ndl0=${bl.ndl0.toFixed(4)}, k=${bl.k.toFixed(4)}; soft shoulder above 0.8; sRGB encode`,
    },
    props: def.props,
  };
  void skyLin;
  const json = JSON.stringify(cfg, null, 1);
  writeFileSync(join(outDir, 'world.json'), json);
  sizes['world.json'] = json.length;

  // preview for docs
  const shotDir = join(ROOT, 'docs', 'shots', 'terrain');
  mkdirSync(shotDir, { recursive: true });
  await writePreview(join(shotDir, `${def.id}.webp`), colorM, MACRO_RES, MACRO_RES, 3, 768, 78);
  const outPrev = join(ROOT, 'tests', 'out', 'terrain');
  mkdirSync(outPrev, { recursive: true });
  await sharp(Buffer.from(colorM), { raw: { width: MACRO_RES, height: MACRO_RES, channels: 3 } }).resize(1024, 1024).png().toFile(join(outPrev, `${def.id}_macro.png`));
  await sharp(Buffer.from(colorF), { raw: { width: FARCOL_RES, height: FARCOL_RES, channels: 3 } }).resize(768, 768).png().toFile(join(outPrev, `${def.id}_far.png`));

  let total = 0;
  for (const f of readdirSync(outDir)) {
    if (!(f in sizes)) {
      rmSync(join(outDir, f));
      continue;
    }
    total += statSync(join(outDir, f)).size;
  }
  log(`   files: ${Object.entries(sizes).map(([k, v]) => `${k} ${(v / 1024).toFixed(0)}K`).join(', ')}`);
  log(`   total ${(total / 1024 / 1024).toFixed(2)} MB  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.scout) {
    await scout(args);
    return;
  }
  const cache = new TileCache(CACHE);
  for (const id of args.worlds) await bakeWorld(WORLD_DEFS[id], args, cache);
}

await main();
