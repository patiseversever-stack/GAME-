// Pure terrain codec (Node + browser). No DOM, no fs, no fetch: bytes in, typed arrays out.
//
// Height file `*.u16.z` (little endian before compression):
//   1. q = round((h - min) / (max - min) * 65535)  (h already includes verticalScale; min/max live in world.json)
//   2. 2D delta predictor (row-delta generalised): pred = left + up - upLeft (first row: left, first column: up),
//      residual = (q - pred) mod 65536
//   3. byte planes: all low bytes (res*res) followed by all high bytes (res*res)
//   4. raw DEFLATE (fflate deflateSync, level 9)
// U8 file `*.u8.z`: raw DEFLATE of the plain bytes (masks are interleaved channels).

import { deflateSync, inflateSync } from 'fflate';
import type { HeightGrid, MaskGrid, WorldTerrain } from './types.ts';

export interface GridFileMeta {
  file: string;
  originX: number;
  originZ: number;
  spacing: number;
  res: number;
  min: number;
  max: number;
}

export interface MaskFileMeta {
  file: string;
  originX: number;
  originZ: number;
  spacing: number;
  res: number;
  channels: number;
  names: string[];
}

/** Minimal slice of world.json needed to rebuild a WorldTerrain (WorldConfig is structurally compatible). */
export interface TerrainFilesMeta {
  hasSea: boolean;
  terrain: {
    core: GridFileMeta;
    far: GridFileMeta;
    patch: GridFileMeta | null;
    rock: { file: string; res: number };
    masks: MaskFileMeta | null;
  };
}

const Q = 65535;

function predict(q: Uint16Array, res: number, r: number, c: number): number {
  if (r === 0) return c === 0 ? 0 : q[c - 1];
  const up = q[(r - 1) * res + c];
  if (c === 0) return up;
  return q[r * res + c - 1] + up - q[(r - 1) * res + c - 1];
}

/** Quantize + delta + byte-plane + deflate. Returns bytes and the min/max used. */
export function encodeHeightGrid(
  data: Float32Array | Float64Array,
  res: number,
  range?: { min: number; max: number },
): { bytes: Uint8Array; min: number; max: number } {
  const n = res * res;
  if (data.length !== n) throw new Error(`encodeHeightGrid: length ${data.length} != ${n}`);
  let min = range ? range.min : Infinity;
  let max = range ? range.max : -Infinity;
  if (!range) {
    for (let i = 0; i < n; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!(max > min)) max = min + 1;
  // Round min/max to 1 mm so the JSON text round-trips exactly.
  min = Math.floor(min * 1000) / 1000;
  max = Math.ceil(max * 1000) / 1000;
  const scale = Q / (max - min);
  const q = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.round((data[i] - min) * scale);
    q[i] = v < 0 ? 0 : v > Q ? Q : v;
  }
  const planes = new Uint8Array(n * 2);
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      const i = r * res + c;
      const resid = (q[i] - predict(q, res, r, c)) & 0xffff;
      planes[i] = resid & 0xff;
      planes[n + i] = resid >>> 8;
    }
  }
  return { bytes: deflateSync(planes, { level: 9 }), min, max };
}

/** Inverse of encodeHeightGrid → Float32 heights (meters). */
export function decodeHeightData(bytes: Uint8Array, res: number, min: number, max: number): Float32Array {
  const n = res * res;
  const planes = inflateSync(bytes);
  if (planes.length !== n * 2) throw new Error(`decodeHeightData: got ${planes.length} bytes, expected ${n * 2}`);
  const q = new Uint16Array(n);
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      const i = r * res + c;
      const resid = planes[i] | (planes[n + i] << 8);
      q[i] = (resid + predict(q, res, r, c)) & 0xffff;
    }
  }
  const out = new Float32Array(n);
  const step = (max - min) / Q;
  for (let i = 0; i < n; i++) out[i] = min + q[i] * step;
  return out;
}

export function decodeHeightGrid(bytes: Uint8Array, meta: GridFileMeta): HeightGrid {
  return {
    originX: meta.originX,
    originZ: meta.originZ,
    spacing: meta.spacing,
    res: meta.res,
    data: decodeHeightData(bytes, meta.res, meta.min, meta.max),
  };
}

export function encodeU8(data: Uint8Array): Uint8Array {
  return deflateSync(data, { level: 9 });
}

export function decodeU8(bytes: Uint8Array, expectedLength: number): Uint8Array {
  const out = inflateSync(bytes);
  if (out.length !== expectedLength) throw new Error(`decodeU8: got ${out.length} bytes, expected ${expectedLength}`);
  return out;
}

/** Rock mask (u8 aligned with the core grid) → Float32 0..1 (exactly k/255, same as an R8 normalized texture). */
export function decodeRockMask(bytes: Uint8Array, res: number): Float32Array {
  const u8 = decodeU8(bytes, res * res);
  const out = new Float32Array(u8.length);
  for (let i = 0; i < u8.length; i++) out[i] = u8[i] / 255;
  return out;
}

export function decodeMasks(bytes: Uint8Array, meta: MaskFileMeta): MaskGrid {
  return {
    originX: meta.originX,
    originZ: meta.originZ,
    spacing: meta.spacing,
    res: meta.res,
    channels: meta.channels,
    names: meta.names.slice(),
    data: decodeU8(bytes, meta.res * meta.res * meta.channels),
  };
}

/** Rebuild the full WorldTerrain from world.json + a file reader (fs in Node, fetchAsset in the browser). */
export async function decodeWorldTerrain(
  meta: TerrainFilesMeta,
  read: (file: string) => Promise<Uint8Array>,
): Promise<WorldTerrain> {
  const t = meta.terrain;
  const [coreB, farB, patchB, rockB, maskB] = await Promise.all([
    read(t.core.file),
    read(t.far.file),
    t.patch ? read(t.patch.file) : Promise.resolve(null),
    read(t.rock.file),
    t.masks ? read(t.masks.file) : Promise.resolve(null),
  ]);
  const terrain: WorldTerrain = {
    core: decodeHeightGrid(coreB, t.core),
    far: decodeHeightGrid(farB, t.far),
    rockMask: decodeRockMask(rockB, t.rock.res),
    hasSea: meta.hasSea,
  };
  if (t.patch && patchB) terrain.patch = decodeHeightGrid(patchB, t.patch);
  if (t.masks && maskB) terrain.masks = decodeMasks(maskB, t.masks);
  return terrain;
}
