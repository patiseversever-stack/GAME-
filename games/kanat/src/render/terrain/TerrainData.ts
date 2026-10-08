// GPU-side terrain data for one world: R32F height grids (texelFetch + manual bilinear, identical to the CPU
// sampler), RGBA8 normal maps derived from the same heights, R8 rock mask (exact k/255 like the sampler), optional
// baked images (splat, shadow/AO, pre-lit macro colours) and min/max mips for CPU quadtree selection.
import * as THREE from 'three';
import type { HeightGrid, WorldTerrain } from '../../sim/terrain/types.ts';
import { MinMaxMip, type HeightBounds } from './Quadtree.ts';

export interface TerrainImages {
  splat?: ImageBitmap | HTMLCanvasElement | null;
  shadowAo?: ImageBitmap | HTMLCanvasElement | null;
  colorMacro?: ImageBitmap | HTMLCanvasElement | null;
  colorFar?: ImageBitmap | HTMLCanvasElement | null;
}

export interface TexCoverage {
  minX: number;
  minZ: number;
  size: number;
}

export interface TerrainSourceDesc {
  terrain: WorldTerrain;
  images?: TerrainImages;
  /** Image coverage (world.json textures.coverage). Defaults: core/far grid extents. */
  coverage?: { core: TexCoverage; far: TexCoverage };
  /** Max side for the macro colour texture (Low: 1024). */
  macroMax?: number;
}

function heightTexture(g: HeightGrid): THREE.DataTexture {
  const t = new THREE.DataTexture(g.data, g.res, g.res, THREE.RedFormat, THREE.FloatType);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Normal map from the height grid (central differences, same heights the GPU draws). RGBA8: xyz*0.5+0.5, A = 255. */
function normalTexture(g: HeightGrid): THREE.DataTexture {
  const res = g.res;
  const d = g.data;
  const out = new Uint8Array(res * res * 4);
  const inv2 = 1 / (2 * g.spacing);
  for (let r = 0; r < res; r++) {
    const rm = r > 0 ? r - 1 : 0;
    const rp = r < res - 1 ? r + 1 : res - 1;
    for (let c = 0; c < res; c++) {
      const cm = c > 0 ? c - 1 : 0;
      const cp = c < res - 1 ? c + 1 : res - 1;
      const sx = (d[r * res + cp] - d[r * res + cm]) * inv2 * (2 / Math.max(1, cp - cm));
      const sz = (d[rp * res + c] - d[rm * res + c]) * inv2 * (2 / Math.max(1, rp - rm));
      const il = 1 / Math.sqrt(sx * sx + 1 + sz * sz);
      const o = (r * res + c) * 4;
      out[o] = Math.round((-sx * il * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((il * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((-sz * il * 0.5 + 0.5) * 255);
      out[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(out, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function rockTexture(rock: Float32Array | undefined, res: number): THREE.DataTexture {
  // R32F holding the exact sampler values (sampler bilinear-interpolates the Float32 rock grid).
  const data = rock && rock.length === res * res ? rock : new Float32Array(res * res);
  const t = new THREE.DataTexture(data, res, res, THREE.RedFormat, THREE.FloatType);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function imageTexture(img: ImageBitmap | HTMLCanvasElement, srgb: boolean, mips: boolean): THREE.Texture {
  const t = new THREE.Texture(img as unknown as HTMLImageElement);
  t.flipY = false;
  t.premultiplyAlpha = false;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const placeholder = (() => {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.needsUpdate = true;
  return t;
})();

export class TerrainBoundsCombined implements HeightBounds {
  private core: MinMaxMip;
  private far: MinMaxMip;
  private coreMinX: number;
  private coreMinZ: number;
  private coreMaxX: number;
  private coreMaxZ: number;

  constructor(core: MinMaxMip, far: MinMaxMip, coreMinX: number, coreMinZ: number, coreMaxX: number, coreMaxZ: number) {
    this.core = core;
    this.far = far;
    this.coreMinX = coreMinX;
    this.coreMinZ = coreMinZ;
    this.coreMaxX = coreMaxX;
    this.coreMaxZ = coreMaxZ;
  }

  rect(x0: number, z0: number, x1: number, z1: number, out: Float64Array): void {
    const ix0 = Math.max(x0, this.coreMinX);
    const iz0 = Math.max(z0, this.coreMinZ);
    const ix1 = Math.min(x1, this.coreMaxX);
    const iz1 = Math.min(z1, this.coreMaxZ);
    const overlaps = ix0 <= ix1 && iz0 <= iz1;
    const inside = overlaps && ix0 === x0 && iz0 === z0 && ix1 === x1 && iz1 === z1;
    if (overlaps) this.core.rect(ix0, iz0, ix1, iz1, out);
    if (!inside) this.far.rect(x0, z0, x1, z1, out);
  }
}

export class TerrainData {
  readonly hCore: THREE.DataTexture;
  readonly hFar: THREE.DataTexture;
  readonly nCore: THREE.DataTexture;
  readonly nFar: THREE.DataTexture;
  readonly rock: THREE.DataTexture;
  readonly splat: THREE.Texture;
  readonly shadowAo: THREE.Texture;
  readonly colorMacro: THREE.Texture;
  readonly colorFar: THREE.Texture;
  readonly has: { splat: boolean; shadowAo: boolean; macro: boolean; far: boolean };
  readonly coreGrid: THREE.Vector4;
  readonly farGrid: THREE.Vector4;
  readonly covCore: THREE.Vector4;
  readonly covFar: THREE.Vector4;
  readonly bounds: TerrainBoundsCombined;
  /** Pamukkale 1 m patch (null elsewhere). */
  readonly hPatch: THREE.DataTexture | null = null;
  readonly nPatch: THREE.DataTexture | null = null;
  readonly patchGrid: THREE.Vector4 | null = null;
  readonly patchBounds: MinMaxMip | null = null;
  readonly coreExt: THREE.Vector4;
  readonly terrain: WorldTerrain;
  /** 10th percentile of core heights (fog base). */
  readonly floorY: number;
  readonly minY: number;
  readonly maxY: number;
  private owned: THREE.Texture[] = [];

  constructor(desc: TerrainSourceDesc) {
    const { terrain } = desc;
    this.terrain = terrain;
    const core = terrain.core;
    const far = terrain.far;
    this.hCore = heightTexture(core);
    this.hFar = heightTexture(far);
    this.nCore = normalTexture(core);
    this.nFar = normalTexture(far);
    this.rock = rockTexture(terrain.rockMask, core.res);
    this.owned.push(this.hCore, this.hFar, this.nCore, this.nFar, this.rock);
    const patch = terrain.patch;
    if (patch) {
      this.hPatch = heightTexture(patch);
      this.nPatch = normalTexture(patch);
      this.patchGrid = new THREE.Vector4(patch.originX, patch.originZ, patch.spacing, patch.res);
      this.patchBounds = new MinMaxMip(patch.data, patch.res, patch.originX, patch.originZ, patch.spacing);
      this.owned.push(this.hPatch, this.nPatch);
    }
    const im = desc.images ?? {};
    this.has = { splat: !!im.splat, shadowAo: !!im.shadowAo, macro: !!im.colorMacro, far: !!im.colorFar };
    this.splat = im.splat ? this.own(imageTexture(im.splat, false, false)) : placeholder;
    this.shadowAo = im.shadowAo ? this.own(imageTexture(im.shadowAo, false, false)) : placeholder;
    this.colorMacro = im.colorMacro ? this.own(imageTexture(im.colorMacro, true, true)) : placeholder;
    this.colorFar = im.colorFar ? this.own(imageTexture(im.colorFar, true, true)) : placeholder;
    this.coreGrid = new THREE.Vector4(core.originX, core.originZ, core.spacing, core.res);
    this.farGrid = new THREE.Vector4(far.originX, far.originZ, far.spacing, far.res);
    const cc = desc.coverage?.core ?? { minX: core.originX, minZ: core.originZ, size: (core.res - 1) * core.spacing };
    const cf = desc.coverage?.far ?? { minX: far.originX, minZ: far.originZ, size: (far.res - 1) * far.spacing };
    this.covCore = new THREE.Vector4(cc.minX, cc.minZ, 1 / cc.size, 0);
    this.covFar = new THREE.Vector4(cf.minX, cf.minZ, 1 / cf.size, 0);
    const coreExt = (core.res - 1) * core.spacing;
    this.coreExt = new THREE.Vector4(core.originX, core.originZ, core.originX + coreExt, core.originZ + coreExt);
    this.bounds = new TerrainBoundsCombined(
      new MinMaxMip(core.data, core.res, core.originX, core.originZ, core.spacing),
      new MinMaxMip(far.data, far.res, far.originX, far.originZ, far.spacing),
      core.originX,
      core.originZ,
      core.originX + coreExt,
      core.originZ + coreExt,
    );
    // Height statistics (strided sample, cheap).
    const vals: number[] = [];
    const step = Math.max(1, Math.floor(core.res / 128));
    let mn = Infinity;
    let mx = -Infinity;
    for (let r = 0; r < core.res; r += step) {
      for (let c = 0; c < core.res; c += step) {
        const v = core.data[r * core.res + c];
        vals.push(v);
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }
    vals.sort((a, b) => a - b);
    this.floorY = terrain.hasSea ? 0 : vals[Math.floor(vals.length * 0.1)];
    this.minY = mn;
    this.maxY = mx;
  }

  private own<T extends THREE.Texture>(t: T): T {
    this.owned.push(t);
    return t;
  }

  textures(): THREE.Texture[] {
    return this.owned.slice();
  }

  dispose(): void {
    for (const t of this.owned) t.dispose();
    this.owned.length = 0;
  }
}
