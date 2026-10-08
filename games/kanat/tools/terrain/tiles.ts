// AWS Terrain Tiles (terrarium PNG) download, cache, decode and geo sampling.
// URL: https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png   (verified 2026-10-08, HTTP 200)
// Decode: h = (R*256 + G + B/256) - 32768 (meters).
// Local frame: x east, z south (+z), origin = (lat0, lon0). lat = lat0 - z/R, lon = lon0 + x/(R cos lat0)
// (equirectangular ENU around the center, then exact Web Mercator to fetch the source pixels).

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { bicubicIdx } from './grid.ts';

export const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const EARTH_R = 6378137;
const DEG = Math.PI / 180;

export function terrariumDecode(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

export function lonToTileXf(lon: number, z: number): number {
  return ((lon + 180) / 360) * 2 ** z;
}

export function latToTileYf(lat: number, z: number): number {
  const phi = lat * DEG;
  return ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * 2 ** z;
}

/** Meters per pixel of a 256 px tile at latitude/zoom (brief formula). */
export function metersPerPixel(lat: number, z: number): number {
  return (156543.034 * Math.cos(lat * DEG)) / 2 ** z;
}

/** Local (x,z) meters → (lat, lon) degrees. */
export function localToGeo(lat0: number, lon0: number, x: number, z: number): { lat: number; lon: number } {
  const lat = lat0 - z / EARTH_R / DEG;
  const lon = lon0 + x / (EARTH_R * Math.cos(lat0 * DEG)) / DEG;
  return { lat, lon };
}

/** (lat, lon) degrees → local (x,z) meters. */
export function geoToLocal(lat0: number, lon0: number, lat: number, lon: number): { x: number; z: number } {
  return { x: (lon - lon0) * DEG * EARTH_R * Math.cos(lat0 * DEG), z: -(lat - lat0) * DEG * EARTH_R };
}

export class TileCache {
  readonly dir: string;
  downloaded = 0;
  cached = 0;
  constructor(dir: string) {
    this.dir = dir;
  }

  async png(z: number, x: number, y: number): Promise<Buffer> {
    const d = join(this.dir, String(z), String(x));
    const f = join(d, `${y}.png`);
    if (existsSync(f)) {
      this.cached++;
      return readFileSync(f);
    }
    mkdirSync(d, { recursive: true });
    const url = TERRARIUM_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(f, buf);
        this.downloaded++;
        return buf;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    throw new Error(`tile download failed: ${url}: ${String(lastErr)}`);
  }

  /** Decoded heights (256*256 Float32, meters). */
  async heights(z: number, x: number, y: number): Promise<Float32Array> {
    const buf = await this.png(z, x, y);
    const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const out = new Float32Array(info.width * info.height);
    for (let i = 0; i < out.length; i++) out[i] = terrariumDecode(data[i * ch], data[i * ch + 1], data[i * ch + 2]);
    return out;
  }
}

/** A stitched block of tiles at one zoom, sampled bicubically in global pixel coordinates. */
export class Mosaic {
  readonly z: number;
  readonly tx0: number;
  readonly ty0: number;
  readonly w: number;
  readonly h: number;
  readonly data: Float32Array;
  private constructor(z: number, tx0: number, ty0: number, nx: number, ny: number) {
    this.z = z;
    this.tx0 = tx0;
    this.ty0 = ty0;
    this.w = nx * 256;
    this.h = ny * 256;
    this.data = new Float32Array(this.w * this.h);
  }

  static async load(cache: TileCache, z: number, tx0: number, ty0: number, tx1: number, ty1: number): Promise<Mosaic> {
    const m = new Mosaic(z, tx0, ty0, tx1 - tx0 + 1, ty1 - ty0 + 1);
    const jobs: Promise<void>[] = [];
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        jobs.push(
          cache.heights(z, tx, ty).then((t) => {
            const ox = (tx - tx0) * 256;
            const oy = (ty - ty0) * 256;
            for (let r = 0; r < 256; r++) m.data.set(t.subarray(r * 256, r * 256 + 256), (oy + r) * m.w + ox);
          }),
        );
        if (jobs.length >= 8) await Promise.all(jobs.splice(0));
      }
    }
    await Promise.all(jobs);
    return m;
  }

  /** Bicubic sample at global pixel coords (pixel centers at i + 0.5). */
  sample(gpx: number, gpy: number): number {
    const u = gpx - this.tx0 * 256 - 0.5;
    const v = gpy - this.ty0 * 256 - 0.5;
    return bicubicIdx(this.data, this.w, this.h, u, v);
  }
}

/**
 * Sample a res² grid (sample (r,c) at x = origin + c*spacing, z = origin + r*spacing) from terrarium tiles at zoom z.
 */
export async function sampleTerrariumGrid(
  cache: TileCache,
  lat0: number,
  lon0: number,
  zoom: number,
  res: number,
  spacing: number,
  originX: number,
  originZ: number,
): Promise<Float32Array> {
  const ext = (res - 1) * spacing;
  const corners = [
    localToGeo(lat0, lon0, originX - 3 * spacing, originZ - 3 * spacing),
    localToGeo(lat0, lon0, originX + ext + 3 * spacing, originZ + ext + 3 * spacing),
  ];
  const n = 2 ** zoom;
  const pad = 2 / 256;
  const tx0 = Math.max(0, Math.floor(lonToTileXf(corners[0].lon, zoom) - pad));
  const tx1 = Math.min(n - 1, Math.floor(lonToTileXf(corners[1].lon, zoom) + pad));
  const ty0 = Math.max(0, Math.floor(latToTileYf(corners[0].lat, zoom) - pad));
  const ty1 = Math.min(n - 1, Math.floor(latToTileYf(corners[1].lat, zoom) + pad));
  const mosaic = await Mosaic.load(cache, zoom, tx0, ty0, tx1, ty1);
  const out = new Float32Array(res * res);
  const gpxCol = new Float64Array(res);
  for (let c = 0; c < res; c++) {
    const { lon } = localToGeo(lat0, lon0, originX + c * spacing, 0);
    gpxCol[c] = lonToTileXf(lon, zoom) * 256;
  }
  for (let r = 0; r < res; r++) {
    const { lat } = localToGeo(lat0, lon0, 0, originZ + r * spacing);
    const gpy = latToTileYf(lat, zoom) * 256;
    for (let c = 0; c < res; c++) out[r * res + c] = mosaic.sample(gpxCol[c], gpy);
  }
  return out;
}
