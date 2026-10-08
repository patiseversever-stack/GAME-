// Terrain pipeline tests (brief §9.G items 1–2 + codec/sampler/detail-noise contracts).
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { WORLD_IDS, type WorldId } from '../../src/sim/types.ts';
import { decodeHeightData, encodeHeightGrid } from '../../src/sim/terrain/decode.ts';
import { atanPositive, createTerrainSampler } from '../../src/sim/terrain/sampler.ts';
import { terrariumDecode, geoToLocal, localToGeo, latToTileYf, lonToTileXf } from '../../tools/terrain/tiles.ts';
import { loadWorldNode, worldDir } from '../../tools/terrain/loadNode.ts';

const baked = (id: WorldId) => existsSync(join(worldDir(id), 'world.json'));

describe('terrarium decode (9.G-1)', () => {
  it('maps reference RGB triplets to meters', () => {
    expect(terrariumDecode(128, 0, 0)).toBe(0);
    expect(terrariumDecode(0, 0, 0)).toBe(-32768);
    expect(terrariumDecode(255, 255, 255)).toBeCloseTo(32767.996, 3);
  });
  it('tile math matches the brief formula (Göreme z13)', () => {
    // brief §4.G.1: tileX = floor((lon+180)/360·2^z), tileY = floor((1 − ln(tan φ + 1/cos φ)/π)/2·2^z)
    expect(Math.floor(lonToTileXf(34.83, 13))).toBe(4888);
    expect(Math.floor(latToTileYf(38.64, 13))).toBe(3175);
  });
  it('geo <-> local roundtrip', () => {
    const g = localToGeo(38.6, 34.8, 3000, -2500);
    const l = geoToLocal(38.6, 34.8, g.lat, g.lon);
    expect(l.x).toBeCloseTo(3000, 6);
    expect(l.z).toBeCloseTo(-2500, 6);
    expect(g.lat).toBeGreaterThan(38.6); // -z = north
  });
});

describe('height codec', () => {
  it('roundtrips within half a quantization step (smooth + rough + extreme data)', () => {
    const res = 257;
    const d = new Float32Array(res * res);
    for (let r = 0; r < res; r++) {
      for (let c = 0; c < res; c++) {
        let h = 1000 + 400 * Math.sin(r / 23) * Math.cos(c / 31) + ((r * 7919 + c * 104729) % 97) * 0.37;
        if (r === 5 && c === 9) h = -150; // spike down
        if (r === 200 && c === 3) h = 3900; // spike up
        d[r * res + c] = h;
      }
    }
    const enc = encodeHeightGrid(d, res);
    const dec = decodeHeightData(enc.bytes, res, enc.min, enc.max);
    const step = (enc.max - enc.min) / 65535;
    let maxErr = 0;
    for (let i = 0; i < d.length; i++) maxErr = Math.max(maxErr, Math.abs(dec[i] - d[i]));
    expect(maxErr).toBeLessThanOrEqual(step * 0.5 + 1e-3);
    expect(enc.bytes.length).toBeLessThan(res * res * 2);
  });
  it('is deterministic and handles a constant grid', () => {
    const res = 16;
    const d = new Float32Array(res * res).fill(42.5);
    const a = encodeHeightGrid(d, res);
    const b = encodeHeightGrid(d, res);
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
    const dec = decodeHeightData(a.bytes, res, a.min, a.max);
    for (const v of dec) expect(v).toBeCloseTo(42.5, 3);
  });
});

describe('deterministic atan', () => {
  it('matches Math.atan to 1e-8 rad', () => {
    for (let k = 0; k <= 2000; k++) {
      const x = (k / 2000) ** 2 * 50;
      expect(Math.abs(atanPositive(x) - Math.atan(x))).toBeLessThan(1e-8);
    }
  });
});

describe('reference heights (9.G-2)', () => {
  it.skipIf(!baked('erciyes'))('Erciyes core maximum ≈ 3900 m (±100) before verticalScale', () => {
    // Summit 3,917 m (Wikipedia "Erciyes Dağı"); SRTM-derived tiles under-read sharp summits slightly.
    const w = loadWorldNode('erciyes');
    let max = -Infinity;
    for (const v of w.terrain.core.data) max = Math.max(max, v);
    expect(Math.abs(max / w.config.geo.verticalScale - 3900)).toBeLessThanOrEqual(100);
  });

  it.skipIf(!baked('likya'))('Likya: Kaputaş shoreline is at ~0 m and the sea is negative', () => {
    const w = loadWorldNode('likya');
    const cfg = w.config;
    // Kaputaş beach 36.2297 N, 29.4495 E (Wikipedia "Kaputaş Beach"): find the shoreline crossing on a N–S line.
    const p = geoToLocal(cfg.geo.lat, cfg.geo.lon, 36.2297, 29.4495);
    let crossing: number | null = null;
    for (let dz = -400; dz <= 400; dz += 2) {
      const a = w.sampler.baseHeight(p.x, p.z + dz);
      const b = w.sampler.baseHeight(p.x, p.z + dz + 2);
      if (a >= 0 && b < 0) {
        crossing = p.z + dz;
        break;
      }
    }
    expect(crossing).not.toBeNull();
    expect(Math.abs((crossing as number) - p.z)).toBeLessThan(250);
    // open sea 2 km south of the beach is clearly below sea level
    expect(w.sampler.baseHeight(p.x, p.z + 2000)).toBeLessThan(-20);
    expect(cfg.hasSea).toBe(true);
  });

  it.skipIf(!baked('karadeniz'))('Karadeniz: Ayder yayla floor ≈ 1350 m (±60)', () => {
    // Ayder: 40°57′N 41°05′E, "average altitude is 1,350 metres" (en.wikipedia.org/wiki/Ayder; also Rize ÇŞİM report
    // webdosya.csb.gov.tr: "1350 metre rakımda"). The coordinate is minute-precision (±0.9 km), so we compare the
    // median of the gentle (slope < 20°) valley-floor terrain within 900 m of it.
    const w = loadWorldNode('karadeniz');
    const cfg = w.config;
    const p = geoToLocal(cfg.geo.lat, cfg.geo.lon, 40.95, 41.0833);
    const hs: number[] = [];
    for (let dz = -900; dz <= 900; dz += 30) {
      for (let dx = -900; dx <= 900; dx += 30) {
        if (dx * dx + dz * dz > 900 * 900) continue;
        const x = p.x + dx;
        const z = p.z + dz;
        if (w.sampler.slopeDeg(x, z) < 20) hs.push(w.sampler.baseHeight(x, z) / cfg.geo.verticalScale);
      }
    }
    hs.sort((a, b) => a - b);
    const median = hs[Math.floor(hs.length / 2)];
    expect(Math.abs(median - 1350)).toBeLessThanOrEqual(60);
  });

  it.skipIf(!baked('pamukkale'))('Pamukkale: travertine escarpment ≈ 160 m high (±60)', () => {
    // "about 2,700 m long, 600 m wide and 160 m high" (en.wikipedia.org/wiki/Pamukkale); Hierapolis 37°55′30″N 29°07′33″E
    // (en.wikipedia.org/wiki/Hierapolis) sits on top, the Çürüksu plain at the foot.
    const w = loadWorldNode('pamukkale');
    const cfg = w.config;
    const top = geoToLocal(cfg.geo.lat, cfg.geo.lon, 37.925, 29.12583);
    const vs = cfg.geo.verticalScale;
    const hTop = w.sampler.baseHeight(top.x, top.z) / vs;
    let plain = Infinity;
    for (let dx = 1000; dx <= 3000; dx += 50) plain = Math.min(plain, w.sampler.baseHeight(top.x - dx, top.z) / vs);
    expect(Math.abs(hTop - plain - 160)).toBeLessThanOrEqual(60);
  });
});

describe('sampler', () => {
  it.skipIf(!baked('kapadokya'))('is deterministic and bit-identical across loads', () => {
    const a = loadWorldNode('kapadokya').sampler;
    const b = loadWorldNode('kapadokya').sampler;
    const n = [0, 0, 0];
    const m = [0, 0, 0];
    for (let k = 0; k < 2000; k++) {
      const x = ((k * 7919) % 8000) - 4000 + 0.37 * k;
      const z = ((k * 104729) % 8000) - 4000 - 0.11 * k;
      expect(Object.is(a.height(x, z), b.height(x, z))).toBe(true);
      a.normal(x, z, n);
      b.normal(x, z, m);
      expect(n).toEqual(m);
      expect(Math.abs(n[0] * n[0] + n[1] * n[1] + n[2] * n[2] - 1)).toBeLessThan(1e-9);
      expect(a.slopeDeg(x, z)).toBeGreaterThanOrEqual(0);
    }
  });

  for (const id of WORLD_IDS) {
    it.skipIf(!baked(id))(`${id}: continuous across the core/far boundary (no seam)`, () => {
      const w = loadWorldNode(id);
      const s = w.sampler;
      const c = w.terrain.core;
      const lo = c.originX;
      const hi = c.originX + (c.res - 1) * c.spacing;
      let maxJump = 0;
      for (let t = lo; t <= hi; t += 37) {
        for (const [xa, za, xb, zb] of [
          [lo + 1e-3, t, lo - 1e-3, t],
          [hi - 1e-3, t, hi + 1e-3, t],
          [t, lo + 1e-3, t, lo - 1e-3],
          [t, hi - 1e-3, t, hi + 1e-3],
        ]) {
          maxJump = Math.max(maxJump, Math.abs(s.height(xa, za) - s.height(xb, zb)));
        }
      }
      // quantization of the two grids (≤ ~3 cm each) is the only allowed difference
      expect(maxJump).toBeLessThan(0.1);
      // detail D vanishes at the core edge (rock mask fades), playable bounds are inside the core
      expect(s.detail(lo + 1, 0)).toBe(0);
      expect(s.bounds.minX).toBeGreaterThan(lo + 256);
      expect(s.bounds.maxX).toBeLessThan(hi - 256);
    });
  }

  it.skipIf(!baked('pamukkale'))('pamukkale: travertine patch edge matches the core surface', () => {
    const w = loadWorldNode('pamukkale');
    const p = w.terrain.patch;
    expect(p).toBeDefined();
    if (!p) return;
    const coreOnly = createTerrainSampler({ ...w.terrain, patch: undefined });
    const ext = (p.res - 1) * p.spacing;
    let maxDiff = 0;
    for (let t = 0; t <= ext; t += 13) {
      for (const [x, z] of [
        [p.originX, p.originZ + t],
        [p.originX + ext, p.originZ + t],
        [p.originX + t, p.originZ],
        [p.originX + t, p.originZ + ext],
      ]) {
        maxDiff = Math.max(maxDiff, Math.abs(w.sampler.baseHeight(x, z) - coreOnly.baseHeight(x, z)));
      }
    }
    expect(maxDiff).toBeLessThan(0.05);
  });
});

describe('baked data textures', () => {
  for (const id of WORLD_IDS) {
    it.skipIf(!baked(id))(`${id}: data PNGs are true-color (non-palette) with real variance`, async () => {
      const w = loadWorldNode(id);
      const tx = w.config.textures;
      for (const [file, channels] of [
        [tx.normal, 3],
        [tx.splat, 4],
        [tx.shadowAo, 4],
      ] as const) {
        const path = join(worldDir(id), file);
        const meta = await sharp(path).metadata();
        expect(meta.isPalette ?? false, `${file} palette`).toBe(false);
        expect((meta as { paletteBitDepth?: number }).paletteBitDepth, `${file} paletteBitDepth`).toBeUndefined();
        expect(meta.channels).toBe(channels);
        expect(meta.width).toBe(1024);
        const { data } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
        for (let ch = 0; ch < channels; ch++) {
          if (file === tx.normal && ch === 2) continue; // B unused
          const seen = new Set<number>();
          let sum = 0;
          let sum2 = 0;
          let n = 0;
          for (let i = ch; i < data.length; i += channels * 13) {
            const v = data[i];
            seen.add(v);
            sum += v;
            sum2 += v * v;
            n++;
          }
          const sd = Math.sqrt(Math.max(0, sum2 / n - (sum / n) ** 2));
          // Every data channel must carry information (splat layers may be rare in some worlds, so ≥ 2 distinct).
          expect(seen.size, `${file} ch${ch} distinct values`).toBeGreaterThan(1);
          if (file !== tx.splat) expect(sd, `${file} ch${ch} stddev`).toBeGreaterThan(0.5);
        }
        if (file === tx.splat) {
          for (let i = 0; i < data.length; i += 4 * 97) expect(data[i] + data[i + 1] + data[i + 2] + data[i + 3]).toBe(255);
        }
      }
      const total = ['colorMacro', 'colorFar'] as const;
      for (const k of total) expect(existsSync(join(worldDir(id), tx[k]))).toBe(true);
    });
  }
});
